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

/** Drop leading "wait/stop/…" so barge STT keeps the actual question. */
export function stripInterruptLeadIn(transcript: string): string {
  let t = (transcript || "").trim();
  if (!t) return "";
  for (let pass = 0; pass < 4; pass++) {
    const norm = normalize(t);
    let stripped = false;
    for (const phrase of [...INTERRUPT_PHRASES].sort((a, b) => b.length - a.length)) {
      if (norm === phrase) return "";
      if (norm.startsWith(`${phrase} `)) {
        t = t.slice(t.toLowerCase().indexOf(phrase) + phrase.length).trim();
        stripped = true;
        break;
      }
    }
    if (!stripped) break;
  }
  return t.replace(/^[,.\s-]+/, "").trim();
}

const CONVERSATIONAL_LEAD_INS = [
  "all right",
  "alright",
  "okay",
  "ok",
  "yeah",
  "yes",
  "well",
  "so",
  "um",
  "uh",
] as const;

/** Strip polite openers ("okay, …") without removing the question. */
export function stripConversationalLeadIn(transcript: string): string {
  let t = stripInterruptLeadIn(transcript);
  if (!t) return "";
  for (let pass = 0; pass < 4; pass++) {
    const norm = normalize(t);
    let stripped = false;
    for (const phrase of [...CONVERSATIONAL_LEAD_INS].sort((a, b) => b.length - a.length)) {
      if (norm === phrase) return "";
      if (norm.startsWith(`${phrase} `) || norm.startsWith(`${phrase},`)) {
        const idx = t.toLowerCase().indexOf(phrase);
        t = t.slice(idx + phrase.length).trim();
        stripped = true;
        break;
      }
    }
    if (!stripped) break;
  }
  return t.replace(/^[,.\s-]+/, "").trim();
}

/** True when the student is asking something (not just "wait"/"stop"). */
export function looksLikeStudentQuestion(text: string): boolean {
  const norm = normalize(text);
  if (!norm || norm.length < 8) return false;
  if (/\?/.test(text)) return true;
  if (
    /\b(what|why|how|when|where|who|which|tell me|explain|describe|can you|could you|would you)\b/.test(
      norm,
    )
  ) {
    return true;
  }
  return norm.split(/\s+/).length >= 6;
}
