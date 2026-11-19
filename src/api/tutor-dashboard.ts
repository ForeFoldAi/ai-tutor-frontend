import { apiFetch } from "@/api/index";

export interface TutorDashboardMetricsApi {
  total_assigned: number;
  active_this_week: number;
  average_completion: number;
  attention_required: number;
  assigned_trend: string;
  active_trend: string;
  completion_trend: string;
  attention_trend: string;
}

export interface TutorDashboardSessionApi {
  id: number;
  title: string;
  grade: string;
  section: string;
  subject: string;
  starts_at: string;
  duration_minutes: number;
  status: "live" | "upcoming" | "completed";
}

export interface TutorAttentionStudentApi {
  student_user_id: number;
  name: string;
  grade: string;
  topic: string;
  risk_level: "High" | "Medium" | "Low";
  tag: string;
}

export interface TutorAiRecommendationApi {
  id: string;
  title: string;
  description: string;
  priority: "High" | "Medium" | "Low";
  icon: "quiz" | "worksheet" | "revision" | "concept";
  action_label: string;
  action_href: string;
}

export interface TutorDashboardSummaryApi {
  metrics: TutorDashboardMetricsApi;
  todays_sessions: TutorDashboardSessionApi[];
  attention_students: TutorAttentionStudentApi[];
  ai_recommendations: TutorAiRecommendationApi[];
}

export async function getTutorDashboardSummary(): Promise<TutorDashboardSummaryApi> {
  return apiFetch<TutorDashboardSummaryApi>("/auth/tutor/dashboard/summary");
}
