import type { TextbookUploadApi } from "@/api/types";

export type UploadStage = "queued" | "chunking" | "embedding" | "images" | "completed" | "failed" | "stuck";

export const STAGE_LABEL: Record<UploadStage, string> = {
  queued: "Queued",
  chunking: "Reading & chunking",
  embedding: "Embedding",
  images: "Extracting figures",
  completed: "Completed",
  failed: "Failed",
  stuck: "Stuck",
};

/** Stages where a worker is (or should be) doing something — keep polling. */
export const ACTIVE_STAGES: UploadStage[] = ["queued", "chunking", "embedding", "images"];

// ponytail: fixed cutoff above the worker's 30-min hard task limit (task_time_limit=1800); anything
// still running past this has lost its worker. Upgrade: worker heartbeat column if jobs get longer.
export const STUCK_AFTER_MS = 40 * 60_000;
// ponytail: ETA fallback (prod: 21-page chapter ≈ 12 min) until enough finished jobs exist to take a median.
const DEFAULT_DURATION_MS = 12 * 60_000;

type Row = Pick<
  TextbookUploadApi,
  "upload_date" | "ocr_status" | "chunk_status" | "embedding_status" | "processing_started_at" | "processing_finished_at"
>;

const t = (iso?: string | null) => (iso ? Date.parse(iso) : NaN);

export function uploadStage(u: Row, now = Date.now()): UploadStage {
  if (u.chunk_status === "FAILED" || u.embedding_status === "FAILED") return "failed";
  const started = t(u.processing_started_at);
  if (u.embedding_status === "EMBEDDED") {
    // Rows processed before timing columns existed have no started_at — treat as done.
    if (Number.isNaN(started) || u.processing_finished_at) return "completed";
    return now - started > STUCK_AFTER_MS ? "stuck" : "images";
  }
  if (u.chunk_status === "PROCESSING" || u.embedding_status === "PROCESSING") {
    const since = Number.isNaN(started) ? t(u.upload_date) : started;
    if (now - since > STUCK_AFTER_MS) return "stuck";
    return u.chunk_status === "EMBEDDED" ? "embedding" : "chunking";
  }
  return "queued";
}

export function durationMs(u: Row): number | null {
  const d = t(u.processing_finished_at) - t(u.processing_started_at);
  return Number.isNaN(d) ? null : d;
}

/** Median of recent successful job durations (worker runs one job at a time). */
export function typicalDurationMs(rows: Row[]): number {
  const ds = rows
    .filter((u) => u.embedding_status === "EMBEDDED")
    .map(durationMs)
    .filter((d): d is number => d !== null && d > 0)
    .sort((a, b) => a - b);
  return ds.length ? ds[Math.floor(ds.length / 2)] : DEFAULT_DURATION_MS;
}

/**
 * Expected finish (epoch ms) for an unfinished row, or null when it's done/failed/stuck.
 * Queued rows wait behind running ones and earlier-queued ones (concurrency 1).
 */
export function expectedFinishMs(u: Row, all: Row[], typical = typicalDurationMs(all), now = Date.now()): number | null {
  const stage = uploadStage(u, now);
  if (stage === "chunking" || stage === "embedding" || stage === "images") {
    return Math.max(now, t(u.processing_started_at ?? u.upload_date) + typical);
  }
  if (stage !== "queued") return null;
  let wait = 0;
  for (const o of all) {
    const s = uploadStage(o, now);
    if (s === "chunking" || s === "embedding" || s === "images") {
      wait += Math.max(0, t(o.processing_started_at ?? o.upload_date) + typical - now);
    } else if (s === "queued" && t(o.upload_date) < t(u.upload_date)) {
      wait += typical;
    }
  }
  return now + wait + typical;
}

export function formatDuration(ms: number): string {
  const m = Math.round(ms / 60_000);
  return m < 1 ? "<1 min" : m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

export function formatClock(ms: number): string {
  return new Date(ms).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}
