import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useTutorData } from "@/modules/tutor/hooks/use-tutor-data";
import { DataState } from "@/modules/shared/components/data-state";
import { createOrganizationStudent } from "@/api/organization";
import type { StudentClassEnrollment } from "@/api/types";
import { useAuthStore } from "@/lib/auth-store";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AddStudentDialog,
  type OnboardStudentFormValues,
} from "@/modules/tutor/components/students/add-student-dialog";
import { ImportStudentsDialog } from "@/modules/tutor/components/students/import-students-dialog";
import { StudentsFilters } from "@/modules/tutor/components/students/students-filters";
import { StudentsTable } from "@/modules/tutor/components/students/students-table";
import { StudentsPagination } from "@/modules/tutor/components/students/students-pagination";
import type { StudentFilters } from "@/modules/tutor/types/student-profile";
import { filterStudents, mergeTutorStudents } from "@/modules/tutor/utils/student-helpers";

const DEFAULT_FILTERS: StudentFilters = {
  grade: "all",
  subject: "all",
  riskLevel: "all",
  search: "",
};

function errorMessage(err: unknown) {
  if (!(err instanceof Error)) return "Could not create student.";
  return err.message || "Could not create student.";
}

export default function TutorAssignedStudentsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const { studentsQuery } = useTutorData();
  const [onboardOpen, setOnboardOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [filters, setFilters] = useState<StudentFilters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const allStudents = useMemo(
    () => mergeTutorStudents(studentsQuery.data ?? []),
    [studentsQuery.data],
  );

  const filteredStudents = useMemo(
    () => filterStudents(allStudents, filters),
    [allStudents, filters],
  );

  const paginatedStudents = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredStudents.slice(start, start + pageSize);
  }, [filteredStudents, page, pageSize]);

  const onboardMutation = useMutation({
    mutationFn: (values: OnboardStudentFormValues) => {
      if (!user?.schoolId) throw new Error("Tutor is not linked to a school.");
      const teaching_classes: [StudentClassEnrollment] = [
        {
          grade: values.grade.trim(),
          sections: [values.section.trim().toUpperCase()] as [string],
        },
      ];
      return createOrganizationStudent({
        full_name: values.full_name.trim(),
        email: values.email.trim(),
        password: values.password,
        school_id: user.schoolId,
        teaching_board: values.teaching_board?.trim() || undefined,
        teaching_classes,
      });
    },
    onSuccess: () => {
      setOnboardOpen(false);
      void qc.invalidateQueries({ queryKey: ["tutor", "students"] });
      void qc.invalidateQueries({ queryKey: ["tutor", "progress"] });
      toast({
        title: "Student added",
        description: "Student is created and auto-assigned by class/section.",
      });
    },
    onError: (e) => {
      toast({
        title: "Could not add student",
        description: errorMessage(e),
        variant: "destructive",
      });
    },
  });

  const handleFilterChange = (patch: Partial<StudentFilters>) => {
    setFilters((current) => ({ ...current, ...patch }));
    setPage(1);
  };

  return (
    <div className="dashboard-fit flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-3 md:p-4">
      <div className="flex shrink-0 flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-blue-900 dark:text-blue-100">Students</h1>
          <p className="text-sm text-muted-foreground">Manage and monitor your students</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ImportStudentsDialog open={importOpen} onOpenChange={setImportOpen} />
          <AddStudentDialog
            open={onboardOpen}
            onOpenChange={setOnboardOpen}
            onSubmit={(values) => onboardMutation.mutate(values)}
            isPending={onboardMutation.isPending}
          />
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-end gap-2 rounded-xl border border-border/70 bg-muted/20 p-3">
        <div className="relative min-w-[180px] flex-1 space-y-1 sm:min-w-[220px]">
          <Label className="text-xs text-muted-foreground">Search</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search students..."
              value={filters.search}
              onChange={(event) => handleFilterChange({ search: event.target.value })}
              className="h-9 !border !border-slate-300 bg-background pl-9 hover:!border-slate-400 focus-visible:!border-primary"
            />
          </div>
        </div>
        <StudentsFilters
          filters={filters}
          onChange={handleFilterChange}
          onClear={() => {
            setFilters(DEFAULT_FILTERS);
            setPage(1);
          }}
        />
      </div>

      <DataState
        loading={studentsQuery.isLoading}
        error={studentsQuery.error ? String(studentsQuery.error) : null}
        empty={filteredStudents.length === 0}
        emptyText="No students match your filters."
        onRetry={() => void studentsQuery.refetch()}
      >
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden rounded-xl border border-border/70 bg-card p-2 shadow-sm md:p-3">
          <StudentsTable students={paginatedStudents} />
          <StudentsPagination
            page={page}
            pageSize={pageSize}
            total={filteredStudents.length}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        </div>
      </DataState>
    </div>
  );
}
