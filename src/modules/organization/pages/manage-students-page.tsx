import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { LayoutGrid, Plus, Table2 } from "lucide-react";
import {
  createOrganizationStudent,
  deleteOrganizationStudent,
  getOrganizationSchools,
  updateOrganizationStudent,
  updateOrganizationUserStatus,
} from "@/api/organization";
import { useOrganizationData } from "@/modules/organization/hooks/use-organization-data";
import { schoolDisplayName } from "@/modules/organization/components/class-placement-form";
import { StudentSummaryCard } from "@/modules/organization/components/student-summary-card";
import {
  TutorActionsMenu,
  TutorTeachingScopeRows,
  tutorTeachingScopeLabel,
} from "@/modules/organization/components/tutor-summary-card";
import { DataState } from "@/modules/shared/components/data-state";
import { useAuthStore } from "@/lib/auth-store";
import { UserRole } from "@/types/schema";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { ApiUser, StudentClassEnrollment } from "@/api/types";

const onboardStudentSchema = z.object({
  full_name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  school_id: z.string().min(1, "Select a school"),
  teaching_board: z.string().optional(),
  grade: z.string().min(1, "Enter grade / class"),
  section: z.string().min(1, "Enter section"),
});

const editStudentSchema = z
  .object({
    full_name: z.string().min(2),
    email: z.string().email(),
    password: z.string().optional(),
    school_id: z.string().min(1, "Select a school"),
    teaching_board: z.string().optional(),
    grade: z.string().min(1, "Enter grade / class"),
    section: z.string().min(1, "Enter section"),
  })
  .superRefine((data, ctx) => {
    const p = data.password?.trim();
    if (p && p.length < 8) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least 8 characters.",
        path: ["password"],
      });
    }
  });

type OnboardStudentFormValues = z.infer<typeof onboardStudentSchema>;
type EditStudentFormValues = z.infer<typeof editStudentSchema>;

type StudentsViewMode = "card" | "table";

export default function OrganizationManageStudentsPage() {
  const user = useAuthStore((s) => s.user);
  const isSchoolAdmin = user?.role === UserRole.SCHOOL_ADMIN;
  const fixedSchoolId = isSchoolAdmin ? (user?.schoolId ?? "") : "";
  const { studentsQuery } = useOrganizationData();
  const schoolsQuery = useQuery({
    queryKey: ["organization", "schools"],
    queryFn: getOrganizationSchools,
  });
  const qc = useQueryClient();
  const [onboardOpen, setOnboardOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<ApiUser | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<ApiUser | null>(null);
  const [studentsView, setStudentsView] = useState<StudentsViewMode>("card");

  const form = useForm<OnboardStudentFormValues>({
    resolver: zodResolver(onboardStudentSchema),
    defaultValues: {
      full_name: "",
      email: "",
      password: "",
      school_id: fixedSchoolId,
      teaching_board: "",
      grade: "",
      section: "",
    },
  });

  const editForm = useForm<EditStudentFormValues>({
    resolver: zodResolver(editStudentSchema),
    defaultValues: {
      full_name: "",
      email: "",
      password: "",
      school_id: fixedSchoolId,
      teaching_board: "",
      grade: "",
      section: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: (values: OnboardStudentFormValues) => {
      const teaching_classes: [StudentClassEnrollment] = [
        {
          grade: values.grade.trim(),
          sections: [values.section.trim()] as [string],
        },
      ];
      return createOrganizationStudent({
        full_name: values.full_name.trim(),
        email: values.email.trim(),
        password: values.password,
        school_id: isSchoolAdmin ? fixedSchoolId : values.school_id,
        teaching_board: values.teaching_board?.trim() || undefined,
        teaching_classes,
      });
    },
    onSuccess: () => {
      form.reset({
        full_name: "",
        email: "",
        password: "",
        school_id: isSchoolAdmin ? fixedSchoolId : "",
        teaching_board: "",
        grade: "",
        section: "",
      });
      setOnboardOpen(false);
      void qc.invalidateQueries({ queryKey: ["organization", "students"] });
      void qc.invalidateQueries({ queryKey: ["organization", "users"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ studentId, values }: { studentId: string; values: EditStudentFormValues }) => {
      const teaching_classes: [StudentClassEnrollment] = [
        {
          grade: values.grade.trim(),
          sections: [values.section.trim()] as [string],
        },
      ];
      const pw = values.password?.trim();
      return updateOrganizationStudent(studentId, {
        full_name: values.full_name.trim(),
        email: values.email.trim(),
        school_id: isSchoolAdmin ? fixedSchoolId : values.school_id,
        teaching_board: values.teaching_board?.trim() || undefined,
        teaching_classes,
        ...(pw ? { new_password: pw } : {}),
      });
    },
    onSuccess: () => {
      editForm.reset({
        full_name: "",
        email: "",
        password: "",
        school_id: isSchoolAdmin ? fixedSchoolId : "",
        teaching_board: "",
        grade: "",
        section: "",
      });
      setEditingStudent(null);
      setEditOpen(false);
      void qc.invalidateQueries({ queryKey: ["organization", "students"] });
      void qc.invalidateQueries({ queryKey: ["organization", "users"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (studentId: string) => deleteOrganizationStudent(studentId),
    onSuccess: () => {
      setStudentToDelete(null);
      void qc.invalidateQueries({ queryKey: ["organization", "students"] });
      void qc.invalidateQueries({ queryKey: ["organization", "users"] });
    },
  });

  const schoolById = new Map((schoolsQuery.data ?? []).map((s) => [s.id, s]));

  const toggleStudent = (student: ApiUser) => {
    void updateOrganizationUserStatus(student.id, !student.is_active).then(() => {
      void qc.invalidateQueries({ queryKey: ["organization", "students"] });
      void qc.invalidateQueries({ queryKey: ["organization", "users"] });
    });
  };

  const openEditStudent = (student: ApiUser) => {
    setEditingStudent(student);
    const tc = student.teaching_classes?.[0];
    editForm.reset({
      full_name: student.full_name,
      email: student.email,
      password: "",
      school_id: student.school_id ?? fixedSchoolId,
      teaching_board: student.teaching_board ?? "",
      grade: tc?.grade?.trim() ?? "",
      section: tc?.sections?.[0]?.trim() ?? "",
    });
    setEditOpen(true);
  };

  const students = studentsQuery.data ?? [];
  const schools = schoolsQuery.data ?? [];
  const canSubmit = isSchoolAdmin ? Boolean(fixedSchoolId) : schools.length > 0;

  const studentMenuProps = {
    onEdit: openEditStudent,
    onToggleStatus: toggleStudent,
    onDelete: (t: ApiUser) => setStudentToDelete(t),
  };

  return (
    <div className="p-6 space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Manage Students</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Onboard students with {isSchoolAdmin ? "your school," : "school,"} board, and a single class (grade) and section. Switch between card and table
            layout; use the menu on each row for actions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <ToggleGroup
            type="single"
            value={studentsView}
            onValueChange={(v) => {
              if (v === "card" || v === "table") setStudentsView(v);
            }}
            variant="outline"
            size="sm"
            className="justify-end"
            aria-label="Student list layout"
          >
            <ToggleGroupItem value="card" aria-label="Card view" className="gap-1.5 px-3">
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline">Cards</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="table" aria-label="Table view" className="gap-1.5 px-3">
              <Table2 className="h-4 w-4" />
              <span className="hidden sm:inline">Table</span>
            </ToggleGroupItem>
          </ToggleGroup>

          <Dialog open={onboardOpen} onOpenChange={setOnboardOpen}>
            <DialogTrigger asChild>
              <Button className="shrink-0 gap-2">
                <Plus className="h-4 w-4" />
                Onboard student
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Onboard a student</DialogTitle>
                <DialogDescription>
                  Assign a school and board. Each student belongs to exactly one grade and one section (e.g. grade 9,
                  section A).
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form
                  className="grid gap-3 md:grid-cols-2 pt-2"
                  onSubmit={form.handleSubmit((v) => createMutation.mutate(v))}
                >
                  {isSchoolAdmin ? null : (
                    <FormField
                      control={form.control}
                      name="school_id"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>School</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue
                                  placeholder={schools.length ? "Select school" : "No schools — add one first"}
                                />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {schools.map((s) => (
                                <SelectItem key={s.id} value={s.id}>
                                  {schoolDisplayName(s)}
                                  {s.board ? ` · ${s.board}` : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  <FormField
                    control={form.control}
                    name="teaching_board"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Board / curriculum (optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. CBSE, IB, State" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="md:col-span-2 space-y-3 rounded-lg border border-border/80 bg-muted/15 p-3">
                    <FormLabel className="m-0">Class & section</FormLabel>
                    <div className="grid grid-cols-[3.5rem_7rem] gap-x-3 gap-y-2 border-b border-border/60 pb-3">
                      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Grade</span>
                      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Section</span>
                      <FormField
                        control={form.control}
                        name="grade"
                        render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormControl>
                              <Input className="h-9" placeholder="9" autoComplete="off" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="section"
                        render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormControl>
                              <Input
                                className="h-9 uppercase"
                                placeholder="A"
                                autoComplete="off"
                                maxLength={20}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  <FormField
                    control={form.control}
                    name="full_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Student full name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" autoComplete="off" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Initial password</FormLabel>
                        <FormControl>
                          <Input type="password" autoComplete="new-password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {createMutation.error ? (
                    <p className="md:col-span-2 text-sm text-destructive">{String(createMutation.error)}</p>
                  ) : null}
                  <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => setOnboardOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending || !canSubmit}>
                      {createMutation.isPending ? "Creating…" : "Create student"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) setEditingStudent(null);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit student</DialogTitle>
            <DialogDescription>
              Update profile, school, class (grade), and section. Leave password empty to keep the current one.
            </DialogDescription>
          </DialogHeader>
          {editingStudent ? (
            <Form {...editForm}>
              <form
                className="grid gap-3 md:grid-cols-2 pt-2"
                onSubmit={editForm.handleSubmit((v) =>
                  updateMutation.mutate({ studentId: editingStudent.id, values: v }),
                )}
              >
                {isSchoolAdmin ? null : (
                  <FormField
                    control={editForm.control}
                    name="school_id"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>School</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select school" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {schools.map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                {schoolDisplayName(s)}
                                {s.board ? ` · ${s.board}` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <FormField
                  control={editForm.control}
                  name="teaching_board"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Board / curriculum (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. CBSE, IB, State" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="md:col-span-2 space-y-3 rounded-lg border border-border/80 bg-muted/15 p-3">
                  <FormLabel className="m-0">Class & section</FormLabel>
                  <div className="grid grid-cols-[3.5rem_7rem] gap-x-3 gap-y-2 border-b border-border/60 pb-3">
                    <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Grade</span>
                    <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Section</span>
                    <FormField
                      control={editForm.control}
                      name="grade"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormControl>
                            <Input className="h-9" placeholder="9" autoComplete="off" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="section"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormControl>
                            <Input
                              className="h-9 uppercase"
                              placeholder="A"
                              autoComplete="off"
                              maxLength={20}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                <FormField
                  control={editForm.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Student full name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" autoComplete="off" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>New password (optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          autoComplete="new-password"
                          placeholder="Leave blank to keep current"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {updateMutation.error ? (
                  <p className="md:col-span-2 text-sm text-destructive">{String(updateMutation.error)}</p>
                ) : null}
                <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditOpen(false);
                      setEditingStudent(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateMutation.isPending || !canSubmit}>
                    {updateMutation.isPending ? "Saving…" : "Save changes"}
                  </Button>
                </div>
              </form>
            </Form>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!studentToDelete} onOpenChange={(open) => !open && setStudentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete student?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes{" "}
              <span className="font-medium text-foreground">{studentToDelete?.full_name}</span> ({studentToDelete?.email}).
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (studentToDelete) deleteMutation.mutate(studentToDelete.id);
              }}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DataState
        loading={studentsQuery.isLoading}
        error={studentsQuery.error ? String(studentsQuery.error) : null}
        empty={students.length === 0}
        emptyText={isSchoolAdmin ? "No students yet. Use “Onboard student” to add students for your school." : "No students yet. Use “Onboard student” after you have at least one school."}
        onRetry={() => void studentsQuery.refetch()}
      >
        {studentsView === "card" ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {students.map((student) => {
              const sch = student.school_id ? schoolById.get(student.school_id) : undefined;
              const schoolLabel = sch ? schoolDisplayName(sch) : null;
              return (
                <StudentSummaryCard
                  key={student.id}
                  student={student}
                  schoolLabel={schoolLabel}
                  onToggleStatus={studentMenuProps.onToggleStatus}
                  onEditStudent={studentMenuProps.onEdit}
                  onDeleteStudent={studentMenuProps.onDelete}
                />
              );
            })}
          </div>
        ) : (
          <div className="rounded-md border border-border/80 bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>School</TableHead>
                  <TableHead>Board</TableHead>
                  <TableHead className="min-w-[14rem]">Class & section</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[52px] text-right pr-3">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => {
                  const sch = student.school_id ? schoolById.get(student.school_id) : undefined;
                  const schoolLabel = sch ? schoolDisplayName(sch) : null;
                  const boardRaw = student.teaching_board?.trim();
                  return (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">{student.full_name}</TableCell>
                      <TableCell className="text-muted-foreground max-w-[14rem] truncate" title={student.email}>
                        {student.email}
                      </TableCell>
                      <TableCell className="max-w-[12rem] truncate" title={schoolLabel ?? undefined}>
                        {schoolLabel ?? "—"}
                      </TableCell>
                      <TableCell className={boardRaw ? "" : "text-muted-foreground"}>{boardRaw ?? "—"}</TableCell>
                      <TableCell className="max-w-[22rem] align-top">
                        <div title={tutorTeachingScopeLabel(student)}>
                          <TutorTeachingScopeRows tutor={student} compact emptyMessage="—" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            student.is_active ? "text-foreground text-xs font-medium" : "text-muted-foreground text-xs"
                          }
                        >
                          {student.is_active ? "Active" : "Inactive"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right pr-2">
                        <TutorActionsMenu tutor={student} {...studentMenuProps} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </DataState>
    </div>
  );
}
