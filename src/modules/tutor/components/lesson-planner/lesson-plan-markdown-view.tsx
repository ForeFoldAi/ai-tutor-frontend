import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

const BOLD_RE = /\*\*(.+?)\*\*/g;

function renderInline(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(BOLD_RE)) {
    const idx = match.index ?? 0;
    if (idx > last) parts.push(text.slice(last, idx));
    parts.push(
      <strong key={`${idx}-b`} className="font-semibold text-foreground">
        {match[1]}
      </strong>,
    );
    last = idx + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length ? parts : [text];
}

type Block =
  | { type: "h1"; text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "hr" };

function isTableRow(line: string): boolean {
  const t = line.trim();
  return t.startsWith("|") && t.endsWith("|") && t.length > 2;
}

function isTableSeparator(line: string): boolean {
  const cells = line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
  return cells.length > 0 && cells.every((c) => /^:?-{2,}:?$/.test(c));
}

function parseTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
}

function parseMarkdownBlocks(markdown: string): Block[] {
  const blocks: Block[] = [];
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i++;
      continue;
    }
    if (/^---+$/.test(trimmed)) {
      blocks.push({ type: "hr" });
      i++;
      continue;
    }
    if (trimmed.startsWith("### ")) {
      blocks.push({ type: "h3", text: trimmed.slice(4) });
      i++;
      continue;
    }
    if (trimmed.startsWith("## ")) {
      blocks.push({ type: "h2", text: trimmed.slice(3) });
      i++;
      continue;
    }
    if (trimmed.startsWith("# ")) {
      blocks.push({ type: "h1", text: trimmed.slice(2) });
      i++;
      continue;
    }
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      const items: string[] = [];
      while (i < lines.length) {
        const t = lines[i].trim();
        if (t.startsWith("- ") || t.startsWith("* ")) {
          items.push(t.slice(2));
          i++;
        } else break;
      }
      blocks.push({ type: "ul", items });
      continue;
    }
    if (isTableRow(trimmed)) {
      const headers = parseTableRow(trimmed);
      i++;
      if (i < lines.length && isTableSeparator(lines[i].trim())) {
        i++;
      }
      const rows: string[][] = [];
      while (i < lines.length && isTableRow(lines[i].trim()) && !isTableSeparator(lines[i].trim())) {
        rows.push(parseTableRow(lines[i]));
        i++;
      }
      blocks.push({ type: "table", headers, rows });
      continue;
    }
    blocks.push({ type: "p", text: trimmed });
    i++;
  }
  return blocks;
}

interface LessonPlanMarkdownViewProps {
  markdown: string;
  className?: string;
}

export function LessonPlanMarkdownView({ markdown, className }: LessonPlanMarkdownViewProps) {
  const blocks = parseMarkdownBlocks(markdown);

  return (
    <article
      className={cn(
        "prose prose-sm max-w-none text-foreground dark:prose-invert",
        "space-y-4 [&_h1]:text-xl [&_h1]:font-bold [&_h1]:text-blue-900 dark:[&_h1]:text-blue-100",
        "[&_h2]:mt-6 [&_h2]:border-b [&_h2]:border-border/60 [&_h2]:pb-1.5 [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-blue-800 dark:[&_h2]:text-blue-200",
        "[&_h3]:mt-4 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-primary",
        "[&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_li]:leading-relaxed [&_li]:text-muted-foreground",
        "[&_p]:leading-relaxed [&_p]:text-muted-foreground",
        "[&_table]:text-sm",
        className,
      )}
    >
      {blocks.map((block, index) => {
        switch (block.type) {
          case "h1":
            return <h1 key={index}>{renderInline(block.text)}</h1>;
          case "h2":
            return <h2 key={index}>{renderInline(block.text)}</h2>;
          case "h3":
            return <h3 key={index}>{renderInline(block.text)}</h3>;
          case "p":
            return <p key={index}>{renderInline(block.text)}</p>;
          case "ul":
            return (
              <ul key={index}>
                {block.items.map((item, j) => (
                  <li key={j}>{renderInline(item)}</li>
                ))}
              </ul>
            );
          case "table":
            return (
              <div key={index} className="overflow-x-auto rounded-lg border border-border/60">
                <table className="w-full min-w-[280px] border-collapse">
                  <thead>
                    <tr className="border-b border-border/60 bg-muted/40">
                      {block.headers.map((header, j) => (
                        <th
                          key={j}
                          className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-foreground"
                        >
                          {renderInline(header)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, ri) => (
                      <tr
                        key={ri}
                        className="border-b border-border/40 last:border-0 even:bg-muted/20"
                      >
                        {block.headers.map((_, ci) => (
                          <td key={ci} className="px-3 py-2.5 align-top leading-relaxed text-muted-foreground">
                            {renderInline(row[ci] ?? "")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case "hr":
            return <hr key={index} className="border-border/60" />;
          default:
            return null;
        }
      })}
    </article>
  );
}

// ponytail: runnable check — fails if markdown tables stop parsing
if (import.meta.env?.DEV) {
  const sample = `| Term | Definition |\n|------|------------|\n| Weather | Atmosphere state |\n`;
  const parsed = parseMarkdownBlocks(sample);
  console.assert(parsed[0]?.type === "table", "lesson plan markdown tables");
}
