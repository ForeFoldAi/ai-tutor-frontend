import { useCallback, useEffect, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MonitorPageHeader } from "@/modules/monitoring/components/monitor-page-header";
import {
  EnvironmentSelect,
  ServiceSelect,
  TimeRangeSelect,
} from "@/modules/monitoring/components/monitor-filters";
import {
  EmptyState,
  ErrorState,
  StatCard,
  formatMs,
  formatPct,
  statusTone,
} from "@/modules/monitoring/components/stat-card";
import {
  getMonitoringOverview,
  type OverviewResponse,
} from "@/modules/monitoring/api/monitoring";

export default function MonitoringOverviewPage() {
  const [hours, setHours] = useState("24");
  const [environment, setEnvironment] = useState("production");
  const [service, setService] = useState("all");
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const res = await getMonitoringOverview({
        hours: Number(hours),
        environment,
        service: service === "all" ? undefined : service,
      });
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load overview");
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [hours, environment, service]);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 30_000);
    return () => window.clearInterval(id);
  }, [load]);

  return (
    <PageShell size="wide">
      <MonitorPageHeader
        title="Production Overview"
        description="Live system health from backend probes and metric aggregates — no fabricated data."
        onRefresh={() => void load()}
        refreshing={refreshing}
      >
        <TimeRangeSelect value={hours} onChange={setHours} />
        <EnvironmentSelect value={environment} onChange={setEnvironment} />
        <ServiceSelect value={service} onChange={setService} />
      </MonitorPageHeader>

      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}

      <div className="mb-4 flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Overall</span>
        <Badge variant="outline" className="capitalize">
          {loading ? "…" : data?.overall_status || "unknown"}
        </Badge>
        {data?.unavailable?.length ? (
          <span className="text-xs text-amber-600">
            Unavailable: {data.unavailable.join(", ")}
          </span>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="API success rate" value={formatPct(data?.api_success_rate)} loading={loading} tone={statusTone(data?.overall_status)} />
        <StatCard label="Error rate" value={formatPct(data?.error_rate)} loading={loading} tone={(data?.error_rate ?? 0) > 0.05 ? "bad" : "default"} />
        <StatCard label="Request volume" value={data?.request_volume ?? "—"} loading={loading} />
        <StatCard label="p95 latency" value={formatMs(data?.latency_p95_ms)} loading={loading} hint={`p50 ${formatMs(data?.latency_p50_ms)} · p99 ${formatMs(data?.latency_p99_ms)}`} />
        <StatCard label="Active incidents" value={data?.active_incidents ?? "—"} loading={loading} tone={(data?.active_incidents ?? 0) > 0 ? "bad" : "good"} />
        <StatCard label="Open issues" value={data?.open_issues ?? "—"} loading={loading} />
        <StatCard label="Affected users" value={data?.affected_users ?? "—"} loading={loading} />
        <StatCard label="AI Tutor" value={data?.ai_tutor_status ?? "—"} loading={loading} tone={statusTone(data?.ai_tutor_status)} />
        <StatCard label="CPU" value={data?.cpu_percent == null ? "—" : `${data.cpu_percent.toFixed(1)}%`} loading={loading} hint={data?.cpu_percent == null ? "Coolify metrics unavailable" : undefined} />
        <StatCard label="RAM" value={data?.ram_percent == null ? "—" : `${data.ram_percent.toFixed(1)}%`} loading={loading} />
        <StatCard label="Disk" value={data?.disk_percent == null ? "—" : `${data.disk_percent.toFixed(1)}%`} loading={loading} />
        <StatCard label="Database / Redis" value={`${data?.database_status ?? "—"} / ${data?.redis_status ?? "—"}`} loading={loading} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Services</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {!loading && (!data?.services || data.services.length === 0) ? (
              <EmptyState title="No services registered" description="Run the monitoring migration to seed default services." />
            ) : (
              (data?.services || []).map((s) => (
                <div key={String(s.key)} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <span>{String(s.name || s.key)}</span>
                  <Badge variant="outline" className="capitalize">{String(s.status || "unknown")}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Containers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {!loading && (!data?.containers || data.containers.length === 0) ? (
              <EmptyState title="No container data" description="Configure COOLIFY_* env vars on the API to enable infrastructure status." />
            ) : (
              (data?.containers || []).map((c, i) => (
                <div key={i} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <span>{String(c.service_key || c.name || "container")}</span>
                  <Badge variant="outline">{String(c.status || "unknown")}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent deployments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {!loading && (!data?.recent_deployments || data.recent_deployments.length === 0) ? (
              <EmptyState title="No deployments" />
            ) : (
              (data?.recent_deployments || []).map((d, i) => (
                <div key={i} className="rounded-md border px-3 py-2 text-sm">
                  <div className="font-medium">{String(d.service_key || "service")}</div>
                  <div className="text-muted-foreground">{String(d.status || "unknown")} · {String(d.started_at || d.created_at || "")}</div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {!loading && (!data?.recent_alerts || data.recent_alerts.length === 0) ? (
              <EmptyState title="No recent alerts" />
            ) : (
              (data?.recent_alerts || []).map((a, i) => (
                <div key={i} className="rounded-md border px-3 py-2 text-sm">
                  <div className="font-medium">{String(a.title)}</div>
                  <div className="text-muted-foreground">{String(a.severity)} · {String(a.status)}</div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
