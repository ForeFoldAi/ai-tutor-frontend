/**
 * Reject browser STT transcripts that repeat the tutor's recent speech (speaker bleed).
 */

import { ECHO_SIMILARITY_THRESHOLD, AI_SPEECH_TAIL_MAX_CHARS } from "./voice-conversation-config.ts";

export { AI_SPEECH_TAIL_MAX_CHARS };

const FILLER_WORDS = [
  "um",
  "uh",
  "uhh",
  "umm",
  "like",
  "you know",
  "i mean",
  "so",
  "well",
  "actually",
  "basically",
  "right",
  "okay",
  "ok",
  "yeah",
  "yes",
  "hmm",
  "ah",
  "oh",
];

/** Longest fillers first so "you know" matches before "you". */
const FILLER_PATTERN = new RegExp(
  `\\b(${[...FILLER_WORDS].sort((a, b) => b.length - a.length).join("|")})\\b`,
  "gi",
);

export type TranscriptVerdict = "accepted" | "discarded" | "echo_rejected";

/** Lowercase, strip punctuation, drop fillers — for echo comparison only. */
export function normalizeSttForEcho(text: string): string {
  let t = (text || "").toLowerCase();
  t = t.replace(/[^\w\s]/g, " ");
  t = t.replace(FILLER_PATTERN, " ");
  return t.replace(/\s+/g, " ").trim();
}

/** Word-overlap similarity in [0, 1] against recent tutor speech. */
export function textSimilarity(transcript: string, recentAiSpeech: string): number {
  const u = normalizeSttForEcho(transcript);
  const a = normalizeSttForEcho(recentAiSpeech);
  if (!u || !a || u.length < 3) return 0;

  if (a.includes(u)) return 1;
  const probe = a.slice(0, Math.min(120, a.length));
  if (u.includes(probe) && probe.length >= 12) return 1;

  const uWords = u.split(" ").filter((w) => w.length > 2);
  if (uWords.length === 0) return 0;
  // ponytail: brief questions ("what is weather") share topic words with the tutor;
  // scattered overlap is not speaker echo — only verbatim substring counts.
  if (uWords.length <= 4) return 0;
  const aWords = new Set(a.split(" ").filter((w) => w.length > 2));
  let overlap = 0;
  for (const w of uWords) {
    if (aWords.has(w)) overlap += 1;
  }
  return overlap / uWords.length;
}

export function appendAiSpeechTail(
  current: string,
  addition: string,
  maxChars = AI_SPEECH_TAIL_MAX_CHARS,
): string {
  return (current + (addition || "")).slice(-maxChars);
}

export function transcriptEchoesAiSpeech(
  transcript: string,
  recentAiSpeech: string,
  threshold = ECHO_SIMILARITY_THRESHOLD,
): boolean {
  if (!transcript.trim() || !recentAiSpeech.trim()) return false;
  return textSimilarity(transcript, recentAiSpeech) > threshold;
}

export function evaluateIncomingTranscript(
  transcript: string,
  recentAiSpeech: string,
  threshold = ECHO_SIMILARITY_THRESHOLD,
): { verdict: TranscriptVerdict; similarity: number } {
  const trimmed = (transcript || "").trim();
  if (!trimmed || trimmed.length < 2) {
    return { verdict: "discarded", similarity: 0 };
  }
  const similarity = textSimilarity(trimmed, recentAiSpeech);
  if (recentAiSpeech.trim() && similarity > threshold) {
    return { verdict: "echo_rejected", similarity };
  }
  return { verdict: "accepted", similarity };
}

export function logSttVerdict(
  verdict: TranscriptVerdict,
  transcript: string,
  extra?: Record<string, unknown>,
): void {
  const tag =
    verdict === "echo_rejected"
      ? "[ECHO_REJECTED]"
      : verdict === "accepted"
        ? "[TRANSCRIPT_ACCEPTED]"
        : "[TRANSCRIPT_DISCARDED]";
  console.debug(tag, {
    text: trimmedPreview(transcript),
    ...extra,
  });
}

function trimmedPreview(text: string, max = 96): string {
  const t = text.trim();
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

/** @deprecated Use transcriptEchoesAiSpeech — kept for server STT call sites. */
export function transcriptLikelyEcho(userText: string, assistantText: string): boolean {
  return transcriptEchoesAiSpeech(userText, assistantText);
}
