/**
 * Run: npx tsx src/lib/voice-server-stt.test.ts
 */
import assert from "node:assert/strict";
import {
  audioFileName,
  isMobileVoiceClient,
  mediaRecorderNeedsStopFlush,
  shouldUseWhisperListen,
} from "./voice-server-stt.ts";

assert.equal(shouldUseWhisperListen(false, { mobile: true }), false);
assert.equal(shouldUseWhisperListen(true, {}), false);
assert.equal(shouldUseWhisperListen(true, { envPrimary: true }), true);
assert.equal(shouldUseWhisperListen(true, { mobile: true }), true);
assert.equal(shouldUseWhisperListen(true, { recognitionAvailable: false }), true);
assert.equal(shouldUseWhisperListen(true, { recognitionAvailable: true }), false);

assert.equal(isMobileVoiceClient("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)", 5), true);
assert.equal(isMobileVoiceClient("Mozilla/5.0 (Linux; Android 14) Chrome/120", 1), true);
assert.equal(isMobileVoiceClient("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", 0), false);
assert.equal(isMobileVoiceClient("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", 5), true);

assert.equal(mediaRecorderNeedsStopFlush("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)", 5), true);
assert.equal(mediaRecorderNeedsStopFlush("Mozilla/5.0 (Linux; Android 14) Chrome/120", 1), false);
assert.equal(mediaRecorderNeedsStopFlush("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", 0), false);

assert.equal(audioFileName("audio/webm;codecs=opus"), "utterance.webm");
assert.equal(audioFileName("audio/mp4"), "utterance.mp4");
assert.equal(audioFileName("audio/mp4;codecs=mp4a.40.2"), "utterance.mp4");
assert.equal(audioFileName("audio/ogg;codecs=opus"), "utterance.ogg");

console.log("voice-server-stt tests passed");
