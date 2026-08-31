import type { TranscriptLine } from "@/types/voice";

export function ConversationTranscript({ lines, live = false }: { lines: TranscriptLine[]; live?: boolean }) {
  if (!lines.length) {
    if (!live) return null;
    return (
      <p className="max-w-lg text-center text-sm text-muted-foreground">
        Your questions and the tutor&apos;s answers will show up here.
      </p>
    );
  }
  return (
    <ol className="mx-auto max-h-56 w-full max-w-lg space-y-2 overflow-y-auto rounded-xl border bg-card p-3 text-sm">
      {lines.map((line) => (
        <li
          key={`${line.turnId}-${line.role}`}
          className={line.role === "user" ? "text-right" : "text-left"}
        >
          <span className="text-[10px] uppercase text-muted-foreground">
            {line.role === "user" ? "You" : "Tutor"}
          </span>
          <p className={line.pending ? "text-muted-foreground" : undefined}>{line.text}</p>
        </li>
      ))}
    </ol>
  );
}
