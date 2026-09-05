import { useCallback, useEffect, useRef, useState } from "react";
import { refreshAccessToken } from "@/api";
import { MSG } from "@/lib/student-messages";
import { stripGreetSearchParam } from "@/lib/tutor-greeting";
import { connectVoiceEvents, type VoiceSock } from "@/services/voice/voiceEvents.service";
import { applyTranscriptEvent } from "@/lib/voice-transcript";
import type { RelatedTextbookImage } from "@/components/assistant-message-content";
import type { TranscriptLine, VoiceScope, VoiceState } from "@/types/voice";
import { requestMicrophone, stopStream } from "./useMicrophone";
import { useAudioPlayback } from "./useAudioPlayback";
import { packPcm, useVoiceActivity } from "./useVoiceActivity";

function floatToInt16(input: Float32Array): Int16Array {
  const out = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

function friendlyError(code: string): string {
  if (code === "denied") return MSG.micPermission;
  if (code === "missing") return MSG.micNotFound;
  if (code === "inuse") return MSG.micInUse;
  if (code === "unsupported") return MSG.speechUnsupported;
  return MSG.voiceError;
}

const bargeInEnabled = import.meta.env.VITE_VOICE_BARGE_IN !== "false";

export function useVoiceTutor(opts: { token: string; scope: VoiceScope | null; greet?: boolean }) {
  const [state, setState] = useState<VoiceState>("IDLE");
  const [error, setError] = useState("");
  const [hint, setHint] = useState("");
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [images, setImages] = useState<RelatedTextbookImage[]>([]);
  const [muted, setMuted] = useState(false);
  const [level, setLevel] = useState(0);
  const [sessionId, setSessionId] = useState("");
  const [audioReady, setAudioReady] = useState(false);
  const sockRef = useRef<VoiceSock | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const captureRef = useRef<AudioContext | null>(null);
  const sampleRateRef = useRef(16000);
  const mutedRef = useRef(false);
  const stateRef = useRef<VoiceState>("IDLE");
  const sessionIdRef = useRef("");
  const endedRef = useRef(false);
  const userEndedRef = useRef(false);
  const reconnectAttemptRef = useRef(0);
  const resumeOnOpenRef = useRef(false);
  const reconnectTimerRef = useRef(0);
  const connectTimerRef = useRef(0);
  const shouldGreetOnConnectRef = useRef(Boolean(opts.greet));
  const tokenRef = useRef(opts.token);
  const listenMuteUntilRef = useRef(0);

  const playback = useAudioPlayback();
  const vad = useVoiceActivity(setLevel);

  const markAudioReady = useCallback(() => {
    setAudioReady(true);
    if (
      !endedRef.current &&
      (stateRef.current === "LISTENING" || stateRef.current === "INTERRUPTED")
    ) {
      setHint("Speak now — pause about 1 second when you finish.");
    }
  }, []);

  const playPcm = useCallback(
    (buf: ArrayBuffer) => {
      markAudioReady();
      void playback.play(buf).catch(() => undefined);
    },
    [markAudioReady, playback],
  );

  stateRef.current = state;
  mutedRef.current = muted;
  tokenRef.current = opts.token;

  const pushFreshToken = useCallback(async (): Promise<string | null> => {
    const fresh = await refreshAccessToken();
    if (fresh) {
      tokenRef.current = fresh;
      const sid = sessionIdRef.current;
      if (sid && sockRef.current) {
        sockRef.current.send({ type: "token_update", sessionId: sid, token: fresh });
      }
    }
    return fresh;
  }, []);

  const clearTimers = useCallback(() => {
    if (connectTimerRef.current) window.clearTimeout(connectTimerRef.current);
    if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);
    connectTimerRef.current = 0;
    reconnectTimerRef.current = 0;
  }, []);

  const stopCapture = useCallback(() => {
    captureRef.current?.close().catch(() => undefined);
    captureRef.current = null;
    stopStream(streamRef.current);
    streamRef.current = null;
  }, []);

  const teardown = useCallback(() => {
    clearTimers();
    endedRef.current = true;
    sockRef.current?.close();
    sockRef.current = null;
    stopCapture();
    void playback.stop();
    setAudioReady(false);
  }, [clearTimers, playback, stopCapture]);

  const failConnect = useCallback(
    (message: string) => {
      setError(message);
      setState("ERROR");
      setHint("");
      teardown();
    },
    [teardown],
  );

  const startCapture = useCallback(
    async (stream: MediaStream) => {
      const ac = new AudioContext({ sampleRate: 16000 });
      captureRef.current = ac;
      sampleRateRef.current = ac.sampleRate;
      if (ac.state === "suspended") await ac.resume();
      void vad.warm();
      const src = ac.createMediaStreamSource(stream);
      const proc = ac.createScriptProcessor(4096, 1, 1);
      const mute = ac.createGain();
      mute.gain.value = 0;
      proc.onaudioprocess = (ev) => {
        if (mutedRef.current || endedRef.current) return;
        const f32 = ev.inputBuffer.getChannelData(0);
        const i16 = floatToInt16(f32);
        // Don't uplink mic while the tutor speaks — avoids echo re-STT. The VAD
        // still runs, because it is what detects barge-in; returning early here
        // (as this used to) made the barge-in check below dead code and left
        // the Interrupt button as the only way to cut the tutor off.
        // ponytail: leans on the browser's echoCancellation to keep the tutor's
        // own audio from tripping this. No echo guard like the old FastAPI
        // stack had — set VITE_VOICE_BARGE_IN=false if it self-interrupts.
        if (stateRef.current !== "SPEAKING" && Date.now() >= listenMuteUntilRef.current) {
          sockRef.current?.sendBinary(packPcm(i16, sampleRateRef.current, false));
        }
        void vad.push(i16).then((hits) => {
          if (!bargeInEnabled) return;
          if (hits.includes("start") && stateRef.current === "SPEAKING" && playback.playingRef.current) {
            playback.stop();
            sockRef.current?.send({ type: "interrupt", sessionId: sessionIdRef.current });
            setState("INTERRUPTED");
          }
        });
      };
      src.connect(proc);
      proc.connect(mute);
      mute.connect(ac.destination);
    },
    [playback, vad],
  );

  const handleEvent = useCallback(
    async (msg: Record<string, unknown>) => {
      const type = String(msg.type || "");
      if (type === "session_started") {
        setHint("Starting voice session…");
      }
      if (type === "session_ready") {
        clearTimers();
        reconnectAttemptRef.current = 0;
        const sid = String(msg.sessionId || "");
        sessionIdRef.current = sid;
        setSessionId(sid);
        setState("LISTENING");
        stateRef.current = "LISTENING";
        // Push a fresh bearer immediately so Nest's RAG token isn't already aged.
        void pushFreshToken();
        try {
          const stream = streamRef.current;
          if (!stream) {
            failConnect(MSG.micNotFound);
            return;
          }
          if (!captureRef.current) await startCapture(stream);
          else if (captureRef.current.state === "suspended") await captureRef.current.resume();
          await playback.unlock();
          markAudioReady();
        } catch (err) {
          const code = (err as { code?: string }).code || "error";
          failConnect(code === "denied" || code === "missing" || code === "inuse" || code === "unsupported"
            ? friendlyError(code)
            : "Could not start the microphone. Restart and try again.");
        }
        return;
      }
      if (type === "student_started_speaking") {
        // Last turn's figures belong to last turn's answer.
        setImages([]);
        setState("PROCESSING");
        setHint("Hearing you…");
        return;
      }
      if (type === "related_images") {
        setImages((msg.images as RelatedTextbookImage[] | undefined) ?? []);
        return;
      }
      if (type === "student_stopped_speaking") {
        setState("THINKING");
        setHint("Processing your speech…");
        return;
      }
      if (type === "turn_cancelled") {
        setTranscript((t) => applyTranscriptEvent(t, msg));
        // A cancelled turn may have left us in THINKING/SPEAKING with mic uplink blocked.
        if (
          stateRef.current === "THINKING" ||
          stateRef.current === "PROCESSING" ||
          stateRef.current === "SPEAKING"
        ) {
          void playback.stop();
          setState("LISTENING");
          stateRef.current = "LISTENING";
          setHint("Speak now — pause about 1 second when you finish.");
        }
        return;
      }
      if (type === "transcript") {
        setTranscript((t) => applyTranscriptEvent(t, msg));
        return;
      }
      if (type === "ai_started_processing") {
        setState("THINKING");
        setHint("Thinking…");
      }
      if (type === "ai_started_speaking") {
        playback.stop();
        setState("SPEAKING");
        setHint("Tutor is speaking — tap Interrupt to jump in.");
        void playback.unlock();
        markAudioReady();
      }
      if (type === "ai_stopped_speaking") {
        listenMuteUntilRef.current = Date.now() + 1000;
        setState("LISTENING");
        setHint("Speak now — pause about 1 second when you finish.");
      }
      if (type === "ai_interrupted") {
        listenMuteUntilRef.current = Date.now() + 800;
        void playback.stop();
        setState("INTERRUPTED");
        setHint("Speak now — pause about 1 second when you finish.");
      }
      if (type === "voice_error") {
        setError(String(msg.message || MSG.voiceError));
        setState("ERROR");
      }
      if (type === "token_expired") {
        // Nest waits briefly for token_update and retries RAG — refresh quietly.
        const fresh = await pushFreshToken();
        if (!fresh) {
          setError(String(msg.message || MSG.voiceError));
          setState("ERROR");
        } else {
          setError("");
          if (stateRef.current === "ERROR") setState("LISTENING");
        }
      }
      if (type === "session_ended") setState("ENDED");
    },
    [clearTimers, failConnect, markAudioReady, playback, pushFreshToken, startCapture],
  );

  const openSocketRef = useRef<() => void>(() => undefined);

  openSocketRef.current = () => {
    const token = tokenRef.current;
    if (!token || !opts.scope || endedRef.current) return;
    sockRef.current?.close();
    sockRef.current = connectVoiceEvents(
      token,
      (msg) => void handleEvent(msg),
      () => {
        if (userEndedRef.current || endedRef.current) return;
        const sid = sessionIdRef.current;
        if (!sid) {
          failConnect(MSG.voiceConnection);
          return;
        }
        if (reconnectAttemptRef.current >= 5) {
          failConnect(MSG.voiceConnection);
          return;
        }
        reconnectAttemptRef.current += 1;
        setState("CONNECTING");
        setHint("Connection lost — reconnecting…");
        reconnectTimerRef.current = window.setTimeout(() => {
          resumeOnOpenRef.current = true;
          openSocketRef.current();
        }, Math.min(1000 * reconnectAttemptRef.current, 5000));
      },
      () => {
        if (resumeOnOpenRef.current && sessionIdRef.current) {
          sockRef.current?.send({
            type: "session_resume",
            token: tokenRef.current,
            sessionId: sessionIdRef.current,
          });
          resumeOnOpenRef.current = false;
          return;
        }
        const sendGreet = shouldGreetOnConnectRef.current;
        if (sendGreet) {
          shouldGreetOnConnectRef.current = false;
          stripGreetSearchParam();
        }
        sockRef.current?.send({
          type: "session_start",
          token: tokenRef.current,
          greet: sendGreet ? "1" : "0",
          board: opts.scope?.board,
          classLevel: opts.scope?.classLevel,
          subject: opts.scope?.subject,
          chapterIds: opts.scope?.chapterIds,
          chapterNames: opts.scope?.chapterNames,
        });
      },
      () => {
        if (endedRef.current || userEndedRef.current) return;
        if (sessionIdRef.current && reconnectAttemptRef.current < 5) return;
        failConnect(MSG.voiceConnection);
      },
      playPcm,
    );
  };

  const start = useCallback(async () => {
    if (!opts.token || !opts.scope) return;
    sockRef.current?.close();
    sockRef.current = null;
    setError("");
    setHint("");
    setTranscript([]);
    setImages([]);
    setAudioReady(false);
    endedRef.current = false;
    userEndedRef.current = false;
    reconnectAttemptRef.current = 0;
    resumeOnOpenRef.current = false;
    sessionIdRef.current = "";
    clearTimers();
    try {
      await playback.unlock();
      setHint("Allow microphone access…");
      const stream = await requestMicrophone();
      streamRef.current = stream;
    } catch (err) {
      const code = (err as { code?: string }).code || "error";
      setError(friendlyError(code));
      setState("ERROR");
      return;
    }
    setState("CONNECTING");
    setHint("Connecting to voice server…");
    connectTimerRef.current = window.setTimeout(() => {
      if (endedRef.current || sessionIdRef.current) return;
      failConnect("Voice server didn't respond. Run Voice/backend on port 8080 (npm run start:dev).");
    }, 20000);
    openSocketRef.current();
  }, [clearTimers, failConnect, opts.scope, opts.token, playback]);

  // Keep Nest's RAG bearer fresh. Do NOT depend on `state` — every turn
  // (LISTENING→THINKING→SPEAKING) used to reset this timer so it never fired
  // during an active call, and the student heard "session expired" at ~15m.
  // Access JWT TTL is 15m; refresh at half TTL.
  useEffect(() => {
    if (!sessionId) return;
    const id = window.setInterval(() => {
      if (endedRef.current || stateRef.current === "ENDED" || stateRef.current === "ERROR") return;
      void pushFreshToken();
    }, 7 * 60 * 1000);
    return () => window.clearInterval(id);
  }, [pushFreshToken, sessionId]);

  const interrupt = useCallback(() => {
    void playback.stop();
    sockRef.current?.send({ type: "interrupt", sessionId });
    setState("LISTENING");
    setHint("Speak now — pause about 1 second when you finish.");
  }, [playback, sessionId]);

  const end = useCallback(() => {
    userEndedRef.current = true;
    sockRef.current?.send({ type: "session_end", sessionId });
    teardown();
    setState("ENDED");
    setHint("");
  }, [sessionId, teardown]);

  const sendText = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed || !sessionIdRef.current || endedRef.current) return;
    setImages([]);
    sockRef.current?.send({ type: "text", sessionId: sessionIdRef.current, text: trimmed });
  }, []);

  useEffect(() => {
    if (state !== "LISTENING" && state !== "INTERRUPTED") return;
    if (muted) {
      setHint("Mic muted — unmute to talk.");
      return;
    }
    if (!audioReady) return;
    if (level >= 0.02) setHint("Mic is picking you up — pause ~1s when done.");
  }, [audioReady, level, muted, state]);

  const teardownRef = useRef(teardown);
  teardownRef.current = teardown;

  useEffect(() => () => teardownRef.current(), []);

  return {
    state,
    error,
    hint,
    transcript,
    images,
    muted,
    setMuted,
    level,
    audioReady,
    start,
    interrupt,
    end,
    sendText,
  };
}
