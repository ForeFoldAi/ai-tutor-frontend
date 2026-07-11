/** ponytail: run with `npx tsx src/lib/voice-audio-config.check.ts` */
import {
  AUDIO_MIN_BUFFER_BYTES,
  AUDIO_MSE_TRIM_BEHIND_SEC,
  AUDIO_PLAYBACK_END_TOLERANCE_SEC,
} from "./voice-audio-config";

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

assert(AUDIO_MIN_BUFFER_BYTES > 0, "min buffer");
assert(AUDIO_MSE_TRIM_BEHIND_SEC > 0, "mse trim");
assert(AUDIO_PLAYBACK_END_TOLERANCE_SEC > 0, "end tolerance");

console.log("voice-audio-config.check: ok");
