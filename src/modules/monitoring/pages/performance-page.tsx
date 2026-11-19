import { useCallback, useEffect, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MonitorPageHeader } from "@/modules/monitoring/components/monitor-page-header";
import { ServiceSelect, TimeRangeSelect } from "@/modules/monitoring/components/monitor-filters";
import { EmptyState, ErrorState, StatCard, formatMs } from "@/modules/monitoring/components/stat-card";
import { getMonitoringPerformance } from "@/modules/monitoring/api/monitoring";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

export default function MonitoringPerformancePage() {
  const [hours, setHours] = useState("24");
  const [service, setService] = useState("all");
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(
        await getMonitoringPerformance({
          hours: Number(hours),
          service: service === "all" ? undefined : service,
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load performance");
    } finally {
      setLoading(false);
    }
  }, [hours, service]);

  useEffect(() => {
    void load();
  }, [load]);

  const series = ((data?.series as Record<string, unknown>[]) || []).map((r) => ({
    ts: String(r.ts || "").slice(11, 16),
    p50: r.p50 as number | null,
    p95: r.p95 as number | null,
    p99: r.p99 as number | null,
  }));
  const slow = (data?.slow_requests as Record<string, unknown>[]) || [];

  return (
    <PageShell size="wide">
      <MonitorPageHeader
        title="Performance Monitoring"
        description="API latency percentiles and slow request detection from real aggregates."
        onRefresh={() => void load()}
        refreshing={loading}
      >
        <TimeRangeSelect value={hours} onChange={setHours} />
        <ServiceSelect value={service} onChange={setService} />
      </MonitorPageHeader>
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="p50" value={formatMs(data?.p50_ms as number | null)} loading={loading} />
        <StatCard label="p95" value={formatMs(data?.p95_ms as number | null)} loading={loading} />
        <StatCard label="p99" value={formatMs(data?.p99_ms as number | null)} loading={loading} />
      </div>

      <Card className="mb-6">
        <CardHeader><CardTitle className="text-base">Latency over time</CardTitle></CardHeader>
        <CardContent>
          {series.length === 0 ? (
            <EmptyState title="No latency series yet" description="Enable MONITORING_ENABLED to collect request metrics." />
          ) : (
            <ChartContainer config={{ p95: { label: "p95", color: "hsl(var(--primary))" } }} className="h-[260px] w-full">
              <LineChart data={series}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="ts" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="p50" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="p95" stroke="var(--color-p95)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="p99" stroke="hsl(var(--destructive))" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Slow requests (≥ 2s)</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {slow.length === 0 ? (
            <EmptyState title="No slow requests in range" />
          ) : (
            slow.map((s, i) => (
              <div key={i} className="rounded-md border px-3 py-2 text-sm">
                <div className="font-medium">{String(s.message)}</div>
                <div className="text-xs text-muted-foreground">
                  {formatMs(s.duration_ms as number)} · {String(s.request_id || "")} · {String(s.ts || "")}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
