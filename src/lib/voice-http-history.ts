import type { TranscriptEntry } from "@/components/voice/voice-types";

export type VoiceConversationTurn = { role: "user" | "assistant"; content: string };

/** Last 14 turns for HTTP / voice-stream fallback (matches backend VOICE_HISTORY_TURNS). */
export function buildVoiceConversationHistory(
  entries: TranscriptEntry[],
): VoiceConversationTurn[] {
  return entries
    .filter((e) => (e.text || "").trim().length > 0)
    .slice(-14)
    .map((e) => ({
      role: e.role,
      content: e.text.trim(),
    }));
}
