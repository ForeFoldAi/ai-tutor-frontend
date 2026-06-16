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
  private streamEnded = false;
  private playbackEndWaiters: Array<() => void> = [];
  private unlocked = false;
  private allowAutoResume = true;

  constructor() {
    this.audio = new Audio();
    this.audio.preload = "auto";
    // Attached elements play more reliably across browsers.
    this.audio.style.display = "none";
    if (typeof document !== "undefined") {
      document.body.appendChild(this.audio);
    }
    this.useMse =
      typeof MediaSource !== "undefined" && MediaSource.isTypeSupported(MIME);
    this.audio.addEventListener("ended", () => this.notifyIfPlaybackComplete());
    this.audio.addEventListener("pause", () => {
      if (!this.allowAutoResume || this.destroyed || !this.firstChunkLogged || this.streamEnded) {
        return;
      }
      if (this.audio.ended) return;
      window.setTimeout(() => {
        if (this.destroyed || this.audio.ended || !this.audio.paused) return;
        void this.audio.play().catch(() => {});
      }, 40);
    });
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
      this.tryEndStream();
      if (this.audio.paused && !this.audio.ended) {
        void this.audio.play().catch(() => {});
      }
      this.notifyIfPlaybackComplete();
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
    if (this.streamEnded) this.notifyIfPlaybackComplete();
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
    this.allowAutoResume = false;
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
  }

  /** Tell the player no more MP3 chunks will arrive for this utterance. */
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
      this.audio.currentTime >= d - 0.15 &&
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

  /** Wait until all buffered audio has finished playing. */
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

  /** Call after a user gesture to satisfy autoplay policies. */
  async unlock(): Promise<void> {
    if (this.destroyed) return;
    // Never pause/reset audio that is already playing or has buffered speech.
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
      /* ignore — first real chunk will retry play */
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

  get element(): HTMLAudioElement {
    return this.audio;
  }
}
