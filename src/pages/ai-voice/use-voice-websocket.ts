/**
 * WebSocket lifecycle:
 *   connectWS, disconnectVoiceSocket, stopVoiceSessionResources, handleReconnect
 * Also owns the ws.onmessage handler (WS event → state transitions).
 */
import { useCallback } from "react";
import { buildWsUrl } from "@/lib/api-base";
import { stripGreetSearchParam } from "@/lib/tutor-greeting";
import { POST_PLAYBACK_LISTEN_MS } from "@/lib/voice-conversation-config";
import { MSG, studentFriendlyError } from "@/lib/student-messages";
import { tutorVoiceId } from "@/lib/tutor-voice";
import { endVoiceSession } from "@/lib/voice-protection";
import { logVoiceStreamMetrics } from "@/lib/voice-stream-diagnostics";
import { logVoicePlayerStats } from "@/lib/voice-audio-diagnostics";
import { isInFlightVoiceTurn, shouldIgnoreLateInterruptAck } from "@/lib/voice-turn-guard";
import type { VoiceRelatedImage } from "@/components/voice/voice-types";
import type { MathLesson } from "@/types/math-lesson";
import type { ScienceExperiment } from "@/types/science-experiment";
import { isStaleAssistantStream, getAccessToken } from "./voice-utils";
import { vlog } from "./voice-logger";
import type { VoicePageState } from "./use-voice-page-state";
import type { useVoiceSession } from "./use-voice-session";
import type { useVoiceAudio } from "./use-voice-audio";

type WSDeps = {
  s: VoicePageState;
  normalizedVoiceUrl: string;
  session: ReturnType<typeof useVoiceSession>;
  audio: ReturnType<typeof useVoiceAudio>;
};

export function useVoiceWebSocket({ s, normalizedVoiceUrl, session, audio }: WSDeps) {
  const disconnectVoiceSocket = useCallback(() => {
    if (s.reconnectTimerRef.current) {
      window.clearTimeout(s.reconnectTimerRef.current);
      s.reconnectTimerRef.current = null;
    }
    const ws = s.wsRef.current;
    if (ws) {
      ws.onopen = null;
      ws.onmessage = null;
      ws.onerror = null;
      ws.onclose = null;
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        try { ws.close(); } catch { /* ignore */ }
      }
      s.wsRef.current = null;
    }
    s.wsActiveRef.current += 1;
    s.wsReadyRef.current = false;
    s.setWsConnected(false);
  }, []); // eslint-disable-line

  const stopAudioPlayback = audio.stopAudioPlayback;

  const stopVoiceSessionResources = useCallback(() => {
    s.shuttingDownRef.current = true;
    s.turnIdRef.current += 1;

    const ws = s.wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify({ type: "session_end", voice_session_id: s.voiceSessionIdRef.current }));
      } catch { /* ignore */ }
      try {
        ws.send(JSON.stringify({ type: "stop" }));
      } catch { /* ignore */ }
    }
    void endVoiceSession(s.voiceSessionIdRef.current, normalizedVoiceUrl, getAccessToken() || null);
    disconnectVoiceSocket();

    s.abortRef.current?.abort();
    s.abortRef.current = null;
    s.streamReaderRef.current?.cancel().catch(() => {});
    s.streamReaderRef.current = null;

    s.mp3PlayerRef.current?.setAllowAutoResume(false);
    s.mp3PlayerRef.current?.stop();
    s.mp3PlayerRef.current = null;
    s.fallbackMp3Ref.current?.setAllowAutoResume(false);
    s.fallbackMp3Ref.current?.stop();
    s.fallbackMp3Ref.current = null;

    s.analyserCleanupRef.current?.();
    s.analyserCleanupRef.current = null;
    s.analyserStreamRef.current = null;
    s.micBootstrappedRef.current = false;

    if (s.recognitionRef.current) {
      try { s.recognitionRef.current.stop(); } catch { /* ignore */ }
    }
    s.micListenAllowedRef.current = false;
  }, [disconnectVoiceSocket, normalizedVoiceUrl]); // eslint-disable-line

  const connectWS = useCallback(() => {
    if (s.reconnectTimerRef.current) {
      window.clearTimeout(s.reconnectTimerRef.current);
      s.reconnectTimerRef.current = null;
    }
    if (s.wsRef.current && s.wsRef.current.readyState <= WebSocket.OPEN) return;

    const myGen = ++s.wsActiveRef.current;
    const ctx = s.chapterCtxRef.current;
    const token = getAccessToken();
    const fullUrl = buildWsUrl(normalizedVoiceUrl, "/ws/voice", token ? { token } : undefined);

    const ws = new WebSocket(fullUrl);
    ws.binaryType = "arraybuffer";
    s.wsRef.current = ws;

    ws.onopen = () => {
      if (myGen !== s.wsActiveRef.current) return;
      s.wsReadyRef.current = true;
      s.setWsConnected(true);
      s.setIsReconnecting(false);
      s.setErrorText(null);
      s.setConnectionStatus("Connected");
      s.setIsCallLive(true);
      if (!s.callStartRef.current) s.callStartRef.current = Date.now();
      const sendGreet = s.shouldGreetOnConnectRef.current && Boolean(ctx);
      if (sendGreet) {
        s.shouldGreetOnConnectRef.current = false;
        stripGreetSearchParam();
        s.micListenAllowedRef.current = false;
        s.setPhase("connecting");
      } else {
        s.micListenAllowedRef.current = true;
        s.setPhase("listening");
      }
      void audio.unlockAudioPlayback();
      ws.send(JSON.stringify({
        type: "session_start",
        board: ctx?.board || "",
        class_level: ctx?.classLevel || "",
        subject_name: ctx?.subject || "",
        chapter_ids: ctx?.chapterIds || null,
        chapter: ctx?.chapterNames?.[0] || "",
        chapter_names: ctx?.chapterNames || [],
        student_name: s.userRef.current?.fullName || "",
        greet: sendGreet,
        voice_gender: s.voiceGenderRef.current,
        tts_voice: tutorVoiceId(s.voiceGenderRef.current),
        voice_session_id: s.voiceSessionIdRef.current,
        stt_mode: s.sttModeRef.current,
      }));
      if (!sendGreet) {
        void s.bootstrapVoiceInputRef.current();
        window.setTimeout(() => s.scheduleVoiceCaptureRef.current(), 100);
      }
    };

    ws.onmessage = async (event) => {
      if (s.shuttingDownRef.current) return;
      const staleAssistant = isStaleAssistantStream(s.streamEpochRef, s.activeQuestionEpochRef);

      if (event.data instanceof ArrayBuffer) {
        if (staleAssistant) return;
        audio.enqueueMp3Chunk(event.data);
        return;
      }
      if (event.data instanceof Blob) {
        if (staleAssistant) return;
        try {
          const buf = await event.data.arrayBuffer();
          audio.enqueueMp3Chunk(buf);
        } catch { /* ignore */ }
        return;
      }

      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(event.data as string);
      } catch {
        return;
      }

      const assistantEventTypes = new Set([
        "thinking", "speaking", "ai_text_token", "done",
        "related_images", "math_lesson", "science_experiment", "tutor_hint", "stream_metrics",
      ]);
      if (assistantEventTypes.has(String(msg.type)) && staleAssistant) return;

      switch (msg.type) {
        case "session_ready":
          // Server-confirmed echo of the stt_mode we declared at session_start —
          // hook point for a "limited interrupt detection" UI indicator.
          console.debug("[STT] session_ready", { stt_mode: msg.stt_mode });
          break;

        case "greeting_start":
          s.receivedAssistantStreamRef.current = true;
          s.micListenAllowedRef.current = false;
          if (s.bargeInEnabledRef.current) {
            s.scheduleVoiceCaptureRef.current();
          } else {
            s.abortRecognitionRef.current();
          }
          s.setPhase("speaking");
          session.syncAssistantText(String(msg.text ?? ""));
          s.setVoiceRelatedImages([]);
          s.setStreamingMathLesson(null);
          s.voiceMathLessonRef.current = null;
          audio.resetMp3Player();
          break;

        case "thinking":
          s.receivedAssistantStreamRef.current = true;
          s.micListenAllowedRef.current = false;
          vlog.phase(s.phaseRef.current, "thinking", { via: "ws_thinking" });
          vlog.llm("processing", { epoch: s.activeQuestionEpochRef.current });
          s.phaseRef.current = "thinking";
          s.setPhase("thinking");
          s.abortRecognitionRef.current();
          session.syncAssistantText("");
          s.setVoiceRelatedImages([]);
          s.setStreamingMathLesson(null);
          s.voiceMathLessonRef.current = null;
          audio.resetMp3Player();
          break;

        case "tutor_hint":
          s.setTutorUnderstandingHint(String(msg.hint ?? "").trim() || null);
          break;

        case "related_images": {
          const raw = msg.images;
          const imgs = Array.isArray(raw)
            ? (raw.filter((x) => x && typeof x === "object") as VoiceRelatedImage[])
            : [];
          s.setVoiceRelatedImages(imgs);
          break;
        }

        case "math_lesson": {
          const lesson = msg.lesson as MathLesson | undefined;
          if (lesson && typeof lesson === "object") {
            s.voiceMathLessonRef.current = lesson;
            s.setStreamingMathLesson(lesson);
            const clean = String(msg.clean_answer ?? "").trim();
            if (clean && !s.assistantTextRef.current.trim()) session.syncAssistantText(clean);
          }
          break;
        }

        case "science_experiment": {
          const experiment = msg.experiment as ScienceExperiment | undefined;
          if (experiment && typeof experiment === "object") {
            s.voiceScienceExperimentRef.current = experiment;
            s.setStreamingScienceExperiment(experiment);
            const clean = String(msg.clean_answer ?? "").trim();
            if (clean && !s.assistantTextRef.current.trim()) session.syncAssistantText(clean);
          }
          break;
        }

        case "speaking":
          s.receivedAssistantStreamRef.current = true;
          if (s.bargeInEnabledRef.current) {
            s.scheduleVoiceCaptureRef.current();
          } else {
            s.abortRecognitionRef.current();
          }
          s.setPhase("speaking");
          s.speakingStartedAtRef.current = Date.now();
          s.echoBaselineRef.current = 0;
          s.bargeInHoldSinceRef.current = null;
          break;

        case "ai_text_token": {
          const tok = String(msg.token ?? "");
          s.receivedAssistantStreamRef.current = true;
          if (s.phaseRef.current === "thinking") {
            if (s.bargeInEnabledRef.current) {
              s.scheduleVoiceCaptureRef.current();
            } else {
              s.abortRecognitionRef.current();
            }
            s.setPhase("speaking");
            s.echoBaselineRef.current = 0;
            s.bargeInHoldSinceRef.current = null;
          }
          session.appendAssistantToken(tok);
          break;
        }

        case "interrupt_ack":
          if (shouldIgnoreLateInterruptAck(s.streamEpochRef.current, s.activeQuestionEpochRef.current)) break;
          s.streamEpochRef.current += 1;
          stopAudioPlayback();
          s.micListenAllowedRef.current = true;
          s.setPhase("listening");
          s.finalizeAssistantTurnRef.current();
          if (s.micEnabledRef.current) s.scheduleVoiceCaptureRef.current();
          break;

        case "tutor_state":
          s.setTutorState(String(msg.state ?? "LISTENING"));
          break;

        case "done": {
          if (!s.receivedAssistantStreamRef.current) break;
          s.receivedAssistantStreamRef.current = false;
          s.setTutorUnderstandingHint(null);
          vlog.tts("stream_done", { epoch: s.activeQuestionEpochRef.current });
          const playerStats = s.mp3PlayerRef.current?.stats();
          logVoicePlayerStats(playerStats);
          if (playerStats) console.debug("[voice-metrics] player", playerStats);
          session.finalizeAssistantTurn();
          void session.resumeListeningAfterPlayback();
          break;
        }

        case "listening":
          if (isInFlightVoiceTurn(s.phaseRef.current, s.streamEpochRef.current, s.activeQuestionEpochRef.current)) break;
          s.micListenAllowedRef.current = true;
          s.bargeUtteranceActiveRef.current = false;
          s.listeningUtteranceActiveRef.current = false;
          s.phaseRef.current = "listening";
          s.setPhase("listening");
          void s.bootstrapVoiceInputRef.current();
          window.setTimeout(() => s.scheduleVoiceCaptureRef.current(), POST_PLAYBACK_LISTEN_MS);
          break;

        case "error": {
          s.setErrorText(studentFriendlyError(msg.message, MSG.voiceError));
          stopAudioPlayback();
          if (s.wsReadyRef.current) {
            s.micListenAllowedRef.current = true;
            s.setPhase("listening");
            if (s.micEnabledRef.current) s.scheduleVoiceCaptureRef.current();
          } else {
            s.setPhase("connecting");
          }
          break;
        }

        case "stream_metrics":
          logVoiceStreamMetrics(msg.metrics, msg.phase);
          break;
      }
    };

    ws.onerror = () => {
      s.wsReadyRef.current = false;
      s.setWsConnected(false);
      s.setConnectionStatus("Connection problem");
      s.setErrorText((prev) => prev ?? MSG.voiceUnavailable);
    };

    ws.onclose = () => {
      s.wsReadyRef.current = false;
      s.setWsConnected(false);
      s.setIsCallLive(false);
      if (s.shuttingDownRef.current || myGen !== s.wsActiveRef.current) return;
      s.wsRef.current = null;
      s.setConnectionStatus("Reconnecting…");
      s.setErrorText((prev) => prev ?? MSG.voiceConnection);
      s.reconnectTimerRef.current = window.setTimeout(connectWS, 2500);
    };
  }, [normalizedVoiceUrl]); // eslint-disable-line

  const handleReconnect = useCallback(() => {
    s.setIsReconnecting(true);
    s.setErrorText(null);
    s.setConnectionStatus("Reconnecting…");
    s.setPhase("connecting");

    if (s.reconnectTimerRef.current) {
      window.clearTimeout(s.reconnectTimerRef.current);
      s.reconnectTimerRef.current = null;
    }

    if (s.wsRef.current?.readyState === WebSocket.OPEN && s.wsReadyRef.current) {
      s.setIsReconnecting(false);
      s.setWsConnected(true);
      s.setConnectionStatus("Connected");
      s.setIsCallLive(true);
      s.micListenAllowedRef.current = true;
      s.setPhase("listening");
      if (s.micEnabledRef.current) s.scheduleVoiceCaptureRef.current();
      return;
    }

    const ws = s.wsRef.current;
    if (ws) {
      ws.onclose = null;
      ws.onerror = null;
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        try { ws.close(); } catch { /* ignore */ }
      }
      s.wsRef.current = null;
    }
    s.wsReadyRef.current = false;
    s.wsActiveRef.current += 1;
    audio.resetMp3Player();
    s.stopRecognitionRef.current();
    s.micListenAllowedRef.current = false;
    s.shuttingDownRef.current = false;
    connectWS();
  }, [normalizedVoiceUrl, connectWS]); // eslint-disable-line

  return { connectWS, disconnectVoiceSocket, stopVoiceSessionResources, handleReconnect };
}
