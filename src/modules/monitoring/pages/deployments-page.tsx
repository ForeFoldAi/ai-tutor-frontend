import { useCallback, useEffect, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { Badge } from "@/components/ui/badge";
import { MonitorPageHeader } from "@/modules/monitoring/components/monitor-page-header";
import { EmptyState, ErrorState } from "@/modules/monitoring/components/stat-card";
import { getMonitoringDeployments } from "@/modules/monitoring/api/monitoring";

export default function MonitoringDeploymentsPage() {
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await getMonitoringDeployments());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load deployments");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageShell size="wide">
      <MonitorPageHeader
        title="Deployment Tracking"
        description="Tracked releases correlated with Coolify deployments when configured."
        onRefresh={() => void load()}
        refreshing={loading}
      />
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
      {!loading && items.length === 0 ? (
        <EmptyState title="No deployments" description="Configure Coolify credentials or record deployments into monitoring.deployments." />
      ) : (
        <div className="space-y-2">
          {items.map((d, i) => (
            <div key={String(d.id || i)} className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-3 text-sm">
              <div>
                <div className="font-medium">{String(d.service_key)}</div>
                <div className="text-xs text-muted-foreground">
                  {String(d.version || d.commit_sha || d.coolify_deployment_id || "—")} · {String(d.started_at || "")}
                </div>
              </div>
              <Badge variant="outline">{String(d.status)}</Badge>
            </div>
          ))}
        </div>
      )}
    </PageShell>
  );
}
