import { apiFetch, authFetch, API_BASE } from "@/api/index";
import { toWsBase } from "@/lib/api-base";

export type LessonArtifactType =
  | "lesson_plan"
  | "teaching_notes"
  | "examples"
  | "worksheet"
  | "quiz"
  | "homework"
  | "ppt_outline";

export type ExportFormat = "pdf" | "docx" | "pptx";

export interface GenerateLessonPlanPayload {
  grade: string;
  subject: string;
  chapter_id?: string | null;
  chapter_name: string;
  duration_minutes: number;
  learning_objectives: string;
  topics?: string[];
  sections?: string[];
  ppt_template?: string;
  ppt_slide_count?: number;
  board?: string | null;
  title?: string | null;
  requested_artifacts: LessonArtifactType[];
  lesson_plan_id?: string | null;
  idempotency_key?: string | null;
}

export interface ChapterTopicApi {
  key: string;
  title: string;
}

export interface ChapterTopicsResponse {
  chapter_id: string;
  topics: ChapterTopicApi[];
}

export interface PptThemeApi {
  id: string;
  label: string;
  description: string;
  primary?: string;
  accent?: string;
  bg?: string;
}

export interface PptThemesResponse {
  themes: PptThemeApi[];
  default_id: string;
}

export interface GenerateLessonPlanResponse {
  job_id: string;
  lesson_plan_id: string;
  status: string;
  websocket_url: string;
}

export interface LessonPlannerJob {
  id: string;
  lesson_plan_id: string | null;
  status: string;
  progress: number;
  message: string | null;
  requested_artifacts: string[];
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface LessonArtifactApi {
  id: string;
  artifact_type: LessonArtifactType;
  content: Record<string, unknown> | null;
  status: string;
  version_number: number;
  updated_at: string;
}

export interface LessonPlanApi {
  id: string;
  title: string;
  grade: string;
  subject: string;
  board: string | null;
  chapter_id: string | null;
  chapter_name: string;
  duration_minutes: number;
  learning_objectives: string;
  status: string;
  plan_metadata: Record<string, unknown> | null;
  artifacts: LessonArtifactApi[];
  created_at: string;
  updated_at: string;
}

export interface LessonPlanSummaryApi {
  id: string;
  title: string;
  grade: string;
  subject: string;
  chapter_name: string;
  status: string;
  updated_at: string;
}

export interface ExportLessonPlanResponse {
  export_id: string;
  status: string;
  file_path: string | null;
  download_url: string | null;
}

export async function generateLessonPlan(payload: GenerateLessonPlanPayload) {
  return apiFetch<GenerateLessonPlanResponse>("/api/lesson-planner/generate", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchChapterTopics(params: {
  chapterId: string;
  subject: string;
  board?: string;
  classLevel?: string;
  chapterName?: string;
}): Promise<ChapterTopicsResponse> {
  const sp = new URLSearchParams();
  sp.set("chapter_id", params.chapterId);
  if (params.subject) sp.set("subject", params.subject);
  if (params.board) sp.set("board", params.board);
  if (params.classLevel) sp.set("class_level", params.classLevel);
  if (params.chapterName) sp.set("chapter_name", params.chapterName);
  return apiFetch<ChapterTopicsResponse>(`/api/lesson-planner/chapter-topics?${sp}`);
}

export async function fetchPptThemes() {
  return apiFetch<PptThemesResponse>("/api/lesson-planner/ppt-themes");
}

export async function resumeLessonPlanJob(jobId: string) {
  return apiFetch<GenerateLessonPlanResponse>("/api/lesson-planner/resume", {
    method: "POST",
    body: JSON.stringify({ job_id: jobId }),
  });
}

export async function cancelLessonPlanJob(jobId: string) {
  return apiFetch<{ message: string }>("/api/lesson-planner/cancel", {
    method: "POST",
    body: JSON.stringify({ job_id: jobId }),
  });
}

export async function getLessonPlanJob(jobId: string) {
  return apiFetch<LessonPlannerJob>(`/api/lesson-planner/jobs/${jobId}`);
}

export async function listLessonPlans(limit = 50, offset = 0) {
  return apiFetch<LessonPlanSummaryApi[]>(`/api/lesson-planner?limit=${limit}&offset=${offset}`);
}

export async function getLessonPlan(planId: string) {
  return apiFetch<LessonPlanApi>(`/api/lesson-planner/${planId}`);
}

export async function saveLessonPlan(payload: {
  lesson_plan_id: string;
  title?: string;
  artifacts: Record<string, Record<string, unknown>>;
  change_summary?: string;
}) {
  return apiFetch<{ message: string }>("/api/lesson-planner/save", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function exportLessonPlan(payload: {
  lesson_plan_id: string;
  export_format: ExportFormat;
  artifact_types?: LessonArtifactType[];
}) {
  return apiFetch<ExportLessonPlanResponse>("/api/lesson-planner/export", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getLessonPlanExport(exportId: string) {
  return apiFetch<ExportLessonPlanResponse>(`/api/lesson-planner/exports/${exportId}`);
}

export async function downloadLessonPlanExport(exportId: string, filename: string) {
  const res = await authFetch(`/api/lesson-planner/exports/${exportId}/download`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Download failed");
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function buildLessonPlannerWsUrl(websocketPath: string, accessToken: string): string {
  const base = API_BASE || (typeof window !== "undefined" ? window.location.origin : "");
  const wsBase = toWsBase(base);
  const path = websocketPath.startsWith("/") ? websocketPath : `/${websocketPath}`;
  const sep = path.includes("?") ? "&" : "?";
  return `${wsBase}${path}${sep}access_token=${encodeURIComponent(accessToken)}`;
}
