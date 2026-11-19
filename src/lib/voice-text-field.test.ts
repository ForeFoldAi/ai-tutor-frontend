/**
 * Run: npx tsx src/lib/voice-text-field.test.ts
 */
import assert from "node:assert/strict";
import { combineVoiceTextField, liveSpeechInterim } from "./voice-text-field.ts";

assert.equal(liveSpeechInterim(""), "");
assert.equal(liveSpeechInterim("Listening…"), "");
assert.equal(liveSpeechInterim("Listening..."), "");
assert.equal(liveSpeechInterim("  listening.  "), "");
assert.equal(liveSpeechInterim("what is gravity"), "what is gravity");

assert.equal(combineVoiceTextField("", "Listening…"), "");
assert.equal(combineVoiceTextField("hello", "Listening…"), "hello");
assert.equal(combineVoiceTextField("hello", "world"), "hello world");
assert.equal(combineVoiceTextField("", "what is gravity"), "what is gravity");
assert.equal(combineVoiceTextField("  hi  ", "  there  "), "hi there");

console.log("voice-text-field tests passed");
