import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  BookOpen,
  BarChart3,
  Calculator,
  Clock,
  FlaskConical,
  Globe,
  Loader2,
  Monitor,
  Search,
  Users,
  Video,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageShell } from "@/components/page-shell";
import { AskAiTutorButton } from "@/components/ask-ai-tutor-button";
import {
  fetchStudentLiveSessions,
  joinStudentLiveSession,
  type LiveSessionApi,
} from "@/api/tutor";
import { useToast } from "@/hooks/use-toast";

type SessionFilter = "all" | "today" | "tomorrow" | "week";

const SUBJECT_STYLE: Record<string, { icon: typeof Calculator; iconBg: string }> = {
  Mathematics: { icon: Calculator, iconBg: "bg-subject-math" },
  Math: { icon: Calculator, iconBg: "bg-subject-math" },
  Science: { icon: FlaskConical, iconBg: "bg-subject-science" },
  Physics: { icon: FlaskConical, iconBg: "bg-subject-science" },
  Chemistry: { icon: FlaskConical, iconBg: "bg-subject-science" },
  English: { icon: Globe, iconBg: "bg-subject-english" },
  Computer: { icon: Monitor, iconBg: "bg-subject-cs" },
  "Computer Science": { icon: Monitor, iconBg: "bg-subject-cs" },
};

const FALLBACK_STYLE = { icon: BookOpen, iconBg: "bg-primary" };

function subjectStyle(name: string) {
  return SUBJECT_STYLE[name] ?? FALLBACK_STYLE;
}

function formatSessionTime(dateStr: string, durationMinutes: number) {
  const d = new Date(dateStr);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const isTomorrow = d.toDateString() === tomorrow.toDateString();

  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const end = new Date(d.getTime() + durationMinutes * 60_000);
  const endTime = end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  if (isToday) return `Today ${time} – ${endTime}`;
  if (isTomorrow) return `Tomorrow ${time} – ${endTime}`;
  return `${d.toLocaleDateString()} ${time}`;
}

function isToday(dateStr: string) {
  return new Date(dateStr).toDateString() === new Date().toDateString();
}

function isTomorrow(dateStr: string) {
  const d = new Date(dateStr);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return d.toDateString() === tomorrow.toDateString();
}

function isThisWeek(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const weekEnd = new Date(now);
  weekEnd.setDate(now.getDate() + 7);
  return d >= now && d <= weekEnd;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function endsInLabel(session: LiveSessionApi) {
  const end =
    new Date(session.starts_at).getTime() + session.duration_minutes * 60_000;
  const mins = Math.max(0, Math.round((end - Date.now()) / 60_000));
  const nowLabel = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return `${nowLabel} · Ends in ${mins} min`;
}

/** Chapter name + topic (title) for student-facing session cards. */
function sessionChapterTopic(session: LiveSessionApi) {
  const chapter = session.chapter?.trim() || null;
  const topic = session.title?.trim() || null;
  return { chapter, topic };
}

const STUDENT_SESSIONS_KEY = ["student", "live-sessions"] as const;

export default function LiveClassesPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<SessionFilter>("all");
  const [joiningId, setJoiningId] = useState<number | null>(null);

  const { data: sessions = [], isLoading, isError } = useQuery({
    queryKey: STUDENT_SESSIONS_KEY,
    queryFn: fetchStudentLiveSessions,
    refetchInterval: 60_000,
  });

  const joinMutation = useMutation({
    mutationFn: (sessionId: number) => joinStudentLiveSession(sessionId),
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: STUDENT_SESSIONS_KEY });
      toast({
        title: "Joined — marked present",
        description: "You’re on the attendance list for this live session.",
      });
      window.open(res.meeting_link, "_blank", "noopener,noreferrer");
    },
    onError: (err: Error) => {
      toast({
        title: "Could not join session",
        description: err.message || "Ask your tutor to add a meeting link.",
        variant: "destructive",
      });
    },
    onSettled: () => setJoiningId(null),
  });

  const handleJoin = (session: LiveSessionApi) => {
    if (session.status !== "live") {
      toast({
        title: "Session not live yet",
        description: "You can join once the class starts.",
      });
      return;
    }
    setJoiningId(session.id);
    if (session.meeting_link && session.joined) {
      window.open(session.meeting_link, "_blank", "noopener,noreferrer");
      setJoiningId(null);
      return;
    }
    joinMutation.mutate(session.id);
  };

  const liveSession = sessions.find((s) => s.status === "live") ?? null;

  const filterTabs = useMemo(() => {
    const upcoming = sessions.filter((s) => s.status !== "completed");
    return [
      { id: "all" as const, label: "All", count: upcoming.filter((s) => s.status === "upcoming").length },
      { id: "today" as const, label: "Today", count: upcoming.filter((s) => isToday(s.starts_at)).length },
      {
        id: "tomorrow" as const,
        label: "Tomorrow",
        count: upcoming.filter((s) => isTomorrow(s.starts_at)).length,
      },
      {
        id: "week" as const,
        label: "This Week",
        count: upcoming.filter((s) => isThisWeek(s.starts_at)).length,
      },
    ];
  }, [sessions]);

  const filteredSessions = useMemo(() => {
    return sessions.filter((session) => {
      if (session.status === "live") return false;
      if (session.status === "completed") return false;
      const matchesSearch =
        session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        session.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (session.chapter || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        session.tutor_name.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (filter === "all") return session.status === "upcoming";
      if (filter === "today") return isToday(session.starts_at);
      if (filter === "tomorrow") return isTomorrow(session.starts_at);
      if (filter === "week") return isThisWeek(session.starts_at);
      return true;
    });
  }, [sessions, searchQuery, filter]);

  const todaySchedule = useMemo(() => {
    return sessions
      .filter((s) => isToday(s.starts_at) && s.status !== "completed")
      .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
  }, [sessions]);

  return (
    <PageShell
      className="overflow-x-hidden lg:overflow-hidden"
      contentClassName="min-h-0 flex-1"
    >
      <div className="flex min-w-0 shrink-0 flex-col gap-2">
        <div className="flex min-w-0 items-start justify-between gap-2 sm:gap-3 lg:items-center lg:gap-4">
          <div className="min-w-0 flex-1 space-y-0.5">
            <h1 className="truncate text-xl font-bold text-foreground sm:text-2xl">Session</h1>
            <p className="text-sm text-muted-foreground">
              Join live classes scheduled by your tutor
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="relative hidden lg:block lg:w-64 xl:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search sessions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-9"
              />
            </div>
            <AskAiTutorButton className="h-8 shrink-0 px-3 sm:h-9 sm:px-4" />
          </div>
        </div>
        <div className="relative min-w-0 w-full lg:hidden">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search sessions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 min-w-0 pl-8 text-sm"
          />
        </div>
      </div>

      <div className="grid min-w-0 gap-3 lg:min-h-0 lg:flex-1 lg:grid-cols-3 lg:gap-4">
        <div className="flex min-w-0 flex-col gap-3 lg:col-span-2 lg:min-h-0 lg:overflow-hidden">
          {liveSession && (
            <Card className="shrink-0 overflow-hidden border-0 shadow-card">
              <div className="relative bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-4 sm:p-5">
                <div className="relative flex items-start justify-between gap-2">
                  <Badge className="bg-red-500 hover:bg-red-500">
                    <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-white" />
                    LIVE
                  </Badge>
                  <Badge variant="secondary" className="bg-white/10 text-white hover:bg-white/10">
                    <Clock className="mr-1 h-3 w-3" />
                    {endsInLabel(liveSession)}
                  </Badge>
                </div>

                <div className="relative mt-4 flex flex-col items-center text-center text-white">
                  <Avatar className="mb-3 h-16 w-16 border-2 border-white/20">
                    <AvatarFallback className="bg-primary text-lg text-primary-foreground">
                      {initials(liveSession.tutor_name)}
                    </AvatarFallback>
                  </Avatar>
                  {(() => {
                    const { chapter, topic } = sessionChapterTopic(liveSession);
                    return (
                      <>
                        <h2 className="text-lg font-bold sm:text-xl">
                          {chapter || topic || "Live session"}
                        </h2>
                        {chapter && topic ? (
                          <p className="mt-1 text-sm text-white/90">{topic}</p>
                        ) : null}
                      </>
                    );
                  })()}
                  <p className="mt-1 text-sm text-white/80">{liveSession.tutor_name}</p>

                  <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-xs text-white/70 sm:text-sm">
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-3.5 w-3.5" />
                      {liveSession.subject}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {liveSession.attendees} attending
                    </span>
                    <span className="flex items-center gap-1">
                      <BarChart3 className="h-3.5 w-3.5" />
                      Grade {liveSession.grade}
                      {liveSession.section ? `-${liveSession.section}` : ""}
                    </span>
                  </div>
                </div>

                <div className="relative mt-4 flex justify-center">
                  <Button
                    size="sm"
                    className="h-8 bg-gradient-brand px-6"
                    disabled={joiningId === liveSession.id}
                    onClick={() => handleJoin(liveSession)}
                  >
                    {joiningId === liveSession.id ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Video className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    Join Class
                  </Button>
                </div>
              </div>
            </Card>
          )}

          <Card className="flex min-w-0 flex-col shadow-card lg:min-h-0 lg:flex-1">
            <CardContent className="flex min-w-0 flex-col p-3 sm:p-4 lg:min-h-0 lg:flex-1">
              <div className="mb-2 flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-sm font-semibold text-foreground sm:text-base">
                  Upcoming Sessions
                </h2>
                <div className="flex flex-wrap gap-1.5">
                  {filterTabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setFilter(tab.id)}
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
                        filter === tab.id
                          ? "bg-gradient-brand text-primary-foreground"
                          : "border border-border/60 bg-background text-muted-foreground hover:border-primary/30"
                      )}
                    >
                      {tab.label} ({tab.count})
                    </button>
                  ))}
                </div>
              </div>

              <div className="max-h-96 min-w-0 space-y-2 overflow-y-auto pr-0.5 lg:max-h-none lg:min-h-0 lg:flex-1">
                {isLoading ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">Loading sessions…</p>
                ) : isError ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    Could not load sessions. Try again later.
                  </p>
                ) : filteredSessions.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    {sessions.length === 0
                      ? "No sessions scheduled for your class yet."
                      : "No sessions match your search or filter."}
                  </p>
                ) : (
                  filteredSessions.map((session) => {
                    const style = subjectStyle(session.subject);
                    const Icon = style.icon;
                    const { chapter, topic } = sessionChapterTopic(session);
                    return (
                      <div
                        key={session.id}
                        className="flex items-center gap-2.5 rounded-xl border border-border/60 p-2.5 sm:gap-3"
                      >
                        <div
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white",
                            style.iconBg
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {chapter || topic || "Session"}
                          </p>
                          {chapter && topic ? (
                            <p className="truncate text-xs text-foreground/80">{topic}</p>
                          ) : null}
                          <p className="truncate text-xs text-muted-foreground">
                            {session.tutor_name}
                            {session.subject ? ` · ${session.subject}` : ""}
                          </p>
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3 shrink-0" />
                            {formatSessionTime(session.starts_at, session.duration_minutes)}
                          </p>
                        </div>
                        <Badge variant="secondary" className="hidden shrink-0 text-xs sm:inline-flex">
                          {session.duration_minutes} min
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 shrink-0 px-3 text-xs"
                          disabled
                          title="Available when the session goes live"
                        >
                          Upcoming
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-3 lg:min-h-0 lg:overflow-y-auto">
          <Card className="shadow-card">
            <CardContent className="p-3 sm:p-4">
              <h2 className="mb-3 text-sm font-semibold text-foreground sm:text-base">
                Today&apos;s Schedule
              </h2>
              {todaySchedule.length === 0 ? (
                <p className="text-sm text-muted-foreground">No sessions today.</p>
              ) : (
                <ul className="space-y-2">
                  {todaySchedule.map((s) => (
                    <li
                      key={s.id}
                      className="flex items-start gap-2 rounded-lg border border-border/60 px-2.5 py-2"
                    >
                      <span className="w-16 shrink-0 text-xs font-medium text-muted-foreground">
                        {new Date(s.starts_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <div className="min-w-0 flex-1">
                        {(() => {
                          const { chapter, topic } = sessionChapterTopic(s);
                          return (
                            <>
                              <p className="truncate text-xs font-semibold text-foreground">
                                {chapter || topic || "Session"}
                              </p>
                              {chapter && topic ? (
                                <p className="truncate text-xs text-muted-foreground">{topic}</p>
                              ) : (
                                <p className="text-xs text-muted-foreground">{s.tutor_name}</p>
                              )}
                            </>
                          );
                        })()}
                      </div>
                      {s.status === "live" && (
                        <Badge className="shrink-0 bg-red-500 text-[10px] hover:bg-red-500">LIVE</Badge>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {liveSession && liveSession.attendees > 0 && (
            <Card className="shadow-card">
              <CardContent className="p-3 sm:p-4">
                <h2 className="mb-2 text-sm font-semibold text-foreground">Attendance</h2>
                <p className="text-xs text-muted-foreground">
                  {liveSession.attendees} student{liveSession.attendees === 1 ? "" : "s"} joined
                  this live session.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </PageShell>
  );
}
