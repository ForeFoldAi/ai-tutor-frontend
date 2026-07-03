/**
 * Server-side Whisper STT — records mic audio and transcribes via backend.
 */

export function shouldUseServerStt(subjectName: string): boolean {
  const flag = import.meta.env.VITE_VOICE_SERVER_STT;
  if (flag === "false") return false;
  if (flag === "true") return true;
  return subjectName.toLowerCase().includes("math");
}

/** Whisper replaces browser STT only when the browser has no SpeechRecognition API. */
export function useExclusiveServerStt(
  recognitionAvailable: boolean,
  serverSttActive: boolean,
): boolean {
  return serverSttActive && !recognitionAvailable;
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

export async function transcribeWithServer(
  audio: Blob,
  baseUrl: string,
  opts: { subjectName?: string; token?: string | null; language?: string },
): Promise<string> {
  const root = baseUrl.replace(/\/$/, "");
  const endpoint = opts.token ? `${root}/auth/voice-transcribe` : `${root}/voice-transcribe`;
  const form = new FormData();
  form.append("audio", audio, "utterance.webm");
  if (opts.subjectName) form.append("subject_name", opts.subjectName);
  form.append("language", opts.language || "en");

  const res = await fetch(endpoint, {
    method: "POST",
    headers: opts.token ? { Authorization: `Bearer ${opts.token}` } : {},
    body: form,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `Transcribe failed (${res.status})`);
  }
  const data = (await res.json()) as { transcript?: string };
  return (data.transcript || "").trim();
}

export type VoiceRecorderController = {
  start: () => void;
  stop: () => Promise<Blob>;
  isRecording: () => boolean;
};

export function createVoiceRecorder(stream: MediaStream): VoiceRecorderController {
  let recorder: MediaRecorder | null = null;
  let chunks: Blob[] = [];

  const pickMime = (): string | undefined => {
    const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"];
    for (const c of candidates) {
      if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c)) return c;
    }
    return undefined;
  };

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
