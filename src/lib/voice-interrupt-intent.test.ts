/**
 * Run: npx tsx src/lib/voice-interrupt-intent.test.ts
 */
import assert from "node:assert/strict";
import { detectInterruptIntent } from "./voice-interrupt-intent.ts";

for (const phrase of [
  "stop",
  "wait",
  "hold on",
  "one second",
  "excuse me",
  "I have a doubt",
  "hey",
  "hi",
  "hello",
]) {
  assert.equal(detectInterruptIntent(phrase).isInterruptIntent, true, phrase);
}

assert.equal(detectInterruptIntent("photosynthesis is green").isInterruptIntent, false);
assert.equal(
  detectInterruptIntent("hey tutor", { wakeWordEnabled: true }).kind,
  "wake",
);

console.log("voice-interrupt-intent.test: ok");
