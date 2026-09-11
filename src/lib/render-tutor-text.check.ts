/**
 * Run: npx tsx src/lib/render-tutor-text.check.ts
 * Keep regexes in sync with render-tutor-text.tsx.
 */
import assert from "node:assert/strict";

const EMPH_RE =
  /(\*{2,3}|_{2,3})([^*_\n]+)\1|(?<![*\w])\*([A-Za-z][^*]{0,80}?)\*(?![*\w])/g;
const HR_LINE_RE = /^\s*[-*_]{3,}\s*$/;
const MARKDOWN_UNWRAP_RE = /```markdown\s*\n?([\s\S]*?)```/gi;
const CLOSED_FENCE_RE = /```[\s\S]*?```/g;
const UNCLOSED_FENCE_RE = /```[\s\S]*$/;

function sanitize(text: string): string {
  let normalized = text.replace(MARKDOWN_UNWRAP_RE, "$1");
  normalized = normalized.replace(CLOSED_FENCE_RE, "");
  normalized = normalized.replace(UNCLOSED_FENCE_RE, "");
  const out: string[] = [];
  for (const line of normalized.replace(/\r\n/g, "\n").split("\n")) {
    if (HR_LINE_RE.test(line)) continue;
    if (!line.trim()) {
      if (out.length > 0 && out[out.length - 1].trim() !== "") out.push("");
      continue;
    }
    out.push(line);
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function visible(text: string): string {
  EMPH_RE.lastIndex = 0;
  return sanitize(text)
    .replace(/\*{4,}/g, "**")
    .replace(EMPH_RE, (_m, _open, a, b) => a || b || "")
    .replace(/\*{2,}|_{2,}/g, "");
}

assert.equal(visible("he was ***lonely***"), "he was lonely");
assert.equal(visible("his **mind and body** weren't healthy"), "his mind and body weren't healthy");
assert.equal(visible("he was *lonely*"), "he was lonely");
assert.ok(!visible("You're on the right track! **lonely** and ***mind and body***").includes("*"));
assert.equal(visible("Area is 2 * 3 * 4"), "Area is 2 * 3 * 4");

const math = sanitize(
  "Find the cube root of 64.\n---\n```math-lesson\n{\"conceptName\":\"Squares\"}",
);
assert.ok(math.includes("cube root"));
assert.ok(!math.includes("```"));
assert.ok(!math.includes("conceptName"));
assert.ok(!math.includes("---"));

console.log("render-tutor-text.check: ok");
