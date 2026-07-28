import { apiFetch } from "@/api/index";

export interface LiaTeacherSummaryApi {
  student_user_id: number;
  observations: string[];
  recommendations: string[];
  risk_level: string;
  strengths: string[];
  weaknesses: string[];
  period_start: string | null;
  period_end: string | null;
}

export interface LiaConceptMasteryApi {
  concept_key: string;
  mastery_score: number;
  understanding_level: number;
  memorized_likelihood: number;
}

export interface LiaKnowledgeGapApi {
  concept_key: string;
  gap_type: string;
  missing_prerequisites: string[];
  confidence: number;
}

export interface LiaMisconceptionApi {
  concept_key: string;
  misconception_key: string;
  description: string;
  confidence: number;
  occurrence_count: number;
}

export interface LiaKnowledgeMapApi {
  student_user_id: number;
  concepts: LiaConceptMasteryApi[];
  misconceptions: LiaMisconceptionApi[];
  knowledge_gaps: LiaKnowledgeGapApi[];
}

export interface LiaClassInsightsApi {
  weak_topics: Array<{
    topic: string;
    struggle_percent: number;
    student_count: number;
  }>;
  affected_students: Array<{
    student_user_id: number;
    name: string;
    grade: string;
    topic: string;
    risk_level: string;
  }>;
  interventions: Array<{
    id: string;
    title: string;
    description: string;
    priority: string;
    icon: string;
  }>;
}

export async function getLiaClassInsights(): Promise<LiaClassInsightsApi> {
  return apiFetch<LiaClassInsightsApi>("/auth/tutor/lia/insights");
}

export async function getLiaTeacherSummary(studentId: string | number): Promise<LiaTeacherSummaryApi> {
  return apiFetch<LiaTeacherSummaryApi>(`/auth/tutor/lia/students/${studentId}/teacher-summary`);
}

export async function getLiaKnowledgeMap(studentId: string | number): Promise<LiaKnowledgeMapApi> {
  return apiFetch<LiaKnowledgeMapApi>(`/auth/tutor/lia/students/${studentId}/knowledge-map`);
}
