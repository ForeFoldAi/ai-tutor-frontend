/**
 * Normalize browser speech recognition output for tutoring (math/science terms).
 */
const PHRASE_FIXES: Array<[RegExp, string]> = [
  [/\bphoto\s+synthesis\b/gi, "photosynthesis"],
  [/\bphoto\s+synesis\b/gi, "photosynthesis"],
  [/\bchloro\s+plast(s)?\b/gi, "chloroplast$1"],
  [/\bmulti\s+plication\b/gi, "multiplication"],
  [/\bmultiply\s+cation\b/gi, "multiplication"],
  [/\bex\s+squared\b/gi, "x squared"],
  [/\bwhy\s+squared\b/gi, "y squared"],
  [/\bmito\s+chondria\b/gi, "mitochondria"],
];

const WORD_FIXES: Record<string, string> = {
  photosynthisis: "photosynthesis",
  photosynthsis: "photosynthesis",
  cloroplast: "chloroplast",
  multipication: "multiplication",
  eqation: "equation",
  denomenator: "denominator",
  numirator: "numerator",
  mitocondria: "mitochondria",
};

const WHISPER_JUNK_PHRASES = new Set([
  "blank audio",
  "blank_audio",
  "inaudible",
  "music",
  "applause",
  "silence",
  "laughs",
  "laughter",
  "clear throat",
  "clears throat",
  "cough",
  "coughs",
  "sigh",
  "sighs",
  "breathing",
  "background noise",
  "thank you for watching",
  "thanks for watching",
  "subscribe",
  "subtitles by",
  "amara org",
]);

const SHORT_OK = new Set(["ok", "okay", "yes", "no", "hi", "hey", "bye", "stop", "wait", "why", "how","yes, please","no, please","yeah","yeah, please","no, thanks","yes, thanks","thanks","please"]);

function junkNormalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\[\](){}]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[ .,!?-]+|[ .,!?-]+$/g, "");
}

export function isWhisperHallucination(text: string): boolean {
  const raw = text.trim();
  if (!raw) return true;
  const key = junkNormalize(raw);
  if (WHISPER_JUNK_PHRASES.has(key)) return true;
  const m = raw.match(/^[\[(](.+)[\])]\.?$/i);
  if (m && WHISPER_JUNK_PHRASES.has(junkNormalize(m[1]))) return true;
  return false;
}

/** Reject punctuation-only STT and Whisper silence artifacts before committing a turn. */
export function isMeaningfulVoiceTranscript(text: string): boolean {
  const raw = text.trim();
  if (raw.length < 2) return false;
  if (isWhisperHallucination(raw)) return false;
  if (!/[a-zA-Z0-9]/.test(raw)) return false;
  const words = raw.split(/\s+/).map((w) => w.replace(/^[^\w]+|[^\w]+$/g, "")).filter(Boolean);
  if (words.length === 0) return false;
  if (words.length === 1) {
    const w = words[0].toLowerCase();
    return SHORT_OK.has(w) || w.length >= 4;
  }
  return words.some((w) => w.length >= 2);
}

export function postprocessVoiceTranscript(text: string, subjectName = ""): string {
  const raw = text.trim();
  if (!raw) return "";

  let out = raw;
  for (const [pattern, repl] of PHRASE_FIXES) {
    out = out.replace(pattern, repl);
  }

  if (subjectName.toLowerCase().includes("math")) {
    out = out.replace(/\binto\b/gi, "times");
  }

  const words = out.split(/\s+/);
  const fixed = words.map((w) => {
    const core = w.replace(/^[^\w]+|[^\w]+$/g, "");
    const lower = core.toLowerCase();
    const repl = WORD_FIXES[lower];
    if (repl) return w.replace(new RegExp(core, "i"), repl);
    return w;
  });

  return fixed.join(" ").replace(/\s+/g, " ").trim();
}

export function voiceRecognitionLang(subjectName = ""): string {
  const subj = subjectName.toLowerCase();
  if (subj.includes("hindi") || subj.includes("sanskrit")) return "hi-IN";
  return "en-IN";
}
