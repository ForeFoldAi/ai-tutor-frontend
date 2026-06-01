import type { ApiUser } from "@/api/types";

export interface TutorDashboardMetrics {
  totalAssigned: number;
  activeStudents: number;
  averageCompletion: number;
}

export interface TutorSession {
  id: string;
  title: string;
  subject: string;
  grade: string;
  section: string;
  startsAt: string;
  durationMinutes: number;
  meetingLink?: string;
  notes?: string;
}

export type TutorStudent = ApiUser;
