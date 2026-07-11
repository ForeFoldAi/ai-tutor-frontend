/**
 * Progressive MP3 playback via MediaSource (Safari blob fallback).
 *
 * Phase 4 — gapless-oriented playback:
 * - Buffers MP3 chunks ahead of the playhead
 * - Recovers from underflow (waiting/stalled) without user action
 * - Trims old MSE buffer on QuotaExceededError
 * - Safari: debounced blob URL refresh to reduce stutter between TTS units
 */

import {
  AUDIO_APPEND_RETRY_MS,
  AUDIO_AUTO_RESUME_MS,
  AUDIO_MIN_BUFFER_BYTES,
  AUDIO_MSE_TRIM_BEHIND_SEC,
  AUDIO_PLAYBACK_END_TOLERANCE_SEC,
  AUDIO_UNDERFLOW_POLL_MS,
  SAFARI_BLOB_DEBOUNCE_MS,
} from "@/lib/voice-audio-config";

const MIME = "audio/mpeg";
const LOG = "[voice-audio]";

export type Mp3PlayerStats = {
  bytesBuffered: number;
  bytesPending: number;
  queueDepth: number;
  chunksReceived: number;
  playbackStarted: boolean;
  streamEnded: boolean;
  underflowRecoveries: number;
  bufferedAheadSec: number;
};

export class Mp3StreamPlayer {
  private audio: HTMLAudioElement;
  private mediaSource: MediaSource | null = null;
  private sourceBuffer: SourceBuffer | null = null;
  private queue: ArrayBuffer[] = [];
  private pending = false;
  private destroyed = false;
  private readonly useMse: boolean;
  private blobChunks: ArrayBuffer[] = [];
  private blobUrl: string | null = null;
  private readyPromise: Promise<void> | null = null;
  private firstChunkLogged = false;
  private playbackStartedLogged = false;
  private turnT0 = performance.now();
  private streamEnded = false;
  private playbackEndWaiters: Array<() => void> = [];
  private unlocked = false;
  private allowAutoResume = true;
  private bytesBuffered = 0;
  private bytesPending = 0;
  private chunksReceived = 0;
  private underflowRecoveries = 0;
  private underflowTimer: number | null = null;
  private safariRefreshTimer: number | null = null;

  constructor() {
    this.audio = new Audio();
    this.audio.preload = "auto";
    this.audio.style.display = "none";
    if (typeof document !== "undefined") {
      document.body.appendChild(this.audio);
    }
    this.useMse =
      typeof MediaSource !== "undefined" && MediaSource.isTypeSupported(MIME);

    this.audio.addEventListener("ended", () => this.notifyIfPlaybackComplete());
    this.audio.addEventListener("timeupdate", () => this.notifyIfPlaybackComplete());

    // Underflow: decoder starved — drain pending appends and retry play immediately
    const onStarved = () => {
      void this.drainQueue();
      this.scheduleUnderflowRecovery();
    };
    this.audio.addEventListener("waiting", onStarved);
    this.audio.addEventListener("stalled", onStarved);

    this.audio.addEventListener("pause", () => {
      if (!this.allowAutoResume || this.destroyed || !this.firstChunkLogged || this.streamEnded) {
        return;
      }
      if (this.audio.ended) return;
      window.setTimeout(() => {
        if (this.destroyed || this.audio.ended || !this.audio.paused) return;
        void this.audio.play().catch(() => {});
      }, AUDIO_AUTO_RESUME_MS);
    });
  }

  stats(): Mp3PlayerStats {
    return {
      bytesBuffered: this.bytesBuffered,
      bytesPending: this.bytesPending,
      queueDepth: this.queue.length,
      chunksReceived: this.chunksReceived,
      playbackStarted: this.playbackStartedLogged,
      streamEnded: this.streamEnded,
      underflowRecoveries: this.underflowRecoveries,
      bufferedAheadSec: this.bufferedAheadSec(),
    };
  }

  /** Seconds of audio buffered ahead of current playhead (0 if unknown). */
  bufferedAheadSec(): number {
    if (this.destroyed) return 0;
    const t = this.audio.currentTime;
    const ranges = this.audio.buffered;
    for (let i = 0; i < ranges.length; i += 1) {
      if (t >= ranges.start(i) && t <= ranges.end(i)) {
        return Math.max(0, ranges.end(i) - t);
      }
    }
    return 0;
  }

  ready(): Promise<void> {
    if (this.destroyed) {
      return Promise.reject(new Error("Mp3StreamPlayer destroyed"));
    }
    if (!this.useMse) {
      return Promise.resolve();
    }
    if (!this.readyPromise) {
      this.readyPromise = this.initMse();
    }
    return this.readyPromise;
  }

  private async initMse(): Promise<void> {
    this.mediaSource = new MediaSource();
    const url = URL.createObjectURL(this.mediaSource);
    this.blobUrl = url;
    this.audio.src = url;

    await new Promise<void>((resolve, reject) => {
      const onOpen = () => {
        cleanup();
        resolve();
      };
      const onErr = () => {
        cleanup();
        reject(new Error("MediaSource failed to open"));
      };
      const cleanup = () => {
        this.mediaSource?.removeEventListener("sourceopen", onOpen);
        this.mediaSource?.removeEventListener("error", onErr);
      };
      this.mediaSource!.addEventListener("sourceopen", onOpen, { once: true });
      this.mediaSource!.addEventListener("error", onErr, { once: true });
    });

    if (this.destroyed || !this.mediaSource) return;

    this.sourceBuffer = this.mediaSource.addSourceBuffer(MIME);
    // sequence mode: back-to-back MP3 frames from multiple TTS units stitch continuously
    this.sourceBuffer.mode = "sequence";
    this.sourceBuffer.addEventListener("updateend", () => {
      this.pending = false;
      this.logPlaybackStarted();
      void this.drainQueue();
      this.tryEndStream();
      this.ensurePlaying();
      this.notifyIfPlaybackComplete();
    });

    console.debug(LOG, "MSE ready", `${(performance.now() - this.turnT0).toFixed(0)}ms`);
    void this.drainQueue();
  }

  private ensurePlaying(): void {
    if (this.destroyed || this.audio.ended) return;
    if (!this.firstChunkLogged || this.bytesBuffered < AUDIO_MIN_BUFFER_BYTES) return;
    if (this.audio.paused) {
      void this.audio.play().catch(() => {});
    }
  }

  private scheduleUnderflowRecovery(): void {
    if (this.destroyed || this.streamEnded || !this.firstChunkLogged) return;
    if (this.underflowTimer !== null) return;
    this.underflowTimer = window.setTimeout(() => {
      this.underflowTimer = null;
      if (this.destroyed || this.audio.ended || !this.audio.paused) return;
      const hasPending =
        this.queue.length > 0 || this.pending || Boolean(this.sourceBuffer?.updating);
      if (hasPending || this.bufferedAheadSec() > 0.05) {
        this.underflowRecoveries += 1;
        void this.drainQueue();
        void this.audio.play().catch(() => {});
      }
    }, AUDIO_UNDERFLOW_POLL_MS);
  }

  private logFirstChunk(): void {
    if (this.firstChunkLogged) return;
    this.firstChunkLogged = true;
    console.debug(LOG, "first chunk received", `${(performance.now() - this.turnT0).toFixed(0)}ms`);
  }

  private logPlaybackStarted(): void {
    if (this.playbackStartedLogged) return;
    if (this.audio.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
    this.playbackStartedLogged = true;
    console.debug(LOG, "playback started", `${(performance.now() - this.turnT0).toFixed(0)}ms`);
  }

  private syncPendingBytes(): void {
    this.bytesPending = this.queue.reduce((sum, c) => sum + c.byteLength, 0);
  }

  enqueue(chunk: ArrayBuffer): void {
    if (this.destroyed || chunk.byteLength === 0) return;
    this.logFirstChunk();
    this.chunksReceived += 1;
    this.bytesBuffered += chunk.byteLength;
    const data = chunk.slice(0);

    if (this.useMse) {
      void this.ready().then(() => {
        if (this.destroyed || !this.sourceBuffer) return;
        this.queue.push(data);
        this.syncPendingBytes();
        void this.drainQueue();
        this.ensurePlaying();
      });
      return;
    }

    this.blobChunks.push(data);
    this.scheduleSafariRefresh();
    if (this.streamEnded) this.notifyIfPlaybackComplete();
  }

  /** Safari: debounce blob URL rebuilds so rapid TTS chunks don't reset playhead repeatedly */
  private scheduleSafariRefresh(): void {
    if (this.safariRefreshTimer !== null) return;
    this.safariRefreshTimer = window.setTimeout(() => {
      this.safariRefreshTimer = null;
      this.refreshBlobSrc();
    }, SAFARI_BLOB_DEBOUNCE_MS);
  }

  private refreshBlobSrc(): void {
    if (this.destroyed || this.blobChunks.length === 0) return;
    const blob = new Blob(this.blobChunks, { type: MIME });
    const next = URL.createObjectURL(blob);
    const wasPlaying = !this.audio.paused && this.audio.currentTime > 0;
    const t = this.audio.currentTime;
    if (this.blobUrl) URL.revokeObjectURL(this.blobUrl);
    this.blobUrl = next;
    this.audio.src = next;
    if (wasPlaying) {
      this.audio.currentTime = Math.min(t, this.audio.duration || t);
    }
    void this.audio.play().catch(() => {});
    this.logPlaybackStarted();
  }

  private drainQueue(): void {
    if (
      this.destroyed ||
      this.pending ||
      !this.sourceBuffer ||
      this.sourceBuffer.updating ||
      this.queue.length === 0
    ) {
      return;
    }

    const next = this.queue.shift();
    if (!next) return;
    this.syncPendingBytes();

    this.pending = true;
    try {
      this.sourceBuffer.appendBuffer(next);
    } catch (err) {
      this.pending = false;
      this.queue.unshift(next);
      this.syncPendingBytes();
      this.recoverFromAppendError(err);
    }
  }

  /**
   * MSE buffer full — trim played audio behind playhead, then retry.
   * ponytail: naive trim; upgrade path: managed buffer window with timestamps.
   */
  private recoverFromAppendError(err: unknown): void {
    const name = err instanceof DOMException ? err.name : "";
    console.debug(LOG, "appendBuffer retry", name || err);

    if (
      name === "QuotaExceededError" &&
      this.sourceBuffer &&
      !this.sourceBuffer.updating &&
      this.audio.currentTime > AUDIO_MSE_TRIM_BEHIND_SEC
    ) {
      try {
        const trimEnd = this.audio.currentTime - AUDIO_MSE_TRIM_BEHIND_SEC;
        this.pending = true;
        this.sourceBuffer.remove(0, trimEnd);
        this.sourceBuffer.addEventListener(
          "updateend",
          () => {
            this.pending = false;
            void this.drainQueue();
          },
          { once: true },
        );
        return;
      } catch {
        /* fall through to timed retry */
      }
    }

    window.setTimeout(() => void this.drainQueue(), AUDIO_APPEND_RETRY_MS);
  }

  /**
   * Drop queued-but-unplayed bytes without destroying the element.
   * Used on interrupt so the next turn can reuse an unlocked player when safe.
   */
  flushPending(): void {
    this.queue = [];
    this.bytesPending = 0;
    this.streamEnded = true;
    try {
      this.audio.pause();
    } catch {
      /* ignore */
    }
    this.notifyIfPlaybackComplete();
  }

  stop(): void {
    this.allowAutoResume = false;
    this.destroyed = true;
    this.queue = [];
    this.blobChunks = [];
    this.pending = false;
    this.readyPromise = null;
    this.bytesBuffered = 0;
    this.bytesPending = 0;
    if (this.underflowTimer !== null) {
      window.clearTimeout(this.underflowTimer);
      this.underflowTimer = null;
    }
    if (this.safariRefreshTimer !== null) {
      window.clearTimeout(this.safariRefreshTimer);
      this.safariRefreshTimer = null;
    }

    try {
      this.audio.pause();
      this.audio.removeAttribute("src");
      this.audio.load();
    } catch {
      /* ignore */
    }

    try {
      this.audio.remove();
    } catch {
      /* ignore */
    }

    if (this.mediaSource?.readyState === "open") {
      try {
        this.mediaSource.endOfStream();
      } catch {
        /* ignore */
      }
    }

    if (this.blobUrl) {
      URL.revokeObjectURL(this.blobUrl);
      this.blobUrl = null;
    }

    this.mediaSource = null;
    this.sourceBuffer = null;
    const waiters = this.playbackEndWaiters.splice(0);
    for (const resolve of waiters) resolve();
  }

  resetTurnClock(): void {
    this.turnT0 = performance.now();
    this.firstChunkLogged = false;
    this.playbackStartedLogged = false;
    this.streamEnded = false;
    this.bytesBuffered = 0;
    this.bytesPending = 0;
    this.chunksReceived = 0;
    this.underflowRecoveries = 0;
  }

  signalNoMoreChunks(): void {
    if (this.destroyed) return;
    this.streamEnded = true;
    this.tryEndStream();
    this.notifyIfPlaybackComplete();
  }

  private tryEndStream(): void {
    if (!this.streamEnded || this.destroyed) return;
    if (this.queue.length > 0 || this.pending || this.sourceBuffer?.updating) return;
    if (this.mediaSource?.readyState === "open") {
      try {
        this.mediaSource.endOfStream();
      } catch {
        /* ignore */
      }
    }
  }

  private isPlaybackComplete(): boolean {
    if (this.destroyed) return true;
    if (!this.streamEnded) return false;
    if (this.queue.length > 0 || this.pending || this.sourceBuffer?.updating) return false;
    if (!this.firstChunkLogged) return true;
    if (this.audio.ended) return true;
    const d = this.audio.duration;
    if (
      Number.isFinite(d) &&
      d > 0 &&
      this.audio.currentTime >= d - AUDIO_PLAYBACK_END_TOLERANCE_SEC &&
      this.audio.paused
    ) {
      return true;
    }
    return false;
  }

  private notifyIfPlaybackComplete(): void {
    if (!this.isPlaybackComplete()) return;
    const waiters = this.playbackEndWaiters.splice(0);
    for (const resolve of waiters) resolve();
  }

  waitForPlaybackEnd(timeoutMs = 120_000): Promise<void> {
    if (this.isPlaybackComplete()) return Promise.resolve();
    return new Promise((resolve) => {
      const finish = () => {
        window.clearTimeout(timer);
        resolve();
      };
      this.playbackEndWaiters.push(finish);
      const timer = window.setTimeout(finish, timeoutMs);
    });
  }

  async unlock(): Promise<void> {
    if (this.destroyed) return;
    if (this.unlocked && (this.isPlaying() || this.firstChunkLogged)) return;
    await this.ready();
    if (this.isPlaying() || this.firstChunkLogged) {
      this.unlocked = true;
      return;
    }
    try {
      await this.audio.play();
      this.audio.pause();
      this.audio.currentTime = 0;
      this.unlocked = true;
    } catch {
      /* ignore */
    }
  }

  setAllowAutoResume(enabled: boolean): void {
    this.allowAutoResume = enabled;
  }

  remainingMs(): number {
    if (this.destroyed) return 0;
    const d = this.audio.duration;
    if (!Number.isFinite(d) || d <= 0) return 0;
    return Math.max(0, (d - this.audio.currentTime) * 1000);
  }

  isPlaying(): boolean {
    return !this.audio.paused && !this.audio.ended;
  }

  hasAudiblePlayback(): boolean {
    return this.firstChunkLogged && this.isPlaying();
  }

  get element(): HTMLAudioElement {
    return this.audio;
  }
}
