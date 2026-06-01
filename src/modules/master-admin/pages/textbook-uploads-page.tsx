import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { StatusPill } from "../components/status-pill";
import { exportCsv } from "@/modules/master-admin/utils/export-csv";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UploadCloud, Trash2, RotateCcw, RefreshCcw, FileText, X, Loader2, Play, Plus } from "lucide-react";
import { Form, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  deleteTextbookUpload,
  getCatalogEnums,
  getSyllabusSubjects,
  getTextbookUploads,
  patchTextbookUploadStatus,
  processTextbookUpload,
  uploadTextbookFiles,
} from "@/api/masterAdmin";
import type { ClassEnumApi, ContentTypeApi, TextbookUploadApi } from "@/api/types";

const CONTENT_TYPES: { value: ContentTypeApi; label: string }[] = [
  { value: "CHAPTER", label: "Chapter" },
  { value: "POEM", label: "Poem" },
  { value: "UNIT", label: "Unit" },
  { value: "LESSON", label: "Lesson" },
  { value: "MASTER", label: "Master (Full Book)" },
];

const ACCEPTED_TYPES = ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const topSchema = z.object({
  board: z.string().min(1, "Select a board"),
  class_name: z.string().min(1, "Select a class"),
  subject: z.string().min(1, "Select a subject"),
});
type TopValues = z.infer<typeof topSchema>;

const classLabel = (cls: string) => cls.replace("CLASS_", "Class ");
const statusLabel = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

interface UploadEntry {
  id: number;
  contentType: ContentTypeApi | "";
  name: string;
  files: File[];
}

function namePlaceholder(ct: string) {
  switch (ct) {
    case "MASTER": return "e.g. Complete Textbook";
    case "POEM": return "e.g. The Road Not Taken";
    case "LESSON": return "e.g. Lesson 3: Photosynthesis";
    case "UNIT": return "e.g. Unit 2: Algebra";
    default: return "e.g. Chapter 1: Introduction";
  }
}

let nextEntryId = 1;

export default function MasterAdminTextbookUploadsPage() {
  const { toast } = useToast();
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploads, setUploads] = useState<TextbookUploadApi[]>([]);
  const [boards, setBoards] = useState<string[]>([]);
  const [classes, setClasses] = useState<ClassEnumApi[]>([]);
  const [syllabusSubjects, setSyllabusSubjects] = useState<
    Array<{ board: string; class_level: string; subject_name: string }>
  >([]);
  const [entries, setEntries] = useState<UploadEntry[]>([
    { id: nextEntryId++, contentType: "", name: "", files: [] },
  ]);

  const form = useForm<TopValues>({
    resolver: zodResolver(topSchema),
    defaultValues: { board: "", class_name: "", subject: "" },
  });

  const refresh = async () => {
    const [enumData, rows, syllabusRows] = await Promise.all([
      getCatalogEnums(),
      getTextbookUploads(),
      getSyllabusSubjects(),
    ]);
    setBoards(enumData.boards);
    setClasses(enumData.classes);
    setUploads(rows);
    setSyllabusSubjects(
      syllabusRows.map((s) => ({
        board: s.board,
        class_level: s.class_level,
        subject_name: s.subject_name,
      })),
    );
  };

  useEffect(() => {
    refresh()
      .catch(() => toast({ title: "Failed to load uploads", variant: "destructive" }))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const queueCount = useMemo(
    () => uploads.filter((u) => u.embedding_status === "QUEUED" || u.embedding_status === "PROCESSING").length,
    [uploads],
  );
  const embeddedCount = useMemo(() => uploads.filter((u) => u.embedding_status === "EMBEDDED").length, [uploads]);
  const failedCount = useMemo(
    () => uploads.filter((u) => [u.embedding_status, u.chunk_status, u.ocr_status].includes("FAILED")).length,
    [uploads],
  );
  const totalChunks = useMemo(() => uploads.reduce((sum, u) => sum + (u.chunk_count || 0), 0), [uploads]);

  const selectedBoard = form.watch("board");
  const selectedClass = form.watch("class_name");
  const subjectOptions = useMemo(
    () =>
      Array.from(
        new Set(
          syllabusSubjects
            .filter((s) => s.board === selectedBoard && s.class_level === selectedClass)
            .map((s) => s.subject_name),
        ),
      ),
    [selectedBoard, selectedClass, syllabusSubjects],
  );

  useEffect(() => {
    if (subjectOptions.length === 0) return;
    const current = form.getValues("subject");
    if (!subjectOptions.includes(current)) {
      form.setValue("subject", subjectOptions[0], { shouldValidate: true });
    }
  }, [form, subjectOptions]);

  const updateEntry = (id: number, patch: Partial<UploadEntry>) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  };

  const removeEntry = (id: number) => {
    setEntries((prev) => (prev.length <= 1 ? prev : prev.filter((e) => e.id !== id)));
  };

  const addEntry = () => {
    setEntries((prev) => [...prev, { id: nextEntryId++, contentType: "", name: "", files: [] }]);
  };

  const removeFileFromEntry = (entryId: number, fileIdx: number) => {
    setEntries((prev) =>
      prev.map((e) =>
        e.id === entryId ? { ...e, files: e.files.filter((_, i) => i !== fileIdx) } : e,
      ),
    );
  };

  const totalFileCount = entries.reduce((sum, e) => sum + e.files.length, 0);

  const resetDialog = () => {
    setEntries([{ id: nextEntryId++, contentType: "", name: "", files: [] }]);
    form.reset();
  };

  const handleUploadSubmit = async (values: TopValues) => {
    const validEntries = entries.filter((e) => e.contentType && e.name.trim() && e.files.length > 0);
    if (validEntries.length === 0) {
      toast({ title: "Add at least one entry with content type, name, and file", variant: "destructive" });
      return;
    }
    const incomplete = entries.filter(
      (e) => (e.contentType || e.name.trim() || e.files.length > 0) && (!e.contentType || !e.name.trim() || e.files.length === 0),
    );
    if (incomplete.length > 0) {
      toast({ title: "Some entries are incomplete", description: "Fill in content type, name, and file for each row.", variant: "destructive" });
      return;
    }

    setUploading(true);
    let uploaded = 0;
    try {
      for (const entry of validEntries) {
        await uploadTextbookFiles({
          files: entry.files,
          board: values.board,
          class_name: values.class_name,
          subject: values.subject,
          content_type: entry.contentType as ContentTypeApi,
          content_labels: entry.files.map(() => entry.name.trim()).join(","),
        });
        uploaded += entry.files.length;
      }
      await refresh();
      setUploadOpen(false);
      resetDialog();
      toast({
        title: `${uploaded} file(s) uploaded`,
        description: "Chunking & embedding started automatically.",
      });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Textbook Uploads</h1>
          <p className="text-sm text-muted-foreground">Upload textbook PDFs or Word docs. Chunking & embedding runs automatically.</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() =>
              exportCsv({
                rows: uploads as unknown as Record<string, unknown>[],
                columns: [
                  { key: "file_name", header: "File Name" },
                  { key: "board", header: "Board" },
                  { key: "class_level", header: "Class" },
                  { key: "subject_name", header: "Subject" },
                  { key: "chapter", header: "Chapter" },
                  { key: "content_type", header: "Content Type" },
                  { key: "chunk_count", header: "Chunks" },
                  { key: "upload_date", header: "Upload Date" },
                  { key: "embedding_status", header: "Embedding" },
                ],
                fileName: `textbook_uploads_${new Date().toISOString().slice(0, 10)}.csv`,
              })
            }
          >
            Export CSV
          </Button>

          <Dialog
            open={uploadOpen}
            onOpenChange={(open) => {
              setUploadOpen(open);
              if (!open) resetDialog();
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <UploadCloud className="mr-2 h-4 w-4" />
                Upload
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
              <DialogHeader className="shrink-0">
                <DialogTitle>Upload Textbook Content</DialogTitle>
                <DialogDescription>
                  Select the subject, then add entries for each chapter, poem, unit, or lesson.
                </DialogDescription>
              </DialogHeader>

              <Form {...form}>
                <form
                  className="flex flex-col flex-1 min-h-0 gap-4"
                  onSubmit={form.handleSubmit(handleUploadSubmit)}
                >
                  {/* Board / Class / Subject — fixed at top */}
                  <div className="shrink-0 grid grid-cols-3 gap-3">
                    <FormField
                      control={form.control}
                      name="board"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Board</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={(v) => {
                              field.onChange(v);
                              form.setValue("class_name", "", { shouldValidate: false });
                              form.setValue("subject", "", { shouldValidate: false });
                            }}
                          >
                            <SelectTrigger><SelectValue placeholder="Board" /></SelectTrigger>
                            <SelectContent>
                              {boards.map((b) => (
                                <SelectItem key={b} value={b}>{b}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="class_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Class</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={(v) => {
                              field.onChange(v);
                              form.setValue("subject", "", { shouldValidate: false });
                            }}
                            disabled={!selectedBoard}
                          >
                            <SelectTrigger><SelectValue placeholder="Class" /></SelectTrigger>
                            <SelectContent>
                              {classes.map((c) => (
                                <SelectItem key={c} value={c}>{classLabel(c)}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="subject"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subject</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                            disabled={!selectedBoard || !selectedClass || subjectOptions.length === 0}
                          >
                            <SelectTrigger><SelectValue placeholder="Subject" /></SelectTrigger>
                            <SelectContent>
                              {subjectOptions.map((s) => (
                                <SelectItem key={s} value={s}>{s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Entries header */}
                  <div className="shrink-0 flex items-center justify-between">
                    <p className="text-sm font-medium">
                      Content Entries
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        ({entries.length} {entries.length === 1 ? "entry" : "entries"}, {totalFileCount} file{totalFileCount !== 1 ? "s" : ""})
                      </span>
                    </p>
                    <Button type="button" variant="outline" size="sm" onClick={addEntry}>
                      <Plus className="mr-1.5 h-3.5 w-3.5" />
                      Add
                    </Button>
                  </div>

                  {/* Scrollable entries list */}
                  <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1 space-y-2">
                    {entries.map((entry, idx) => (
                      <div key={entry.id} className="rounded-lg border p-3 space-y-2">
                        {/* Row: # | Content Type | Name | File btn | Remove */}
                        <div className="flex items-end gap-2">
                          <span className="shrink-0 text-xs font-bold text-muted-foreground w-5 text-right pb-2">
                            {idx + 1}.
                          </span>

                          <div className="w-[130px] shrink-0 space-y-1">
                            {idx === 0 && <label className="text-xs font-medium text-muted-foreground">Type</label>}
                            <Select
                              value={entry.contentType}
                              onValueChange={(v) => updateEntry(entry.id, { contentType: v as ContentTypeApi })}
                            >
                              <SelectTrigger className="h-9 text-sm">
                                <SelectValue placeholder="Type" />
                              </SelectTrigger>
                              <SelectContent>
                                {CONTENT_TYPES.map((ct) => (
                                  <SelectItem key={ct.value} value={ct.value}>{ct.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="flex-1 min-w-0 space-y-1">
                            {idx === 0 && <label className="text-xs font-medium text-muted-foreground">Name</label>}
                            <Input
                              className="h-9 text-sm"
                              placeholder={namePlaceholder(entry.contentType)}
                              value={entry.name}
                              onChange={(e) => updateEntry(entry.id, { name: e.target.value })}
                            />
                          </div>

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="shrink-0 h-9 px-2.5"
                            onClick={() => fileInputRefs.current[entry.id]?.click()}
                          >
                            <UploadCloud className="h-3.5 w-3.5 mr-1.5" />
                            {entry.files.length > 0
                              ? `${entry.files.length} file${entry.files.length > 1 ? "s" : ""}`
                              : "File"}
                          </Button>
                          <input
                            ref={(el) => { fileInputRefs.current[entry.id] = el; }}
                            type="file"
                            accept={ACCEPTED_TYPES}
                            multiple
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files) {
                                const newFiles = Array.from(e.target.files);
                                updateEntry(entry.id, { files: [...entry.files, ...newFiles] });
                              }
                              e.target.value = "";
                            }}
                          />

                          {entries.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="shrink-0 h-9 w-9 text-muted-foreground hover:text-destructive"
                              onClick={() => removeEntry(entry.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>

                        {/* File chips */}
                        {entry.files.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pl-7">
                            {entry.files.map((file, fIdx) => (
                              <span
                                key={fIdx}
                                className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs"
                              >
                                <FileText className="h-3 w-3 text-muted-foreground" />
                                <span className="max-w-[140px] truncate">{file.name}</span>
                                <button
                                  type="button"
                                  className="text-muted-foreground hover:text-destructive ml-0.5"
                                  onClick={() => removeFileFromEntry(entry.id, fIdx)}
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Footer — fixed at bottom */}
                  <div className="shrink-0 flex items-center justify-between border-t pt-3">
                    <Button type="button" variant="outline" size="sm" onClick={addEntry}>
                      <Plus className="mr-1.5 h-3.5 w-3.5" />
                      Add More
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setUploadOpen(false);
                          resetDialog();
                        }}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={totalFileCount === 0 || uploading}>
                        {uploading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <UploadCloud className="mr-2 h-4 w-4" />
                            Upload All ({totalFileCount})
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Uploads</p>
            <p className="text-2xl font-bold mt-1">{uploads.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Embedded</p>
            <p className="text-2xl font-bold mt-1 text-green-600">{embeddedCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Pending / Queue</p>
            <p className="text-2xl font-bold mt-1 text-amber-600">{queueCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Chunks</p>
            <p className="text-2xl font-bold mt-1">{totalChunks.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Uploads</CardTitle>
          <CardDescription>Track OCR → chunking → embedding pipeline statuses.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex items-center gap-2">
            <Badge variant="outline">Queue: {queueCount}</Badge>
            <Badge variant="secondary">Embedded: {embeddedCount}</Badge>
            <Badge variant={failedCount > 0 ? "destructive" : "outline"}>Failed: {failedCount}</Badge>
          </div>

          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File</TableHead>
                  <TableHead>Board</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Chunks</TableHead>
                  <TableHead>OCR</TableHead>
                  <TableHead>Chunk</TableHead>
                  <TableHead>Embedding</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {uploads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11}>
                      <div className="py-10 text-center text-sm text-muted-foreground">No uploads yet.</div>
                    </TableCell>
                  </TableRow>
                ) : (
                  uploads.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium max-w-[160px] truncate" title={u.file_name}>
                        {u.file_name}
                      </TableCell>
                      <TableCell>{u.board}</TableCell>
                      <TableCell>{classLabel(u.class_level)}</TableCell>
                      <TableCell>{u.subject_name}</TableCell>
                      <TableCell className="max-w-[140px] truncate" title={u.content_label ?? u.chapter ?? "-"}>
                        {u.content_label ?? u.chapter ?? "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {u.content_type ?? "-"}
                        </Badge>
                      </TableCell>
                      <TableCell>{u.chunk_count || 0}</TableCell>
                      <TableCell>
                        <StatusPill status={statusLabel(u.ocr_status) as "Queued"} />
                      </TableCell>
                      <TableCell>
                        <StatusPill status={statusLabel(u.chunk_status) as "Queued"} />
                      </TableCell>
                      <TableCell>
                        <StatusPill status={statusLabel(u.embedding_status) as "Queued"} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {u.file_path && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Process (chunk + embed)"
                              onClick={async () => {
                                try {
                                  await processTextbookUpload(u.id);
                                  toast({ title: "Processing started", description: u.file_name });
                                  setTimeout(refresh, 2000);
                                } catch {
                                  toast({ title: "Process failed", variant: "destructive" });
                                }
                              }}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Retry (reset to queued)"
                            onClick={async () => {
                              await patchTextbookUploadStatus(u.id, {
                                ocr_status: "QUEUED",
                                chunk_status: "QUEUED",
                                embedding_status: "QUEUED",
                              });
                              await refresh();
                            }}
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Reprocess"
                            onClick={async () => {
                              await patchTextbookUploadStatus(u.id, {
                                ocr_status: "PROCESSING",
                                chunk_status: "PROCESSING",
                                embedding_status: "PROCESSING",
                              });
                              await refresh();
                            }}
                          >
                            <RefreshCcw className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Delete"
                            onClick={async () => {
                              await deleteTextbookUpload(u.id);
                              await refresh();
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
