import { useCallback, useEffect, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MonitorPageHeader } from "@/modules/monitoring/components/monitor-page-header";
import { SearchInput, ServiceSelect } from "@/modules/monitoring/components/monitor-filters";
import { EmptyState, ErrorState } from "@/modules/monitoring/components/stat-card";
import {
  commentMonitoringIssue,
  getMonitoringIssue,
  getMonitoringIssues,
  patchMonitoringIssue,
  type IssueOut,
} from "@/modules/monitoring/api/monitoring";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function MonitoringIssuesPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("open");
  const [service, setService] = useState("all");
  const [items, setItems] = useState<IssueOut[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<{
    issue: IssueOut;
    events: Record<string, unknown>[];
    comments: { id: number; body: string; author_user_id: number; created_at: string }[];
  } | null>(null);
  const [comment, setComment] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMonitoringIssues({
        q: q || undefined,
        status: status === "all" ? undefined : status,
        service: service === "all" ? undefined : service,
        page,
        page_size: 25,
      });
      setItems(res.items);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load issues");
    } finally {
      setLoading(false);
    }
  }, [q, status, service, page]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    void getMonitoringIssue(selectedId)
      .then(setDetail)
      .catch(() => setDetail(null));
  }, [selectedId]);

  return (
    <PageShell size="wide">
      <MonitorPageHeader
        title="Issues & Exceptions"
        description="Fingerprinted and grouped errors from ingest + Sentry webhooks."
        onRefresh={() => void load()}
        refreshing={loading}
      >
        <SearchInput value={q} onChange={setQ} placeholder="Search title…" />
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="reopened">Reopened</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
        <ServiceSelect value={service} onChange={(v) => { setService(v); setPage(1); }} />
      </MonitorPageHeader>

      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}

      {!loading && items.length === 0 ? (
        <EmptyState title="No issues" description="Errors will appear here once ingest or Sentry webhooks are connected." />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Service</TableHead>
                <TableHead className="text-right">Count</TableHead>
                <TableHead>Last seen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((issue) => (
                <TableRow
                  key={issue.id}
                  className="cursor-pointer"
                  onClick={() => setSelectedId(issue.id)}
                >
                  <TableCell className="max-w-[320px] truncate font-medium">{issue.title}</TableCell>
                  <TableCell><Badge variant="outline">{issue.severity}</Badge></TableCell>
                  <TableCell>{issue.status}</TableCell>
                  <TableCell>{issue.service_key || "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{issue.occurrence_count}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{new Date(issue.last_seen_at).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
        <span>{total} total</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <Button variant="outline" size="sm" disabled={page * 25 >= total} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      </div>

      <Sheet open={selectedId != null} onOpenChange={(o) => !o && setSelectedId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{detail?.issue.title || "Issue"}</SheetTitle>
          </SheetHeader>
          {detail ? (
            <div className="mt-4 space-y-4 text-sm">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{detail.issue.severity}</Badge>
                <Badge variant="outline">{detail.issue.status}</Badge>
                <Badge variant="outline">{detail.issue.fingerprint.slice(0, 10)}…</Badge>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    void patchMonitoringIssue(detail.issue.id, { status: "resolved" }).then(() => {
                      void load();
                      setSelectedId(detail.issue.id);
                    })
                  }
                >
                  Resolve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    void patchMonitoringIssue(detail.issue.id, { status: "reopened" }).then(() => void load())
                  }
                >
                  Reopen
                </Button>
              </div>
              <div>
                <h3 className="mb-2 font-medium">Recent events</h3>
                {detail.events.length === 0 ? (
                  <p className="text-muted-foreground">No events</p>
                ) : (
                  <div className="space-y-2">
                    {detail.events.slice(0, 10).map((ev) => (
                      <pre key={String(ev.id)} className="overflow-x-auto rounded-md bg-muted p-2 text-xs">
                        {JSON.stringify(ev, null, 2)}
                      </pre>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <h3 className="mb-2 font-medium">Comments</h3>
                <div className="space-y-2">
                  {detail.comments.map((c) => (
                    <div key={c.id} className="rounded-md border p-2">
                      <p>{c.body}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
                <Textarea className="mt-2" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add comment…" />
                <Button
                  className="mt-2"
                  size="sm"
                  disabled={!comment.trim()}
                  onClick={() =>
                    void commentMonitoringIssue(detail.issue.id, comment).then(() => {
                      setComment("");
                      return getMonitoringIssue(detail.issue.id).then(setDetail);
                    })
                  }
                >
                  Comment
                </Button>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
          )}
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
