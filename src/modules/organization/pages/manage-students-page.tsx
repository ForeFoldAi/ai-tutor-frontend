import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
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
import {
  assignTeacherToStudents,
  bulkCreateStudents,
  deleteStudent,
  exportStudentsCsv,
  getStudent,
  getStudentOptions,
  listStudents,
  moveStudentsToClass,
  updateStudent,
} from "@/api/students";
import { listClasses } from "@/api/classes";
import { useOrganizationData } from "@/modules/organization/hooks/use-organization-data";
import { schoolDisplayName } from "@/modules/organization/components/class-placement-form";
import { StudentSummaryCard } from "@/modules/organization/components/student-summary-card";
import {
  TutorActionsMenu,
  TutorTeachingScopeRows,
  tutorTeachingScopeLabel,
} from "@/modules/organization/components/tutor-summary-card";
import { StudentsAdminFilters } from "@/modules/organization/components/students/students-admin-filters";
import { StudentsAdminPagination } from "@/modules/organization/components/students/students-admin-pagination";
import { StudentsAdminTable } from "@/modules/organization/components/students/students-admin-table";
import { AddStudentDialog, type AddStudentRowValues, type AddStudentsFormValues } from "@/modules/organization/components/students/add-student-dialog";
import {
  OnboardStudentDialog,
  type OnboardStudentFormValues,
} from "@/modules/organization/components/students/onboard-student-dialog";
import { AssignTeacherDialog } from "@/modules/organization/components/students/assign-teacher-dialog";
import { MoveClassDialog } from "@/modules/organization/components/students/move-class-dialog";
import { StudentsToolbar } from "@/modules/organization/components/students/students-toolbar";
import type { SchoolStudentFilters, SchoolStudentRow } from "@/modules/organization/types/org-student-profile";
import {
  mapStudentRecordToRow,
  studentFiltersToApi,
} from "@/modules/organization/utils/org-student-helpers";
import { DataState } from "@/modules/shared/components/data-state";
import { useEntitySearch } from "@/modules/search";
import { invalidateManyAndBroadcast } from "@/lib/query-broadcast";
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
import type { ApiUser, StudentClassEnrollment, StudentRecord } from "@/api/types";

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

type EditStudentFormValues = z.infer<typeof editStudentSchema>;

const schoolStudentEditSchema = z.object({
  full_name: z.string().min(2),
  phone: z.string().min(6, "Enter a valid phone"),
  email: z.string().email(),
  grade: z.string().optional(),
  section: z.string().optional(),
  curriculum: z.string().optional(),
});

type SchoolStudentEditValues = z.infer<typeof schoolStudentEditSchema>;

const NONE = "__none__";

function selectValue(value: string | undefined | null) {
  return value?.trim() ? value : NONE;
}

function fromSelectValue(value: string) {
  return value === NONE ? "" : value;
}

type StudentsViewMode = "card" | "table";

const DEFAULT_STUDENT_FILTERS: SchoolStudentFilters = {
  search: "",
  grade: "all",
  section: "all",
  curriculum: "all",
  learningType: "all",
};

export default function OrganizationManageStudentsPage() {
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const isSchoolAdmin = user?.role === UserRole.SCHOOL_ADMIN;
  const fixedSchoolId = isSchoolAdmin ? (user?.schoolId ?? "") : "";
  const { studentsQuery } = useOrganizationData();
  const qc = useQueryClient();
  const [onboardOpen, setOnboardOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<ApiUser | null>(null);
  const [editingSchoolStudent, setEditingSchoolStudent] = useState<StudentRecord | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<ApiUser | null>(null);
  const [schoolStudentToDelete, setSchoolStudentToDelete] = useState<StudentRecord | null>(null);
  const [studentsView, setStudentsView] = useState<StudentsViewMode>("card");
  const [studentFilters, setStudentFilters] = useState<SchoolStudentFilters>(DEFAULT_STUDENT_FILTERS);
  const [studentPage, setStudentPage] = useState(1);
  const [studentPageSize, setStudentPageSize] = useState(10);
  const [importOpen, setImportOpen] = useState(false);
  const [assignTeacherOpen, setAssignTeacherOpen] = useState(false);
  const [moveClassOpen, setMoveClassOpen] = useState(false);
  const [studentDialogMode, setStudentDialogMode] = useState<"view" | "edit">("view");
  const studentOptionsQuery = useQuery({
    queryKey: ["students", "options"],
    queryFn: getStudentOptions,
    enabled: isSchoolAdmin,
  });
  const studentSearch = useEntitySearch<StudentRecord>(
    "students",
    studentFilters.search,
    isSchoolAdmin,
  );
  const studentsListQuery = useQuery({
    queryKey: ["students", "list", studentPage, studentPageSize, studentFilters],
    queryFn: () =>
      listStudents({
        ...studentFiltersToApi(studentFilters),
        limit: studentPageSize,
        offset: (studentPage - 1) * studentPageSize,
      }),
    enabled: isSchoolAdmin && !studentSearch.searching,
    placeholderData: keepPreviousData,
  });
  const studentDetailQuery = useQuery({
    queryKey: ["students", "detail", editingSchoolStudent?.id],
    queryFn: () => getStudent(editingSchoolStudent!.id),
    enabled: isSchoolAdmin && !!editingSchoolStudent && editOpen,
  });
  const editClassesQuery = useQuery({
    queryKey: ["classes", "list", "student-edit"],
    queryFn: () => listClasses({ limit: 500 }),
    enabled: isSchoolAdmin && editOpen && !!editingSchoolStudent,
  });
  const schoolsQuery = useQuery({
    queryKey: ["organization", "schools"],
    queryFn: getOrganizationSchools,
  });

  useEffect(() => {
    const defaultLimit = studentOptionsQuery.data?.default_limit;
    if (defaultLimit) setStudentPageSize(defaultLimit);
  }, [studentOptionsQuery.data?.default_limit]);

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

  const schoolEditForm = useForm<SchoolStudentEditValues>({
    resolver: zodResolver(schoolStudentEditSchema),
    defaultValues: {
      full_name: "",
      phone: "",
      email: "",
      grade: "",
      section: "",
      curriculum: "",
    },
  });

  const editClasses = editClassesQuery.data?.items ?? [];
  const watchedGrade = schoolEditForm.watch("grade");
  const watchedSection = schoolEditForm.watch("section");

  const gradeOptions = useMemo(() => {
    const set = new Set(editClasses.map((c) => c.grade));
    if (editingSchoolStudent?.grade) set.add(editingSchoolStudent.grade);
    return Array.from(set).sort();
  }, [editClasses, editingSchoolStudent?.grade]);

  const sectionOptions = useMemo(() => {
    const fromClasses = editClasses
      .filter((c) => !watchedGrade || c.grade === watchedGrade)
      .map((c) => c.section);
    const set = new Set(fromClasses);
    if (editingSchoolStudent?.section) set.add(editingSchoolStudent.section);
    return Array.from(set).sort();
  }, [editClasses, watchedGrade, editingSchoolStudent?.section]);

  const curriculumOptions = useMemo(() => {
    const fromClasses = editClasses
      .filter(
        (c) =>
          (!watchedGrade || c.grade === watchedGrade) &&
          (!watchedSection || c.section === watchedSection),
      )
      .map((c) => c.curriculum);
    const set = new Set(fromClasses);
    if (editingSchoolStudent?.curriculum) set.add(editingSchoolStudent.curriculum);
    return Array.from(set).sort();
  }, [editClasses, watchedGrade, watchedSection, editingSchoolStudent?.curriculum]);

  // Reset only when opening a different student — not on every detail re-render.
  useEffect(() => {
    if (!editOpen || !editingSchoolStudent) return;
    schoolEditForm.reset({
      full_name: editingSchoolStudent.full_name,
      phone: editingSchoolStudent.phone ?? "",
      email: editingSchoolStudent.email,
      grade: editingSchoolStudent.grade ?? "",
      section: editingSchoolStudent.section ?? "",
      curriculum: editingSchoolStudent.curriculum ?? "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editOpen, editingSchoolStudent?.id]);

  useEffect(() => {
    const detail = studentDetailQuery.data;
    if (!detail) return;
    setEditingSchoolStudent((prev) => (prev?.id === detail.id ? { ...prev, ...detail } : detail));
  }, [studentDetailQuery.data]);

  const refreshStudents = async () => {
    await invalidateManyAndBroadcast(qc, ["students", "dashboard"], { refetch: true });
  };

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
        school_id: Number(isSchoolAdmin ? fixedSchoolId : values.school_id),
        teaching_board: values.teaching_board?.trim() || undefined,
        teaching_classes,
      });
    },
    onSuccess: () => {
      setOnboardOpen(false);
      void invalidateManyAndBroadcast(qc, ["students", "users", "dashboard"]);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ studentId, values }: { studentId: number; values: EditStudentFormValues }) => {
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
        school_id: Number(isSchoolAdmin ? fixedSchoolId : values.school_id),
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
      void invalidateManyAndBroadcast(qc, ["students", "users", "dashboard"]);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (studentId: number) => deleteOrganizationStudent(studentId),
    onSuccess: () => {
      setStudentToDelete(null);
      void invalidateManyAndBroadcast(qc, ["students", "users", "dashboard"]);
    },
  });

  const deleteSchoolStudentMutation = useMutation({
    mutationFn: (studentId: number) => deleteStudent(studentId),
    onSuccess: async () => {
      setSchoolStudentToDelete(null);
      setEditOpen(false);
      setEditingSchoolStudent(null);
      setStudentDialogMode("view");
      await refreshStudents();
      await invalidateManyAndBroadcast(qc, ["students", "dashboard"]);
      toast({
        title: "Student deleted",
        description: "The student has been permanently removed.",
      });
    },
    onError: (err) => {
      toast({
        title: "Could not delete student",
        description: err instanceof Error ? err.message : "Request failed.",
        variant: "destructive",
      });
    },
  });

  const bulkCreateMutation = useMutation({
    mutationFn: (rows: AddStudentRowValues[]) =>
      bulkCreateStudents(
        rows.map((row) => ({
          roll_number: row.roll_number.trim(),
          student_name: row.student_name.trim(),
          parent_phone: row.parent_phone.trim(),
          parent_email: row.parent_email.trim(),
        })),
      ),
    onSuccess: async (result) => {
      await refreshStudents();
      setOnboardOpen(false);
      setImportOpen(false);
      if (result.created.length > 0) {
        toast({
          title: result.created.length === 1 ? "Student added" : "Students added",
          description:
            result.errors.length > 0
              ? `${result.created.length} saved. ${result.errors.length} row(s) failed.`
              : `${result.created.length} student(s) saved to your school.`,
        });
      }
      if (result.errors.length > 0 && result.created.length === 0) {
        toast({
          title: "Could not add students",
          description: result.errors.map((e) => `Row ${e.row}: ${e.message}`).join(" "),
          variant: "destructive",
        });
      }
    },
    onError: (err) => {
      toast({
        title: "Could not add students",
        description: err instanceof Error ? err.message : "Request failed.",
        variant: "destructive",
      });
    },
  });

  const assignMutation = useMutation({
    mutationFn: ({ teacherIds, studentIds }: { teacherIds: number[]; studentIds: number[] }) =>
      assignTeacherToStudents({ teacher_ids: teacherIds, student_ids: studentIds }),
    onSuccess: async (result) => {
      await refreshStudents();
      await invalidateManyAndBroadcast(qc, ["teachers"]);
      setAssignTeacherOpen(false);
      toast({ title: "Teacher assigned", description: result.message });
    },
    onError: (err) => {
      toast({
        title: "Could not assign teacher",
        description: err instanceof Error ? err.message : "Request failed.",
        variant: "destructive",
      });
    },
  });

  const moveMutation = useMutation({
    mutationFn: ({ studentIds, classId }: { studentIds: number[]; classId: number }) =>
      moveStudentsToClass({ student_ids: studentIds, class_id: classId }),
    onSuccess: async (result) => {
      await refreshStudents();
      await invalidateManyAndBroadcast(qc, ["classes"]);
      setMoveClassOpen(false);
      toast({ title: "Students moved", description: result.message });
    },
    onError: (err) => {
      toast({
        title: "Could not move students",
        description: err instanceof Error ? err.message : "Request failed.",
        variant: "destructive",
      });
    },
  });

  const schoolUpdateMutation = useMutation({
    mutationFn: async ({
      studentId,
      values,
    }: {
      studentId: number;
      values: SchoolStudentEditValues;
    }) => {
      const grade = values.grade?.trim() || "";
      const section = values.section?.trim() || "";
      const curriculum = values.curriculum?.trim() || "";
      const matchedClass = editClasses.find(
        (c) =>
          c.grade === grade &&
          c.section.toUpperCase() === section.toUpperCase() &&
          c.curriculum === curriculum,
      );
      const detail = await updateStudent(studentId, {
        student_name: values.full_name.trim(),
        parent_email: values.email.trim(),
        parent_phone: values.phone.trim() || null,
        ...(matchedClass
          ? { class_id: matchedClass.id }
          : {
              grade: grade || undefined,
              section: section || undefined,
              curriculum: curriculum || undefined,
            }),
      });
      return detail;
    },
    onSuccess: async (detail) => {
      qc.setQueryData(["students", "detail", detail.id], detail);
      setEditOpen(false);
      setEditingSchoolStudent(null);
      setStudentDialogMode("view");
      await refreshStudents();
      await invalidateManyAndBroadcast(qc, ["teachers"]);
      toast({ title: "Student updated" });
    },
    onError: (err) => {
      toast({
        title: "Could not update student",
        description: err instanceof Error ? err.message : "Request failed.",
        variant: "destructive",
      });
    },
  });

  const studentStatusMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      updateStudent(id, { is_active }),
    onSuccess: async (detail) => {
      setEditingSchoolStudent(detail);
      qc.setQueryData(["students", "detail", detail.id], detail);
      await refreshStudents();
      toast({
        title: detail.is_active ? "Student activated" : "Student deactivated",
      });
    },
    onError: (err) => {
      toast({
        title: "Could not update status",
        description: err instanceof Error ? err.message : "Request failed.",
        variant: "destructive",
      });
    },
  });

  const schoolById = new Map((schoolsQuery.data ?? []).map((s) => [s.id, s]));

  const toggleStudent = (student: ApiUser) => {
    void updateOrganizationUserStatus(student.id, !student.is_active).then(() => {
      void invalidateManyAndBroadcast(qc, ["students", "users", "dashboard"]);
    });
  };

  const openStudentDialog = (student: ApiUser, mode: "view" | "edit") => {
    setStudentDialogMode(mode);
    setEditingStudent(student);
    const tc = student.teaching_classes?.[0];
    editForm.reset({
      full_name: student.full_name,
      email: student.email,
      password: "",
      school_id: student.school_id != null ? String(student.school_id) : fixedSchoolId,
      teaching_board: student.teaching_board ?? "",
      grade: tc?.grade?.trim() ?? "",
      section: tc?.sections?.[0]?.trim() ?? "",
    });
    setEditOpen(true);
  };

  const openEditStudent = (student: ApiUser) => openStudentDialog(student, "edit");

  const students = studentsQuery.data ?? [];
  const schools = schoolsQuery.data ?? [];
  const canSubmit = isSchoolAdmin ? Boolean(fixedSchoolId) : schools.length > 0;

  const schoolStudentRows = useMemo(() => {
    const raw = studentSearch.searching
      ? studentSearch.items
      : (studentsListQuery.data?.items ?? []);
    let rows = raw.map(mapStudentRecordToRow);
    if (studentSearch.searching) {
      // Extra facet filters applied client-side (entity search is q-only, no page limit).
      if (studentFilters.grade !== "all") {
        rows = rows.filter((r) => r.grade === studentFilters.grade);
      }
      if (studentFilters.section !== "all") {
        rows = rows.filter((r) => r.section === studentFilters.section);
      }
      if (studentFilters.curriculum !== "all") {
        rows = rows.filter((r) => r.curriculum === studentFilters.curriculum);
      }
      if (studentFilters.learningType !== "all") {
        rows = rows.filter((r) => r.learningType === studentFilters.learningType);
      }
    }
    return rows;
  }, [
    studentSearch.searching,
    studentSearch.items,
    studentsListQuery.data?.items,
    studentFilters.grade,
    studentFilters.section,
    studentFilters.curriculum,
    studentFilters.learningType,
  ]);
  const studentOptions = studentOptionsQuery.data;
  const schoolStudentsTotal = studentSearch.searching
    ? schoolStudentRows.length
    : (studentsListQuery.data?.meta.total ?? 0);
  const pageSizeOptions = studentOptions?.page_size_options ?? [10, 20, 30, 40, 50, 100, 200, 500];
  const studentsListLoading = studentSearch.searching
    ? studentSearch.isLoading
    : studentsListQuery.isLoading && !studentsListQuery.data;
  const studentsListError = studentSearch.searching
    ? studentSearch.error
    : studentsListQuery.error;

  const handleAddStudents = (values: AddStudentsFormValues) => {
    bulkCreateMutation.mutate(values.students);
  };

  const handleImportStudents = (rows: AddStudentRowValues[]) => {
    const toAdd = rows.filter(
      (row) => row.roll_number.trim() && row.student_name.trim() && row.parent_phone.trim() && row.parent_email.trim(),
    );
    if (toAdd.length === 0) {
      toast({
        title: "No students imported",
        description: "All rows were empty, invalid, or already in the list.",
        variant: "destructive",
      });
      return;
    }
    bulkCreateMutation.mutate(toAdd);
  };

  const handleExportStudents = () => {
    void exportStudentsCsv(studentFiltersToApi(studentFilters)).catch((err) => {
      toast({
        title: "Export failed",
        description: err instanceof Error ? err.message : "Could not export students.",
        variant: "destructive",
      });
    });
  };

  const handleStudentFilterChange = (patch: Partial<SchoolStudentFilters>) => {
    setStudentFilters((current) => ({ ...current, ...patch }));
    setStudentPage(1);
  };

  const handleStudentView = (student: SchoolStudentRow) => {
    if (!student.record) return;
    setStudentDialogMode("view");
    setEditingSchoolStudent(student.record);
    setEditOpen(true);
  };

  const studentMenuProps = {
    onEdit: openEditStudent,
    onToggleStatus: toggleStudent,
    onDelete: (t: ApiUser) => setStudentToDelete(t),
  };

  return (
    <div className={isSchoolAdmin ? "dashboard-fit flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3 md:p-4" : "p-6 space-y-8"}>
      {isSchoolAdmin ? (
        <>
          <div className="flex shrink-0 flex-col gap-2">
            <StudentsToolbar
              title={
                <div className="space-y-0.5">
                  <h1 className="text-xl font-bold leading-tight text-blue-900 dark:text-blue-100 sm:text-2xl">
                    Students
                  </h1>
                  <p className="text-sm text-muted-foreground">Manage student accounts.</p>
                </div>
              }
              onAddStudent={() => setOnboardOpen(true)}
              onAssignTeacher={() => setAssignTeacherOpen(true)}
              onMoveClass={() => setMoveClassOpen(true)}
              onImportStudents={handleImportStudents}
              onExport={handleExportStudents}
              importOpen={importOpen}
              onImportOpenChange={setImportOpen}
            />
          </div>

          <div className="shrink-0">
            <StudentsAdminFilters
              filters={studentFilters}
              grades={studentOptions?.grades ?? []}
              sections={studentOptions?.sections ?? []}
              curricula={studentOptions?.curricula ?? []}
              learningTypes={studentOptions?.learning_types ?? []}
              onChange={handleStudentFilterChange}
              onClear={() => {
                setStudentFilters(DEFAULT_STUDENT_FILTERS);
                setStudentPage(1);
              }}
            />
          </div>

          <DataState
            loading={studentsListLoading}
            error={studentsListError ? String(studentsListError) : null}
            empty={schoolStudentsTotal === 0}
            emptyText="No students match the selected filters."
            onRetry={() =>
              void (studentSearch.searching ? studentSearch.refetch() : studentsListQuery.refetch())
            }
          >
            <div className="space-y-0">
              <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
                <StudentsAdminTable students={schoolStudentRows} onView={handleStudentView} />
                <div className="border-t border-border/70 px-3 py-3">
                  {!studentSearch.searching ? (
                    <StudentsAdminPagination
                      page={studentPage}
                      pageSize={studentPageSize}
                      total={schoolStudentsTotal}
                      pageSizeOptions={pageSizeOptions}
                      onPageChange={setStudentPage}
                      onPageSizeChange={(size) => {
                        setStudentPageSize(size);
                        setStudentPage(1);
                      }}
                    />
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Showing all {schoolStudentsTotal} search result
                      {schoolStudentsTotal === 1 ? "" : "s"}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </DataState>
        </>
      ) : (
        <>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Manage Students</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Onboard students with school, board, and a single class (grade) and section. Switch between card and table
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

          <Button className="shrink-0 gap-2" onClick={() => setOnboardOpen(true)}>
            <Plus className="h-4 w-4" />
            Onboard student
          </Button>
        </div>
      </div>

      <DataState
        loading={studentsQuery.isLoading}
        error={studentsQuery.error ? String(studentsQuery.error) : null}
        empty={students.length === 0}
        emptyText="No students yet. Use “Onboard student” after you have at least one school."
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
        </>
      )}

      <AddStudentDialog
        open={onboardOpen && isSchoolAdmin}
        onOpenChange={setOnboardOpen}
        onSubmit={handleAddStudents}
      />

      <OnboardStudentDialog
        open={onboardOpen && !isSchoolAdmin}
        onOpenChange={setOnboardOpen}
        onSubmit={(v) => createMutation.mutate(v)}
        isPending={createMutation.isPending}
        error={createMutation.error ? String(createMutation.error) : null}
        fixedSchoolId={fixedSchoolId}
        schools={schools}
        canSubmit={canSubmit}
      />

      <AssignTeacherDialog
        open={assignTeacherOpen}
        onOpenChange={setAssignTeacherOpen}
        grades={studentOptions?.grades ?? []}
        sections={studentOptions?.sections ?? []}
        curricula={studentOptions?.curricula ?? []}
        pending={assignMutation.isPending}
        onAssign={({ teacherIds, studentIds }) => assignMutation.mutate({ teacherIds, studentIds })}
      />

      <MoveClassDialog
        open={moveClassOpen}
        onOpenChange={setMoveClassOpen}
        grades={studentOptions?.grades ?? []}
        sections={studentOptions?.sections ?? []}
        pending={moveMutation.isPending}
        onMove={({ studentIds, classId }) => moveMutation.mutate({ studentIds, classId })}
      />

      <Dialog
        open={editOpen && isSchoolAdmin && !!editingSchoolStudent}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) {
            setEditingSchoolStudent(null);
            setStudentDialogMode("view");
          }
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader className="space-y-0 pr-6">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1.5">
                <DialogTitle>
                  {studentDialogMode === "view" ? "View student" : "Edit student"}
                </DialogTitle>
                <DialogDescription>
                  {studentDialogMode === "view"
                    ? "Student profile, class, and teacher-guided vs self-learned subjects."
                    : "Update profile, class placement, or status, then Save changes."}
                </DialogDescription>
              </div>
              {editingSchoolStudent && studentDialogMode === "view" ? (
                <Button
                  type="button"
                  size="sm"
                  className="shrink-0"
                  onClick={() => setStudentDialogMode("edit")}
                >
                  Edit
                </Button>
              ) : null}
              {editingSchoolStudent && studentDialogMode === "edit" ? (
                <div className="flex shrink-0 flex-col items-end gap-1 rounded-md border border-border px-3 py-2">
                  <p className="text-xs font-medium text-muted-foreground">Status</p>
                  <Select
                    value={editingSchoolStudent.is_active ? "active" : "inactive"}
                    disabled={studentStatusMutation.isPending}
                    onValueChange={(value) => {
                      studentStatusMutation.mutate({
                        id: editingSchoolStudent.id,
                        is_active: value === "active",
                      });
                    }}
                  >
                    <SelectTrigger className="h-8 w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </div>
          </DialogHeader>
          {editingSchoolStudent ? (
            <Form {...schoolEditForm}>
              <form
                className="space-y-4 pt-2"
                onSubmit={schoolEditForm.handleSubmit((values) => {
                  if (studentDialogMode === "view") return;
                  schoolUpdateMutation.mutate({
                    studentId: editingSchoolStudent.id,
                    values,
                  });
                })}
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-border/80 bg-muted/15 p-3 text-sm">
                    <p className="text-xs text-muted-foreground">User ID</p>
                    <p className="font-medium">{editingSchoolStudent.user_id}</p>
                  </div>
                  <FormField
                    control={schoolEditForm.control}
                    name="full_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full name</FormLabel>
                        <FormControl>
                          <Input disabled={studentDialogMode === "view"} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={schoolEditForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Parent phone</FormLabel>
                        <FormControl>
                          <Input disabled={studentDialogMode === "view"} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={schoolEditForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Parent email</FormLabel>
                        <FormControl>
                          <Input type="email" disabled={studentDialogMode === "view"} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={schoolEditForm.control}
                    name="grade"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Grade</FormLabel>
                        <Select
                          value={selectValue(field.value)}
                          onValueChange={(v) => {
                            const next = fromSelectValue(v);
                            field.onChange(next);
                            const stillValid = editClasses.some(
                              (c) =>
                                c.grade === next &&
                                c.section === schoolEditForm.getValues("section"),
                            );
                            if (!stillValid) {
                              schoolEditForm.setValue("section", "");
                              schoolEditForm.setValue("curriculum", "");
                            }
                          }}
                          disabled={studentDialogMode === "view"}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select grade" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value={NONE}>—</SelectItem>
                            {gradeOptions.map((grade) => (
                              <SelectItem key={grade} value={grade}>
                                {grade}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={schoolEditForm.control}
                    name="section"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Section</FormLabel>
                        <Select
                          value={selectValue(field.value)}
                          onValueChange={(v) => {
                            const next = fromSelectValue(v);
                            field.onChange(next);
                            const stillValid = editClasses.some(
                              (c) =>
                                c.grade === schoolEditForm.getValues("grade") &&
                                c.section === next &&
                                c.curriculum === schoolEditForm.getValues("curriculum"),
                            );
                            if (!stillValid) schoolEditForm.setValue("curriculum", "");
                          }}
                          disabled={studentDialogMode === "view"}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select section" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value={NONE}>—</SelectItem>
                            {sectionOptions.map((section) => (
                              <SelectItem key={section} value={section}>
                                {section}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={schoolEditForm.control}
                    name="curriculum"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Curriculum</FormLabel>
                        <Select
                          value={selectValue(field.value)}
                          onValueChange={(v) => field.onChange(fromSelectValue(v))}
                          disabled={studentDialogMode === "view"}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select curriculum" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value={NONE}>—</SelectItem>
                            {curriculumOptions.map((curriculum) => (
                              <SelectItem key={curriculum} value={curriculum}>
                                {curriculum}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="space-y-2">
                    <p className="text-sm font-medium leading-none">Learning teacher</p>
                    <Input
                      disabled
                      value={
                        (studentDetailQuery.data ?? editingSchoolStudent).learning_teacher?.trim() ||
                        "—"
                      }
                    />
                  </div>
                </div>

                {(() => {
                  const detail = studentDetailQuery.data ?? editingSchoolStudent;
                  const guided = detail.teacher_guided_subjects ?? [];
                  const selfLearned = detail.self_learned_subjects ?? [];
                  if (guided.length === 0 && selfLearned.length === 0) return null;
                  return (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border border-border/80 bg-muted/15 p-3 text-sm">
                        <p className="text-xs font-medium text-muted-foreground">Teacher guided</p>
                        <p className="mt-1 font-medium text-foreground">
                          {guided.length > 0 ? guided.join(", ") : "—"}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border/80 bg-muted/15 p-3 text-sm">
                        <p className="text-xs font-medium text-muted-foreground">Self learned</p>
                        <p className="mt-1 font-medium text-foreground">
                          {selfLearned.length > 0 ? selfLearned.join(", ") : "—"}
                        </p>
                      </div>
                    </div>
                  );
                })()}

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-border/80 bg-muted/15 p-3 text-sm">
                    <p className="text-xs text-muted-foreground">Learning type</p>
                    <p className="font-medium">
                      {(studentDetailQuery.data ?? editingSchoolStudent).learning_type}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/80 bg-muted/15 p-3 text-sm">
                    <p className="text-xs text-muted-foreground">Password status</p>
                    <p className="font-medium">
                      {(studentDetailQuery.data ?? editingSchoolStudent).password_status}
                    </p>
                  </div>
                  {studentDialogMode === "view" ? (
                    <div className="rounded-lg border border-border/80 bg-muted/15 p-3 text-sm">
                      <p className="text-xs text-muted-foreground">Status</p>
                      <p className="font-medium">
                        {editingSchoolStudent.is_active ? "Active" : "Inactive"}
                      </p>
                    </div>
                  ) : null}
                </div>

                {studentDetailQuery.isLoading ? (
                  <p className="text-sm text-muted-foreground">Loading student details…</p>
                ) : null}
                {schoolUpdateMutation.error ? (
                  <p className="text-sm text-destructive">{String(schoolUpdateMutation.error)}</p>
                ) : null}
                <div className="flex items-center justify-between gap-2 pt-2">
                  {studentDialogMode === "edit" && !editingSchoolStudent.is_active ? (
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={deleteSchoolStudentMutation.isPending}
                      onClick={() => setSchoolStudentToDelete(editingSchoolStudent)}
                    >
                      Delete
                    </Button>
                  ) : (
                    <span />
                  )}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (studentDialogMode === "edit") {
                          setStudentDialogMode("view");
                          return;
                        }
                        setEditOpen(false);
                        setEditingSchoolStudent(null);
                      }}
                    >
                      {studentDialogMode === "view" ? "Close" : "Cancel"}
                    </Button>
                    {studentDialogMode === "edit" ? (
                      <Button type="submit" disabled={schoolUpdateMutation.isPending}>
                        {schoolUpdateMutation.isPending ? "Saving…" : "Save changes"}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </form>
            </Form>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={editOpen && !isSchoolAdmin && !!editingStudent}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) setEditingStudent(null);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {studentDialogMode === "view" ? "View student" : "Edit student"}
            </DialogTitle>
            <DialogDescription>
              {studentDialogMode === "view"
                ? "Student profile and class placement (read-only)."
                : "Update profile, school, class (grade), and section. Leave password empty to keep the current one."}
            </DialogDescription>
          </DialogHeader>
          {editingStudent ? (
            <Form {...editForm}>
              <form
                className="grid gap-3 md:grid-cols-2 pt-2"
                onSubmit={editForm.handleSubmit((v) => {
                  if (studentDialogMode === "view" || !editingStudent) return;
                  updateMutation.mutate({ studentId: editingStudent.id, values: v });
                })}
              >
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
                            <SelectItem key={s.id} value={String(s.id)}>
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
                <FormField
                  control={editForm.control}
                  name="teaching_board"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Board / curriculum (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. CBSE, IB, State" disabled={studentDialogMode === "view"} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {studentDialogMode === "view" ? (
                  <div className="md:col-span-2 space-y-2 rounded-lg border border-border/80 bg-muted/15 p-3">
                    <FormLabel>Class &amp; section</FormLabel>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-xs text-muted-foreground">Grade</span>
                        <p className="font-medium">{editForm.getValues("grade") || "—"}</p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Section</span>
                        <p className="font-medium">{editForm.getValues("section") || "—"}</p>
                      </div>
                    </div>
                  </div>
                ) : (
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
                )}
                <FormField
                  control={editForm.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Student full name</FormLabel>
                      <FormControl>
                        <Input disabled={studentDialogMode === "view"} {...field} />
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
                        <Input type="email" autoComplete="off" disabled={studentDialogMode === "view"} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {studentDialogMode === "edit" ? (
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
                      setEditingStudent(null);
                    }}
                  >
                    {studentDialogMode === "view" ? "Close" : "Cancel"}
                  </Button>
                  {studentDialogMode === "edit" ? (
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

      <AlertDialog
        open={!!schoolStudentToDelete}
        onOpenChange={(open) => !open && setSchoolStudentToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete student?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes{" "}
              <span className="font-medium text-foreground">{schoolStudentToDelete?.full_name}</span>{" "}
              ({schoolStudentToDelete?.email}). This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteSchoolStudentMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (schoolStudentToDelete) deleteSchoolStudentMutation.mutate(schoolStudentToDelete.id);
              }}
            >
              {deleteSchoolStudentMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
