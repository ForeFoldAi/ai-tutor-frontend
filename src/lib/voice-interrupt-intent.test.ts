/**
 * Run: npx tsx src/lib/voice-interrupt-intent.test.ts
 */
import assert from "node:assert/strict";
import { detectInterruptIntent, stripConversationalLeadIn, stripInterruptLeadIn } from "./voice-interrupt-intent.ts";

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

assert.equal(stripInterruptLeadIn("wait what is weather"), "what is weather");
assert.equal(stripInterruptLeadIn("stop tell me about cells"), "tell me about cells");
assert.equal(stripInterruptLeadIn("wait"), "");
assert.equal(
  stripConversationalLeadIn("okay, can you tell me about weather?"),
  "can you tell me about weather?",
);
assert.equal(
  stripConversationalLeadIn("okay can you tell me about weather"),
  "can you tell me about weather",
);

console.log("voice-interrupt-intent.test: ok");
