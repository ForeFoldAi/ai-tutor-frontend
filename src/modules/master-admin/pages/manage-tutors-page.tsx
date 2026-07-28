import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createTutor, getMasterAdminSchools, patchUserStatus } from "@/api/masterAdmin";
import type { ApiUser } from "@/api/types";
import { useMasterAdminOverview } from "@/modules/master-admin/hooks/use-master-admin-data";
import { UserTable } from "@/modules/master-admin/components/user-table";
import { DataState } from "@/modules/shared/components/data-state";
import { Button } from "@/components/ui/button";
import { invalidateManyAndBroadcast } from "@/lib/query-broadcast";

export default function ManageTutorsPage() {
  const { usersQuery } = useMasterAdminOverview();
  const schoolsQuery = useQuery({ queryKey: ["master-admin", "schools"], queryFn: getMasterAdminSchools });
  const qc = useQueryClient();
  const tutors = (usersQuery.data || []).filter((u) => u.role === "TUTOR");
  const firstSchoolId = schoolsQuery.data?.[0]?.id;

  const createMutation = useMutation({
    mutationFn: () => {
      if (!firstSchoolId) {
        throw new Error("No schools in the system. Create a school and school admin first.");
      }
      return createTutor({
        full_name: "Tutor User",
        email: `tutor.${Date.now()}@example.com`,
        password: "StrongPass123!",
        school_id: firstSchoolId,
        teaching_board: "CBSE",
        teaching_classes: [
          { grade: "8", sections: ["A", "B"] },
          { grade: "9", sections: ["A"] },
          { grade: "10", sections: ["A"] },
        ],
      });
    },
    onSuccess: () => void invalidateManyAndBroadcast(qc, ["users", "teachers", "dashboard"]),
  });

  const toggleMutation = useMutation({
    mutationFn: (user: ApiUser) => patchUserStatus(user.id, !user.is_active),
    onSuccess: () => void invalidateManyAndBroadcast(qc, ["users", "teachers", "dashboard"]),
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Manage Tutors</h1>
        <Button
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending || !firstSchoolId}
        >
          Create Tutor
        </Button>
      </div>
      <DataState
        loading={usersQuery.isLoading}
        error={usersQuery.error ? String(usersQuery.error) : createMutation.error ? String(createMutation.error) : null}
        empty={tutors.length === 0}
        emptyText="No tutors found."
        onRetry={() => void usersQuery.refetch()}
      >
        <UserTable title="Tutors" users={tutors} onToggleStatus={(u) => toggleMutation.mutate(u)} />
      </DataState>
    </div>
  );
}
