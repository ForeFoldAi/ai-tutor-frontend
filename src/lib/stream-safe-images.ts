/**
 * Decide when textbook figures may be interleaved into streaming markdown.
 */

const SENTENCE_RE = /[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g;

function countSentences(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.match(SENTENCE_RE)?.length ?? 1;
}

export function isSafeImageInjectionPoint(content: string, isStreaming: boolean): boolean {
  const t = content.trimEnd();
  if (!t) return false;

  const lines = t.split("\n");
  const lastLine = lines[lines.length - 1] ?? "";

  if (/^\s*\d+\.\s+\S/.test(lastLine) && !/[.!?]\s*$/.test(lastLine.trim())) {
    return false;
  }

  if (/^\s*[-*+]\s+\S/.test(lastLine) && !/[.!?]\s*$/.test(lastLine.trim())) {
    return false;
  }

  if (/\|/.test(lastLine) && lastLine.split("|").length > 2) {
    return false;
  }

  if ((t.match(/\*\*/g) ?? []).length % 2 === 1) {
    return false;
  }

  if ((t.match(/```/g) ?? []).length % 2 === 1) {
    return false;
  }

  if (!isStreaming) {
    return true;
  }

  if (/[.!?]["']?\s*$/.test(t)) {
    return true;
  }

  if (/\n\n\s*$/.test(t)) {
    return true;
  }

  if (countSentences(t) >= 2 && /[.!?]\s*$/.test(t)) {
    return true;
  }

  return false;
}
