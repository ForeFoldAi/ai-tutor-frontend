import type { TutorStudentRowApi } from "@/modules/tutor/types/student-profile";

export interface TutorDashboardMetrics {
  totalAssigned: number;
  activeStudents: number;
  averageCompletion: number;
}

export interface TutorSession {
  id: string;
  title: string;
  subject: string;
  chapterId?: string;
  chapter?: string;
  grade: string;
  section: string;
  curriculum?: string;
  startsAt: string;
  durationMinutes: number;
  meetingLink?: string;
  notes?: string;
}

export type TutorStudent = TutorStudentRowApi;
