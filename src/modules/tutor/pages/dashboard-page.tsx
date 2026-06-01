import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTutorData } from "@/modules/tutor/hooks/use-tutor-data";
import { DataState } from "@/modules/shared/components/data-state";

export default function TutorDashboardModulePage() {
  const { progressQuery } = useTutorData();
  const metrics = progressQuery.data;
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Tutor Dashboard</h1>
      <DataState
        loading={progressQuery.isLoading}
        error={progressQuery.error ? String(progressQuery.error) : null}
        empty={!metrics}
        emptyText="No tutor metrics available."
        onRetry={() => void progressQuery.refetch()}
      >
        <div className="grid gap-4 md:grid-cols-3">
          <Card><CardHeader><CardTitle>Assigned Students</CardTitle></CardHeader><CardContent>{metrics?.totalAssigned ?? 0}</CardContent></Card>
          <Card><CardHeader><CardTitle>Active Students</CardTitle></CardHeader><CardContent>{metrics?.activeStudents ?? 0}</CardContent></Card>
          <Card><CardHeader><CardTitle>Average Completion</CardTitle></CardHeader><CardContent>{metrics?.averageCompletion ?? 0}%</CardContent></Card>
        </div>
      </DataState>
    </div>
  );
}
