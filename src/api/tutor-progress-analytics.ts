import { apiFetch } from "@/api/index";
import type {
  AtRiskStudent,
  ClassHealthMetrics,
  CompletionTrendPoint,
  TopicMasteryItem,
} from "@/modules/tutor/types/progress-analytics";

interface ProgressAnalyticsApi {
  class_health: {
    score: number;
    status: string;
    trend_percent: number;
    trend_up: boolean;
  };
  topic_mastery: { topic: string; mastery: number }[];
  completion_trend: { date: string; completion: number }[];
  at_risk_students: {
    id: number;
    slug: string;
    name: string;
    grade: string;
    subject: string;
    risk_level: string;
  }[];
}

const AVATAR_COLORS = [
  "bg-sky-100 text-sky-700",
  "bg-violet-100 text-violet-700",
  "bg-amber-100 text-amber-700",
  "bg-emerald-100 text-emerald-700",
  "bg-rose-100 text-rose-700",
  "bg-blue-100 text-blue-700",
  "bg-purple-100 text-purple-700",
  "bg-teal-100 text-teal-700",
  "bg-orange-100 text-orange-700",
  "bg-indigo-100 text-indigo-700",
];

function avatarColor(id: number): string {
  return AVATAR_COLORS[Math.abs(id) % AVATAR_COLORS.length];
}

function mapAtRisk(row: ProgressAnalyticsApi["at_risk_students"][number]): AtRiskStudent {
  return {
    id: String(row.id),
    slug: row.slug,
    name: row.name,
    grade: row.grade,
    subject: row.subject,
    riskLevel: row.risk_level as AtRiskStudent["riskLevel"],
    avatarColor: avatarColor(row.id),
  };
}

export interface ProgressAnalyticsData {
  classHealth: ClassHealthMetrics;
  topicMastery: TopicMasteryItem[];
  completionTrend: CompletionTrendPoint[];
  atRiskStudents: AtRiskStudent[];
}

export async function fetchProgressAnalytics(): Promise<ProgressAnalyticsData> {
  const data = await apiFetch<ProgressAnalyticsApi>("/auth/tutor/progress/analytics");
  return {
    classHealth: {
      score: data.class_health.score,
      status: data.class_health.status as ClassHealthMetrics["status"],
      trendPercent: data.class_health.trend_percent,
      trendUp: data.class_health.trend_up,
    },
    topicMastery: data.topic_mastery.map((row) => ({
      topic: row.topic,
      mastery: row.mastery,
    })),
    completionTrend: data.completion_trend.map((row) => ({
      date: row.date,
      completion: row.completion,
    })),
    atRiskStudents: data.at_risk_students.map(mapAtRisk),
  };
}
