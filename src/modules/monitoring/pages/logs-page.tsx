import { useCallback, useEffect, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MonitorPageHeader } from "@/modules/monitoring/components/monitor-page-header";
import {
  SearchInput,
  ServiceSelect,
  TimeRangeSelect,
} from "@/modules/monitoring/components/monitor-filters";
import { EmptyState, ErrorState } from "@/modules/monitoring/components/stat-card";
import { getMonitoringLogs, type LogEntry } from "@/modules/monitoring/api/monitoring";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function MonitoringLogsPage() {
  const [hours, setHours] = useState("6");
  const [q, setQ] = useState("");
  const [service, setService] = useState("all");
  const [severity, setSeverity] = useState("all");
  const [requestId, setRequestId] = useState("");
  const [traceId, setTraceId] = useState("");
  const [items, setItems] = useState<LogEntry[]>([]);
  const [source, setSource] = useState("loki");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<LogEntry | null>(null);
  const [live, setLive] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const res = await getMonitoringLogs({
        hours: Number(hours),
        q: q || undefined,
        service: service === "all" ? undefined : service,
        severity: severity === "all" ? undefined : severity,
        request_id: requestId || undefined,
        trace_id: traceId || undefined,
        limit: 150,
      });
      setItems(res.items);
      setSource(res.source);
      setMessage(res.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load logs");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [hours, q, service, severity, requestId, traceId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!live) return;
    const id = window.setInterval(() => void load(), 5_000);
    return () => window.clearInterval(id);
  }, [live, load]);

  return (
    <PageShell size="wide">
      <MonitorPageHeader
        title="Production Logs"
        description="Structured logs via Loki (metadata fallback in Postgres when Loki is offline)."
        onRefresh={() => void load()}
        refreshing={refreshing}
      >
        <TimeRangeSelect value={hours} onChange={setHours} />
        <ServiceSelect value={service} onChange={setService} />
        <Select value={severity} onValueChange={setSeverity}>
          <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All levels</SelectItem>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="error">Error</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
          </SelectContent>
        </Select>
        <Button variant={live ? "default" : "outline"} size="sm" onClick={() => setLive((v) => !v)}>
          {live ? "Live on" : "Live off"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            window.open(`/auth/admin/monitoring/logs/export?hours=${hours}`, "_blank");
          }}
        >
          Export
        </Button>
      </MonitorPageHeader>

      <div className="mb-4 flex flex-wrap gap-2">
        <SearchInput value={q} onChange={setQ} placeholder="Search message…" />
        <Input className="w-[180px]" placeholder="Request ID" value={requestId} onChange={(e) => setRequestId(e.target.value)} />
        <Input className="w-[180px]" placeholder="Trace ID" value={traceId} onChange={(e) => setTraceId(e.target.value)} />
      </div>

      <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="outline">source: {source}</Badge>
        {message ? <span>{message}</span> : null}
      </div>

      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}

      {!loading && items.length === 0 ? (
        <EmptyState title="No logs" description="Configure LOKI_URL or wait for request metrics to populate the index." />
      ) : (
        <div className="space-y-2">
          {items.map((item, idx) => (
            <button
              key={`${item.ts}-${idx}`}
              type="button"
              className="flex w-full flex-col gap-1 rounded-md border px-3 py-2 text-left text-sm hover:bg-muted/40"
              onClick={() => setSelected(item)}
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{item.severity || "info"}</Badge>
                <span className="text-xs text-muted-foreground">{item.ts ? new Date(item.ts).toLocaleString() : "—"}</span>
                <span className="text-xs">{item.service || "—"}</span>
                {item.request_id ? <span className="font-mono text-[11px] text-muted-foreground">{item.request_id}</span> : null}
              </div>
              <p className="truncate">{item.message}</p>
            </button>
          ))}
        </div>
      )}

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Log entry</SheetTitle>
          </SheetHeader>
          {selected ? (
            <pre className="mt-4 overflow-x-auto rounded-md bg-muted p-3 text-xs">
              {JSON.stringify(selected.raw || selected, null, 2)}
            </pre>
          ) : null}
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
