/**
 * Central voice-protection knobs (browser side).
 * Mirrors backend env defaults; override with VITE_* where noted.
 */

function envBag(): Record<string, string | boolean | undefined> {
  try {
    return (import.meta as ImportMeta & { env?: Record<string, string | boolean | undefined> }).env || {};
  } catch {
    return {};
  }
}

function envBool(name: string, fallback: boolean): boolean {
  const v = envBag()[name];
  if (v === undefined || v === "") return fallback;
  return String(v).toLowerCase() !== "false" && v !== "0";
}

function envNum(name: string, fallback: number): number {
  const v = envBag()[name];
  if (v === undefined || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/** Master switch — when false, barge-in uses legacy volume-only path */
export const VOICE_PROTECTION_ENABLED = envBool("VITE_VOICE_PROTECTION_ENABLED", true);

export const VAD_ENABLED = envBool("VITE_VAD_ENABLED", true);
export const VAD_THRESHOLD = envNum("VITE_VAD_THRESHOLD", 0.75);
export const MIN_SPEECH_MS = envNum("VITE_MIN_SPEECH_MS", 300);

/** Alias used by ai-voice resumeListeningAfterPlayback */
export const POST_PLAYBACK_STT_DELAY_MS = envNum("VITE_POST_PLAYBACK_STT_DELAY_MS", 1800);
export const POST_PLAYBACK_ECHO_MS = POST_PLAYBACK_STT_DELAY_MS;

export const ECHO_SIMILARITY_THRESHOLD = envNum("VITE_ECHO_SIMILARITY_THRESHOLD", 0.7);

export const SPEAKER_VERIFICATION_ENABLED = envBool("VITE_SPEAKER_VERIFICATION_ENABLED", true);
export const SPEAKER_SIMILARITY_THRESHOLD = envNum("VITE_SPEAKER_SIMILARITY_THRESHOLD", 0.7);

export const NOISE_SUPPRESSION_ENABLED = envBool("VITE_NOISE_SUPPRESSION_ENABLED", true);
export const WAKE_WORD_ENABLED = envBool("VITE_WAKE_WORD_ENABLED", false);

export const STT_FINAL_DEBOUNCE_MS = 140;
/** Submit stable interim text when the browser never marks a short utterance final */
export const STT_INTERIM_COMPLETE_MS = envNum("VITE_STT_INTERIM_COMPLETE_MS", 480);
export const POST_PLAYBACK_LISTEN_MS = 80;

// How long a student can go quiet mid-question before server-Whisper listen
// capture treats them as done and submits — must comfortably cover a natural
// "thinking pause" ("what is... the capital of France") without feeling like
// the tutor is ignoring them. Was 950ms, then 1400ms; both still clipped kids
// composing a longer question. Ceiling: still a fixed timeout, not adaptive to
// utterance length — revisit with per-student tuning if long questions still
// get cut.
export const LISTEN_SILENCE_MS = envNum("VITE_LISTEN_SILENCE_MS", 1800);
/** Same pause allowance for a barge-in (interrupt) capture — the student is
 * still finishing a real sentence, not just triggering a stop. */
export const BARGE_SILENCE_MS = envNum("VITE_BARGE_SILENCE_MS", 1800);
/** Hard ceiling so a silent-but-open mic doesn't hang forever. */
export const MAX_UTTERANCE_MS = envNum("VITE_MAX_UTTERANCE_MS", 11_000);
/** RMS level above which the mic is considered "speaking" for endpointing. */
export const SPEECH_LEVEL = envNum("VITE_SPEECH_LEVEL", 0.018);
// Must cover a full tutor answer, not just its tail — TTS audio playback
// (30-60s+) runs far behind the LLM text stream (2-5s), so a short tail
// goes stale mid-playback and lets genuine self-echo slip past the guard.
export const AI_SPEECH_TAIL_MAX_CHARS = 4000;

/** Confirm barge candidate before calling /voice/barge-check */
export const BARGE_IN_HOLD_MS = envNum("VITE_BARGE_IN_HOLD_MS", 280);
export const INTERRUPT_RESUME_LISTEN_MS = 80;
export const INTERRUPT_COOLDOWN_MS = 280;
export const BARGE_IN_ARM_DELAY_MS = 200;
export const BARGE_IN_DUCK_VOLUME = 0.42;

/** Require server barge-check (VAD/speaker) before interrupting tutor audio */
export const BARGE_CHECK_REQUIRED = envBool("VITE_BARGE_CHECK_REQUIRED", true);

/** Duck first; full interrupt only after server confirms (ChatGPT-style) */
export const BARGE_CONFIRMED = envBool("VITE_BARGE_CONFIRMED", true);
