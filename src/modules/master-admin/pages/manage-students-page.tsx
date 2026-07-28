import { useMutation, useQueryClient } from "@tanstack/react-query";
import { patchUserStatus } from "@/api/masterAdmin";
import type { ApiUser } from "@/api/types";
import { useMasterAdminOverview } from "@/modules/master-admin/hooks/use-master-admin-data";
import { UserTable } from "@/modules/master-admin/components/user-table";
import { DataState } from "@/modules/shared/components/data-state";
import { invalidateManyAndBroadcast } from "@/lib/query-broadcast";

export default function ManageStudentsPage() {
  const { usersQuery } = useMasterAdminOverview();
  const qc = useQueryClient();
  const students = (usersQuery.data || []).filter((u) => u.role === "STUDENT");
  const toggleMutation = useMutation({
    mutationFn: (user: ApiUser) => patchUserStatus(user.id, !user.is_active),
    onSuccess: () =>
      void invalidateManyAndBroadcast(qc, ["users", "students", "dashboard"]),
  });

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Manage Students</h1>
      <DataState
        loading={usersQuery.isLoading}
        error={usersQuery.error ? String(usersQuery.error) : null}
        empty={students.length === 0}
        emptyText="No students found."
        onRetry={() => void usersQuery.refetch()}
      >
        <UserTable title="Students" users={students} onToggleStatus={(u) => toggleMutation.mutate(u)} />
      </DataState>
    </div>
  );
}
