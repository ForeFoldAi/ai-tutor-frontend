/**
 * Tiny pure helpers shared across voice hooks.
 * No React imports — safe to import anywhere.
 */
import type { MutableRefObject } from "react";
import { Mp3StreamPlayer } from "@/lib/mp3-stream-player";
import { useAuthStore } from "@/lib/auth-store";

export const FRAME_TEXT = 1;
export const FRAME_AUDIO = 2;
export const FRAME_DONE = 3;
export const FRAME_IMAGES = 4;
export const FRAME_TUTOR_HINT = 5;
export const FRAME_TUTOR_STATE = 6;
export const FRAME_MATH_LESSON = 7;
export const FRAME_SCIENCE_EXPERIMENT = 8;

export class FrameParser {
  private buf = new Uint8Array(0);
  feed(chunk: Uint8Array): Array<{ type: number; data: Uint8Array }> {
    const next = new Uint8Array(this.buf.length + chunk.length);
    next.set(this.buf);
    next.set(chunk, this.buf.length);
    this.buf = next;
    const frames: Array<{ type: number; data: Uint8Array }> = [];
    while (this.buf.length >= 5) {
      const length =
        this.buf[1] | (this.buf[2] << 8) | (this.buf[3] << 16) | ((this.buf[4] << 24) >>> 0);
      if (this.buf.length < 5 + length) break;
      frames.push({ type: this.buf[0], data: this.buf.slice(5, 5 + length) });
      this.buf = this.buf.slice(5 + length);
    }
    return frames;
  }
}

export function getAccessToken(): string {
  try {
    const storeToken = useAuthStore.getState().token;
    if (storeToken) return storeToken;
  } catch {
    /* store not ready */
  }
  return (
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    sessionStorage.getItem("access_token") ||
    sessionStorage.getItem("token") ||
    ""
  );
}

export function tutorIsSpeaking(player: Mp3StreamPlayer | null | undefined): boolean {
  return Boolean(player?.hasAudiblePlayback());
}

export function isTutorAudible(
  wsPlayer: Mp3StreamPlayer | null | undefined,
  fallbackPlayer: Mp3StreamPlayer | null | undefined,
): boolean {
  return tutorIsSpeaking(wsPlayer) || tutorIsSpeaking(fallbackPlayer);
}

export function setTutorPlaybackVolume(
  wsPlayer: Mp3StreamPlayer | null | undefined,
  fallbackPlayer: Mp3StreamPlayer | null | undefined,
  volume: number,
): void {
  try {
    if (wsPlayer?.element) wsPlayer.element.volume = volume;
    if (fallbackPlayer?.element) fallbackPlayer.element.volume = volume;
  } catch {
    /* ignore */
  }
}

export function isStaleAssistantStream(
  streamEpochRef: MutableRefObject<number>,
  activeQuestionEpochRef: MutableRefObject<number>,
): boolean {
  return streamEpochRef.current !== activeQuestionEpochRef.current;
}

export const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
