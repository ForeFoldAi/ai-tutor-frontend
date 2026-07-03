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
