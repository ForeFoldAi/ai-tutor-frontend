import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Cpu,
  Server,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Zap,
  Radio,
  HardDrive,
  Database,
  RefreshCw,
} from "lucide-react";
import type { WorkerStatusResponseApi } from "@/api/types";

interface WorkerMonitorPanelProps {
  workerStatus: WorkerStatusResponseApi | null;
  loading: boolean;
  onRefresh: () => void;
  onRetryAllFailed: () => void;
  isRetryingAll: boolean;
}

export function WorkerMonitorPanel({
  workerStatus,
  loading,
  onRefresh,
  onRetryAllFailed,
  isRetryingAll,
}: WorkerMonitorPanelProps) {
  const isOnline = workerStatus?.status === "HEALTHY";
  const isDegraded = workerStatus?.status === "DEGRADED";
  const workers = workerStatus?.workers || [];
  const primaryWorker = workers[0];
  const queueDepths = workerStatus?.queue_depths;
  const activeJobs = workerStatus?.active_jobs || [];

  return (
    <Card className="border border-border/80 shadow-md bg-gradient-to-b from-card to-background overflow-hidden">
      {/* TOP HEADER: WORKER HEALTH & ACTIONS */}
      <div className="p-4 sm:p-5 border-b border-border/60 bg-muted/20 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <Server className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-foreground tracking-tight">
                Celery Ingestion Worker
              </h2>
              {/* STATUS BADGE WITH ANIMATED PULSE */}
              {isOnline ? (
                <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 gap-1.5 px-2.5 py-0.5 text-xs font-medium">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  Worker Online ({workers.length} active)
                </Badge>
              ) : isDegraded ? (
                <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 gap-1.5 px-2.5 py-0.5 text-xs font-medium">
                  <AlertTriangle className="h-3 w-3" />
                  Standby (Redis Connected)
                </Badge>
              ) : (
                <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 gap-1.5 px-2.5 py-0.5 text-xs font-medium">
                  <Radio className="h-3 w-3" />
                  Worker Offline
                </Badge>
              )}

              <Badge variant="outline" className="text-xs text-muted-foreground font-mono">
                catalog-ingest
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {primaryWorker
                ? `${primaryWorker.name} • Concurrency: ${primaryWorker.concurrency} • Anti-OOM recycling active (every 5 tasks)`
                : "Dedicated background worker for PDF chunking, OCR & PyTorch vector embeddings"}
            </p>
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex items-center gap-2 self-end lg:self-center">
          {workerStatus && workerStatus.failed_count > 0 && (
            <Button
              size="sm"
              variant="destructive"
              className="h-8 text-xs gap-1.5 shadow-sm"
              onClick={onRetryAllFailed}
              disabled={isRetryingAll}
            >
              <RotateCcw className={`h-3.5 w-3.5 ${isRetryingAll ? "animate-spin" : ""}`} />
              Retry {workerStatus.failed_count} Failed
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1.5 border-border/80"
            onClick={onRefresh}
            disabled={loading}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh Status
          </Button>
        </div>
      </div>

      {/* 4 REAL-TIME STATUS CARDS */}
      <CardContent className="p-4 sm:p-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {/* 1. IN PROCESS (ACTIVE) */}
          <div className="rounded-lg border border-border/70 p-3 sm:p-4 bg-card/60 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                In-Process
              </span>
              <Zap className="h-4 w-4 text-amber-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-foreground">
                {workerStatus?.processing_count ?? 0}
              </span>
              {activeJobs.length > 0 && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 animate-pulse">
                  {activeJobs.length} active
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {activeJobs.length > 0
                ? "Crunching OCR & embeddings"
                : "Worker idle, waiting for jobs"}
            </p>
          </div>

          {/* 2. QUEUED IN REDIS */}
          <div className="rounded-lg border border-border/70 p-3 sm:p-4 bg-card/60 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Redis Queue
              </span>
              <Clock className="h-4 w-4 text-blue-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-foreground">
                {queueDepths?.catalog_ingest ?? workerStatus?.queued_count ?? 0}
              </span>
              <span className="text-[10px] text-muted-foreground">tasks waiting</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Broker: {workerStatus?.redis_connected ? "Connected" : "Disconnected"}
            </p>
          </div>

          {/* 3. FINISHED (COMPLETED) */}
          <div className="rounded-lg border border-border/70 p-3 sm:p-4 bg-card/60 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Finished
              </span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {workerStatus?.embedded_count ?? 0}
              </span>
              <span className="text-[10px] text-muted-foreground">
                / {workerStatus?.total_documents ?? 0}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {(workerStatus?.total_chunks ?? 0).toLocaleString()} vectors indexed
            </p>
          </div>

          {/* 4. FAILED */}
          <div className="rounded-lg border border-border/70 p-3 sm:p-4 bg-card/60 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Failed
              </span>
              <AlertTriangle className="h-4 w-4 text-rose-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                {workerStatus?.failed_count ?? 0}
              </span>
              {workerStatus && workerStatus.failed_count > 0 && (
                <span className="text-[10px] text-rose-500 font-medium">needs attention</span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Auto-retry on transient errors (3 attempts)
            </p>
          </div>
        </div>

        {/* ACTIVE RUNNING TASKS TICKER (SHOWN WHEN A JOB IS EXECUTING) */}
        {activeJobs.length > 0 && (
          <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping"></span>
              <span className="font-medium">Currently Ingesting:</span>
              <span className="font-mono bg-background/80 px-2 py-0.5 rounded text-[11px] border">
                {activeJobs[0].task_name} ({activeJobs[0].target_label || activeJobs[0].task_id.slice(0, 8)})
              </span>
            </div>
            <div className="text-[11px] text-muted-foreground flex items-center gap-2">
              <span>Worker: {activeJobs[0].worker}</span>
            </div>
          </div>
        )}

        {/* INFRASTRUCTURE TELEMETRY FOOTER */}
        <div className="mt-4 pt-3 border-t border-border/50 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5 text-primary" />
              Vector DB: <strong className="text-foreground">{workerStatus?.vector_backend?.toUpperCase() || "QDRANT"}</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <HardDrive className="h-3.5 w-3.5 text-primary" />
              Storage: <strong className="text-foreground">{workerStatus?.storage_backend?.toUpperCase() || "S3"}</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <Cpu className="h-3.5 w-3.5 text-primary" />
              Embedding: <strong className="text-foreground">all-MiniLM-L6-v2 (384d)</strong>
            </span>
          </div>

          <div className="text-[11px] text-muted-foreground">
            Auto-refresh active
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
