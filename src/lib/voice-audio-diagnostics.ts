/**
 * Phase 4 — client audio playback diagnostics.
 */

import type { Mp3PlayerStats } from "@/lib/mp3-stream-player";

export function logVoicePlayerStats(stats: Mp3PlayerStats | undefined): void {
  if (!stats) return;
  console.debug("[voice-audio-metrics]", {
    bytes_buffered: stats.bytesBuffered,
    bytes_pending: stats.bytesPending,
    queue_depth: stats.queueDepth,
    chunks: stats.chunksReceived,
    buffered_ahead_sec: stats.bufferedAheadSec.toFixed(2),
    underflow_recoveries: stats.underflowRecoveries,
    playback_started: stats.playbackStarted,
    stream_ended: stats.streamEnded,
  });
}
