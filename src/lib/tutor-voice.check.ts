/** ponytail: run with `npx tsx src/lib/tutor-voice.check.ts` */
import assert from "node:assert/strict";
import {
  TUTOR_VOICE_FEMALE,
  TUTOR_VOICE_MALE,
  tutorVoiceId,
} from "./tutor-voice.ts";

assert.equal(tutorVoiceId("female"), TUTOR_VOICE_FEMALE);
assert.equal(tutorVoiceId("male"), TUTOR_VOICE_MALE);
assert.equal(TUTOR_VOICE_FEMALE, "en-IN-NeerjaNeural");
assert.equal(TUTOR_VOICE_MALE, "en-IN-PrabhatNeural");
console.log("tutor-voice.check: ok");
