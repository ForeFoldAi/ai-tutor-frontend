import { useCallback, useRef } from "react";
import { unpackPcm } from "./useVoiceActivity";

export function useAudioPlayback() {
  const ctxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const nextRef = useRef(0);
  const playingRef = useRef(false);
  const liveRef = useRef<AudioBufferSourceNode[]>([]);

  const ensureCtx = useCallback(async () => {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
      gainRef.current = ctxRef.current.createGain();
      gainRef.current.connect(ctxRef.current.destination);
    }
    if (ctxRef.current.state === "suspended") await ctxRef.current.resume();
    gainRef.current!.gain.value = 1;
    return ctxRef.current;
  }, []);

  const play = useCallback(
    async (buf: ArrayBuffer) => {
      const { samples, sampleRate, end } = unpackPcm(buf);
      if (end) {
        playingRef.current = false;
        return;
      }
      if (!samples.length) return;
      const ac = await ensureCtx();
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
      playingRef.current = true;
      liveRef.current.push(src);
      src.onended = () => {
        liveRef.current = liveRef.current.filter((s) => s !== src);
      };
    },
    [ensureCtx],
  );

  // Muting the gain was not enough: sources scheduled ahead of the interrupt
  // kept running, and the next play() restored gain to 1 — so the interrupted
  // answer became audible again, overlapping the new one. Stop the nodes.
  const stop = useCallback(() => {
    playingRef.current = false;
    nextRef.current = 0;
    for (const src of liveRef.current) {
      try {
        src.stop();
      } catch {
        /* already ended */
      }
    }
    liveRef.current = [];
  }, []);

  return { play, stop, unlock: ensureCtx, playingRef };
};
