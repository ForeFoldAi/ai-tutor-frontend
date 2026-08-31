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
  const qRef = useRef(Promise.resolve());

  const session = () => (vadRef.current ??= new SileroVad(280));

  const warm = useCallback(() => session().ready(), []);

  const push = useCallback(
    (samples: Int16Array, now = Date.now()): Promise<VadEvent[]> => {
      let sum = 0;
      for (let i = 0; i < samples.length; i++) {
        const x = samples[i] / 32768;
        sum += x * x;
      }
      onLevel?.(Math.sqrt(sum / Math.max(1, samples.length)));
      const next = qRef.current.then(() => session().push(samples, now));
      qRef.current = next.then(
        () => undefined,
        () => undefined,
      );
      return next.catch(() => ["silence"] as VadEvent[]);
    },
    [onLevel],
  );

  const reset = useCallback(() => {
    vadRef.current?.reset();
  }, []);

  return { push, reset, warm };
}
