import { apiFetch } from "@/api/index";
import type { ApiUser } from "@/api/types";
import { useAuthStore } from "@/lib/auth-store";
import type { TutorSession } from "@/modules/tutor/types";

export async function getAssignedStudents(): Promise<ApiUser[]> {
  return apiFetch<ApiUser[]>("/auth/tutor/students");
}

export async function fetchTutorProgress(): Promise<{
  totalAssigned: number;
  activeStudents: number;
  averageCompletion: number;
}> {
  const students = await getAssignedStudents();
  const totalAssigned = students.length;
  const activeStudents = students.filter((s) => s.is_active).length;
  const averageCompletion = totalAssigned ? Math.round((activeStudents / totalAssigned) * 100) : 0;
  return { totalAssigned, activeStudents, averageCompletion };
}

export async function fetchTutorSessions(): Promise<TutorSession[]> {
  const tutorId = useAuthStore.getState().user?.id ?? "anonymous-tutor";
  const seed: TutorSession[] = [
    {
      id: "session-1",
      title: "Algebra revision",
      subject: "Mathematics",
      grade: "9",
      section: "A",
      startsAt: "2026-05-10T10:00:00Z",
      durationMinutes: 60,
    },
    {
      id: "session-2",
      title: "Physics numericals",
      subject: "Physics",
      grade: "10",
      section: "B",
      startsAt: "2026-05-11T14:00:00Z",
      durationMinutes: 75,
    },
  ];
  const key = `tutor-live-sessions:${tutorId}`;
  const raw = localStorage.getItem(key);
  if (!raw) return seed;
  try {
    const parsed = JSON.parse(raw) as TutorSession[];
    return parsed.length ? parsed : seed;
  } catch {
    return seed;
  }
}

export async function createTutorSession(
  payload: Omit<TutorSession, "id">,
): Promise<TutorSession> {
  const tutorId = useAuthStore.getState().user?.id ?? "anonymous-tutor";
  const key = `tutor-live-sessions:${tutorId}`;
  const current = await fetchTutorSessions();
  const next: TutorSession = {
    ...payload,
    id: `session-${crypto.randomUUID()}`,
  };
  localStorage.setItem(key, JSON.stringify([next, ...current]));
  return next;
}
