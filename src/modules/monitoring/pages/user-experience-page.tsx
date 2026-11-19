import { useCallback, useEffect, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MonitorPageHeader } from "@/modules/monitoring/components/monitor-page-header";
import { TimeRangeSelect } from "@/modules/monitoring/components/monitor-filters";
import { EmptyState, ErrorState, StatCard, formatMs } from "@/modules/monitoring/components/stat-card";
import { getMonitoringUx } from "@/modules/monitoring/api/monitoring";

export default function MonitoringUserExperiencePage() {
  const [hours, setHours] = useState("24");
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getMonitoringUx({ hours: Number(hours) }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load UX metrics");
    } finally {
      setLoading(false);
    }
  }, [hours]);

  useEffect(() => {
    void load();
  }, [load]);

  const vitals = (data?.web_vitals as Record<string, { p50?: number; p95?: number; count?: number }>) || {};
  const keys = Object.keys(vitals);

  return (
    <PageShell size="wide">
      <MonitorPageHeader
        title="User Experience Monitoring"
        description="Frontend Web Vitals aggregates reported to the monitoring API."
        onRefresh={() => void load()}
        refreshing={loading}
      >
        <TimeRangeSelect value={hours} onChange={setHours} />
      </MonitorPageHeader>
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}

      {keys.length === 0 && !loading ? (
        <EmptyState
          title="No Web Vitals yet"
          description="Post samples to /auth/admin/monitoring/ingest/web-vitals from the frontend instrumentation."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {keys.map((key) => (
            <StatCard
              key={key}
              label={key.replace("web_vitals.", "")}
              value={formatMs(vitals[key]?.p95 ?? null)}
              hint={`p50 ${formatMs(vitals[key]?.p50 ?? null)} · n=${vitals[key]?.count ?? 0}`}
              loading={loading}
            />
          ))}
        </div>
      )}

      <Card className="mt-6">
        <CardHeader><CardTitle className="text-base">Series</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {((data?.series as Record<string, unknown>[]) || []).length === 0 ? (
            <p className="text-muted-foreground">No series points.</p>
          ) : (
            ((data?.series as Record<string, unknown>[]) || []).slice(-20).map((row, i) => (
              <div key={i} className="flex justify-between rounded-md border px-3 py-1.5">
                <span>{String(row.metric)}</span>
                <span className="tabular-nums text-muted-foreground">{String(row.ts)} · {formatMs(row.p75 as number)}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
