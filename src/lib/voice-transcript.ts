import type { TranscriptLine } from "@/types/voice";

export type TranscriptWsMessage = {
  type?: string;
  role?: string;
  text?: string;
  turnId?: number;
  pending?: boolean;
  action?: string;
};

/** Apply a voice WS transcript / turn_cancelled event to transcript state. */
export function applyTranscriptEvent(
  lines: TranscriptLine[],
  msg: TranscriptWsMessage,
): TranscriptLine[] {
  if (msg.type === "turn_cancelled") {
    const turnId = Number(msg.turnId);
    if (!Number.isFinite(turnId) || turnId <= 0) return lines;
    return lines.filter((l) => !(l.role === "user" && l.turnId === turnId && l.pending));
  }

  const turnId = Number(msg.turnId);
  if (!Number.isFinite(turnId) || turnId <= 0) return lines;

  const role = msg.role === "assistant" ? "assistant" : "user";
  const text = String(msg.text || "").trim();
  if (!text) return lines;

  if (role === "user") {
    const pending = Boolean(msg.pending);
    const idx = lines.findIndex((l) => l.role === "user" && l.turnId === turnId);
    const line: TranscriptLine = { role: "user", text, turnId, pending };
    if (idx >= 0) {
      const next = lines.slice();
      next[idx] = line;
      return next;
    }
    return [...lines, line];
  }

  // Assistant — must attach to an existing user turn unless this is a synthetic greet.
  if (lines.some((l) => l.role === "assistant" && l.turnId === turnId)) return lines;
  const user = lines.find((l) => l.role === "user" && l.turnId === turnId);
  if (user?.pending) return lines;

  return [
    ...lines,
    {
      role: "assistant",
      text,
      turnId,
      action: typeof msg.action === "string" ? msg.action : undefined,
    },
  ];
}

