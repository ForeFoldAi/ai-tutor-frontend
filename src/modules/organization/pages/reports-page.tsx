import { PageShell } from "@/components/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useOrganizationData } from "@/modules/organization/hooks/use-organization-data";
import { DataState } from "@/modules/shared/components/data-state";

export default function OrganizationReportsPage() {
  const { reportsQuery } = useOrganizationData();
  const report = reportsQuery.data;

  return (
    <PageShell>
      <h1 className="text-xl font-semibold sm:text-2xl">Organization Reports</h1>
      <DataState
        loading={reportsQuery.isLoading}
        error={reportsQuery.error ? String(reportsQuery.error) : null}
        empty={!report}
        emptyText="No report data available."
        onRetry={() => void reportsQuery.refetch()}
      >
        <div className="grid gap-4 md:grid-cols-3">
          <Card><CardHeader><CardTitle>Total Tutors</CardTitle></CardHeader><CardContent>{report?.tutorCount ?? 0}</CardContent></Card>
          <Card><CardHeader><CardTitle>Total Students</CardTitle></CardHeader><CardContent>{report?.studentCount ?? 0}</CardContent></Card>
          <Card><CardHeader><CardTitle>Active Users</CardTitle></CardHeader><CardContent>{report?.activeUsers ?? 0}</CardContent></Card>
        </div>
      </DataState>
    </PageShell>
  );
}
