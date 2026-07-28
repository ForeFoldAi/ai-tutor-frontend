import type {
  AffectedStudent,
  InterventionPriority,
  SuggestedIntervention,
  WeakTopic,
} from "@/modules/tutor/types/ai-insights";
import type { RiskLevel } from "@/modules/tutor/types/progress-analytics";
import type { LiaClassInsightsApi } from "@/api/lia";

const AVATAR_COLORS = [
  "bg-sky-100 text-sky-700",
  "bg-violet-100 text-violet-700",
  "bg-amber-100 text-amber-700",
  "bg-emerald-100 text-emerald-700",
  "bg-rose-100 text-rose-700",
  "bg-blue-100 text-blue-700",
  "bg-purple-100 text-purple-700",
  "bg-teal-100 text-teal-700",
];

function normalizeRisk(level: string): RiskLevel {
  const key = level.toLowerCase();
  if (key === "high") return "High";
  if (key === "medium") return "Medium";
  return "Low";
}

function avatarColor(id: number) {
  return AVATAR_COLORS[Math.abs(id) % AVATAR_COLORS.length];
}

function normalizePriority(level: string): InterventionPriority {
  const key = level.toLowerCase();
  if (key === "high") return "High";
  if (key === "low") return "Low";
  return "Medium";
}

export function mapLiaClassInsights(api: LiaClassInsightsApi) {
  const weakTopics: WeakTopic[] = api.weak_topics.map((item) => ({
    topic: item.topic,
    strugglePercent: item.struggle_percent,
  }));

  const affectedStudents: AffectedStudent[] = api.affected_students.map((item) => ({
    id: String(item.student_user_id),
    name: item.name,
    grade: item.grade,
    topic: item.topic,
    riskLevel: normalizeRisk(item.risk_level),
    avatarColor: avatarColor(item.student_user_id),
  }));

  const interventions: SuggestedIntervention[] = api.interventions.map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    priority: normalizePriority(item.priority),
    icon: item.icon as SuggestedIntervention["icon"],
  }));

  return { weakTopics, affectedStudents, interventions };
}

export function humanizeConceptKey(key: string) {
  const parts = key.split("|");
  const slug = parts[parts.length - 1] || key;
  return slug.replace(/_/g, " ");
}
