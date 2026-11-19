/**
 * Turn management:
 *   handleInterrupt, handleUserTurn
 */
import { useCallback } from "react";
import {
  INTERRUPT_COOLDOWN_MS,
  INTERRUPT_RESUME_LISTEN_MS,
  POST_PLAYBACK_ECHO_MS,
} from "@/lib/voice-conversation-config";
import { MSG, studentFriendlyApiError, studentFriendlyError } from "@/lib/student-messages";
import { tutorVoiceId } from "@/lib/tutor-voice";
import { blobToBase64 } from "@/lib/voice-server-stt";
import { buildVoiceConversationHistory } from "@/lib/voice-http-history";
import { postprocessVoiceTranscript, isMeaningfulVoiceTranscript } from "@/lib/voice-stt-postprocess";
import { stripConversationalLeadIn } from "@/lib/voice-interrupt-intent";
import { Mp3StreamPlayer } from "@/lib/mp3-stream-player";
import type { VoiceRelatedImage } from "@/components/voice/voice-types";
import type { MathLesson } from "@/types/math-lesson";
import type { ScienceExperiment } from "@/types/science-experiment";
import {
  isTutorAudible,
  setTutorPlaybackVolume,
  getAccessToken,
  FRAME_TEXT, FRAME_AUDIO, FRAME_DONE, FRAME_IMAGES,
  FRAME_TUTOR_HINT, FRAME_TUTOR_STATE, FRAME_MATH_LESSON, FRAME_SCIENCE_EXPERIMENT,
  FrameParser,
} from "./voice-utils";
import { vlog } from "./voice-logger";
import type { VoicePageState } from "./use-voice-page-state";
import type { useVoiceSession } from "./use-voice-session";
import type { useVoiceAudio } from "./use-voice-audio";

type TurnDeps = {
  s: VoicePageState;
  subjectLabel: string;
  normalizedVoiceUrl: string;
  micEnabled: boolean;
  session: ReturnType<typeof useVoiceSession>;
  audio: ReturnType<typeof useVoiceAudio>;
  rejectTranscriptCandidate: (raw: string, source: string) => boolean;
  beginPostInterruptCapture: () => void;
};

export function useVoiceTurn(deps: TurnDeps) {
  const {
    s, subjectLabel, normalizedVoiceUrl, micEnabled,
    session, audio, rejectTranscriptCandidate, beginPostInterruptCapture,
  } = deps;

  const handleInterrupt = useCallback((opts?: { skipBargeCapture?: boolean; fromUi?: boolean }) => {
    if (!opts?.fromUi && s.phaseRef.current === "thinking") return;
    if (s.interruptingRef.current) return;
    s.interruptingRef.current = true;

    vlog.interrupt("cancelling stream", { epoch: s.streamEpochRef.current, phase: s.phaseRef.current, fromUi: opts?.fromUi });
    vlog.phase(s.phaseRef.current, "listening", { via: "interrupt" });

    s.streamEpochRef.current += 1;
    s.abortRef.current?.abort();
    s.abortRef.current = null;
    audio.stopAudioPlayback();
    if (s.bargeDetectedAtRef.current) {
      vlog.interrupt("latency", {
        interrupt_latency_ms: Date.now() - s.bargeDetectedAtRef.current,
        barge_event_id: s.bargeEventIdRef.current,
      });
      s.bargeDetectedAtRef.current = 0;
    }
    setTutorPlaybackVolume(s.mp3PlayerRef.current, s.fallbackMp3Ref.current, 1);
    s.bargeEchoGuardRef.current = s.recentAiSpeechRef.current || s.assistantTextRef.current.trim();
    session.finalizeAssistantTurn();
    s.bargeVolumeHistoryRef.current = [];
    s.bargeInHoldSinceRef.current = null;
    s.echoBaselineRef.current = 0;

    if (s.wsRef.current?.readyState === WebSocket.OPEN) {
      s.wsRef.current.send(JSON.stringify({ type: "interrupt" }));
    }

    s.micListenAllowedRef.current = true;
    s.setPhase("listening");
    s.setInterimTranscript("");
    if (s.micEnabledRef.current) {
      if (s.serverSttActiveRef.current) {
        if (!opts?.skipBargeCapture) beginPostInterruptCapture();
      } else {
        window.setTimeout(() => s.scheduleVoiceCaptureRef.current(), INTERRUPT_RESUME_LISTEN_MS);
      }
    }

    window.setTimeout(() => { s.interruptingRef.current = false; }, INTERRUPT_COOLDOWN_MS);
  }, [session.finalizeAssistantTurn, audio.stopAudioPlayback, beginPostInterruptCapture]); // eslint-disable-line

  const handleUserTurn = async (
    userText: string,
    turnId: number,
    opts?: {
      requireMic?: boolean;
      /** Only set true for explicit text-field/UI sends — never for mic STT paths */
      skipPhaseCheck?: boolean;
      skipPlaybackCheck?: boolean;
      /** Audio captured while/right after tutor TTS was playing — never used to train the voiceprint. */
      isBargeAudio?: boolean;
    },
  ) => {
    if (s.shuttingDownRef.current) return;
    if (opts?.requireMic !== false && !micEnabled) return;

    // Level 2 Turn Gate
    if (turnId !== s.turnIdRef.current + 1 && turnId !== s.turnIdRef.current) {
      console.debug("[TURN] stale_turn_rejected", { turnId, current: s.turnIdRef.current, text: userText.slice(0, 60) });
      return;
    }

    // Level 1 STT Gate
    if (!opts?.skipPhaseCheck) {
      const ph = s.phaseRef.current;
      if (ph === "thinking" || ph === "connecting" || ph === "error") {
        console.debug("[STT] phase_gate_rejected", { phase: ph, turnId, text: userText.slice(0, 60) });
        return;
      }
      if (ph === "speaking") {
        if (isTutorAudible(s.mp3PlayerRef.current, s.fallbackMp3Ref.current)) {
          console.debug("[STT] phase_gate_rejected", { phase: "speaking+audible", turnId, text: userText.slice(0, 60) });
          return;
        }
      }
      if (ph !== "listening" && ph !== "idle" && ph !== "speaking") {
        console.debug("[STT] phase_gate_rejected", { phase: ph, turnId, text: userText.slice(0, 60) });
        return;
      }
    }

    if (
      !opts?.skipPlaybackCheck &&
      !opts?.skipPhaseCheck &&
      isTutorAudible(s.mp3PlayerRef.current, s.fallbackMp3Ref.current)
    ) {
      console.debug("[STT] playback_gate_rejected", { turnId, text: userText.slice(0, 60) });
      return;
    }

    const trimmed = stripConversationalLeadIn(
      postprocessVoiceTranscript(userText, subjectLabel),
    ).trim();
    if (!isMeaningfulVoiceTranscript(trimmed)) return;

    const now = Date.now();
    if (trimmed === s.lastSubmittedTranscriptRef.current && now - s.lastSubmittedAtRef.current < 4000) return;
    if (s.phaseRef.current === "thinking" && now - s.lastSubmittedAtRef.current < 2500) return;

    if (!opts?.skipPlaybackCheck && rejectTranscriptCandidate(trimmed, "user-turn")) {
      if (s.phaseRef.current === "listening") s.scheduleVoiceCaptureRef.current();
      return;
    }

    s.lastSubmittedTranscriptRef.current = trimmed;
    s.lastSubmittedAtRef.current = now;

    s.activeQuestionEpochRef.current = ++s.streamEpochRef.current;
    s.receivedAssistantStreamRef.current = false;

    vlog.turn("committed", { turnId, epoch: s.activeQuestionEpochRef.current, text: trimmed.slice(0, 80) });
    vlog.phase(s.phaseRef.current, "thinking");
    vlog.llm("request_start", { turnId, epoch: s.activeQuestionEpochRef.current });

    s.micListenAllowedRef.current = false;
    s.phaseRef.current = "thinking";
    s.setPhase("thinking");
    session.armSttCooldown(POST_PLAYBACK_ECHO_MS);
    s.setInterimTranscript("");
    s.setTutorUnderstandingHint(null);
    s.setErrorText(null);
    session.syncAssistantText("");
    s.setVoiceRelatedImages([]);
    session.appendUserTranscript(trimmed);
    audio.stopAudioPlayback();

    let sentViaWs = false;
    if (s.wsRef.current?.readyState === WebSocket.OPEN && s.wsReadyRef.current) {
      try {
        void audio.unlockAudioPlayback();
        audio.resetMp3Player();
        const payload: Record<string, unknown> = {
          type: "question",
          text: trimmed,
          voice_session_id: s.voiceSessionIdRef.current,
          is_barge: Boolean(opts?.isBargeAudio),
        };
        const utterBlob = s.lastUtteranceBlobRef.current;
        s.lastUtteranceBlobRef.current = null;
        if (opts?.requireMic !== false && utterBlob && utterBlob.size > 200) {
          try {
            payload.utterance_audio_b64 = await blobToBase64(utterBlob);
          } catch { /* optional */ }
        }
        const live = s.wsRef.current;
        if (live?.readyState === WebSocket.OPEN && s.wsReadyRef.current) {
          live.send(JSON.stringify(payload));
          sentViaWs = true;
        }
      } catch {
        sentViaWs = false;
      }
    }

    if (sentViaWs) {
      const epoch = s.activeQuestionEpochRef.current;
      const gotStream = await new Promise<boolean>((resolve) => {
        const started = Date.now();
        const id = window.setInterval(() => {
          if (s.shuttingDownRef.current || s.receivedAssistantStreamRef.current || s.activeQuestionEpochRef.current !== epoch) {
            window.clearInterval(id);
            resolve(true);
            return;
          }
          if (Date.now() - started >= 3500) {
            window.clearInterval(id);
            resolve(false);
          }
        }, 150);
      });
      if (gotStream || s.shuttingDownRef.current) return;
      s.activeQuestionEpochRef.current = ++s.streamEpochRef.current;
      s.receivedAssistantStreamRef.current = true;
    }

    // HTTP fallback
    const controller = new AbortController();
    s.abortRef.current = controller;
    try {
      const ctx = s.chapterCtxRef.current;
      const voiceEndpoint = ctx
        ? `${normalizedVoiceUrl}/auth/voice-stream`
        : `${normalizedVoiceUrl}/voice-stream`;
      const historyForHttp = [
        ...buildVoiceConversationHistory(s.transcriptEntriesRef.current),
        { role: "user" as const, content: trimmed },
      ];
      const body: Record<string, unknown> = {
        message: trimmed,
        conversation_id: "frontend-call",
        conversation_history: historyForHttp,
        tutor_state: s.tutorStateRef.current,
        student_name: s.userRef.current?.fullName || "",
        voice_gender: s.voiceGenderRef.current,
        tts_voice: tutorVoiceId(s.voiceGenderRef.current),
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
      if (!res.body || s.turnIdRef.current !== turnId) return;

      const frameParser = new FrameParser();
      const reader = res.body.getReader();
      s.streamReaderRef.current = reader;
      const fallbackPlayer = new Mp3StreamPlayer();
      fallbackPlayer.resetTurnClock();
      s.fallbackMp3Ref.current = fallbackPlayer;
      await fallbackPlayer.ready();
      await fallbackPlayer.unlock();
      let displayText = "";
      let relatedImgs: VoiceRelatedImage[] = [];
      let mathLesson: MathLesson | null = null;
      let scienceExperiment: ScienceExperiment | null = null;

      outer: while (true) {
        if (s.shuttingDownRef.current || s.turnIdRef.current !== turnId) break;
        const { done, value } = await reader.read();
        if (done || s.shuttingDownRef.current || s.turnIdRef.current !== turnId) break;
        for (const frame of frameParser.feed(value)) {
          if (frame.type === FRAME_TUTOR_HINT) {
            const hint = new TextDecoder().decode(frame.data).trim();
            if (hint) s.setTutorUnderstandingHint(hint);
          } else if (frame.type === FRAME_TEXT) {
            displayText += new TextDecoder().decode(frame.data);
            session.syncAssistantText(displayText);
            s.phaseRef.current = "speaking";
            s.setPhase("speaking");
          } else if (frame.type === FRAME_IMAGES) {
            try {
              const parsed = JSON.parse(new TextDecoder().decode(frame.data));
              relatedImgs = Array.isArray(parsed)
                ? (parsed.filter((x) => x && typeof x === "object") as VoiceRelatedImage[])
                : [];
              s.setVoiceRelatedImages(relatedImgs);
            } catch { /* ignore */ }
          } else if (frame.type === FRAME_MATH_LESSON) {
            try {
              const parsed = JSON.parse(new TextDecoder().decode(frame.data)) as {
                lesson?: MathLesson;
                clean_answer?: string;
              };
              if (parsed.lesson && typeof parsed.lesson === "object") {
                mathLesson = parsed.lesson;
                s.voiceMathLessonRef.current = parsed.lesson;
                s.setStreamingMathLesson(parsed.lesson);
                const clean = String(parsed.clean_answer ?? "").trim();
                if (clean) {
                  displayText = clean;
                  session.syncAssistantText(clean);
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
                s.voiceScienceExperimentRef.current = parsed.experiment;
                s.setStreamingScienceExperiment(parsed.experiment);
                const clean = String(parsed.clean_answer ?? "").trim();
                if (clean) {
                  displayText = clean;
                  session.syncAssistantText(clean);
                }
              }
            } catch { /* ignore */ }
          } else if (frame.type === FRAME_TUTOR_STATE) {
            const next = new TextDecoder().decode(frame.data).trim();
            if (next) s.setTutorState(next);
          } else if (frame.type === FRAME_AUDIO && s.speakerEnabledRef.current) {
            fallbackPlayer.enqueue(new Uint8Array(frame.data).buffer);
            if (fallbackPlayer.element.paused) void fallbackPlayer.element.play().catch(() => {});
            s.phaseRef.current = "speaking";
            s.setPhase("speaking");
          } else if (frame.type === FRAME_DONE) {
            break outer;
          }
        }
      }

      if (
        !s.shuttingDownRef.current &&
        s.turnIdRef.current === turnId &&
        (displayText.trim() || mathLesson || scienceExperiment)
      ) {
        s.setTranscriptEntries((prev) => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            role: "assistant",
            text: displayText.trim(),
            timeSec: session.getCallSeconds(),
            images: relatedImgs.length > 0 ? relatedImgs : undefined,
            mathLesson: mathLesson ?? undefined,
            scienceExperiment: scienceExperiment ?? undefined,
          },
        ]);
        session.syncAssistantText("");
        s.setVoiceRelatedImages([]);
        s.setStreamingMathLesson(null);
        s.setStreamingScienceExperiment(null);
        s.voiceMathLessonRef.current = null;
        s.voiceScienceExperimentRef.current = null;
        fallbackPlayer.signalNoMoreChunks();
        await fallbackPlayer.waitForPlaybackEnd();
        if (s.shuttingDownRef.current) return;
        // Release listen-block and apply echo cooldown before re-arming STT.
        s.listenCooldownUntilRef.current = 0;
        session.armSttCooldown();
        await new Promise<void>((r) => window.setTimeout(r, 400));
        if (s.shuttingDownRef.current) return;
        s.micListenAllowedRef.current = true;
        s.setTutorUnderstandingHint(null);
        s.phaseRef.current = "listening";
        s.setPhase("listening");
        s.scheduleVoiceCaptureRef.current();
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") return;
      s.setErrorText(studentFriendlyError(e, MSG.voiceError));
      s.phaseRef.current = "error";
      s.setPhase("error");
    } finally {
      s.abortRef.current = null;
    }
  };

  return { handleInterrupt, handleUserTurn };
}
