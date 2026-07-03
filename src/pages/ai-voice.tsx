import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { stripGreetSearchParam } from "@/lib/tutor-greeting";
import {
  buildVoiceSessionKey,
  clearVoiceSession,
  loadVoiceSession,
  saveVoiceSession,
} from "@/lib/voice-session-storage";
import { chapterSelectionPath } from "@/lib/tutor-chapter-nav";
import { useAuthStore } from "@/lib/auth-store";
import { Mp3StreamPlayer } from "@/lib/mp3-stream-player";
import { VoiceLiveCall } from "@/components/voice/voice-live-call";
import type { TranscriptEntry, VoiceRelatedImage, VoicePhase } from "@/components/voice/voice-types";
import { MSG, studentFriendlyApiError, studentFriendlyError } from "@/lib/student-messages";
import {
  postprocessVoiceTranscript,
  voiceRecognitionLang,
} from "@/lib/voice-stt-postprocess";
import { buildVoiceConversationHistory } from "@/lib/voice-http-history";
import {
  createVoiceRecorder,
  fetchServerSttAvailable,
  shouldUseServerStt,
  transcribeWithServer,
  useExclusiveServerStt,
} from "@/lib/voice-server-stt";
import type { MathLesson } from "@/types/math-lesson";
import type { ScienceExperiment } from "@/types/science-experiment";
import { ArrowLeft, BookOpen, RefreshCw } from "lucide-react";

type Phase = VoicePhase;
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

const FRAME_TEXT = 1;
const FRAME_AUDIO = 2;
const FRAME_DONE = 3;
const FRAME_IMAGES = 4;
const FRAME_TUTOR_HINT = 5;
const FRAME_TUTOR_STATE = 6;
const FRAME_MATH_LESSON = 7;
const FRAME_SCIENCE_EXPERIMENT = 8;

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

function tutorIsSpeaking(player: Mp3StreamPlayer | null | undefined): boolean {
  return Boolean(player?.hasAudiblePlayback());
}

export default function AIVoicePage() {
  const [, setLocation] = useLocation();
  const { token: accessToken, user } = useAuthStore();
  const API_URL = import.meta.env.VITE_API_URL || "";
  const VOICE_URL = import.meta.env.VITE_VOICE_URL || "";
  const bargeInEnabled = import.meta.env.VITE_VOICE_BARGE_IN !== "false";

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

  const serverSttPreferred = useMemo(() => shouldUseServerStt(subjectLabel), [subjectLabel]);
  const [serverSttActive, setServerSttActive] = useState(false);

  const voiceSessionKey = useMemo(() => {
    if (!chapterCtx) return "voice-general";
    return buildVoiceSessionKey({
      board: chapterCtx.board,
      classLevel: chapterCtx.classLevel,
      subject: chapterCtx.subject,
      chapterIds: chapterCtx.chapterIds,
    });
  }, [chapterCtx]);

  const [transcriptEntries, setTranscriptEntries] = useState<TranscriptEntry[]>([]);
  const [sessionRestored, setSessionRestored] = useState(false);
  const [callSeconds, setCallSeconds] = useState(0);
  const [isCallLive, setIsCallLive] = useState(false);
  const [tutorState, setTutorState] = useState("LISTENING");
  const [tutorUnderstandingHint, setTutorUnderstandingHint] = useState<string | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [textInput, setTextInput] = useState("");

  const [phase, setPhase] = useState<Phase>("connecting");
  const [micEnabled, setMicEnabled] = useState(true);
  const [speakerEnabled, setSpeakerEnabled] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState("Connecting...");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [assistantText, setAssistantText] = useState("");
  const [errorText, setErrorText] = useState<string | null>(null);
  const [voiceRelatedImages, setVoiceRelatedImages] = useState<VoiceRelatedImage[]>([]);
  const [streamingMathLesson, setStreamingMathLesson] = useState<MathLesson | null>(null);
  const [streamingScienceExperiment, setStreamingScienceExperiment] = useState<ScienceExperiment | null>(null);

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
  const phaseRef = useRef<Phase>(phase);
  const micEnabledRef = useRef(micEnabled);
  const speakerEnabledRef = useRef(speakerEnabled);
  const speakingStartedAtRef = useRef(0);
  const callStartRef = useRef<number | null>(null);
  const assistantTextRef = useRef("");
  const voiceImagesRef = useRef<VoiceRelatedImage[]>([]);
  const voiceMathLessonRef = useRef<MathLesson | null>(null);
  const voiceScienceExperimentRef = useRef<ScienceExperiment | null>(null);
  const shouldGreetOnConnectRef = useRef(
    typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("greet") === "1",
  );
  const micListenAllowedRef = useRef(!shouldGreetOnConnectRef.current);
  const interruptingRef = useRef(false);
  const shuttingDownRef = useRef(false);
  const audioPolicyUnlockedRef = useRef(false);
  const handleUserTurnRef = useRef<
    (
      userText: string,
      turnId: number,
      opts?: { requireMic?: boolean; skipPhaseCheck?: boolean; skipPlaybackCheck?: boolean },
    ) => Promise<void>
  >(() => Promise.resolve());
  const handleInterruptRef = useRef<() => void>(() => {});
  const scheduleVoiceCaptureRef = useRef<() => void>(() => {});
  const bootstrapVoiceInputRef = useRef<() => void>(() => {});
  const textInputOpenRef = useRef(false);
  const textDictationRef = useRef("");
  const [needsVoiceTap, setNeedsVoiceTap] = useState(true);
  const chapterCtxRef = useRef(chapterCtx);
  const userRef = useRef(user);
  const micBootstrappedRef = useRef(false);
  const analyserStreamRef = useRef<MediaStream | null>(null);
  const transcriptEntriesRef = useRef(transcriptEntries);
  const tutorStateRef = useRef(tutorState);
  const serverSttRecorderRef = useRef<ReturnType<typeof createVoiceRecorder> | null>(null);
  const serverSttProcessingRef = useRef(false);
  const speechActiveRef = useRef(false);
  const silenceSinceRef = useRef<number | null>(null);

  useEffect(() => { chapterCtxRef.current = chapterCtx; }, [chapterCtx]);
  useEffect(() => { userRef.current = user; }, [user]);

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { micEnabledRef.current = micEnabled; }, [micEnabled]);
  useEffect(() => { speakerEnabledRef.current = speakerEnabled; }, [speakerEnabled]);

  const syncAssistantText = useCallback((next: string) => {
    assistantTextRef.current = next;
    setAssistantText(next);
  }, []);

  const appendAssistantToken = useCallback((tok: string) => {
    const next = assistantTextRef.current + tok;
    assistantTextRef.current = next;
    setAssistantText(next);
  }, []);

  useEffect(() => { voiceImagesRef.current = voiceRelatedImages; }, [voiceRelatedImages]);
  useEffect(() => { transcriptEntriesRef.current = transcriptEntries; }, [transcriptEntries]);
  useEffect(() => { tutorStateRef.current = tutorState; }, [tutorState]);

  // Restore chat from this browser tab so reload does not show an empty session.
  useEffect(() => {
    const saved = loadVoiceSession(voiceSessionKey);
    if (saved.length > 0) {
      setTranscriptEntries(saved);
      setSessionRestored(true);
    }
  }, [voiceSessionKey]);

  useEffect(() => {
    saveVoiceSession(voiceSessionKey, transcriptEntries);
  }, [voiceSessionKey, transcriptEntries]);

  useEffect(() => {
    if (!serverSttPreferred || !normalizedVoiceUrl) {
      setServerSttActive(false);
      return;
    }
    let cancelled = false;
    void fetchServerSttAvailable(normalizedVoiceUrl).then((ok) => {
      if (!cancelled) setServerSttActive(ok);
    });
    return () => {
      cancelled = true;
    };
  }, [serverSttPreferred, normalizedVoiceUrl]);

  const getCallSeconds = useCallback(() => {
    if (!callStartRef.current) return 0;
    return Math.floor((Date.now() - callStartRef.current) / 1000);
  }, []);

  const finalizeAssistantTurn = useCallback(() => {
    const text = assistantTextRef.current.trim();
    const imgs = voiceImagesRef.current;
    const mathLesson = voiceMathLessonRef.current;
    const scienceExperiment = voiceScienceExperimentRef.current;
    if (!text && imgs.length === 0 && !mathLesson && !scienceExperiment) return;
    setTranscriptEntries((prev) => [
      ...prev,
      {
        id: `ai-${Date.now()}`,
        role: "assistant",
        text,
        timeSec: getCallSeconds(),
        images: imgs.length > 0 ? [...imgs] : undefined,
        mathLesson: mathLesson ?? undefined,
        scienceExperiment: scienceExperiment ?? undefined,
      },
    ]);
    syncAssistantText("");
    setVoiceRelatedImages([]);
    setStreamingMathLesson(null);
    setStreamingScienceExperiment(null);
    voiceMathLessonRef.current = null;
    voiceScienceExperimentRef.current = null;
  }, [getCallSeconds, syncAssistantText]);

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
    if (shuttingDownRef.current) return;
    if (phaseRef.current === "thinking" || phaseRef.current === "connecting") return;
    micListenAllowedRef.current = true;
    setPhase("listening");
    setInterimTranscript("");
    window.setTimeout(() => scheduleVoiceCaptureRef.current(), 500);
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
    if (audioPolicyUnlockedRef.current && tutorIsSpeaking(mp3PlayerRef.current)) return;
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
      setConnectionStatus("Can't connect to tutor");
      setPhase("error");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${normalizedVoiceUrl}/health`);
        if (!res.ok) throw new Error(studentFriendlyApiError("", res.status, MSG.voiceUnavailable));
        if (!cancelled) {
          setConnectionStatus((prev) =>
            prev === "Connected" || prev === "Reconnecting…" ? prev : "Server ready",
          );
        }
      } catch {
        if (!cancelled) setConnectionStatus("Can't reach your tutor right now");
      }
    })();
    return () => { cancelled = true; };
  }, [normalizedVoiceUrl]);

  const disconnectVoiceSocket = useCallback(() => {
    if (reconnectTimerRef.current) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    const ws = wsRef.current;
    if (ws) {
      ws.onopen = null;
      ws.onmessage = null;
      ws.onerror = null;
      ws.onclose = null;
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        try {
          ws.close();
        } catch {
          /* ignore */
        }
      }
      wsRef.current = null;
    }
    wsActiveRef.current += 1;
    wsReadyRef.current = false;
    setWsConnected(false);
  }, []);

  const stopVoiceSessionResources = useCallback(() => {
    shuttingDownRef.current = true;
    turnIdRef.current += 1;

    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify({ type: "stop" }));
      } catch {
        /* ignore */
      }
    }
    disconnectVoiceSocket();

    abortRef.current?.abort();
    abortRef.current = null;

    streamReaderRef.current?.cancel().catch(() => {});
    streamReaderRef.current = null;

    mp3PlayerRef.current?.setAllowAutoResume(false);
    mp3PlayerRef.current?.stop();
    mp3PlayerRef.current = null;
    fallbackMp3Ref.current?.setAllowAutoResume(false);
    fallbackMp3Ref.current?.stop();
    fallbackMp3Ref.current = null;

    analyserCleanupRef.current?.();
    analyserCleanupRef.current = null;
    analyserStreamRef.current = null;
    micBootstrappedRef.current = false;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        /* ignore */
      }
    }
    micListenAllowedRef.current = false;
  }, [disconnectVoiceSocket]);

  const connectWS = useCallback(() => {
    if (!normalizedVoiceUrl) return;
    if (reconnectTimerRef.current) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (wsRef.current && wsRef.current.readyState <= WebSocket.OPEN) return;

    const myGen = ++wsActiveRef.current;
    const ctx = chapterCtxRef.current;
    const wsBase = normalizedVoiceUrl.startsWith("https://")
      ? normalizedVoiceUrl.replace("https://", "wss://")
      : normalizedVoiceUrl.replace("http://", "ws://");
    const token = getAccessToken();
    const fullUrl = token ? `${wsBase}/ws/voice?token=${encodeURIComponent(token)}` : `${wsBase}/ws/voice`;

    const ws = new WebSocket(fullUrl);
    ws.binaryType = "arraybuffer";
    wsRef.current = ws;

    ws.onopen = () => {
      if (myGen !== wsActiveRef.current) return;
      wsReadyRef.current = true;
      setWsConnected(true);
      setIsReconnecting(false);
      setErrorText(null);
      setConnectionStatus("Connected");
      setIsCallLive(true);
      if (!callStartRef.current) callStartRef.current = Date.now();
      const sendGreet = shouldGreetOnConnectRef.current && Boolean(ctx);
      if (sendGreet) {
        shouldGreetOnConnectRef.current = false;
        stripGreetSearchParam();
        micListenAllowedRef.current = false;
        setPhase("connecting");
      } else {
        micListenAllowedRef.current = true;
        setPhase("listening");
      }
      void unlockAudioPlayback();
      ws.send(
        JSON.stringify({
          type: "session_start",
          board: ctx?.board || "",
          class_level: ctx?.classLevel || "",
          subject_name: ctx?.subject || "",
          chapter_ids: ctx?.chapterIds || null,
          chapter: ctx?.chapterNames?.[0] || "",
          chapter_names: ctx?.chapterNames || [],
          student_name: userRef.current?.fullName || "",
          greet: sendGreet,
        }),
      );
      if (!sendGreet) {
        void bootstrapVoiceInputRef.current();
        window.setTimeout(() => scheduleVoiceCaptureRef.current(), 100);
      }
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
          syncAssistantText(String(msg.text ?? ""));
          setVoiceRelatedImages([]);
          setStreamingMathLesson(null);
          voiceMathLessonRef.current = null;
          resetMp3Player();
          break;
        case "thinking":
          micListenAllowedRef.current = false;
          setPhase("thinking");
          syncAssistantText("");
          setVoiceRelatedImages([]);
          setStreamingMathLesson(null);
          voiceMathLessonRef.current = null;
          resetMp3Player();
          break;
        case "tutor_hint":
          setTutorUnderstandingHint(String(msg.hint ?? "").trim() || null);
          break;
        case "related_images": {
          const raw = msg.images;
          const imgs = Array.isArray(raw)
            ? (raw.filter((x) => x && typeof x === "object") as VoiceRelatedImage[])
            : [];
          setVoiceRelatedImages(imgs);
          break;
        }
        case "math_lesson": {
          const lesson = msg.lesson as MathLesson | undefined;
          if (lesson && typeof lesson === "object") {
            voiceMathLessonRef.current = lesson;
            setStreamingMathLesson(lesson);
            const clean = String(msg.clean_answer ?? "").trim();
            if (clean && !assistantTextRef.current.trim()) {
              syncAssistantText(clean);
            }
          }
          break;
        }
        case "science_experiment": {
          const experiment = msg.experiment as ScienceExperiment | undefined;
          if (experiment && typeof experiment === "object") {
            voiceScienceExperimentRef.current = experiment;
            setStreamingScienceExperiment(experiment);
            const clean = String(msg.clean_answer ?? "").trim();
            if (clean && !assistantTextRef.current.trim()) {
              syncAssistantText(clean);
            }
          }
          break;
        }
        case "speaking":
          if (!bargeInEnabled) stopRecognition();
          else if (micEnabledRef.current) scheduleVoiceCaptureRef.current();
          setPhase("speaking");
          speakingStartedAtRef.current = Date.now();
          break;
        case "ai_text_token": {
          const tok = String(msg.token ?? "");
          if (!bargeInEnabled) stopRecognition();
          appendAssistantToken(tok);
          if (phaseRef.current === "thinking") setPhase("speaking");
          break;
        }
        case "interrupt_ack":
          stopAudioPlayback();
          micListenAllowedRef.current = true;
          setPhase("listening");
          syncAssistantText("");
          setVoiceRelatedImages([]);
          setStreamingMathLesson(null);
          voiceMathLessonRef.current = null;
          if (micEnabledRef.current) scheduleVoiceCaptureRef.current();
          break;
        case "tutor_state":
          setTutorState(String(msg.state ?? "LISTENING"));
          break;
        case "done": {
          setTutorUnderstandingHint(null);
          finalizeAssistantTurn();
          void resumeListeningAfterPlayback();
          break;
        }
        case "listening":
          micListenAllowedRef.current = true;
          setPhase("listening");
          void bootstrapVoiceInputRef.current();
          window.setTimeout(() => scheduleVoiceCaptureRef.current(), 400);
          break;
        case "error": {
          setErrorText(studentFriendlyError(msg.message, MSG.voiceError));
          stopAudioPlayback();
          if (wsReadyRef.current) {
            micListenAllowedRef.current = true;
            setPhase("listening");
            if (micEnabledRef.current) scheduleVoiceCaptureRef.current();
          } else {
            setPhase("connecting");
          }
          break;
        }
        case "ping":
          ws.send(JSON.stringify({ type: "pong" }));
          break;
      }
    };

    ws.onerror = () => {
      wsReadyRef.current = false;
      setWsConnected(false);
      setConnectionStatus("Connection problem");
    };

    ws.onclose = () => {
      wsReadyRef.current = false;
      setWsConnected(false);
      setIsCallLive(false);
      if (shuttingDownRef.current || myGen !== wsActiveRef.current) return;
      wsRef.current = null;
      setConnectionStatus("Reconnecting…");
      setErrorText((prev) => prev ?? MSG.voiceConnection);
      reconnectTimerRef.current = window.setTimeout(connectWS, 2500);
    };
  }, [normalizedVoiceUrl]); // eslint-disable-line

  const handleReconnect = useCallback(() => {
    if (!normalizedVoiceUrl) {
      setErrorText(MSG.configUnavailable);
      return;
    }

    setIsReconnecting(true);
    setErrorText(null);
    setConnectionStatus("Reconnecting…");
    setPhase("connecting");

    if (reconnectTimerRef.current) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN && wsReadyRef.current) {
      setIsReconnecting(false);
      setWsConnected(true);
      setConnectionStatus("Connected");
      setIsCallLive(true);
      micListenAllowedRef.current = true;
      setPhase("listening");
      if (micEnabledRef.current) scheduleVoiceCaptureRef.current();
      return;
    }

    const ws = wsRef.current;
    if (ws) {
      ws.onclose = null;
      ws.onerror = null;
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        try {
          ws.close();
        } catch {
          /* ignore */
        }
      }
      wsRef.current = null;
    }
    wsReadyRef.current = false;
    wsActiveRef.current += 1;

    resetMp3Player();
    stopRecognition();
    micListenAllowedRef.current = false;
    shuttingDownRef.current = false;
    connectWS();
  }, [normalizedVoiceUrl, connectWS, resetMp3Player, stopRecognition]);

  useEffect(() => {
    shuttingDownRef.current = false;
    if (!normalizedVoiceUrl) return;
    connectWS();
    return () => {
      stopVoiceSessionResources();
    };
  }, [connectWS, stopVoiceSessionResources, normalizedVoiceUrl]);

  const recognitionAvailable = useMemo(() => {
    const w = window as Window & { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
    return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
  }, []);

  const serverSttExclusive = useExclusiveServerStt(recognitionAvailable, serverSttActive);

  useEffect(() => {
    if (phase !== "listening" || !micEnabled || !recognitionAvailable) return;
    const id = window.setInterval(() => {
      if (
        !micBootstrappedRef.current ||
        shuttingDownRef.current ||
        phaseRef.current !== "listening" ||
        tutorIsSpeaking(mp3PlayerRef.current)
      ) {
        return;
      }
      if (volumeRef.current > 0.06) {
        micListenAllowedRef.current = true;
        scheduleVoiceCaptureRef.current();
      }
    }, 2500);
    return () => window.clearInterval(id);
  }, [phase, micEnabled, recognitionAvailable]);

  // Server Whisper STT when the browser has no SpeechRecognition (e.g. Firefox).
  useEffect(() => {
    if (!serverSttExclusive || !micEnabled) return;
    const tick = window.setInterval(() => {
      if (
        shuttingDownRef.current ||
        serverSttProcessingRef.current ||
        phaseRef.current !== "listening" ||
        tutorIsSpeaking(mp3PlayerRef.current) ||
        textInputOpenRef.current
      ) {
        return;
      }
      const stream = analyserStreamRef.current;
      const recorder = serverSttRecorderRef.current;
      if (!stream || !recorder || !micBootstrappedRef.current) return;

      const level = volumeRef.current;
      const speaking = level > 0.06;

      if (speaking) {
        speechActiveRef.current = true;
        silenceSinceRef.current = null;
        if (!recorder.isRecording()) {
          try {
            recorder.start();
          } catch {
            /* ignore */
          }
        }
        setInterimTranscript("Listening…");
        return;
      }

      if (!speechActiveRef.current) return;
      if (silenceSinceRef.current === null) {
        silenceSinceRef.current = Date.now();
        return;
      }
      if (Date.now() - silenceSinceRef.current < 750) return;

      speechActiveRef.current = false;
      silenceSinceRef.current = null;
      if (!recorder.isRecording()) return;

      serverSttProcessingRef.current = true;
      void (async () => {
        try {
          const blob = await recorder.stop();
          setInterimTranscript("Understanding…");
          if (blob.size < 400) return;
          const raw = await transcribeWithServer(blob, normalizedVoiceUrl, {
            subjectName: subjectLabel,
            token: getAccessToken() || null,
            language: "en",
          });
          const cleaned = postprocessVoiceTranscript(raw, subjectLabel);
          if (cleaned.length >= 2 && phaseRef.current === "listening") {
            void handleUserTurnRef.current(cleaned, ++turnIdRef.current, { requireMic: true });
          }
        } catch {
          if (!serverSttExclusive) scheduleVoiceCaptureRef.current();
        } finally {
          serverSttProcessingRef.current = false;
          setInterimTranscript("");
        }
      })();
    }, 120);
    return () => window.clearInterval(tick);
  }, [serverSttExclusive, micEnabled, normalizedVoiceUrl, subjectLabel]);

  const startRecognitionImpl = (attempt = 0) => {
    if (shuttingDownRef.current || !recognitionRef.current) return;
    if (!micEnabledRef.current || !micBootstrappedRef.current) return;
    if (phaseRef.current !== "listening" && phaseRef.current !== "idle") return;
    if (tutorIsSpeaking(mp3PlayerRef.current)) return;
    try {
      recognitionRef.current.start();
      setNeedsVoiceTap(false);
    } catch (err) {
      const name = err instanceof Error ? err.name : "";
      if (name !== "InvalidStateError" || attempt >= 8) return;
      window.setTimeout(() => startRecognitionImpl(attempt + 1), 120 + attempt * 80);
    }
  };

  const scheduleVoiceCapture = useCallback(() => {
    if (shuttingDownRef.current || serverSttExclusive) return;
    if (!recognitionAvailable) return;
    if (!micEnabledRef.current || !micBootstrappedRef.current) return;
    const currentPhase = phaseRef.current;
    if (currentPhase !== "listening" && currentPhase !== "idle") return;

    if (!tutorIsSpeaking(mp3PlayerRef.current)) {
      startRecognitionImpl();
      return;
    }

    const player = mp3PlayerRef.current;
    const el = player?.element;
    if (!el) {
      startRecognitionImpl();
      return;
    }
    const onPlaybackDone = () => {
      el.removeEventListener("ended", onPlaybackDone);
      el.removeEventListener("pause", onPlaybackDone);
      window.setTimeout(() => startRecognitionImpl(), 400);
    };
    el.addEventListener("ended", onPlaybackDone, { once: true });
    el.addEventListener("pause", onPlaybackDone, { once: true });
  }, [recognitionAvailable, serverSttExclusive]);

  scheduleVoiceCaptureRef.current = scheduleVoiceCapture;

  const startMicAnalyser = useCallback((stream: MediaStream) => {
    analyserCleanupRef.current?.();
    analyserStreamRef.current = stream;
    const Ctor =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const micCtx = new Ctor();
    void micCtx.resume().catch(() => {});
    const analyser = micCtx.createAnalyser();
    analyser.fftSize = 1024;
    micCtx.createMediaStreamSource(stream).connect(analyser);
    const data = new Uint8Array(analyser.fftSize);
    analyserCleanupRef.current = () => {
      stream.getTracks().forEach((t) => t.stop());
      analyserStreamRef.current = null;
      try {
        micCtx.close();
      } catch {
        /* ignore */
      }
    };
    const tick = () => {
      if (!analyserStreamRef.current) return;
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
  }, []);

  const bootstrapVoiceInput = useCallback(async () => {
    if (!micEnabledRef.current || shuttingDownRef.current) return;
    try {
      if (!micBootstrappedRef.current) {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        micBootstrappedRef.current = true;
        startMicAnalyser(stream);
        serverSttRecorderRef.current = createVoiceRecorder(stream);
        setNeedsVoiceTap(false);
        setErrorText(null);
      }
      micListenAllowedRef.current = true;
      void unlockAudioPlayback();
      scheduleVoiceCaptureRef.current();
    } catch {
      setErrorText(MSG.micPermission);
    }
  }, [startMicAnalyser, unlockAudioPlayback]);

  bootstrapVoiceInputRef.current = bootstrapVoiceInput;

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
    syncAssistantText("");
    setVoiceRelatedImages([]);

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "interrupt" }));
    }

    micListenAllowedRef.current = true;
    setPhase("listening");
    setInterimTranscript("");
    if (micEnabledRef.current) scheduleVoiceCaptureRef.current();

    window.setTimeout(() => {
      interruptingRef.current = false;
    }, 350);
  }, [syncAssistantText]);

  handleInterruptRef.current = handleInterrupt;

  const handleUserTurn = async (
    userText: string,
    turnId: number,
    opts?: { requireMic?: boolean; skipPhaseCheck?: boolean; skipPlaybackCheck?: boolean },
  ) => {
    if (shuttingDownRef.current) return;
    if (!normalizedVoiceUrl) {
      setErrorText(MSG.configUnavailable);
      return;
    }
    if (opts?.requireMic !== false && !micEnabled) return;
    if (
      !opts?.skipPhaseCheck &&
      (phaseRef.current === "thinking" || phaseRef.current === "connecting")
    ) {
      return;
    }
    if (
      !opts?.skipPhaseCheck &&
      phaseRef.current === "speaking" &&
      tutorIsSpeaking(mp3PlayerRef.current)
    ) {
      return;
    }
    if (
      !opts?.skipPlaybackCheck &&
      !opts?.skipPhaseCheck &&
      tutorIsSpeaking(mp3PlayerRef.current)
    ) {
      return;
    }
    const trimmed = postprocessVoiceTranscript(userText, subjectLabel).trim();
    if (trimmed.length < 2) return;

    // Keep speech recognition running; onresult ignores non-listening phases.
    // Stopping here breaks Chrome restart after the first turn.
    micListenAllowedRef.current = false;
    setPhase("thinking");
    setInterimTranscript("");
    setTutorUnderstandingHint(null);
    setErrorText(null);
    syncAssistantText("");
    setVoiceRelatedImages([]);
    appendUserTranscript(trimmed);
    stopAudioPlayback();

    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN && wsReadyRef.current) {
      try {
        void unlockAudioPlayback();
        resetMp3Player();
        ws.send(JSON.stringify({ type: "question", text: trimmed }));
        return;
      } catch {
        /* fall through to HTTP */
      }
    }

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const ctx = chapterCtxRef.current;
      const voiceEndpoint = ctx
        ? `${normalizedVoiceUrl}/auth/voice-stream`
        : `${normalizedVoiceUrl}/voice-stream`;
      const historyForHttp = [
        ...buildVoiceConversationHistory(transcriptEntriesRef.current),
        { role: "user" as const, content: trimmed },
      ];
      const body: Record<string, unknown> = {
        message: trimmed,
        conversation_id: "frontend-call",
        conversation_history: historyForHttp,
        tutor_state: tutorStateRef.current,
        student_name: userRef.current?.fullName || "",
      };
      if (ctx) {
        Object.assign(body, {
          board: ctx.board,
          class_level: ctx.classLevel,
          subject_name: ctx.subject,
          chapter_ids: ctx.chapterIds,
          chapter: ctx.chapterNames?.[0] || "",
          chapter_names: ctx.chapterNames,
        });
      }
      const authToken = getAccessToken();
      const res = await fetch(voiceEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(studentFriendlyApiError(errBody, res.status, MSG.voiceError));
      }
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
      let mathLesson: MathLesson | null = null;
      let scienceExperiment: ScienceExperiment | null = null;

      outer: while (true) {
        if (shuttingDownRef.current || turnIdRef.current !== turnId) break;
        const { done, value } = await reader.read();
        if (done || shuttingDownRef.current || turnIdRef.current !== turnId) break;
        for (const frame of frameParser.feed(value)) {
          if (frame.type === FRAME_TUTOR_HINT) {
            const hint = new TextDecoder().decode(frame.data).trim();
            if (hint) setTutorUnderstandingHint(hint);
          } else if (frame.type === FRAME_TEXT) {
            displayText += new TextDecoder().decode(frame.data);
            syncAssistantText(displayText);
            setPhase("speaking");
          } else if (frame.type === FRAME_IMAGES) {
            try {
              const parsed = JSON.parse(new TextDecoder().decode(frame.data));
              relatedImgs = Array.isArray(parsed)
                ? (parsed.filter((x) => x && typeof x === "object") as VoiceRelatedImage[])
                : [];
              setVoiceRelatedImages(relatedImgs);
            } catch { /* ignore */ }
          } else if (frame.type === FRAME_MATH_LESSON) {
            try {
              const parsed = JSON.parse(new TextDecoder().decode(frame.data)) as {
                lesson?: MathLesson;
                clean_answer?: string;
              };
              if (parsed.lesson && typeof parsed.lesson === "object") {
                mathLesson = parsed.lesson;
                voiceMathLessonRef.current = parsed.lesson;
                setStreamingMathLesson(parsed.lesson);
                const clean = String(parsed.clean_answer ?? "").trim();
                if (clean && !displayText.trim()) {
                  displayText = clean;
                  syncAssistantText(clean);
                }
              }
            } catch { /* ignore */ }
          } else if (frame.type === FRAME_SCIENCE_EXPERIMENT) {
            try {
              const parsed = JSON.parse(new TextDecoder().decode(frame.data)) as {
                experiment?: ScienceExperiment;
                clean_answer?: string;
              };
              if (parsed.experiment && typeof parsed.experiment === "object") {
                scienceExperiment = parsed.experiment;
                voiceScienceExperimentRef.current = parsed.experiment;
                setStreamingScienceExperiment(parsed.experiment);
                const clean = String(parsed.clean_answer ?? "").trim();
                if (clean && !displayText.trim()) {
                  displayText = clean;
                  syncAssistantText(clean);
                }
              }
            } catch { /* ignore */ }
          } else if (frame.type === FRAME_TUTOR_STATE) {
            const next = new TextDecoder().decode(frame.data).trim();
            if (next) setTutorState(next);
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

      if (
        !shuttingDownRef.current &&
        turnIdRef.current === turnId &&
        (displayText.trim() || mathLesson || scienceExperiment)
      ) {
        setTranscriptEntries((prev) => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            role: "assistant",
            text: displayText.trim(),
            timeSec: getCallSeconds(),
            images: relatedImgs.length > 0 ? relatedImgs : undefined,
            mathLesson: mathLesson ?? undefined,
            scienceExperiment: scienceExperiment ?? undefined,
          },
        ]);
        syncAssistantText("");
        setVoiceRelatedImages([]);
        setStreamingMathLesson(null);
        setStreamingScienceExperiment(null);
        voiceMathLessonRef.current = null;
        voiceScienceExperimentRef.current = null;
        fallbackPlayer.signalNoMoreChunks();
        await fallbackPlayer.waitForPlaybackEnd();
        if (shuttingDownRef.current) return;
        micListenAllowedRef.current = true;
        setTutorUnderstandingHint(null);
        setPhase("listening");
        scheduleVoiceCaptureRef.current();
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") return;
      setErrorText(studentFriendlyError(e, MSG.voiceError));
      setPhase("error");
    } finally {
      abortRef.current = null;
    }
  };

  handleUserTurnRef.current = handleUserTurn;

  useEffect(() => {
    if (!recognitionAvailable || serverSttExclusive) return;
    const w = window as any;
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return;
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = voiceRecognitionLang(subjectLabel);
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
            }, 300);
          } else {
            interim += txt;
          }
        }
        if (interim.trim()) setInterimTranscript(interim.trim());
        return;
      }

      if (phaseRef.current !== "listening") return;
      if (tutorIsSpeaking(mp3PlayerRef.current)) return;

      const dictatingToTextField = textInputOpenRef.current;
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const txt = event.results[i][0]?.transcript || "";
        if (event.results[i].isFinal) {
          finalAccumulator += (finalAccumulator ? " " : "") + txt;
          if (finalizeTimer) window.clearTimeout(finalizeTimer);
          finalizeTimer = window.setTimeout(() => {
            const t = finalAccumulator.trim();
            finalAccumulator = "";
            if (!t) return;
            if (textInputOpenRef.current) {
              const combined = textDictationRef.current
                ? `${textDictationRef.current} ${t}`.trim()
                : t;
              setTextInput("");
              setInterimTranscript("");
              textDictationRef.current = "";
              if (combined.length >= 2) {
                void handleUserTurnRef.current(combined, ++turnIdRef.current, {
                  requireMic: false,
                  skipPlaybackCheck: true,
                });
              }
              return;
            }
            void handleUserTurnRef.current(t, ++turnIdRef.current, { requireMic: true });
          }, 300);
        } else {
          interim += txt;
        }
      }
      if (dictatingToTextField) {
        setInterimTranscript(interim.trim());
        return;
      }
      setInterimTranscript(interim.trim());
    };
    rec.onend = () => {
      if (shuttingDownRef.current || !micEnabledRef.current) return;
      if (phaseRef.current !== "listening") return;
      window.setTimeout(() => startRecognitionImpl(), 100);
    };
    rec.onerror = (event: any) => {
      const code = event?.error as string | undefined;
      if (code === "aborted" || code === "no-speech") return;
      if (code === "not-allowed" || code === "service-not-allowed") {
        setErrorText(MSG.micPermission);
        return;
      }
      window.setTimeout(() => scheduleVoiceCaptureRef.current(), 500);
    };
    recognitionRef.current = rec;
    return () => { try { rec.stop(); } catch { /* ignore */ } };
  }, [recognitionAvailable, subjectLabel, serverSttExclusive]);

  useEffect(() => {
    return () => {
      analyserCleanupRef.current?.();
    };
  }, []);

  useEffect(() => {
    if (phase === "error" || !recognitionAvailable) return;
    if (phase === "listening" && micEnabled) {
      micListenAllowedRef.current = true;
      if (micBootstrappedRef.current) {
        scheduleVoiceCapture();
      }
    } else if (phase === "speaking" && bargeInEnabled && micEnabled && micBootstrappedRef.current) {
      startRecognition();
    } else if (
      (phase === "speaking" && !bargeInEnabled) ||
      phase === "connecting"
    ) {
      stopRecognition();
    }
  }, [phase, micEnabled, recognitionAvailable, bargeInEnabled, scheduleVoiceCapture]); // eslint-disable-line

  useEffect(() => {
    if (!micEnabled || phase === "error") return;
    if (phase === "idle" && micListenAllowedRef.current) {
      setPhase("listening");
    }
  }, [micEnabled, phase]);

  // Stuck in connecting (e.g. greeting never finished) — still allow voice after a short wait.
  useEffect(() => {
    if (phase !== "connecting" || !isCallLive) return;
    const t = window.setTimeout(() => {
      if (phaseRef.current !== "connecting" || shuttingDownRef.current) return;
      micListenAllowedRef.current = true;
      setPhase("listening");
      scheduleVoiceCaptureRef.current();
    }, 6000);
    return () => window.clearTimeout(t);
  }, [phase, isCallLive]);

  // Empty session: after mic is allowed, keep speech recognition alive.
  useEffect(() => {
    if (!isCallLive || phase !== "listening" || !micEnabled || !micBootstrappedRef.current) return;
    scheduleVoiceCaptureRef.current();
    const id = window.setInterval(() => {
      if (
        phaseRef.current !== "listening" ||
        shuttingDownRef.current ||
        !micBootstrappedRef.current
      ) {
        return;
      }
      micListenAllowedRef.current = true;
      scheduleVoiceCaptureRef.current();
    }, 3000);
    return () => window.clearInterval(id);
  }, [isCallLive, phase, micEnabled, scheduleVoiceCapture]);

  // Unlock audio and voice capture on user interaction (browser mic / speech policy).
  useEffect(() => {
    const onGesture = () => {
      void bootstrapVoiceInputRef.current();
    };
    window.addEventListener("pointerdown", onGesture, { passive: true });
    window.addEventListener("keydown", onGesture);
    return () => {
      window.removeEventListener("pointerdown", onGesture);
      window.removeEventListener("keydown", onGesture);
    };
  }, []);

  const leaveVoiceSession = useCallback(() => {
    finalizeAssistantTurn();
    stopVoiceSessionResources();
    clearVoiceSession(voiceSessionKey);
    setTranscriptEntries([]);
    setSessionRestored(false);
    syncAssistantText("");
    setInterimTranscript("");
    setPhase("idle");
    setIsCallLive(false);
    callStartRef.current = null;
    setCallSeconds(0);
  }, [finalizeAssistantTurn, stopVoiceSessionResources, voiceSessionKey, syncAssistantText]);

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

  const handleSendText = useCallback(() => {
    const combined = interimTranscript.trim()
      ? textInput.trim()
        ? `${textInput.trim()} ${interimTranscript.trim()}`
        : interimTranscript.trim()
      : textInput.trim();
    if (combined.length < 2) return;
    setTextInput("");
    setInterimTranscript("");
    textDictationRef.current = "";
    void handleUserTurnRef.current(combined, ++turnIdRef.current, {
      requireMic: false,
      skipPlaybackCheck: true,
      skipPhaseCheck: true,
    });
  }, [textInput, interimTranscript]);

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

  const showReconnectBar =
    Boolean(errorText) ||
    isReconnecting ||
    connectionStatus === "Connection problem" ||
    connectionStatus === "Reconnecting…" ||
    connectionStatus === "Can't reach your tutor right now" ||
    connectionStatus === "Can't connect to tutor";

  const reconnectMessage =
    errorText ||
    (connectionStatus === "Reconnecting…" || isReconnecting
      ? "Reconnecting to your tutor…"
      : MSG.voiceConnection);

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
            ) : showReconnectBar ? (
              <span className="text-destructive shrink-0 font-medium">Offline</span>
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
          <span className="sm:hidden inline-flex items-center gap-1 text-[10px] font-medium">
            {isCallLive ? (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-emerald-600 dark:text-emerald-400">Live</span>
              </>
            ) : showReconnectBar ? (
              <span className="text-destructive">Offline</span>
            ) : (
              <span className="text-amber-600 dark:text-amber-400">…</span>
            )}
          </span>
          <Badge
            variant="outline"
            className="font-mono text-xs tabular-nums border-border text-foreground bg-muted/50 px-2.5 py-0.5"
          >
            {String(Math.floor(callSeconds / 60)).padStart(2, "0")}:{String(callSeconds % 60).padStart(2, "0")}
          </Badge>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            {wsConnected ? "Connected" : connectionStatus}
          </span>
        </div>
      </header>

      {showReconnectBar && (
        <div className="shrink-0 flex items-center justify-between gap-3 border-b border-destructive/30 bg-destructive/10 px-3 py-2 sm:px-4">
          <p className="text-xs sm:text-sm text-destructive min-w-0">{reconnectMessage}</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="shrink-0 h-8 gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10"
            onClick={handleReconnect}
            disabled={isReconnecting && connectionStatus === "Reconnecting…"}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isReconnecting ? "animate-spin" : ""}`} />
            {isReconnecting ? "Reconnecting…" : "Reconnect"}
          </Button>
        </div>
      )}

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
          understandingHint={tutorUnderstandingHint}
          entries={transcriptEntries}
          isTyping={isTyping}
          streamingAssistantText={assistantText || undefined}
          streamingRelatedImages={voiceRelatedImages}
          streamingMathLesson={streamingMathLesson}
          streamingScienceExperiment={streamingScienceExperiment}
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
            } else {
              micListenAllowedRef.current = true;
              setPhase("listening");
              void bootstrapVoiceInput();
            }
          }}
          onToggleSpeaker={() => {
            setSpeakerEnabled((v) => !v);
            if (speakerEnabled) stopAudioPlayback();
          }}
          onInterrupt={handleInterrupt}
          canInterrupt={phase === "speaking" || phase === "thinking"}
          onEndCall={handleEndCall}
          textInput={textInput}
          interimTranscript={interimTranscript}
          onTextInputChange={(value) => {
            textDictationRef.current = value;
            setTextInput(value);
            if (!value.trim()) setInterimTranscript("");
          }}
          onTextInputOpenChange={(open) => {
            textInputOpenRef.current = open;
            if (open) {
              textDictationRef.current = textInput;
              void bootstrapVoiceInputRef.current();
            } else {
              setInterimTranscript("");
            }
          }}
          onSendText={handleSendText}
          isCallLive={isCallLive}
          sessionResumed={sessionRestored}
        />
      </main>

      {!recognitionAvailable && (
        <div className="fixed bottom-4 left-4 right-4 lg:left-auto lg:right-4 lg:max-w-sm rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100 z-50">
          {MSG.speechUnsupported}
        </div>
      )}

      {recognitionAvailable && needsVoiceTap && phase === "listening" && micEnabled && (
        <div className="fixed bottom-20 left-4 right-4 lg:left-auto lg:right-4 lg:max-w-sm rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-foreground z-50 shadow-lg">
          Tap anywhere on the page to allow the microphone, then speak your question.
        </div>
      )}
    </div>
  );
}
