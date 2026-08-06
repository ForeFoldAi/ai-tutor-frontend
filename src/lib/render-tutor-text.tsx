import { type ReactNode } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { cn } from "@/lib/utils";

const BOLD_RE = /\*\*(.+?)\*\*/g;
const DISPLAY_MATH_RE = /\$\$([\s\S]*?)\$\$/g;
const INLINE_MATH_RE = /(?<!\$)\$(?!\$)((?:\\.|[^$\\])+)\$(?!\$)/g;
const LATEX_DISPLAY_RE = /\\\[([\s\S]*?)\\\]/g;
const LATEX_INLINE_RE = /\\\(([\s\S]*?)\\\)/g;
const DELIMITED_MATH_SPLIT_RE = /(\$\$[\s\S]*?\$\$|\$(?:\\.|[^$\\])+\$)/g;

function readBalanced(text: string, start: number, open: string, close: string): number {
  if (text[start] !== open) return start;
  let depth = 0;
  let i = start;
  while (i < text.length) {
    if (text[i] === open) depth++;
    else if (text[i] === close) {
      depth--;
      if (depth === 0) return i + 1;
    }
    i++;
  }
  return start;
}

function readLatexCommand(text: string, start: number): number {
  if (text[start] !== "\\") return start;
  let i = start + 1;
  if (i >= text.length || !/[a-zA-Z]/.test(text[i])) return start;
  while (i < text.length && /[a-zA-Z]/.test(text[i])) i++;
  while (i < text.length && (text[i] === "[" || text[i] === "{")) {
    const open = text[i];
    const close = open === "[" ? "]" : "}";
    const next = readBalanced(text, i, open, close);
    if (next === i) break;
    i = next;
  }
  return i;
}

function readLatexSpan(text: string, start: number): number {
  const cmdEnd = readLatexCommand(text, start);
  if (cmdEnd === start) return start;
  let i = cmdEnd;
  while (i < text.length) {
    if (text[i] === "^" || text[i] === "_") {
      i++;
      if (i < text.length && text[i] === "{") {
        i = readBalanced(text, i, "{", "}");
      } else if (i < text.length && /[0-9a-zA-Z]/.test(text[i])) {
        i++;
      } else {
        break;
      }
      continue;
    }
    if (text[i] === " " && i + 1 < text.length && text[i + 1] === "\\") {
      const nextEnd = readLatexCommand(text, i + 1);
      if (nextEnd > i + 1) {
        i = nextEnd;
        continue;
      }
      break;
    }
    if (/[+−\-=(),.;]/.test(text[i]) && i + 1 < text.length && text[i + 1] === "\\") {
      i++;
      const nextEnd = readLatexCommand(text, i);
      if (nextEnd > i) {
        i = nextEnd;
        continue;
      }
      break;
    }
    break;
  }
  return i;
}

function wrapBareLatexInPlainSegment(text: string): string {
  if (!/\\[a-zA-Z]/.test(text)) return text;
  let out = "";
  let i = 0;
  while (i < text.length) {
    if (text[i] === "\\") {
      const end = readLatexSpan(text, i);
      if (end > i) {
        out += `$${text.slice(i, end)}$`;
        i = end;
        continue;
      }
    }
    out += text[i];
    i++;
  }
  return out
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.includes("$")) return line;
      if (
        (trimmed.startsWith("=") || /^[-+]?\s*\\/.test(trimmed)) &&
        /\\(?:frac|sqrt|text|times|div|cdot|pi|theta|alpha|beta|gamma|Delta)|[\^_{}]/.test(trimmed)
      ) {
        const indent = line.match(/^\s*/)?.[0] ?? "";
        return `${indent}$$${trimmed}$$`;
      }
      return line;
    })
    .join("\n");
}

/** Wrap bare `\frac{a}{b}`-style LaTeX so KaTeX can render it in tutor/voice transcripts. */
export function wrapBareLatexInText(text: string): string {
  if (!text || !/\\[a-zA-Z]/.test(text)) return text;
  return text
    .split(DELIMITED_MATH_SPLIT_RE)
    .map((part, idx) => (idx % 2 === 1 ? part : wrapBareLatexInPlainSegment(part)))
    .join("");
}

/** Mistral often emits `\(...\)` / `\[...\]`; KaTeX expects `$...$` / `$$...$$`. */
export function normalizeTutorMathDelimiters(text: string): string {
  let out = text;
  out = out.replace(LATEX_DISPLAY_RE, (_, inner) => `$$${inner.trim()}$$`);
  out = out.replace(LATEX_INLINE_RE, (_, inner) => `$${inner.trim()}$`);
  return wrapBareLatexInText(out);
}

function renderKaTeX(latex: string, displayMode: boolean, key: number): ReactNode {
  try {
    const html = katex.renderToString(latex.trim(), {
      displayMode,
      throwOnError: false,
      strict: "ignore",
    });
    if (displayMode) {
      return (
        <span
          key={key}
          className="block my-2 overflow-x-auto text-[1.05em]"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    }
    return (
      <span
        key={key}
        className="mx-0.5"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  } catch {
    return displayMode ? `$$${latex}$$` : `$${latex}$`;
  }
}

function renderInlineSegments(text: string, keyPrefix: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;
  let match: RegExpExecArray | null;

  INLINE_MATH_RE.lastIndex = 0;
  while ((match = INLINE_MATH_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        ...renderBoldSegments(text.slice(lastIndex, match.index), `${keyPrefix}-t${key}`),
      );
    }
    parts.push(renderKaTeX(match[1], false, key++));
    lastIndex = INLINE_MATH_RE.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(...renderBoldSegments(text.slice(lastIndex), `${keyPrefix}-t${key}`));
  }

  return parts.length === 0 ? renderBoldSegments(text, keyPrefix) : parts;
}

function renderBoldSegments(text: string, keyPrefix: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;
  let match: RegExpExecArray | null;

  BOLD_RE.lastIndex = 0;
  while ((match = BOLD_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      <strong key={`${keyPrefix}-b${key++}`} className="font-semibold">
        {match[1]}
      </strong>,
    );
    lastIndex = BOLD_RE.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length === 0 ? [text] : parts;
}

const TOPIC_HEADING_RE = /^\*\*[^*\n]+?\*\*:?\s*$/;

function countTopicHeadingLines(text: string): number {
  return text.split("\n").filter((line) => isTopicHeadingLine(line)).length;
}

/** Standalone **Subtopic:** line — not inline bold inside a sentence. */
export function isTopicHeadingLine(line: string): boolean {
  return TOPIC_HEADING_RE.test(line.trim());
}

/** Split tutor prose into paragraph/topic blocks (blank lines + standalone headings). */
export function splitTutorProseBlocks(text: string): string[] {
  const allowHeadingSplit = countTopicHeadingLines(text) >= 2;
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: string[] = [];
  let current: string[] = [];

  const flush = () => {
    const joined = current.join("\n").trim();
    if (joined) blocks.push(joined);
    current = [];
  };

  for (const line of lines) {
    if (!line.trim()) {
      flush();
      continue;
    }
    if (allowHeadingSplit && isTopicHeadingLine(line) && current.length > 0) {
      flush();
    }
    current.push(line);
  }
  flush();
  return blocks;
}

function renderProseBlock(block: string, key: number, allowHeadingSplit: boolean): ReactNode {
  const lines = block.split("\n");
  const firstLine = lines[0] ?? "";

  if (allowHeadingSplit && lines.length > 1 && isTopicHeadingLine(firstLine)) {
    const rest = lines.slice(1).join("\n").trim();
    return (
      <div key={key} className="flex flex-col gap-[0.5em]">
        <p className="m-0 whitespace-pre-wrap font-semibold">{renderTutorText(firstLine.trim())}</p>
        {rest ? <p className="m-0 whitespace-pre-wrap">{renderTutorText(rest)}</p> : null}
      </div>
    );
  }

  return (
    <p key={key} className="m-0 whitespace-pre-wrap">
      {renderTutorText(block)}
    </p>
  );
}

/** Tutor response body: 1.5 line height, enter-gap between topics/sub-headings. */
export function TutorMessageProse({
  text,
  className,
  children,
}: {
  text: string;
  className?: string;
  children?: ReactNode;
}) {
  const blocks = splitTutorProseBlocks(text);
  const allowHeadingSplit = countTopicHeadingLines(text) >= 2;

  if (blocks.length === 0) {
    return children ? <div className={cn("tutor-message-prose", className)}>{children}</div> : null;
  }

  if (blocks.length === 1) {
    return (
      <div className={cn("tutor-message-prose text-sm leading-[1.5]", className)}>
        {renderProseBlock(blocks[0], 0, allowHeadingSplit)}
        {children}
      </div>
    );
  }

  return (
    <div className={cn("tutor-message-prose flex flex-col gap-[0.5em] text-sm leading-[1.5]", className)}>
      {blocks.map((block, idx) => renderProseBlock(block, idx, allowHeadingSplit))}
      {children}
    </div>
  );
}

/** Render tutor prose: **bold**, $inline math$, and $$display math$$. */
export function renderTutorText(text: string): ReactNode {
  const normalized = normalizeTutorMathDelimiters(text);
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;
  let match: RegExpExecArray | null;

  DISPLAY_MATH_RE.lastIndex = 0;
  while ((match = DISPLAY_MATH_RE.exec(normalized)) !== null) {
    if (match.index > lastIndex) {
      parts.push(...renderInlineSegments(normalized.slice(lastIndex, match.index), `pre-${key}`));
    }
    parts.push(renderKaTeX(match[1], true, key++));
    lastIndex = DISPLAY_MATH_RE.lastIndex;
  }

  const tail = normalized.slice(lastIndex);
  if (tail) {
    parts.push(...renderInlineSegments(tail, `tail-${key}`));
  }

  if (parts.length === 0) {
    return text;
  }
  if (parts.length === 1) {
    return parts[0];
  }
  return parts;
}

// ponytail: dev-only guard — split on blank lines and **heading** lines
if (import.meta.env.DEV) {
  const sample = splitTutorProseBlocks("Intro line.\n\n**Key points:**\n• one\n• two");
  console.assert(
    sample.length === 2 && sample[1].startsWith("**Key points:**"),
    "splitTutorProseBlocks: expected intro + key-points blocks",
  );
}
