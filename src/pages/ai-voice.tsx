import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Loader2, Mic, MicOff, PhoneOff, Upload, Volume2, VolumeX } from "lucide-react";

type Phase = "idle" | "listening" | "thinking" | "speaking" | "error";

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

// Frame type constants — must match rest_api.py
const FRAME_TEXT  = 1;
const FRAME_AUDIO = 2;
const FRAME_DONE  = 3;

/**
 * Parses the binary framed stream from /voice-stream.
 * Frame layout: [type: 1 byte][length: 4 bytes LE][data: N bytes]
 * Accumulates partial network chunks until a complete frame is available.
 */
class FrameParser {
  private buf = new Uint8Array(0);

  feed(chunk: Uint8Array): Array<{ type: number; data: Uint8Array }> {
    // Grow internal buffer
    const next = new Uint8Array(this.buf.length + chunk.length);
    next.set(this.buf);
    next.set(chunk, this.buf.length);
    this.buf = next;

    const frames: Array<{ type: number; data: Uint8Array }> = [];

    while (this.buf.length >= 5) {
      // Read 4-byte LE length manually (avoids DataView alignment issues)
      const length =
        this.buf[1] |
        (this.buf[2] << 8) |
        (this.buf[3] << 16) |
        ((this.buf[4] << 24) >>> 0);

      if (this.buf.length < 5 + length) break; // wait for more data

      frames.push({ type: this.buf[0], data: this.buf.slice(5, 5 + length) });
      this.buf = this.buf.slice(5 + length);
    }

    return frames;
  }
}

/** Convert raw int16 LE bytes → float32 samples ready for Web Audio API. */
function pcmToFloat32(raw: Uint8Array): Float32Array {
  const aligned = new ArrayBuffer(raw.length);
  new Uint8Array(aligned).set(raw);
  const int16 = new Int16Array(aligned);
  const f32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) f32[i] = int16[i] / 32768.0;
  return f32;
}

export default function AIVoicePage() {
  const API_URL = import.meta.env.VITE_API_URL || "";
  const VOICE_URL = import.meta.env.VITE_VOICE_URL || "";

  const normalizedVoiceUrl = useMemo(() => {
    const url = (VOICE_URL || API_URL).trim();
    if (!url) return "";
    return url.endsWith("/") ? url.slice(0, -1) : url;
  }, [VOICE_URL, API_URL]);

  const [phase, setPhase] = useState<Phase>("idle");
  const [micEnabled, setMicEnabled] = useState(true);
  const [speakerEnabled, setSpeakerEnabled] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState("Connecting...");

  const [interimTranscript, setInterimTranscript] = useState("");

  const [assistantText, setAssistantText] = useState("");
  const [errorText, setErrorText] = useState<string | null>(null);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [uploadStatusText, setUploadStatusText] = useState<string | null>(null);

  // Visual voice energy (from mic input).
  const volumeRef = useRef(0);
  const [volumeUi, setVolumeUi] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioObjectUrlRef = useRef<string | null>(null);
  const typingTimerRef = useRef<number | null>(null);

  // Web Audio API streaming (replaces blob-based playback)
  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamReaderRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const pdfInputRef = useRef<HTMLInputElement | null>(null);

  const recognitionRef = useRef<any>(null);
  const recognitionAvailable = useMemo(() => {
    const w = window as any;
    return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
  }, []);

  const turnIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const analyserCleanupRef = useRef<(() => void) | null>(null);
  const [micReady, setMicReady] = useState(false);
  const phaseRef = useRef<Phase>(phase);
  const micEnabledRef = useRef<boolean>(micEnabled);
  const speakerEnabledRef = useRef<boolean>(speakerEnabled);
  const speakingStartedAtRef = useRef<number>(0);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    micEnabledRef.current = micEnabled;
  }, [micEnabled]);

  useEffect(() => {
    speakerEnabledRef.current = speakerEnabled;
  }, [speakerEnabled]);

  useEffect(() => {
    if (!normalizedVoiceUrl) {
      setConnectionStatus("Missing VITE_API_URL (or VITE_VOICE_URL)");
      setPhase("error");
      return;
    }

    // Connection check (best-effort).
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${normalizedVoiceUrl}/health`, { method: "GET" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        if (cancelled) return;
        setConnectionStatus("Connected");
      } catch {
        if (cancelled) return;
        setConnectionStatus("Voice API unreachable");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [normalizedVoiceUrl]);

  useEffect(() => {
    if (!recognitionAvailable) return;

    const w = window as any;
    const SpeechRecognitionCtor = w.SpeechRecognition || w.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      // No-op; phase is driven by our state machine.
    };

    recognition.onerror = (e: any) => {
      // Avoid spamming; also browsers can throw harmless errors when stopping/starting quickly.
      console.debug("SpeechRecognition error:", e?.error || e);
    };

    let finalAccumulator = "";
    let finalizeTimer: number | null = null;

    const finalizeSoon = () => {
      if (finalizeTimer) window.clearTimeout(finalizeTimer);
      finalizeTimer = window.setTimeout(() => {
        const t = finalAccumulator.trim();
        if (!t) return;
        finalAccumulator = "";
        const nowTurn = ++turnIdRef.current;
        // Store latest transcript for UI.
        setInterimTranscript("");
        void handleUserTurn(t, nowTurn);
      }, 420);
    };

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        const txt = res[0]?.transcript || "";
        if (res.isFinal) {
          finalAccumulator += (finalAccumulator ? " " : "") + txt;
          finalizeSoon();
        } else {
          interim += txt;
        }
      }
      setInterimTranscript(interim.trim());
      // Keep final transcript field as last finalized value.
      if (!interim.trim()) {
        // don't clear finalTranscript automatically
      }
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recognitionAvailable, normalizedVoiceUrl]);

  useEffect(() => {
    // Mic volume analyser for the orb + interrupt detection (initialize once).
    let destroyed = false;
    const setup = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
        const audioContext = new AudioContextCtor();
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.8;

        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);

        const data = new Uint8Array(analyser.fftSize);

        const cleanup = () => {
          stream.getTracks().forEach((t) => t.stop());
          try {
            audioContext.close();
          } catch {
            // ignore
          }
        };
        analyserCleanupRef.current = cleanup;
        setMicReady(true);

        let lastInterruptAt = 0;

        const tick = () => {
          if (destroyed) return;

          analyser.getByteTimeDomainData(data);
          // RMS in 0..1
          let sumSq = 0;
          for (let i = 0; i < data.length; i++) {
            const v = (data[i] - 128) / 128;
            sumSq += v * v;
          }
          const rms = Math.sqrt(sumSq / data.length);
          const level = clamp01(rms * 3.2); // gain

          volumeRef.current = level;
          setVolumeUi(level);

          // Interrupt if user starts speaking during "speaking".
          if (phaseRef.current === "speaking" && micEnabledRef.current && speakerEnabledRef.current) {
            const graceOk = Date.now() - speakingStartedAtRef.current > 700;
            if (!graceOk) {
              requestAnimationFrame(tick);
              return;
            }
            if (level > 0.12) {
              const now = Date.now();
              if (now - lastInterruptAt > 650) {
                lastInterruptAt = now;
                void interruptAI();
              }
            }
          }

          requestAnimationFrame(tick);
        };

        requestAnimationFrame(tick);
      } catch (e) {
        console.debug("Mic setup failed:", e);
        setMicReady(false);
      }
    };

    void setup();

    return () => {
      destroyed = true;
      analyserCleanupRef.current?.();
      analyserCleanupRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Auto start conversation when we can.
    if (!micEnabled) return;
    if (!micReady) return;
    if (phase === "error") return;
    if (phase === "idle") {
      setPhase("listening");
      startRecognition();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [micEnabled, micReady, phase]);

  const startRecognition = () => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.start();
    } catch {
      // Some browsers throw if start is called too frequently.
    }
  };

  const stopRecognition = () => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch {
      // ignore
    }
  };

  const stopAudioPlayback = () => {
    // Cancel streaming reader — stops network transfer immediately
    if (streamReaderRef.current) {
      try { streamReaderRef.current.cancel(); } catch { /* ignore */ }
      streamReaderRef.current = null;
    }
    // Close Web Audio context — silences any scheduled buffers instantly
    if (audioCtxRef.current) {
      try { audioCtxRef.current.close(); } catch { /* ignore */ }
      audioCtxRef.current = null;
    }
    // Legacy <audio> element cleanup
    if (audioRef.current) {
      try { audioRef.current.pause(); audioRef.current.currentTime = 0; } catch { /* ignore */ }
      audioRef.current = null;
    }
    if (audioObjectUrlRef.current) {
      try { URL.revokeObjectURL(audioObjectUrlRef.current); } catch { /* ignore */ }
      audioObjectUrlRef.current = null;
    }
  };

  const interruptAI = async () => {
    // Cancel in-flight fetch and stop audio. We intentionally do not rely on
    // server-side cancellation; we just make the UI feel responsive.
    abortRef.current?.abort();
    abortRef.current = null;
    stopAudioPlayback();
    speakingStartedAtRef.current = 0;
    if (typingTimerRef.current) {
      window.clearInterval(typingTimerRef.current);
      typingTimerRef.current = null;
    }
    setAssistantText("");
    setPhase("listening");
    setErrorText(null);
    startRecognition();
  };

  const handleUserTurn = async (userText: string, turnId: number) => {
    if (!normalizedVoiceUrl || !micEnabled) return;
    if (userText.trim().length < 2) return;

    stopRecognition();
    setPhase("thinking");
    setInterimTranscript("");
    setErrorText(null);
    setAssistantText("");

    const controller = new AbortController();
    abortRef.current = controller;
    stopAudioPlayback();

    try {
      // Single request — text tokens and audio PCM arrive in the same stream.
      // The backend speaks each sentence as it finishes generating it, so
      // audio starts while the LLM is still producing the next sentence.
      const res = await fetch(`${normalizedVoiceUrl}/voice-stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText, conversation_id: "frontend-call" }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
      if (!res.body) throw new Error("No streaming body");
      if (turnIdRef.current !== turnId) return;

      // Web Audio setup
      const SAMPLE_RATE = 24000;
      const ctx = new AudioContext({ sampleRate: SAMPLE_RATE });
      // Some browsers keep AudioContext suspended until an explicit resume.
      // Without this, we can receive tokens/audio frames but still hear nothing.
      if (ctx.state !== "running") {
        try {
          await ctx.resume();
        } catch {
          // handled below by state check
        }
      }
      if (ctx.state !== "running") {
        throw new Error(
          "Audio output is blocked by the browser. Click anywhere on the page and try again."
        );
      }
      audioCtxRef.current = ctx;
      let nextTime = ctx.currentTime + 0.08; // 80 ms pre-buffer for clean start

      const frameParser = new FrameParser();
      const reader = res.body.getReader();
      streamReaderRef.current = reader;

      let firstAudio = true;
      let displayText = "";

      try {
        outer: while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (turnIdRef.current !== turnId) { reader.cancel(); break; }

          for (const frame of frameParser.feed(value)) {
            switch (frame.type) {
              case FRAME_TEXT: {
                // Token arrives from LLM — append to display text immediately
                const token = new TextDecoder().decode(frame.data);
                displayText += token;
                setAssistantText(displayText);
                // Switch from "thinking" to "speaking" on first text (audio may
                // not have started yet, but the response has begun)
                if (firstAudio) setPhase("speaking");
                break;
              }
              case FRAME_AUDIO: {
                if (!speakerEnabled) break;
                const f32 = pcmToFloat32(frame.data);
                if (f32.length === 0) break;

                // Schedule this PCM chunk gaplessly after the previous one
                const audioBuf = ctx.createBuffer(1, f32.length, SAMPLE_RATE);
                // TS libdom expects Float32Array<ArrayBuffer>; normalize to that type.
                const channelData = new Float32Array(f32.length);
                channelData.set(f32);
                audioBuf.copyToChannel(channelData, 0);
                const src = ctx.createBufferSource();
                src.buffer = audioBuf;
                src.connect(ctx.destination);
                const startAt = Math.max(nextTime, ctx.currentTime + 0.02);
                src.start(startAt);
                nextTime = startAt + audioBuf.duration;

                if (firstAudio) {
                  firstAudio = false;
                  setPhase("speaking");
                  speakingStartedAtRef.current = Date.now();
                }
                break;
              }
              case FRAME_DONE:
                break outer;
            }
          }
        }
      } finally {
        streamReaderRef.current = null;
      }

      // Wait for any remaining scheduled audio to finish, then go back to listening
      if (turnIdRef.current === turnId) {
        const msLeft = Math.max(0, (nextTime - ctx.currentTime) * 1000);
        await new Promise<void>((resolve) => {
          const tid = window.setTimeout(resolve, msLeft);
          controller.signal.addEventListener("abort", () => {
            window.clearTimeout(tid);
            resolve();
          }, { once: true });
        });

        if (turnIdRef.current === turnId) {
          setPhase("listening");
          setInterimTranscript("");
          startRecognition();
        }
      }

    } catch (e: any) {
      if (e?.name === "AbortError") return;
      console.error("handleUserTurn error:", e);
      setErrorText(e instanceof Error ? e.message : "Unable to reach the voice assistant.");
      setPhase("error");
    } finally {
      abortRef.current = null;
    }
  };

  // Draw waveform orb visualization.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
    };
    resize();

    const draw = (t: number) => {
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      const time = t / 1000;
      const vol = volumeRef.current;

      const cx = width / 2;
      const cy = height / 2;
      const radius = Math.min(width, height) * 0.28;

      const intensity =
        phase === "listening"
          ? 0.25 + vol * 0.9
          : phase === "thinking"
            ? 0.35 + 0.25 * (0.5 + 0.5 * Math.sin(time * 2.8))
            : phase === "speaking"
              ? 0.4 + 0.6 * vol
              : 0.18;

      // Outer glow.
      ctx.beginPath();
      ctx.arc(cx, cy, radius * (1.05 + intensity * 0.12), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(99, 102, 241, ${0.12 + intensity * 0.18})`;
      ctx.fill();

      // Waveform ring.
      ctx.strokeStyle = `rgba(167, 139, 250, ${0.35 + intensity * 0.35})`;
      ctx.lineWidth = Math.max(2, Math.floor(2 * dpr));
      ctx.beginPath();
      const points = 180;
      for (let i = 0; i <= points; i++) {
        const a = (i / points) * Math.PI * 2;
        const wobble =
          (phase === "listening" || phase === "speaking"
            ? (0.65 + intensity) * vol
            : 0.15) *
          Math.sin(a * 6 + time * (phase === "thinking" ? 3.2 : 9));
        const r = radius * (1.0 + wobble * 0.55);
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    const onResize = () => resize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(raf);
    };
  }, [phase]);

  const statusText =
    phase === "listening"
      ? "Listening…"
      : phase === "thinking"
        ? "Thinking…"
        : phase === "speaking"
          ? "Speaking…"
          : phase === "error"
            ? "Connection error"
            : "Idle";

  const handlePdfUpload = async (file: File) => {
    if (!normalizedVoiceUrl) {
      setErrorText("VITE_API_URL (or VITE_VOICE_URL) is not configured.");
      return;
    }
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setErrorText("Please upload a PDF file.");
      return;
    }

    const form = new FormData();
    form.append("file", file);

    try {
      setIsUploadingPdf(true);
      setUploadStatusText(`Uploading ${file.name}...`);
      setErrorText(null);

      const resp = await fetch(`${normalizedVoiceUrl}/upload-pdf`, {
        method: "POST",
        body: form,
      });

      if (!resp.ok) {
        const t = await resp.text();
        throw new Error(t || `Upload failed (HTTP ${resp.status})`);
      }

      setUploadStatusText("PDF uploaded. Ask questions and I will use the document context.");
    } catch (e) {
      console.error("PDF upload failed:", e);
      setErrorText(e instanceof Error ? e.message : "PDF upload failed.");
      setUploadStatusText(null);
    } finally {
      setIsUploadingPdf(false);
      if (pdfInputRef.current) {
        pdfInputRef.current.value = "";
      }
    }
  };

  const orbScale =
    phase === "listening"
      ? 1 + volumeUi * 0.06
      : phase === "thinking"
        ? 1 + 0.04
        : phase === "speaking"
          ? 1.08
          : 1;

  return (
    <div
      className="min-h-screen w-full relative overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, rgba(17,24,39,1) 0%, rgba(10,10,20,1) 45%, rgba(25,10,45,1) 100%)",
      }}
    >
      <style>{`
        @keyframes bgShift {
          0% { filter: hue-rotate(0deg) }
          50% { filter: hue-rotate(12deg) }
          100% { filter: hue-rotate(0deg) }
        }
        .orbBackdrop {
          background: radial-gradient(circle at 50% 40%, rgba(99,102,241,0.18), rgba(0,0,0,0) 55%),
                      radial-gradient(circle at 60% 60%, rgba(168,85,247,0.16), rgba(0,0,0,0) 50%);
          animation: bgShift 6s ease-in-out infinite;
        }
        .glass {
          background: rgba(5, 5, 15, 0.45);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.08);
        }
        @keyframes ringPulse {
          0% { transform: translate(-50%, -50%) scale(0.75); opacity: 0.0; }
          15% { opacity: 0.4; }
          100% { transform: translate(-50%, -50%) scale(1.35); opacity: 0.0; }
        }
      `}</style>

      <div className="orbBackdrop absolute inset-0" />

      <div className="relative z-10 flex flex-col min-h-screen">
        <header className="px-4 pt-4 flex items-start justify-between gap-3">
          <div>
            <div className="text-sm text-slate-300">ForeFold Assistant</div>
            <div className="text-xs text-slate-500">{connectionStatus}</div>
            {uploadStatusText ? (
              <div className="text-xs text-indigo-300 mt-1">{uploadStatusText}</div>
            ) : null}
          </div>
          <div className="flex flex-col items-end gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
              onClick={() => pdfInputRef.current?.click()}
              disabled={isUploadingPdf}
            >
              {isUploadingPdf ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              {isUploadingPdf ? "Uploading..." : "Upload PDF"}
            </Button>
            <input
              ref={pdfInputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handlePdfUpload(f);
              }}
            />
            <div className="text-xs text-slate-400 text-right">
              {phase === "speaking" || phase === "thinking"
                ? "Talk naturally, I’ll respond."
                : "Press mic and speak."}
            </div>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-4 pb-24">
          <div className="w-full max-w-lg flex flex-col items-center gap-4">
            <div className="relative w-72 h-72 sm:w-80 sm:h-80">
              {/* Rings for speaking state */}
              {phase === "speaking" ? (
                <>
                  <div
                    className="absolute left-1/2 top-1/2 rounded-full border border-indigo-400/40"
                    style={{
                      width: "110%",
                      height: "110%",
                      animation: "ringPulse 1.2s ease-out infinite",
                    }}
                  />
                  <div
                    className="absolute left-1/2 top-1/2 rounded-full border border-purple-300/35"
                    style={{
                      width: "95%",
                      height: "95%",
                      animation: "ringPulse 1.2s ease-out infinite",
                      animationDelay: "0.25s",
                    }}
                  />
                </>
              ) : null}

              <div
                className="glass rounded-full absolute inset-0"
                style={{
                  transform: `scale(${orbScale})`,
                  transition: "transform 180ms ease",
                  boxShadow:
                    phase === "listening"
                      ? `0 0 ${12 + volumeUi * 45}px rgba(99,102,241,0.35)`
                      : phase === "thinking"
                        ? "0 0 28px rgba(167,139,250,0.25)"
                        : phase === "speaking"
                          ? "0 0 42px rgba(167,139,250,0.35)"
                          : "0 0 18px rgba(99,102,241,0.18)",
                }}
              />

              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full"
              />

              {/* Status */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="glass rounded-2xl px-4 py-2 text-center">
                  <div className="text-sm sm:text-base text-white font-medium">
                    {statusText}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    {phase === "listening"
                      ? interimTranscript
                        ? `“${interimTranscript}”`
                        : "Say something…"
                      : phase === "thinking"
                        ? "Generating reply…"
                        : phase === "speaking"
                          ? "You can interrupt me."
                          : "Ready."}
                  </div>
                </div>
              </div>
            </div>

            {/* Progressive AI text (minimal, as requested) */}
            {assistantText ? (
              <div className="glass w-full rounded-2xl p-4">
                <div className="text-xs text-slate-400 mb-2">Assistant</div>
                <div className="text-sm text-slate-100 leading-relaxed">
                  {assistantText}
                </div>
              </div>
            ) : null}

            {/* Errors */}
            {errorText ? (
              <div className="glass w-full rounded-2xl p-4 border-red-400/20">
                <div className="text-sm font-medium text-red-200">Error</div>
                <div className="text-sm text-slate-300 mt-1">{errorText}</div>
              </div>
            ) : null}
          </div>
        </main>

        <footer className="absolute bottom-4 left-0 right-0 px-4">
          <div className="glass rounded-2xl mx-auto max-w-lg px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  micEnabled ? "text-indigo-300" : "text-slate-400",
                  micEnabled ? "hover:bg-indigo-500/10" : "hover:bg-white/5"
                )}
                onClick={() => {
                  setMicEnabled((v) => !v);
                  if (micEnabled) {
                    // Muting: stop listening immediately.
                    stopRecognition();
                    setPhase("idle");
                  } else {
                    if (micReady) {
                      setPhase("listening");
                      startRecognition();
                    }
                  }
                }}
                aria-label={micEnabled ? "Mute mic" : "Unmute mic"}
              >
                {micEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
              </Button>

              <div className="hidden sm:block">
                <div className="text-xs text-slate-400">Mic</div>
                <div className="text-sm text-slate-200">{micEnabled ? "On" : "Muted"}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  speakerEnabled ? "text-indigo-300" : "text-slate-400",
                  speakerEnabled ? "hover:bg-indigo-500/10" : "hover:bg-white/5"
                )}
                onClick={() => {
                  setSpeakerEnabled((v) => !v);
                  // If we disable speaker mid-call, stop audio feel-good.
                  if (speakerEnabled) {
                    stopAudioPlayback();
                    stopRecognition();
                    setPhase("listening");
                    startRecognition();
                  }
                }}
                aria-label={speakerEnabled ? "Disable speaker" : "Enable speaker"}
                title="Speaker toggle"
              >
                {speakerEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
              </Button>
            </div>

            <Button
              variant="destructive"
              size="icon"
              onClick={() => {
                abortRef.current?.abort();
                abortRef.current = null;
                stopAudioPlayback();
                stopRecognition();
                if (typingTimerRef.current) {
                  window.clearInterval(typingTimerRef.current);
                  typingTimerRef.current = null;
                }
                setAssistantText("");
                setInterimTranscript("");
                setErrorText(null);
                setPhase("idle");
              }}
              aria-label="End conversation"
              title="End conversation"
            >
              <PhoneOff className="h-5 w-5" />
            </Button>
          </div>
        </footer>
      </div>

      {!recognitionAvailable ? (
        <div className="fixed inset-0 flex items-center justify-center p-6">
          <div className="glass rounded-2xl p-6 max-w-md">
            <div className="text-sm font-medium text-slate-100">Speech Recognition not supported</div>
            <div className="text-sm text-slate-300 mt-2">
              Your browser doesn’t support the Web Speech API. Try Chrome on desktop/macOS.
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

