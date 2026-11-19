/**
 * Run: npx tsx src/lib/voice-barge-eligibility.test.ts
 */
import assert from "node:assert/strict";
import { canAutoBargeIn } from "./voice-barge-eligibility.ts";

assert.equal(
  canAutoBargeIn({ bargeInEnabled: true, state: "SPEAKING", remainingMs: 0 }),
  true,
  "SPEAKING with empty playback queue must still be bargeable",
);
assert.equal(
  canAutoBargeIn({ bargeInEnabled: true, state: "LISTENING", remainingMs: 200 }),
  true,
);
assert.equal(
  canAutoBargeIn({ bargeInEnabled: true, state: "THINKING", remainingMs: 0 }),
  false,
);
assert.equal(
  canAutoBargeIn({ bargeInEnabled: false, state: "SPEAKING", remainingMs: 0 }),
  false,
);

console.log("voice-barge-eligibility tests passed");
