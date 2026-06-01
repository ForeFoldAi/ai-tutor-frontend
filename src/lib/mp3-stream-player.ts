/**
 * Progressive MP3 playback via MediaSource (Safari-only blob fallback).
 */

const MIME = "audio/mpeg";
const LOG = "[voice-audio]";

export class Mp3StreamPlayer {
  private audio: HTMLAudioElement;
  private mediaSource: MediaSource | null = null;
  private sourceBuffer: SourceBuffer | null = null;
  private queue: Uint8Array[] = [];
  private pending = false;
  private destroyed = false;
  private readonly useMse: boolean;
  private blobChunks: Uint8Array[] = [];
  private blobUrl: string | null = null;
  private readyPromise: Promise<void> | null = null;
  private firstChunkLogged = false;
  private playbackStartedLogged = false;
  private turnT0 = performance.now();

  constructor() {
    this.audio = new Audio();
    this.audio.preload = "auto";
    this.useMse =
      typeof MediaSource !== "undefined" && MediaSource.isTypeSupported(MIME);
  }

  /** Resolve when MediaSource + SourceBuffer are ready for appendBuffer. */
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
    this.sourceBuffer.mode = "sequence";
    this.sourceBuffer.addEventListener("updateend", () => {
      this.pending = false;
      this.logPlaybackStarted();
      void this.drainQueue();
    });

    console.debug(LOG, "MSE ready", `${(performance.now() - this.turnT0).toFixed(0)}ms`);
    void this.audio.play().catch(() => {});
    void this.drainQueue();
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

  enqueue(chunk: ArrayBuffer): void {
    if (this.destroyed || chunk.byteLength === 0) return;
    this.logFirstChunk();
    const data = new Uint8Array(chunk);

    if (this.useMse) {
      void this.ready().then(() => {
        if (this.destroyed || !this.sourceBuffer) return;
        this.queue.push(data);
        void this.drainQueue();
      });
      return;
    }

    this.blobChunks.push(data);
    this.refreshBlobSrc();
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

    this.pending = true;
    try {
      this.sourceBuffer.appendBuffer(next);
    } catch (err) {
      this.pending = false;
      this.queue.unshift(next);
      console.debug(LOG, "appendBuffer retry", err);
    }
  }

  stop(): void {
    this.destroyed = true;
    this.queue = [];
    this.blobChunks = [];
    this.pending = false;
    this.readyPromise = null;

    try {
      this.audio.pause();
      this.audio.removeAttribute("src");
      this.audio.load();
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
  }

  resetTurnClock(): void {
    this.turnT0 = performance.now();
    this.firstChunkLogged = false;
    this.playbackStartedLogged = false;
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

  get element(): HTMLAudioElement {
    return this.audio;
  }
}
