// Self-host the onnxruntime-web files the browser speech detector (Silero VAD) loads.
// transformers.js otherwise fetches them from cdn.jsdelivr.net at runtime, which school
// and office networks block — and a failed load silently disables voice barge-in.
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(root, "package.json"));
const dist = dirname(require.resolve("@huggingface/transformers"));
const out = join(root, "public/vad/ort");

mkdirSync(out, { recursive: true });
for (const f of ["ort-wasm-simd-threaded.jsep.mjs", "ort-wasm-simd-threaded.jsep.wasm"]) {
  copyFileSync(join(dist, f), join(out, f));
}
console.log(`[copy-vad-assets] onnxruntime wasm -> ${out}`);
