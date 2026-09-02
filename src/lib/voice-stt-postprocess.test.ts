import assert from "node:assert/strict";
import { isMeaningfulVoiceTranscript, isWhisperHallucination } from "./voice-stt-postprocess.ts";

for (const junk of ["[BLANK_AUDIO]", "(clear throat)", "(music)"]) {
  assert.equal(isWhisperHallucination(junk), true, junk);
  assert.equal(isMeaningfulVoiceTranscript(junk), false, junk);
}
for (const junk of ["()", "[]"]) {
  assert.equal(isMeaningfulVoiceTranscript(junk), false, junk);
}

assert.equal(isMeaningfulVoiceTranscript("what is weather"), true);
assert.equal(isMeaningfulVoiceTranscript("yes"), true);
assert.equal(isMeaningfulVoiceTranscript("you"), false);

console.log("voice-stt-postprocess.test.ts ok");
