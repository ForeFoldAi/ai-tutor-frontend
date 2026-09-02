import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VoiceTutor } from "@/components/voice/VoiceTutor";
import { useVoiceTutor } from "@/hooks/voice/useVoiceTutor";
import { useAuthStore } from "@/lib/auth-store";
import { chapterSelectionPath } from "@/lib/tutor-chapter-nav";
import { useStudySession } from "@/hooks/use-study-session";

export default function VoiceTutorPage() {
  const [, setLocation] = useLocation();
  const { token, user } = useAuthStore();
  const [callSeconds, setCallSeconds] = useState(0);
  const callStartRef = useRef<number | null>(null);

  const scope = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const board = params.get("board");
    const classLevel = params.get("class");
    const subject = params.get("subject");
    const chaptersRaw = params.get("chapters");
    if (!board || !classLevel || !subject || !chaptersRaw) return null;
    return {
      board,
      classLevel,
      subject,
      subjectId: params.get("subjectId"),
      chapterIds: chaptersRaw.split(",").filter(Boolean),
      chapterNames: (params.get("chapterNames") || "").split("||").filter(Boolean),
    };
  }, []);

  const greet = new URLSearchParams(window.location.search).get("greet") === "1";
  const voice = useVoiceTutor({ token: token || "", scope, greet });

  const primaryChapterId = scope?.chapterIds[0] ? Number(scope.chapterIds[0]) : null;
  const subjectLabel = scope?.subject || "General";
  const studentName = user?.fullName || "Student";
  const studentInitial = (studentName.split(/\s+/)[0]?.[0] || "S").toUpperCase();
  const isLive =
    voice.state !== "IDLE" && voice.state !== "ENDED" && voice.state !== "ERROR";

  useStudySession({
    enabled: Boolean(scope?.subject),
    subjectName: scope?.subject,
    chapterId: primaryChapterId != null && !Number.isNaN(primaryChapterId) ? primaryChapterId : null,
    chapterName: scope?.chapterNames[0] ?? null,
    mode: "ai_voice",
    agentMode: "free",
  });

  useEffect(() => {
    if (!isLive) {
      callStartRef.current = null;
      setCallSeconds(0);
      return;
    }
    if (!callStartRef.current) callStartRef.current = Date.now();
    const id = window.setInterval(() => {
      if (callStartRef.current) {
        setCallSeconds(Math.floor((Date.now() - callStartRef.current) / 1000));
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [isLive]);

  const handleBack = () => {
    voice.end();
    setLocation(chapterSelectionPath(scope?.subjectId));
  };

  return (
    <div className="flex min-h-0 flex-1 h-full w-full flex-col overflow-hidden bg-background">
      <header className="shrink-0 px-3 py-2 sm:px-4 sm:py-2.5 flex items-center justify-between gap-3 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="flex items-center gap-2 min-w-0">
          {scope && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={handleBack}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground min-w-0">
            <BookOpen className="h-4 w-4 text-primary shrink-0" />
            <span className="truncate">{subjectLabel} Tutor</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
            <span className="text-border">·</span>
            {isLive ? (
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium shrink-0">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            ) : voice.state === "CONNECTING" ? (
              <span className="text-amber-600 dark:text-amber-400 shrink-0">Connecting…</span>
            ) : (
              <span className="shrink-0">Ready</span>
            )}
            {scope && scope.chapterNames.length > 0 && (
              <>
                <span className="text-border">·</span>
                <span className="truncate">{scope.chapterNames[0]}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <span className="sm:hidden inline-flex items-center gap-1 text-[10px] font-medium">
            {isLive ? (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-emerald-600 dark:text-emerald-400">Live</span>
              </>
            ) : voice.state === "CONNECTING" ? (
              <span className="text-amber-600 dark:text-amber-400">…</span>
            ) : null}
          </span>
          {isLive && (
            <Badge
              variant="outline"
              className="font-mono text-xs tabular-nums border-border text-foreground bg-muted/50 px-2.5 py-0.5"
            >
              {String(Math.floor(callSeconds / 60)).padStart(2, "0")}:
              {String(callSeconds % 60).padStart(2, "0")}
            </Badge>
          )}
          <span className="text-xs text-muted-foreground hidden sm:inline">
            {isLive ? "Connected" : voice.state === "CONNECTING" ? "Connecting…" : "Ready"}
          </span>
        </div>
      </header>

      {scope && scope.chapterNames.length > 0 && (
        <div className="sm:hidden shrink-0 px-3 py-1 border-b border-border text-[11px] text-muted-foreground truncate bg-muted/30">
          {isLive ? (
            <span className="text-emerald-600 dark:text-emerald-400">Live · </span>
          ) : voice.state === "CONNECTING" ? (
            <span className="text-amber-600 dark:text-amber-400">Connecting · </span>
          ) : null}
          {scope.chapterNames[0]}
        </div>
      )}

      <main className="flex-1 min-h-0 overflow-hidden w-full">
        <VoiceTutor
          subject={subjectLabel}
          state={voice.state}
          error={voice.error || (scope ? "" : "Pick a class and subject in Learning Studio first.")}
          hint={voice.hint}
          transcript={voice.transcript}
          images={voice.images}
          accessToken={token}
          muted={voice.muted}
          level={voice.level}
          callSeconds={callSeconds}
          studentName={studentName}
          studentInitial={studentInitial}
          onStart={() => void voice.start()}
          onMute={() => voice.setMuted((m) => !m)}
          onInterrupt={voice.interrupt}
          onEnd={voice.end}
          onSendText={voice.sendText}
        />
      </main>
    </div>
  );
}
