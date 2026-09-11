/**
 * Lightweight Brilliant-style correct / incorrect feedback helpers.
 */
import { useCallback, useState } from "react";
import { MOTION } from "./design-tokens";

export type FeedbackKind = "correct" | "incorrect" | null;

export function useAnswerFeedback() {
  const [feedback, setFeedback] = useState<FeedbackKind>(null);

  const flash = useCallback((kind: "correct" | "incorrect") => {
    setFeedback(kind);
    const ms = kind === "correct" ? MOTION.correctMs : MOTION.incorrectMs;
    window.setTimeout(() => setFeedback(null), ms + 40);
  }, []);

  return { feedback, flash, clear: () => setFeedback(null) };
}
