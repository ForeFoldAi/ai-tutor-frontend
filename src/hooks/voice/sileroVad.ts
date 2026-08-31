const WINDOW = 512;
const STATE_LEN = 2 * 1 * 128;
const START_P = 0.5;
const END_P = 0.35;
const SR = 16000;
const MODEL_ID = "onnx-community/silero-vad";

export type VadEvent = "start" | "stop" | "speech" | "silence";
type Infer = (frame: Float32Array, state: Float32Array) => Promise<{ p: number; state: Float32Array }>;

let loaded: Promise<Infer> | null = null;

async function loadSilero(): Promise<Infer> {
  if (!loaded) {
    loaded = (async () => {
      const { AutoModel, Tensor, env } = await import("@huggingface/transformers");
      env.allowLocalModels = false;
      const model = await AutoModel.from_pretrained(MODEL_ID, {
        config: { model_type: "custom" } as never,
        dtype: "fp32",
      });
      const sr = new Tensor("int64", BigInt64Array.from([BigInt(SR)]), []);
      return async (frame, state) => {
        const input = new Tensor("float32", frame, [1, frame.length]);
        const st = new Tensor("float32", state, [2, 1, 128]);
        const out = await model({ input, state: st, sr });
        const p = Number(out.output.data[0]);
        const next = new Float32Array(STATE_LEN);
        next.set(out.stateN.data as ArrayLike<number>);
        input.dispose();
        st.dispose();
        out.output.dispose();
        out.stateN.dispose();
        return { p, state: next };
      };
    })();
  }
  return loaded;
}

export class SileroVad {
  private leftover = new Float32Array(0);
  private state = new Float32Array(STATE_LEN);
  private speaking = false;
  private lastVoiceAt = 0;
  private infer: Infer | null = null;

  constructor(private readonly hangMs = 280) {}

  async ready(): Promise<void> {
    this.infer = await loadSilero();
  }

  async push(samples: Int16Array, now = Date.now()): Promise<VadEvent[]> {
    if (!this.infer) this.infer = await loadSilero();
    const f32 = new Float32Array(samples.length);
    for (let i = 0; i < samples.length; i++) f32[i] = samples[i] / 32768;
    const merged = new Float32Array(this.leftover.length + f32.length);
    merged.set(this.leftover);
    merged.set(f32, this.leftover.length);
    const events: VadEvent[] = [];
    let o = 0;
    while (o + WINDOW <= merged.length) {
      const frame = merged.subarray(o, o + WINDOW);
      const { p, state } = await this.infer(frame, this.state);
      this.state = new Float32Array(state);
      events.push(this.step(p, now));
      o += WINDOW;
    }
    this.leftover = new Float32Array(merged.length - o);
    this.leftover.set(merged.subarray(o));
    if (!events.length) return [this.speaking ? "speech" : "silence"];
    return events;
  }

  reset(): void {
    this.leftover = new Float32Array(0);
    this.state = new Float32Array(STATE_LEN);
    this.speaking = false;
    this.lastVoiceAt = 0;
  }

  private step(p: number, now: number): VadEvent {
    if (p >= START_P) {
      const started = !this.speaking;
      this.speaking = true;
      this.lastVoiceAt = now;
      return started ? "start" : "speech";
    }
    if (this.speaking) {
      if (p >= END_P) this.lastVoiceAt = now;
      if (now - this.lastVoiceAt >= this.hangMs) {
        this.speaking = false;
        return "stop";
      }
      return "speech";
    }
    return "silence";
  }
}
