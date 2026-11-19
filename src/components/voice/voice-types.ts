import type { MathLesson } from "@/types/math-lesson";
import type { ScienceExperiment } from "@/types/science-experiment";

export type VoiceRelatedImage = {
  url: string;
  caption?: string | null;
  page?: number | null;
};

export type VoicePhase = "idle" | "connecting" | "listening" | "thinking" | "speaking" | "error";

export type TranscriptRole = "user" | "assistant";

export type TranscriptEntry = {
  id: string;
  role: TranscriptRole;
  text: string;
  timeSec: number;
  images?: VoiceRelatedImage[];
  mathLesson?: MathLesson | null;
  scienceExperiment?: ScienceExperiment | null;
  userImageUrl?: string;
  userImageCaption?: string;
};
