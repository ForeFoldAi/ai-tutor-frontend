/**
 * STT subsystem:
 *   - Server Whisper ticker effect
 *   - Production barge-in monitor (tickBargeInMonitorRef assignment)
 *   - Browser SpeechRecognition setup effect
 *   - scheduleVoiceCapture / startRecognitionImpl
 *   - Phase-driven STT effects (listening → start, thinking → abort, etc.)
 */
import { type MutableRefObject, useCallback, useEffect } from "react";
import {
  transcribeWithServer,
  BARGE_GATE_PRE_ROLL_MS,
  POST_INTERRUPT_PRE_ROLL_MS,
} from "@/lib/voice-server-stt";
import {
  BARGE_IN_ARM_DELAY_MS,
  BARGE_IN_HOLD_MS,
  BARGE_CHECK_REQUIRED,
  BARGE_CONFIRMED,
  BARGE_SILENCE_MS,
  LISTEN_SILENCE_MS,
  MAX_UTTERANCE_MS,
  POST_PLAYBACK_ECHO_MS,
  SPEECH_LEVEL,
  STT_FINAL_DEBOUNCE_MS,
  STT_INTERIM_COMPLETE_MS,
  VOICE_PROTECTION_ENABLED,
} from "@/lib/voice-conversation-config";
import {
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
} from "@/lib/voice-protection";
import {
  postprocessVoiceTranscript,
  isMeaningfulVoiceTranscript,
  voiceRecognitionLang,
} from "@/lib/voice-stt-postprocess";
import { isTutorAudible, getAccessToken } from "./voice-utils";
import { vlog } from "./voice-logger";
import type { VoicePageState } from "./use-voice-page-state";

type SttDeps = {
  s: VoicePageState;
  subjectLabel: string;
  normalizedVoiceUrl: string;
  recognitionAvailable: boolean;
  serverSttActive: boolean;
  micEnabled: boolean;
  bargeInEnabled: boolean;
  rejectTranscriptCandidateRef: MutableRefObject<(raw: string, source: string) => boolean>;
  canAcceptSttNowRef: MutableRefObject<() => boolean>;
  isSttCooldownActive: () => boolean;
  isAiSpeakingNow: () => boolean;
  armSttCooldown: (ms?: number) => void;
};

export function useVoiceStt(deps: SttDeps) {
  const {
    s, subjectLabel, normalizedVoiceUrl, recognitionAvailable,
    serverSttActive, micEnabled, bargeInEnabled,
    rejectTranscriptCandidateRef, canAcceptSttNowRef,
    isSttCooldownActive, isAiSpeakingNow, armSttCooldown,
  } = deps;

  // ── Barge-gate capture helpers ──────────────────────────────────────────
  const beginBargeGateCapture = () => {
    const mic = s.serverSttRecorderRef.current;
    if (!mic) return;
    mic.ensureRunning();
    if (!mic.isCapturingUtterance()) {
      mic.beginUtteranceCapture({ preRollMs: BARGE_GATE_PRE_ROLL_MS });
      s.bargeUtteranceActiveRef.current = true;
      s.utteranceStartedAtRef.current = Date.now();
      s.speechActiveRef.current = true;
      s.silenceSinceRef.current = null;
    }
  };

  const beginPostInterruptCapture = () => {
    const mic = s.serverSttRecorderRef.current;
    // Two independent barge-in detectors (VAD monitor + browser-STT intent
    // check) can both fire for the same real utterance. If a capture is
    // already running, this is the second firing — let it keep recording
    // instead of truncating it and starting a fresh one, which used to chop
    // one sentence into two fragments submitted as separate questions.
    if (!mic || mic.isCapturingUtterance()) return;
    void (async () => {
      mic.beginUtteranceCapture({ preRollMs: POST_INTERRUPT_PRE_ROLL_MS });
      s.bargeUtteranceActiveRef.current = true;
      s.utteranceStartedAtRef.current = Date.now();
      s.speechActiveRef.current = true;
      s.silenceSinceRef.current = null;
      s.setInterimTranscript("Listening…");
    })();
  };

  // ── voiceCaptureAllowed ─────────────────────────────────────────────────
  const voiceCaptureAllowed = () => {
    if (s.shuttingDownRef.current) return false;
    const phaseNow = s.phaseRef.current;
    const bargePhase =
      s.bargeInEnabledRef.current &&
      !s.isGreetingActiveRef.current &&
      s.micEnabledRef.current &&
      (phaseNow === "thinking" || phaseNow === "speaking");
    if (bargePhase) return !isSttCooldownActive();
    if (!canAcceptSttNowRef.current()) return false;
    if (phaseNow === "listening" || phaseNow === "idle") return true;
    return false;
  };

  // ── startRecognitionImpl ────────────────────────────────────────────────
  const startRecognitionImpl = (attempt = 0) => {
    if (s.shuttingDownRef.current || !s.recognitionRef.current) return;
    if (!s.micEnabledRef.current || !s.micBootstrappedRef.current) return;
    if (!voiceCaptureAllowed()) return;
    if (isAiSpeakingNow()) {
      if (!(s.bargeInEnabledRef.current && s.phaseRef.current === "speaking")) return;
    }
    const cooldownLeft = s.sttCooldownUntilRef.current - Date.now();
    if (cooldownLeft > 0) {
      window.setTimeout(() => startRecognitionImpl(attempt), cooldownLeft + 20);
      return;
    }
    try {
      s.recognitionRef.current.start();
      s.setNeedsVoiceTap(false);
      console.debug("[VOICE_STT] browser_recognition_started", { phase: s.phaseRef.current });
    } catch (err) {
      const name = err instanceof Error ? err.name : "";
      if (name !== "InvalidStateError" || attempt >= 8) return;
      window.setTimeout(() => startRecognitionImpl(attempt + 1), 120 + attempt * 80);
    }
  };
  s.startRecognitionImplRef.current = startRecognitionImpl;

  s.armWhisperBrowserFallbackRef.current = (ms = 20_000) => {
    s.whisperBrowserFallbackUntilRef.current = Date.now() + ms;
    if (recognitionAvailable) s.startRecognitionImplRef.current();
  };

  // ── scheduleVoiceCapture ────────────────────────────────────────────────
  const scheduleVoiceCapture = useCallback(() => {
    if (s.shuttingDownRef.current) return;
    if (!s.micEnabledRef.current || !s.micBootstrappedRef.current) return;
    if (!voiceCaptureAllowed()) return;

    const whisperListen = s.whisperPrimaryRef.current;
    if (
      whisperListen &&
      (s.phaseRef.current === "listening" || s.phaseRef.current === "idle") &&
      !isAiSpeakingNow()
    ) {
      s.serverSttRecorderRef.current?.ensureRunning();
      // Whisper still owns capture/submission for this turn (onresult's
      // ownership guard blocks this channel from ever calling
      // submitListeningTranscript while Whisper is active) — but browser
      // recognition is also started below so the student sees a live caption
      // of their own words instead of just a "Listening…" placeholder.
    }

    if (!recognitionAvailable) return;

    if (isAiSpeakingNow()) {
      if (s.bargeInEnabledRef.current && s.phaseRef.current === "speaking") {
        startRecognitionImpl();
        return;
      }
      s.abortRecognitionRef.current();
      const el = s.mp3PlayerRef.current?.element;
      if (!el) return;
      const onDone = () => {
        el.removeEventListener("ended", onDone);
        el.removeEventListener("pause", onDone);
        armSttCooldown(POST_PLAYBACK_ECHO_MS);
        window.setTimeout(() => startRecognitionImpl(), POST_PLAYBACK_ECHO_MS);
      };
      el.addEventListener("ended", onDone, { once: true });
      el.addEventListener("pause", onDone, { once: true });
      return;
    }

    if (isSttCooldownActive()) {
      const wait = s.sttCooldownUntilRef.current - Date.now() + 20;
      window.setTimeout(() => startRecognitionImpl(), wait);
      return;
    }
    startRecognitionImpl();
  }, [recognitionAvailable, armSttCooldown, isAiSpeakingNow, isSttCooldownActive]); // eslint-disable-line

  s.scheduleVoiceCaptureRef.current = scheduleVoiceCapture;

  // ── Recognition abort/stop impls ────────────────────────────────────────
  s.startRecognitionRef.current = startRecognitionImpl;
  s.stopRecognitionRef.current = () => {
    try { s.recognitionRef.current?.stop(); } catch { /* ignore */ }
  };
  s.abortRecognitionRef.current = () => {
    if (!s.recognitionRef.current) return;
    try {
      s.recognitionRef.current.abort();
    } catch {
      try { s.recognitionRef.current.stop(); } catch { /* ignore */ }
    }
  };

  // ── Guard: abort recognition when tutor audio leaks into listening phase ─
  useEffect(() => {
    if (deps.s.phaseRef.current !== "listening" || !micEnabled || !recognitionAvailable) return;
    const id = window.setInterval(() => {
      if (
        s.shuttingDownRef.current ||
        s.phaseRef.current !== "listening" ||
        !isTutorAudible(s.mp3PlayerRef.current, s.fallbackMp3Ref.current)
      ) return;
      s.abortRecognitionRef.current();
    }, 200);
    return () => window.clearInterval(id);
  }, [deps.s.phase, micEnabled, recognitionAvailable]); // eslint-disable-line

  // ── Volume-based STT re-arm while listening ─────────────────────────────
  useEffect(() => {
    if (deps.s.phase !== "listening" || !micEnabled) return;
    if (!recognitionAvailable && !serverSttActive) return;
    const id = window.setInterval(() => {
      if (
        !s.micBootstrappedRef.current ||
        s.shuttingDownRef.current ||
        s.phaseRef.current !== "listening" ||
        isTutorAudible(s.mp3PlayerRef.current, s.fallbackMp3Ref.current)
      ) return;
      if (s.volumeRef.current > 0.06) {
        s.micListenAllowedRef.current = true;
        scheduleVoiceCapture();
      }
    }, 2500);
    return () => window.clearInterval(id);
  }, [deps.s.phase, micEnabled, recognitionAvailable, serverSttActive, scheduleVoiceCapture]); // eslint-disable-line

  // ── Server Whisper ticker ───────────────────────────────────────────────
  useEffect(() => {
    if (!serverSttActive || !micEnabled) return;

    const beginListenCapture = () => {
      const mic = s.serverSttRecorderRef.current;
      if (!mic || mic.isCapturingUtterance()) return;
      mic.ensureRunning();
      mic.beginUtteranceCapture();
      s.listeningUtteranceActiveRef.current = true;
      s.utteranceStartedAtRef.current = Date.now();
      s.speechActiveRef.current = false;
      s.silenceSinceRef.current = null;
    };

    const discardListenCapture = (mic: NonNullable<typeof s.serverSttRecorderRef.current>) => {
      void (async () => {
        if (mic.isCapturingUtterance()) await mic.endUtteranceCapture();
        s.listeningUtteranceActiveRef.current = false;
        s.speechActiveRef.current = false;
        s.silenceSinceRef.current = null;
        beginListenCapture();
      })();
    };

    async function finalizeUtterance(blob: Blob, mode: "listen" | "barge") {
      try {
        s.setInterimTranscript("Understanding…");
        const phaseAtTranscribe = s.phaseRef.current;
        vlog.whisper("transcribe_start", { mode, bytes: blob.size, phase: phaseAtTranscribe, turnId: s.turnIdRef.current });
        const result = await transcribeWithServer(blob, normalizedVoiceUrl, {
          subjectName: subjectLabel,
          token: getAccessToken() || null,
          language: "en",
          rejectIfSimilarTo: s.recentAiSpeechRef.current || "",
          voiceSessionId: s.voiceSessionIdRef.current,
          isBarge: mode === "barge",
        });
        let cleaned = stripConversationalLeadIn(
          postprocessVoiceTranscript(result.transcript, subjectLabel),
        );
        const rejectSource = mode === "barge" ? "whisper-barge" : "whisper-listen";

        if (mode === "listen" && s.phaseRef.current !== "listening") {
          vlog.whisper("result_discarded phase_changed", { mode, phase: s.phaseRef.current, text: cleaned.slice(0, 60) });
          scheduleVoiceCapture();
          return;
        }

        if (
          !cleaned ||
          !isMeaningfulVoiceTranscript(cleaned) ||
          result.rejected ||
          rejectTranscriptCandidateRef.current(cleaned, rejectSource)
        ) {
          vlog.whisper("result_discarded", {
            mode,
            rejected: result.rejected,
            junk: cleaned ? !isMeaningfulVoiceTranscript(cleaned) : true,
            len: cleaned.length,
            phase: s.phaseRef.current,
          });
          if (mode === "barge") {
            beginPostInterruptCapture();
          } else {
            s.armWhisperBrowserFallbackRef.current();
            scheduleVoiceCapture();
          }
          return;
        }
        // Final gate: transcription is async — AI may have started speaking
        // by the time we get here. Block both listen and barge on audible AI.
        // Block listen-only if the listen-cooldown is still active.
        const aiAudible = isTutorAudible(s.mp3PlayerRef.current, s.fallbackMp3Ref.current);
        const listenBlocked = mode === "listen" && Date.now() < s.listenCooldownUntilRef.current;
        if (aiAudible || listenBlocked) {
          vlog.whisper("result_discarded final_gate", { mode, aiAudible, listenBlocked, phase: s.phaseRef.current, text: cleaned.slice(0, 60) });
          scheduleVoiceCapture();
          return;
        }
        vlog.whisper("result_accepted", { mode, text: cleaned.slice(0, 80), phase: s.phaseRef.current, turnId: s.turnIdRef.current });
        s.lastUtteranceBlobRef.current = blob;
        if (mode === "barge") {
          if (s.phaseRef.current === "listening" || s.phaseRef.current === "thinking") {
            void s.handleUserTurnRef.current(cleaned, ++s.turnIdRef.current, {
              requireMic: true, skipPlaybackCheck: true, isBargeAudio: true,
            });
          } else {
            vlog.whisper("barge_result_discarded phase_not_eligible", { phase: s.phaseRef.current });
          }
          return;
        }
        void s.handleUserTurnRef.current(cleaned, ++s.turnIdRef.current, { requireMic: true });
      } catch {
        s.armWhisperBrowserFallbackRef.current();
        scheduleVoiceCapture();
      } finally {
        s.serverSttProcessingRef.current = false;
        s.setInterimTranscript("");
      }
    }

    const flushUtterance = (mic: NonNullable<typeof s.serverSttRecorderRef.current>, mode: "listen" | "barge") => {
      if (s.serverSttProcessingRef.current) return;
      // Listen path only: drop the blob if AI audio is currently playing or
      // if the listen-block cooldown is active (set when speaking starts).
      if (mode === "listen" && (
        isTutorAudible(s.mp3PlayerRef.current, s.fallbackMp3Ref.current) ||
        Date.now() < s.listenCooldownUntilRef.current
      )) {
        s.bargeUtteranceActiveRef.current = false;
        s.listeningUtteranceActiveRef.current = false;
        vlog.whisper("flush_discarded listen_blocked", { phase: s.phaseRef.current });
        scheduleVoiceCapture();
        return;
      }
      s.serverSttProcessingRef.current = true;
      s.bargeUtteranceActiveRef.current = false;
      s.listeningUtteranceActiveRef.current = false;
      s.speechActiveRef.current = false;
      s.silenceSinceRef.current = null;
      void (async () => {
        const blob = await mic.endUtteranceCapture();
        if (blob.size < 200) {
          s.serverSttProcessingRef.current = false;
          if (mode === "listen") s.armWhisperBrowserFallbackRef.current();
          else s.bargeEchoGuardRef.current = "";
          scheduleVoiceCapture();
          return;
        }
        void finalizeUtterance(blob, mode);
      })();
    };

    const tick = window.setInterval(() => {
      if (s.shuttingDownRef.current || s.serverSttProcessingRef.current || s.textInputOpenRef.current) return;
      const mic = s.serverSttRecorderRef.current;
      if (!mic || !s.micBootstrappedRef.current) return;

      const phaseNow = s.phaseRef.current;
      const whisperOn = s.whisperPrimaryRef.current;
      const isBarge = s.bargeUtteranceActiveRef.current;
      const isListen =
        whisperOn &&
        s.micListenAllowedRef.current &&
        (phaseNow === "listening" ||
          (phaseNow === "idle" && !isTutorAudible(s.mp3PlayerRef.current, s.fallbackMp3Ref.current)));

      if (!isBarge && !isListen) return;
      mic.ensureRunning();

      // Don't start a new listen capture while AI is playing or the listen-block is active.
      const listenBlocked =
        isTutorAudible(s.mp3PlayerRef.current, s.fallbackMp3Ref.current) ||
        Date.now() < s.listenCooldownUntilRef.current;
      if (isListen && !mic.isCapturingUtterance() && !s.bargeUtteranceActiveRef.current && !listenBlocked) {
        beginListenCapture();
        s.setInterimTranscript("Listening…");
      }
      if (!mic.isCapturingUtterance()) return;

      if (isListen && !s.speechActiveRef.current && s.utteranceStartedAtRef.current &&
        Date.now() - s.utteranceStartedAtRef.current > 12_000) {
        discardListenCapture(mic);
        return;
      }

      const level = s.volumeRef.current;
      const speaking = level > SPEECH_LEVEL;
      const silenceMs = isBarge ? BARGE_SILENCE_MS : LISTEN_SILENCE_MS;

      if (speaking) {
        s.speechActiveRef.current = true;
        s.silenceSinceRef.current = null;
        if (isListen || isBarge) s.setInterimTranscript("Listening…");
        return;
      }

      if (s.utteranceStartedAtRef.current && Date.now() - s.utteranceStartedAtRef.current > MAX_UTTERANCE_MS) {
        if (isListen && !s.speechActiveRef.current) {
          discardListenCapture(mic);
          return;
        }
        flushUtterance(mic, isBarge ? "barge" : "listen");
        return;
      }

      if (!s.speechActiveRef.current) return;
      if (s.silenceSinceRef.current === null) { s.silenceSinceRef.current = Date.now(); return; }
      if (Date.now() - s.silenceSinceRef.current < silenceMs) return;
      flushUtterance(mic, isBarge ? "barge" : "listen");
    }, 120);

    s.finalizeUtteranceRef.current = finalizeUtterance;
    return () => window.clearInterval(tick);
  }, [serverSttActive, micEnabled, normalizedVoiceUrl, subjectLabel, scheduleVoiceCapture]); // eslint-disable-line

  // ── Production barge-in monitor ──────────────────────────────────────────
  s.tickBargeInMonitorRef.current = (level: number) => {
    if (!s.bargeInEnabledRef.current || s.isGreetingActiveRef.current || !s.micEnabledRef.current) return;
    if (s.shuttingDownRef.current || s.interruptingRef.current || s.phaseRef.current !== "speaking") {
      s.bargeVolumeHistoryRef.current = [];
      s.bargeCalibrationRef.current = [];
      s.bargeInHoldSinceRef.current = null;
      s.echoBaselineRef.current = 0;
      return;
    }

    const started = s.speakingStartedAtRef.current;
    if (started && Date.now() - started < BARGE_IN_ARM_DELAY_MS) {
      // Arm-delay window: TTS is already audible and nothing the student says
      // could have been captured yet, so this is leaked-tutor-audio signal —
      // bank it as the echo baseline instead of throwing it away.
      s.bargeCalibrationRef.current.push(level);
      return;
    }

    const history = s.bargeVolumeHistoryRef.current;
    if (s.bargeCalibrationRef.current.length > 0) {
      // Seed the rolling window with the calibration samples once, so the
      // floor starts from a real "tutor audio bleed" baseline instead of a
      // cold/empty window (which made floor === level and let anything
      // through for the first ~8 ticks after arm-delay ends).
      history.unshift(...s.bargeCalibrationRef.current);
      s.bargeCalibrationRef.current = [];
    }
    history.push(level);
    if (history.length > 40) history.shift();

    let floor = level;
    if (history.length >= 8) {
      const sorted = [...history].sort((a, b) => a - b);
      floor = sorted[Math.floor(sorted.length * 0.2)] ?? level;
    }
    s.echoBaselineRef.current = floor;

    // Native AEC failed to engage on this mic track (some Android/Bluetooth
    // combos) — the volume monitor is now working against raw tutor-audio
    // leakage instead of a clean signal, so demand a visibly stronger spike
    // held for longer before treating it as the student's own voice.
    const degraded = s.aecDegradedRef.current;
    const spike = level - floor;
    const ratio = floor > 0.015 ? level / floor : 0;
    const userLikely = degraded
      ? level > 0.07 && (spike > 0.05 || ratio > 1.35)
      : level > 0.045 && (spike > 0.028 || ratio > 1.14);

    if (!userLikely) { s.bargeInHoldSinceRef.current = null; return; }

    if (!s.bargeInHoldSinceRef.current) {
      s.bargeInHoldSinceRef.current = Date.now();
      beginBargeGateCapture();
      return;
    }
    const holdMs = degraded ? BARGE_IN_HOLD_MS * 1.6 : BARGE_IN_HOLD_MS;
    if (Date.now() - s.bargeInHoldSinceRef.current < holdMs) return;

    s.bargeInHoldSinceRef.current = null;
    s.bargeVolumeHistoryRef.current = [];

    const mic = s.serverSttRecorderRef.current;
    s.bargeUtteranceActiveRef.current = false;

    const studentKey = String(
      (s.userRef.current as { id?: string; email?: string; username?: string } | null)?.id ||
      (s.userRef.current as { email?: string } | null)?.email ||
      (s.userRef.current as { username?: string } | null)?.username ||
      "anonymous",
    );

    const applyBargeMetrics = (result: Awaited<ReturnType<typeof checkBargeIn>>) => {
      s.protectionMetricsRef.current.set("speech_probability", result.speech_probability ?? 0);
      s.protectionMetricsRef.current.set("speech_duration_ms", result.speech_duration_ms ?? 0);
      s.protectionMetricsRef.current.set("speaker_similarity", result.speaker_similarity ?? 0);
      s.protectionMetricsRef.current.set("echo_similarity_score", result.echo_similarity_score ?? 0);
    };

    // Detection timestamp for interrupt-latency measurement (issue 5) — set
    // here regardless of path, since this is the moment the spike/hold was
    // confirmed, before either the sync or the async (network) branch runs.
    s.bargeDetectedAtRef.current = Date.now();

    if (!BARGE_CONFIRMED || !VOICE_PROTECTION_ENABLED || !BARGE_CHECK_REQUIRED) {
      if (mic?.isCapturingUtterance()) void mic.endUtteranceCapture();
      s.bargeEventIdRef.current = null;
      s.handleInterruptRef.current();
      return;
    }

    // Snapshot what "still valid" means *before* the network round-trip —
    // checkBargeIn can take 100s of ms, long enough for interruptingRef's
    // cooldown (INTERRUPT_COOLDOWN_MS=280ms) to have already reset from an
    // unrelated interrupt. Without re-checking these after the await, a
    // stale confirmation can fire handleInterrupt for a turn/phase that has
    // already moved on (race — see PR notes).
    const epochAtCheckStart = s.streamEpochRef.current;

    void (async () => {
      const snapshot = mic && mic.isCapturingUtterance() ? await mic.endUtteranceCapture() : null;
      if (!snapshot || snapshot.size < 200) {
        s.protectionMetricsRef.current.bump("interrupt_rejected_count");
        console.debug("[INTERRUPT_REJECTED]", { reason: "no_barge_snapshot" });
        return;
      }
      const t0 = performance.now();
      try {
        const result = await checkBargeIn(snapshot, normalizedVoiceUrl, {
          transcript: s.interimTranscriptRef.current || "",
          recentAiSpeech: s.recentAiSpeechRef.current,
          studentKey,
          voiceSessionId: s.voiceSessionIdRef.current,
          token: getAccessToken() || null,
        });
        applyBargeMetrics(result);
        if (!result.allow_interrupt) {
          s.protectionMetricsRef.current.bump("interrupt_rejected_count");
          console.debug("[INTERRUPT_REJECTED]", result);
          return;
        }
        const stillValid =
          !s.shuttingDownRef.current &&
          s.streamEpochRef.current === epochAtCheckStart &&
          s.phaseRef.current === "speaking";
        if (!stillValid) {
          s.protectionMetricsRef.current.bump("interrupt_rejected_count");
          console.debug("[INTERRUPT_REJECTED]", {
            reason: "stale_confirmation",
            epochAtCheckStart, epochNow: s.streamEpochRef.current, phaseNow: s.phaseRef.current,
          });
          return;
        }
        console.debug("[INTERRUPT_ACCEPTED]", { latency_ms: performance.now() - t0, reason: result.reason, intent: result.intent });
        s.protectionMetricsRef.current.bump("interrupt_accepted_count");
        s.bargeEventIdRef.current = result.barge_event_id || null;
        s.handleInterruptRef.current({ skipBargeCapture: true });
        beginPostInterruptCapture();
      } catch (err) {
        s.protectionMetricsRef.current.bump("interrupt_rejected_count");
        console.debug("[INTERRUPT_CHECK]", { reason: "barge_check_error", err });
      }
    })();
  };

  // ── Browser SpeechRecognition setup ────────────────────────────────────
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
    // Separate from finalAccumulator on purpose: this only feeds the live
    // caption preview and must never influence what gets submitted, even on
    // turns where server-Whisper (not this channel) owns capture/submit.
    let captionAccumulator = "";

    const clearInterimFlush = () => {
      if (interimFlushTimer) window.clearTimeout(interimFlushTimer);
      interimFlushTimer = null;
      pendingInterim = "";
    };

    const submitListeningTranscript = (raw: string, source: string) => {
      const t = raw.trim();
      if (!t || !isMeaningfulVoiceTranscript(t)) return;
      if (s.phaseRef.current !== "listening") {
        console.debug("[STT] browser_submit_blocked", {
          source, phase: s.phaseRef.current, turnId: s.turnIdRef.current,
          text: t.slice(0, 60), reason: "phase !== listening",
        });
        return;
      }
      // Block if AI audio is still playing or the listen-cooldown is active.
      if (
        isTutorAudible(s.mp3PlayerRef.current, s.fallbackMp3Ref.current) ||
        Date.now() < s.listenCooldownUntilRef.current
      ) {
        console.debug("[STT] browser_submit_blocked", {
          source, phase: s.phaseRef.current, turnId: s.turnIdRef.current,
          text: t.slice(0, 60), reason: "tutor_audible_or_listen_cooldown",
        });
        return;
      }
      console.debug("[STT] browser_submit", { source, phase: s.phaseRef.current, turnId: s.turnIdRef.current, len: t.length });
      if (s.textInputOpenRef.current) {
        const combined = s.textDictationRef.current
          ? `${s.textDictationRef.current} ${t}`.trim()
          : t;
        s.setTextInput("");
        s.setInterimTranscript("");
        s.textDictationRef.current = "";
        if (combined.length >= 2 && !rejectTranscriptCandidateRef.current(combined, "browser-dictation")) {
          void s.handleUserTurnRef.current(combined, ++s.turnIdRef.current, {
            requireMic: false, skipPlaybackCheck: true, skipPhaseCheck: true,
          });
        }
        return;
      }
      // Whisper (not this channel) owns capture/submission for spoken listening
      // turns in this configuration — browser recognition is running purely for
      // the live caption preview (see the caption block above in onresult).
      // Chrome's own endpointing is non-configurable and known to clip trailing
      // words (that's the entire reason VITE_WHISPER_LISTEN_PRIMARY exists) —
      // letting this channel submit unconditionally would race Whisper's
      // longer, tuned silence window and win on short pauses, cutting the
      // student off early. Only actually submit from here when Whisper isn't
      // primary, or when the whisper-failure fallback window is armed.
      if (
        s.whisperPrimaryRef.current &&
        s.serverSttActiveRef.current &&
        Date.now() >= s.whisperBrowserFallbackUntilRef.current
      ) {
        console.debug("[STT] browser_submit_blocked", {
          source, phase: s.phaseRef.current, turnId: s.turnIdRef.current,
          text: t.slice(0, 60), reason: "whisper_owns_submission",
        });
        return;
      }
      if (rejectTranscriptCandidateRef.current(t, source)) {
        scheduleVoiceCapture();
        return;
      }
      void s.handleUserTurnRef.current(t, ++s.turnIdRef.current, { requireMic: true });
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
        if (s.phaseRef.current !== "listening") return;
        if (!canAcceptSttNowRef.current()) return;
        submitListeningTranscript(candidate, "browser-interim");
      }, STT_INTERIM_COMPLETE_MS);
    };

    rec.onresult = (event: any) => {
      if (s.shuttingDownRef.current) return;

      // INVARIANT 4: AI audio must NEVER become a user prompt.
      if (
        s.phaseRef.current === "speaking" &&
        bargeInEnabled &&
        !s.isGreetingActiveRef.current &&
        s.micEnabledRef.current
      ) {
        let chunk = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          chunk += (chunk ? " " : "") + (event.results[i][0]?.transcript || "");
        }
        const t = chunk.trim();
        if (t.length >= 2) {
          const { verdict, similarity } = evaluateIncomingTranscript(t, s.recentAiSpeechRef.current);
          if (verdict === "echo_rejected") {
            s.protectionMetricsRef.current.bump("echo_rejected_count");
            s.protectionMetricsRef.current.set("echo_similarity_score", similarity);
            console.debug("[STT] phase=speaking source=browser DISCARD reason=ai_echo", {
              turnId: s.turnIdRef.current, similarity, text: t.slice(0, 80),
            });
            logSttVerdict("echo_rejected", t, { source: "browser-speaking", similarity });
            return;
          }
          if (verdict === "discarded") {
            console.debug("[STT] phase=speaking source=browser DISCARD reason=too_short", { turnId: s.turnIdRef.current });
            return;
          }
          const intent = detectInterruptIntent(t);
          const question = stripConversationalLeadIn(t);
          if (intent.isInterruptIntent || looksLikeStudentQuestion(question)) {
            // Browser Web Speech text has no audio attached, so it can't be
            // speaker-verified — use it only to decide *whether* to interrupt,
            // then re-capture real mic audio through the verified server
            // pipeline (speaker check + echo check) instead of trusting this
            // text as the prompt.
            console.debug("[INTERRUPT_ACCEPTED]", {
              reason: intent.isInterruptIntent ? "intent" : "question",
              phrase: intent.matchedPhrase, turnId: s.turnIdRef.current, text: t.slice(0, 80),
            });
            s.bargeDetectedAtRef.current = Date.now();
            s.bargeEventIdRef.current = null; // no server barge-check on this path — nothing to correlate
            s.handleInterruptRef.current({ skipBargeCapture: true });
            beginPostInterruptCapture();
          } else {
            console.debug("[STT] phase=speaking source=browser DISCARD reason=no_interrupt_intent", {
              turnId: s.turnIdRef.current, text: t.slice(0, 80),
            });
          }
        }
        return;
      }

      if (s.phaseRef.current === "thinking") return;
      if (!canAcceptSttNowRef.current()) return;
      if (s.phaseRef.current === "connecting" || isTutorAudible(s.mp3PlayerRef.current, s.fallbackMp3Ref.current)) return;
      if (s.phaseRef.current !== "listening") return;

      // Live caption preview — paints the student's words as they speak them,
      // even on turns where server-Whisper (not this channel) owns the actual
      // capture/submit for endpointing accuracy. Display-only: it never calls
      // submitListeningTranscript, so it can't cause a double-submit with the
      // Whisper path below.
      if (!s.textInputOpenRef.current) {
        let previewInterim = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const txt = event.results[i][0]?.transcript || "";
          if (event.results[i].isFinal) {
            captionAccumulator += (captionAccumulator ? " " : "") + txt;
          } else {
            previewInterim += txt;
          }
        }
        const preview = [captionAccumulator, previewInterim].filter(Boolean).join(" ").trim();
        if (preview) s.setInterimTranscript(preview);
      }

      if (
        s.whisperPrimaryRef.current &&
        s.serverSttActiveRef.current &&
        (s.serverSttProcessingRef.current || (s.listeningUtteranceActiveRef.current && s.speechActiveRef.current))
      ) return;
      if (!canAcceptSttNowRef.current()) return;

      const dictatingToTextField = s.textInputOpenRef.current;
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
      if (dictatingToTextField) { s.setInterimTranscript(interim.trim()); return; }
      const combined = [finalAccumulator, interim].filter(Boolean).join(" ").trim();
      s.setInterimTranscript(interim.trim());
      if (combined) scheduleInterimFlush(combined);
    };

    rec.onend = () => {
      if (s.shuttingDownRef.current || !s.micEnabledRef.current) return;
      if (finalizeTimer) { window.clearTimeout(finalizeTimer); finalizeTimer = null; }
      const pending = [finalAccumulator, pendingInterim].filter(Boolean).join(" ").trim();
      finalAccumulator = "";
      captionAccumulator = "";
      clearInterimFlush();
      if (pending && s.phaseRef.current === "listening" && canAcceptSttNowRef.current()) {
        submitListeningTranscript(pending, "browser-onend");
      }
      if (!voiceCaptureAllowed()) return;
      if (isSttCooldownActive()) {
        const wait = s.sttCooldownUntilRef.current - Date.now() + 20;
        window.setTimeout(() => s.scheduleVoiceCaptureRef.current(), wait);
        return;
      }
      window.setTimeout(() => s.scheduleVoiceCaptureRef.current(), 100);
    };

    rec.onerror = (event: any) => {
      const code = event?.error as string | undefined;
      if (code === "aborted" || code === "no-speech") return;
      if (code === "not-allowed" || code === "service-not-allowed") {
        s.setErrorText(
          "Microphone access was blocked. Please allow microphone permission and refresh.",
        );
        return;
      }
      window.setTimeout(() => s.scheduleVoiceCaptureRef.current(), 500);
    };

    s.recognitionRef.current = rec;
    return () => { try { rec.stop(); } catch { /* ignore */ } };
  }, [recognitionAvailable, subjectLabel]); // eslint-disable-line

  // ── Phase-driven STT effects ─────────────────────────────────────────────
  useEffect(() => {
    if (deps.s.phase === "error" || !recognitionAvailable) return;
    if (deps.s.phase === "listening" && micEnabled) {
      s.bargeUtteranceActiveRef.current = false;
      s.listeningUtteranceActiveRef.current = false;
      s.micListenAllowedRef.current = true;
      if (s.micBootstrappedRef.current) scheduleVoiceCapture();
    } else if (deps.s.phase === "thinking") {
      s.abortRecognitionRef.current();
    } else if (
      deps.s.phase === "speaking" &&
      bargeInEnabled &&
      !s.isGreetingActiveRef.current &&
      micEnabled &&
      s.micBootstrappedRef.current
    ) {
      s.startRecognitionRef.current();
    } else if (
      deps.s.phase === "connecting" ||
      (deps.s.phase === "speaking" && (!bargeInEnabled || s.isGreetingActiveRef.current))
    ) {
      s.abortRecognitionRef.current();
      s.echoBaselineRef.current = 0;
      s.bargeInHoldSinceRef.current = null;
    }
  }, [deps.s.phase, micEnabled, recognitionAvailable, bargeInEnabled, scheduleVoiceCapture]); // eslint-disable-line

  return { scheduleVoiceCapture, beginPostInterruptCapture };
}
