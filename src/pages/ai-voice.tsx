import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { stripGreetSearchParam } from "@/lib/tutor-greeting";
import {
  buildVoiceSessionKey,
  clearVoiceSession,
  loadVoiceSession,
  saveVoiceSession,
} from "@/lib/voice-session-storage";
import { chapterSelectionPath } from "@/lib/tutor-chapter-nav";
import { useStudySession } from "@/hooks/use-study-session";
import { useAuthStore } from "@/lib/auth-store";
import { buildWsUrl, getHttpApiBase, getVoiceHttpBase } from "@/lib/api-base";
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
  createContinuousMicRecorder,
  fetchServerSttAvailable,
  shouldUseServerStt,
  transcribeWithServer,
  useWhisperVoiceCapture,
  blobToBase64,
  BARGE_GATE_PRE_ROLL_MS,
  POST_INTERRUPT_PRE_ROLL_MS,
} from "@/lib/voice-server-stt";
import {
  BARGE_IN_ARM_DELAY_MS,
  BARGE_IN_DUCK_VOLUME,
  BARGE_IN_HOLD_MS,
  BARGE_CHECK_REQUIRED,
  BARGE_CONFIRMED,
  INTERRUPT_COOLDOWN_MS,
  INTERRUPT_RESUME_LISTEN_MS,
  POST_PLAYBACK_ECHO_MS,
  POST_PLAYBACK_LISTEN_MS,
  STT_FINAL_DEBOUNCE_MS,
  STT_INTERIM_COMPLETE_MS,
  VOICE_PROTECTION_ENABLED,
} from "@/lib/voice-conversation-config";
import {
  appendAiSpeechTail,
  evaluateIncomingTranscript,
  logSttVerdict,
} from "@/lib/voice-echo-guard";
import {
  detectInterruptIntent,
  looksLikeStudentQuestion,
  stripConversationalLeadIn,
} from "@/lib/voice-interrupt-intent";
import {
  checkBargeIn,
  createClientProtectionMetrics,
  endVoiceSession,
} from "@/lib/voice-protection";
import { logVoiceStreamMetrics } from "@/lib/voice-stream-diagnostics";
import { logVoicePlayerStats } from "@/lib/voice-audio-diagnostics";
import {
  loadTutorVoiceGender,
  saveTutorVoiceGender,
  tutorVoiceId,
  type TutorVoiceGender,
} from "@/lib/tutor-voice";
import type { MathLesson } from "@/types/math-lesson";
import type { ScienceExperiment } from "@/types/science-experiment";
import { ArrowLeft, BookOpen, RefreshCw } from "lucide-react";

type Phase = VoicePhase;
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/** WS assistant events after interrupt/question must match this epoch or are dropped */
function isStaleAssistantStream(
  streamEpochRef: MutableRefObject<number>,
  activeQuestionEpochRef: MutableRefObject<number>,
): boolean {
  return streamEpochRef.current !== activeQuestionEpochRef.current;
}

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

function isTutorAudible(
  wsPlayer: Mp3StreamPlayer | null | undefined,
  fallbackPlayer: Mp3StreamPlayer | null | undefined,
): boolean {
  return tutorIsSpeaking(wsPlayer) || tutorIsSpeaking(fallbackPlayer);
}

function setTutorPlaybackVolume(
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

export default function AIVoicePage() {
  const [, setLocation] = useLocation();
  const { token: accessToken, user } = useAuthStore();
  const API_URL = getHttpApiBase();
  const VOICE_URL = getVoiceHttpBase();
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

  const primaryChapterId = chapterCtx?.chapterIds[0]
    ? Number(chapterCtx.chapterIds[0])
    : null;

  useStudySession({
    enabled: Boolean(chapterCtx?.subject),
    subjectName: chapterCtx?.subject,
    chapterId: primaryChapterId != null && !Number.isNaN(primaryChapterId) ? primaryChapterId : null,
    chapterName: chapterCtx?.chapterNames[0] ?? null,
    mode: "ai_voice",
    agentMode: "free",
  });

  const normalizedVoiceUrl = useMemo(() => {
    const url = (VOICE_URL || API_URL).trim();
    return url.endsWith("/") ? url.slice(0, -1) : url;
  }, [VOICE_URL, API_URL]);

  const subjectLabel = chapterCtx?.subject || "General";

  const serverSttPreferred = useMemo(() => shouldUseServerStt(subjectLabel), [subjectLabel]);
  const [serverSttActive, setServerSttActive] = useState(false);
  const whisperPrimary = useWhisperVoiceCapture(serverSttActive);

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
  const [voiceGender, setVoiceGender] = useState<TutorVoiceGender>(() => loadTutorVoiceGender());
  const [connectionStatus, setConnectionStatus] = useState("Connecting...");
  const [interimTranscript, setInterimTranscript] = useState("");
  const interimTranscriptRef = useRef("");
  const [assistantText, setAssistantText] = useState("");
  const [errorText, setErrorText] = useState<string | null>(null);
  const [voiceRelatedImages, setVoiceRelatedImages] = useState<VoiceRelatedImage[]>([]);
  const [streamingMathLesson, setStreamingMathLesson] = useState<MathLesson | null>(null);
  const [streamingScienceExperiment, setStreamingScienceExperiment] = useState<ScienceExperiment | null>(null);
  const [spokenUnitText, setSpokenUnitText] = useState<string | null>(null);
  const [, setSpokenUnitIndex] = useState(-1);

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
  const abortRecognitionRef = useRef<() => void>(() => {});
  const startRecognitionImplRef = useRef<(attempt?: number) => void>(() => {});
  const startRecognition = () => startRecognitionRef.current();
  const stopRecognition = () => stopRecognitionRef.current();
  const abortRecognition = () => abortRecognitionRef.current();
  const turnIdRef = useRef(0);
  /** Bumped on new question or interrupt — invalidates in-flight WS assistant stream */
  const streamEpochRef = useRef(0);
  const activeQuestionEpochRef = useRef(0);
  const analyserCleanupRef = useRef<(() => void) | null>(null);
  const phaseRef = useRef<Phase>(phase);
  const micEnabledRef = useRef(micEnabled);
  const speakerEnabledRef = useRef(speakerEnabled);
  const voiceGenderRef = useRef(voiceGender);
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
  const lastSubmittedTranscriptRef = useRef("");
  const lastSubmittedAtRef = useRef(0);
  const armWhisperBrowserFallbackRef = useRef<(ms?: number) => void>(() => {});
  const whisperBrowserFallbackUntilRef = useRef(0);
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
  const handleInterruptRef = useRef<(opts?: { skipBargeCapture?: boolean }) => void>(() => {});
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
  const serverSttRecorderRef = useRef<ReturnType<typeof createContinuousMicRecorder> | null>(null);
  const serverSttProcessingRef = useRef(false);
  const speechActiveRef = useRef(false);
  const silenceSinceRef = useRef<number | null>(null);
  const utteranceStartedAtRef = useRef(0);
  const bargeUtteranceActiveRef = useRef(false);
  const bargeEchoGuardRef = useRef("");
  const recentAiSpeechRef = useRef("");
  const sttCooldownUntilRef = useRef(0);
  const echoBaselineRef = useRef(0);
  const bargeInHoldSinceRef = useRef<number | null>(null);
  const bargeVolumeHistoryRef = useRef<number[]>([]);
  const tickBargeInMonitorRef = useRef<(level: number) => void>(() => {});
  const bargeInEnabledRef = useRef(bargeInEnabled);
  const protectionMetricsRef = useRef(createClientProtectionMetrics());
  const voiceSessionIdRef = useRef(
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `voice-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  const listeningUtteranceActiveRef = useRef(false);
  const lastUtteranceBlobRef = useRef<Blob | null>(null);
  const whisperPrimaryRef = useRef(whisperPrimary);
  const finalizeUtteranceRef = useRef<(blob: Blob, mode: "listen" | "barge") => void>(() => {});

  useEffect(() => { interimTranscriptRef.current = interimTranscript; }, [interimTranscript]);

  useEffect(() => { chapterCtxRef.current = chapterCtx; }, [chapterCtx]);
  useEffect(() => { bargeInEnabledRef.current = bargeInEnabled; }, [bargeInEnabled]);
  useEffect(() => { whisperPrimaryRef.current = whisperPrimary; }, [whisperPrimary]);

  useEffect(() => { userRef.current = user; }, [user]);

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { micEnabledRef.current = micEnabled; }, [micEnabled]);
  useEffect(() => { speakerEnabledRef.current = speakerEnabled; }, [speakerEnabled]);
  useEffect(() => { voiceGenderRef.current = voiceGender; }, [voiceGender]);

  const syncAssistantText = useCallback((next: string) => {
    assistantTextRef.current = next;
    setAssistantText(next);
    if (next.trim()) {
      recentAiSpeechRef.current = appendAiSpeechTail("", next);
      bargeEchoGuardRef.current = recentAiSpeechRef.current;
    }
  }, []);

  const appendAssistantToken = useCallback((tok: string) => {
    const next = assistantTextRef.current + tok;
    assistantTextRef.current = next;
    setAssistantText(next);
    if (tok) {
      recentAiSpeechRef.current = appendAiSpeechTail(recentAiSpeechRef.current, tok);
      bargeEchoGuardRef.current = recentAiSpeechRef.current;
    }
  }, []);

  const armSttCooldown = useCallback((ms = POST_PLAYBACK_ECHO_MS) => {
    sttCooldownUntilRef.current = Date.now() + ms;
  }, []);

  const isSttCooldownActive = useCallback(() => Date.now() < sttCooldownUntilRef.current, []);

  const isAiSpeakingNow = useCallback(
    () =>
      phaseRef.current === "speaking" ||
      isTutorAudible(mp3PlayerRef.current, fallbackMp3Ref.current),
    [],
  );

  const canAcceptSttNow = useCallback(() => {
    if (shuttingDownRef.current) return false;
    if (isAiSpeakingNow()) return false;
    if (isSttCooldownActive()) return false;
    return true;
  }, [isAiSpeakingNow, isSttCooldownActive]);

  const rejectTranscriptCandidate = useCallback(
    (raw: string, source: string): boolean => {
      const cleaned = postprocessVoiceTranscript(raw, subjectLabel).trim();
      const intent = detectInterruptIntent(cleaned);
      if (intent.isInterruptIntent) {
        logSttVerdict("accepted", cleaned, { source, reason: "interrupt_intent", phrase: intent.matchedPhrase });
        return false;
      }
      const { verdict, similarity } = evaluateIncomingTranscript(
        cleaned,
        recentAiSpeechRef.current,
      );
      if (verdict === "echo_rejected") {
        protectionMetricsRef.current.bump("echo_rejected_count");
        protectionMetricsRef.current.set("echo_similarity_score", similarity);
      }
      if (verdict !== "accepted") {
        logSttVerdict(verdict, cleaned, { source, similarity });
        return true;
      }
      logSttVerdict("accepted", cleaned, { source, similarity });
      return false;
    },
    [subjectLabel],
  );

  const canAcceptSttNowRef = useRef(canAcceptSttNow);
  const rejectTranscriptCandidateRef = useRef(rejectTranscriptCandidate);
  useEffect(() => {
    canAcceptSttNowRef.current = canAcceptSttNow;
  }, [canAcceptSttNow]);
  useEffect(() => {
    rejectTranscriptCandidateRef.current = rejectTranscriptCandidate;
  }, [rejectTranscriptCandidate]);

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
    if (!serverSttPreferred) {
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

  const finalizeAssistantTurnRef = useRef(finalizeAssistantTurn);
  useEffect(() => {
    finalizeAssistantTurnRef.current = finalizeAssistantTurn;
  }, [finalizeAssistantTurn]);

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
      armSttCooldown(POST_PLAYBACK_ECHO_MS);
      await new Promise<void>((r) => window.setTimeout(r, POST_PLAYBACK_ECHO_MS));
    } else {
      armSttCooldown(POST_PLAYBACK_ECHO_MS);
    }
    if (shuttingDownRef.current) return;
    if (phaseRef.current === "thinking" || phaseRef.current === "connecting") return;
    micListenAllowedRef.current = true;
    bargeUtteranceActiveRef.current = false;
    listeningUtteranceActiveRef.current = false;
    setPhase("listening");
    setInterimTranscript("");
    window.setTimeout(() => scheduleVoiceCaptureRef.current(), POST_PLAYBACK_LISTEN_MS);
  }, [armSttCooldown]);

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
    if (isStaleAssistantStream(streamEpochRef, activeQuestionEpochRef)) return;
    if (!speakerEnabledRef.current || raw.byteLength === 0) return;
    if (!mp3PlayerRef.current) {
      const player = new Mp3StreamPlayer();
      player.resetTurnClock();
      mp3PlayerRef.current = player;
    }
    const player = mp3PlayerRef.current;
    void player.ready().then(() => {
      if (bargeInEnabledRef.current && phaseRef.current === "speaking") {
        player.element.volume = BARGE_IN_DUCK_VOLUME;
      }
      player.enqueue(raw);
      if (player.element.paused) {
        void player.element.play().catch(() => {});
      }
    });
    if (phaseRef.current !== "speaking") {
      setPhase("speaking");
      speakingStartedAtRef.current = Date.now();
      if (bargeInEnabledRef.current) {
        scheduleVoiceCaptureRef.current();
      } else {
        abortRecognitionRef.current();
      }
      echoBaselineRef.current = 0;
      bargeInHoldSinceRef.current = null;
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
        ws.send(
          JSON.stringify({
            type: "session_end",
            voice_session_id: voiceSessionIdRef.current,
          }),
        );
      } catch {
        /* ignore */
      }
      try {
        ws.send(JSON.stringify({ type: "stop" }));
      } catch {
        /* ignore */
      }
    }
    void endVoiceSession(voiceSessionIdRef.current, normalizedVoiceUrl, getAccessToken() || null);
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
  }, [disconnectVoiceSocket, normalizedVoiceUrl]);

  const connectWS = useCallback(() => {
    if (reconnectTimerRef.current) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (wsRef.current && wsRef.current.readyState <= WebSocket.OPEN) return;

    const myGen = ++wsActiveRef.current;
    const ctx = chapterCtxRef.current;
    const token = getAccessToken();
    const fullUrl = buildWsUrl(normalizedVoiceUrl, "/ws/voice", token ? { token } : undefined);

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
          voice_gender: voiceGenderRef.current,
          tts_voice: tutorVoiceId(voiceGenderRef.current),
          voice_session_id: voiceSessionIdRef.current,
        }),
      );
      if (!sendGreet) {
        void bootstrapVoiceInputRef.current();
        window.setTimeout(() => scheduleVoiceCaptureRef.current(), 100);
      }
    };

    ws.onmessage = async (event) => {
      if (shuttingDownRef.current) return;

      const staleAssistant = isStaleAssistantStream(streamEpochRef, activeQuestionEpochRef);

      if (event.data instanceof ArrayBuffer) {
        if (staleAssistant) return;
        enqueueMp3Chunk(event.data);
        return;
      }
      if (event.data instanceof Blob) {
        if (staleAssistant) return;
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

      // Phase 1: drop assistant stream events from a cancelled/previous turn
      const assistantEventTypes = new Set([
        "thinking",
        "speaking",
        "ai_text_token",
        "done",
        "related_images",
        "math_lesson",
        "science_experiment",
        "tutor_hint",
        "stream_metrics",
      ]);
      if (assistantEventTypes.has(String(msg.type)) && staleAssistant) {
        return;
      }

      switch (msg.type) {
        case "greeting_start":
          micListenAllowedRef.current = false;
          if (bargeInEnabledRef.current) {
            scheduleVoiceCaptureRef.current();
          } else {
            abortRecognition();
          }
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
          if (bargeInEnabledRef.current) {
            scheduleVoiceCaptureRef.current();
          }
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
          if (bargeInEnabledRef.current) {
            scheduleVoiceCaptureRef.current();
          } else {
            abortRecognition();
          }
          setPhase("speaking");
          speakingStartedAtRef.current = Date.now();
          echoBaselineRef.current = 0;
          bargeInHoldSinceRef.current = null;
          break;
        case "speech_unit": {
          const unit = String(msg.text ?? "").trim();
          setSpokenUnitText(unit || null);
          setSpokenUnitIndex(typeof msg.index === "number" ? msg.index : -1);
          break;
        }
        case "ai_text_token": {
          const tok = String(msg.token ?? "");
          if (phaseRef.current === "thinking") {
            if (bargeInEnabledRef.current) {
              scheduleVoiceCaptureRef.current();
            } else {
              abortRecognition();
            }
            setPhase("speaking");
            echoBaselineRef.current = 0;
            bargeInHoldSinceRef.current = null;
          }
          appendAssistantToken(tok);
          break;
        }
        case "interrupt_ack":
          streamEpochRef.current += 1;
          stopAudioPlayback();
          micListenAllowedRef.current = true;
          setPhase("listening");
          // Keep whatever the tutor already said — commit partial reply, don't wipe history.
          finalizeAssistantTurnRef.current();
          setSpokenUnitText(null);
          setSpokenUnitIndex(-1);
          if (micEnabledRef.current) scheduleVoiceCaptureRef.current();
          break;
        case "tutor_state":
          setTutorState(String(msg.state ?? "LISTENING"));
          break;
        case "done": {
          setTutorUnderstandingHint(null);
          setSpokenUnitText(null);
          setSpokenUnitIndex(-1);
          const playerStats = mp3PlayerRef.current?.stats();
          logVoicePlayerStats(playerStats);
          if (playerStats) {
            console.debug("[voice-metrics] player", playerStats);
          }
          finalizeAssistantTurn();
          void resumeListeningAfterPlayback();
          break;
        }
        case "listening":
          micListenAllowedRef.current = true;
          bargeUtteranceActiveRef.current = false;
          listeningUtteranceActiveRef.current = false;
          setPhase("listening");
          void bootstrapVoiceInputRef.current();
          window.setTimeout(() => scheduleVoiceCaptureRef.current(), POST_PLAYBACK_LISTEN_MS);
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
        case "stream_metrics":
          logVoiceStreamMetrics(msg.metrics, msg.phase);
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
    connectWS();
    return () => {
      stopVoiceSessionResources();
    };
  }, [connectWS, stopVoiceSessionResources, normalizedVoiceUrl]);

  const recognitionAvailable = useMemo(() => {
    const w = window as Window & { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
    return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
  }, []);

  const serverSttActiveRef = useRef(serverSttActive);
  useEffect(() => { serverSttActiveRef.current = serverSttActive; }, [serverSttActive]);

  const beginBargeGateCapture = () => {
    const mic = serverSttRecorderRef.current;
    if (!mic) return;
    mic.ensureRunning();
    if (!mic.isCapturingUtterance()) {
      mic.beginUtteranceCapture({ preRollMs: BARGE_GATE_PRE_ROLL_MS });
      bargeUtteranceActiveRef.current = true;
      utteranceStartedAtRef.current = Date.now();
      speechActiveRef.current = true;
      silenceSinceRef.current = null;
    }
  };

  /** Fresh clip after tutor stops — no long tutor pre-roll. */
  const beginPostInterruptCapture = () => {
    const mic = serverSttRecorderRef.current;
    if (!mic) return;
    mic.ensureRunning();
    if (mic.isCapturingUtterance()) {
      mic.endUtteranceCapture();
    }
    mic.beginUtteranceCapture({ preRollMs: POST_INTERRUPT_PRE_ROLL_MS });
    bargeUtteranceActiveRef.current = true;
    utteranceStartedAtRef.current = Date.now();
    speechActiveRef.current = true;
    silenceSinceRef.current = null;
    setInterimTranscript("Listening…");
  };

  useEffect(() => {
    if (phase !== "listening" || !micEnabled || !recognitionAvailable) return;
    const id = window.setInterval(() => {
      if (
        shuttingDownRef.current ||
        phaseRef.current !== "listening" ||
        !isTutorAudible(mp3PlayerRef.current, fallbackMp3Ref.current)
      ) {
        return;
      }
      abortRecognitionRef.current();
    }, 200);
    return () => window.clearInterval(id);
  }, [phase, micEnabled, recognitionAvailable]);

  useEffect(() => {
    if (phase !== "listening" || !micEnabled) return;
    if (!recognitionAvailable && !serverSttActive) return;
    const id = window.setInterval(() => {
      if (
        !micBootstrappedRef.current ||
        shuttingDownRef.current ||
        phaseRef.current !== "listening" ||
        isTutorAudible(mp3PlayerRef.current, fallbackMp3Ref.current)
      ) {
        return;
      }
      if (volumeRef.current > 0.06) {
        micListenAllowedRef.current = true;
        scheduleVoiceCaptureRef.current();
      }
    }, 2500);
    return () => window.clearInterval(id);
  }, [phase, micEnabled, recognitionAvailable, serverSttActive]);

  // Server Whisper — primary listening + post-interrupt capture (cross-device).
  useEffect(() => {
    if (!serverSttActive || !micEnabled) return;
    const LISTEN_SILENCE_MS = 950;
    const BARGE_SILENCE_MS = 950;
    const MAX_UTTERANCE_MS = 11_000;
    const SPEECH_LEVEL = 0.018;

    const beginListenCapture = () => {
      const mic = serverSttRecorderRef.current;
      if (!mic || mic.isCapturingUtterance()) return;
      mic.ensureRunning();
      mic.beginUtteranceCapture();
      listeningUtteranceActiveRef.current = true;
      utteranceStartedAtRef.current = Date.now();
      speechActiveRef.current = false;
      silenceSinceRef.current = null;
    };

    const tick = window.setInterval(() => {
      if (shuttingDownRef.current || serverSttProcessingRef.current || textInputOpenRef.current) {
        return;
      }
      const mic = serverSttRecorderRef.current;
      if (!mic || !micBootstrappedRef.current) return;

      const phaseNow = phaseRef.current;
      const whisperOn = whisperPrimaryRef.current;
      const isBarge = bargeUtteranceActiveRef.current;
      const isListen =
        whisperOn &&
        micListenAllowedRef.current &&
        (phaseNow === "listening" ||
          (phaseNow === "idle" &&
            !isTutorAudible(mp3PlayerRef.current, fallbackMp3Ref.current)));

      if (!isBarge && !isListen) return;

      mic.ensureRunning();

      if (isListen && !mic.isCapturingUtterance() && !bargeUtteranceActiveRef.current) {
        beginListenCapture();
        setInterimTranscript("Listening…");
      }

      if (!mic.isCapturingUtterance()) return;

      if (
        isListen &&
        !speechActiveRef.current &&
        utteranceStartedAtRef.current &&
        Date.now() - utteranceStartedAtRef.current > 12_000
      ) {
        const blob = mic.endUtteranceCapture();
        listeningUtteranceActiveRef.current = false;
        if (blob.size >= 200) {
          serverSttProcessingRef.current = true;
          void finalizeUtterance(blob, "listen");
        } else {
          armWhisperBrowserFallbackRef.current();
          scheduleVoiceCaptureRef.current();
        }
        return;
      }

      const level = volumeRef.current;
      const speaking = level > SPEECH_LEVEL;
      const silenceMs = isBarge ? BARGE_SILENCE_MS : LISTEN_SILENCE_MS;

      if (speaking) {
        speechActiveRef.current = true;
        silenceSinceRef.current = null;
        if (isListen || isBarge) setInterimTranscript("Listening…");
        return;
      }

      if (utteranceStartedAtRef.current && Date.now() - utteranceStartedAtRef.current > MAX_UTTERANCE_MS) {
        speechActiveRef.current = false;
        silenceSinceRef.current = null;
        const blob = mic.endUtteranceCapture();
        bargeUtteranceActiveRef.current = false;
        listeningUtteranceActiveRef.current = false;
        if (blob.size < 200) {
          bargeEchoGuardRef.current = "";
          scheduleVoiceCaptureRef.current();
          return;
        }
        serverSttProcessingRef.current = true;
        void finalizeUtterance(blob, isBarge ? "barge" : "listen");
        return;
      }

      if (!speechActiveRef.current) return;
      if (silenceSinceRef.current === null) {
        silenceSinceRef.current = Date.now();
        return;
      }
      if (Date.now() - silenceSinceRef.current < silenceMs) return;

      speechActiveRef.current = false;
      silenceSinceRef.current = null;
      const blob = mic.endUtteranceCapture();
      bargeUtteranceActiveRef.current = false;
      listeningUtteranceActiveRef.current = false;
      if (blob.size < 200) {
        bargeEchoGuardRef.current = "";
        scheduleVoiceCaptureRef.current();
        return;
      }

      serverSttProcessingRef.current = true;
      void finalizeUtterance(blob, isBarge ? "barge" : "listen");
    }, 120);

    async function finalizeUtterance(blob: Blob, mode: "listen" | "barge") {
      try {
        setInterimTranscript("Understanding…");
        console.debug("[VOICE_STT] transcribe_start", { mode, bytes: blob.size });
        const result = await transcribeWithServer(blob, normalizedVoiceUrl, {
          subjectName: subjectLabel,
          token: getAccessToken() || null,
          language: "en",
          rejectIfSimilarTo: recentAiSpeechRef.current || "",
          voiceSessionId: voiceSessionIdRef.current,
        });
        let cleaned = stripConversationalLeadIn(
          postprocessVoiceTranscript(result.transcript, subjectLabel),
        );
        console.debug("[VOICE_STT] transcribe_result", {
          mode,
          rejected: result.rejected,
          len: cleaned.length,
        });
        const rejectSource = mode === "barge" ? "whisper-barge" : "whisper-listen";
        if (
          !cleaned ||
          cleaned.length < 2 ||
          result.rejected ||
          rejectTranscriptCandidateRef.current(cleaned, rejectSource)
        ) {
          if (mode === "barge") {
            beginPostInterruptCapture();
          } else {
            armWhisperBrowserFallbackRef.current();
            scheduleVoiceCaptureRef.current();
          }
          return;
        }
        lastUtteranceBlobRef.current = blob;
        if (mode === "barge") {
          if (phaseRef.current === "listening" || phaseRef.current === "thinking") {
            void handleUserTurnRef.current(cleaned, ++turnIdRef.current, {
              requireMic: true,
              skipPlaybackCheck: true,
            });
          }
          return;
        }
        void handleUserTurnRef.current(cleaned, ++turnIdRef.current, { requireMic: true });
      } catch {
        armWhisperBrowserFallbackRef.current();
        scheduleVoiceCaptureRef.current();
      } finally {
        serverSttProcessingRef.current = false;
        setInterimTranscript("");
      }
    }

    finalizeUtteranceRef.current = finalizeUtterance;

    return () => window.clearInterval(tick);
  }, [serverSttActive, micEnabled, normalizedVoiceUrl, subjectLabel]);

  // Production barge-in: Volume spike → capture → VAD/echo/speaker/intent → interrupt
  tickBargeInMonitorRef.current = (level: number) => {
    if (!bargeInEnabledRef.current || !micEnabledRef.current) return;
    if (
      shuttingDownRef.current ||
      interruptingRef.current ||
      phaseRef.current !== "speaking"
    ) {
      bargeVolumeHistoryRef.current = [];
      bargeInHoldSinceRef.current = null;
      echoBaselineRef.current = 0;
      return;
    }

    const started = speakingStartedAtRef.current;
    if (started && Date.now() - started < BARGE_IN_ARM_DELAY_MS) return;

    const history = bargeVolumeHistoryRef.current;
    history.push(level);
    if (history.length > 40) history.shift();

    let floor = level;
    if (history.length >= 8) {
      const sorted = [...history].sort((a, b) => a - b);
      floor = sorted[Math.floor(sorted.length * 0.2)] ?? level;
    }
    echoBaselineRef.current = floor;

    const spike = level - floor;
    const ratio = floor > 0.015 ? level / floor : 0;
    const userLikely = level > 0.045 && (spike > 0.028 || ratio > 1.14);

    if (!userLikely) {
      bargeInHoldSinceRef.current = null;
      return;
    }

    if (!bargeInHoldSinceRef.current) {
      bargeInHoldSinceRef.current = Date.now();
      beginBargeGateCapture();
      return;
    }
    if (Date.now() - bargeInHoldSinceRef.current < BARGE_IN_HOLD_MS) return;

    bargeInHoldSinceRef.current = null;
    bargeVolumeHistoryRef.current = [];

    const mic = serverSttRecorderRef.current;
    const snapshot =
      mic && mic.isCapturingUtterance() ? mic.endUtteranceCapture() : null;
    bargeUtteranceActiveRef.current = false;

    const studentKey = String(
      (userRef.current as { id?: string; email?: string; username?: string } | null)?.id ||
        (userRef.current as { email?: string } | null)?.email ||
        (userRef.current as { username?: string } | null)?.username ||
        "anonymous",
    );

    const applyBargeMetrics = (result: Awaited<ReturnType<typeof checkBargeIn>>) => {
      protectionMetricsRef.current.set("speech_probability", result.speech_probability ?? 0);
      protectionMetricsRef.current.set("speech_duration_ms", result.speech_duration_ms ?? 0);
      protectionMetricsRef.current.set("speaker_similarity", result.speaker_similarity ?? 0);
      protectionMetricsRef.current.set("echo_similarity_score", result.echo_similarity_score ?? 0);
    };

    if (
      !BARGE_CONFIRMED ||
      !VOICE_PROTECTION_ENABLED ||
      !BARGE_CHECK_REQUIRED
    ) {
      handleInterruptRef.current();
      return;
    }
    // No usable mic snapshot → do not stop the tutor (speaker bleed often triggers volume without speech evidence).
    if (!snapshot || snapshot.size < 200) {
      protectionMetricsRef.current.bump("interrupt_rejected_count");
      console.debug("[INTERRUPT_REJECTED]", { reason: "no_barge_snapshot" });
      return;
    }

    void (async () => {
      const t0 = performance.now();
      try {
        const result = await checkBargeIn(snapshot, normalizedVoiceUrl, {
          transcript: interimTranscriptRef.current || "",
          recentAiSpeech: recentAiSpeechRef.current,
          studentKey,
          voiceSessionId: voiceSessionIdRef.current,
          token: getAccessToken() || null,
        });
        applyBargeMetrics(result);

        if (!result.allow_interrupt) {
          protectionMetricsRef.current.bump("interrupt_rejected_count");
          console.debug("[INTERRUPT_REJECTED]", result);
          // Fail closed: TTS into an open mic must not stop the tutor when the server rejects.
          return;
        }

        console.debug("[INTERRUPT_ACCEPTED]", {
          latency_ms: performance.now() - t0,
          reason: result.reason,
          intent: result.intent,
        });
        protectionMetricsRef.current.bump("interrupt_accepted_count");
        handleInterruptRef.current({ skipBargeCapture: true });
        beginPostInterruptCapture();
      } catch (err) {
        protectionMetricsRef.current.bump("interrupt_rejected_count");
        console.debug("[INTERRUPT_CHECK]", { reason: "barge_check_error", err });
        // Fail closed on network/check errors — do not interrupt on TTS echo.
      }
    })();
  };

  useEffect(() => {
    const duck = bargeInEnabled && phase === "speaking";
    setTutorPlaybackVolume(
      mp3PlayerRef.current,
      fallbackMp3Ref.current,
      duck ? BARGE_IN_DUCK_VOLUME : 1,
    );
  }, [phase, bargeInEnabled]);

  const voiceCaptureAllowed = () => {
    if (shuttingDownRef.current) return false;
    const phaseNow = phaseRef.current;
    const bargePhase =
      bargeInEnabledRef.current &&
      micEnabledRef.current &&
      (phaseNow === "thinking" || phaseNow === "speaking");
    if (bargePhase) return !isSttCooldownActive();
    if (!canAcceptSttNow()) return false;
    if (phaseNow === "listening" || phaseNow === "idle") return true;
    return false;
  };

  const startRecognitionImpl = (attempt = 0) => {
    if (shuttingDownRef.current || !recognitionRef.current) return;
    if (!micEnabledRef.current || !micBootstrappedRef.current) return;
    if (!voiceCaptureAllowed()) return;
    if (isAiSpeakingNow()) {
      if (!(bargeInEnabledRef.current && phaseRef.current === "speaking")) return;
    }

    const cooldownLeft = sttCooldownUntilRef.current - Date.now();
    if (cooldownLeft > 0) {
      window.setTimeout(() => startRecognitionImpl(attempt), cooldownLeft + 20);
      return;
    }

    try {
      recognitionRef.current.start();
      setNeedsVoiceTap(false);
      console.debug("[VOICE_STT] browser_recognition_started", { phase: phaseRef.current });
    } catch (err) {
      const name = err instanceof Error ? err.name : "";
      if (name !== "InvalidStateError" || attempt >= 8) return;
      window.setTimeout(() => startRecognitionImpl(attempt + 1), 120 + attempt * 80);
    }
  };
  startRecognitionImplRef.current = startRecognitionImpl;

  armWhisperBrowserFallbackRef.current = (ms = 20_000) => {
    whisperBrowserFallbackUntilRef.current = Date.now() + ms;
    if (recognitionAvailable) startRecognitionImplRef.current();
  };

  const scheduleVoiceCapture = useCallback(() => {
    if (shuttingDownRef.current) return;
    if (!micEnabledRef.current || !micBootstrappedRef.current) return;
    if (!voiceCaptureAllowed()) return;

    const whisperListen = whisperPrimaryRef.current;
    if (
      whisperListen &&
      (phaseRef.current === "listening" || phaseRef.current === "idle") &&
      !isAiSpeakingNow()
    ) {
      serverSttRecorderRef.current?.ensureRunning();
    }

    if (!recognitionAvailable) return;

    if (isAiSpeakingNow()) {
      if (bargeInEnabledRef.current && phaseRef.current === "speaking") {
        startRecognitionImpl();
        return;
      }
      abortRecognitionRef.current();
      const player = mp3PlayerRef.current;
      const el = player?.element;
      if (!el) return;
      const onPlaybackDone = () => {
        el.removeEventListener("ended", onPlaybackDone);
        el.removeEventListener("pause", onPlaybackDone);
        armSttCooldown(POST_PLAYBACK_ECHO_MS);
        window.setTimeout(() => startRecognitionImpl(), POST_PLAYBACK_ECHO_MS);
      };
      el.addEventListener("ended", onPlaybackDone, { once: true });
      el.addEventListener("pause", onPlaybackDone, { once: true });
      return;
    }

    if (isSttCooldownActive()) {
      const wait = sttCooldownUntilRef.current - Date.now() + 20;
      window.setTimeout(() => startRecognitionImpl(), wait);
      return;
    }

    startRecognitionImpl();
  }, [recognitionAvailable, armSttCooldown, canAcceptSttNow, isAiSpeakingNow, isSttCooldownActive]);

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
      tickBargeInMonitorRef.current(level);
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
            channelCount: { ideal: 1 },
          },
        });
        try {
          const track = stream.getAudioTracks()[0];
          const s = track?.getSettings?.() as MediaTrackSettings & {
            echoCancellation?: boolean;
            noiseSuppression?: boolean;
            autoGainControl?: boolean;
          };
          console.debug("[MIC_CONSTRAINTS]", {
            echoCancellation: s?.echoCancellation,
            noiseSuppression: s?.noiseSuppression,
            autoGainControl: s?.autoGainControl,
            sampleRate: s?.sampleRate,
            channelCount: s?.channelCount,
            deviceId: s?.deviceId,
          });
        } catch {
          /* ignore */
        }
        micBootstrappedRef.current = true;
        startMicAnalyser(stream);
        serverSttRecorderRef.current = createContinuousMicRecorder(stream);
        serverSttRecorderRef.current.ensureRunning();
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

  const abortRecognitionImpl = () => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.abort();
    } catch {
      try {
        recognitionRef.current.stop();
      } catch {
        /* ignore */
      }
    }
  };

  const stopRecognitionImpl = () => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch {
      /* ignore */
    }
  };
  startRecognitionRef.current = startRecognitionImpl;
  stopRecognitionRef.current = stopRecognitionImpl;
  abortRecognitionRef.current = abortRecognitionImpl;

  const stopAudioPlayback = () => {
    mp3PlayerRef.current?.flushPending();
    mp3PlayerRef.current?.setAllowAutoResume(false);
    streamReaderRef.current?.cancel().catch(() => {});
    streamReaderRef.current = null;
    mp3PlayerRef.current?.stop();
    mp3PlayerRef.current = null;
    fallbackMp3Ref.current?.stop();
    fallbackMp3Ref.current = null;
  };

  const handleInterrupt = useCallback((opts?: { skipBargeCapture?: boolean }) => {
    if (interruptingRef.current) return;
    interruptingRef.current = true;

    // Invalidate any in-flight WS assistant audio/tokens from the prior turn
    streamEpochRef.current += 1;

    abortRef.current?.abort();
    abortRef.current = null;
    stopAudioPlayback();
    setTutorPlaybackVolume(mp3PlayerRef.current, fallbackMp3Ref.current, 1);
    bargeEchoGuardRef.current = recentAiSpeechRef.current || assistantTextRef.current.trim();
    // Save partial tutor reply into the chat before clearing the live stream.
    finalizeAssistantTurn();
    bargeVolumeHistoryRef.current = [];
    bargeInHoldSinceRef.current = null;
    echoBaselineRef.current = 0;

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "interrupt" }));
    }

    micListenAllowedRef.current = true;
    setPhase("listening");
    setInterimTranscript("");
    if (micEnabledRef.current) {
      if (serverSttActiveRef.current) {
        if (!opts?.skipBargeCapture) {
          beginPostInterruptCapture();
        }
      } else {
        window.setTimeout(() => scheduleVoiceCaptureRef.current(), INTERRUPT_RESUME_LISTEN_MS);
      }
    }

    window.setTimeout(() => {
      interruptingRef.current = false;
    }, INTERRUPT_COOLDOWN_MS);
  }, [finalizeAssistantTurn]);

  handleInterruptRef.current = handleInterrupt;

  const handleUserTurn = async (
    userText: string,
    turnId: number,
    opts?: { requireMic?: boolean; skipPhaseCheck?: boolean; skipPlaybackCheck?: boolean },
  ) => {
    if (shuttingDownRef.current) return;
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
      isTutorAudible(mp3PlayerRef.current, fallbackMp3Ref.current)
    ) {
      return;
    }
    if (
      !opts?.skipPlaybackCheck &&
      !opts?.skipPhaseCheck &&
      isTutorAudible(mp3PlayerRef.current, fallbackMp3Ref.current)
    ) {
      return;
    }
    const trimmed = stripConversationalLeadIn(
      postprocessVoiceTranscript(userText, subjectLabel),
    ).trim();
    if (trimmed.length < 2) return;

    const now = Date.now();
    if (
      trimmed === lastSubmittedTranscriptRef.current &&
      now - lastSubmittedAtRef.current < 4000
    ) {
      return;
    }
    if (phaseRef.current === "thinking" && now - lastSubmittedAtRef.current < 2500) {
      return;
    }

    if (
      !opts?.skipPlaybackCheck &&
      rejectTranscriptCandidate(trimmed, "user-turn")
    ) {
      if (phaseRef.current === "listening") scheduleVoiceCaptureRef.current();
      return;
    }

    lastSubmittedTranscriptRef.current = trimmed;
    lastSubmittedAtRef.current = now;

    // New user turn — only WS events tagged with this epoch are accepted
    activeQuestionEpochRef.current = ++streamEpochRef.current;

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
        const payload: Record<string, unknown> = {
          type: "question",
          text: trimmed,
          voice_session_id: voiceSessionIdRef.current,
        };
        const utterBlob = lastUtteranceBlobRef.current;
        if (utterBlob && utterBlob.size > 200) {
          try {
            payload.utterance_audio_b64 = await blobToBase64(utterBlob);
          } catch {
            /* optional session voice bootstrap */
          }
        }
        lastUtteranceBlobRef.current = null;
        ws.send(JSON.stringify(payload));
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
        voice_gender: voiceGenderRef.current,
        tts_voice: tutorVoiceId(voiceGenderRef.current),
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
    if (!recognitionAvailable) return;
    const w = window as any;
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return;
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = voiceRecognitionLang(subjectLabel);
    let finalAccumulator = "";
    let finalizeTimer: number | null = null;
    let interimFlushTimer: number | null = null;
    let pendingInterim = "";

    const clearInterimFlush = () => {
      if (interimFlushTimer) window.clearTimeout(interimFlushTimer);
      interimFlushTimer = null;
      pendingInterim = "";
    };

    const submitListeningTranscript = (raw: string, source: string) => {
      const t = raw.trim();
      if (!t || t.length < 2) return;
      console.debug("[VOICE_STT] browser_submit", { source, len: t.length });
      if (textInputOpenRef.current) {
        const combined = textDictationRef.current
          ? `${textDictationRef.current} ${t}`.trim()
          : t;
        setTextInput("");
        setInterimTranscript("");
        textDictationRef.current = "";
        if (
          combined.length >= 2 &&
          !rejectTranscriptCandidateRef.current(combined, "browser-dictation")
        ) {
          void handleUserTurnRef.current(combined, ++turnIdRef.current, {
            requireMic: false,
            skipPlaybackCheck: true,
          });
        }
        return;
      }
      if (rejectTranscriptCandidateRef.current(t, source)) {
        scheduleVoiceCaptureRef.current();
        return;
      }
      void handleUserTurnRef.current(t, ++turnIdRef.current, { requireMic: true });
    };

    const scheduleInterimFlush = (combined: string) => {
      const text = combined.trim();
      if (!text) return;
      pendingInterim = text;
      if (interimFlushTimer) window.clearTimeout(interimFlushTimer);
      interimFlushTimer = window.setTimeout(() => {
        interimFlushTimer = null;
        const candidate = pendingInterim.trim();
        pendingInterim = "";
        if (!candidate || finalAccumulator.trim()) return;
        if (phaseRef.current !== "listening") return;
        if (!canAcceptSttNowRef.current()) return;
        submitListeningTranscript(candidate, "browser-interim");
      }, STT_INTERIM_COMPLETE_MS);
    };
    rec.onresult = (event: any) => {
      if (shuttingDownRef.current) return;

      // Speaking: interrupt phrases or a full question spoken over the tutor.
      if (phaseRef.current === "speaking" && bargeInEnabled && micEnabledRef.current) {
        let chunk = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          chunk += (chunk ? " " : "") + (event.results[i][0]?.transcript || "");
        }
        const t = chunk.trim();
        if (t.length >= 2) {
          // Mic often hears Edge TTS — never barge on tutor echo (even if it looks like a question).
          const { verdict, similarity } = evaluateIncomingTranscript(
            t,
            recentAiSpeechRef.current,
          );
          if (verdict === "echo_rejected") {
            protectionMetricsRef.current.bump("echo_rejected_count");
            protectionMetricsRef.current.set("echo_similarity_score", similarity);
            logSttVerdict("echo_rejected", t, { source: "browser-speaking", similarity });
            return;
          }
          if (verdict === "discarded") return;

          const intent = detectInterruptIntent(t);
          const question = stripConversationalLeadIn(t);
          if (intent.isInterruptIntent || looksLikeStudentQuestion(question)) {
            console.debug("[INTERRUPT_ACCEPTED]", {
              reason: intent.isInterruptIntent ? "intent" : "question",
              phrase: intent.matchedPhrase,
            });
            handleInterruptRef.current({ skipBargeCapture: true });
            if (question.length >= 2) {
              void handleUserTurnRef.current(question, ++turnIdRef.current, {
                requireMic: true,
                skipPhaseCheck: true,
                skipPlaybackCheck: true,
              });
            } else {
              beginPostInterruptCapture();
            }
          }
        }
        return;
      }

      if (!canAcceptSttNowRef.current() && phaseRef.current !== "thinking") return;

      // Thinking barge-in only — no tutor audio yet; still reject tutor echo.
      if (phaseRef.current === "thinking" && bargeInEnabled && micEnabledRef.current) {
        if (isTutorAudible(mp3PlayerRef.current, fallbackMp3Ref.current)) return;
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const txt = event.results[i][0]?.transcript || "";
          if (event.results[i].isFinal) {
            finalAccumulator += (finalAccumulator ? " " : "") + txt;
            if (finalizeTimer) window.clearTimeout(finalizeTimer);
            finalizeTimer = window.setTimeout(() => {
              const t = finalAccumulator.trim();
              finalAccumulator = "";
              if (t.length < 2 || rejectTranscriptCandidateRef.current(t, "browser-thinking")) return;
              const intent = detectInterruptIntent(t);
              if (intent.isInterruptIntent) {
                console.debug("[INTERRUPT_ACCEPTED]", { reason: "intent", phrase: intent.matchedPhrase });
              }
              handleInterruptRef.current();
              void handleUserTurnRef.current(t, ++turnIdRef.current, {
                requireMic: true,
                skipPhaseCheck: true,
                skipPlaybackCheck: true,
              });
            }, STT_FINAL_DEBOUNCE_MS);
          } else {
            interim += txt;
          }
        }
        if (interim.trim()) setInterimTranscript(interim.trim());
        return;
      }

      if (
        phaseRef.current === "connecting" ||
        isTutorAudible(mp3PlayerRef.current, fallbackMp3Ref.current)
      ) {
        return;
      }

      if (phaseRef.current !== "listening") return;
      if (
        whisperPrimaryRef.current &&
        serverSttActiveRef.current &&
        (listeningUtteranceActiveRef.current || serverSttProcessingRef.current)
      ) {
        return;
      }
      if (!canAcceptSttNowRef.current()) return;

      const dictatingToTextField = textInputOpenRef.current;
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const txt = event.results[i][0]?.transcript || "";
        if (event.results[i].isFinal) {
          finalAccumulator += (finalAccumulator ? " " : "") + txt;
          clearInterimFlush();
          if (finalizeTimer) window.clearTimeout(finalizeTimer);
          finalizeTimer = window.setTimeout(() => {
            const t = finalAccumulator.trim();
            finalAccumulator = "";
            if (!t) return;
            submitListeningTranscript(t, "browser-listening");
          }, STT_FINAL_DEBOUNCE_MS);
        } else {
          interim += txt;
        }
      }
      if (dictatingToTextField) {
        setInterimTranscript(interim.trim());
        return;
      }
      const combined = [finalAccumulator, interim].filter(Boolean).join(" ").trim();
      setInterimTranscript(interim.trim());
      if (combined) scheduleInterimFlush(combined);
    };
    rec.onend = () => {
      if (shuttingDownRef.current || !micEnabledRef.current) return;
      if (finalizeTimer) {
        window.clearTimeout(finalizeTimer);
        finalizeTimer = null;
      }
      const pending = [finalAccumulator, pendingInterim].filter(Boolean).join(" ").trim();
      finalAccumulator = "";
      clearInterimFlush();
      if (
        pending &&
        phaseRef.current === "listening" &&
        canAcceptSttNowRef.current()
      ) {
        submitListeningTranscript(pending, "browser-onend");
      }
      if (!voiceCaptureAllowed()) return;
      if (isSttCooldownActive()) {
        const wait = sttCooldownUntilRef.current - Date.now() + 20;
        window.setTimeout(() => scheduleVoiceCaptureRef.current(), wait);
        return;
      }
      window.setTimeout(() => scheduleVoiceCaptureRef.current(), 100);
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
  }, [recognitionAvailable, subjectLabel]);

  useEffect(() => {
    return () => {
      analyserCleanupRef.current?.();
    };
  }, []);

  useEffect(() => {
    if (phase === "error" || !recognitionAvailable) return;
    if (phase === "listening" && micEnabled) {
      bargeUtteranceActiveRef.current = false;
      listeningUtteranceActiveRef.current = false;
      micListenAllowedRef.current = true;
      if (micBootstrappedRef.current) {
        scheduleVoiceCapture();
      }
    } else if (
      phase === "thinking" &&
      bargeInEnabled &&
      micEnabled &&
      micBootstrappedRef.current
    ) {
      startRecognition();
    } else if (
      phase === "speaking" &&
      bargeInEnabled &&
      micEnabled &&
      micBootstrappedRef.current
    ) {
      startRecognition();
    } else if (phase === "connecting" || (phase === "speaking" && !bargeInEnabled)) {
      abortRecognition();
      echoBaselineRef.current = 0;
      bargeInHoldSinceRef.current = null;
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

  const handleVoiceGenderChange = useCallback((gender: TutorVoiceGender) => {
    setVoiceGender(gender);
    saveTutorVoiceGender(gender);
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN && wsReadyRef.current) {
      try {
        ws.send(
          JSON.stringify({
            type: "set_voice",
            voice_gender: gender,
            tts_voice: tutorVoiceId(gender),
          }),
        );
      } catch {
        /* ignore */
      }
    }
  }, []);

  const studentName = user?.fullName || "Student";
  const studentInitial = (studentName.split(/\s+/)[0]?.[0] || "S").toUpperCase();
  const isTyping = phase === "thinking" || (Boolean(assistantText) && phase === "speaking");
  const aiWaveActive = phase === "speaking";
  const aiWaveIntensity = aiWaveActive ? 0.72 : 0.2;
  const studentWaveActive =
    (phase === "listening" ||
      (bargeInEnabled && (phase === "thinking" || phase === "speaking"))) &&
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
          <Select value={voiceGender} onValueChange={(v) => handleVoiceGenderChange(v as TutorVoiceGender)}>
            <SelectTrigger
              className="h-8 w-[7.5rem] rounded-md border-border bg-muted/50 px-2.5 text-xs font-medium shadow-none focus:ring-1"
              aria-label="Tutor voice"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="male">Male</SelectItem>
            </SelectContent>
          </Select>
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
          spokenUnitText={spokenUnitText || undefined}
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
            if (
              bargeInEnabled &&
              micEnabled &&
              (phase === "speaking" || phase === "thinking")
            ) {
              handleInterrupt();
              return;
            }
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

      {!recognitionAvailable && !serverSttActive && (
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
