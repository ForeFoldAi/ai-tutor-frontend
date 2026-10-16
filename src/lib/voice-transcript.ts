import type { TranscriptLine } from "@/types/voice";

export type TranscriptWsMessage = {
  type?: string;
  role?: string;
  text?: string;
  turnId?: number;
  pending?: boolean;
  action?: string;
  images?: TranscriptLine["images"];
};

/** Apply a voice WS transcript / turn_cancelled / related_images event to transcript state. */
export function applyTranscriptEvent(
  lines: TranscriptLine[],
  msg: TranscriptWsMessage,
): TranscriptLine[] {
  if (msg.type === "turn_cancelled") {
    const turnId = Number(msg.turnId);
    if (!Number.isFinite(turnId) || turnId <= 0) return lines;
    return lines.filter(
      (l) =>
        !(l.turnId === turnId && ((l.role === "user" && l.pending) || (l.role === "assistant" && !l.text))),
    );
  }

  const turnId = Number(msg.turnId);
  if (!Number.isFinite(turnId) || turnId <= 0) return lines;

  if (msg.type === "related_images") {
    const images = Array.isArray(msg.images) ? msg.images : [];
    if (!images.length) return lines;
    const idx = lines.findIndex((l) => l.role === "assistant" && l.turnId === turnId);
    if (idx >= 0) {
      const next = lines.slice();
      next[idx] = { ...lines[idx], images };
      return next;
    }
    // Figures often arrive before the first spoken sentence: hold them on an
    // empty assistant line that the answer text fills in.
    return [...lines, { role: "assistant", text: "", turnId, images }];
  }

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
    // Keep the user line ahead of a figures-only assistant placeholder for the same turn.
    const holder = lines.findIndex((l) => l.role === "assistant" && l.turnId === turnId);
    if (holder >= 0) return [...lines.slice(0, holder), line, ...lines.slice(holder)];
    return [...lines, line];
  }

  // Assistant text arrives with audio — commit a still-pending user line so
  // voice + transcript stay paired on the same turn.
  let next = lines;
  const userIdx = lines.findIndex((l) => l.role === "user" && l.turnId === turnId);
  if (userIdx >= 0 && lines[userIdx].pending) {
    next = lines.slice();
    next[userIdx] = { ...lines[userIdx], pending: false };
  }

  const action = typeof msg.action === "string" ? msg.action : undefined;
  const existing = next.findIndex((l) => l.role === "assistant" && l.turnId === turnId);
  const prev = existing >= 0 ? next[existing] : undefined;
  const line: TranscriptLine = {
    role: "assistant",
    text,
    turnId,
    ...(action ? { action } : prev?.action ? { action: prev.action } : {}),
    ...(prev?.images ? { images: prev.images } : {}),
  };
  if (prev) {
    // Progressive speech updates must not shrink a longer final reply.
    if (text.length < prev.text.length) return next === lines ? lines : next;
    if (next === lines) next = lines.slice();
    next[existing] = line;
    return next;
  }

  return [...next, line];
}
