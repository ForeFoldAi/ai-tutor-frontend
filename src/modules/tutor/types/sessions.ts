export type SessionMode = "video" | "ai-guided" | "hybrid";

export type SessionStatus = "live" | "upcoming" | "scheduled" | "completed";

export interface SessionDisplayItem {
  id: string;
  title: string;
  subject: string;
  grade: string;
  section: string;
  startsAt: string;
  durationMinutes: number;
  studentCount: number;
  status: SessionStatus;
  mode?: SessionMode;
  studentIds?: string[];
  notes?: string;
}

export interface CreateSessionFormValues {
  title: string;
  subject: string;
  studentIds: string[];
  grade: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  mode: SessionMode;
  generateAiLessonKit: boolean;
  notes?: string;
}
