import { useCallback, useEffect, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MonitorPageHeader } from "@/modules/monitoring/components/monitor-page-header";
import { EmptyState, ErrorState } from "@/modules/monitoring/components/stat-card";
import {
  createMonitoringIncident,
  getMonitoringIncident,
  getMonitoringIncidents,
  patchMonitoringIncident,
} from "@/modules/monitoring/api/monitoring";

export default function MonitoringIncidentsPage() {
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [rootCause, setRootCause] = useState("");
  const [postmortem, setPostmortem] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMonitoringIncidents();
      setItems(res.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load incidents");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    void getMonitoringIncident(selectedId).then((d) => {
      setDetail(d as unknown as Record<string, unknown>);
      const inc = d.incident as Record<string, unknown>;
      setRootCause(String(inc.root_cause || ""));
      setPostmortem(String(inc.postmortem || ""));
    });
  }, [selectedId]);

  return (
    <PageShell size="wide">
      <MonitorPageHeader
        title="Incident Management"
        description="Acknowledge, escalate, document root cause, and close with postmortems."
        onRefresh={() => void load()}
        refreshing={loading}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Input
          className="max-w-md"
          placeholder="New incident title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <Button
          disabled={!title.trim()}
          onClick={() =>
            void createMonitoringIncident({ title: title.trim(), severity: "sev2" }).then(() => {
              setTitle("");
              return load();
            })
          }
        >
          Create incident
        </Button>
      </div>

      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
      {!loading && items.length === 0 ? (
        <EmptyState title="No incidents" description="Create one manually or let alert rules open them." />
      ) : (
        <div className="space-y-2">
          {items.map((inc) => (
            <button
              key={String(inc.id)}
              type="button"
              className="flex w-full items-center justify-between rounded-md border px-3 py-3 text-left text-sm hover:bg-muted/40"
              onClick={() => setSelectedId(Number(inc.id))}
            >
              <div>
                <div className="font-medium">{String(inc.title)}</div>
                <div className="text-xs text-muted-foreground">
                  {String(inc.opened_at || "")} · {String(inc.service_key || "platform")}
                </div>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline">{String(inc.severity)}</Badge>
                <Badge variant="outline">{String(inc.status)}</Badge>
              </div>
            </button>
          ))}
        </div>
      )}

      <Sheet open={selectedId != null} onOpenChange={(o) => !o && setSelectedId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{String((detail?.incident as Record<string, unknown> | undefined)?.title || "Incident")}</SheetTitle>
          </SheetHeader>
          {detail ? (
            <div className="mt-4 space-y-4 text-sm">
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => void patchMonitoringIncident(selectedId!, { status: "acknowledged" }).then(() => getMonitoringIncident(selectedId!).then((d) => setDetail(d as unknown as Record<string, unknown>)))}>Acknowledge</Button>
                <Button size="sm" variant="outline" onClick={() => void patchMonitoringIncident(selectedId!, { status: "investigating" }).then(() => load())}>Investigate</Button>
                <Button size="sm" variant="outline" onClick={() => void patchMonitoringIncident(selectedId!, { status: "resolved" }).then(() => load())}>Resolve</Button>
              </div>
              <div>
                <h3 className="mb-1 font-medium">Timeline</h3>
                <div className="space-y-2">
                  {((detail.events as Record<string, unknown>[]) || []).map((ev, i) => (
                    <div key={i} className="rounded-md border px-2 py-1.5 text-xs">
                      <span className="font-medium">{String(ev.kind)}</span> — {String(ev.message)}
                      <div className="text-muted-foreground">{String(ev.created_at)}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="mb-1 font-medium">Root cause</h3>
                <Textarea value={rootCause} onChange={(e) => setRootCause(e.target.value)} />
              </div>
              <div>
                <h3 className="mb-1 font-medium">Postmortem</h3>
                <Textarea value={postmortem} onChange={(e) => setPostmortem(e.target.value)} />
              </div>
              <Button
                size="sm"
                onClick={() =>
                  void patchMonitoringIncident(selectedId!, {
                    root_cause: rootCause,
                    postmortem,
                  }).then(() => load())
                }
              >
                Save documentation
              </Button>
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
          )}
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
