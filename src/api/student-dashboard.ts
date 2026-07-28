import { apiFetch } from "@/api/index";
import type { BoardEnumApi, ClassEnumApi } from "@/api/types";
import type { LearningChapterStatus } from "@/api/learning";

export interface StudentDashboardStatsApi {
  enrolled_subjects: number;
  lessons_completed: number;
  total_study_seconds: number;
  current_streak: number;
}

export interface StudentDashboardSubjectApi {
  id: number;
  subject_name: string;
  board: BoardEnumApi;
  class_level: ClassEnumApi;
  progress: number;
  completed_chapters: number;
  total_chapters: number;
  status: LearningChapterStatus;
}

export interface StudentDashboardContinueApi {
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

export interface StudentDashboardRecentLessonApi {
  subject_id: number;
  subject_name: string;
  board: BoardEnumApi;
  class_level: ClassEnumApi;
  chapter_id: number;
  chapter_name: string | null;
  file_name: string;
  status: LearningChapterStatus;
  last_accessed_at: string | null;
  progress: number;
}

export interface StudentDashboardApi {
  overall_progress: number;
  total_chapters: number;
  stats: StudentDashboardStatsApi;
  subjects: StudentDashboardSubjectApi[];
  continue_learning: StudentDashboardContinueApi | null;
  recent_lessons: StudentDashboardRecentLessonApi[];
}

export async function getStudentDashboard(): Promise<StudentDashboardApi> {
  return apiFetch<StudentDashboardApi>("/auth/student/dashboard/summary");
}
