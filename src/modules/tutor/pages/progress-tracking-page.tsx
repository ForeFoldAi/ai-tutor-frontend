import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useTutorData } from "@/modules/tutor/hooks/use-tutor-data";
import { DataState } from "@/modules/shared/components/data-state";
import { UserTable } from "@/modules/master-admin/components/user-table";

export default function TutorProgressTrackingPage() {
  const { progressQuery, studentsQuery } = useTutorData();
  const metrics = progressQuery.data;
  const students = studentsQuery.data ?? [];
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Progress Tracking</h1>
      <DataState
        loading={progressQuery.isLoading}
        error={progressQuery.error ? String(progressQuery.error) : null}
        empty={!metrics}
        emptyText="No progress data available."
        onRetry={() => void progressQuery.refetch()}
      >
        <Card>
          <CardHeader><CardTitle>Student Completion Health</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">Overall completion: {metrics?.averageCompletion ?? 0}%</p>
            <Progress value={metrics?.averageCompletion ?? 0} />
            <p className="text-xs text-muted-foreground">
              Based on students tagged to this tutor by matching school, class, and section.
            </p>
          </CardContent>
        </Card>
      </DataState>

      <DataState
        loading={studentsQuery.isLoading}
        error={studentsQuery.error ? String(studentsQuery.error) : null}
        empty={students.length === 0}
        emptyText="No tagged students found for this tutor."
        onRetry={() => void studentsQuery.refetch()}
      >
        <UserTable title="Tagged students for this tutor" users={students} />
      </DataState>
    </div>
  );
}
