import { useEffect, useMemo, useRef } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FileText, Plus, Trash2, Upload, UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ClassOverviewItem, SubjectItem } from "@/modules/organization/types/classes-admin";
import { classSubjectMappingKey } from "@/modules/organization/utils/classes-subject-helpers";

const CONTENT_TYPES = [
  { value: "CHAPTER", label: "Chapter" },
  { value: "POEM", label: "Poem" },
  { value: "UNIT", label: "Unit" },
  { value: "LESSON", label: "Lesson" },
  { value: "MASTER", label: "Master" },
] as const;

const NUMBERED_COUNT = 20;

// ponytail: single grid template for header + rows; horizontal scroll on narrow viewports
const ROW_GRID =
  "grid grid-cols-[minmax(148px,1.15fr)_minmax(88px,0.75fr)_minmax(80px,0.6fr)_minmax(88px,0.65fr)_minmax(200px,2.4fr)_64px_2rem] items-start gap-x-2";

const FIELD_BORDER = "!border !border-black dark:!border-slate-400";
const COL_HEADER = "text-[11px] font-semibold uppercase tracking-wide text-black dark:text-foreground";
const SELECT_CLASS = `h-9 bg-background text-xs ${FIELD_BORDER}`;
const TITLE_CLASS = `h-9 bg-background text-sm ${FIELD_BORDER}`;
const FILE_BTN_CLASS = `h-8 w-8 shrink-0 p-0 ${FIELD_BORDER}`;

function contentNumberLabel(contentType: string) {
  switch (contentType) {
    case "POEM":
      return "Poem";
    case "UNIT":
      return "Unit";
    case "LESSON":
      return "Lesson";
    default:
      return "Chapter";
  }
}

function numberedOptions(contentType: string) {
  const label = contentNumberLabel(contentType);
  return Array.from({ length: NUMBERED_COUNT }, (_, i) => `${label} ${i + 1}`);
}

const TYPES_WITH_CHAPTER = new Set(["CHAPTER", "POEM", "UNIT", "LESSON"]);

export { TYPES_WITH_CHAPTER };

function contentNamePlaceholder(contentType: string) {
  switch (contentType) {
    case "POEM":
      return "Poem title";
    case "UNIT":
      return "Unit title";
    case "LESSON":
      return "Lesson title";
    default:
      return "Chapter title";
  }
}

const ACCEPTED_FILE = ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function isPdfOrDocx(file: File) {
  const name = file.name.toLowerCase();
  return name.endsWith(".pdf") || name.endsWith(".docx");
}

const uploadRowSchema = z
  .object({
    classId: z.string().min(1, "Required"),
    subjectId: z.string().min(1, "Required"),
    contentType: z.string().min(1, "Required"),
    chapter: z.string().optional(),
    chapterName: z.string().optional(),
    file: z.custom<File>((v) => v instanceof File, "Required"),
  })
  .superRefine((data, ctx) => {
    if (TYPES_WITH_CHAPTER.has(data.contentType)) {
      const numberLabel = contentNumberLabel(data.contentType).toLowerCase();
      if (!data.chapter?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Select ${numberLabel}`, path: ["chapter"] });
      }
      if (!data.chapterName?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter title", path: ["chapterName"] });
      }
    }
    if (data.file instanceof File && !isPdfOrDocx(data.file)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "PDF or DOCX only", path: ["file"] });
    }
  });

const uploadSchema = z.object({
  uploads: z.array(uploadRowSchema).min(1, "Add at least one upload"),
});

export type UploadTextbookRowValues = z.infer<typeof uploadRowSchema>;
export type UploadTextbookFormValues = z.infer<typeof uploadSchema>;

const emptyRow = (): UploadTextbookRowValues => ({
  classId: "",
  subjectId: "",
  contentType: "",
  chapter: "",
  chapterName: "",
  file: undefined as unknown as File,
});

export function classOptionLabel(cls: ClassOverviewItem) {
  const curriculum = cls.curriculums[0] ?? "—";
  return `Grade ${cls.grade} · Section ${cls.section} · ${curriculum}`;
}

/** Short label for narrow selects — curriculum always visible */
export function classOptionLabelCompact(cls: ClassOverviewItem) {
  const curriculum = cls.curriculums[0] ?? "—";
  return `${cls.grade}-${cls.section} · ${curriculum}`;
}

export function subjectsForClass(
  classId: string,
  classes: ClassOverviewItem[],
  subjects: SubjectItem[],
  subjectMappings: Record<string, Record<string, boolean>>,
) {
  const active = subjects.filter((s) => s.active);
  if (!classId) return active;
  const cls = classes.find((c) => c.id === classId);
  if (!cls) return active;
  const curriculum = cls.curriculums[0] ?? "";
  const key = classSubjectMappingKey(classId, curriculum);
  const mapped = subjectMappings[key];
  if (!mapped) return active;
  const mappedIds = Object.entries(mapped)
    .filter(([, on]) => on)
    .map(([id]) => id);
  if (mappedIds.length === 0) return active;
  return active.filter((s) => mappedIds.includes(s.id));
}

interface UploadTextbookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classes: ClassOverviewItem[];
  subjects: SubjectItem[];
  subjectMappings: Record<string, Record<string, boolean>>;
  onSubmit: (values: UploadTextbookFormValues) => void;
}

export function UploadTextbookDialog({
  open,
  onOpenChange,
  classes,
  subjects,
  subjectMappings,
  onSubmit,
}: UploadTextbookDialogProps) {
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const form = useForm<UploadTextbookFormValues>({
    resolver: zodResolver(uploadSchema),
    defaultValues: { uploads: [emptyRow()] },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "uploads",
  });

  const classOptions = useMemo(
    () =>
      [...classes].sort(
        (a, b) =>
          a.grade.localeCompare(b.grade, undefined, { numeric: true }) ||
          a.section.localeCompare(b.section),
      ),
    [classes],
  );

  useEffect(() => {
    if (open) form.reset({ uploads: [emptyRow()] });
  }, [open, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92dvh,46rem)] w-[min(1100px,calc(100vw-1.5rem))] max-w-none flex-col gap-0 overflow-hidden p-4 sm:p-6">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <UploadCloud className="h-5 w-5" />
            Upload Textbook
          </DialogTitle>
          <DialogDescription>
            Add rows for each file. Scroll when uploading many chapters or files.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="flex min-h-0 flex-1 flex-col gap-3 pt-3" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden">
              <div className="flex h-full min-h-0 min-w-[760px] flex-col">
                <div className={`${ROW_GRID} shrink-0 border-b border-black/20 pb-2 dark:border-border/60`}>
                  {["Class", "Subject", "Type", "Number", "Title", "File"].map((label) => (
                    <span key={label} className={COL_HEADER}>
                      {label}
                    </span>
                  ))}
                  <span className="sr-only">Remove</span>
                </div>

                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto py-2 pr-1">
                  {fields.map((field, index) => {
                    const contentType = form.watch(`uploads.${index}.contentType`);
                    const classId = form.watch(`uploads.${index}.classId`);
                    const selectedFile = form.watch(`uploads.${index}.file`);
                    const subjectOptions = subjectsForClass(classId, classes, subjects, subjectMappings);
                    const needsNumber = TYPES_WITH_CHAPTER.has(contentType);
                    const numberLabel = contentNumberLabel(contentType);

                    return (
                      <div key={field.id} className={ROW_GRID}>
                        <FormField
                          control={form.control}
                          name={`uploads.${index}.classId`}
                          render={({ field: rowField }) => {
                            const selectedClass = classOptions.find((c) => c.id === rowField.value);
                            return (
                            <FormItem className="space-y-1">
                              <Select
                                value={rowField.value}
                                onValueChange={(v) => {
                                  rowField.onChange(v);
                                  const nextSubjects = subjectsForClass(v, classes, subjects, subjectMappings);
                                  const currentSubject = form.getValues(`uploads.${index}.subjectId`);
                                  if (!nextSubjects.some((s) => s.id === currentSubject)) {
                                    form.setValue(`uploads.${index}.subjectId`, "");
                                  }
                                }}
                              >
                                <FormControl>
                                  <SelectTrigger
                                    className={`${SELECT_CLASS} [&>span]:line-clamp-none`}
                                    title={selectedClass ? classOptionLabel(selectedClass) : undefined}
                                  >
                                    {selectedClass ? (
                                      <span className="min-w-0 flex-1 truncate text-left">
                                        {classOptionLabelCompact(selectedClass)}
                                      </span>
                                    ) : (
                                      <SelectValue placeholder="Class" />
                                    )}
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {classOptions.map((cls) => (
                                    <SelectItem
                                      key={cls.id}
                                      value={cls.id}
                                      textValue={classOptionLabel(cls)}
                                    >
                                      {classOptionLabel(cls)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage className="text-[10px]" />
                            </FormItem>
                            );
                          }}
                        />

                        <FormField
                          control={form.control}
                          name={`uploads.${index}.subjectId`}
                          render={({ field: rowField }) => (
                            <FormItem className="space-y-1">
                              <Select value={rowField.value} onValueChange={rowField.onChange}>
                                <FormControl>
                                  <SelectTrigger className={SELECT_CLASS}>
                                    <SelectValue placeholder="Subject" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {subjectOptions.map((subject) => (
                                    <SelectItem key={subject.id} value={subject.id}>
                                      {subject.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage className="text-[10px]" />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`uploads.${index}.contentType`}
                          render={({ field: rowField }) => (
                            <FormItem className="space-y-1">
                              <Select
                                value={rowField.value}
                                onValueChange={(v) => {
                                  rowField.onChange(v);
                                  form.setValue(`uploads.${index}.chapter`, "");
                                  form.setValue(`uploads.${index}.chapterName`, "");
                                }}
                              >
                                <FormControl>
                                  <SelectTrigger className={SELECT_CLASS}>
                                    <SelectValue placeholder="Type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {CONTENT_TYPES.map((t) => (
                                    <SelectItem key={t.value} value={t.value}>
                                      {t.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage className="text-[10px]" />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`uploads.${index}.chapter`}
                          render={({ field: rowField }) => (
                            <FormItem className="space-y-1">
                              {needsNumber ? (
                                <Select value={rowField.value} onValueChange={rowField.onChange}>
                                  <FormControl>
                                    <SelectTrigger className={SELECT_CLASS}>
                                      <SelectValue placeholder={numberLabel} />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {numberedOptions(contentType).map((opt) => (
                                      <SelectItem key={opt} value={opt}>
                                        {opt}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <div
                                  className={`flex h-9 items-center rounded-md border border-dashed px-2 text-xs text-muted-foreground ${FIELD_BORDER}`}
                                >
                                  —
                                </div>
                              )}
                              <FormMessage className="text-[10px]" />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`uploads.${index}.chapterName`}
                          render={({ field: rowField }) => (
                            <FormItem className="space-y-1">
                              <FormControl>
                                <Input
                                  className={TITLE_CLASS}
                                  placeholder={needsNumber ? contentNamePlaceholder(contentType) : "—"}
                                  disabled={!needsNumber}
                                  {...rowField}
                                />
                              </FormControl>
                              <FormMessage className="text-[10px]" />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`uploads.${index}.file`}
                          render={() => (
                            <FormItem className="space-y-1">
                              <input
                                ref={(el) => {
                                  fileInputRefs.current[index] = el;
                                }}
                                type="file"
                                accept={ACCEPTED_FILE}
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    form.setValue(`uploads.${index}.file`, file, { shouldValidate: true });
                                  }
                                  e.target.value = "";
                                }}
                              />
                              {selectedFile instanceof File ? (
                                <div
                                  className={`flex h-8 w-full max-w-[64px] items-center justify-between gap-0.5 rounded-md px-1 ${FIELD_BORDER}`}
                                  title={selectedFile.name}
                                >
                                  <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                  <button
                                    type="button"
                                    className="text-muted-foreground hover:text-destructive"
                                    aria-label="Remove file"
                                    onClick={() =>
                                      form.setValue(`uploads.${index}.file`, undefined as unknown as File, {
                                        shouldValidate: true,
                                      })
                                    }
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              ) : (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className={FILE_BTN_CLASS}
                                  aria-label="Choose file"
                                  onClick={() => fileInputRefs.current[index]?.click()}
                                >
                                  <Upload className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              <FormMessage className="text-[10px]" />
                            </FormItem>
                          )}
                        />

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                          disabled={fields.length === 1}
                          aria-label="Remove row"
                          onClick={() => remove(index)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5 !border !border-slate-300 hover:!border-slate-400"
                onClick={() => append(emptyRow())}
              >
                <Plus className="h-3.5 w-3.5" />
                Add more ({fields.length} row{fields.length === 1 ? "" : "s"})
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit">Upload {fields.length > 1 ? `(${fields.length})` : ""}</Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
