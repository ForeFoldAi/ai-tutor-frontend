import type { ApiUser } from "@/api/types";
import { useAuthStore } from "@/lib/auth-store";
import type { TutorSession } from "@/modules/tutor/types";
import { delay } from "../delay";
import { mockStore } from "../store";

export async function getAssignedStudents(): Promise<ApiUser[]> {
  await delay();
  const tutor = useAuthStore.getState().user;
  if (!tutor) return mockStore.users.filter((u) => u.role === "STUDENT");
  return mockStore.users.filter(
    (u) => u.role === "STUDENT" && u.organization_id === tutor.organizationId,
  );
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
  await delay();
  const tutorId = useAuthStore.getState().user?.id ?? "anonymous-tutor";
  const key = `tutor-live-sessions:${tutorId}`;
  const raw = localStorage.getItem(key);
  if (!raw) return [...mockStore.tutorSessions];
  try {
    const parsed = JSON.parse(raw) as TutorSession[];
    return parsed.length ? parsed : [...mockStore.tutorSessions];
  } catch {
    return [...mockStore.tutorSessions];
  }
}

export async function createTutorSession(payload: Omit<TutorSession, "id">): Promise<TutorSession> {
  await delay();
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
