import { useCallback, useEffect, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MonitorPageHeader } from "@/modules/monitoring/components/monitor-page-header";
import { TimeRangeSelect } from "@/modules/monitoring/components/monitor-filters";
import { EmptyState, ErrorState, StatCard, formatPct } from "@/modules/monitoring/components/stat-card";
import { getMonitoringAiTutor } from "@/modules/monitoring/api/monitoring";

type KeyRow = {
  role?: string;
  provider?: string;
  model?: string;
  api_key?: string;
  api_key_index?: number | null;
  key_tail?: string;
  status?: string;
  cooldown_seconds?: number;
};

type FeatureRouting = {
  feature?: string;
  primary_provider?: string;
  primary_model?: string;
  secondary_provider?: string | null;
  secondary_model?: string | null;
  keys?: KeyRow[];
  next?: KeyRow | null;
  last_used?: (KeyRow & { at?: string; status_code?: number; user_id?: number | null }) | null;
};

type ActiveUserRow = {
  user_id?: number;
  username?: string | null;
  full_name?: string | null;
  email?: string | null;
  surface?: string;
  surface_label?: string;
  feature?: string;
  agent_mode?: string | null;
  role?: string;
  provider?: string;
  model?: string | null;
  api_key?: string;
  api_key_index?: number | null;
  key_tail?: string;
  at?: string;
};

type SurfaceActive = {
  surface?: string;
  label?: string;
  active_users?: number;
  users?: ActiveUserRow[];
};

export default function MonitoringAiTutorPage() {
  const [hours, setHours] = useState("24");
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      setData(await getMonitoringAiTutor({ hours: Number(hours) }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load AI tutor metrics");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [hours]);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 15_000);
    return () => window.clearInterval(id);
  }, [load]);

  const voice = (data?.voice as Record<string, unknown>) || {};
  const unavailable = (data?.unavailable as string[]) || [];
  const routing = (data?.routing as Record<string, unknown>) || {};
  const features = (routing.features as FeatureRouting[]) || [];
  const active = (data?.active_users as Record<string, unknown>) || {};
  const surfaces = (active.surfaces as SurfaceActive[]) || [];
  const recentUsers = (active.recent_users as ActiveUserRow[]) || [];

  return (
    <PageShell size="wide">
      <MonitorPageHeader
        title="AI Tutor Monitoring"
        description="Who is online, which LLM route each user hits (primary/secondary · Key 1/2/3), and voice/vector health."
        onRefresh={() => void load()}
        refreshing={refreshing}
      >
        <TimeRangeSelect value={hours} onChange={setHours} />
      </MonitorPageHeader>
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
      {unavailable.length ? (
        <p className="mb-4 text-sm text-amber-600">Partial data — unavailable: {unavailable.join(", ")}</p>
      ) : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active users (10m)" value={String(active.active_total ?? "—")} loading={loading} />
        <StatCard label="AI request volume" value={String(data?.request_volume ?? "—")} loading={loading} />
        <StatCard label="Success rate" value={formatPct(data?.success_rate as number | null)} loading={loading} />
        <StatCard label="Prompt tokens" value={String(data?.token_prompt ?? "—")} loading={loading} />
        <StatCard label="Completion tokens" value={String(data?.token_completion ?? "—")} loading={loading} />
        <StatCard label="Model errors" value={String(data?.model_errors ?? "—")} loading={loading} />
        <StatCard label="Vector DB" value={String(data?.vector_status || "—")} loading={loading} />
        <StatCard
          label="Voice status"
          value={String(voice.status || "—")}
          loading={loading}
          hint={voice.liveSessions != null ? `${String(voice.liveSessions)} live sessions` : undefined}
        />
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Active users by product</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {surfaces.length === 0 && !loading ? (
              <EmptyState
                title="No active users yet"
                description="Counts appear after a student uses Ask Learn Mastro, Ask Questions, Practice, Explain, Text chat, or Voice."
              />
            ) : (
              surfaces.map((s) => (
                <div key={String(s.surface)} className="rounded-lg border px-3 py-3">
                  <p className="text-sm text-muted-foreground">{String(s.label)}</p>
                  <p className="text-2xl font-semibold tabular-nums">{String(s.active_users ?? 0)}</p>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Who is using which LLM</CardTitle>
        </CardHeader>
        <CardContent>
          {recentUsers.length === 0 && !loading ? (
            <EmptyState
              title="No recent LLM activity"
              description="After a student sends a message, their username, primary/secondary role, and Key 1/2/3 show here for 10 minutes."
            />
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>API key</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>When</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentUsers.map((u) => (
                    <TableRow key={`${u.user_id}-${u.at}-${u.surface}`}>
                      <TableCell>
                        <div className="font-medium">{String(u.username || u.email || `user #${u.user_id}`)}</div>
                        {u.full_name ? (
                          <div className="text-xs text-muted-foreground">{String(u.full_name)}</div>
                        ) : null}
                      </TableCell>
                      <TableCell>{String(u.surface_label || u.surface || "—")}</TableCell>
                      <TableCell className="capitalize">{String(u.role || "—")}</TableCell>
                      <TableCell>{String(u.provider || "—")}</TableCell>
                      <TableCell>
                        {String(u.api_key || "—")}
                        {u.key_tail ? (
                          <span className="ml-1 text-xs text-muted-foreground">({String(u.key_tail)})</span>
                        ) : null}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">{String(u.model || "—")}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {u.at ? new Date(String(u.at)).toLocaleString() : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="flex flex-wrap items-center gap-2 text-base">
            LLM routing
            {routing.primary_provider ? (
              <Badge variant="outline">Primary: {String(routing.primary_provider)}</Badge>
            ) : null}
            {routing.secondary_provider ? (
              <Badge variant="secondary">Secondary: {String(routing.secondary_provider)}</Badge>
            ) : (
              <Badge variant="outline">No secondary</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {features.length === 0 && !loading ? (
            <EmptyState
              title="No routing data"
              description="Restart the API after this update, then send a chat/voice request."
            />
          ) : (
            features.map((f) => (
              <div key={String(f.feature)} className="rounded-lg border p-3">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <p className="font-medium capitalize">{String(f.feature)}</p>
                  <Badge variant="outline">
                    {String(f.primary_provider)} · {String(f.primary_model)}
                  </Badge>
                  {f.secondary_provider ? (
                    <Badge variant="secondary">
                      fallback {String(f.secondary_provider)} · {String(f.secondary_model)}
                    </Badge>
                  ) : null}
                </div>

                <div className="mb-3 grid gap-2 text-sm sm:grid-cols-2">
                  <div className="rounded-md bg-muted/40 px-3 py-2">
                    <p className="text-xs text-muted-foreground">Next to use</p>
                    <p className="font-medium">
                      {f.next
                        ? `${String(f.next.role)} · ${String(f.next.provider)} · ${String(f.next.api_key)} · ${String(f.next.model)}`
                        : "—"}
                    </p>
                  </div>
                  <div className="rounded-md bg-muted/40 px-3 py-2">
                    <p className="text-xs text-muted-foreground">Last used</p>
                    <p className="font-medium">
                      {f.last_used
                        ? `${String(f.last_used.role)} · ${String(f.last_used.provider)} · ${String(f.last_used.api_key)} · ${String(f.last_used.model)}`
                        : "No request yet"}
                    </p>
                    {f.last_used?.at ? (
                      <p className="text-xs text-muted-foreground">{new Date(String(f.last_used.at)).toLocaleString()}</p>
                    ) : null}
                  </div>
                </div>

                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Role</TableHead>
                        <TableHead>Provider</TableHead>
                        <TableHead>API key</TableHead>
                        <TableHead>Model</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(f.keys || []).map((k, i) => (
                        <TableRow key={`${f.feature}-${k.role}-${k.api_key}-${i}`}>
                          <TableCell className="capitalize">{String(k.role)}</TableCell>
                          <TableCell>{String(k.provider)}</TableCell>
                          <TableCell>
                            {String(k.api_key)}
                            {k.key_tail ? (
                              <span className="ml-1 text-xs text-muted-foreground">({String(k.key_tail)})</span>
                            ) : null}
                          </TableCell>
                          <TableCell className="max-w-[220px] truncate">{String(k.model)}</TableCell>
                          <TableCell>
                            <Badge variant={k.status === "ready" ? "outline" : "secondary"}>
                              {k.status === "cooling"
                                ? `cooling ${String(k.cooldown_seconds ?? 0)}s`
                                : String(k.status || "—")}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Privacy note</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Full student conversations and audio are not stored in monitoring. Active users refresh every 15s and expire
          after 10 minutes of idle. API keys are shown only as Key 1 / Key 2 / Key 3 with a short tail — never the full
          secret.
        </CardContent>
      </Card>
    </PageShell>
  );
}
