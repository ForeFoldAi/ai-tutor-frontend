export interface SchoolDashboardMetrics {
  totalStudents: number;
  totalTeachers: number;
  teacherGuidedStudents: number;
  selfLearningStudents: number;
  activeThisWeek: number;
  studentsTrend: string;
  teachersTrend: string;
  activeTrend: string;
  teacherGuidedPercent: string;
  selfLearningPercent: string;
}

export interface OnboardingProgressItem {
  id: string;
  label: string;
  completed: number;
  total: number;
  percent: number;
}

export interface PendingItem {
  id: string;
  label: string;
  count: number;
  severity: "warning" | "danger";
  icon: "assignments" | "credentials" | "mapping";
}
