import { useCallback, useRef } from "react";
import { unpackPcm } from "./useVoiceActivity";

export function useAudioPlayback() {
  const ctxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const nextRef = useRef(0);
  /** Wall-clock time the last scheduled sample leaves the speaker. */
  const endsAtRef = useRef(0);
  const liveRef = useRef<AudioBufferSourceNode[]>([]);

  // Muting the gain was not enough: sources scheduled ahead of the interrupt
  // kept running, and the next play() restored gain to 1 — so the interrupted
  // answer became audible again, overlapping the new one. Stop the nodes.
  const stop = useCallback(() => {
    nextRef.current = 0;
    endsAtRef.current = 0;
    for (const src of liveRef.current) {
      try {
        src.stop();
      } catch {
        /* already ended */
      }
    }
    liveRef.current = [];
  }, []);

  const ensureCtx = useCallback(() => {
    if (!ctxRef.current) {
      const ac = new AudioContext();
      ctxRef.current = ac;
      gainRef.current = ac.createGain();
      gainRef.current.connect(ac.destination);
      // Desktop Chrome suspends output when the device changes (Bluetooth headset
      // switching to call mode, monitor sleep). Its clock freezes, queued audio never
      // ends, and resume() is held until the next click — so drop the queue rather
      // than leave the mic gated on audio nobody can hear.
      ac.addEventListener("statechange", () => {
        if (ac.state === "running") return;
        if (liveRef.current.length) stop();
        void ac.resume().catch(() => undefined);
      });
    }
    gainRef.current!.gain.value = 1;
    return ctxRef.current;
  }, [stop]);

  /** Awaitable unlock for user-gesture call sites; never blocks on a held resume(). */
  const unlock = useCallback(async () => {
    const ac = ensureCtx();
    if (ac.state !== "running") {
      await Promise.race([
        ac.resume().catch(() => undefined),
        new Promise((r) => window.setTimeout(r, 500)),
      ]);
    }
    return ac;
  }, [ensureCtx]);

  /**
   * Scheduled tutor audio still to come out of the speaker. The server's end
   * marker and ai_stopped_speaking arrive when the last chunk is *sent*, which
   * with streaming TTS is seconds before it finishes *playing*. Wall clock, not
   * ac.currentTime: a suspended context's clock stops and would read "playing" forever.
   */
  const remainingMs = useCallback((): number => {
    if (!liveRef.current.length) return 0;
    return Math.max(0, endsAtRef.current - Date.now());
  }, []);

  const isPlaying = useCallback(() => remainingMs() > 0, [remainingMs]);

  const play = useCallback(
    async (buf: ArrayBuffer) => {
      const { samples, sampleRate, end } = unpackPcm(buf);
      if (end) return;
      if (!samples.length) return;
      const ac = ensureCtx();
      if (ac.state !== "running") {
        // Scheduling into a stopped clock would play stale audio after the next click.
        void ac.resume().catch(() => undefined);
        return;
      }
      const gain = gainRef.current!;
      const audio = ac.createBuffer(1, samples.length, sampleRate || 16000);
      const ch = audio.getChannelData(0);
      for (let i = 0; i < samples.length; i++) ch[i] = samples[i] / 32768;
      const src = ac.createBufferSource();
      src.buffer = audio;
      src.connect(gain);
      const startAt = Math.max(ac.currentTime, nextRef.current);
      src.start(startAt);
      nextRef.current = startAt + audio.duration;
      endsAtRef.current = Date.now() + (nextRef.current - ac.currentTime) * 1000;
      liveRef.current.push(src);
      src.onended = () => {
        liveRef.current = liveRef.current.filter((s) => s !== src);
      };
    },
    [ensureCtx],
  );

  /** Resume after a gesture / tab focus; harmless when already running. */
  const resume = useCallback(() => {
    const ac = ctxRef.current;
    if (ac && ac.state !== "running") void ac.resume().catch(() => undefined);
  }, []);

  return { play, stop, unlock, resume, isPlaying, remainingMs };
};
