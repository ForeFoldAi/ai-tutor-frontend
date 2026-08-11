import { apiFetch } from "@/api/index";
import type { BoardEnumApi, ClassEnumApi } from "@/api/types";
import { cleanDisplayText } from "@/lib/utils";

export type LearningChapterStatus = "not_started" | "in_progress" | "completed";

export interface LearningChapterApi {
  id: number;
  chapter: string | null;
  file_name: string;
  status: LearningChapterStatus;
  progress?: number;
  topics_total?: number;
  topics_covered?: number;
  topics_remaining?: string[];
}

export interface LearningSubjectApi {
  id: number;
  board: BoardEnumApi;
  class_level: ClassEnumApi;
  subject_name: string;
  chapters: LearningChapterApi[];
  completed_chapters: number;
  total_chapters: number;
  progress: number;
  status: LearningChapterStatus;
}

export interface LearningStatsApi {
  enrolled_subjects: number;
  lessons_completed: number;
  total_study_seconds: number;
  current_streak: number;
}

export interface ContinueLearningApi {
  subject_id: number;
  subject_name: string;
  board: BoardEnumApi;
  class_level: ClassEnumApi;
  chapter_id: number;
  chapter_name: string | null;
  file_name: string;
  status: LearningChapterStatus;
  progress: number;
  last_accessed_at: string | null;
}

export interface RecentLessonApi {
  subject_id: number;
  subject_name: string;
  board: BoardEnumApi;
  class_level: ClassEnumApi;
  chapter_id: number;
  chapter_name: string | null;
  file_name: string;
  status: LearningChapterStatus;
  last_accessed_at: string | null;
}

export interface RecommendedTopicApi {
  title: string;
  reason: string;
  subject_id: number;
  subject_name: string;
  board: BoardEnumApi;
  class_level: ClassEnumApi;
  chapter_id: number;
  chapter_name: string | null;
}

export interface LearningOverviewApi {
  stats: LearningStatsApi;
  subjects: LearningSubjectApi[];
  continue_learning: ContinueLearningApi | null;
  recent_lessons: RecentLessonApi[];
  recommended_topics?: RecommendedTopicApi[];
  scope_key: string;
}

export type StudyMode = "ai_tutor" | "ai_voice";
export type AgentMode = "ask" | "practice" | "explain" | "free";

export async function getLearningOverview(): Promise<LearningOverviewApi> {
  return apiFetch<LearningOverviewApi>("/auth/student/learning/overview");
}

export async function startLearningSession(body: {
  subject_name: string;
  chapter_id?: number | null;
  chapter_name?: string | null;
  mode?: StudyMode;
  agent_mode?: AgentMode | null;
}): Promise<{ session_id: number; started_at: string }> {
  return apiFetch("/auth/student/learning/sessions/start", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function heartbeatLearningSession(
  sessionId: number
): Promise<{ session_id: number; duration_seconds: number }> {
  return apiFetch(`/auth/student/learning/sessions/${sessionId}/heartbeat`, {
    method: "POST",
  });
}

export async function endLearningSession(
  sessionId: number
): Promise<{ session_id: number; duration_seconds: number; ended_at: string }> {
  return apiFetch(`/auth/student/learning/sessions/${sessionId}/end`, {
    method: "POST",
  });
}

export async function completeLearningChapter(
  chapterId: number
): Promise<{ chapter_id: number; status: "completed"; completed_at: string }> {
  return apiFetch(`/auth/student/learning/chapters/${chapterId}/complete`, {
    method: "POST",
  });
}

export interface TutorChatMessageApi {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at?: string | null;
}

export interface TutorChatThreadApi {
  id: string;
  title: string;
  messages: TutorChatMessageApi[];
  updated_at?: string | null;
}

export interface TutorChatApi {
  chapter_id: number;
  subject_name: string;
  messages: TutorChatMessageApi[];
  threads?: TutorChatThreadApi[];
  active_thread_id?: string | null;
  updated_at: string | null;
}

export async function getTutorChapterChat(chapterId: number): Promise<TutorChatApi> {
  return apiFetch<TutorChatApi>(`/auth/student/learning/chapters/${chapterId}/chat`);
}

export async function saveTutorChapterChat(
  chapterId: number,
  body: {
    subject_name?: string;
    messages: TutorChatMessageApi[];
    thread_id?: string;
    active_thread_id?: string;
    new_thread?: boolean;
  }
): Promise<TutorChatApi> {
  return apiFetch<TutorChatApi>(`/auth/student/learning/chapters/${chapterId}/chat`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function formatStudyTime(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

/** Build /ai-tutor query for a subject+chapter resume. */
export function tutorResumeHref(opts: {
  board: string;
  class_level: string;
  subject_name: string;
  subject_id: number | string;
  chapter_id: number | string;
  chapter_name?: string | null;
  agent_mode?: AgentMode | null;
  greet?: boolean;
}): string {
  const params = new URLSearchParams();
  params.set("board", opts.board);
  params.set("class", opts.class_level);
  params.set("subject", opts.subject_name);
  params.set("subjectId", String(opts.subject_id));
  params.set("chapters", String(opts.chapter_id));
  if (opts.chapter_name) {
    const name = cleanDisplayText(opts.chapter_name);
    if (name) params.set("chapterNames", name);
  }
  if (opts.agent_mode && opts.agent_mode !== "free") params.set("agentMode", opts.agent_mode);
  if (opts.greet) params.set("greet", "1");
  return `/ai-tutor?${params}`;
}
