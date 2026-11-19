import { apiFetch } from "@/api/index";
import type {
  OnboardingProgressItem,
  PendingItem,
  SchoolDashboardMetrics,
} from "@/modules/organization/types/dashboard";

export interface DashboardSummaryApi {
  metrics: {
    total_students: number;
    total_teachers: number;
    teacher_guided_students: number;
    self_learning_students: number;
    active_this_week: number;
    students_trend: string;
    teachers_trend: string;
    active_trend: string;
    teacher_guided_percent: string;
    self_learning_percent: string;
  };
  onboarding: Array<{
    id: string;
    label: string;
    completed: number;
    total: number;
    percent: number;
  }>;
  pending: Array<{
    id: string;
    label: string;
    count: number;
    severity: string;
    icon: string;
  }>;
  curricula: string[];
}

export interface SchoolDashboardSummary {
  metrics: SchoolDashboardMetrics;
  onboarding: OnboardingProgressItem[];
  pending: PendingItem[];
  curricula: string[];
}

export function mapDashboardSummary(data: DashboardSummaryApi): SchoolDashboardSummary {
  return {
    metrics: {
      totalStudents: data.metrics.total_students,
      totalTeachers: data.metrics.total_teachers,
      teacherGuidedStudents: data.metrics.teacher_guided_students,
      selfLearningStudents: data.metrics.self_learning_students,
      activeThisWeek: data.metrics.active_this_week,
      studentsTrend: data.metrics.students_trend,
      teachersTrend: data.metrics.teachers_trend,
      activeTrend: data.metrics.active_trend,
      teacherGuidedPercent: data.metrics.teacher_guided_percent,
      selfLearningPercent: data.metrics.self_learning_percent,
    },
    onboarding: data.onboarding.map((item) => ({
      id: item.id,
      label: item.label,
      completed: item.completed,
      total: item.total,
      percent: item.percent,
    })),
    pending: data.pending.map((item) => ({
      id: item.id,
      label: item.label,
      count: item.count,
      severity: item.severity === "danger" ? "danger" : "warning",
      icon:
        item.icon === "credentials"
          ? "credentials"
          : item.icon === "mapping"
            ? "mapping"
            : "assignments",
    })),
    curricula: data.curricula ?? [],
  };
}

export async function getSchoolDashboardSummary(): Promise<SchoolDashboardSummary> {
  const data = await apiFetch<DashboardSummaryApi>("/auth/admin/dashboard/summary");
  return mapDashboardSummary(data);
}
