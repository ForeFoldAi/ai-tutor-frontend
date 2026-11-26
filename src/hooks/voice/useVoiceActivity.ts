import { useCallback, useRef } from "react";
import { SileroVad, type VadEvent } from "./sileroVad";

export function packPcm(samples: Int16Array, sampleRate = 16000, end = false): ArrayBuffer {
  const buf = new ArrayBuffer(8 + samples.byteLength);
  const view = new DataView(buf);
  view.setUint32(0, sampleRate, true);
  view.setUint8(4, end ? 1 : 0);
  new Int16Array(buf, 8).set(samples);
  return buf;
}

export function unpackPcm(buf: ArrayBuffer): { samples: Int16Array; sampleRate: number; end: boolean } {
  const view = new DataView(buf);
  const sampleRate = view.getUint32(0, true);
  const end = (view.getUint8(4) & 1) === 1;
  const samples = new Int16Array(buf, 8);
  return { samples, sampleRate, end };
}

export function useVoiceActivity(onLevel?: (rms: number) => void) {
  const vadRef = useRef<SileroVad | null>(null);
  const pendingRef = useRef<Int16Array | null>(null);
  const busyRef = useRef(false);
  const epochRef = useRef(0);

  const session = () => (vadRef.current ??= new SileroVad(280));

  const warm = useCallback(() => session().ready().catch(() => undefined), []);

  const push = useCallback(
    (samples: Int16Array): Promise<VadEvent[] | null> => {
      let sum = 0;
      for (let i = 0; i < samples.length; i++) {
        const x = samples[i] / 32768;
        sum += x * x;
      }
      onLevel?.(Math.sqrt(sum / Math.max(1, samples.length)));
      // One inference at a time. A backlog here is why barge-in dies on a long
      // call: the speech check runs minutes after the student actually spoke.
      // null means this frame was superseded by a newer one.
      pendingRef.current = samples;
      if (busyRef.current) return Promise.resolve(null);
      busyRef.current = true;
      const epoch = epochRef.current;
      const drain = async (): Promise<VadEvent[] | null> => {
        let last: VadEvent[] | null = ["silence"];
        while (epoch === epochRef.current) {
          const frame = pendingRef.current;
          if (!frame) break;
          pendingRef.current = null;
          try {
            last = await session().push(frame, Date.now());
          } catch {
            last = ["silence"];
          }
        }
        busyRef.current = false;
        if (pendingRef.current && epoch === epochRef.current) {
          busyRef.current = true;
          return drain();
        }
        return epoch === epochRef.current ? last : null;
      };
      return drain();
    },
    [onLevel],
  );

  const reset = useCallback(() => {
    pendingRef.current = null;
    epochRef.current += 1;
    vadRef.current?.reset();
  }, []);

  const voicedMs = useCallback(() => vadRef.current?.voicedMs ?? 0, []);
  const available = useCallback(() => vadRef.current?.available ?? false, []);
  const busy = useCallback(() => busyRef.current, []);

  return { push, reset, warm, voicedMs, available, busy };
}
