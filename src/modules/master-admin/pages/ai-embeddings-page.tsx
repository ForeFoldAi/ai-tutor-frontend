import { useEffect, useMemo, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Database, RefreshCcw, RotateCcw, Trash2, Loader2, FileText, AlertTriangle } from "lucide-react";
import {
  deleteTextbookUpload,
  getEmbeddingStats,
  getTextbookUploads,
  getWorkerStatus,
  processTextbookUpload,
  retryAllFailedUploads,
} from "@/api/masterAdmin";
import type { EmbeddingStatsApi, TextbookUploadApi, WorkerStatusResponseApi } from "@/api/types";
import { WorkerMonitorPanel } from "../components/worker-monitor-panel";
import { UploadStageBadge, UploadTiming } from "../components/upload-progress";
import { ACTIVE_STAGES, formatClock, typicalDurationMs, uploadStage } from "../utils/upload-progress";

const classLabel = (cls: string) => cls.replace("CLASS_", "Class ");

export default function MasterAdminAIEmbeddingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<TextbookUploadApi[]>([]);
  const [stats, setStats] = useState<EmbeddingStatsApi | null>(null);
  const [requeuingIds, setRequeuingIds] = useState<Set<string>>(new Set());
  const [workerStatus, setWorkerStatus] = useState<WorkerStatusResponseApi | null>(null);
  const [isRetryingAll, setIsRetryingAll] = useState(false);

  const refresh = async () => {
    const [uploads, embeddingStats, wStatus] = await Promise.all([
      getTextbookUploads(),
      getEmbeddingStats(),
      getWorkerStatus().catch(() => null),
    ]);
    setRows(uploads);
    setStats(embeddingStats);
    if (wStatus) setWorkerStatus(wStatus);
  };

  const handleRetryAllFailed = async () => {
    setIsRetryingAll(true);
    try {
      const res = await retryAllFailedUploads();
      toast({ title: "Retrying Failed Ingestion", description: res.message });
      await refresh();
    } catch (err: any) {
      toast({
        title: "Retry Failed",
        description: err.message || "Could not re-queue failed uploads",
        variant: "destructive",
      });
    } finally {
      setIsRetryingAll(false);
    }
  };

  useEffect(() => {
    refresh()
      .catch(() => toast({ title: "Failed to load embedding data", variant: "destructive" }))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const staged = useMemo(() => rows.map((r) => ({ r, stage: uploadStage(r) })), [rows]);
  const typical = useMemo(() => typicalDurationMs(rows), [rows]);
  const stuckIds = staged.filter((s) => s.stage === "stuck").map((s) => String(s.r.id));

  useEffect(() => {
    const hasPending =
      staged.some((s) => ACTIVE_STAGES.includes(s.stage)) ||
      (workerStatus?.active_jobs?.length ?? 0) > 0 ||
      (workerStatus?.processing_count ?? 0) > 0;
    const interval = setInterval(refresh, hasPending ? 3500 : 12000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staged, workerStatus]);

  const metrics = useMemo(() => {
    if (stats) {
      return {
        total: stats.total_documents,
        embedded: stats.embedded_count,
        failed: stats.failed_count,
        pending: stats.pending_count,
        vectorCount: stats.total_chunks,
      };
    }
    const total = rows.length;
    const embedded = rows.filter((r) => r.embedding_status === "EMBEDDED").length;
    const failed = rows.filter((r) => r.embedding_status === "FAILED").length;
    const pending = total - embedded - failed;
    const vectorCount = rows.reduce((sum, r) => sum + (r.chunk_count || 0), 0);
    return { total, embedded, failed, pending, vectorCount };
  }, [rows, stats]);

  const requeue = async (ids: string[]) => {
    setRequeuingIds((prev) => new Set([...prev, ...ids]));
    try {
      const results = await Promise.allSettled(ids.map((id) => processTextbookUpload(id)));
      const failed = results.filter((r) => r.status === "rejected").length;
      toast(
        failed
          ? { title: `Could not requeue ${failed} of ${ids.length}`, variant: "destructive" }
          : { title: ids.length > 1 ? `Requeued ${ids.length} records` : "Requeued", description: "Waiting for the worker." },
      );
      await refresh();
    } finally {
      setRequeuingIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
    }
  };

  if (loading) {
    return (
      <PageShell>
        <Skeleton className="h-7 w-[240px]" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">AI Embeddings</h1>
          <p className="text-sm text-muted-foreground">
            Monitor document embedding pipelines and retry failed records.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {stuckIds.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => requeue(stuckIds)}
              disabled={stuckIds.some((id) => requeuingIds.has(id))}
              className="h-9 gap-1.5 text-xs border-amber-500/40 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
            >
              <AlertTriangle className="h-4 w-4" />
              Requeue stuck ({stuckIds.length})
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => refresh().then(() => toast({ title: "Refreshed" }))}
            className="h-9 gap-1.5 text-xs"
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* METRIC CARDS */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Documents</p>
            <p className="text-2xl font-bold mt-1.5 text-foreground">{metrics.total}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Embedded</p>
            <p className="text-2xl font-bold mt-1.5 text-emerald-600 dark:text-emerald-400">{metrics.embedded}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Failed</p>
            <p className="text-2xl font-bold mt-1.5 text-rose-600 dark:text-rose-400">{metrics.failed}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pending Queue</p>
            <p className="text-2xl font-bold mt-1.5 text-amber-600 dark:text-amber-400">{metrics.pending}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Chunks</p>
            <p className="text-2xl font-bold mt-1.5 text-foreground">{metrics.vectorCount.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* WORKER TELEMETRY & MONITORING PANEL */}
      <WorkerMonitorPanel
        workerStatus={workerStatus}
        loading={loading}
        onRefresh={() => refresh().then(() => toast({ title: "Worker Status Refreshed" }))}
        onRetryAllFailed={handleRetryAllFailed}
        isRetryingAll={isRetryingAll}
      />

      {/* EMBEDDING RECORDS TABLE */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Database className="h-4 w-4 text-primary" />
            Embedding Records
          </CardTitle>
          <CardDescription className="text-xs">
            Queued → Reading &amp; chunking → Embedding → Extracting figures → Completed. One chapter is processed at a
            time; expected times use the median of recent runs. Records with no progress for 40+ minutes are marked
            Stuck and can be requeued.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="min-w-[1100px]">
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="min-w-[200px]">File Name</TableHead>
                  <TableHead className="w-20">Board</TableHead>
                  <TableHead className="w-24">Class</TableHead>
                  <TableHead className="w-28">Subject</TableHead>
                  <TableHead className="w-28">Content Type</TableHead>
                  <TableHead className="w-20 text-center">Chunks</TableHead>
                  <TableHead className="w-40">Status</TableHead>
                  <TableHead className="w-36">Uploaded / Started</TableHead>
                  <TableHead className="w-40">Expected / Finished</TableHead>
                  <TableHead className="w-24 text-right pr-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10}>
                      <div className="py-14 text-center flex flex-col items-center justify-center gap-3">
                        <FileText className="h-8 w-8 text-muted-foreground/50" />
                        <div>
                          <p className="text-sm font-semibold text-foreground">No embedding records found</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Upload textbooks to start automatic embedding.</p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  staged.map(({ r, stage }) => {
                    const id = String(r.id);
                    const running = ACTIVE_STAGES.includes(stage);
                    const requeuing = requeuingIds.has(id);
                    return (
                      <TableRow key={r.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-medium max-w-[200px]" title={r.file_name}>
                          <span className="truncate block">{r.file_name}</span>
                          {r.content_label && r.content_label !== r.file_name && (
                            <span className="truncate block text-xs text-muted-foreground">{r.content_label}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">{r.board}</TableCell>
                        <TableCell className="text-xs">{classLabel(r.class_level)}</TableCell>
                        <TableCell className="text-xs">{r.subject_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] uppercase font-mono px-2 py-0.5">
                            {r.content_type ?? "Chapter"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-mono text-xs">
                          {(r.chunk_count || 0).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <UploadStageBadge stage={stage} />
                        </TableCell>
                        <TableCell className="text-xs leading-tight whitespace-nowrap">
                          <div>{formatClock(Date.parse(r.upload_date))}</div>
                          {r.processing_started_at && (
                            <div className="text-muted-foreground">
                              started {formatClock(Date.parse(r.processing_started_at))}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <UploadTiming upload={r} stage={stage} all={rows} typical={typical} />
                        </TableCell>
                        <TableCell className="text-right pr-3">
                          <div className="flex items-center justify-end gap-1">
                            {r.file_path && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                title={running ? "Already in the pipeline" : "Requeue (re-run the full pipeline)"}
                                disabled={running || requeuing}
                                onClick={() => requeue([id])}
                              >
                                {requeuing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              title="Delete"
                              onClick={async () => {
                                await deleteTextbookUpload(id);
                                await refresh();
                                toast({ title: "Deleted", description: r.file_name });
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </PageShell>
  );
}
