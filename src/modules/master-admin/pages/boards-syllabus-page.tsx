import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  createCatalogBoard,
  createSyllabusSubjects,
  deleteCatalogBoard,
  deleteSyllabusSubject,
  getCatalogBoards,
  getCatalogEnums,
  getSyllabusSubjects,
  updateSyllabusSubject,
} from "@/api/masterAdmin";
import type { BoardEnumApi, ClassEnumApi } from "@/api/types";
import { useQueryClient } from "@tanstack/react-query";
import {
  SUBJECT_IMAGES_KEY,
  SubjectImagePicker,
  SubjectImagePool,
  SubjectImageThumb,
  useSubjectImages,
} from "@/modules/master-admin/components/subject-image-picker";
import {
  BookOpen,
  Image as ImageIcon,
  GitBranch,
  Layers,
  List as ListIcon,
  Plus,
  Trash2,
  GraduationCap,
  BookMarked,
  Search,
  Pencil,
} from "lucide-react";

const addBoardSchema = z.object({
  board: z.string().min(1, "Board code is required (e.g. CBSE)"),
  country: z.string().min(2, "Country is required"),
});
type AddBoardValues = z.infer<typeof addBoardSchema>;

const addSyllabusSchema = z.object({
  board: z.string().min(1, "Board is required"),
  class_names: z.array(z.string()).min(1, "Select at least one class"),
  subject_names: z.array(z.string().min(1, "Subject name is required")).min(1, "Add at least one subject"),
});
type AddSyllabusValues = z.infer<typeof addSyllabusSchema>;

const classLabel = (cls: string) => cls.replace("CLASS_", "Class ");

type SyllabusRow = { id: string; board: string; class_level: string; subject_name: string; image_id: number | null };

export default function MasterAdminBoardsSyllabusPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: poolImages = [] } = useSubjectImages();
  const [newImageIds, setNewImageIds] = useState<(number | null)[]>([]);
  const [loading, setLoading] = useState(true);
  const [boards, setBoards] = useState<Array<{ id: string; board: BoardEnumApi; country: string }>>([]);
  const [classes, setClasses] = useState<ClassEnumApi[]>([]);
  const [boardOptions, setBoardOptions] = useState<BoardEnumApi[]>([]);
  const [syllabus, setSyllabus] = useState<SyllabusRow[]>([]);
  const [editRow, setEditRow] = useState<SyllabusRow | null>(null);
  const [deleteRow, setDeleteRow] = useState<SyllabusRow | null>(null);
  const [savingRow, setSavingRow] = useState(false);
  const [addBoardOpen, setAddBoardOpen] = useState(false);
  const [addSyllabusOpen, setAddSyllabusOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; board: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const addBoardForm = useForm<AddBoardValues>({
    resolver: zodResolver(addBoardSchema),
    defaultValues: { board: "CBSE", country: "India" },
  });

  const addSyllabusForm = useForm<AddSyllabusValues>({
    resolver: zodResolver(addSyllabusSchema),
    defaultValues: { board: "CBSE", class_names: ["CLASS_8"], subject_names: ["English"] },
  });

  const subjectNames = addSyllabusForm.watch("subject_names");

  const refresh = async () => {
    const [catalogEnums, boardRows, syllabusRows] = await Promise.all([
      getCatalogEnums(),
      getCatalogBoards(),
      getSyllabusSubjects(),
    ]);
    setClasses(catalogEnums.classes);
    setBoardOptions(catalogEnums.boards);
    setBoards(boardRows.map((b) => ({ id: b.id, board: b.board, country: b.country })));
    setSyllabus(
      syllabusRows.map((r) => ({
        id: r.id,
        board: r.board,
        class_level: r.class_level,
        subject_name: r.subject_name,
        image_id: r.image_id ?? null,
      })),
    );
    void queryClient.invalidateQueries({ queryKey: SUBJECT_IMAGES_KEY });
  };

  useEffect(() => {
    refresh()
      .catch(() => toast({ title: "Failed to load boards/syllabus", variant: "destructive" }))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const boardStats = useMemo(() => {
    const map = new Map<string, { classes: Set<string>; subjects: Set<string> }>();
    for (const row of syllabus) {
      const current = map.get(row.board) ?? { classes: new Set<string>(), subjects: new Set<string>() };
      current.classes.add(row.class_level);
      current.subjects.add(row.subject_name.toLowerCase());
      map.set(row.board, current);
    }
    return map;
  }, [syllabus]);

  const uniqueSubjectsCount = useMemo(() => {
    const set = new Set<string>();
    syllabus.forEach((s) => set.add(s.subject_name.toLowerCase()));
    return set.size;
  }, [syllabus]);

  // Filtered syllabus rows
  const filteredSyllabus = useMemo(() => {
    if (!searchQuery.trim()) return syllabus;
    const q = searchQuery.toLowerCase();
    return syllabus.filter(
      (s) =>
        s.board.toLowerCase().includes(q) ||
        s.class_level.toLowerCase().includes(q) ||
        s.subject_name.toLowerCase().includes(q),
    );
  }, [syllabus, searchQuery]);

  if (loading) {
    return (
      <PageShell>
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </PageShell>
    );
  }

  return (
    <PageShell>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Boards & Syllabus</h1>
          <p className="text-sm text-muted-foreground">
            Configure educational boards, standard class levels, and syllabus mappings for AI tutoring.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Curriculum Boards</p>
                <p className="text-2xl font-bold mt-1 text-foreground">{boards.length}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                <BookOpen className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Grade Levels</p>
                <p className="text-2xl font-bold mt-1 text-blue-600 dark:text-blue-400">{classes.length}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600">
                <GraduationCap className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Unique Subjects</p>
                <p className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">{uniqueSubjectsCount}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600">
                <BookMarked className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Syllabus Mappings</p>
                <p className="text-2xl font-bold mt-1 text-indigo-600 dark:text-indigo-400">{syllabus.length}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600">
                <Layers className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="boards" className="space-y-4">
        <TabsList className="bg-muted/60 p-1">
          <TabsTrigger value="boards" className="gap-2 text-xs">
            <BookOpen className="h-3.5 w-3.5" />
            Curriculum Boards ({boards.length})
          </TabsTrigger>
          <TabsTrigger value="syllabus" className="gap-2 text-xs">
            <Layers className="h-3.5 w-3.5" />
            Syllabus Hierarchy ({syllabus.length})
          </TabsTrigger>
          <TabsTrigger value="images" className="gap-2 text-xs">
            <ImageIcon className="h-3.5 w-3.5" />
            Subject Images ({poolImages.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Boards */}
        <TabsContent value="boards">
          <Card className="shadow-sm">
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">Curriculum Boards</CardTitle>
                <CardDescription className="text-xs">
                  Active examination and academic boards recognized across the platform.
                </CardDescription>
              </div>
              <Dialog open={addBoardOpen} onOpenChange={setAddBoardOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="h-8 gap-1.5 text-xs">
                    <Plus className="h-3.5 w-3.5" />
                    Add Board
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Curriculum Board</DialogTitle>
                    <DialogDescription className="text-xs">
                      Register an educational board code and country of origin.
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...addBoardForm}>
                    <form
                      className="space-y-3 pt-2"
                      onSubmit={addBoardForm.handleSubmit(async (v) => {
                        await createCatalogBoard({ board: v.board.trim().toUpperCase(), country: v.country.trim() });
                        await refresh();
                        setAddBoardOpen(false);
                        addBoardForm.reset();
                        toast({ title: "Board created", description: `Added board ${v.board}` });
                      })}
                    >
                      <FormField
                        control={addBoardForm.control}
                        name="board"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Board Code</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger className="h-9 text-xs" aria-label="Board code">
                                  <SelectValue placeholder="Select board" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {boardOptions.map((b) => (
                                  <SelectItem key={b} value={b}>
                                    {b}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={addBoardForm.control}
                        name="country"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Country</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="India" className="h-9 text-xs" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => setAddBoardOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" size="sm">
                          Create Board
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table className="min-w-[700px]">
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="min-w-[180px]">Board</TableHead>
                      <TableHead className="w-36">Country</TableHead>
                      <TableHead className="w-32 text-center">Classes Covered</TableHead>
                      <TableHead className="w-32 text-center">Configured Subjects</TableHead>
                      <TableHead className="w-24 text-right pr-4">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {boards.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5}>
                          <div className="py-8 text-center text-xs text-muted-foreground">No boards configured yet.</div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      boards.map((b) => (
                        <TableRow key={b.id} className="hover:bg-muted/30">
                          <TableCell className="font-semibold text-foreground">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="font-mono text-xs uppercase">
                                {b.board}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">{b.country}</TableCell>
                          <TableCell className="text-center font-mono text-xs">
                            {boardStats.get(b.board)?.classes.size ?? 0}
                          </TableCell>
                          <TableCell className="text-center font-mono text-xs">
                            {boardStats.get(b.board)?.subjects.size ?? 0}
                          </TableCell>
                          <TableCell className="text-right pr-3">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setDeleteTarget({ id: b.id, board: b.board })}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Syllabus */}
        <TabsContent value="syllabus">
          <Card className="shadow-sm">
            <CardHeader className="pb-3 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold">Syllabus Hierarchy</CardTitle>
                <CardDescription className="text-xs">
                  Academic subjects configured for each grade level under respective curricula.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative w-48 sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search subject or class..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 text-xs h-8 bg-muted/20"
                  />
                </div>

                <Dialog
                  open={addSyllabusOpen}
                  onOpenChange={(open) => {
                    if (open) setNewImageIds([]);
                    setAddSyllabusOpen(open);
                  }}
                >
                  <DialogTrigger asChild>
                    <Button size="sm" className="h-8 gap-1.5 text-xs">
                      <Plus className="h-3.5 w-3.5" />
                      Add Syllabus
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-xl">
                    <DialogHeader>
                      <DialogTitle>Add Syllabus Mappings</DialogTitle>
                      <DialogDescription className="text-xs">
                        Assign multiple subjects to multiple classes for an academic board.
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...addSyllabusForm}>
                      <form
                        className="space-y-3 pt-2"
                        onSubmit={addSyllabusForm.handleSubmit(async (v) => {
                          const created = await createSyllabusSubjects({
                            board: v.board,
                            class_names: v.class_names as ClassEnumApi[],
                            subject_names: v.subject_names.map((s) => s.trim()).filter(Boolean),
                          });
                          const imageFailed: string[] = [];
                          await Promise.all(
                            created.map(async (row) => {
                              const idx = v.subject_names.findIndex(
                                (s) => s.trim().toLowerCase() === row.subject_name.toLowerCase(),
                              );
                              const imageId = idx >= 0 ? newImageIds[idx] : null;
                              if (imageId == null) return;
                              try {
                                await updateSyllabusSubject(row.id, { image_id: imageId });
                              } catch {
                                imageFailed.push(row.subject_name);
                              }
                            }),
                          );
                          await refresh();
                          setAddSyllabusOpen(false);
                          addSyllabusForm.reset();
                          setNewImageIds([]);
                          toast(
                            imageFailed.length
                              ? {
                                  title: "Syllabus added, but some images were not assigned",
                                  description: `Pick them from Edit: ${[...new Set(imageFailed)].join(", ")}`,
                                  variant: "destructive",
                                }
                              : { title: "Syllabus added successfully" },
                          );
                        })}
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <FormField
                            control={addSyllabusForm.control}
                            name="board"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Board</FormLabel>
                                <Select value={field.value} onValueChange={field.onChange}>
                                  <FormControl>
                                    <SelectTrigger className="h-9 text-xs" aria-label="Board">
                                      <SelectValue placeholder="Select board" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {boardOptions.map((b) => (
                                      <SelectItem key={b} value={b}>
                                        {b}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={addSyllabusForm.control}
                            name="class_names"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Grade Levels</FormLabel>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      className="w-full justify-between font-normal h-9 text-xs"
                                    >
                                      {field.value.length} selected
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-[240px] p-3">
                                    <div className="space-y-2 max-h-56 overflow-y-auto">
                                      {classes.map((c) => (
                                        <label key={c} className="flex items-center gap-2 text-xs cursor-pointer">
                                          <Checkbox
                                            checked={field.value.includes(c)}
                                            onCheckedChange={(checked) =>
                                              checked
                                                ? field.onChange([...field.value, c])
                                                : field.onChange(field.value.filter((x) => x !== c))
                                            }
                                          />
                                          <span>{classLabel(c)}</span>
                                        </label>
                                      ))}
                                    </div>
                                  </PopoverContent>
                                </Popover>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="space-y-2 pt-2">
                          <FormLabel className="text-xs">Subjects</FormLabel>
                          <div className="space-y-2 max-h-48 overflow-y-auto p-1">
                            {subjectNames.map((_, index) => (
                              <FormField
                                key={`subject-${index}`}
                                control={addSyllabusForm.control}
                                name={`subject_names.${index}`}
                                render={({ field }) => (
                                  <FormItem>
                                    <div className="flex gap-2">
                                      <FormControl>
                                        <Input {...field} placeholder={`Subject ${index + 1}`} className="h-9 text-xs" />
                                      </FormControl>
                                      <Popover>
                                        <PopoverTrigger asChild>
                                          <Button
                                            type="button"
                                            variant="outline"
                                            aria-label={`Image for subject ${index + 1}`}
                                            className="h-9 w-32 shrink-0 justify-start gap-2 px-2 text-xs font-normal"
                                          >
                                            {newImageIds[index] != null ? (
                                              <span className="h-6 w-6 shrink-0 overflow-hidden rounded">
                                                <SubjectImageThumb
                                                  image={poolImages.find((im) => im.id === newImageIds[index])}
                                                />
                                              </span>
                                            ) : (
                                              <ImageIcon className="h-4 w-4 text-muted-foreground" />
                                            )}
                                            {newImageIds[index] != null ? "Change" : "Pick image"}
                                          </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[340px] p-3" align="end">
                                          <SubjectImagePicker
                                            value={newImageIds[index] ?? null}
                                            onChange={(id) =>
                                              setNewImageIds((prev) => {
                                                const next = [...prev];
                                                next[index] = id;
                                                return next;
                                              })
                                            }
                                          />
                                        </PopoverContent>
                                      </Popover>
                                    </div>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            ))}
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-xs h-8"
                            onClick={() =>
                              addSyllabusForm.setValue("subject_names", [...subjectNames, ""], { shouldValidate: true })
                            }
                          >
                            + Add Another Subject
                          </Button>
                        </div>

                        <div className="flex justify-end gap-2 pt-3 border-t">
                          <Button type="button" variant="outline" size="sm" onClick={() => setAddSyllabusOpen(false)}>
                            Cancel
                          </Button>
                          <Button type="submit" size="sm">
                            Save Hierarchy
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <Tabs defaultValue="tree">
                <TabsList className="bg-muted/60 p-1 mb-4">
                  <TabsTrigger value="tree" className="gap-1.5 text-xs">
                    <GitBranch className="h-3.5 w-3.5" />
                    Structured Tree
                  </TabsTrigger>
                  <TabsTrigger value="list" className="gap-1.5 text-xs">
                    <ListIcon className="h-3.5 w-3.5" />
                    Flat Listing ({filteredSyllabus.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="tree" className="space-y-4">
                  {Object.entries(
                    filteredSyllabus.reduce<Record<string, Record<string, SyllabusRow[]>>>((acc, row) => {
                      acc[row.board] ??= {};
                      acc[row.board][row.class_level] ??= [];
                      acc[row.board][row.class_level].push(row);
                      return acc;
                    }, {}),
                  ).map(([board, classesMap]) => (
                    <div key={board} className="rounded-xl border bg-card p-4 shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <Badge variant="outline" className="font-mono uppercase font-bold text-xs">
                          {board}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {Object.keys(classesMap).length} classes configured
                        </span>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {Object.entries(classesMap).map(([cls, subjects]) => (
                          <div key={`${board}-${cls}`} className="p-3 rounded-lg border bg-muted/20">
                            <span className="font-bold text-xs text-foreground block mb-1.5">
                              {classLabel(cls)}
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {subjects.map((row) => (
                                <button
                                  key={row.id}
                                  type="button"
                                  title="Edit or delete this subject"
                                  onClick={() => setEditRow(row)}
                                >
                                  <Badge
                                    variant="secondary"
                                    className="text-[11px] font-normal gap-1 cursor-pointer hover:bg-primary/15"
                                  >
                                    {row.subject_name}
                                    <Pencil className="h-2.5 w-2.5 opacity-60" />
                                  </Badge>
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="list">
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted/40">
                        <TableRow>
                          <TableHead className="w-36">Board</TableHead>
                          <TableHead className="w-40">Class Level</TableHead>
                          <TableHead>Subject Name</TableHead>
                          <TableHead className="w-24 text-right pr-4">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredSyllabus.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell className="font-mono text-xs">{row.board}</TableCell>
                            <TableCell className="text-xs">{classLabel(row.class_level)}</TableCell>
                            <TableCell className="text-xs font-semibold text-foreground">{row.subject_name}</TableCell>
                            <TableCell className="text-right pr-3">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                aria-label="Edit syllabus entry"
                                onClick={() => setEditRow(row)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                aria-label="Delete syllabus entry"
                                onClick={() => setDeleteRow(row)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Subject image pool */}
        <TabsContent value="images">
          <Card className="shadow-sm">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-bold">Subject Images</CardTitle>
              <CardDescription className="text-xs">
                Shared cover images students see on their subject cards.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <SubjectImagePool />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Curriculum Board?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete board <strong>{deleteTarget?.board}</strong>? Associated syllabus mappings
              may be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!deleteTarget) return;
                await deleteCatalogBoard(deleteTarget.id);
                await refresh();
                setDeleteTarget(null);
                toast({ title: "Board deleted" });
              }}
            >
              Delete Board
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Syllabus Entry */}
      <Dialog
        open={editRow !== null}
        onOpenChange={(open) => {
          if (!open) setEditRow(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Syllabus Entry</DialogTitle>
            <DialogDescription className="text-xs">
              Renaming a subject does not rename textbooks already uploaded under the old name.
            </DialogDescription>
          </DialogHeader>
          {editRow && (
            <form
              className="space-y-3 pt-2"
              onSubmit={async (e) => {
                e.preventDefault();
                setSavingRow(true);
                try {
                  await updateSyllabusSubject(editRow.id, {
                    board: editRow.board,
                    class_level: editRow.class_level as ClassEnumApi,
                    subject_name: editRow.subject_name.trim(),
                    image_id: editRow.image_id,
                  });
                  await refresh();
                  setEditRow(null);
                  toast({ title: "Syllabus entry updated" });
                } catch (err) {
                  toast({ title: "Update failed", description: (err as Error).message, variant: "destructive" });
                } finally {
                  setSavingRow(false);
                }
              }}
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Board</Label>
                  <Select value={editRow.board} onValueChange={(v) => setEditRow({ ...editRow, board: v })}>
                    <SelectTrigger className="h-9 text-xs" aria-label="Board">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {boards.map((b) => (
                        <SelectItem key={b.id} value={b.board}>
                          {b.board}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Class</Label>
                  <Select value={editRow.class_level} onValueChange={(v) => setEditRow({ ...editRow, class_level: v })}>
                    <SelectTrigger className="h-9 text-xs" aria-label="Class">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((c) => (
                        <SelectItem key={c} value={c}>
                          {classLabel(c)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-subject" className="text-xs">
                  Subject Name
                </Label>
                <Input
                  id="edit-subject"
                  required
                  maxLength={120}
                  value={editRow.subject_name}
                  onChange={(e) => setEditRow({ ...editRow, subject_name: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Subject Image</Label>
                <SubjectImagePicker
                  value={editRow.image_id}
                  onChange={(id) => setEditRow({ ...editRow, image_id: id })}
                />
              </div>
              <div className="flex justify-between gap-2 pt-3 border-t">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    setDeleteRow(editRow);
                    setEditRow(null);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Delete
                </Button>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setEditRow(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={savingRow}>
                    {savingRow ? "Saving…" : "Save"}
                  </Button>
                </div>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Syllabus Entry */}
      <AlertDialog open={deleteRow !== null} onOpenChange={(open) => !open && setDeleteRow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete syllabus entry?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove <strong>{deleteRow?.subject_name}</strong> from{" "}
              <strong>
                {deleteRow?.board} · {deleteRow ? classLabel(deleteRow.class_level) : ""}
              </strong>
              ? Students in that class will no longer see this subject.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!deleteRow) return;
                try {
                  await deleteSyllabusSubject(deleteRow.id);
                  await refresh();
                  setDeleteRow(null);
                  toast({ title: "Syllabus entry deleted" });
                } catch (err) {
                  toast({ title: "Delete failed", description: (err as Error).message, variant: "destructive" });
                }
              }}
            >
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}
