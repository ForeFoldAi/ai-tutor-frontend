/**
 * Audio subsystem:
 *   resetMp3Player, unlockAudioPlayback, enqueueMp3Chunk, stopAudioPlayback,
 *   startMicAnalyser, bootstrapVoiceInput
 */
import { useCallback } from "react";
import { Mp3StreamPlayer } from "@/lib/mp3-stream-player";
import { createContinuousMicRecorder } from "@/lib/voice-server-stt";
import { BARGE_IN_DUCK_VOLUME } from "@/lib/voice-conversation-config";
import { MSG } from "@/lib/student-messages";
import { isStaleAssistantStream, clamp01, tutorIsSpeaking } from "./voice-utils";
import { vlog } from "./voice-logger";
import type { VoicePageState } from "./use-voice-page-state";

export function useVoiceAudio(s: VoicePageState) {
  const resetMp3Player = useCallback(() => {
    s.mp3PlayerRef.current?.stop();
    const player = new Mp3StreamPlayer();
    player.resetTurnClock();
    s.mp3PlayerRef.current = player;
    void player.ready().then(() => player.unlock()).catch(() => {});
  }, []); // eslint-disable-line

  const unlockAudioPlayback = useCallback(async () => {
    if (!s.mp3PlayerRef.current) {
      s.mp3PlayerRef.current = new Mp3StreamPlayer();
      s.mp3PlayerRef.current.resetTurnClock();
    }
    if (s.audioPolicyUnlockedRef.current && tutorIsSpeaking(s.mp3PlayerRef.current)) return;
    try {
      await s.mp3PlayerRef.current.unlock();
      s.audioPolicyUnlockedRef.current = true;
    } catch {
      /* ignore */
    }
  }, []); // eslint-disable-line

  const enqueueMp3Chunk = useCallback((raw: ArrayBuffer) => {
    if (s.shuttingDownRef.current) return;
    if (isStaleAssistantStream(s.streamEpochRef, s.activeQuestionEpochRef)) {
      vlog.audio("chunk_discarded stale_epoch", {
        stream: s.streamEpochRef.current,
        active: s.activeQuestionEpochRef.current,
      });
      return;
    }
    if (!s.speakerEnabledRef.current || raw.byteLength === 0) return;
    if (!s.mp3PlayerRef.current) {
      const player = new Mp3StreamPlayer();
      player.resetTurnClock();
      s.mp3PlayerRef.current = player;
    }
    const player = s.mp3PlayerRef.current;
    void player.ready().then(() => {
      if (s.bargeInEnabledRef.current && s.phaseRef.current === "speaking") {
        player.element.volume = BARGE_IN_DUCK_VOLUME;
      }
      player.enqueue(raw);
      if (player.element.paused) {
        void player.element.play().catch(() => {});
      }
    });
    if (s.phaseRef.current !== "speaking") {
      vlog.phase(s.phaseRef.current, "speaking", { via: "first_audio_chunk", bytes: raw.byteLength });
      vlog.audio("playback_start", { epoch: s.streamEpochRef.current });
      // listenCooldownUntilRef: blocks ONLY the listen-submit path while AI is audible.
      // Barge-in path is intentionally exempt — that is how users interrupt.
      s.listenCooldownUntilRef.current = Date.now() + 60_000;
      s.setPhase("speaking");
      s.speakingStartedAtRef.current = Date.now();
      if (s.bargeInEnabledRef.current) {
        s.scheduleVoiceCaptureRef.current();
      } else {
        s.abortRecognitionRef.current();
      }
      s.echoBaselineRef.current = 0;
      s.bargeInHoldSinceRef.current = null;
    } else {
      // Keep extending while chunks arrive — long TTS responses stay fully blocked.
      s.listenCooldownUntilRef.current = Date.now() + 60_000;
    }
  }, []); // eslint-disable-line

  const stopAudioPlayback = useCallback(() => {
    s.mp3PlayerRef.current?.flushPending();
    s.mp3PlayerRef.current?.setAllowAutoResume(false);
    s.streamReaderRef.current?.cancel().catch(() => {});
    s.streamReaderRef.current = null;
    s.mp3PlayerRef.current?.stop();
    s.mp3PlayerRef.current = null;
    s.fallbackMp3Ref.current?.stop();
    s.fallbackMp3Ref.current = null;
    // Release the listen-block immediately when audio is force-stopped (interrupt/end call).
    s.listenCooldownUntilRef.current = 0;
  }, []); // eslint-disable-line

  const startMicAnalyser = useCallback((stream: MediaStream) => {
    s.analyserCleanupRef.current?.();
    s.analyserStreamRef.current = stream;
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
    s.analyserCleanupRef.current = () => {
      stream.getTracks().forEach((t) => t.stop());
      s.analyserStreamRef.current = null;
      try {
        micCtx.close();
      } catch {
        /* ignore */
      }
    };
    const tick = () => {
      if (!s.analyserStreamRef.current) return;
      analyser.getByteTimeDomainData(data);
      let sumSq = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sumSq += v * v;
      }
      const level = clamp01(Math.sqrt(sumSq / data.length) * 3.2);
      s.volumeRef.current = level;
      s.tickBargeInMonitorRef.current(level);
      s.setVolumeUi(level);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, []); // eslint-disable-line

  const bootstrapVoiceInput = useCallback(async () => {
    if (!s.micEnabledRef.current || s.shuttingDownRef.current) return;
    // Must fire before any await: iOS Safari only treats audio.play() as
    // user-activated when called synchronously from the gesture handler.
    // Awaiting getUserMedia (a real permission prompt) first loses that
    // activation, so TTS playback silently never starts on mobile.
    void unlockAudioPlayback();
    try {
      if (!s.micBootstrappedRef.current) {
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              channelCount: { ideal: 1 },
            },
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        }
        try {
          const track = stream.getAudioTracks()[0];
          const settings = track?.getSettings?.() as MediaTrackSettings & {
            echoCancellation?: boolean;
            noiseSuppression?: boolean;
            autoGainControl?: boolean;
          };
          console.debug("[MIC_CONSTRAINTS]", {
            echoCancellation: settings?.echoCancellation,
            noiseSuppression: settings?.noiseSuppression,
            autoGainControl: settings?.autoGainControl,
            sampleRate: settings?.sampleRate,
            channelCount: settings?.channelCount,
            deviceId: settings?.deviceId,
          });
        } catch {
          /* ignore */
        }
        s.micBootstrappedRef.current = true;
        startMicAnalyser(stream);
        s.serverSttRecorderRef.current = createContinuousMicRecorder(stream);
        s.serverSttRecorderRef.current.ensureRunning();
        s.setNeedsVoiceTap(false);
        s.setErrorText(null);
      }
      s.micListenAllowedRef.current = true;
      s.scheduleVoiceCaptureRef.current();
    } catch {
      s.setErrorText(MSG.micPermission);
    }
  }, [startMicAnalyser, unlockAudioPlayback]); // eslint-disable-line

  return {
    resetMp3Player,
    unlockAudioPlayback,
    enqueueMp3Chunk,
    stopAudioPlayback,
    startMicAnalyser,
    bootstrapVoiceInput,
  };
}
