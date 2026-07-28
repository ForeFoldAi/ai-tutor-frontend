import { apiFetch, API_BASE } from "@/api/index";
import { useAuthStore } from "@/lib/auth-store";
import type { TutorSession } from "@/modules/tutor/types";
import type {
  TutorStudentListResponse,
  TutorStudentOptionsResponse,
  TutorStudentProfileApi,
  TutorStudentRowApi,
} from "@/modules/tutor/types/student-profile";

export interface ListTutorStudentsParams {
  q?: string;
  grade?: string;
  subject?: string;
  risk_level?: string;
  limit?: number;
  offset?: number;
}

function tutorStudentsQuery(params: ListTutorStudentsParams) {
  const sp = new URLSearchParams();
  if (params.q?.trim()) sp.set("q", params.q.trim());
  if (params.grade && params.grade !== "all") sp.set("grade", params.grade);
  if (params.subject && params.subject !== "all") sp.set("subject", params.subject);
  if (params.risk_level && params.risk_level !== "all") sp.set("risk_level", params.risk_level);
  if (params.limit != null) sp.set("limit", String(params.limit));
  if (params.offset != null) sp.set("offset", String(params.offset));
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

export async function getTutorStudentOptions(): Promise<TutorStudentOptionsResponse> {
  return apiFetch<TutorStudentOptionsResponse>("/auth/tutor/students/options");
}

export async function listAssignedStudents(
  params: ListTutorStudentsParams = {},
): Promise<TutorStudentListResponse> {
  return apiFetch<TutorStudentListResponse>(`/auth/tutor/students${tutorStudentsQuery(params)}`);
}

/** @deprecated Prefer listAssignedStudents — kept for progress summary callers. */
export async function getAssignedStudents(): Promise<TutorStudentRowApi[]> {
  const result = await listAssignedStudents({ limit: 1000, offset: 0 });
  return result.items;
}

export async function getTutorStudentProfile(
  studentId: string | number,
): Promise<TutorStudentProfileApi> {
  return apiFetch<TutorStudentProfileApi>(`/auth/tutor/students/${studentId}/profile`);
}

/** Accepts numeric id or slug from list rows (e.g. likith, rahul-sharma). */
export async function getTutorStudentProfileByRef(
  ref: string,
): Promise<TutorStudentProfileApi> {
  if (/^\d+$/.test(ref)) return getTutorStudentProfile(ref);

  const result = await listAssignedStudents({ limit: 500 });
  const key = ref.trim().toLowerCase();
  const match = result.items.find((row) => row.slug.toLowerCase() === key);
  if (!match) throw new Error("Student profile not found.");
  return getTutorStudentProfile(match.id);
}

export async function exportTutorStudentsCsv(params: ListTutorStudentsParams = {}): Promise<void> {
  const token = useAuthStore.getState().token;
  const res = await fetch(`${API_BASE}/auth/tutor/students/export${tutorStudentsQuery(params)}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Export failed (${res.status})`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `students-export-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export async function fetchTutorProgress(): Promise<{
  totalAssigned: number;
  activeStudents: number;
  averageCompletion: number;
}> {
  const result = await listAssignedStudents({ limit: 1000, offset: 0 });
  const students = result.items;
  const totalAssigned = result.meta.total;
  const activeStudents = students.filter((s) => s.is_active).length;
  const averageCompletion = students.length
    ? Math.round(students.reduce((sum, s) => sum + s.completion, 0) / students.length)
    : 0;
  return { totalAssigned, activeStudents, averageCompletion };
}

export async function fetchTutorSessions(): Promise<TutorSession[]> {
  const rows = await apiFetch<LiveSessionApi[]>("/auth/tutor/live-sessions");
  return rows.map(mapLiveSessionToTutor);
}

export async function createTutorSession(
  payload: Omit<TutorSession, "id">,
): Promise<TutorSession> {
  const row = await apiFetch<LiveSessionApi>("/auth/tutor/live-sessions", {
    method: "POST",
    body: JSON.stringify({
      title: payload.title,
      subject: payload.subject,
      chapter_id: payload.chapterId ?? null,
      chapter: payload.chapter ?? null,
      grade: payload.grade,
      section: payload.section,
      curriculum: payload.curriculum ?? null,
      starts_at: payload.startsAt,
      duration_minutes: payload.durationMinutes,
      meeting_link: payload.meetingLink ?? null,
      notes: payload.notes ?? null,
    }),
  });
  return mapLiveSessionToTutor(row);
}

export async function updateTutorSession(
  sessionId: string | number,
  payload: Omit<TutorSession, "id">,
): Promise<TutorSession> {
  const row = await apiFetch<LiveSessionApi>(`/auth/tutor/live-sessions/${sessionId}`, {
    method: "PATCH",
    body: JSON.stringify({
      title: payload.title,
      subject: payload.subject,
      chapter_id: payload.chapterId ?? null,
      chapter: payload.chapter ?? null,
      grade: payload.grade,
      section: payload.section,
      curriculum: payload.curriculum ?? null,
      starts_at: payload.startsAt,
      duration_minutes: payload.durationMinutes,
      meeting_link: payload.meetingLink ?? null,
      notes: payload.notes ?? null,
    }),
  });
  return mapLiveSessionToTutor(row);
}

export async function deleteTutorSession(sessionId: string | number): Promise<void> {
  await apiFetch(`/auth/tutor/live-sessions/${sessionId}`, { method: "DELETE" });
}

interface LiveSessionApi {
  id: number;
  title: string;
  subject: string;
  chapter_id: string | null;
  chapter: string | null;
  grade: string;
  section: string;
  curriculum: string | null;
  starts_at: string;
  duration_minutes: number;
  meeting_link: string | null;
  notes: string | null;
  tutor_id: number;
  tutor_name: string;
  attendees: number;
  status: "live" | "upcoming" | "completed";
  joined: boolean;
}

function mapLiveSessionToTutor(row: LiveSessionApi): TutorSession {
  return {
    id: String(row.id),
    title: row.title,
    subject: row.subject,
    chapterId: row.chapter_id ?? undefined,
    chapter: row.chapter ?? undefined,
    grade: row.grade,
    section: row.section,
    curriculum: row.curriculum ?? undefined,
    startsAt: row.starts_at,
    durationMinutes: row.duration_minutes,
    meetingLink: row.meeting_link ?? undefined,
    notes: row.notes ?? undefined,
  };
}

export type { LiveSessionApi };

export async function fetchStudentLiveSessions(): Promise<LiveSessionApi[]> {
  return apiFetch<LiveSessionApi[]>("/auth/student/live-sessions");
}

export async function joinStudentLiveSession(
  sessionId: number,
): Promise<{ session_id: number; meeting_link: string; joined_at: string }> {
  return apiFetch(`/auth/student/live-sessions/${sessionId}/join`, { method: "POST" });
}
