/**
 * Run: npx tsx src/lib/voice-turn-guard.test.ts
 */
import assert from "node:assert/strict";
import { isInFlightVoiceTurn, shouldIgnoreLateInterruptAck } from "./voice-turn-guard.ts";

assert.equal(isInFlightVoiceTurn("thinking", 3, 3), true);
assert.equal(isInFlightVoiceTurn("speaking", 3, 3), true);
assert.equal(isInFlightVoiceTurn("listening", 3, 3), false);
assert.equal(isInFlightVoiceTurn("thinking", 4, 3), false);
assert.equal(isInFlightVoiceTurn("speaking", 2, 3), false);

assert.equal(shouldIgnoreLateInterruptAck(3, 3), true);
assert.equal(shouldIgnoreLateInterruptAck(4, 3), false);

console.log("voice-turn-guard tests passed");
