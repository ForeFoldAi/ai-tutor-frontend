export type SessionStatus = "live" | "upcoming" | "scheduled" | "completed";

export interface SessionDisplayItem {
  id: string;
  title: string;
  subject: string;
  chapterId?: string;
  chapter: string;
  grade: string;
  section: string;
  curriculum: string;
  startsAt: string;
  durationMinutes: number;
  status: SessionStatus;
  meetingLink?: string;
  notes?: string;
}

export interface CreateSessionFormValues {
  title: string;
  subject: string;
  chapterId: string;
  chapter: string;
  classKey: string;
  grade: string;
  section: string;
  curriculum: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  meetingLink?: string;
  notes?: string;
}
