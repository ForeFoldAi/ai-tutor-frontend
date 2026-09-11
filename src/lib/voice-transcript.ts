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

  // Assistant text arrives with audio — commit a still-pending user line so
  // voice + transcript stay paired on the same turn.
  let next = lines;
  const userIdx = lines.findIndex((l) => l.role === "user" && l.turnId === turnId);
  if (userIdx >= 0 && lines[userIdx].pending) {
    next = lines.slice();
    next[userIdx] = { ...lines[userIdx], pending: false };
  } else if (userIdx < 0 && turnId > 0) {
    // Synthetic / greet-style assistant with no user line for this turn is ok
    // only when we already have some transcript context; still allow attach.
    next = lines;
  }

  const action = typeof msg.action === "string" ? msg.action : undefined;
  const existing = next.findIndex((l) => l.role === "assistant" && l.turnId === turnId);
  const line: TranscriptLine = {
    role: "assistant",
    text,
    turnId,
    ...(action
      ? { action }
      : existing >= 0 && next[existing].action
        ? { action: next[existing].action }
        : {}),
  };
  if (existing >= 0) {
    // Progressive speech updates must not shrink a longer final reply.
    if (text.length < next[existing].text.length) return next === lines ? lines : next;
    if (next === lines) next = lines.slice();
    next[existing] = line;
    return next;
  }

  // Assistant — must attach to an existing user turn unless this is a lone greet.
  const user = next.find((l) => l.role === "user" && l.turnId === turnId);
  if (!user && next.length > 0) {
    // No matching user — still show text (e.g. late commit race).
  }

  return [...next, line];
}
