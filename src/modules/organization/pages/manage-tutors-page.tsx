import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFieldArray, useForm, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { LayoutGrid, Plus, Table2 } from "lucide-react";
import {
  deleteOrganizationTutor,
  getOrganizationSchools,
  onboardOrganizationTutor,
  updateOrganizationTutor,
  updateOrganizationUserStatus,
} from "@/api/organization";
import { useOrganizationData } from "@/modules/organization/hooks/use-organization-data";
import {
  ClassSectionsBlock,
  classPlacementRowsSchema,
  classesFromApiUser,
  refineClassPlacementRows,
  schoolDisplayName,
  type ClassRowsFormPart,
} from "@/modules/organization/components/class-placement-form";
import {
  TutorActionsMenu,
  TutorSummaryCard,
  TutorTeachingScopeRows,
  tutorTeachingScopeLabel,
} from "@/modules/organization/components/tutor-summary-card";
import { TeachersPagination } from "@/modules/organization/components/teachers/teachers-pagination";
import { TeachersSearchFilters } from "@/modules/organization/components/teachers/teachers-search-filters";
import { TeachersTable } from "@/modules/organization/components/teachers/teachers-table";
import { TeachersToolbar } from "@/modules/organization/components/teachers/teachers-toolbar";
import { AssignClassesDialog } from "@/modules/organization/components/teachers/assign-classes-dialog";
import { AssignSubjectsDialog } from "@/modules/organization/components/teachers/assign-subjects-dialog";
import { AddTeacherDialog, type AddTeacherRowValues, type AddTeachersFormValues } from "@/modules/organization/components/teachers/add-teacher-dialog";
import type { TeacherFilters, TeacherRow } from "@/modules/organization/types/teacher-profile";
import { filterTeachers, mergeTeachers, teacherRowFromDetails } from "@/modules/organization/utils/teacher-helpers";
import { DataState } from "@/modules/shared/components/data-state";
import { useAuthStore } from "@/lib/auth-store";
import { UserRole } from "@/types/schema";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import type { ApiUser } from "@/api/types";

const onboardTutorSchema = z
  .object({
    full_name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(8),
    school_id: z.string().min(1, "Select a school"),
    teaching_board: z.string().optional(),
    classes: classPlacementRowsSchema,
  })
  .superRefine(refineClassPlacementRows);

const editTutorSchema = z
  .object({
    full_name: z.string().min(2),
    email: z.string().email(),
    password: z.string().optional(),
    school_id: z.string().min(1, "Select a school"),
    teaching_board: z.string().optional(),
    classes: classPlacementRowsSchema,
  })
  .superRefine(refineClassPlacementRows)
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

type OnboardTutorFormValues = z.infer<typeof onboardTutorSchema>;
type EditTutorFormValues = z.infer<typeof editTutorSchema>;

type TutorsViewMode = "card" | "table";

const DEFAULT_TEACHER_FILTERS: TeacherFilters = {
  search: "",
  subject: "all",
  status: "all",
};

const classRowsControl = (c: Control<OnboardTutorFormValues> | Control<EditTutorFormValues>) =>
  c as unknown as Control<ClassRowsFormPart>;

export default function OrganizationManageTutorsPage() {
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const isSchoolAdmin = user?.role === UserRole.SCHOOL_ADMIN;
  const fixedSchoolId = isSchoolAdmin ? (user?.schoolId ?? "") : "";
  const { tutorsQuery } = useOrganizationData();
  const schoolsQuery = useQuery({
    queryKey: ["organization", "schools"],
    queryFn: getOrganizationSchools,
  });
  const qc = useQueryClient();
  const [onboardOpen, setOnboardOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingTutor, setEditingTutor] = useState<ApiUser | null>(null);
  const [tutorToDelete, setTutorToDelete] = useState<ApiUser | null>(null);
  const [tutorsView, setTutorsView] = useState<TutorsViewMode>("card");
  const [teacherFilters, setTeacherFilters] = useState<TeacherFilters>(DEFAULT_TEACHER_FILTERS);
  const [teacherPage, setTeacherPage] = useState(1);
  const [teacherPageSize, setTeacherPageSize] = useState(10);
  const [importOpen, setImportOpen] = useState(false);
  const [assignClassesOpen, setAssignClassesOpen] = useState(false);
  const [assignSubjectsOpen, setAssignSubjectsOpen] = useState(false);
  const [localTeachers, setLocalTeachers] = useState<TeacherRow[]>([]);
  const [tutorDialogMode, setTutorDialogMode] = useState<"view" | "edit">("edit");

  const form = useForm<OnboardTutorFormValues>({
    resolver: zodResolver(onboardTutorSchema),
    defaultValues: {
      full_name: "",
      email: "",
      password: "",
      school_id: fixedSchoolId,
      teaching_board: "",
      classes: [{ grade: "", sections: [{ value: "" }] }],
    },
  });

  const editForm = useForm<EditTutorFormValues>({
    resolver: zodResolver(editTutorSchema),
    defaultValues: {
      full_name: "",
      email: "",
      password: "",
      school_id: fixedSchoolId,
      teaching_board: "",
      classes: [{ grade: "", sections: [{ value: "" }] }],
    },
  });

  const { fields: classFields, append: appendClass, remove: removeClass } = useFieldArray({
    control: form.control,
    name: "classes",
  });

  const {
    fields: editClassFields,
    append: appendEditClass,
    remove: removeEditClass,
  } = useFieldArray({
    control: editForm.control,
    name: "classes",
  });

  const createMutation = useMutation({
    mutationFn: (values: OnboardTutorFormValues) => {
      const teaching_classes = values.classes.map((c) => ({
        grade: c.grade.trim(),
        sections: c.sections.map((s) => s.value.trim()).filter(Boolean),
      }));
      return onboardOrganizationTutor({
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
        classes: [{ grade: "", sections: [{ value: "" }] }],
      });
      setOnboardOpen(false);
      void qc.invalidateQueries({ queryKey: ["organization", "tutors"] });
      void qc.invalidateQueries({ queryKey: ["organization", "users"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ tutorId, values }: { tutorId: string; values: EditTutorFormValues }) => {
      const teaching_classes = values.classes.map((c) => ({
        grade: c.grade.trim(),
        sections: c.sections.map((s) => s.value.trim()).filter(Boolean),
      }));
      const pw = values.password?.trim();
      return updateOrganizationTutor(tutorId, {
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
        classes: [{ grade: "", sections: [{ value: "" }] }],
      });
      setEditingTutor(null);
      setEditOpen(false);
      void qc.invalidateQueries({ queryKey: ["organization", "tutors"] });
      void qc.invalidateQueries({ queryKey: ["organization", "users"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (tutorId: string) => deleteOrganizationTutor(tutorId),
    onSuccess: () => {
      setTutorToDelete(null);
      void qc.invalidateQueries({ queryKey: ["organization", "tutors"] });
      void qc.invalidateQueries({ queryKey: ["organization", "users"] });
    },
  });

  const schoolById = new Map((schoolsQuery.data ?? []).map((s) => [s.id, s]));

  const toggleTutor = (tutor: ApiUser) => {
    void updateOrganizationUserStatus(tutor.id, !tutor.is_active).then(() => {
      void qc.invalidateQueries({ queryKey: ["organization", "tutors"] });
      void qc.invalidateQueries({ queryKey: ["organization", "users"] });
    });
  };

  const openTutorDialog = (tutor: ApiUser, mode: "view" | "edit") => {
    setTutorDialogMode(mode);
    setEditingTutor(tutor);
    editForm.reset({
      full_name: tutor.full_name,
      email: tutor.email,
      password: "",
      school_id: tutor.school_id ?? fixedSchoolId,
      teaching_board: tutor.teaching_board ?? "",
      classes: classesFromApiUser(tutor),
    });
    setEditOpen(true);
  };

  const openEditTutor = (tutor: ApiUser) => openTutorDialog(tutor, "edit");

  const tutors = tutorsQuery.data ?? [];
  const schools = schoolsQuery.data ?? [];
  const canSubmit = isSchoolAdmin ? Boolean(fixedSchoolId) : schools.length > 0;

  const allTeachers = useMemo(() => {
    const base = mergeTeachers(tutors);
    if (!isSchoolAdmin || localTeachers.length === 0) return base;
    return [...localTeachers, ...base];
  }, [tutors, localTeachers, isSchoolAdmin]);
  const filteredTeachers = useMemo(
    () => filterTeachers(allTeachers, teacherFilters),
    [allTeachers, teacherFilters],
  );
  const paginatedTeachers = useMemo(() => {
    const start = (teacherPage - 1) * teacherPageSize;
    return filteredTeachers.slice(start, start + teacherPageSize);
  }, [filteredTeachers, teacherPage, teacherPageSize]);

  const addTeachers = (rows: AddTeacherRowValues[]) => {
    const added = rows.map((row, index) => teacherRowFromDetails(row, index));
    setLocalTeachers((prev) => [...added, ...prev]);
    toast({
      title: added.length === 1 ? "Teacher added" : "Teachers added",
      description:
        added.length === 1
          ? `${added[0].fullName} was added. Generate credentials from the Credentials tab when ready.`
          : `${added.length} teachers were added. Generate credentials from the Credentials tab when ready.`,
    });
  };

  const handleAddTeachers = (values: AddTeachersFormValues) => {
    const existingEmails = new Set(
      allTeachers.map((teacher) => teacher.email?.trim().toLowerCase()).filter(Boolean) as string[],
    );
    const duplicate = values.teachers.find((row) => existingEmails.has(row.email.trim().toLowerCase()));
    if (duplicate) {
      toast({
        title: "Email already exists",
        description: `${duplicate.email} is already in the teacher list.`,
        variant: "destructive",
      });
      return;
    }

    addTeachers(values.teachers);
    setOnboardOpen(false);
  };

  const handleImportTeachers = (rows: AddTeacherRowValues[]) => {
    const existingEmails = new Set(
      allTeachers.map((teacher) => teacher.email?.trim().toLowerCase()).filter(Boolean) as string[],
    );
    const seen = new Set<string>();
    const toAdd = rows.filter((row) => {
      const email = row.email.trim().toLowerCase();
      if (!email || existingEmails.has(email) || seen.has(email)) return false;
      seen.add(email);
      return true;
    });

    if (toAdd.length === 0) {
      toast({
        title: "No teachers imported",
        description: "All rows were empty, invalid, or already in the list.",
        variant: "destructive",
      });
      return;
    }

    const skipped = rows.length - toAdd.length;
    addTeachers(toAdd);
    if (skipped > 0) {
      toast({
        title: "Some rows skipped",
        description: `${skipped} duplicate or invalid row(s) were not imported.`,
      });
    }
  };

  const handleTeacherFilterChange = (patch: Partial<TeacherFilters>) => {
    setTeacherFilters((current) => ({ ...current, ...patch }));
    setTeacherPage(1);
  };

  const handleTeacherView = (teacher: TeacherRow) => {
    if (teacher.source) openTutorDialog(teacher.source, "view");
  };

  const handleTeacherEdit = (teacher: TeacherRow) => {
    if (teacher.source) openEditTutor(teacher.source);
  };

  const tutorMenuProps = {
    onEdit: openEditTutor,
    onToggleStatus: toggleTutor,
    onDelete: (t: ApiUser) => setTutorToDelete(t),
  };

  return (
    <div className={isSchoolAdmin ? "dashboard-fit flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4 md:p-5" : "p-6 space-y-8"}>
      {isSchoolAdmin ? (
        <>
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-blue-900 dark:text-blue-100">Teachers</h1>
              <p className="text-sm text-muted-foreground">
                Manage teacher accounts.
              </p>
            </div>
            <TeachersToolbar
              onAddTeacher={() => setOnboardOpen(true)}
              onAssignClasses={() => setAssignClassesOpen(true)}
              onAssignSubjects={() => setAssignSubjectsOpen(true)}
              onImportTeachers={handleImportTeachers}
              importOpen={importOpen}
              onImportOpenChange={setImportOpen}
            />
          </div>

          <TeachersSearchFilters
            filters={teacherFilters}
            onChange={handleTeacherFilterChange}
            onClear={() => {
              setTeacherFilters(DEFAULT_TEACHER_FILTERS);
              setTeacherPage(1);
            }}
          />

          <DataState
            loading={tutorsQuery.isLoading}
            error={tutorsQuery.error ? String(tutorsQuery.error) : null}
            empty={filteredTeachers.length === 0}
            emptyText="No teachers match your search."
            onRetry={() => void tutorsQuery.refetch()}
          >
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
              <TeachersTable
                teachers={paginatedTeachers}
                onView={handleTeacherView}
                onEdit={handleTeacherEdit}
              />
              <TeachersPagination
                page={teacherPage}
                pageSize={teacherPageSize}
                total={filteredTeachers.length}
                onPageChange={setTeacherPage}
                onPageSizeChange={(size) => {
                  setTeacherPageSize(size);
                  setTeacherPage(1);
                }}
              />
            </div>
          </DataState>
        </>
      ) : (
        <>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Manage Tutors</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Onboard tutors with school, teaching board, and class sections (grades with A/B, etc.). Switch between
            card and table layout; use the menu on each row for actions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <ToggleGroup
            type="single"
            value={tutorsView}
            onValueChange={(v) => {
              if (v === "card" || v === "table") setTutorsView(v);
            }}
            variant="outline"
            size="sm"
            className="justify-end"
            aria-label="Tutor list layout"
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

          <Button className="shrink-0 gap-2" onClick={() => setOnboardOpen(true)}>
            <Plus className="h-4 w-4" />
            Onboard tutor
          </Button>
        </div>
      </div>

      <DataState
        loading={tutorsQuery.isLoading}
        error={tutorsQuery.error ? String(tutorsQuery.error) : null}
        empty={tutors.length === 0}
        emptyText="No tutors yet. Use “Onboard tutor” after you have at least one school."
        onRetry={() => void tutorsQuery.refetch()}
      >
        {tutorsView === "card" ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {tutors.map((tutor) => {
              const sch = tutor.school_id ? schoolById.get(tutor.school_id) : undefined;
              const schoolLabel = sch ? schoolDisplayName(sch) : null;
              return (
                <TutorSummaryCard
                  key={tutor.id}
                  tutor={tutor}
                  schoolLabel={schoolLabel}
                  onToggleStatus={tutorMenuProps.onToggleStatus}
                  onEditTutor={tutorMenuProps.onEdit}
                  onDeleteTutor={tutorMenuProps.onDelete}
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
                  <TableHead className="min-w-[14rem]">Classes & sections</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[52px] text-right pr-3">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tutors.map((tutor) => {
                  const sch = tutor.school_id ? schoolById.get(tutor.school_id) : undefined;
                  const schoolLabel = sch ? schoolDisplayName(sch) : null;
                  const boardRaw = tutor.teaching_board?.trim();
                  return (
                    <TableRow key={tutor.id}>
                      <TableCell className="font-medium">{tutor.full_name}</TableCell>
                      <TableCell className="text-muted-foreground max-w-[14rem] truncate" title={tutor.email}>
                        {tutor.email}
                      </TableCell>
                      <TableCell className="max-w-[12rem] truncate" title={schoolLabel ?? undefined}>
                        {schoolLabel ?? "—"}
                      </TableCell>
                      <TableCell className={boardRaw ? "" : "text-muted-foreground"}>{boardRaw ?? "—"}</TableCell>
                      <TableCell className="max-w-[22rem] align-top">
                        <div title={tutorTeachingScopeLabel(tutor)}>
                          <TutorTeachingScopeRows tutor={tutor} compact emptyMessage="—" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            tutor.is_active ? "text-foreground text-xs font-medium" : "text-muted-foreground text-xs"
                          }
                        >
                          {tutor.is_active ? "Active" : "Inactive"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right pr-2">
                        <TutorActionsMenu tutor={tutor} {...tutorMenuProps} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </DataState>
        </>
      )}

      <Dialog open={onboardOpen && !isSchoolAdmin} onOpenChange={setOnboardOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isSchoolAdmin ? "Add Teacher" : "Onboard a tutor"}</DialogTitle>
            <DialogDescription>
              {isSchoolAdmin
                ? "Create a teacher account with class and section assignments for your school."
                : "Assign a school and board. For each class, enter the grade in the first column and section letters in a row (e.g. grade 9, sections A, D, E)."}
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
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <FormLabel className="m-0">Classes & sections</FormLabel>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1 text-xs"
                    onClick={() => appendClass({ grade: "", sections: [{ value: "" }] })}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add class
                  </Button>
                </div>
                <div className="grid grid-cols-[3.5rem_minmax(0,1fr)_auto] gap-x-3 border-b border-border/60 pb-2">
                  <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Grade</span>
                  <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Sections
                  </span>
                  <span className="w-9" aria-hidden />
                </div>
                <p className="text-xs text-muted-foreground">
                  Each row is one grade. Use <span className="font-medium text-foreground/80">+ Section</span> to add
                  more letters on the same line.
                </p>
                <div className="space-y-4">
                  {classFields.map((cf, classIndex) => (
                    <ClassSectionsBlock
                      key={cf.id}
                      nestIndex={classIndex}
                      control={classRowsControl(form.control)}
                      canRemoveClass={classFields.length > 1}
                      onRemoveClass={() => removeClass(classIndex)}
                    />
                  ))}
                </div>
              </div>
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{isSchoolAdmin ? "Teacher full name" : "Tutor full name"}</FormLabel>
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
                  {createMutation.isPending ? "Creating…" : isSchoolAdmin ? "Create teacher" : "Create tutor"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) setEditingTutor(null);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isSchoolAdmin
                ? tutorDialogMode === "view"
                  ? "View teacher"
                  : "Edit teacher"
                : "Edit tutor"}
            </DialogTitle>
            <DialogDescription>
              {tutorDialogMode === "view"
                ? "Teacher profile and class assignments (read-only)."
                : isSchoolAdmin
                  ? "Update profile, board, and the grade / sections grid."
                  : "Update profile, school, and the grade / sections grid. Leave password empty to keep the current one."}
            </DialogDescription>
          </DialogHeader>
          {editingTutor ? (
            <Form {...editForm}>
              <form
                className="grid gap-3 md:grid-cols-2 pt-2"
                onSubmit={editForm.handleSubmit((v) => {
                  if (tutorDialogMode === "view") return;
                  updateMutation.mutate({ tutorId: editingTutor.id, values: v });
                })}
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
                        <Input placeholder="e.g. CBSE, IB, State" disabled={tutorDialogMode === "view"} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {tutorDialogMode === "view" ? (
                  <div className="md:col-span-2 space-y-2 rounded-lg border border-border/80 bg-muted/15 p-3">
                    <FormLabel>Classes &amp; sections</FormLabel>
                    <div className="space-y-2 text-sm">
                      {editForm.getValues("classes").map((row, index) => (
                        <div key={index} className="flex flex-wrap gap-x-2 gap-y-1">
                          <span className="font-medium text-foreground">Grade {row.grade || "—"}</span>
                          <span className="text-muted-foreground">
                            Sections:{" "}
                            {row.sections
                              .map((s) => s.value.trim())
                              .filter(Boolean)
                              .join(", ") || "—"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                <div className="md:col-span-2 space-y-3 rounded-lg border border-border/80 bg-muted/15 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <FormLabel className="m-0">Classes & sections</FormLabel>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1 text-xs"
                      onClick={() => appendEditClass({ grade: "", sections: [{ value: "" }] })}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add class
                    </Button>
                  </div>
                  <div className="grid grid-cols-[3.5rem_minmax(0,1fr)_auto] gap-x-3 border-b border-border/60 pb-2">
                    <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Grade</span>
                    <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      Sections
                    </span>
                    <span className="w-9" aria-hidden />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Each row is one grade. Use <span className="font-medium text-foreground/80">+ Section</span> to add
                    more letters on the same line.
                  </p>
                  <div className="space-y-4">
                    {editClassFields.map((cf, classIndex) => (
                      <ClassSectionsBlock
                        key={cf.id}
                        nestIndex={classIndex}
                        control={classRowsControl(editForm.control)}
                        canRemoveClass={editClassFields.length > 1}
                        onRemoveClass={() => removeEditClass(classIndex)}
                      />
                    ))}
                  </div>
                </div>
                )}
                <FormField
                  control={editForm.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{isSchoolAdmin ? "Teacher full name" : "Tutor full name"}</FormLabel>
                      <FormControl>
                        <Input disabled={tutorDialogMode === "view"} {...field} />
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
                        <Input type="email" autoComplete="off" disabled={tutorDialogMode === "view"} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {!isSchoolAdmin && tutorDialogMode === "edit" ? (
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
                ) : null}
                {updateMutation.error ? (
                  <p className="md:col-span-2 text-sm text-destructive">{String(updateMutation.error)}</p>
                ) : null}
                <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditOpen(false);
                      setEditingTutor(null);
                    }}
                  >
                    {tutorDialogMode === "view" ? "Close" : "Cancel"}
                  </Button>
                  {tutorDialogMode === "edit" ? (
                  <Button type="submit" disabled={updateMutation.isPending || !canSubmit}>
                    {updateMutation.isPending ? "Saving…" : "Save changes"}
                  </Button>
                  ) : null}
                </div>
              </form>
            </Form>
          ) : null}
        </DialogContent>
      </Dialog>

      <AddTeacherDialog
        open={onboardOpen && isSchoolAdmin}
        onOpenChange={setOnboardOpen}
        onSubmit={handleAddTeachers}
      />

      <AssignClassesDialog
        open={assignClassesOpen}
        onOpenChange={setAssignClassesOpen}
        teachers={allTeachers}
      />

      <AssignSubjectsDialog
        open={assignSubjectsOpen}
        onOpenChange={setAssignSubjectsOpen}
        teachers={allTeachers}
      />

      <AlertDialog open={!!tutorToDelete} onOpenChange={(open) => !open && setTutorToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete tutor?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes{" "}
              <span className="font-medium text-foreground">{tutorToDelete?.full_name}</span> ({tutorToDelete?.email}).
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
                if (tutorToDelete) deleteMutation.mutate(tutorToDelete.id);
              }}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
