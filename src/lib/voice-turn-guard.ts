/** Late interrupt/listening must not kill a question that already owns this epoch. */
export function isInFlightVoiceTurn(
  phase: string,
  streamEpoch: number,
  activeQuestionEpoch: number,
): boolean {
  return (
    streamEpoch === activeQuestionEpoch &&
    (phase === "thinking" || phase === "speaking")
  );
}

/** interrupt_ack after a new question (epochs already synced) must not stale that question. */
export function shouldIgnoreLateInterruptAck(
  streamEpoch: number,
  activeQuestionEpoch: number,
): boolean {
  return streamEpoch === activeQuestionEpoch;
}
