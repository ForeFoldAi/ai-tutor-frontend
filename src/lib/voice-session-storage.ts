import type { TranscriptEntry } from "@/components/voice/voice-types";

const STORAGE_PREFIX = "ai-voice-session:";
const MAX_AGE_MS = 4 * 60 * 60 * 1000;

type StoredVoiceSession = {
  entries: TranscriptEntry[];
  savedAt: number;
};

export function buildVoiceSessionKey(opts: {
  board: string;
  classLevel: string;
  subject: string;
  chapterIds: string[];
}): string {
  return `${opts.board}|${opts.classLevel}|${opts.subject}|${opts.chapterIds.join(",")}`;
}

export function loadVoiceSession(key: string): TranscriptEntry[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredVoiceSession;
    if (!parsed?.entries || !Array.isArray(parsed.entries)) return [];
    if (Date.now() - (parsed.savedAt || 0) > MAX_AGE_MS) {
      sessionStorage.removeItem(STORAGE_PREFIX + key);
      return [];
    }
    return parsed.entries.filter(
      (e) => e && typeof e === "object" && typeof e.text === "string" && (e.role === "user" || e.role === "assistant"),
    );
  } catch {
    return [];
  }
}

export function saveVoiceSession(key: string, entries: TranscriptEntry[]): void {
  try {
    if (entries.length === 0) {
      sessionStorage.removeItem(STORAGE_PREFIX + key);
      return;
    }
    const payload: StoredVoiceSession = { entries, savedAt: Date.now() };
    sessionStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}

export function clearVoiceSession(key: string): void {
  try {
    sessionStorage.removeItem(STORAGE_PREFIX + key);
  } catch {
    /* ignore */
  }
}
