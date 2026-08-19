/**
 * Transcript + session helpers:
 *   finalizeAssistantTurn, appendUserTranscript, resumeListeningAfterPlayback,
 *   syncAssistantText, appendAssistantToken, getCallSeconds
 */
import { useCallback } from "react";
import { appendAiSpeechTail } from "@/lib/voice-echo-guard";
import { POST_PLAYBACK_ECHO_MS, POST_PLAYBACK_LISTEN_MS } from "@/lib/voice-conversation-config";
import type { TranscriptEntry } from "@/components/voice/voice-types";
import { vlog } from "./voice-logger";
import type { VoicePageState } from "./use-voice-page-state";

export function useVoiceSession(s: VoicePageState) {
  const getCallSeconds = useCallback(() => {
    if (!s.callStartRef.current) return 0;
    return Math.floor((Date.now() - s.callStartRef.current) / 1000);
  }, []); // eslint-disable-line

  const syncAssistantText = useCallback((next: string) => {
    s.assistantTextRef.current = next;
    s.setAssistantText(next);
    if (next.trim()) {
      s.recentAiSpeechRef.current = appendAiSpeechTail("", next);
      s.bargeEchoGuardRef.current = s.recentAiSpeechRef.current;
    }
  }, []); // eslint-disable-line

  const appendAssistantToken = useCallback((tok: string) => {
    const next = s.assistantTextRef.current + tok;
    s.assistantTextRef.current = next;
    s.setAssistantText(next);
    if (tok) {
      s.recentAiSpeechRef.current = appendAiSpeechTail(s.recentAiSpeechRef.current, tok);
      s.bargeEchoGuardRef.current = s.recentAiSpeechRef.current;
    }
  }, []); // eslint-disable-line

  const armSttCooldown = useCallback((ms = POST_PLAYBACK_ECHO_MS) => {
    s.sttCooldownUntilRef.current = Date.now() + ms;
  }, []); // eslint-disable-line

  const finalizeAssistantTurn = useCallback(() => {
    const text = s.assistantTextRef.current.trim();
    const imgs = s.voiceImagesRef.current;
    const mathLesson = s.voiceMathLessonRef.current;
    const scienceExperiment = s.voiceScienceExperimentRef.current;
    if (!text && imgs.length === 0 && !mathLesson && !scienceExperiment) return;
    s.setTranscriptEntries((prev) => [
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
    s.setVoiceRelatedImages([]);
    s.setStreamingMathLesson(null);
    s.setStreamingScienceExperiment(null);
    s.voiceMathLessonRef.current = null;
    s.voiceScienceExperimentRef.current = null;
  }, [getCallSeconds, syncAssistantText]); // eslint-disable-line

  const appendUserTranscript = useCallback(
    (text: string, extra?: Partial<TranscriptEntry>) => {
      const trimmed = text.trim();
      if (!trimmed && !extra?.userImageUrl) return;
      s.setTranscriptEntries((prev) => [
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
    [getCallSeconds], // eslint-disable-line
  );

  const resumeListeningAfterPlayback = useCallback(async () => {
    if (s.shuttingDownRef.current) return;
    const epochAtStart = s.activeQuestionEpochRef.current;
    const player = s.mp3PlayerRef.current;
    if (player) {
      player.signalNoMoreChunks();
      await player.waitForPlaybackEnd();
      armSttCooldown(POST_PLAYBACK_ECHO_MS);
      await new Promise<void>((r) => window.setTimeout(r, POST_PLAYBACK_ECHO_MS));
    } else {
      armSttCooldown(POST_PLAYBACK_ECHO_MS);
    }
    if (s.shuttingDownRef.current) return;
    if (s.activeQuestionEpochRef.current !== epochAtStart) return;
    if (s.phaseRef.current === "thinking") return;
    s.recentAiSpeechRef.current = s.recentAiSpeechRef.current.slice(-320);
    s.bargeEchoGuardRef.current = s.recentAiSpeechRef.current;
    // Clear the listen-block so STT can resume after the echo-cooldown window.
    s.listenCooldownUntilRef.current = 0;
    s.micListenAllowedRef.current = true;
    s.bargeUtteranceActiveRef.current = false;
    s.listeningUtteranceActiveRef.current = false;
    s.speechActiveRef.current = false;
    s.silenceSinceRef.current = null;
    vlog.audio("playback_ended_clean", { epoch: s.activeQuestionEpochRef.current });
    vlog.phase(s.phaseRef.current, "listening", { via: "resume_after_playback" });
    vlog.stt("reset interimTranscript='' finalTranscript=''");
    s.phaseRef.current = "listening";
    s.setPhase("listening");
    s.setInterimTranscript("");
    window.setTimeout(() => s.scheduleVoiceCaptureRef.current(), POST_PLAYBACK_LISTEN_MS);
  }, [armSttCooldown]); // eslint-disable-line

  return {
    getCallSeconds,
    syncAssistantText,
    appendAssistantToken,
    armSttCooldown,
    finalizeAssistantTurn,
    appendUserTranscript,
    resumeListeningAfterPlayback,
  };
}
