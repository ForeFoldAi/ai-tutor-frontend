export type VoiceState =
  | "IDLE"
  | "CONNECTING"
  | "LISTENING"
  | "PROCESSING"
  | "THINKING"
  | "SPEAKING"
  | "INTERRUPTED"
  | "ERROR"
  | "ENDED";

export type VoiceEventType =
  | "student_started_speaking"
  | "student_stopped_speaking"
  | "ai_started_processing"
  | "ai_started_speaking"
  | "ai_stopped_speaking"
  | "ai_interrupted"
  | "question_generated"
  | "answer_evaluated"
  | "voice_error"
  | "session_started"
  | "session_ended"
  | "session_ready"
  | "sdp_answer"
  | "ice"
  | "transcript"
  | "turn_cancelled";

export type TranscriptLine = {
  role: "user" | "assistant";
  text: string;
  turnId: number;
  action?: string;
  /** User line emitted before runTurn completes; cleared on commit or cancel. */
  pending?: boolean;
};

export type VoiceScope = {
  board: string;
  classLevel: string;
  subject: string;
  chapterIds: string[];
  chapterNames: string[];
};

export type IceServer = { urls: string | string[]; username?: string; credential?: string };
