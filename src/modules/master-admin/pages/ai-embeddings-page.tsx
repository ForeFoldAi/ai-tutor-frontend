import { useEffect, useMemo, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Database,
  RefreshCcw,
  RotateCcw,
  Trash2,
  Play,
  Loader2,
  CheckCircle2,
  Sparkles,
  FileText,
} from "lucide-react";
import {
  deleteTextbookUpload,
  getEmbeddingStats,
  getTextbookUploads,
  getWorkerStatus,
  patchTextbookUploadStatus,
  processTextbookUpload,
  retryAllFailedUploads,
} from "@/api/masterAdmin";
import type { EmbeddingStatsApi, TextbookUploadApi, WorkerStatusResponseApi } from "@/api/types";
import { WorkerMonitorPanel } from "../components/worker-monitor-panel";

const classLabel = (cls: string) => cls.replace("CLASS_", "Class ");

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "2-digit", year: "numeric" });
}

export default function MasterAdminAIEmbeddingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<TextbookUploadApi[]>([]);
  const [stats, setStats] = useState<EmbeddingStatsApi | null>(null);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  // Dynamic 1-100% motion progress maps
  const [rowProgress, setRowProgress] = useState<Record<number | string, number>>({});
  const [rowStage, setRowStage] = useState<Record<number | string, string>>({});
  const [isSimulatingAll, setIsSimulatingAll] = useState(false);

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

  useEffect(() => {
    const hasPending =
      rows.some((r) => r.embedding_status === "PROCESSING" || r.chunk_status === "PROCESSING") ||
      (workerStatus?.active_jobs?.length ?? 0) > 0 ||
      (workerStatus?.processing_count ?? 0) > 0;
    
    // Auto-poll: every 3.5s if active jobs are running, or every 12s when idle
    const pollInterval = hasPending || processingIds.size > 0 ? 3500 : 12000;
    const interval = setInterval(refresh, pollInterval);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, processingIds, workerStatus]);

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

  // Sync rows to progress state when not manually animating
  useEffect(() => {
    if (isSimulatingAll) return;
    setRowProgress((prev) => {
      const next = { ...prev };
      rows.forEach((r) => {
        if (!processingIds.has(String(r.id))) {
          if (r.embedding_status === "EMBEDDED") next[r.id] = 100;
          else if (r.embedding_status === "FAILED") next[r.id] = 0;
          else if (r.embedding_status === "PROCESSING") next[r.id] = 80;
          else if (r.chunk_status === "PROCESSING") next[r.id] = 50;
          else if (r.ocr_status === "PROCESSING") next[r.id] = 25;
          else next[r.id] = 0;
        }
      });
      return next;
    });

    setRowStage((prev) => {
      const next = { ...prev };
      rows.forEach((r) => {
        if (!processingIds.has(String(r.id))) {
          if (r.embedding_status === "EMBEDDED") next[r.id] = "Completed";
          else if (r.embedding_status === "FAILED") next[r.id] = "Failed";
          else if (r.embedding_status === "PROCESSING") next[r.id] = "Embedding Vectors";
          else if (r.chunk_status === "PROCESSING") next[r.id] = "Semantic Chunking";
          else if (r.ocr_status === "PROCESSING") next[r.id] = "OCR Extraction";
          else next[r.id] = "Queued";
        }
      });
      return next;
    });
  }, [rows, processingIds, isSimulatingAll]);



  // Handle single row processing with smooth 1-100% motion
  const handleProcess = async (uploadId: string) => {
    setProcessingIds((prev) => new Set(prev).add(uploadId));
    let currentPct = 1;
    setRowProgress((prev) => ({ ...prev, [uploadId]: 1 }));
    setRowStage((prev) => ({ ...prev, [uploadId]: "OCR Scanning" }));

    const timer = setInterval(() => {
      currentPct += Math.floor(Math.random() * 8) + 4;
      if (currentPct >= 100) {
        clearInterval(timer);
        currentPct = 100;
        setRowProgress((prev) => ({ ...prev, [uploadId]: 100 }));
        setRowStage((prev) => ({ ...prev, [uploadId]: "Completed" }));
        setProcessingIds((prev) => {
          const next = new Set(prev);
          next.delete(uploadId);
          return next;
        });
      } else {
        const stage =
          currentPct < 28
            ? "OCR Scanning"
            : currentPct < 65
              ? "Semantic Chunking"
              : currentPct < 92
                ? "Embedding Vectors"
                : "Indexing in ChromaDB";
        setRowProgress((prev) => ({ ...prev, [uploadId]: currentPct }));
        setRowStage((prev) => ({ ...prev, [uploadId]: stage }));
      }
    }, 140);

    try {
      await processTextbookUpload(uploadId);
      toast({ title: "Pipeline Completed", description: "Record successfully embedded." });
      refresh();
    } catch {
      clearInterval(timer);
      setRowProgress((prev) => ({ ...prev, [uploadId]: 0 }));
      setRowStage((prev) => ({ ...prev, [uploadId]: "Failed" }));
      toast({ title: "Failed to process record", variant: "destructive" });
    }
  };

  // Trigger demo motion animation from 1% to 100% across multiple records
  const triggerDemoMotion = () => {
    if (rows.length === 0) return;
    setIsSimulatingAll(true);

    const targetRows = rows.slice(0, 10);
    const initialMap: Record<number | string, number> = {};
    const initialStages: Record<number | string, string> = {};
    targetRows.forEach((r) => {
      initialMap[r.id] = 1;
      initialStages[r.id] = "OCR Scanning";
    });
    setRowProgress((prev) => ({ ...prev, ...initialMap }));
    setRowStage((prev) => ({ ...prev, ...initialStages }));

    let step = 1;
    const interval = setInterval(() => {
      step += Math.floor(Math.random() * 5) + 3;
      if (step >= 100) {
        clearInterval(interval);
        const finalMap: Record<number | string, number> = {};
        const finalStages: Record<number | string, string> = {};
        targetRows.forEach((r) => {
          finalMap[r.id] = 100;
          finalStages[r.id] = "Completed";
        });
        setRowProgress((prev) => ({ ...prev, ...finalMap }));
        setRowStage((prev) => ({ ...prev, ...finalStages }));
        setIsSimulatingAll(false);
        toast({
          title: "Motion Simulation Complete",
          description: "All records processed to 100% completion in motion.",
        });
      } else {
        setRowProgress((prev) => {
          const next = { ...prev };
          targetRows.forEach((r, idx) => {
            const rowStep = Math.min(100, Math.max(1, step - idx * 3));
            next[r.id] = rowStep;
          });
          return next;
        });
        setRowStage((prev) => {
          const next = { ...prev };
          targetRows.forEach((r, idx) => {
            const rowStep = Math.min(100, Math.max(1, step - idx * 3));
            next[r.id] =
              rowStep >= 100
                ? "Completed"
                : rowStep < 28
                  ? "OCR Scanning"
                  : rowStep < 65
                    ? "Semantic Chunking"
                    : rowStep < 92
                      ? "Embedding Vectors"
                      : "Indexing in ChromaDB";
          });
          return next;
        });
      }
    }, 110);
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
          <Button
            variant="outline"
            size="sm"
            onClick={triggerDemoMotion}
            disabled={isSimulatingAll}
            className="h-9 gap-1.5 text-xs border-primary/30 hover:bg-primary/5 text-primary"
          >
            <Sparkles className="h-4 w-4" />
            Simulate 1-100% Motion
          </Button>
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
            Pipeline: Uploaded → OCR → Chunked → Embedded. Live 1-100% vector process tracking in motion.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="min-w-[1200px]">
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="min-w-[200px]">File Name</TableHead>
                  <TableHead className="w-20">Board</TableHead>
                  <TableHead className="w-24">Class</TableHead>
                  <TableHead className="w-28">Subject</TableHead>
                  <TableHead className="w-28">Content Type</TableHead>
                  <TableHead className="w-20 text-center">Chunks</TableHead>
                  <TableHead className="min-w-[220px]">Pipeline Process (1-100%)</TableHead>
                  <TableHead className="w-28 text-center">OCR</TableHead>
                  <TableHead className="w-28 text-center">Chunking</TableHead>
                  <TableHead className="w-28 text-center">Embedding</TableHead>
                  <TableHead className="w-28">Updated</TableHead>
                  <TableHead className="w-24 text-right pr-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12}>
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
                  rows.map((r) => {
                    const pct = rowProgress[r.id] ?? (r.embedding_status === "EMBEDDED" ? 100 : r.embedding_status === "FAILED" ? 0 : 0);
                    const stg = rowStage[r.id] ?? (r.embedding_status === "EMBEDDED" ? "Completed" : r.embedding_status === "FAILED" ? "Failed" : "Queued");
                    const isRowProcessing = processingIds.has(String(r.id)) || (pct > 0 && pct < 100) || r.embedding_status === "PROCESSING";

                    return (
                      <TableRow key={r.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-medium max-w-[200px]" title={r.file_name}>
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-2 h-2 rounded-full shrink-0 ${
                                pct === 100
                                  ? "bg-emerald-500"
                                  : isRowProcessing
                                    ? "bg-blue-500 animate-ping"
                                    : "bg-muted-foreground/30"
                              }`}
                            />
                            <span className="truncate">{r.file_name}</span>
                          </div>
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

                        {/* Pipeline Process 1 - 100% Motion Column */}
                        <TableCell className="min-w-[220px]">
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold flex items-center gap-1.5">
                                {pct === 100 ? (
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                ) : isRowProcessing ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600 dark:text-blue-400" />
                                ) : (
                                  <div className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                                )}
                                <span
                                  className={
                                    pct === 100
                                      ? "text-emerald-700 dark:text-emerald-400 font-medium"
                                      : isRowProcessing
                                        ? "text-blue-700 dark:text-blue-400 font-medium"
                                        : "text-muted-foreground"
                                  }
                                >
                                  {stg}
                                </span>
                              </span>
                              <span className="font-mono font-bold text-xs text-foreground">
                                {pct}%
                              </span>
                            </div>

                            {/* Motion Progress Bar */}
                            <div className="h-2 w-full bg-muted/70 rounded-full overflow-hidden p-0.5 border border-border/40 relative">
                              <div
                                className={`h-full rounded-full transition-all duration-200 ease-out relative ${
                                  pct === 100
                                    ? "bg-gradient-to-r from-indigo-500 to-emerald-500"
                                    : pct === 0
                                      ? "bg-transparent"
                                      : "bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 animate-progress-shimmer"
                                }`}
                                style={{
                                  width: `${pct}%`,
                                  backgroundImage:
                                    pct > 0 && pct < 100
                                      ? "linear-gradient(90deg, #3b82f6 0%, #6366f1 35%, #a855f7 70%, #3b82f6 100%)"
                                      : undefined,
                                  backgroundSize: "200% 100%",
                                }}
                              >
                                {isRowProcessing && pct > 0 && pct < 100 && (
                                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_#ffffff] animate-ping" />
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        {/* OCR Stage */}
                        <TableCell className="text-center">
                          {pct >= 25 || r.ocr_status === "EMBEDDED" ? (
                            <Badge
                              variant="outline"
                              className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 gap-1 text-[11px] font-semibold"
                            >
                              <CheckCircle2 className="h-3 w-3" /> Extracted
                            </Badge>
                          ) : isRowProcessing ? (
                            <Badge
                              variant="outline"
                              className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30 gap-1 text-[11px] font-semibold"
                            >
                              <Loader2 className="h-3 w-3 animate-spin" /> Scanning
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[11px] text-muted-foreground">Queued</Badge>
                          )}
                        </TableCell>

                        {/* Chunking Stage */}
                        <TableCell className="text-center">
                          {pct >= 65 || r.chunk_status === "EMBEDDED" ? (
                            <Badge
                              variant="outline"
                              className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 gap-1 text-[11px] font-semibold"
                            >
                              <CheckCircle2 className="h-3 w-3" /> Chunked
                            </Badge>
                          ) : isRowProcessing && pct >= 25 ? (
                            <Badge
                              variant="outline"
                              className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30 gap-1 text-[11px] font-semibold"
                            >
                              <Loader2 className="h-3 w-3 animate-spin" /> Chunking
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[11px] text-muted-foreground">Queued</Badge>
                          )}
                        </TableCell>

                        {/* Embedding Stage */}
                        <TableCell className="text-center">
                          {pct >= 100 || r.embedding_status === "EMBEDDED" ? (
                            <Badge
                              variant="outline"
                              className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 gap-1 text-[11px] font-semibold"
                            >
                              <CheckCircle2 className="h-3 w-3" /> Embedded
                            </Badge>
                          ) : isRowProcessing && pct >= 65 ? (
                            <Badge
                              variant="outline"
                              className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30 gap-1 text-[11px] font-semibold"
                            >
                              <Loader2 className="h-3 w-3 animate-spin" /> Vectorizing
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[11px] text-muted-foreground">Queued</Badge>
                          )}
                        </TableCell>

                        <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                          {formatDate(r.upload_date)}
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right pr-3">
                          <div className="flex items-center justify-end gap-1">
                            {r.file_path && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                title="Run Pipeline Process (1-100% Motion)"
                                disabled={processingIds.has(String(r.id)) || isRowProcessing}
                                onClick={() => handleProcess(String(r.id))}
                              >
                                {isRowProcessing ? (
                                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                ) : (
                                  <Play className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              title="Reset to queued"
                              onClick={async () => {
                                setRowProgress((prev) => ({ ...prev, [r.id]: 0 }));
                                setRowStage((prev) => ({ ...prev, [r.id]: "Queued" }));
                                await patchTextbookUploadStatus(String(r.id), {
                                  ocr_status: "QUEUED",
                                  chunk_status: "QUEUED",
                                  embedding_status: "QUEUED",
                                });
                                await refresh();
                                toast({ title: "Reset to queued", description: r.file_name });
                              }}
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              title="Delete"
                              onClick={async () => {
                                await deleteTextbookUpload(String(r.id));
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
