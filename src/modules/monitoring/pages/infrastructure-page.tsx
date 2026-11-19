import { useCallback, useEffect, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MonitorPageHeader } from "@/modules/monitoring/components/monitor-page-header";
import { EmptyState, ErrorState, StatCard } from "@/modules/monitoring/components/stat-card";
import { getMonitoringInfrastructure } from "@/modules/monitoring/api/monitoring";

export default function MonitoringInfrastructurePage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getMonitoringInfrastructure());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load infrastructure");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const containers = (data?.containers as Record<string, unknown>[]) || [];
  const deployments = (data?.deployments as Record<string, unknown>[]) || [];
  const unavailable = (data?.unavailable as string[]) || [];

  return (
    <PageShell size="wide">
      <MonitorPageHeader
        title="Infrastructure & VPS"
        description="Coolify-backed host and container status (credentials never leave the API)."
        onRefresh={() => void load()}
        refreshing={loading}
      />
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
      {unavailable.length ? (
        <p className="mb-4 text-sm text-amber-600">Unavailable: {unavailable.join(", ")}. {String(data?.message || "")}</p>
      ) : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="CPU" value={data?.cpu_percent == null ? "—" : `${Number(data.cpu_percent).toFixed(1)}%`} loading={loading} />
        <StatCard label="RAM" value={data?.ram_percent == null ? "—" : `${Number(data.ram_percent).toFixed(1)}%`} loading={loading} />
        <StatCard label="Disk" value={data?.disk_percent == null ? "—" : `${Number(data.disk_percent).toFixed(1)}%`} loading={loading} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Containers</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {!loading && containers.length === 0 ? (
              <EmptyState title="No container status" description="Set COOLIFY_URL, COOLIFY_TOKEN, and app UUIDs." />
            ) : (
              containers.map((c, i) => (
                <div key={i} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <div>
                    <div className="font-medium">{String(c.name || c.service_key)}</div>
                    <div className="text-xs text-muted-foreground">{String(c.fqdn || c.uuid || "")}</div>
                  </div>
                  <Badge variant="outline">{String(c.status || "unknown")}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Recent Coolify deployments</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {!loading && deployments.length === 0 ? (
              <EmptyState title="No deployments from Coolify" />
            ) : (
              deployments.map((d, i) => (
                <div key={i} className="rounded-md border px-3 py-2 text-sm">
                  <div className="font-medium">{String(d.service_key)}</div>
                  <div className="text-xs text-muted-foreground">{String(d.status)} · {String(d.commit || "")}</div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
