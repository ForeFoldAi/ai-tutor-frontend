/**
 * Run: npx tsx src/lib/voice-echo-guard.test.ts
 */
import assert from "node:assert/strict";
import {
  appendAiSpeechTail,
  evaluateIncomingTranscript,
  normalizeSttForEcho,
  textSimilarity,
  transcriptEchoesAiSpeech,
} from "./voice-echo-guard.ts";

assert.equal(normalizeSttForEcho("Hello, World!"), "hello world");
assert.equal(normalizeSttForEcho("Um, like, Photosynthesis!"), "photosynthesis");

const tutor =
  "Photosynthesis is the process plants use to make food from sunlight and carbon dioxide";
assert.ok(
  transcriptEchoesAiSpeech(
    "photosynthesis is the process plants use to make food",
    tutor,
  ),
);

assert.ok(!transcriptEchoesAiSpeech("what is mitochondria", tutor));

assert.equal(
  evaluateIncomingTranscript("photosynthesis is the process plants use", tutor).verdict,
  "echo_rejected",
);
assert.equal(evaluateIncomingTranscript("what is gravity", tutor).verdict, "accepted");
assert.equal(evaluateIncomingTranscript("a", tutor).verdict, "discarded");

const tail = appendAiSpeechTail("x".repeat(480), "hello world");
assert.ok(tail.length <= 500);
assert.ok(tail.endsWith("hello world"));

assert.ok(textSimilarity("gravity pulls objects", "gravity pulls objects together") > 0.7);
assert.ok(textSimilarity("what is gravity", "photosynthesis is green") < 0.3);

console.log("voice-echo-guard.test: ok");
