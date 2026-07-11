/**
 * Phase 4 — client audio playback tuning.
 *
 * MediaSource append is faster than playback; these thresholds control
 * when we start play and how aggressively we recover from underflow.
 */

/** Minimum bytes received before attempting first play() */
export const AUDIO_MIN_BUFFER_BYTES = 512;

/** Delay before retrying play() after underflow (waiting/stalled) */
export const AUDIO_UNDERFLOW_POLL_MS = 40;

/** Backoff when SourceBuffer.appendBuffer throws */
export const AUDIO_APPEND_RETRY_MS = 25;

/** Auto-resume after unexpected pause mid-stream */
export const AUDIO_AUTO_RESUME_MS = 15;

/** Consider playback complete within this many seconds of duration end */
export const AUDIO_PLAYBACK_END_TOLERANCE_SEC = 0.1;

/** Safari blob fallback: batch rapid chunks before refreshing blob URL */
export const SAFARI_BLOB_DEBOUNCE_MS = 50;

/** Max SourceBuffer remove window when quota exceeded (seconds behind playhead) */
export const AUDIO_MSE_TRIM_BEHIND_SEC = 0.75;
