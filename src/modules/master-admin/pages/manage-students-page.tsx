import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createStudent, patchUserStatus } from "@/api/masterAdmin";
import type { ApiUser, StudentClassEnrollment } from "@/api/types";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { useMasterAdminOverview } from "@/modules/master-admin/hooks/use-master-admin-data";
import { UserTable } from "@/modules/master-admin/components/user-table";
import { DataState } from "@/modules/shared/components/data-state";
import {
  OnboardStudentDialog,
  type OnboardStudentFormValues,
} from "@/modules/organization/components/students/onboard-student-dialog";
import { invalidateManyAndBroadcast } from "@/lib/query-broadcast";

export default function ManageStudentsPage() {
  const { usersQuery, schoolsQuery } = useMasterAdminOverview();
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const students = (usersQuery.data || []).filter((u) => u.role === "STUDENT");
  const schools = schoolsQuery.data ?? [];

  const toggleMutation = useMutation({
    mutationFn: (user: ApiUser) => patchUserStatus(user.id, !user.is_active),
    onSuccess: () =>
      void invalidateManyAndBroadcast(qc, ["users", "students", "dashboard"]),
  });

  const createMutation = useMutation({
    mutationFn: (values: OnboardStudentFormValues) => {
      const teaching_classes: [StudentClassEnrollment] = [
        {
          grade: values.grade.trim(),
          sections: [values.section.trim()] as [string],
        },
      ];
      return createStudent({
        full_name: values.full_name.trim(),
        email: values.email.trim(),
        password: values.password,
        school_id: Number(values.school_id),
        teaching_board: values.teaching_board?.trim() || undefined,
        teaching_classes,
      });
    },
    onSuccess: () => {
      setAddOpen(false);
      void invalidateManyAndBroadcast(qc, ["users", "students", "dashboard"]);
    },
  });

  return (
    <PageShell>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Manage Students</h1>
        <Button onClick={() => setAddOpen(true)} disabled={schools.length === 0}>
          Add Student
        </Button>
      </div>
      <DataState
        loading={usersQuery.isLoading}
        error={usersQuery.error ? String(usersQuery.error) : null}
        empty={students.length === 0}
        emptyText="No students found."
        onRetry={() => void usersQuery.refetch()}
      >
        <UserTable title="Students" users={students} onToggleStatus={(u) => toggleMutation.mutate(u)} />
      </DataState>

      <OnboardStudentDialog
        open={addOpen}
        onOpenChange={(open) => {
          if (!open) createMutation.reset();
          setAddOpen(open);
        }}
        onSubmit={(v) => createMutation.mutate(v)}
        isPending={createMutation.isPending}
        error={createMutation.error ? String(createMutation.error) : null}
        fixedSchoolId=""
        schools={schools}
        canSubmit={schools.length > 0}
      />
    </PageShell>
  );
}
