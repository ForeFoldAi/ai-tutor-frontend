/**
 * Lightweight interrupt / wake intent (mirrors backend voice_interrupt_intent).
 */

export const INTERRUPT_PHRASES = [
  "stop",
  "wait",
  "hold on",
  "one second",
  "excuse me",
  "i have a doubt",
  "i have doubt",
  "hey",
  "hi",
  "hello",
] as const;

export type InterruptIntentResult = {
  isInterruptIntent: boolean;
  matchedPhrase: string | null;
  kind: "interrupt" | "wake" | null;
  confidence: number;
};

function normalize(text: string): string {
  return (text || "")
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function detectInterruptIntent(
  transcript: string,
  opts?: { wakeWordEnabled?: boolean; wakeWords?: string[] },
): InterruptIntentResult {
  const norm = normalize(transcript);
  if (!norm) {
    return { isInterruptIntent: false, matchedPhrase: null, kind: null, confidence: 0 };
  }

  if (opts?.wakeWordEnabled) {
    const words = opts.wakeWords?.length ? opts.wakeWords : ["hey tutor", "teacher"];
    for (const phrase of [...words].sort((a, b) => b.length - a.length)) {
      const p = normalize(phrase);
      if (!p) continue;
      if (norm === p || norm.startsWith(`${p} `) || ` ${norm} `.includes(` ${p} `)) {
        return {
          isInterruptIntent: true,
          matchedPhrase: p,
          kind: "wake",
          confidence: 0.9,
        };
      }
    }
  }

  for (const phrase of [...INTERRUPT_PHRASES].sort((a, b) => b.length - a.length)) {
    if (norm === phrase || norm.startsWith(`${phrase} `) || ` ${norm} `.includes(` ${phrase} `)) {
      if (norm === phrase || norm.split(" ").length <= 6 || norm.startsWith(phrase)) {
        return {
          isInterruptIntent: true,
          matchedPhrase: phrase,
          kind: "interrupt",
          confidence: norm === phrase ? 0.95 : 0.85,
        };
      }
    }
  }

  return { isInterruptIntent: false, matchedPhrase: null, kind: null, confidence: 0 };
}
