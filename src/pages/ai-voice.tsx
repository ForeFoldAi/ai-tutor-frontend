/**
 * AI Voice page — thin orchestration layer.
 *
 * Logic is split across:
 *   ai-voice/use-voice-page-state.ts  — all state & refs
 *   ai-voice/use-voice-session.ts     — transcript helpers, resumeListeningAfterPlayback
 *   ai-voice/use-voice-audio.ts       — mic, Mp3StreamPlayer, analyser, bootstrapVoiceInput
 *   ai-voice/use-voice-websocket.ts   — connectWS, disconnect, stopResources, reconnect
 *   ai-voice/use-voice-stt.ts         — Whisper ticker, barge monitor, browser STT effect
 *   ai-voice/use-voice-turn.ts        — handleInterrupt, handleUserTurn
 *   ai-voice/voice-logger.ts          — structured [TAG] logger
 *   ai-voice/voice-utils.ts           — pure helpers (FrameParser, isTutorAudible, …)
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { chapterSelectionPath } from "@/lib/tutor-chapter-nav";
import { useStudySession } from "@/hooks/use-study-session";
import { useAuthStore } from "@/lib/auth-store";
import { getHttpApiBase, getVoiceHttpBase } from "@/lib/api-base";
import { VoiceLiveCall } from "@/components/voice/voice-live-call";
import { MSG } from "@/lib/student-messages";
import {
  fetchServerSttAvailable,
  shouldUseServerStt,
  useWhisperVoiceCapture,
} from "@/lib/voice-server-stt";
import { BARGE_IN_DUCK_VOLUME } from "@/lib/voice-conversation-config";
import {
  evaluateIncomingTranscript,
  logSttVerdict,
} from "@/lib/voice-echo-guard";
import { detectInterruptIntent } from "@/lib/voice-interrupt-intent";
import {
  buildVoiceSessionKey,
  clearVoiceSession,
  loadVoiceSession,
  saveVoiceSession,
} from "@/lib/voice-session-storage";
import {
  saveTutorVoiceGender,
  tutorVoiceId,
  type TutorVoiceGender,
} from "@/lib/tutor-voice";
import { combineVoiceTextField, liveSpeechInterim } from "@/lib/voice-text-field";
import { ArrowLeft, BookOpen, RefreshCw } from "lucide-react";

import { useVoicePageState } from "./ai-voice/use-voice-page-state";
import { useVoiceSession } from "./ai-voice/use-voice-session";
import { useVoiceAudio } from "./ai-voice/use-voice-audio";
import { useVoiceWebSocket } from "./ai-voice/use-voice-websocket";
import { useVoiceStt } from "./ai-voice/use-voice-stt";
import { useVoiceTurn } from "./ai-voice/use-voice-turn";
import { isTutorAudible, setTutorPlaybackVolume } from "./ai-voice/voice-utils";

export default function AIVoicePage() {
  const [, setLocation] = useLocation();
  const { token: accessToken, user } = useAuthStore();
  const API_URL = getHttpApiBase();
  const VOICE_URL = getVoiceHttpBase();
  const bargeInEnabled = import.meta.env.VITE_VOICE_BARGE_IN !== "false";

  // ── Chapter context from URL ──────────────────────────────────────────────
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

  const primaryChapterId = chapterCtx?.chapterIds[0] ? Number(chapterCtx.chapterIds[0]) : null;

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

  // ── STT availability ──────────────────────────────────────────────────────
  const serverSttPreferred = useMemo(() => shouldUseServerStt(subjectLabel), [subjectLabel]);
  const recognitionAvailable = useMemo(() => {
    if (typeof window === "undefined") return false;
    const w = window as Window & { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
    return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
  }, []);
  // Explicit mode, not a silent degrade: without SpeechRecognition, barge-in
  // relies solely on the volume-spike monitor (still fully functional — see
  // tickBargeInMonitorRef — just less precise without the intent text check).
  const sttMode = recognitionAvailable ? "hybrid" : "volume_only";

  // ── All state + refs ──────────────────────────────────────────────────────
  const s = useVoicePageState();

  // Sync derived values into refs used by callbacks
  useEffect(() => { s.chapterCtxRef.current = chapterCtx; }, [chapterCtx]); // eslint-disable-line
  useEffect(() => { s.userRef.current = user; }, [user]); // eslint-disable-line
  useEffect(() => { s.phaseRef.current = s.phase; }, [s.phase]);
  useEffect(() => { s.micEnabledRef.current = s.micEnabled; }, [s.micEnabled]);
  useEffect(() => { s.speakerEnabledRef.current = s.speakerEnabled; }, [s.speakerEnabled]);
  useEffect(() => { s.voiceGenderRef.current = s.voiceGender; }, [s.voiceGender]);
  useEffect(() => { s.bargeInEnabledRef.current = bargeInEnabled; }, [bargeInEnabled]);
  useEffect(() => { s.sttModeRef.current = sttMode; }, [sttMode]);
  useEffect(() => { s.interimTranscriptRef.current = s.interimTranscript; }, [s.interimTranscript]);
  useEffect(() => { s.transcriptEntriesRef.current = s.transcriptEntries; }, [s.transcriptEntries]);
  useEffect(() => { s.tutorStateRef.current = s.tutorState; }, [s.tutorState]);
  useEffect(() => { s.voiceImagesRef.current = s.voiceRelatedImages; }, [s.voiceRelatedImages]);

  // serverSttActive as reactive state (needed to trigger STT hook re-run)
  const [serverSttActive, setServerSttActive] = useState(false);
  useEffect(() => { s.serverSttActiveRef.current = serverSttActive; }, [serverSttActive]);

  useEffect(() => {
    if (!serverSttPreferred) { setServerSttActive(false); return; }
    let cancelled = false;
    void fetchServerSttAvailable(normalizedVoiceUrl).then((ok) => {
      if (!cancelled) setServerSttActive(ok);
    });
    return () => { cancelled = true; };
  }, [serverSttPreferred, normalizedVoiceUrl]); // eslint-disable-line

  // Whisper primary
  const whisperPrimary = useWhisperVoiceCapture(serverSttActive, recognitionAvailable);
  useEffect(() => { s.whisperPrimaryRef.current = whisperPrimary; }, [whisperPrimary]);

  // Session key + save/restore
  const voiceSessionKey = useMemo(() => {
    if (!chapterCtx) return "voice-general";
    return buildVoiceSessionKey({
      board: chapterCtx.board,
      classLevel: chapterCtx.classLevel,
      subject: chapterCtx.subject,
      chapterIds: chapterCtx.chapterIds,
    });
  }, [chapterCtx]);

  useEffect(() => {
    const saved = loadVoiceSession(voiceSessionKey);
    if (saved.length > 0) { s.setTranscriptEntries(saved); s.setSessionRestored(true); }
  }, [voiceSessionKey]); // eslint-disable-line
  useEffect(() => {
    saveVoiceSession(voiceSessionKey, s.transcriptEntries);
  }, [voiceSessionKey, s.transcriptEntries]); // eslint-disable-line

  // Server health check
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`${normalizedVoiceUrl}/health`);
        if (!res.ok) throw new Error();
        if (!cancelled) s.setConnectionStatus((prev) => prev === "Connected" || prev === "Reconnecting…" ? prev : "Server ready");
      } catch {
        if (!cancelled) {
          s.setConnectionStatus("Can't reach your tutor right now");
          s.setErrorText(MSG.voiceUnavailable);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [normalizedVoiceUrl]); // eslint-disable-line

  // Call timer
  useEffect(() => {
    if (!s.isCallLive) return;
    const id = window.setInterval(() => {
      if (s.callStartRef.current) s.setCallSeconds(Math.floor((Date.now() - s.callStartRef.current) / 1000));
    }, 1000);
    return () => window.clearInterval(id);
  }, [s.isCallLive]); // eslint-disable-line

  // ── Sub-hooks ─────────────────────────────────────────────────────────────
  const session = useVoiceSession(s);
  const audio = useVoiceAudio(s);

  // Wire up bootstrap ref
  s.bootstrapVoiceInputRef.current = audio.bootstrapVoiceInput;
  s.finalizeAssistantTurnRef.current = session.finalizeAssistantTurn;

  // canAcceptSttNow / rejectTranscriptCandidate (stable refs for STT callbacks)
  const isSttCooldownActive = useCallback(() => Date.now() < s.sttCooldownUntilRef.current, []); // eslint-disable-line
  const isAiSpeakingNow = useCallback(
    () => s.phaseRef.current === "speaking" || isTutorAudible(s.mp3PlayerRef.current, s.fallbackMp3Ref.current),
    [], // eslint-disable-line
  );
  const canAcceptSttNow = useCallback(() => {
    if (s.shuttingDownRef.current) return false;
    if (isAiSpeakingNow()) return false;
    if (isSttCooldownActive()) return false;
    return true;
  }, [isAiSpeakingNow, isSttCooldownActive]);

  // rejectTranscriptCandidate — stable ref, updated when subjectLabel changes
  const rejectTranscriptCandidateRef = useRef((_raw: string, _source: string): boolean => false);
  const canAcceptSttNowRef = useRef(canAcceptSttNow);
  useEffect(() => { canAcceptSttNowRef.current = canAcceptSttNow; }, [canAcceptSttNow]);

  useEffect(() => {
    rejectTranscriptCandidateRef.current = (raw: string, source: string): boolean => {
      const cleaned = raw.trim();
      // Echo check runs first and unconditionally: "hi"/"wait"/"stop" are common
      // tutor openers too, so matching an interrupt phrase is not proof the student
      // said it — a near-verbatim echo of the AI's own recent speech must still
      // be rejected even when it happens to match an intent phrase.
      const { verdict, similarity } = evaluateIncomingTranscript(cleaned, s.recentAiSpeechRef.current);
      if (verdict === "echo_rejected") {
        s.protectionMetricsRef.current.bump("echo_rejected_count");
        s.protectionMetricsRef.current.set("echo_similarity_score", similarity);
        logSttVerdict(verdict, cleaned, { source, similarity });
        return true;
      }
      const intent = detectInterruptIntent(cleaned);
      if (intent.isInterruptIntent) {
        logSttVerdict("accepted", cleaned, { source, reason: "interrupt_intent", phrase: intent.matchedPhrase });
        return false;
      }
      if (verdict !== "accepted") { logSttVerdict(verdict, cleaned, { source, similarity }); return true; }
      logSttVerdict("accepted", cleaned, { source, similarity });
      return false;
    };
  }, [subjectLabel]); // eslint-disable-line

  // WS hook
  const ws = useVoiceWebSocket({ s, normalizedVoiceUrl, session, audio });

  // STT hook
  const stt = useVoiceStt({
    s,
    subjectLabel,
    normalizedVoiceUrl,
    recognitionAvailable,
    serverSttActive: s.serverSttActiveRef.current,
    micEnabled: s.micEnabled,
    bargeInEnabled,
    rejectTranscriptCandidateRef,
    canAcceptSttNowRef,
    isSttCooldownActive,
    isAiSpeakingNow,
    armSttCooldown: session.armSttCooldown,
  });

  // Turn hook
  const turn = useVoiceTurn({
    s, subjectLabel, normalizedVoiceUrl, micEnabled: s.micEnabled,
    session, audio,
    rejectTranscriptCandidate: (raw, src) => rejectTranscriptCandidateRef.current(raw, src),
    beginPostInterruptCapture: stt.beginPostInterruptCapture,
  });

  // Wire handleInterrupt + handleUserTurn into refs
  s.handleInterruptRef.current = turn.handleInterrupt;
  s.handleUserTurnRef.current = turn.handleUserTurn;

  // ── WS connect/disconnect lifecycle ──────────────────────────────────────
  useEffect(() => {
    s.shuttingDownRef.current = false;
    ws.connectWS();
    return () => { ws.stopVoiceSessionResources(); };
  }, [ws.connectWS, ws.stopVoiceSessionResources, normalizedVoiceUrl]); // eslint-disable-line

  // ── Volume duck during barge-in ──────────────────────────────────────────
  useEffect(() => {
    const duck = bargeInEnabled && s.phase === "speaking";
    setTutorPlaybackVolume(s.mp3PlayerRef.current, s.fallbackMp3Ref.current, duck ? BARGE_IN_DUCK_VOLUME : 1);
  }, [s.phase, bargeInEnabled]); // eslint-disable-line

  // ── Idle → listening transition ──────────────────────────────────────────
  useEffect(() => {
    if (!s.micEnabled || s.phase === "error") return;
    if (s.phase === "idle" && s.micListenAllowedRef.current) s.setPhase("listening");
  }, [s.micEnabled, s.phase]); // eslint-disable-line

  // ── Stuck-in-connecting watchdog ─────────────────────────────────────────
  useEffect(() => {
    if (s.phase !== "connecting" || !s.isCallLive) return;
    const t = window.setTimeout(() => {
      if (s.phaseRef.current !== "connecting" || s.shuttingDownRef.current) return;
      s.micListenAllowedRef.current = true;
      s.setPhase("listening");
      s.scheduleVoiceCaptureRef.current();
    }, 6000);
    return () => window.clearTimeout(t);
  }, [s.phase, s.isCallLive]); // eslint-disable-line

  // ── Keep STT alive while listening ──────────────────────────────────────
  useEffect(() => {
    if (!s.isCallLive || s.phase !== "listening" || !s.micEnabled || !s.micBootstrappedRef.current) return;
    s.scheduleVoiceCaptureRef.current();
    const id = window.setInterval(() => {
      if (s.phaseRef.current !== "listening" || s.shuttingDownRef.current || !s.micBootstrappedRef.current) return;
      s.micListenAllowedRef.current = true;
      s.scheduleVoiceCaptureRef.current();
    }, 3000);
    return () => window.clearInterval(id);
  }, [s.isCallLive, s.phase, s.micEnabled, stt.scheduleVoiceCapture]); // eslint-disable-line

  // ── Screen wake lock — mobile screens auto-lock mid-call and Android/iOS
  // suspend the mic/audio pipeline once the screen turns off; keep it awake
  // for the duration of the call and re-acquire if the OS revokes it.
  useEffect(() => {
    if (!s.isCallLive || typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;
    const acquire = async () => {
      try {
        sentinel = await navigator.wakeLock.request("screen");
        sentinel.addEventListener("release", () => { sentinel = null; });
      } catch {
        /* denied or unsupported — call still works, screen may just dim */
      }
    };
    void acquire();
    const onVisibility = () => {
      if (!cancelled && document.visibilityState === "visible" && !sentinel) void acquire();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      void sentinel?.release().catch(() => {});
    };
  }, [s.isCallLive]); // eslint-disable-line

  // ── Gesture unlock ───────────────────────────────────────────────────────
  useEffect(() => {
    const onGesture = () => { void audio.bootstrapVoiceInput(); };
    window.addEventListener("pointerdown", onGesture, { passive: true });
    window.addEventListener("keydown", onGesture);
    return () => {
      window.removeEventListener("pointerdown", onGesture);
      window.removeEventListener("keydown", onGesture);
    };
  }, []); // eslint-disable-line

  // ── Skip the tap prompt when mic permission is already granted ──────────
  // getUserMedia() only *needs* a user gesture for its permission prompt to
  // reliably appear — once a returning student has already granted access,
  // the browser skips the prompt and resolves immediately regardless of
  // gesture. Bootstrapping here (before the greeting even starts) means the
  // mic is warm by the time "listening" fires, so no tap is needed at all.
  // navigator.permissions doesn't support the 'microphone' query on Safari —
  // that's also the one browser family that genuinely enforces a fresh
  // per-call gesture for audio, so it correctly falls through to the
  // existing tap-required flow below unchanged.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const status = await navigator.permissions?.query({
          name: "microphone" as PermissionName,
        });
        if (!cancelled && status?.state === "granted") {
          void audio.bootstrapVoiceInput();
        }
      } catch {
        /* Permissions API unsupported for 'microphone' (Safari) — keep tap-required flow */
      }
    })();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line

  // ── Analyser cleanup ─────────────────────────────────────────────────────
  useEffect(() => () => { s.analyserCleanupRef.current?.(); }, []); // eslint-disable-line

  // ── pagehide ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const onHide = () => { ws.stopVoiceSessionResources(); };
    window.addEventListener("pagehide", onHide);
    return () => window.removeEventListener("pagehide", onHide);
  }, [ws.stopVoiceSessionResources]); // eslint-disable-line

  // ── Session actions ───────────────────────────────────────────────────────
  const leaveVoiceSession = useCallback(() => {
    session.finalizeAssistantTurn();
    ws.stopVoiceSessionResources();
    clearVoiceSession(voiceSessionKey);
    s.setTranscriptEntries([]);
    s.setSessionRestored(false);
    session.syncAssistantText("");
    s.setInterimTranscript("");
    s.setPhase("idle");
    s.setIsCallLive(false);
    s.callStartRef.current = null;
    s.setCallSeconds(0);
  }, [session.finalizeAssistantTurn, ws.stopVoiceSessionResources, voiceSessionKey, session.syncAssistantText]); // eslint-disable-line

  const handleEndCall = () => {
    leaveVoiceSession();
    if (chapterCtx) setLocation(chapterSelectionPath(chapterCtx.subjectId));
  };

  const handleBackToChapters = () => {
    leaveVoiceSession();
    setLocation(chapterSelectionPath(chapterCtx?.subjectId));
  };

  const handleSendText = useCallback(() => {
    const combined = combineVoiceTextField(s.textInput, s.interimTranscript);
    if (combined.length < 2) return;
    s.setTextInput("");
    s.setInterimTranscript("");
    s.textDictationRef.current = "";
    void s.handleUserTurnRef.current(combined, ++s.turnIdRef.current, {
      requireMic: false, skipPlaybackCheck: true, skipPhaseCheck: true,
    });
  }, [s.textInput, s.interimTranscript]); // eslint-disable-line

  const handleVoiceGenderChange = useCallback((gender: TutorVoiceGender) => {
    s.setVoiceGender(gender);
    saveTutorVoiceGender(gender);
    const wsSocket = s.wsRef.current;
    if (wsSocket?.readyState === WebSocket.OPEN && s.wsReadyRef.current) {
      try {
        wsSocket.send(JSON.stringify({ type: "set_voice", voice_gender: gender, tts_voice: tutorVoiceId(gender) }));
      } catch { /* ignore */ }
    }
  }, []); // eslint-disable-line

  // ── Derived UI values ─────────────────────────────────────────────────────
  const studentName = user?.fullName || "Student";
  const studentInitial = (studentName.split(/\s+/)[0]?.[0] || "S").toUpperCase();
  const isTyping = s.phase === "thinking" || (Boolean(s.assistantText) && s.phase === "speaking");
  const aiWaveActive = s.phase === "speaking";
  const aiWaveIntensity = aiWaveActive ? 0.72 : 0.2;
  const studentWaveActive =
    (s.phase === "listening" ||
      (bargeInEnabled && !s.isGreetingActiveRef.current && (s.phase === "thinking" || s.phase === "speaking"))) &&
    s.micEnabled &&
    (s.volumeUi > 0.06 || Boolean(s.interimTranscript.trim()));
  const studentWaveIntensity = Math.max(0.35, 0.35 + s.volumeUi * 0.65);

  const showReconnectBar =
    Boolean(s.errorText) ||
    s.isReconnecting ||
    s.connectionStatus === "Connection problem" ||
    s.connectionStatus === "Reconnecting…" ||
    s.connectionStatus === "Can't reach your tutor right now" ||
    s.connectionStatus === "Can't connect to tutor";

  const reconnectMessage =
    s.errorText ||
    (s.connectionStatus === "Reconnecting…" || s.isReconnecting
      ? "Reconnecting to your tutor…"
      : s.connectionStatus === "Can't reach your tutor right now"
        ? MSG.voiceUnavailable
        : MSG.voiceConnection);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="h-full min-h-0 w-full flex flex-col overflow-hidden bg-background">
      <header className="shrink-0 px-3 py-2 sm:px-4 sm:py-2.5 flex items-center justify-between gap-3 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="flex items-center gap-2 min-w-0">
          {chapterCtx && (
            <Button
              variant="ghost" size="icon"
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
            {s.isCallLive ? (
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
            {s.isCallLive ? (
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
          <Select value={s.voiceGender} onValueChange={(v) => handleVoiceGenderChange(v as TutorVoiceGender)}>
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
            {String(Math.floor(s.callSeconds / 60)).padStart(2, "0")}:{String(s.callSeconds % 60).padStart(2, "0")}
          </Badge>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            {s.wsConnected ? "Connected" : s.connectionStatus}
          </span>
        </div>
      </header>

      {showReconnectBar && (
        <div className="shrink-0 flex items-center justify-between gap-3 border-b border-destructive/30 bg-destructive/10 px-3 py-2 sm:px-4">
          <p className="text-xs sm:text-sm text-destructive min-w-0">{reconnectMessage}</p>
          <Button
            type="button" size="sm" variant="outline"
            className="shrink-0 h-8 gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10"
            onClick={ws.handleReconnect}
            disabled={s.isReconnecting && s.connectionStatus === "Reconnecting…"}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${s.isReconnecting ? "animate-spin" : ""}`} />
            {s.isReconnecting ? "Reconnecting…" : "Reconnect"}
          </Button>
        </div>
      )}

      {chapterCtx && chapterCtx.chapterNames.length > 0 && (
        <div className="sm:hidden shrink-0 px-3 py-1 border-b border-border text-[11px] text-muted-foreground truncate bg-muted/30">
          {s.isCallLive
            ? <span className="text-emerald-600 dark:text-emerald-400">Live · </span>
            : <span className="text-amber-600 dark:text-amber-400">Connecting · </span>}
          {chapterCtx.chapterNames[0]}
        </div>
      )}

      <main className="flex-1 min-h-0 overflow-hidden w-full h-full">
        <VoiceLiveCall
          phase={s.phase}
          subjectLabel={subjectLabel}
          studentName={studentName}
          studentInitial={studentInitial}
          micEnabled={s.micEnabled}
          speakerEnabled={s.speakerEnabled}
          aiActive={aiWaveActive}
          aiIntensity={aiWaveIntensity}
          studentActive={studentWaveActive}
          studentIntensity={studentWaveIntensity}
          tutorState={s.tutorState}
          understandingHint={s.tutorUnderstandingHint}
          entries={s.transcriptEntries}
          isTyping={isTyping}
          streamingAssistantText={s.assistantText || undefined}
          streamingRelatedImages={s.voiceRelatedImages}
          streamingMathLesson={s.streamingMathLesson}
          streamingScienceExperiment={s.streamingScienceExperiment}
          imagesRetrieving={isTyping && s.voiceRelatedImages.length === 0}
          imagesRetrievingHint={
            chapterCtx?.chapterNames?.[0]
              ? `Looking up figures from ${chapterCtx.chapterNames[0]}…`
              : undefined
          }
          accessToken={accessToken}
          onToggleMic={() => {
            if (bargeInEnabled && s.micEnabled && (s.phase === "speaking" || s.phase === "thinking")) {
              turn.handleInterrupt({ fromUi: true });
              return;
            }
            s.setMicEnabled((v) => !v);
            if (s.micEnabled) {
              s.stopRecognitionRef.current();
              s.setPhase("idle");
            } else {
              s.micListenAllowedRef.current = true;
              s.setPhase("listening");
              void audio.bootstrapVoiceInput();
            }
          }}
          onToggleSpeaker={() => {
            s.setSpeakerEnabled((v) => !v);
            if (s.speakerEnabled) audio.stopAudioPlayback();
          }}
          onInterrupt={() => turn.handleInterrupt({ fromUi: true })}
          canInterrupt={s.phase === "speaking" || s.phase === "thinking"}
          onEndCall={handleEndCall}
          textInput={s.textInput}
          interimTranscript={s.interimTranscript}
          onTextInputChange={(value) => {
            s.textDictationRef.current = value;
            s.setTextInput(value);
            if (!value.trim()) s.setInterimTranscript("");
          }}
          onTextInputOpenChange={(open) => {
            if (s.textInputOpenRef.current === open) return;
            s.textInputOpenRef.current = open;
            if (open) {
              const mic = s.serverSttRecorderRef.current;
              if (mic?.isCapturingUtterance()) void mic.endUtteranceCapture();
              s.listeningUtteranceActiveRef.current = false;
              s.speechActiveRef.current = false;
              s.silenceSinceRef.current = null;
              if (!liveSpeechInterim(s.interimTranscriptRef.current)) s.setInterimTranscript("");
              s.textDictationRef.current = s.textInput;
              void audio.bootstrapVoiceInput();
            } else {
              s.setInterimTranscript("");
              s.micListenAllowedRef.current = true;
              s.listeningUtteranceActiveRef.current = false;
              s.speechActiveRef.current = false;
              void audio.bootstrapVoiceInput();
              s.scheduleVoiceCaptureRef.current();
            }
          }}
          onSendText={handleSendText}
          isCallLive={s.isCallLive}
          sessionResumed={s.sessionRestored}
        />
      </main>

      {!recognitionAvailable && !s.serverSttActiveRef.current && (
        <div className="fixed bottom-4 left-4 right-4 lg:left-auto lg:right-4 lg:max-w-sm rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100 z-50">
          {MSG.speechUnsupported}
        </div>
      )}

      {s.needsVoiceTap && s.phase === "listening" && s.micEnabled && (
        <div className="fixed bottom-20 left-4 right-4 lg:left-auto lg:right-4 lg:max-w-sm rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-foreground z-50 shadow-lg">
          Tap anywhere on the page to allow the microphone, then speak your question.
        </div>
      )}
    </div>
  );
}
