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
  userImageUrl?: string;
  userImageCaption?: string;
};
