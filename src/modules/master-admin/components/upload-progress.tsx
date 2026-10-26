import { AlertTriangle, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { TextbookUploadApi } from "@/api/types";
import {
  STAGE_LABEL,
  durationMs,
  expectedFinishMs,
  formatClock,
  formatDuration,
  type UploadStage,
} from "../utils/upload-progress";

const STAGE_CLASS: Record<UploadStage, string> = {
  queued: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30",
  chunking: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30",
  embedding: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/30",
  images: "bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/30",
  completed: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  failed: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30",
  stuck: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
};

export function UploadStageBadge({ stage }: { stage: UploadStage }) {
  const Icon =
    stage === "completed" ? CheckCircle2 : stage === "failed" || stage === "stuck" ? AlertTriangle : stage === "queued" ? Clock : Loader2;
  return (
    <Badge variant="outline" className={`gap-1 text-xs font-semibold whitespace-nowrap ${STAGE_CLASS[stage]}`}>
      <Icon className={`w-3 h-3 ${Icon === Loader2 ? "animate-spin" : ""}`} />
      {STAGE_LABEL[stage]}
    </Badge>
  );
}

/** "Expected ~2:15 PM" while running/queued, "Finished … (11 min)" when done. */
export function UploadTiming({
  upload,
  stage,
  all,
  typical,
}: {
  upload: TextbookUploadApi;
  stage: UploadStage;
  all: TextbookUploadApi[];
  typical: number;
}) {
  if (stage === "completed" || stage === "failed") {
    const finished = upload.processing_finished_at;
    if (!finished) return <span className="text-xs text-muted-foreground">—</span>;
    const d = durationMs(upload);
    return (
      <div className="text-xs leading-tight">
        <div>{formatClock(Date.parse(finished))}</div>
        {d !== null && <div className="text-muted-foreground">took {formatDuration(d)}</div>}
      </div>
    );
  }
  if (stage === "stuck") {
    const since = upload.processing_started_at ?? upload.upload_date;
    return (
      <span className="text-xs text-amber-700 dark:text-amber-400">
        No progress for {formatDuration(Date.now() - Date.parse(since))}
      </span>
    );
  }
  const eta = expectedFinishMs(upload, all, typical);
  if (eta === null) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <div className="text-xs leading-tight">
      <div>Expected ~{formatClock(eta)}</div>
      <div className="text-muted-foreground">in {formatDuration(eta - Date.now())}</div>
    </div>
  );
}
