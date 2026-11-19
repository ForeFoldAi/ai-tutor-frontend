import { useCallback, useEffect, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MonitorPageHeader } from "@/modules/monitoring/components/monitor-page-header";
import { EmptyState, ErrorState, formatMs } from "@/modules/monitoring/components/stat-card";
import { getMonitoringServices } from "@/modules/monitoring/api/monitoring";

export default function MonitoringServicesPage() {
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const res = await getMonitoringServices();
      setItems(res.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load services");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 20_000);
    return () => window.clearInterval(id);
  }, [load]);

  return (
    <PageShell size="wide">
      <MonitorPageHeader
        title="Services & API Monitoring"
        description="Live health probes for API, workers, voice, Redis, Postgres, and Qdrant."
        onRefresh={() => void load()}
        refreshing={refreshing}
      />
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
      {!loading && items.length === 0 ? (
        <EmptyState title="No services" description="Seeded after the monitoring migration." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((s) => (
            <Card key={String(s.key)}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base">
                  <span>{String(s.name || s.key)}</span>
                  <Badge variant="outline" className="capitalize">{String(s.status || "unknown")}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <div>Kind: {String(s.kind)}</div>
                <div>Env: {String(s.environment)}</div>
                <div>Latency: {formatMs(typeof s.latency_ms === "number" ? s.latency_ms : null)}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageShell>
  );
}
