import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMasterAdminOverview } from "@/modules/master-admin/hooks/use-master-admin-data";
import { DataState } from "@/modules/shared/components/data-state";

export default function MasterAdminReportsPage() {
  const { reportsQuery } = useMasterAdminOverview();
  const summary = reportsQuery.data;
  const entries = Object.entries(summary?.byRole || {});

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Reports & Insights</h1>
      <DataState
        loading={reportsQuery.isLoading}
        error={reportsQuery.error ? String(reportsQuery.error) : null}
        empty={entries.length === 0}
        emptyText="No report data available."
        onRetry={() => void reportsQuery.refetch()}
      >
        <Card>
          <CardHeader><CardTitle>Users by Role</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {entries.map(([role, count]) => (
              <div key={role} className="flex items-center justify-between rounded border p-2">
                <span>{role}</span>
                <span className="font-semibold">{count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </DataState>
    </div>
  );
}
