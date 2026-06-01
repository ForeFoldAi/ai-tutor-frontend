import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { createCatalogBoard, createSyllabusSubjects, deleteCatalogBoard, getCatalogBoards, getCatalogEnums, getSyllabusSubjects } from "@/api/masterAdmin";
import type { BoardEnumApi, ClassEnumApi } from "@/api/types";
import { BookOpen, GitBranch, Layers, List as ListIcon, Plus, Trash2 } from "lucide-react";

const addBoardSchema = z.object({
  board: z.string().min(1, "Board is required"),
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

export default function MasterAdminBoardsSyllabusPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [boards, setBoards] = useState<Array<{ id: string; board: BoardEnumApi; country: string }>>([]);
  const [classes, setClasses] = useState<ClassEnumApi[]>([]);
  const [syllabus, setSyllabus] = useState<Array<{ id: string; board: string; class_level: string; subject_name: string }>>([]);
  const [addBoardOpen, setAddBoardOpen] = useState(false);
  const [addSyllabusOpen, setAddSyllabusOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; board: string } | null>(null);

  const addBoardForm = useForm<AddBoardValues>({
    resolver: zodResolver(addBoardSchema),
    defaultValues: { board: "CBSE", country: "India" },
  });
  const addSyllabusForm = useForm<AddSyllabusValues>({
    resolver: zodResolver(addSyllabusSchema),
    defaultValues: { board: "CBSE", class_names: ["CLASS_1"], subject_names: ["Mathematics"] },
  });
  const subjectNames = addSyllabusForm.watch("subject_names");

  const refresh = async () => {
    const [catalogEnums, boardRows, syllabusRows] = await Promise.all([getCatalogEnums(), getCatalogBoards(), getSyllabusSubjects()]);
    setClasses(catalogEnums.classes);
    setBoards(boardRows.map((b) => ({ id: b.id, board: b.board, country: b.country })));
    setSyllabus(
      syllabusRows.map((r) => ({
        id: r.id,
        board: r.board,
        class_level: r.class_level,
        subject_name: r.subject_name,
      })),
    );
  };

  useEffect(() => {
    refresh()
      .catch(() => toast({ title: "Failed to load boards/syllabus", variant: "destructive" }))
      .finally(() => setLoading(false));
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

  if (loading) {
    return <div className="p-6"><Skeleton className="h-80 w-full" /></div>;
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Boards & Syllabus</h1>
      <Tabs defaultValue="boards" className="space-y-4">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="boards" className="gap-2"><BookOpen className="h-4 w-4" />Boards List</TabsTrigger>
          <TabsTrigger value="syllabus" className="gap-2"><Layers className="h-4 w-4" />Syllabus Management</TabsTrigger>
        </TabsList>
        <TabsContent value="boards">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Boards List</CardTitle>
                <Dialog open={addBoardOpen} onOpenChange={setAddBoardOpen}>
                  <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" />Add Board</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Add board</DialogTitle><DialogDescription>Creates a board entry backed by enum values.</DialogDescription></DialogHeader>
                    <Form {...addBoardForm}>
                      <form
                        className="space-y-3"
                        onSubmit={addBoardForm.handleSubmit(async (v) => {
                          await createCatalogBoard({ board: v.board, country: v.country });
                          await refresh();
                          setAddBoardOpen(false);
                          toast({ title: "Board created" });
                        })}
                      >
                        <FormField control={addBoardForm.control} name="board" render={({ field }) => (<FormItem><FormLabel>Board</FormLabel><FormControl><Input {...field} placeholder="CBSE" /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={addBoardForm.control} name="country" render={({ field }) => (<FormItem><FormLabel>Country</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setAddBoardOpen(false)}>Cancel</Button><Button type="submit">Create</Button></div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
              <CardDescription>Board and class enum data is now API-backed.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto rounded-lg border">
                <Table>
                  <TableHeader><TableRow><TableHead>Board</TableHead><TableHead>Country</TableHead><TableHead>Classes</TableHead><TableHead>Subjects</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {boards.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell className="font-medium">{b.board}</TableCell>
                        <TableCell>{b.country}</TableCell>
                        <TableCell>{boardStats.get(b.board)?.classes.size ?? 0}</TableCell>
                        <TableCell>{boardStats.get(b.board)?.subjects.size ?? 0}</TableCell>
                        <TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => setDeleteTarget({ id: b.id, board: b.board })}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="syllabus">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Syllabus Management</CardTitle>
                <Dialog open={addSyllabusOpen} onOpenChange={setAddSyllabusOpen}>
                  <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" />Add Syllabus</Button></DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader><DialogTitle>Add syllabus entry</DialogTitle><DialogDescription>Add multiple classes and multiple subjects.</DialogDescription></DialogHeader>
                    <Form {...addSyllabusForm}>
                      <form
                        className="grid gap-3 md:grid-cols-2"
                        onSubmit={addSyllabusForm.handleSubmit(async (v) => {
                          await createSyllabusSubjects({
                            board: v.board,
                            class_names: v.class_names as ClassEnumApi[],
                            subject_names: v.subject_names.map((s) => s.trim()).filter(Boolean),
                          });
                          await refresh();
                          setAddSyllabusOpen(false);
                          toast({ title: "Syllabus added" });
                        })}
                      >
                        <FormField control={addSyllabusForm.control} name="board" render={({ field }) => (<FormItem><FormLabel>Board</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField
                          control={addSyllabusForm.control}
                          name="class_names"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Classes</FormLabel>
                              <Popover>
                                <PopoverTrigger asChild><Button type="button" variant="outline" className="w-full justify-between font-normal">{field.value.length} selected</Button></PopoverTrigger>
                                <PopoverContent className="w-[240px]">
                                  <div className="space-y-2">
                                    {classes.map((c) => (
                                      <label key={c} className="flex items-center gap-2 text-sm">
                                        <Checkbox checked={field.value.includes(c)} onCheckedChange={(checked) => checked ? field.onChange([...field.value, c]) : field.onChange(field.value.filter((x) => x !== c))} />
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
                        <div className="md:col-span-2 space-y-2">
                          <FormLabel>Subject Names</FormLabel>
                          {subjectNames.map((_, index) => (
                            <FormField key={`subject-${index}`} control={addSyllabusForm.control} name={`subject_names.${index}`} render={({ field }) => (<FormItem><FormControl><Input {...field} placeholder={`Subject ${index + 1}`} /></FormControl><FormMessage /></FormItem>)} />
                          ))}
                          <Button type="button" variant="outline" onClick={() => addSyllabusForm.setValue("subject_names", [...subjectNames, ""], { shouldValidate: true })}>+ Add Subject</Button>
                        </div>
                        <div className="md:col-span-2 flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setAddSyllabusOpen(false)}>Cancel</Button><Button type="submit">Save</Button></div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
              <CardDescription>Board → Class → Subject hierarchy from API.</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="tree">
                <TabsList><TabsTrigger value="tree" className="gap-2"><GitBranch className="h-4 w-4" />Tree view</TabsTrigger><TabsTrigger value="list" className="gap-2"><ListIcon className="h-4 w-4" />List view</TabsTrigger></TabsList>
                <TabsContent value="tree" className="mt-4 space-y-3">
                  {Object.entries(syllabus.reduce<Record<string, Record<string, string[]>>>((acc, row) => {
                    acc[row.board] ??= {};
                    acc[row.board][row.class_level] ??= [];
                    acc[row.board][row.class_level].push(row.subject_name);
                    return acc;
                  }, {})).map(([board, classesMap]) => (
                    <div key={board} className="rounded-lg border p-4">
                      <div className="font-semibold">{board}</div>
                      {Object.entries(classesMap).map(([cls, subjects]) => <div key={`${board}-${cls}`} className="mt-2 text-sm"><span className="font-medium">{classLabel(cls)}:</span> {Array.from(new Set(subjects)).join(", ")}</div>)}
                    </div>
                  ))}
                </TabsContent>
                <TabsContent value="list" className="mt-4">
                  <div className="overflow-auto rounded-lg border">
                    <Table>
                      <TableHeader><TableRow><TableHead>Board</TableHead><TableHead>Class</TableHead><TableHead>Subject</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {syllabus.map((row) => <TableRow key={row.id}><TableCell>{row.board}</TableCell><TableCell>{classLabel(row.class_level)}</TableCell><TableCell>{row.subject_name}</TableCell></TableRow>)}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete this board?</AlertDialogTitle><AlertDialogDescription>{deleteTarget?.board} will be deleted.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><Button variant="destructive" onClick={async () => { if (!deleteTarget) return; await deleteCatalogBoard(deleteTarget.id); await refresh(); setDeleteTarget(null); toast({ title: "Board deleted" }); }}>Delete</Button></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
