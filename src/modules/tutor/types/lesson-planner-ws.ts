export type LessonPlannerWsEventType =
  | "job_started"
  | "progress"
  | "artifact_started"
  | "artifact_completed"
  | "artifact_updated"
  | "autosave"
  | "cancelled"
  | "error"
  | "completed"
  | "heartbeat"
  | "pong";

export interface LessonPlannerWsEvent {
  event: LessonPlannerWsEventType;
  job_id?: string;
  progress?: number;
  message?: string;
  artifact?: string;
  data?: Record<string, unknown>;
  result?: {
    outputs?: Record<string, Record<string, unknown>>;
    metadata?: Record<string, unknown>;
    errors?: string[];
  };
  snapshot?: Record<string, unknown>;
}

export interface LessonGenerationProgress {
  progress: number;
  message: string;
  activeArtifact: string | null;
  completedArtifacts: string[];
  error: string | null;
}

export const INITIAL_GENERATION_PROGRESS: LessonGenerationProgress = {
  progress: 0,
  message: "",
  activeArtifact: null,
  completedArtifacts: [],
  error: null,
};
