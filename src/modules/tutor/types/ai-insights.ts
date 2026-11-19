import type { RiskLevel } from "@/modules/tutor/types/progress-analytics";

export type InterventionPriority = "High" | "Medium" | "Low";

export interface WeakTopic {
  topic: string;
  strugglePercent: number;
}

export interface AffectedStudent {
  id: string;
  name: string;
  grade: string;
  topic: string;
  riskLevel: RiskLevel;
  avatarColor: string;
}

export interface SuggestedIntervention {
  id: string;
  title: string;
  description: string;
  priority: InterventionPriority;
  icon: "revision" | "quiz" | "worksheet" | "concept";
}

export interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: "lesson" | "quiz" | "worksheet" | "session" | "questions";
  href?: string;
}
