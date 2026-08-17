/**
 * Server-side Whisper STT — continuous mic ring buffer + utterance capture.
 */

const PRE_ROLL_MS_DEFAULT = 2800;
/** Barge gate clip — no tutor pre-roll (mic was playing TTS) */
export const BARGE_GATE_PRE_ROLL_MS = 0;
/** Post-interrupt question — short tail only */
export const POST_INTERRUPT_PRE_ROLL_MS = 800;

export function shouldUseServerStt(_subjectName: string): boolean {
  const flag = import.meta.env.VITE_VOICE_SERVER_STT;
  if (flag === "false") return false;
  return true;
}

/** Opt-in: Whisper captures listen-mode utterances (mobile / weak browser STT). Default off. */
export function useWhisperListenPrimary(): boolean {
  return import.meta.env.VITE_WHISPER_LISTEN_PRIMARY === "true";
}

export function isMobileVoiceClient(
  ua = typeof navigator !== "undefined" ? navigator.userAgent : "",
  touchPoints = typeof navigator !== "undefined" ? navigator.maxTouchPoints : 0,
): boolean {
  return /Android|iPhone|iPad|iPod/i.test(ua) || (touchPoints > 1 && /Macintosh/i.test(ua));
}

/** iOS MediaRecorder only delivers audio on stop — timeslice chunks stay empty. */
export function mediaRecorderNeedsStopFlush(
  ua = typeof navigator !== "undefined" ? navigator.userAgent : "",
  touchPoints = typeof navigator !== "undefined" ? navigator.maxTouchPoints : 0,
): boolean {
  return /iP(ad|hone|od)/.test(ua) || (touchPoints > 1 && /Macintosh/i.test(ua));
}

export function shouldUseWhisperListen(
  serverSttActive: boolean,
  opts: { envPrimary?: boolean; mobile?: boolean; recognitionAvailable?: boolean } = {},
): boolean {
  if (!serverSttActive) return false;
  if (opts.envPrimary) return true;
  if (opts.mobile) return true;
  if (opts.recognitionAvailable === false) return true;
  return false;
}

export function audioFileName(mimeType: string): string {
  if (/mp4|aac|m4a/i.test(mimeType)) return "utterance.mp4";
  if (/ogg/i.test(mimeType)) return "utterance.ogg";
  return "utterance.webm";
}

/** Whisper listen on mobile / no-browser-STT; barge always uses server STT. */
export function useWhisperVoiceCapture(
  serverSttActive: boolean,
  recognitionAvailable = true,
): boolean {
  return shouldUseWhisperListen(serverSttActive, {
    envPrimary: useWhisperListenPrimary(),
    mobile: isMobileVoiceClient(),
    recognitionAvailable,
  });
}

/** @deprecated Whisper is preferred for all voice capture when available. */
export function useExclusiveServerStt(
  recognitionAvailable: boolean,
  serverSttActive: boolean,
): boolean {
  return shouldUseWhisperListen(serverSttActive, { recognitionAvailable });
}

export async function fetchServerSttAvailable(baseUrl: string): Promise<boolean> {
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/voice/stt-info`);
    if (!res.ok) return false;
    const data = (await res.json()) as { available?: boolean; enabled?: boolean };
    return Boolean(data.enabled && data.available);
  } catch {
    return false;
  }
}

export type TranscribeResult = {
  transcript: string;
  confidence?: number;
  rejected?: boolean;
};

/** Reject transcripts that mostly repeat what the tutor just said (speaker echo). */
export { transcriptLikelyEcho } from "@/lib/voice-echo-guard";

export async function transcribeWithServer(
  audio: Blob,
  baseUrl: string,
  opts: {
    subjectName?: string;
    token?: string | null;
    language?: string;
    rejectIfSimilarTo?: string;
    voiceSessionId?: string;
  },
): Promise<TranscribeResult> {
  const root = baseUrl.replace(/\/$/, "");
  const endpoint = opts.token ? `${root}/auth/voice-transcribe` : `${root}/voice-transcribe`;
  const form = new FormData();
  form.append("audio", audio, audioFileName(audio.type));
  if (opts.subjectName) form.append("subject_name", opts.subjectName);
  form.append("language", opts.language || "en");
  if (opts.rejectIfSimilarTo?.trim()) {
    form.append("reject_if_similar_to", opts.rejectIfSimilarTo.trim());
  }
  if (opts.voiceSessionId?.trim()) {
    form.append("voice_session_id", opts.voiceSessionId.trim());
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers: opts.token ? { Authorization: `Bearer ${opts.token}` } : {},
    body: form,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `Transcribe failed (${res.status})`);
  }
  const data = (await res.json()) as {
    transcript?: string;
    confidence?: number;
    rejected?: boolean;
  };
  return {
    transcript: (data.transcript || "").trim(),
    confidence: data.confidence,
    rejected: data.rejected,
  };
}

export type VoiceRecorderController = {
  start: () => void;
  stop: () => Promise<Blob>;
  isRecording: () => boolean;
};

export type ContinuousMicRecorder = {
  ensureRunning: () => void;
  stop: () => void;
  beginUtteranceCapture: (opts?: { preRollMs?: number }) => void;
  endUtteranceCapture: () => Promise<Blob>;
  isCapturingUtterance: () => boolean;
};

function pickMime(): string | undefined {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/mp4;codecs=mp4a.40.2",
    "audio/ogg;codecs=opus",
    "audio/aac",
  ];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c)) return c;
  }
  return undefined;
}

/** ponytail: single MediaRecorder ring buffer — upgrade path: AudioWorklet PCM tap */
export function createContinuousMicRecorder(
  stream: MediaStream,
  preRollMs = PRE_ROLL_MS_DEFAULT,
): ContinuousMicRecorder {
  const ring: Array<{ t: number; blob: Blob }> = [];
  let recorder: MediaRecorder | null = null;
  const stopFlush = mediaRecorderNeedsStopFlush();
  let mimeType = stopFlush ? "audio/mp4" : "audio/webm";
  let capturing = false;
  let captureStartedAt = 0;
  let utteranceChunks: Blob[] = [];
  // ponytail: only the first MediaRecorder chunk has the WebM init segment
  let initSegment: Blob | null = null;

  const prune = (now: number) => {
    const cutoff = now - preRollMs;
    while (ring.length > 0 && ring[0].t < cutoff) ring.shift();
  };

  const withInitSegment = (chunks: Blob[]): Blob[] => {
    if (!initSegment || chunks.length === 0) return chunks;
    if (chunks[0] === initSegment) return chunks;
    return [initSegment, ...chunks];
  };

  const onChunk = (blob: Blob) => {
    if (blob.size === 0) return;
    if (!initSegment) initSegment = blob;
    const t = Date.now();
    ring.push({ t, blob });
    prune(t);
    if (capturing && t >= captureStartedAt) utteranceChunks.push(blob);
  };

  const startRecorder = () => {
    const mime = pickMime();
    mimeType = mime || (stopFlush ? "audio/mp4" : "audio/webm");
    initSegment = null;
    recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
    recorder.ondataavailable = (e) => onChunk(e.data);
    if (stopFlush) recorder.start();
    else recorder.start(200);
  };

  return {
    ensureRunning() {
      if (stopFlush) return;
      if (recorder && recorder.state !== "inactive") return;
      startRecorder();
    },
    stop() {
      try {
        if (recorder && recorder.state !== "inactive") recorder.stop();
      } catch {
        /* ignore */
      }
      recorder = null;
      ring.length = 0;
      capturing = false;
      utteranceChunks = [];
      initSegment = null;
    },
    beginUtteranceCapture(opts?: { preRollMs?: number }) {
      if (stopFlush) {
        utteranceChunks = [];
        initSegment = null;
        if (!recorder || recorder.state === "inactive") startRecorder();
        captureStartedAt = Date.now();
        capturing = true;
        return;
      }
      this.ensureRunning();
      captureStartedAt = Date.now();
      const roll = opts?.preRollMs ?? preRollMs;
      const cutoff = captureStartedAt - roll;
      utteranceChunks = withInitSegment(ring.filter((x) => x.t >= cutoff).map((x) => x.blob));
      capturing = true;
    },
    endUtteranceCapture() {
      if (!stopFlush) {
        capturing = false;
        return Promise.resolve(new Blob(withInitSegment(utteranceChunks), { type: mimeType }));
      }
      return new Promise((resolve) => {
        const rec = recorder;
        if (!rec || rec.state === "inactive") {
          capturing = false;
          resolve(new Blob(utteranceChunks, { type: mimeType }));
          recorder = null;
          return;
        }
        rec.onstop = () => {
          capturing = false;
          resolve(new Blob(utteranceChunks, { type: rec.mimeType || mimeType }));
          utteranceChunks = [];
          recorder = null;
        };
        try {
          rec.stop();
        } catch {
          capturing = false;
          resolve(new Blob(utteranceChunks, { type: mimeType }));
          recorder = null;
        }
      });
    },
    isCapturingUtterance() {
      return capturing;
    },
  };
}

export function createVoiceRecorder(stream: MediaStream): VoiceRecorderController {
  let recorder: MediaRecorder | null = null;
  let chunks: Blob[] = [];

  return {
    start() {
      chunks = [];
      const mime = pickMime();
      recorder = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.start(200);
    },
    stop() {
      return new Promise((resolve) => {
        const rec = recorder;
        if (!rec || rec.state === "inactive") {
          resolve(new Blob(chunks, { type: "audio/webm" }));
          return;
        }
        rec.onstop = () => {
          resolve(new Blob(chunks, { type: rec.mimeType || "audio/webm" }));
          chunks = [];
          recorder = null;
        };
        rec.stop();
      });
    },
    isRecording() {
      return recorder?.state === "recording";
    },
  };
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const raw = String(reader.result || "");
      const idx = raw.indexOf(",");
      resolve(idx >= 0 ? raw.slice(idx + 1) : raw);
    };
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.readAsDataURL(blob);
  });
}