import { useCallback, useEffect, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MonitorPageHeader } from "@/modules/monitoring/components/monitor-page-header";
import { ErrorState } from "@/modules/monitoring/components/stat-card";
import { getMonitoringSettings, patchMonitoringSettings } from "@/modules/monitoring/api/monitoring";

export default function MonitoringSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [retentionLogs, setRetentionLogs] = useState("14");
  const [retentionMetrics, setRetentionMetrics] = useState("90");
  const [retentionEvents, setRetentionEvents] = useState("90");
  const [autoRefresh, setAutoRefresh] = useState("30");
  const [telegramChatId, setTelegramChatId] = useState("");
  const [slackWebhook, setSlackWebhook] = useState("");
  const [alertEmail, setAlertEmail] = useState("");
  const [slackConfigured, setSlackConfigured] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const s = await getMonitoringSettings();
      setEnabled(Boolean(s.enabled));
      setRetentionLogs(String(s.retention_days_logs ?? 14));
      setRetentionMetrics(String(s.retention_days_metrics ?? 90));
      setRetentionEvents(String(s.retention_days_events ?? 90));
      setAutoRefresh(String(s.auto_refresh_seconds ?? 30));
      setTelegramChatId(String(s.telegram_chat_id || ""));
      setAlertEmail(String(s.alert_email_to || ""));
      setSlackConfigured(Boolean(s.slack_webhook_configured));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        enabled,
        retention_days_logs: Number(retentionLogs) || 14,
        retention_days_metrics: Number(retentionMetrics) || 90,
        retention_days_events: Number(retentionEvents) || 90,
        auto_refresh_seconds: Number(autoRefresh) || 30,
        telegram_chat_id: telegramChatId || null,
        alert_email_to: alertEmail || null,
      };
      if (slackWebhook.trim()) body.slack_webhook_url = slackWebhook.trim();
      const s = (await patchMonitoringSettings(body)) as Record<string, unknown>;
      setSlackConfigured(Boolean(s.slack_webhook_configured));
      setSlackWebhook("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell size="wide">
      <MonitorPageHeader
        title="Monitoring Settings"
        description="Retention, refresh cadence, and alert channel configuration."
        onRefresh={() => void load()}
        refreshing={loading}
      />
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">General</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="mon-enabled">Monitoring module enabled</Label>
              <Switch id="mon-enabled" checked={enabled} onCheckedChange={setEnabled} />
            </div>
            <div className="space-y-1.5">
              <Label>Auto-refresh seconds</Label>
              <Input value={autoRefresh} onChange={(e) => setAutoRefresh(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Log metadata retention (days)</Label>
              <Input value={retentionLogs} onChange={(e) => setRetentionLogs(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Metric retention (days)</Label>
              <Input value={retentionMetrics} onChange={(e) => setRetentionMetrics(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Event retention (days)</Label>
              <Input value={retentionEvents} onChange={(e) => setRetentionEvents(e.target.value)} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Alert channels</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Alert email</Label>
              <Input value={alertEmail} onChange={(e) => setAlertEmail(e.target.value)} placeholder="ops@learnmestro.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Telegram chat ID</Label>
              <Input value={telegramChatId} onChange={(e) => setTelegramChatId(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Slack webhook URL {slackConfigured ? "(configured)" : ""}</Label>
              <Input
                type="password"
                value={slackWebhook}
                onChange={(e) => setSlackWebhook(e.target.value)}
                placeholder={slackConfigured ? "Enter new webhook to rotate" : "https://hooks.slack.com/..."}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Secrets like Coolify tokens, Sentry DSN, and Loki URL are configured via Coolify env vars — never in the browser.
            </p>
          </CardContent>
        </Card>
      </div>

      <Button className="mt-4" onClick={() => void save()} disabled={saving || loading}>
        {saving ? "Saving…" : "Save settings"}
      </Button>
    </PageShell>
  );
}
