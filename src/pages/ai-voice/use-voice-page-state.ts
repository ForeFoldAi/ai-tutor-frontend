/**
 * All React state and refs for the AI Voice page, centralised so every sub-hook
 * receives one stable object instead of dozens of individual parameters.
 */
import { useRef, useState } from "react";
import { Mp3StreamPlayer } from "@/lib/mp3-stream-player";
import { createClientProtectionMetrics } from "@/lib/voice-protection";
import { loadTutorVoiceGender, type TutorVoiceGender } from "@/lib/tutor-voice";
import type { TranscriptEntry, VoiceRelatedImage, VoicePhase } from "@/components/voice/voice-types";
import type { MathLesson } from "@/types/math-lesson";
import type { ScienceExperiment } from "@/types/science-experiment";
import { createContinuousMicRecorder } from "@/lib/voice-server-stt";

export type Phase = VoicePhase;

export function useVoicePageState() {
  // ── React state ──────────────────────────────────────────────────────────
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
  const [assistantText, setAssistantText] = useState("");
  const [errorText, setErrorText] = useState<string | null>(null);
  const [voiceRelatedImages, setVoiceRelatedImages] = useState<VoiceRelatedImage[]>([]);
  const [streamingMathLesson, setStreamingMathLesson] = useState<MathLesson | null>(null);
  const [streamingScienceExperiment, setStreamingScienceExperiment] = useState<ScienceExperiment | null>(null);
  const [volumeUi, setVolumeUi] = useState(0);
  const [needsVoiceTap, setNeedsVoiceTap] = useState(true);

  // ── Refs ─────────────────────────────────────────────────────────────────
  const volumeRef = useRef(0);
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
  const turnIdRef = useRef(0);
  const streamEpochRef = useRef(0);
  const activeQuestionEpochRef = useRef(0);
  const receivedAssistantStreamRef = useRef(false);
  const analyserCleanupRef = useRef<(() => void) | null>(null);
  const phaseRef = useRef<Phase>("connecting");
  const micEnabledRef = useRef(true);
  const speakerEnabledRef = useRef(true);
  const voiceGenderRef = useRef<TutorVoiceGender>("female");
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
      opts?: {
        requireMic?: boolean;
        skipPhaseCheck?: boolean;
        skipPlaybackCheck?: boolean;
        isBargeAudio?: boolean;
      },
    ) => Promise<void>
  >(() => Promise.resolve());
  const handleInterruptRef = useRef<(opts?: { skipBargeCapture?: boolean; fromUi?: boolean }) => void>(() => {});
  const scheduleVoiceCaptureRef = useRef<() => void>(() => {});
  const bootstrapVoiceInputRef = useRef<() => Promise<void>>(() => Promise.resolve());
  const textInputOpenRef = useRef(false);
  const textDictationRef = useRef("");
  const chapterCtxRef = useRef<{
    board: string;
    classLevel: string;
    subject: string;
    subjectId: string | null;
    chapterIds: string[];
    chapterNames: string[];
  } | null>(null);
  const userRef = useRef<{ fullName?: string } | null>(null);
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
  /** Blocks ONLY the listen-submit path while AI audio is playing. Barge-in is exempt. */
  const listenCooldownUntilRef = useRef(0);
  const echoBaselineRef = useRef(0);
  const bargeInHoldSinceRef = useRef<number | null>(null);
  const bargeVolumeHistoryRef = useRef<number[]>([]);
  /** Samples collected during the arm-delay window — a TTS-echo baseline, not ambient noise. */
  const bargeCalibrationRef = useRef<number[]>([]);
  /** Detection timestamp (spike hold-confirm or SpeechRecognition intent match) → interrupt latency. */
  const bargeDetectedAtRef = useRef(0);
  const bargeEventIdRef = useRef<string | null>(null);
  const tickBargeInMonitorRef = useRef<(level: number) => void>(() => {});
  const bargeInEnabledRef = useRef(true);
  /** "hybrid" (SpeechRecognition + volume-spike) or "volume_only" (no browser STT). Set once at mount. */
  const sttModeRef = useRef<"hybrid" | "volume_only">("hybrid");
  const protectionMetricsRef = useRef(createClientProtectionMetrics());
  const voiceSessionIdRef = useRef(
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `voice-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  const listeningUtteranceActiveRef = useRef(false);
  const lastUtteranceBlobRef = useRef<Blob | null>(null);
  const whisperPrimaryRef = useRef(false);
  const finalizeUtteranceRef = useRef<(blob: Blob, mode: "listen" | "barge") => void>(() => {});
  const interimTranscriptRef = useRef("");
  const finalizeAssistantTurnRef = useRef<() => void>(() => {});
  const serverSttActiveRef = useRef(false);

  return {
    // state + setters
    transcriptEntries, setTranscriptEntries,
    sessionRestored, setSessionRestored,
    callSeconds, setCallSeconds,
    isCallLive, setIsCallLive,
    tutorState, setTutorState,
    tutorUnderstandingHint, setTutorUnderstandingHint,
    isReconnecting, setIsReconnecting,
    wsConnected, setWsConnected,
    textInput, setTextInput,
    phase, setPhase,
    micEnabled, setMicEnabled,
    speakerEnabled, setSpeakerEnabled,
    voiceGender, setVoiceGender,
    connectionStatus, setConnectionStatus,
    interimTranscript, setInterimTranscript,
    assistantText, setAssistantText,
    errorText, setErrorText,
    voiceRelatedImages, setVoiceRelatedImages,
    streamingMathLesson, setStreamingMathLesson,
    streamingScienceExperiment, setStreamingScienceExperiment,
    volumeUi, setVolumeUi,
    needsVoiceTap, setNeedsVoiceTap,
    // refs
    volumeRef,
    wsRef, wsReadyRef, reconnectTimerRef, wsActiveRef,
    mp3PlayerRef, abortRef, streamReaderRef, fallbackMp3Ref,
    recognitionRef,
    startRecognitionRef, stopRecognitionRef, abortRecognitionRef, startRecognitionImplRef,
    turnIdRef, streamEpochRef, activeQuestionEpochRef, receivedAssistantStreamRef,
    analyserCleanupRef, analyserStreamRef,
    phaseRef, micEnabledRef, speakerEnabledRef, voiceGenderRef,
    speakingStartedAtRef, callStartRef,
    assistantTextRef, voiceImagesRef, voiceMathLessonRef, voiceScienceExperimentRef,
    shouldGreetOnConnectRef, micListenAllowedRef,
    lastSubmittedTranscriptRef, lastSubmittedAtRef,
    armWhisperBrowserFallbackRef, whisperBrowserFallbackUntilRef,
    interruptingRef, shuttingDownRef, audioPolicyUnlockedRef,
    handleUserTurnRef, handleInterruptRef, scheduleVoiceCaptureRef, bootstrapVoiceInputRef,
    textInputOpenRef, textDictationRef,
    chapterCtxRef, userRef,
    micBootstrappedRef,
    transcriptEntriesRef, tutorStateRef,
    serverSttRecorderRef, serverSttProcessingRef,
    speechActiveRef, silenceSinceRef, utteranceStartedAtRef,
    bargeUtteranceActiveRef, bargeEchoGuardRef, recentAiSpeechRef,
    sttCooldownUntilRef, listenCooldownUntilRef, echoBaselineRef, bargeInHoldSinceRef,
    bargeVolumeHistoryRef, bargeCalibrationRef, bargeDetectedAtRef, bargeEventIdRef,
    tickBargeInMonitorRef, bargeInEnabledRef, sttModeRef,
    protectionMetricsRef, voiceSessionIdRef,
    listeningUtteranceActiveRef, lastUtteranceBlobRef,
    whisperPrimaryRef, finalizeUtteranceRef,
    interimTranscriptRef, finalizeAssistantTurnRef, serverSttActiveRef,
  };
}

export type VoicePageState = ReturnType<typeof useVoicePageState>;
