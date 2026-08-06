import { useEffect, useRef } from "react";
import {
  endLearningSession,
  startLearningSession,
  type AgentMode,
  type StudyMode,
} from "@/api/learning";

/**
 * Starts a learning session when chapter context is ready; ends on unmount.
 * Duration is computed server-side on /end (no 30s heartbeat polling).
 */
export function useStudySession(opts: {
  enabled: boolean;
  subjectName: string | null | undefined;
  chapterId: number | null | undefined;
  chapterName?: string | null;
  mode?: StudyMode;
  agentMode?: AgentMode | null;
}) {
  const sessionIdRef = useRef<number | null>(null);
  const startedKeyRef = useRef<string>("");

  useEffect(() => {
    if (!opts.enabled || !opts.subjectName?.trim()) return;
    const key = `${opts.subjectName}|${opts.chapterId ?? ""}|${opts.mode ?? "ai_tutor"}|${opts.agentMode ?? "free"}`;
    if (startedKeyRef.current === key && sessionIdRef.current != null) return;

    let cancelled = false;
    startedKeyRef.current = key;

    (async () => {
      try {
        const res = await startLearningSession({
          subject_name: opts.subjectName!.trim(),
          chapter_id: opts.chapterId ?? null,
          chapter_name: opts.chapterName ?? null,
          mode: opts.mode ?? "ai_tutor",
          agent_mode: opts.agentMode ?? "free",
        });
        if (cancelled) {
          void endLearningSession(res.session_id).catch(() => {});
          return;
        }
        sessionIdRef.current = res.session_id;
      } catch {
        // ponytail: fail-open — chat still works if analytics API is down
      }
    })();

    return () => {
      cancelled = true;
      const id = sessionIdRef.current;
      sessionIdRef.current = null;
      if (id != null) void endLearningSession(id).catch(() => {});
    };
  }, [
    opts.enabled,
    opts.subjectName,
    opts.chapterId,
    opts.chapterName,
    opts.mode,
    opts.agentMode,
  ]);
}
