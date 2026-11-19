/**
 * Parse server stream_metrics for dev tuning (Phase 2 latency + Phase 3 TTS prefetch).
 */

export type VoiceStreamMetrics = Record<string, string>;

export function logVoiceStreamMetrics(
  metrics: unknown,
  phase?: unknown,
): void {
  if (!metrics || typeof metrics !== "object") return;
  const m = metrics as VoiceStreamMetrics;
  console.debug("[voice-metrics]", {
    phase: typeof phase === "string" ? phase : "unknown",
    llm_first_token: m.llm_first_token,
    speech_unit_queued: m.speech_unit_queued,
    first_mp3: m.first_mp3,
    first_sent: m.first_sent,
    speech_units: m.speech_units,
    tokens_streamed: m.tokens_streamed,
    queue_depth: m.queue_depth,
    prefetch_hits: m.prefetch_hits,
    prefetch_misses: m.prefetch_misses,
    tts_units_played: m.tts_units_played,
    queue_high_water: m.queue_high_water,
    rag_complete: m.rag_complete,
  });
}
