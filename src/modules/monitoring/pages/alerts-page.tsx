import { useCallback, useEffect, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MonitorPageHeader } from "@/modules/monitoring/components/monitor-page-header";
import { EmptyState, ErrorState } from "@/modules/monitoring/components/stat-card";
import {
  ackMonitoringAlert,
  createMonitoringAlertRule,
  getMonitoringAlertRules,
  getMonitoringAlerts,
} from "@/modules/monitoring/api/monitoring";

export default function MonitoringAlertsPage() {
  const [alerts, setAlerts] = useState<Record<string, unknown>[]>([]);
  const [rules, setRules] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ruleName, setRuleName] = useState("");
  const [metricKey, setMetricKey] = useState("http.request.errors");
  const [threshold, setThreshold] = useState("5");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [a, r] = await Promise.all([getMonitoringAlerts(), getMonitoringAlertRules()]);
      setAlerts(a.items);
      setRules(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load alerts");
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
        title="Alerts & Notification Rules"
        description="Threshold / EWMA / MAD rules with cooldown, dedupe, and multi-channel fan-out."
        onRefresh={() => void load()}
        refreshing={loading}
      />
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Create rule</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Input placeholder="Rule name" value={ruleName} onChange={(e) => setRuleName(e.target.value)} />
            <Input placeholder="Metric key" value={metricKey} onChange={(e) => setMetricKey(e.target.value)} />
            <Input placeholder="Threshold" value={threshold} onChange={(e) => setThreshold(e.target.value)} />
            <Button
              disabled={!ruleName.trim()}
              onClick={() =>
                void createMonitoringAlertRule({
                  name: ruleName.trim(),
                  metric_key: metricKey,
                  threshold: Number(threshold) || 0,
                  comparator: "gt",
                  channels: ["in_app", "email"],
                  detection_mode: "threshold",
                }).then(() => {
                  setRuleName("");
                  return load();
                })
              }
            >
              Save rule
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Rules ({rules.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {rules.length === 0 ? (
              <EmptyState title="No alert rules" />
            ) : (
              rules.map((r) => (
                <div key={String(r.id)} className="rounded-md border px-3 py-2 text-sm">
                  <div className="font-medium">{String(r.name)}</div>
                  <div className="text-xs text-muted-foreground">
                    {String(r.metric_key)} {String(r.comparator)} {String(r.threshold)} · {String(r.detection_mode)} · cooldown {String(r.cooldown_seconds)}s
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Alert history</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {alerts.length === 0 && !loading ? (
            <EmptyState title="No alerts fired" />
          ) : (
            alerts.map((a) => (
              <div key={String(a.id)} className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
                <div>
                  <div className="font-medium">{String(a.title)}</div>
                  <div className="text-xs text-muted-foreground">{String(a.message)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{String(a.severity)}</Badge>
                  <Badge variant="outline">{String(a.status)}</Badge>
                  {String(a.status) === "firing" ? (
                    <Button size="sm" variant="outline" onClick={() => void ackMonitoringAlert(Number(a.id)).then(() => load())}>
                      Ack
                    </Button>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
