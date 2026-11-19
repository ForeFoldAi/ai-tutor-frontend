export type RiskLevel = "Not Started" | "Low" | "Medium" | "High";

export type AssignmentStatus = "Completed" | "In Progress" | "Not Started";

export interface TutorStudentRow {
  id: string;
  slug: string;
  fullName: string;
  grade: string;
  section: string;
  curriculum: string;
  gradeLabel: string;
  subjects: string[];
  /** Display string for table — all tagged subjects joined. */
  subject: string;
  completion: number;
  riskLevel: RiskLevel;
  lastActive: string;
  userId: string;
  isActive: boolean;
}

export interface SkillMetric {
  name: string;
  score: number;
}

export interface ActivityItem {
  title: string;
  when: string;
}

export interface QuizItem {
  name: string;
  score: number;
}

export interface AssignmentItem {
  title: string;
  due: string;
  status: AssignmentStatus;
}

export interface TutorStudentProfile extends TutorStudentRow {
  currentTopic: string;
  overallProgress: number;
  strengths: SkillMetric[];
  needsImprovement: SkillMetric[];
  aiActivity: ActivityItem[];
  averageQuizScore: number;
  quizTrend: number;
  recentQuizzes: QuizItem[];
  assignments: AssignmentItem[];
  teacherNotes: string;
  notesUpdated: string;
}

export interface StudentFilters {
  grade: string;
  subject: string;
  riskLevel: string;
  search: string;
}

/** Raw API shapes from GET /auth/tutor/students */
export interface TutorStudentRowApi {
  id: number;
  slug: string;
  user_id: string;
  full_name: string;
  grade: string | null;
  section: string | null;
  curriculum: string | null;
  grade_label: string;
  subjects: string[];
  completion: number;
  risk_level: RiskLevel;
  last_active: string | null;
  last_active_at: string | null;
  is_active: boolean;
}

export interface TutorStudentListResponse {
  items: TutorStudentRowApi[];
  meta: {
    total: number;
    limit: number;
    offset: number;
    default_limit: number;
  };
}

export interface TutorStudentOptionsResponse {
  grades: string[];
  subjects: string[];
  risk_levels: string[];
  default_limit: number;
  page_size_options: number[];
}

export interface TutorStudentProfileApi extends TutorStudentRowApi {
  current_topic: string | null;
  overall_progress: number;
  strengths: SkillMetric[];
  needs_improvement: SkillMetric[];
  ai_activity: ActivityItem[];
  average_quiz_score: number;
  quiz_trend: number;
  recent_quizzes: QuizItem[];
  assignments: AssignmentItem[];
  teacher_notes: string;
  notes_updated: string | null;
}
