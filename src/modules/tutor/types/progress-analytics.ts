export type RiskLevel = "High" | "Medium" | "Low";

export type HealthStatus = "Good" | "Fair" | "Needs Attention";

export interface ClassHealthMetrics {
  score: number;
  status: HealthStatus;
  trendPercent: number;
  trendUp: boolean;
}

export interface TopicMasteryItem {
  topic: string;
  mastery: number;
}

export interface CompletionTrendPoint {
  date: string;
  completion: number;
}

export interface AtRiskStudent {
  id: string;
  name: string;
  grade: string;
  subject: string;
  riskLevel: RiskLevel;
  avatarColor: string;
}
