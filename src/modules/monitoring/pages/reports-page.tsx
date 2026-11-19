import { useCallback, useEffect, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MonitorPageHeader } from "@/modules/monitoring/components/monitor-page-header";
import { TimeRangeSelect } from "@/modules/monitoring/components/monitor-filters";
import { ErrorState, StatCard, formatPct } from "@/modules/monitoring/components/stat-card";
import { getMonitoringReports } from "@/modules/monitoring/api/monitoring";

export default function MonitoringReportsPage() {
  const [hours, setHours] = useState("168");
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getMonitoringReports(Number(hours)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, [hours]);

  useEffect(() => {
    void load();
  }, [load]);

  const summary = (data?.summary as Record<string, unknown>) || {};

  return (
    <PageShell size="wide">
      <MonitorPageHeader
        title="Reports & Analytics"
        description="Aggregated reliability summary for the selected window."
        onRefresh={() => void load()}
        refreshing={loading}
      >
        <TimeRangeSelect value={hours} onChange={setHours} />
      </MonitorPageHeader>
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Overall" value={String(summary.overall_status || "—")} loading={loading} />
        <StatCard label="Request volume" value={String(summary.request_volume ?? "—")} loading={loading} />
        <StatCard label="Error rate" value={formatPct(summary.error_rate as number | null)} loading={loading} />
        <StatCard label="Open issues" value={String(summary.open_issues ?? "—")} loading={loading} />
        <StatCard label="Active incidents" value={String(summary.active_incidents ?? "—")} loading={loading} />
      </div>

      <Card className="mt-6">
        <CardHeader><CardTitle className="text-base">Export</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Use the overview and logs export endpoints for offline analysis. Charts above use live backend aggregates only.
        </CardContent>
      </Card>
    </PageShell>
  );
}
