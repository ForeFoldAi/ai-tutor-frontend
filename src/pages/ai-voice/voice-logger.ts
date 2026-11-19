/** Structured voice diagnostic logger — prefix scheme matches production spec */
import type { Phase } from "./use-voice-page-state";

export const vlog = {
  phase: (from: Phase | string, to: Phase, extra?: Record<string, unknown>) =>
    console.debug("[VOICE_PHASE]", `${from} → ${to}`, extra ?? ""),
  stt: (msg: string, extra?: Record<string, unknown>) =>
    console.debug("[STT]", msg, extra ?? ""),
  vad: (msg: string, extra?: Record<string, unknown>) =>
    console.debug("[VAD]", msg, extra ?? ""),
  turn: (msg: string, extra?: Record<string, unknown>) =>
    console.debug("[TURN]", msg, extra ?? ""),
  whisper: (msg: string, extra?: Record<string, unknown>) =>
    console.debug("[WHISPER]", msg, extra ?? ""),
  llm: (msg: string, extra?: Record<string, unknown>) =>
    console.debug("[LLM]", msg, extra ?? ""),
  tts: (msg: string, extra?: Record<string, unknown>) =>
    console.debug("[TTS]", msg, extra ?? ""),
  audio: (msg: string, extra?: Record<string, unknown>) =>
    console.debug("[AUDIO]", msg, extra ?? ""),
  interrupt: (msg: string, extra?: Record<string, unknown>) =>
    console.debug("[INTERRUPT]", msg, extra ?? ""),
  ws: (msg: string, extra?: Record<string, unknown>) =>
    console.debug("[WEBSOCKET]", msg, extra ?? ""),
};
