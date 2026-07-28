import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { Search } from "lucide-react";
import {
  exportTutorStudentsCsv,
  getTutorStudentOptions,
  listAssignedStudents,
} from "@/api/tutor";
import {
  assignTeacherToStudents,
  bulkCreateStudents,
  getStudentOptions,
  moveStudentsToClass,
} from "@/api/students";
import { useAuthStore } from "@/lib/auth-store";
import { isIndividualTutor } from "@/lib/app-nav-items";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { DataState } from "@/modules/shared/components/data-state";
import {
  AddStudentDialog,
  type AddStudentRowValues,
  type AddStudentsFormValues,
} from "@/modules/organization/components/students/add-student-dialog";
import { AssignTeacherDialog } from "@/modules/organization/components/students/assign-teacher-dialog";
import { MoveClassDialog } from "@/modules/organization/components/students/move-class-dialog";
import { StudentsToolbar } from "@/modules/organization/components/students/students-toolbar";
import { StudentsFilters } from "@/modules/tutor/components/students/students-filters";
import { StudentsTable } from "@/modules/tutor/components/students/students-table";
import { StudentsPagination } from "@/modules/tutor/components/students/students-pagination";
import type { StudentFilters, TutorStudentRowApi } from "@/modules/tutor/types/student-profile";
import { mapTutorStudentRow } from "@/modules/tutor/utils/student-helpers";
import { useEntitySearch } from "@/modules/search";
import { invalidateManyAndBroadcast } from "@/lib/query-broadcast";

const DEFAULT_FILTERS: StudentFilters = {
  grade: "all",
  subject: "all",
  riskLevel: "all",
  search: "",
};

export default function TutorAssignedStudentsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const individual = isIndividualTutor(user?.role, user?.schoolId);
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [assignTeacherOpen, setAssignTeacherOpen] = useState(false);
  const [moveClassOpen, setMoveClassOpen] = useState(false);
  const [filters, setFilters] = useState<StudentFilters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const tutorOptionsQuery = useQuery({
    queryKey: ["tutor", "students", "options"],
    queryFn: getTutorStudentOptions,
  });

  const studentSearch = useEntitySearch<TutorStudentRowApi>("students", filters.search);
  const studentsQuery = useQuery({
    queryKey: [
      "tutor",
      "students",
      filters.search,
      filters.grade,
      filters.subject,
      filters.riskLevel,
      page,
      pageSize,
    ],
    queryFn: () =>
      listAssignedStudents({
        q: filters.search,
        grade: filters.grade,
        subject: filters.subject,
        risk_level: filters.riskLevel,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      }),
    enabled: !studentSearch.searching,
    placeholderData: keepPreviousData,
  });

  const studentOptionsQuery = useQuery({
    queryKey: ["students", "options"],
    queryFn: getStudentOptions,
    enabled: (!individual && assignTeacherOpen) || moveClassOpen,
  });
  const studentOptions = studentOptionsQuery.data;

  const students = useMemo(() => {
    const raw = studentSearch.searching
      ? studentSearch.items
      : (studentsQuery.data?.items ?? []);
    let rows = raw.map(mapTutorStudentRow);
    if (studentSearch.searching) {
      if (filters.grade !== "all") {
        rows = rows.filter((r) => r.grade === filters.grade);
      }
      if (filters.subject !== "all") {
        rows = rows.filter((r) =>
          r.subjects.some((s) => s.toLowerCase() === filters.subject.toLowerCase()),
        );
      }
      if (filters.riskLevel !== "all") {
        rows = rows.filter((r) => r.riskLevel === filters.riskLevel);
      }
    }
    return rows;
  }, [
    studentSearch.searching,
    studentSearch.items,
    studentsQuery.data?.items,
    filters.grade,
    filters.subject,
    filters.riskLevel,
  ]);
  const total = studentSearch.searching ? students.length : (studentsQuery.data?.meta.total ?? 0);
  const listLoading = studentSearch.searching
    ? studentSearch.isLoading
    : studentsQuery.isLoading && !studentsQuery.data;
  const listError = studentSearch.searching ? studentSearch.error : studentsQuery.error;

  const refreshStudents = async () => {
    await invalidateManyAndBroadcast(qc, ["students", "dashboard"], { refetch: true });
  };

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
      setAddOpen(false);
      setImportOpen(false);
      if (result.created.length > 0) {
        toast({
          title: result.created.length === 1 ? "Student added" : "Students added",
          description:
            result.errors.length > 0
              ? `${result.created.length} saved. ${result.errors.length} row(s) failed.`
              : individual
                ? `${result.created.length} student(s) saved.`
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

  const handleAddStudents = (values: AddStudentsFormValues) => {
    bulkCreateMutation.mutate(values.students);
  };

  const handleImportStudents = (rows: AddStudentRowValues[]) => {
    const toAdd = rows.filter(
      (row) =>
        row.roll_number.trim() &&
        row.student_name.trim() &&
        row.parent_phone.trim() &&
        row.parent_email.trim(),
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
    void exportTutorStudentsCsv({
      q: filters.search,
      grade: filters.grade,
      subject: filters.subject,
      risk_level: filters.riskLevel,
    }).catch((err) => {
      toast({
        title: "Export failed",
        description: err instanceof Error ? err.message : "Could not export students.",
        variant: "destructive",
      });
    });
  };

  const handleFilterChange = (patch: Partial<StudentFilters>) => {
    setFilters((current) => ({ ...current, ...patch }));
    setPage(1);
  };

  return (
    <div className="dashboard-fit flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3 md:p-4">
      <div className="flex shrink-0 flex-col gap-2">
        <StudentsToolbar
          title={
            <div className="space-y-0.5">
              <h1 className="text-xl font-bold leading-tight text-blue-900 dark:text-blue-100 sm:text-2xl">
                Students
              </h1>
              <p className="text-sm text-muted-foreground">Manage and monitor your students</p>
            </div>
          }
          onAddStudent={() => setAddOpen(true)}
          onAssignTeacher={individual ? undefined : () => setAssignTeacherOpen(true)}
          showAssignTeacher={!individual}
          onMoveClass={() => setMoveClassOpen(true)}
          onImportStudents={handleImportStudents}
          onExport={handleExportStudents}
          importOpen={importOpen}
          onImportOpenChange={setImportOpen}
        />
      </div>

      <div className="flex shrink-0 flex-wrap items-end gap-1.5 rounded-xl border border-border/70 bg-muted/20 p-2 sm:gap-2 sm:p-3">
        <div className="relative min-w-0 flex-1 basis-full space-y-1 sm:basis-auto sm:min-w-[200px] md:min-w-[240px]">
          <Label className="text-[10px] text-muted-foreground sm:text-xs">Search</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground sm:left-3 sm:h-4 sm:w-4" />
            <Input
              placeholder="Search students..."
              value={filters.search}
              onChange={(event) => handleFilterChange({ search: event.target.value })}
              className="h-8 !border !border-slate-300 bg-background pl-8 text-sm hover:!border-slate-400 focus-visible:!border-primary sm:h-9 sm:pl-9"
            />
          </div>
        </div>
        <StudentsFilters
          filters={filters}
          grades={tutorOptionsQuery.data?.grades ?? []}
          subjects={tutorOptionsQuery.data?.subjects ?? []}
          riskLevels={tutorOptionsQuery.data?.risk_levels ?? ["Not Started", "Low", "Medium", "High"]}
          onChange={handleFilterChange}
          onClear={() => {
            setFilters(DEFAULT_FILTERS);
            setPage(1);
          }}
        />
      </div>

      <DataState
        loading={listLoading}
        error={listError ? String(listError) : null}
        empty={total === 0}
        emptyText="No students match your filters."
        onRetry={() =>
          void (studentSearch.searching ? studentSearch.refetch() : studentsQuery.refetch())
        }
      >
        <div className="space-y-0">
          <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
            <StudentsTable students={students} />
            <div className="border-t border-border/70 px-3 py-3">
              {!studentSearch.searching ? (
                <StudentsPagination
                  page={page}
                  pageSize={pageSize}
                  total={total}
                  onPageChange={setPage}
                  onPageSizeChange={(size) => {
                    setPageSize(size);
                    setPage(1);
                  }}
                />
              ) : (
                <p className="text-xs text-muted-foreground">
                  Showing all {total} search result{total === 1 ? "" : "s"}
                </p>
              )}
            </div>
          </div>
        </div>
      </DataState>

      <AddStudentDialog open={addOpen} onOpenChange={setAddOpen} onSubmit={handleAddStudents} />

      {!individual ? (
        <AssignTeacherDialog
          open={assignTeacherOpen}
          onOpenChange={setAssignTeacherOpen}
          grades={studentOptions?.grades ?? []}
          sections={studentOptions?.sections ?? []}
          curricula={studentOptions?.curricula ?? []}
          pending={assignMutation.isPending}
          onAssign={({ teacherIds, studentIds }) => assignMutation.mutate({ teacherIds, studentIds })}
        />
      ) : null}

      <MoveClassDialog
        open={moveClassOpen}
        onOpenChange={setMoveClassOpen}
        grades={studentOptions?.grades ?? []}
        sections={studentOptions?.sections ?? []}
        pending={moveMutation.isPending}
        onMove={({ studentIds, classId }) => moveMutation.mutate({ studentIds, classId })}
      />
    </div>
  );
}
