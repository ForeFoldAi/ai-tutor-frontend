import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { API_BASE } from "@/api";
import { useAuthStore } from "@/lib/auth-store";
import { Mp3StreamPlayer } from "@/lib/mp3-stream-player";
import { ArrowLeft, BookOpen, Loader2, Mic, MicOff, PhoneOff, Upload, Volume2, VolumeX } from "lucide-react";

type Phase = "idle" | "listening" | "thinking" | "speaking" | "error";

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

// ── Legacy POST fallback: binary frame parser ─────────────────────────────────
// Frame layout: [type: 1 byte][length: 4 bytes LE][data: N bytes]
const FRAME_TEXT  = 1;
const FRAME_AUDIO = 2;
const FRAME_DONE  = 3;
const FRAME_IMAGES = 4;

type VoiceRelatedImage = { url: string; caption?: string | null; page?: number | null };

function textbookImageSrc(relativeUrl: string, accessToken?: string | null): string {
  if (!relativeUrl) return "";
  let u =
    relativeUrl.startsWith("http://") || relativeUrl.startsWith("https://")
      ? relativeUrl
      : `${API_BASE}${relativeUrl.startsWith("/") ? "" : "/"}${relativeUrl}`;
  if (accessToken) {
    u += `${u.includes("?") ? "&" : "?"}access_token=${encodeURIComponent(accessToken)}`;
  }
  return u;
}

class FrameParser {
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

// ── Auth token ────────────────────────────────────────────────────────────────
function getAccessToken(): string {
  return (
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    sessionStorage.getItem("access_token") ||
    sessionStorage.getItem("token") ||
    ""
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function AIVoicePage() {
  const [, setLocation] = useLocation();
  const { token: accessToken } = useAuthStore();
  const API_URL   = import.meta.env.VITE_API_URL   || "";
  const VOICE_URL = import.meta.env.VITE_VOICE_URL || "";

  const chapterCtx = useMemo(() => {
    const params      = new URLSearchParams(window.location.search);
    const board       = params.get("board");
    const classLevel  = params.get("class");
    const subject     = params.get("subject");
    const chaptersRaw = params.get("chapters");
    if (!board || !classLevel || !subject || !chaptersRaw) return null;
    return {
      board,
      classLevel,
      subject,
      chapterIds:   chaptersRaw.split(",").filter(Boolean),
      chapterNames: (params.get("chapterNames") || "").split("||").filter(Boolean),
    };
  }, []);

  const normalizedVoiceUrl = useMemo(() => {
    const url = (VOICE_URL || API_URL).trim();
    return url.endsWith("/") ? url.slice(0, -1) : url;
  }, [VOICE_URL, API_URL]);

  const normalizedUploadUrl = useMemo(() => {
    const url = (API_URL || VOICE_URL).trim();
    return url.endsWith("/") ? url.slice(0, -1) : url;
  }, [API_URL, VOICE_URL]);

  // ── UI state ────────────────────────────────────────────────────────────────
  const [phase,            setPhase]            = useState<Phase>("idle");
  const [micEnabled,       setMicEnabled]       = useState(true);
  const [speakerEnabled,   setSpeakerEnabled]   = useState(true);
  const [connectionStatus, setConnectionStatus] = useState("Connecting...");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [assistantText,    setAssistantText]    = useState("");
  const [errorText,        setErrorText]        = useState<string | null>(null);
  const [isUploadingPdf,    setIsUploadingPdf]    = useState(false);
  const [uploadStatusText,  setUploadStatusText]  = useState<string | null>(null);
  const [lastHeardQuery,    setLastHeardQuery]    = useState<string | null>(null);
  const [currentSentence,   setCurrentSentence]   = useState<string>("");
  const [voiceRelatedImages, setVoiceRelatedImages] = useState<VoiceRelatedImage[]>([]);

  // ── Refs ────────────────────────────────────────────────────────────────────
  const volumeRef            = useRef(0);
  const [volumeUi, setVolumeUi] = useState(0);
  const canvasRef            = useRef<HTMLCanvasElement | null>(null);

  // WebSocket (primary path)
  const wsRef                = useRef<WebSocket | null>(null);
  const wsReadyRef           = useRef(false);
  const reconnectTimerRef    = useRef<number | null>(null);
  // Prevents stale onclose from firing reconnect in React StrictMode
  // (StrictMode mounts twice; the first WS close must not loop-reconnect)
  const wsActiveRef          = useRef(0); // generation counter

  const mp3PlayerRef         = useRef<Mp3StreamPlayer | null>(null);

  // POST fallback refs
  const abortRef             = useRef<AbortController | null>(null);
  const streamReaderRef      = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const fallbackMp3Ref       = useRef<Mp3StreamPlayer | null>(null);
  const typingTimerRef       = useRef<number | null>(null);

  const pdfInputRef          = useRef<HTMLInputElement | null>(null);
  const recognitionRef       = useRef<any>(null);

  const turnIdRef            = useRef(0);
  const analyserCleanupRef   = useRef<(() => void) | null>(null);
  const [micReady, setMicReady] = useState(false);

  const phaseRef           = useRef<Phase>(phase);
  const micEnabledRef      = useRef<boolean>(micEnabled);
  const speakerEnabledRef  = useRef<boolean>(speakerEnabled);
  const speakingStartedAtRef = useRef<number>(0);

  useEffect(() => { phaseRef.current = phase; },          [phase]);
  useEffect(() => { micEnabledRef.current = micEnabled; }, [micEnabled]);
  useEffect(() => { speakerEnabledRef.current = speakerEnabled; }, [speakerEnabled]);

  const resetMp3Player = useCallback(() => {
    mp3PlayerRef.current?.stop();
    const player = new Mp3StreamPlayer();
    player.resetTurnClock();
    mp3PlayerRef.current = player;
    void player.ready().catch(() => {});
  }, []);

  const enqueueMp3Chunk = useCallback((raw: ArrayBuffer) => {
    if (!speakerEnabledRef.current || raw.byteLength === 0) return;
    if (!mp3PlayerRef.current) {
      const player = new Mp3StreamPlayer();
      player.resetTurnClock();
      mp3PlayerRef.current = player;
      void player.ready().catch(() => {});
    }
    const player = mp3PlayerRef.current;
    void player.ready().then(() => player.enqueue(raw));
    if (phaseRef.current !== "speaking") {
      setPhase("speaking");
      speakingStartedAtRef.current = Date.now();
    }
  }, []);

  // ── Health check ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!normalizedVoiceUrl) {
      setConnectionStatus("Missing VITE_API_URL");
      setPhase("error");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${normalizedVoiceUrl}/health`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        if (!cancelled) setConnectionStatus("Connected");
      } catch {
        if (!cancelled) setConnectionStatus("Voice API unreachable");
      }
    })();
    return () => { cancelled = true; };
  }, [normalizedVoiceUrl]);

  // ── WebSocket connection ────────────────────────────────────────────────────
  const connectWS = useCallback(() => {
    if (!normalizedVoiceUrl) return;
    if (reconnectTimerRef.current) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    // Guard: skip if a connection is already open / connecting
    if (wsRef.current && wsRef.current.readyState <= WebSocket.OPEN) return;

    // Bump generation so stale onclose handlers from React StrictMode
    // double-mount can self-identify and skip the reconnect logic.
    const myGen = ++wsActiveRef.current;

    const httpBase = normalizedVoiceUrl;
    const wsBase   = httpBase.startsWith("https://")
      ? httpBase.replace("https://", "wss://")
      : httpBase.replace("http://", "ws://");
    const wsUrl  = `${wsBase}/ws/voice`;
    const token  = getAccessToken();
    const fullUrl = token ? `${wsUrl}?token=${encodeURIComponent(token)}` : wsUrl;

    const ws = new WebSocket(fullUrl);
    ws.binaryType = "arraybuffer";
    wsRef.current = ws;

    ws.onopen = () => {
      wsReadyRef.current = true;
      setConnectionStatus("Connected");
      ws.send(JSON.stringify({
        type:         "session_start",
        board:        chapterCtx?.board        || "",
        class_level:  chapterCtx?.classLevel   || "",
        subject_name: chapterCtx?.subject      || "",
        chapter_ids:  chapterCtx?.chapterIds   || null,
        chapter:      chapterCtx?.chapterNames?.[0] || "",
        chapter_names: chapterCtx?.chapterNames || [],
      }));
    };

    ws.onmessage = async (event) => {
      if (event.data instanceof ArrayBuffer) {
        enqueueMp3Chunk(event.data);
        return;
      }

      // Text frame → JSON control message
      let msg: Record<string, any>;
      try { msg = JSON.parse(event.data as string); }
      catch { return; }

      switch (msg.type) {
        case "thinking":
          setPhase("thinking");
          setAssistantText("");
          setCurrentSentence("");
          setVoiceRelatedImages([]);
          resetMp3Player();
          break;

        case "related_images": {
          const raw = msg.images;
          const imgs = Array.isArray(raw) ? raw.filter((x: unknown) => x && typeof x === "object") as VoiceRelatedImage[] : [];
          setVoiceRelatedImages(imgs);
          break;
        }

        case "speaking":
          setPhase("speaking");
          speakingStartedAtRef.current = Date.now();
          break;

        case "ai_text_token": {
          const tok = msg.token ?? "";
          setAssistantText(prev => prev + tok);
          // Track current sentence for the orb caption
          setCurrentSentence(prev => {
            const next = prev + tok;
            return /[.?!]\s*$/.test(next) ? "" : next;
          });
          if (phaseRef.current === "thinking") setPhase("speaking");
          break;
        }

        case "interrupt_ack":
          mp3PlayerRef.current?.stop();
          mp3PlayerRef.current = null;
          break;

        case "done": {
          setCurrentSentence("");
          const audioMs = mp3PlayerRef.current?.remainingMs() ?? 0;
          const delay = Math.max(audioMs, 2500);
          setTimeout(() => {
            if (phaseRef.current === "speaking" || phaseRef.current === "thinking") {
              setPhase("listening");
              setInterimTranscript("");
              startRecognition();
            }
          }, delay);
          break;
        }

        case "listening":
          setPhase("listening");
          break;

        case "error":
          setErrorText(msg.message || "Voice assistant error.");
          setPhase("error");
          break;

        case "ping":
          ws.send(JSON.stringify({ type: "pong" }));
          break;
      }
    };

    ws.onerror = () => {
      wsReadyRef.current = false;
      setConnectionStatus("WebSocket error");
    };

    ws.onclose = () => {
      wsReadyRef.current = false;
      // Only act on the close if this connection is still the active one.
      // In React StrictMode the first effect's WS is closed by cleanup before
      // the second effect runs — that stale close must not trigger a reconnect.
      if (myGen !== wsActiveRef.current) return;
      wsRef.current = null;
      if (phaseRef.current === "error") return;
      setConnectionStatus("Reconnecting…");
      reconnectTimerRef.current = window.setTimeout(connectWS, 2500);
    };
  }, [normalizedVoiceUrl, chapterCtx, enqueueMp3Chunk, resetMp3Player]);   // eslint-disable-line

  useEffect(() => {
    if (!normalizedVoiceUrl) return;
    connectWS();
    return () => {
      if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);
      // Bump generation BEFORE close so onclose sees a stale gen and skips reconnect
      wsActiveRef.current++;
      wsRef.current?.close();
      wsRef.current = null;
      wsReadyRef.current = false;
    };
  }, [connectWS]);   // eslint-disable-line

  // ── SpeechRecognition ───────────────────────────────────────────────────────
  const recognitionAvailable = useMemo(() => {
    const w = window as any;
    return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
  }, []);

  useEffect(() => {
    if (!recognitionAvailable) return;
    const w   = window as any;
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    const rec  = new Ctor();
    rec.continuous      = true;
    rec.interimResults  = true;
    rec.lang            = "en-US";
    rec.onerror         = (e: any) => console.debug("STT error:", e?.error || e);

    let finalAccumulator = "";
    let finalizeTimer: number | null = null;

    const finalizeSoon = () => {
      if (finalizeTimer) window.clearTimeout(finalizeTimer);
      finalizeTimer = window.setTimeout(() => {
        const t = finalAccumulator.trim();
        if (!t) return;
        finalAccumulator = "";
        const nowTurn = ++turnIdRef.current;
        setInterimTranscript("");
        void handleUserTurn(t, nowTurn);
      }, 420);
    };

    rec.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r   = event.results[i];
        const txt = r[0]?.transcript || "";
        if (r.isFinal) {
          finalAccumulator += (finalAccumulator ? " " : "") + txt;
          finalizeSoon();
        } else {
          interim += txt;
        }
      }
      setInterimTranscript(interim.trim());
    };

    recognitionRef.current = rec;
    return () => {
      try { rec.stop(); } catch { /* ignore */ }
      recognitionRef.current = null;
    };
  }, [recognitionAvailable]);   // eslint-disable-line

  // ── Mic volume analyser (orb + interrupt detection) ──────────────────────────
  useEffect(() => {
    let destroyed = false;
    (async () => {
      try {
        const stream  = await navigator.mediaDevices.getUserMedia({ audio: true });
        const Ctor    = window.AudioContext || (window as any).webkitAudioContext;
        const micCtx  = new Ctor();
        const analyser = micCtx.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.8;
        micCtx.createMediaStreamSource(stream).connect(analyser);
        const data = new Uint8Array(analyser.fftSize);
        analyserCleanupRef.current = () => {
          stream.getTracks().forEach(t => t.stop());
          try { micCtx.close(); } catch { /* ignore */ }
        };
        setMicReady(true);
        let lastInterruptAt = 0;
        const tick = () => {
          if (destroyed) return;
          analyser.getByteTimeDomainData(data);
          let sumSq = 0;
          for (let i = 0; i < data.length; i++) { const v = (data[i] - 128) / 128; sumSq += v * v; }
          const level = clamp01(Math.sqrt(sumSq / data.length) * 3.2);
          volumeRef.current = level;
          setVolumeUi(level);
          if (phaseRef.current === "speaking" && micEnabledRef.current && speakerEnabledRef.current) {
            if (Date.now() - speakingStartedAtRef.current > 700 && level > 0.12) {
              const now = Date.now();
              if (now - lastInterruptAt > 650) { lastInterruptAt = now; void interruptAI(); }
            }
          }
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      } catch (e) { console.debug("Mic setup failed:", e); setMicReady(false); }
    })();
    return () => {
      destroyed = true;
      analyserCleanupRef.current?.();
      analyserCleanupRef.current = null;
    };
  }, []);   // eslint-disable-line

  useEffect(() => {
    if (!micEnabled || !micReady || phase === "error") return;
    if (phase === "idle") { setPhase("listening"); startRecognition(); }
  }, [micEnabled, micReady, phase]);   // eslint-disable-line

  const startRecognition = () => {
    if (!recognitionRef.current) return;
    try { recognitionRef.current.start(); } catch { /* ignore */ }
  };
  const stopRecognition = () => {
    if (!recognitionRef.current) return;
    try { recognitionRef.current.stop(); } catch { /* ignore */ }
  };

  const stopAudioPlayback = () => {
    if (streamReaderRef.current) {
      try { streamReaderRef.current.cancel(); } catch { /* ignore */ }
      streamReaderRef.current = null;
    }
    mp3PlayerRef.current?.stop();
    mp3PlayerRef.current = null;
    fallbackMp3Ref.current?.stop();
    fallbackMp3Ref.current = null;
  };

  // ── Interrupt (barge-in) ────────────────────────────────────────────────────
  const interruptAI = async () => {
    // Tell backend to cancel generation
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "interrupt" }));
    }
    abortRef.current?.abort();
    abortRef.current = null;
    stopAudioPlayback();
    speakingStartedAtRef.current = 0;
    if (typingTimerRef.current) { window.clearInterval(typingTimerRef.current); typingTimerRef.current = null; }
    setAssistantText("");
    setVoiceRelatedImages([]);
    setPhase("listening");
    setErrorText(null);
    startRecognition();
  };

  // ── Main turn handler ───────────────────────────────────────────────────────
  const handleUserTurn = async (userText: string, turnId: number) => {
    if (!normalizedVoiceUrl || !micEnabled) return;
    if (userText.trim().length < 2) return;

    stopRecognition();
    setPhase("thinking");
    setInterimTranscript("");
    setErrorText(null);
    setAssistantText("");
    setVoiceRelatedImages([]);
    setLastHeardQuery(userText.trim());
    stopAudioPlayback();

    if (wsRef.current?.readyState === WebSocket.OPEN && wsReadyRef.current) {
      resetMp3Player();
      console.debug("[voice] question sent", performance.now());
      wsRef.current.send(JSON.stringify({ type: "question", text: userText.trim() }));
      return;
    }

    // ── FALLBACK PATH: legacy POST binary stream ──────────────────────────────
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const voiceEndpoint = chapterCtx
        ? `${normalizedVoiceUrl}/auth/voice-stream`
        : `${normalizedVoiceUrl}/voice-stream`;

      const body: Record<string, unknown> = { message: userText, conversation_id: "frontend-call" };
      if (chapterCtx) {
        body.board        = chapterCtx.board;
        body.class_level  = chapterCtx.classLevel;
        body.subject_name = chapterCtx.subject;
        body.chapter_ids  = chapterCtx.chapterIds;
        body.chapter      = chapterCtx.chapterNames?.[0] || "";
        body.chapter_names = chapterCtx.chapterNames;
      }

      const res = await fetch(voiceEndpoint, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
        signal:  controller.signal,
      });
      if (!res.ok)   throw new Error((await res.text()) || `HTTP ${res.status}`);
      if (!res.body) throw new Error("No streaming body");
      if (turnIdRef.current !== turnId) return;

      const frameParser = new FrameParser();
      const reader      = res.body.getReader();
      streamReaderRef.current = reader;
      const fallbackPlayer = new Mp3StreamPlayer();
      fallbackPlayer.resetTurnClock();
      fallbackMp3Ref.current = fallbackPlayer;
      await fallbackPlayer.ready();
      let firstAudio  = true;
      let displayText = "";

      try {
        outer: while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (turnIdRef.current !== turnId) { reader.cancel(); break; }
          for (const frame of frameParser.feed(value)) {
            switch (frame.type) {
              case FRAME_TEXT: {
                const token = new TextDecoder().decode(frame.data);
                displayText += token;
                setAssistantText(displayText);
                if (firstAudio) setPhase("speaking");
                break;
              }
              case FRAME_IMAGES: {
                try {
                  const parsed = JSON.parse(new TextDecoder().decode(frame.data)) as unknown;
                  const imgs = Array.isArray(parsed)
                    ? (parsed.filter((x) => x && typeof x === "object") as VoiceRelatedImage[])
                    : [];
                  setVoiceRelatedImages(imgs);
                } catch { /* ignore */ }
                break;
              }
              case FRAME_AUDIO: {
                if (!speakerEnabled) break;
                const copy = new Uint8Array(frame.data).buffer;
                fallbackPlayer.enqueue(copy);
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

      if (turnIdRef.current === turnId) {
        const audioMs = fallbackMp3Ref.current?.remainingMs() ?? 0;
        const delay   = Math.max(audioMs, 2500);
        await new Promise<void>(resolve => {
          const tid = window.setTimeout(resolve, delay);
          controller.signal.addEventListener("abort", () => { window.clearTimeout(tid); resolve(); }, { once: true });
        });
        if (turnIdRef.current === turnId) {
          setPhase("listening");
          setInterimTranscript("");
          startRecognition();
        }
      }
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      console.error("handleUserTurn fallback error:", e);
      setErrorText(e instanceof Error ? e.message : "Unable to reach the voice assistant.");
      setPhase("error");
    } finally {
      abortRef.current = null;
    }
  };

  // ── Waveform orb canvas ─────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      canvas.width  = Math.floor(r.width  * dpr);
      canvas.height = Math.floor(r.height * dpr);
    };
    resize();
    const draw = (t: number) => {
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);
      const time = t / 1000, vol = volumeRef.current;
      const cx = width / 2, cy = height / 2;
      const radius = Math.min(width, height) * 0.28;
      const intensity =
        phase === "listening" ? 0.25 + vol * 0.9
        : phase === "thinking" ? 0.35 + 0.25 * (0.5 + 0.5 * Math.sin(time * 2.8))
        : phase === "speaking" ? 0.4 + 0.6 * vol
        : 0.18;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * (1.05 + intensity * 0.12), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(99,102,241,${0.12 + intensity * 0.18})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(167,139,250,${0.35 + intensity * 0.35})`;
      ctx.lineWidth   = Math.max(2, Math.floor(2 * dpr));
      ctx.beginPath();
      const pts = 180;
      for (let i = 0; i <= pts; i++) {
        const a = (i / pts) * Math.PI * 2;
        const wobble = (phase === "listening" || phase === "speaking" ? (0.65 + intensity) * vol : 0.15)
          * Math.sin(a * 6 + time * (phase === "thinking" ? 3.2 : 9));
        const r = radius * (1.0 + wobble * 0.55);
        i === 0 ? ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r)
                : ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.stroke();
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    window.addEventListener("resize", resize);
    return () => { window.removeEventListener("resize", resize); cancelAnimationFrame(raf); };
  }, [phase]);

  // ── PDF upload (for standalone voice mode) ──────────────────────────────────
  const handlePdfUpload = async (file: File) => {
    if (!normalizedUploadUrl) { setErrorText("VITE_API_URL is not configured."); return; }
    if (!file.name.toLowerCase().endsWith(".pdf")) { setErrorText("Please upload a PDF file."); return; }
    const form = new FormData();
    form.append("file", file);
    try {
      setIsUploadingPdf(true);
      setUploadStatusText(`Uploading ${file.name}…`);
      setErrorText(null);
      const resp = await fetch(`${normalizedUploadUrl}/upload`, { method: "POST", body: form });
      if (!resp.ok) throw new Error((await resp.text()) || `HTTP ${resp.status}`);
      let hint = "";
      try { const d = await resp.json(); if (typeof d.chunks === "number") hint = ` (${d.chunks} chunks)`; } catch { /* ignore */ }
      setUploadStatusText(`PDF uploaded${hint}. Ask me anything about it.`);
    } catch (e) {
      setErrorText(e instanceof Error ? e.message : "PDF upload failed.");
      setUploadStatusText(null);
    } finally {
      setIsUploadingPdf(false);
      if (pdfInputRef.current) pdfInputRef.current.value = "";
    }
  };

  // ── Derived values ──────────────────────────────────────────────────────────
  const statusText =
    phase === "listening" ? "Listening…"
    : phase === "thinking" ? "Thinking…"
    : phase === "speaking" ? "Speaking…"
    : phase === "error"   ? "Connection error"
    : "Idle";

  const orbScale =
    phase === "listening" ? 1 + volumeUi * 0.06
    : phase === "thinking" ? 1.04
    : phase === "speaking" ? 1.08
    : 1;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen w-full relative overflow-hidden"
      style={{ background: "linear-gradient(135deg,rgba(17,24,39,1) 0%,rgba(10,10,20,1) 45%,rgba(25,10,45,1) 100%)" }}
    >
      <style>{`
        @keyframes bgShift { 0%{filter:hue-rotate(0deg)} 50%{filter:hue-rotate(12deg)} 100%{filter:hue-rotate(0deg)} }
        .orbBackdrop {
          background: radial-gradient(circle at 50% 40%,rgba(99,102,241,.18),rgba(0,0,0,0) 55%),
                      radial-gradient(circle at 60% 60%,rgba(168,85,247,.16),rgba(0,0,0,0) 50%);
          animation: bgShift 6s ease-in-out infinite;
        }
        .glass { background:rgba(5,5,15,.45); backdrop-filter:blur(10px); border:1px solid rgba(255,255,255,.08); }
        @keyframes ringPulse {
          0%{transform:translate(-50%,-50%) scale(.75);opacity:0}
          15%{opacity:.4}
          100%{transform:translate(-50%,-50%) scale(1.35);opacity:0}
        }
      `}</style>

      <div className="orbBackdrop absolute inset-0" />

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header */}
        <header className="px-4 pt-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            {chapterCtx && (
              <Button variant="ghost" size="icon"
                className="h-7 w-7 shrink-0 text-slate-300 hover:text-white hover:bg-white/10 mt-0.5"
                onClick={() => setLocation("/ai-learning-studio")}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div>
              <div className="text-sm text-slate-300">
                {chapterCtx ? (
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5" />
                    {chapterCtx.subject}
                    <span className="text-slate-500 font-normal">
                      &middot; {chapterCtx.board} &middot; {chapterCtx.classLevel.replace("CLASS_", "Class ")}
                    </span>
                  </span>
                ) : "ForeFold Assistant"}
              </div>
              {chapterCtx ? (
                <div className="flex flex-wrap gap-1 mt-1">
                  {chapterCtx.chapterNames.map((name, i) => (
                    <Badge key={i} variant="secondary"
                      className="text-[10px] py-0 bg-white/10 text-slate-300 border-white/10">
                      {name}
                    </Badge>
                  ))}
                </div>
              ) : (
                <>
                  <div className="text-xs text-slate-500">{connectionStatus}</div>
                  {uploadStatusText && <div className="text-xs text-indigo-300 mt-1">{uploadStatusText}</div>}
                </>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <Button variant="outline" size="sm"
              className="border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
              onClick={() => pdfInputRef.current?.click()} disabled={isUploadingPdf}
            >
              {isUploadingPdf ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              {isUploadingPdf ? "Uploading…" : "Upload PDF"}
            </Button>
            <input ref={pdfInputRef} type="file" accept="application/pdf,.pdf" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) void handlePdfUpload(f); }} />
            <div className="text-xs text-slate-400 text-right">
              {phase === "speaking" || phase === "thinking" ? "Talk naturally, I'll respond." : "Press mic and speak."}
            </div>
          </div>
        </header>

        {/* Main orb */}
        <main className="flex-1 flex items-center justify-center px-4 pb-24">
          <div className="w-full max-w-lg flex flex-col items-center gap-4">
            <div className="relative w-72 h-72 sm:w-80 sm:h-80">
              {phase === "speaking" && (
                <>
                  <div className="absolute left-1/2 top-1/2 rounded-full border border-indigo-400/40"
                    style={{ width:"110%",height:"110%",animation:"ringPulse 1.2s ease-out infinite" }} />
                  <div className="absolute left-1/2 top-1/2 rounded-full border border-purple-300/35"
                    style={{ width:"95%",height:"95%",animation:"ringPulse 1.2s ease-out infinite",animationDelay:"0.25s" }} />
                </>
              )}

              <div className="glass rounded-full absolute inset-0" style={{
                transform: `scale(${orbScale})`,
                transition: "transform 180ms ease",
                boxShadow:
                  phase === "listening" ? `0 0 ${12 + volumeUi * 45}px rgba(99,102,241,.35)`
                  : phase === "thinking" ? "0 0 28px rgba(167,139,250,.25)"
                  : phase === "speaking" ? "0 0 42px rgba(167,139,250,.35)"
                  : "0 0 18px rgba(99,102,241,.18)",
              }} />
              <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="glass rounded-2xl px-4 py-2 text-center max-w-[85%]">
                  <div className="text-sm sm:text-base text-white font-medium">{statusText}</div>
                  <div className="text-[11px] text-slate-400 mt-1 leading-snug">
                    {phase === "listening"
                      ? interimTranscript ? `"${interimTranscript}"` : "Say something…"
                      : phase === "thinking"
                      ? "Searching your chapter…"
                      : phase === "speaking" && currentSentence
                      ? <span className="text-indigo-200">{currentSentence}</span>
                      : phase === "speaking"
                      ? "You can interrupt me."
                      : "Ready."}
                  </div>
                </div>
              </div>
            </div>

            {(assistantText || lastHeardQuery) && (
              <div className="glass w-full rounded-2xl p-4 max-h-48 overflow-y-auto">
                {lastHeardQuery && (
                  <div className="flex items-start gap-1.5 mb-3">
                    <span className="text-[10px] uppercase tracking-wide text-slate-500 pt-0.5 shrink-0">You</span>
                    <span className="text-xs text-slate-400 italic">{lastHeardQuery}</span>
                  </div>
                )}
                {assistantText && (
                  <div className="flex items-start gap-1.5">
                    <span className="text-[10px] uppercase tracking-wide text-indigo-400 pt-0.5 shrink-0">AI</span>
                    <div className="text-sm text-slate-100 leading-relaxed">
                      {assistantText}
                      {(phase === "speaking" || phase === "thinking") && (
                        <span className="inline-block w-1.5 h-3.5 bg-indigo-400 ml-0.5 align-middle animate-pulse" />
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {voiceRelatedImages.length > 0 && (
              <div className="glass w-full rounded-2xl p-3 max-h-40 overflow-x-auto overflow-y-hidden">
                <div className="text-[10px] uppercase tracking-wide text-slate-500 mb-2">Textbook figures</div>
                <div className="flex gap-2 pb-1">
                  {voiceRelatedImages.map((img, idx) => (
                    <div key={`${img.url}-${idx}`} className="shrink-0 w-28 rounded-lg border border-white/10 overflow-hidden bg-black/30">
                      <img
                        src={textbookImageSrc(img.url, accessToken)}
                        alt={img.caption || `Figure ${idx + 1}`}
                        className="w-full h-20 object-contain"
                        loading="lazy"
                      />
                      {(img.caption || img.page) && (
                        <div className="text-[9px] text-slate-400 px-1 py-0.5 line-clamp-2">
                          {img.caption || `Page ${img.page ?? ""}`}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {errorText && (
              <div className="glass w-full rounded-2xl p-4 border-red-400/20">
                <div className="text-sm font-medium text-red-200">Error</div>
                <div className="text-sm text-slate-300 mt-1">{errorText}</div>
              </div>
            )}
          </div>
        </main>

        {/* Footer controls */}
        <footer className="absolute bottom-4 left-0 right-0 px-4">
          <div className="glass rounded-2xl mx-auto max-w-lg px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon"
                className={cn(micEnabled ? "text-indigo-300 hover:bg-indigo-500/10" : "text-slate-400 hover:bg-white/5")}
                onClick={() => {
                  setMicEnabled(v => !v);
                  if (micEnabled) { stopRecognition(); setPhase("idle"); }
                  else if (micReady) { setPhase("listening"); startRecognition(); }
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
              <Button variant="ghost" size="icon"
                className={cn(speakerEnabled ? "text-indigo-300 hover:bg-indigo-500/10" : "text-slate-400 hover:bg-white/5")}
                onClick={() => {
                  setSpeakerEnabled(v => !v);
                  if (speakerEnabled) { stopAudioPlayback(); stopRecognition(); setPhase("listening"); startRecognition(); }
                }}
                aria-label={speakerEnabled ? "Disable speaker" : "Enable speaker"}
              >
                {speakerEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
              </Button>
            </div>

            <Button variant="destructive" size="icon"
              onClick={() => {
                if (wsRef.current?.readyState === WebSocket.OPEN) {
                  wsRef.current.send(JSON.stringify({ type: "stop" }));
                }
                wsRef.current?.close();
                wsRef.current = null;
                wsReadyRef.current = false;
                if (reconnectTimerRef.current) { window.clearTimeout(reconnectTimerRef.current); reconnectTimerRef.current = null; }
                abortRef.current?.abort();
                stopAudioPlayback();
                stopRecognition();
                if (typingTimerRef.current) { window.clearInterval(typingTimerRef.current); typingTimerRef.current = null; }
                setAssistantText("");
                setInterimTranscript("");
                setErrorText(null);
                setPhase("idle");
              }}
              aria-label="End conversation"
            >
              <PhoneOff className="h-5 w-5" />
            </Button>
          </div>
        </footer>
      </div>

      {!recognitionAvailable && (
        <div className="fixed inset-0 flex items-center justify-center p-6">
          <div className="glass rounded-2xl p-6 max-w-md">
            <div className="text-sm font-medium text-slate-100">Speech Recognition not supported</div>
            <div className="text-sm text-slate-300 mt-2">
              Your browser doesn't support the Web Speech API. Try Chrome on desktop/macOS.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
