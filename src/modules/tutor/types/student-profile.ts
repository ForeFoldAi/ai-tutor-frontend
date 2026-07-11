export type RiskLevel = "Low" | "Medium" | "High";

export type AssignmentStatus = "Completed" | "In Progress" | "Not Started";

export interface TutorStudentRow {
  id: string;
  slug: string;
  fullName: string;
  grade: string;
  section: string;
  subject: string;
  completion: number;
  riskLevel: RiskLevel;
  lastActive: string;
  userId: string;
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
