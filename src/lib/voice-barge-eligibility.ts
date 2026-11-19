/**
 * Auto barge-in may fire for the whole SPEAKING turn — including inter-chunk
 * TTS silence when the playback queue is empty. Uplink mute is separate.
 */
export function canAutoBargeIn(opts: {
  bargeInEnabled: boolean;
  state: string;
  remainingMs: number;
}): boolean {
  if (!opts.bargeInEnabled) return false;
  return opts.state === "SPEAKING" || opts.remainingMs > 0;
}
