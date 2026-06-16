import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { stripGreetSearchParam } from "@/lib/tutor-greeting";
import { chapterSelectionPath } from "@/lib/tutor-chapter-nav";
import { useAuthStore } from "@/lib/auth-store";
import { Mp3StreamPlayer } from "@/lib/mp3-stream-player";
import { VoiceLiveCall } from "@/components/voice/voice-live-call";
import type { TranscriptEntry, VoiceRelatedImage, VoicePhase } from "@/components/voice/voice-types";
import { ArrowLeft, BookOpen } from "lucide-react";

type Phase = VoicePhase;
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

const FRAME_TEXT = 1;
const FRAME_AUDIO = 2;
const FRAME_DONE = 3;
const FRAME_IMAGES = 4;

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

function getAccessToken(): string {
  return (
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    sessionStorage.getItem("access_token") ||
    sessionStorage.getItem("token") ||
    ""
  );
}

export default function AIVoicePage() {
  const [, setLocation] = useLocation();
  const { token: accessToken, user } = useAuthStore();
  const API_URL = import.meta.env.VITE_API_URL || "";
  const VOICE_URL = import.meta.env.VITE_VOICE_URL || "";
  const bargeInEnabled = import.meta.env.VITE_VOICE_BARGE_IN === "true";

  const chapterCtx = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const board = params.get("board");
    const classLevel = params.get("class");
    const subject = params.get("subject");
    const chaptersRaw = params.get("chapters");
    if (!board || !classLevel || !subject || !chaptersRaw) return null;
    return {
      board,
      classLevel,
      subject,
      subjectId: params.get("subjectId"),
      chapterIds: chaptersRaw.split(",").filter(Boolean),
      chapterNames: (params.get("chapterNames") || "").split("||").filter(Boolean),
    };
  }, []);

  const normalizedVoiceUrl = useMemo(() => {
    const url = (VOICE_URL || API_URL).trim();
    return url.endsWith("/") ? url.slice(0, -1) : url;
  }, [VOICE_URL, API_URL]);

  const subjectLabel = chapterCtx?.subject || "General";

  const [phase, setPhase] = useState<Phase>(() =>
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("greet") === "1"
      ? "connecting"
      : "idle",
  );
  const [micEnabled, setMicEnabled] = useState(true);
  const [speakerEnabled, setSpeakerEnabled] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState("Connecting...");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [assistantText, setAssistantText] = useState("");
  const [errorText, setErrorText] = useState<string | null>(null);
  const [voiceRelatedImages, setVoiceRelatedImages] = useState<VoiceRelatedImage[]>([]);
  const [transcriptEntries, setTranscriptEntries] = useState<TranscriptEntry[]>([]);
  const [callSeconds, setCallSeconds] = useState(0);
  const [isCallLive, setIsCallLive] = useState(false);
  const [tutorState, setTutorState] = useState("LISTENING");

  const volumeRef = useRef(0);
  const [volumeUi, setVolumeUi] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const wsReadyRef = useRef(false);
  const reconnectTimerRef = useRef<number | null>(null);
  const wsActiveRef = useRef(0);
  const mp3PlayerRef = useRef<Mp3StreamPlayer | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const streamReaderRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const fallbackMp3Ref = useRef<Mp3StreamPlayer | null>(null);
  const recognitionRef = useRef<any>(null);
  const startRecognitionRef = useRef<() => void>(() => {});
  const stopRecognitionRef = useRef<() => void>(() => {});
  const startRecognition = () => startRecognitionRef.current();
  const stopRecognition = () => stopRecognitionRef.current();
  const turnIdRef = useRef(0);
  const analyserCleanupRef = useRef<(() => void) | null>(null);
  const [micReady, setMicReady] = useState(false);
  const phaseRef = useRef<Phase>(phase);
  const micEnabledRef = useRef(micEnabled);
  const speakerEnabledRef = useRef(speakerEnabled);
  const speakingStartedAtRef = useRef(0);
  const callStartRef = useRef<number | null>(null);
  const assistantTextRef = useRef("");
  const voiceImagesRef = useRef<VoiceRelatedImage[]>([]);
  const shouldGreetOnConnectRef = useRef(
    typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("greet") === "1",
  );
  const micListenAllowedRef = useRef(!shouldGreetOnConnectRef.current);
  const interruptingRef = useRef(false);
  const shuttingDownRef = useRef(false);
  const audioPolicyUnlockedRef = useRef(false);
  const handleUserTurnRef = useRef<
    (userText: string, turnId: number, opts?: { requireMic?: boolean; skipPhaseCheck?: boolean }) => Promise<void>
  >(() => Promise.resolve());
  const handleInterruptRef = useRef<() => void>(() => {});

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { micEnabledRef.current = micEnabled; }, [micEnabled]);
  useEffect(() => { speakerEnabledRef.current = speakerEnabled; }, [speakerEnabled]);
  useEffect(() => { assistantTextRef.current = assistantText; }, [assistantText]);
  useEffect(() => { voiceImagesRef.current = voiceRelatedImages; }, [voiceRelatedImages]);

  const getCallSeconds = useCallback(() => {
    if (!callStartRef.current) return 0;
    return Math.floor((Date.now() - callStartRef.current) / 1000);
  }, []);

  const finalizeAssistantTurn = useCallback(() => {
    const text = assistantTextRef.current.trim();
    const imgs = voiceImagesRef.current;
    if (!text && imgs.length === 0) return;
    setTranscriptEntries((prev) => [
      ...prev,
      {
        id: `ai-${Date.now()}`,
        role: "assistant",
        text,
        timeSec: getCallSeconds(),
        images: imgs.length > 0 ? [...imgs] : undefined,
      },
    ]);
    setAssistantText("");
    setVoiceRelatedImages([]);
  }, [getCallSeconds]);

  const appendUserTranscript = useCallback(
    (text: string, extra?: Partial<TranscriptEntry>) => {
      const trimmed = text.trim();
      if (!trimmed && !extra?.userImageUrl) return;
      setTranscriptEntries((prev) => [
        ...prev,
        {
          id: `user-${Date.now()}`,
          role: "user",
          text: trimmed,
          timeSec: getCallSeconds(),
          ...extra,
        },
      ]);
    },
    [getCallSeconds],
  );

  const resumeListeningAfterPlayback = useCallback(async () => {
    if (shuttingDownRef.current) return;
    const player = mp3PlayerRef.current;
    if (player) {
      player.signalNoMoreChunks();
      await player.waitForPlaybackEnd();
      // Brief pause so speaker tail is not picked up by the mic.
      await new Promise<void>((r) => window.setTimeout(r, 400));
    }
    if (
      phaseRef.current === "speaking" ||
      phaseRef.current === "thinking" ||
      phaseRef.current === "connecting"
    ) {
      micListenAllowedRef.current = true;
      setPhase("listening");
      setInterimTranscript("");
      if (micEnabledRef.current) startRecognition();
    }
  }, []);

  const resetMp3Player = useCallback(() => {
    mp3PlayerRef.current?.stop();
    const player = new Mp3StreamPlayer();
    player.resetTurnClock();
    mp3PlayerRef.current = player;
    void player.ready().then(() => player.unlock()).catch(() => {});
  }, []);

  const unlockAudioPlayback = useCallback(async () => {
    if (!mp3PlayerRef.current) {
      mp3PlayerRef.current = new Mp3StreamPlayer();
      mp3PlayerRef.current.resetTurnClock();
    }
    if (audioPolicyUnlockedRef.current && mp3PlayerRef.current.isPlaying()) return;
    try {
      await mp3PlayerRef.current.unlock();
      audioPolicyUnlockedRef.current = true;
    } catch {
      /* ignore */
    }
  }, []);

  const enqueueMp3Chunk = useCallback((raw: ArrayBuffer) => {
    if (shuttingDownRef.current) return;
    if (!speakerEnabledRef.current || raw.byteLength === 0) return;
    if (!mp3PlayerRef.current) {
      const player = new Mp3StreamPlayer();
      player.resetTurnClock();
      mp3PlayerRef.current = player;
    }
    const player = mp3PlayerRef.current;
    void player.ready().then(() => {
      player.enqueue(raw);
      if (player.element.paused) {
        void player.element.play().catch(() => {});
      }
    });
    if (phaseRef.current !== "speaking") {
      setPhase("speaking");
      speakingStartedAtRef.current = Date.now();
    }
  }, []);

  useEffect(() => {
    if (!isCallLive) return;
    const id = window.setInterval(() => {
      if (callStartRef.current) {
        setCallSeconds(Math.floor((Date.now() - callStartRef.current) / 1000));
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [isCallLive]);

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

  const stopVoiceSessionResources = useCallback(() => {
    shuttingDownRef.current = true;
    turnIdRef.current += 1;

    if (reconnectTimerRef.current) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify({ type: "stop" }));
      } catch {
        /* ignore */
      }
    }
    if (ws && ws.readyState <= WebSocket.OPEN) {
      try {
        ws.close();
      } catch {
        /* ignore */
      }
    }
    wsRef.current = null;
    wsReadyRef.current = false;
    wsActiveRef.current += 1;

    abortRef.current?.abort();
    abortRef.current = null;

    mp3PlayerRef.current?.setAllowAutoResume(false);
    streamReaderRef.current?.cancel().catch(() => {});
    streamReaderRef.current = null;
    mp3PlayerRef.current?.stop();
    mp3PlayerRef.current = null;
    fallbackMp3Ref.current?.stop();
    fallbackMp3Ref.current = null;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        /* ignore */
      }
    }
    micListenAllowedRef.current = false;
  }, []);

  const connectWS = useCallback(() => {
    if (!normalizedVoiceUrl || shuttingDownRef.current) return;
    if (reconnectTimerRef.current) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (wsRef.current && wsRef.current.readyState <= WebSocket.OPEN) return;

    const myGen = ++wsActiveRef.current;
    const wsBase = normalizedVoiceUrl.startsWith("https://")
      ? normalizedVoiceUrl.replace("https://", "wss://")
      : normalizedVoiceUrl.replace("http://", "ws://");
    const token = getAccessToken();
    const fullUrl = token ? `${wsBase}/ws/voice?token=${encodeURIComponent(token)}` : `${wsBase}/ws/voice`;

    const ws = new WebSocket(fullUrl);
    ws.binaryType = "arraybuffer";
    wsRef.current = ws;

    ws.onopen = () => {
      wsReadyRef.current = true;
      setConnectionStatus("Connected");
      setIsCallLive(true);
      if (!callStartRef.current) callStartRef.current = Date.now();
      const sendGreet = shouldGreetOnConnectRef.current && Boolean(chapterCtx);
      if (sendGreet) {
        shouldGreetOnConnectRef.current = false;
        stripGreetSearchParam();
        micListenAllowedRef.current = false;
        setPhase("connecting");
      }
      void unlockAudioPlayback();
      ws.send(
        JSON.stringify({
          type: "session_start",
          board: chapterCtx?.board || "",
          class_level: chapterCtx?.classLevel || "",
          subject_name: chapterCtx?.subject || "",
          chapter_ids: chapterCtx?.chapterIds || null,
          chapter: chapterCtx?.chapterNames?.[0] || "",
          chapter_names: chapterCtx?.chapterNames || [],
          student_name: user?.fullName || "",
          greet: sendGreet,
        }),
      );
    };

    ws.onmessage = async (event) => {
      if (shuttingDownRef.current) return;
      if (event.data instanceof ArrayBuffer) {
        enqueueMp3Chunk(event.data);
        return;
      }
      if (event.data instanceof Blob) {
        try {
          const buf = await event.data.arrayBuffer();
          enqueueMp3Chunk(buf);
        } catch {
          /* ignore */
        }
        return;
      }
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(event.data as string);
      } catch {
        return;
      }

      switch (msg.type) {
        case "greeting_start":
          micListenAllowedRef.current = false;
          stopRecognition();
          setPhase("speaking");
          setAssistantText(String(msg.text ?? ""));
          setVoiceRelatedImages([]);
          resetMp3Player();
          break;
        case "thinking":
          micListenAllowedRef.current = false;
          stopRecognition();
          setPhase("thinking");
          setAssistantText("");
          setVoiceRelatedImages([]);
          resetMp3Player();
          break;
        case "related_images": {
          const raw = msg.images;
          const imgs = Array.isArray(raw)
            ? (raw.filter((x) => x && typeof x === "object") as VoiceRelatedImage[])
            : [];
          setVoiceRelatedImages(imgs);
          break;
        }
        case "speaking":
          if (!bargeInEnabled) stopRecognition();
          else if (micEnabledRef.current) startRecognition();
          setPhase("speaking");
          speakingStartedAtRef.current = Date.now();
          break;
        case "ai_text_token": {
          const tok = String(msg.token ?? "");
          if (!bargeInEnabled) stopRecognition();
          setAssistantText((prev) => prev + tok);
          if (phaseRef.current === "thinking") setPhase("speaking");
          break;
        }
        case "interrupt_ack":
          stopAudioPlayback();
          micListenAllowedRef.current = true;
          setPhase("listening");
          setAssistantText("");
          setVoiceRelatedImages([]);
          if (micEnabledRef.current) startRecognition();
          break;
        case "tutor_state":
          setTutorState(String(msg.state ?? "LISTENING"));
          break;
        case "done": {
          finalizeAssistantTurn();
          void resumeListeningAfterPlayback();
          break;
        }
        case "listening":
          if (!mp3PlayerRef.current?.isPlaying()) {
            micListenAllowedRef.current = true;
            setPhase("listening");
          }
          break;
        case "error":
          setErrorText(String(msg.message || "Voice assistant error."));
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
      setIsCallLive(false);
      if (shuttingDownRef.current || myGen !== wsActiveRef.current) return;
      wsRef.current = null;
      if (phaseRef.current === "error") return;
      setConnectionStatus("Reconnecting…");
      reconnectTimerRef.current = window.setTimeout(connectWS, 2500);
    };
  }, [normalizedVoiceUrl, chapterCtx, user?.fullName, enqueueMp3Chunk, resetMp3Player, finalizeAssistantTurn, unlockAudioPlayback, resumeListeningAfterPlayback]); // eslint-disable-line

  useEffect(() => {
    if (!normalizedVoiceUrl) return;
    shuttingDownRef.current = false;
    connectWS();
    return () => {
      stopVoiceSessionResources();
    };
  }, [connectWS, stopVoiceSessionResources]); // eslint-disable-line

  const recognitionAvailable = useMemo(() => {
    const w = window as Window & { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
    return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
  }, []);

  const startRecognitionImpl = () => {
    if (shuttingDownRef.current || !recognitionRef.current) return;
    try { recognitionRef.current.start(); } catch { /* ignore */ }
  };
  const stopRecognitionImpl = () => {
    if (!recognitionRef.current) return;
    try { recognitionRef.current.stop(); } catch { /* ignore */ }
  };
  startRecognitionRef.current = startRecognitionImpl;
  stopRecognitionRef.current = stopRecognitionImpl;

  const stopAudioPlayback = () => {
    mp3PlayerRef.current?.setAllowAutoResume(false);
    streamReaderRef.current?.cancel().catch(() => {});
    streamReaderRef.current = null;
    mp3PlayerRef.current?.stop();
    mp3PlayerRef.current = null;
    fallbackMp3Ref.current?.stop();
    fallbackMp3Ref.current = null;
  };

  const handleInterrupt = useCallback(() => {
    if (interruptingRef.current) return;
    interruptingRef.current = true;

    abortRef.current?.abort();
    abortRef.current = null;
    stopAudioPlayback();
    setAssistantText("");
    setVoiceRelatedImages([]);

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "interrupt" }));
    }

    micListenAllowedRef.current = true;
    setPhase("listening");
    setInterimTranscript("");
    if (micEnabledRef.current) startRecognition();

    window.setTimeout(() => {
      interruptingRef.current = false;
    }, 350);
  }, []);

  handleInterruptRef.current = handleInterrupt;

  const handleUserTurn = async (
    userText: string,
    turnId: number,
    opts?: { requireMic?: boolean; skipPhaseCheck?: boolean },
  ) => {
    if (shuttingDownRef.current) return;
    if (!normalizedVoiceUrl) return;
    if (opts?.requireMic !== false && !micEnabled) return;
    if (
      !opts?.skipPhaseCheck &&
      (phaseRef.current === "speaking" ||
        phaseRef.current === "thinking" ||
        phaseRef.current === "connecting")
    ) {
      return;
    }
    if (!opts?.skipPhaseCheck && mp3PlayerRef.current?.isPlaying()) return;
    const trimmed = userText.trim();
    if (trimmed.length < 2) return;

    stopRecognition();
    micListenAllowedRef.current = false;
    setPhase("thinking");
    setInterimTranscript("");
    setErrorText(null);
    setAssistantText("");
    setVoiceRelatedImages([]);
    appendUserTranscript(trimmed);
    stopAudioPlayback();

    if (wsRef.current?.readyState === WebSocket.OPEN && wsReadyRef.current) {
      void unlockAudioPlayback();
      resetMp3Player();
      wsRef.current.send(JSON.stringify({ type: "question", text: trimmed }));
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const voiceEndpoint = chapterCtx
        ? `${normalizedVoiceUrl}/auth/voice-stream`
        : `${normalizedVoiceUrl}/voice-stream`;
      const body: Record<string, unknown> = { message: trimmed, conversation_id: "frontend-call" };
      if (chapterCtx) {
        Object.assign(body, {
          board: chapterCtx.board,
          class_level: chapterCtx.classLevel,
          subject_name: chapterCtx.subject,
          chapter_ids: chapterCtx.chapterIds,
          chapter: chapterCtx.chapterNames?.[0] || "",
          chapter_names: chapterCtx.chapterNames,
        });
      }
      const res = await fetch(voiceEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
      if (!res.body || turnIdRef.current !== turnId) return;

      const frameParser = new FrameParser();
      const reader = res.body.getReader();
      streamReaderRef.current = reader;
      const fallbackPlayer = new Mp3StreamPlayer();
      fallbackPlayer.resetTurnClock();
      fallbackMp3Ref.current = fallbackPlayer;
      await fallbackPlayer.ready();
      await fallbackPlayer.unlock();
      let displayText = "";
      let relatedImgs: VoiceRelatedImage[] = [];

      outer: while (true) {
        const { done, value } = await reader.read();
        if (done || turnIdRef.current !== turnId) break;
        for (const frame of frameParser.feed(value)) {
          if (frame.type === FRAME_TEXT) {
            displayText += new TextDecoder().decode(frame.data);
            setAssistantText(displayText);
            setPhase("speaking");
          } else if (frame.type === FRAME_IMAGES) {
            try {
              const parsed = JSON.parse(new TextDecoder().decode(frame.data));
              relatedImgs = Array.isArray(parsed)
                ? (parsed.filter((x) => x && typeof x === "object") as VoiceRelatedImage[])
                : [];
              setVoiceRelatedImages(relatedImgs);
            } catch { /* ignore */ }
          } else if (frame.type === FRAME_AUDIO && speakerEnabledRef.current) {
            fallbackPlayer.enqueue(new Uint8Array(frame.data).buffer);
            if (fallbackPlayer.element.paused) {
              void fallbackPlayer.element.play().catch(() => {});
            }
            setPhase("speaking");
          } else if (frame.type === FRAME_DONE) {
            break outer;
          }
        }
      }

      if (turnIdRef.current === turnId && displayText.trim()) {
        setTranscriptEntries((prev) => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            role: "assistant",
            text: displayText.trim(),
            timeSec: getCallSeconds(),
            images: relatedImgs.length > 0 ? relatedImgs : undefined,
          },
        ]);
        setAssistantText("");
        setVoiceRelatedImages([]);
        fallbackPlayer.signalNoMoreChunks();
        await fallbackPlayer.waitForPlaybackEnd();
        micListenAllowedRef.current = true;
        setPhase("listening");
        startRecognition();
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") return;
      setErrorText(e instanceof Error ? e.message : "Unable to reach the voice assistant.");
      setPhase("error");
    } finally {
      abortRef.current = null;
    }
  };

  handleUserTurnRef.current = handleUserTurn;

  useEffect(() => {
    if (!recognitionAvailable) return;
    const w = window as any;
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return;
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    let finalAccumulator = "";
    let finalizeTimer: number | null = null;
    rec.onresult = (event: any) => {
      if (shuttingDownRef.current) return;
      const aiBusy =
        phaseRef.current === "speaking" ||
        phaseRef.current === "thinking" ||
        phaseRef.current === "connecting";

      if (aiBusy) {
        if (!bargeInEnabled || !micEnabledRef.current || phaseRef.current !== "speaking") return;
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const txt = event.results[i][0]?.transcript || "";
          if (event.results[i].isFinal) {
            finalAccumulator += (finalAccumulator ? " " : "") + txt;
            if (finalizeTimer) window.clearTimeout(finalizeTimer);
            finalizeTimer = window.setTimeout(() => {
              const t = finalAccumulator.trim();
              finalAccumulator = "";
              if (t.length >= 2 && volumeRef.current > 0.06) {
                handleInterruptRef.current();
                void handleUserTurnRef.current(t, ++turnIdRef.current, {
                  requireMic: true,
                  skipPhaseCheck: true,
                });
              }
            }, 420);
          } else {
            interim += txt;
          }
        }
        if (interim.trim()) setInterimTranscript(interim.trim());
        return;
      }

      if (phaseRef.current !== "listening" || !micListenAllowedRef.current) return;
      if (mp3PlayerRef.current?.isPlaying()) return;
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const txt = event.results[i][0]?.transcript || "";
        if (event.results[i].isFinal) {
          finalAccumulator += (finalAccumulator ? " " : "") + txt;
          if (finalizeTimer) window.clearTimeout(finalizeTimer);
          finalizeTimer = window.setTimeout(() => {
            const t = finalAccumulator.trim();
            finalAccumulator = "";
            if (t) void handleUserTurn(t, ++turnIdRef.current, { requireMic: true });
          }, 420);
        } else {
          interim += txt;
        }
      }
      setInterimTranscript(interim.trim());
    };
    recognitionRef.current = rec;
    return () => { try { rec.stop(); } catch { /* ignore */ } };
  }, [recognitionAvailable]); // eslint-disable-line

  useEffect(() => {
    let destroyed = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        const Ctor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return;
        const micCtx = new Ctor();
        const analyser = micCtx.createAnalyser();
        analyser.fftSize = 1024;
        micCtx.createMediaStreamSource(stream).connect(analyser);
        const data = new Uint8Array(analyser.fftSize);
        analyserCleanupRef.current = () => {
          stream.getTracks().forEach((t) => t.stop());
          try { micCtx.close(); } catch { /* ignore */ }
        };
        setMicReady(true);
        const tick = () => {
          if (destroyed) return;
          analyser.getByteTimeDomainData(data);
          let sumSq = 0;
          for (let i = 0; i < data.length; i++) {
            const v = (data[i] - 128) / 128;
            sumSq += v * v;
          }
          const level = clamp01(Math.sqrt(sumSq / data.length) * 3.2);
          volumeRef.current = level;
          setVolumeUi(level);
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      } catch {
        setMicReady(false);
      }
    })();
    return () => {
      destroyed = true;
      analyserCleanupRef.current?.();
    };
  }, [finalizeAssistantTurn]); // eslint-disable-line

  useEffect(() => {
    if (!micReady || phase === "error") return;
    if (phase === "listening" && micEnabled && micListenAllowedRef.current) {
      if (!mp3PlayerRef.current?.isPlaying()) {
        startRecognition();
      }
    } else if (phase === "speaking" && bargeInEnabled && micEnabled) {
      startRecognition();
    } else if (
      phase === "thinking" ||
      (phase === "speaking" && !bargeInEnabled) ||
      phase === "connecting"
    ) {
      stopRecognition();
    }
  }, [phase, micEnabled, micReady, bargeInEnabled]); // eslint-disable-line

  useEffect(() => {
    if (!micEnabled || !micReady || phase === "error") return;
    if (phase === "idle" && micListenAllowedRef.current) {
      setPhase("listening");
    }
  }, [micEnabled, micReady, phase]); // eslint-disable-line

  // Unlock audio on first user interaction (browser autoplay policy).
  useEffect(() => {
    const onGesture = () => {
      if (audioPolicyUnlockedRef.current) return;
      void unlockAudioPlayback();
    };
    window.addEventListener("pointerdown", onGesture, { once: true, passive: true });
    window.addEventListener("keydown", onGesture, { once: true });
    return () => {
      window.removeEventListener("pointerdown", onGesture);
      window.removeEventListener("keydown", onGesture);
    };
  }, [unlockAudioPlayback]);

  const leaveVoiceSession = useCallback(() => {
    finalizeAssistantTurn();
    stopVoiceSessionResources();
    setAssistantText("");
    setInterimTranscript("");
    setPhase("idle");
    setIsCallLive(false);
    callStartRef.current = null;
    setCallSeconds(0);
  }, [finalizeAssistantTurn, stopVoiceSessionResources]);

  const handleEndCall = () => {
    leaveVoiceSession();
    if (chapterCtx) setLocation(chapterSelectionPath(chapterCtx.subjectId));
  };

  const handleBackToChapters = () => {
    leaveVoiceSession();
    setLocation(chapterSelectionPath(chapterCtx?.subjectId));
  };

  useEffect(() => {
    const onPageHide = () => {
      stopVoiceSessionResources();
    };
    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, [stopVoiceSessionResources]);

  const studentName = user?.fullName || "Student";
  const studentInitial = (studentName.split(/\s+/)[0]?.[0] || "S").toUpperCase();
  const isTyping = phase === "thinking" || (Boolean(assistantText) && phase === "speaking");
  const aiWaveActive = phase === "speaking";
  const aiWaveIntensity = aiWaveActive ? 0.72 : 0.2;
  const studentWaveActive =
    phase === "listening" &&
    micEnabled &&
    (volumeUi > 0.06 || Boolean(interimTranscript.trim()));
  const studentWaveIntensity = Math.max(0.35, 0.35 + volumeUi * 0.65);

  return (
    <div className="h-full min-h-0 w-full flex flex-col overflow-hidden bg-background">
      <header className="shrink-0 px-3 py-2 sm:px-4 sm:py-2.5 flex items-center justify-between gap-3 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="flex items-center gap-2 min-w-0">
          {chapterCtx && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={handleBackToChapters}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground min-w-0">
            <BookOpen className="h-4 w-4 text-primary shrink-0" />
            <span className="truncate">{subjectLabel} Tutor</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
            <span className="text-border">·</span>
            {isCallLive ? (
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium shrink-0">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            ) : (
              <span className="text-amber-600 dark:text-amber-400 shrink-0">Connecting…</span>
            )}
            {chapterCtx && chapterCtx.chapterNames.length > 0 && (
              <>
                <span className="text-border">·</span>
                <span className="truncate">{chapterCtx.chapterNames[0]}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <span className="sm:hidden inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
            {isCallLive && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />}
            {isCallLive ? "Live" : "…"}
          </span>
          <Badge
            variant="outline"
            className="font-mono text-xs tabular-nums border-border text-foreground bg-muted/50 px-2.5 py-0.5"
          >
            {String(Math.floor(callSeconds / 60)).padStart(2, "0")}:{String(callSeconds % 60).padStart(2, "0")}
          </Badge>
          <span className="text-xs text-muted-foreground hidden sm:inline">{connectionStatus}</span>
        </div>
      </header>

      {chapterCtx && chapterCtx.chapterNames.length > 0 && (
        <div className="sm:hidden shrink-0 px-3 py-1 border-b border-border text-[11px] text-muted-foreground truncate bg-muted/30">
          {isCallLive ? (
            <span className="text-emerald-600 dark:text-emerald-400">Live · </span>
          ) : (
            <span className="text-amber-600 dark:text-amber-400">Connecting · </span>
          )}
          {chapterCtx.chapterNames[0]}
        </div>
      )}

      <main className="flex-1 min-h-0 overflow-hidden w-full h-full">
        <VoiceLiveCall
          phase={phase}
          subjectLabel={subjectLabel}
          studentName={studentName}
          studentInitial={studentInitial}
          micEnabled={micEnabled}
          speakerEnabled={speakerEnabled}
          aiActive={aiWaveActive}
          aiIntensity={aiWaveIntensity}
          studentActive={studentWaveActive}
          studentIntensity={studentWaveIntensity}
          tutorState={tutorState}
          entries={transcriptEntries}
          isTyping={isTyping}
          streamingAssistantText={assistantText || undefined}
          streamingRelatedImages={voiceRelatedImages}
          imagesRetrieving={isTyping && voiceRelatedImages.length === 0}
          imagesRetrievingHint={
            chapterCtx?.chapterNames?.[0]
              ? `Looking up figures from ${chapterCtx.chapterNames[0]}…`
              : undefined
          }
          accessToken={accessToken}
          onToggleMic={() => {
            setMicEnabled((v) => !v);
            if (micEnabled) {
              stopRecognition();
              setPhase("idle");
            } else if (micReady) {
              setPhase("listening");
              startRecognition();
            }
          }}
          onToggleSpeaker={() => {
            setSpeakerEnabled((v) => !v);
            if (speakerEnabled) stopAudioPlayback();
          }}
          onInterrupt={handleInterrupt}
          canInterrupt={phase === "speaking" || phase === "thinking"}
          onEndCall={handleEndCall}
        />
      </main>

      {errorText && (
        <div className="shrink-0 px-3 pb-2 sm:px-4 sm:pb-3 max-w-7xl mx-auto w-full">
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm text-destructive">
            {errorText}
          </div>
        </div>
      )}

      {!recognitionAvailable && (
        <div className="fixed bottom-4 left-4 right-4 lg:left-auto lg:right-4 lg:max-w-sm rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100 z-50">
          Speech recognition unavailable — voice input is not supported in this browser.
        </div>
      )}
    </div>
  );
}
