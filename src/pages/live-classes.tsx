import { useMemo, useState } from "react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  BookOpen,
  BarChart3,
  Calculator,
  ChevronDown,
  ChevronRight,
  Clock,
  FlaskConical,
  Globe,
  MessageSquare,
  MoreVertical,
  Search,
  Send,
  Users,
  Video,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AiTutorButtonIcon } from "@/components/ai-tutor-button-icon";
import { useInitialLoading } from "@/hooks/use-initial-loading";
import { SessionSkeleton } from "@/components/skeletons/student-page-skeletons";

type SessionFilter = "all" | "today" | "tomorrow" | "week";
type SessionStatus = "live" | "upcoming" | "completed";

interface LiveSession {
  id: number;
  title: string;
  subject: string;
  tutor: string;
  scheduledAt: string;
  duration: number;
  students: number;
  grade: string;
  status: SessionStatus;
  icon: typeof Calculator;
  iconBg: string;
}

const SESSIONS: LiveSession[] = [
  {
    id: 1,
    title: "Advanced Calculus – Integration",
    subject: "Mathematics",
    tutor: "Dr. Smith",
    scheduledAt: "2026-06-27T16:00:00",
    duration: 60,
    students: 24,
    grade: "Grade 9",
    status: "live",
    icon: Calculator,
    iconBg: "bg-subject-math",
  },
  {
    id: 2,
    title: "Physics Lab – Optics",
    subject: "Physics",
    tutor: "Prof. Johnson",
    scheduledAt: "2026-06-27T16:30:00",
    duration: 60,
    students: 18,
    grade: "Grade 9",
    status: "upcoming",
    icon: FlaskConical,
    iconBg: "bg-subject-science",
  },
  {
    id: 3,
    title: "Organic Chemistry Basics",
    subject: "Chemistry",
    tutor: "Dr. Lee",
    scheduledAt: "2026-06-28T10:00:00",
    duration: 60,
    students: 20,
    grade: "Grade 9",
    status: "upcoming",
    icon: FlaskConical,
    iconBg: "bg-subject-english",
  },
  {
    id: 4,
    title: "Essay Writing Workshop",
    subject: "English",
    tutor: "Ms. Davis",
    scheduledAt: "2026-06-27T11:00:00",
    duration: 45,
    students: 32,
    grade: "Grade 9",
    status: "upcoming",
    icon: Globe,
    iconBg: "bg-subject-english",
  },
];

const SCHEDULE = [
  { time: "04:00 PM", title: "Advanced Calculus – Integration", tutor: "Dr. Smith", live: true },
  { time: "05:30 PM", title: "Physics Lab – Optics", tutor: "Prof. Johnson", live: false },
  { time: "07:00 PM", title: "Essay Writing Workshop", tutor: "Ms. Davis", live: false },
];

const CHAT_MESSAGES = [
  { user: "Alice", message: "Great explanation!", time: "2 min ago", color: "bg-subject-math" },
  { user: "Bob", message: "Can you repeat that last part?", time: "1 min ago", color: "bg-subject-science" },
  { user: "Carol", message: "Thanks for the example!", time: "Just now", color: "bg-subject-english" },
];

const FILTER_TABS: { id: SessionFilter; label: string; count: number }[] = [
  { id: "all", label: "All", count: 4 },
  { id: "today", label: "Today", count: 2 },
  { id: "tomorrow", label: "Tomorrow", count: 1 },
  { id: "week", label: "This Week", count: 4 },
];

function formatSessionTime(dateStr: string) {
  const d = new Date(dateStr);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const isTomorrow = d.toDateString() === tomorrow.toDateString();

  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const end = new Date(d.getTime() + 60 * 60 * 1000);
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

export default function LiveClassesPage() {
  const loading = useInitialLoading();
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<SessionFilter>("all");
  const [chatInput, setChatInput] = useState("");

  const liveSession = SESSIONS.find((s) => s.status === "live") ?? null;

  const filteredSessions = useMemo(() => {
    return SESSIONS.filter((session) => {
      if (session.status === "live") return false;
      const matchesSearch =
        session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        session.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        session.tutor.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (filter === "all") return session.status === "upcoming";
      if (filter === "today") return isToday(session.scheduledAt);
      if (filter === "tomorrow") return isTomorrow(session.scheduledAt);
      if (filter === "week") return isThisWeek(session.scheduledAt);
      return true;
    });
  }, [searchQuery, filter]);

  if (loading) {
    return <SessionSkeleton />;
  }

  return (
    <div className="dashboard-fit flex min-h-0 flex-1 flex-col overflow-hidden p-4 md:p-5">
      {/* Header */}
      <div className="mb-3 flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">Session</h1>
          <p className="text-sm text-muted-foreground">
            Join live classes and interact with your tutor and classmates
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="relative w-full sm:w-52">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search sessions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-9"
            />
          </div>
          <Button asChild className="h-9 shrink-0 gap-2 bg-gradient-brand px-4">
            <Link href="/ai-tutor?greet=1">
              <AiTutorButtonIcon />
              <span className="hidden sm:inline">Ask AI Tutor</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-3 lg:gap-4">
        {/* Left column */}
        <div className="flex min-h-0 flex-col gap-3 overflow-y-auto lg:col-span-2 lg:overflow-hidden">
          {/* Live session hero */}
          {liveSession && (
            <Card className="shrink-0 overflow-hidden border-0 shadow-card">
              <div className="relative bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-4 sm:p-5">
                <div className="pointer-events-none absolute inset-0 opacity-10">
                  <div className="absolute left-4 top-4 text-4xl text-white">∫</div>
                  <div className="absolute right-8 top-6 text-3xl text-white">π</div>
                  <div className="absolute bottom-6 left-1/3 text-2xl text-white">Σ</div>
                </div>

                <div className="relative flex items-start justify-between gap-2">
                  <Badge className="bg-red-500 hover:bg-red-500">
                    <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-white" />
                    LIVE
                  </Badge>
                  <Badge variant="secondary" className="bg-white/10 text-white hover:bg-white/10">
                    <Clock className="mr-1 h-3 w-3" />
                    12:45 · Ends in 42 min
                  </Badge>
                </div>

                <div className="relative mt-4 flex flex-col items-center text-center text-white">
                  <Avatar className="mb-3 h-16 w-16 border-2 border-white/20">
                    <AvatarFallback className="bg-primary text-lg text-primary-foreground">
                      DS
                    </AvatarFallback>
                  </Avatar>
                  <h2 className="text-lg font-bold sm:text-xl">{liveSession.title}</h2>
                  <p className="mt-1 text-sm text-white/80">{liveSession.tutor}</p>

                  <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-xs text-white/70 sm:text-sm">
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-3.5 w-3.5" />
                      {liveSession.subject}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {liveSession.students} attending
                    </span>
                    <span className="flex items-center gap-1">
                      <BarChart3 className="h-3.5 w-3.5" />
                      {liveSession.grade}
                    </span>
                  </div>
                </div>

                <div className="relative mt-4 flex justify-center">
                  <Button size="sm" className="h-8 bg-gradient-brand px-6">
                    <Video className="mr-1.5 h-3.5 w-3.5" />
                    Join Class
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Upcoming sessions */}
          <Card className="flex min-h-0 flex-1 flex-col shadow-card">
            <CardContent className="flex min-h-0 flex-1 flex-col p-3 sm:p-4">
              <div className="mb-2 flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-sm font-semibold text-foreground sm:text-base">Upcoming Sessions</h2>
                <div className="flex flex-wrap gap-1.5">
                  {FILTER_TABS.map((tab) => (
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

              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-0.5">
                {filteredSessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center gap-2.5 rounded-xl border border-border/60 p-2.5 sm:gap-3"
                    data-testid={`session-card-${session.id}`}
                  >
                    <div
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white",
                        session.iconBg
                      )}
                    >
                      <session.icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{session.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{session.tutor}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3 shrink-0" />
                        {formatSessionTime(session.scheduledAt)}
                      </p>
                    </div>
                    <Badge variant="secondary" className="hidden shrink-0 text-xs sm:inline-flex">
                      {session.duration} min
                    </Badge>
                    <Button variant="outline" size="sm" className="h-8 shrink-0 px-3 text-xs">
                      Join
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                      <MoreVertical className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                className="mt-2 flex shrink-0 items-center justify-center gap-1 py-1 text-xs font-medium text-primary hover:underline"
              >
                View All Sessions
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </CardContent>
          </Card>
        </div>

        {/* Right sidebar */}
        <div className="flex min-h-0 flex-col gap-3 overflow-y-auto lg:overflow-hidden">
          {/* Today's schedule */}
          <Card className="shrink-0 shadow-card">
            <CardContent className="p-3 sm:p-4">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">Today&apos;s Schedule</h2>
                <button type="button" className="text-xs font-medium text-primary hover:underline">
                  View Calendar
                </button>
              </div>
              <ul className="space-y-2">
                {SCHEDULE.map((item) => (
                  <li
                    key={item.title}
                    className="flex items-center gap-2 rounded-lg border border-border/60 px-2.5 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-muted-foreground">{item.time}</span>
                        {item.live && (
                          <Badge className="h-4 bg-success/10 px-1.5 text-[10px] text-success hover:bg-success/10">
                            LIVE
                          </Badge>
                        )}
                      </div>
                      <p className="truncate text-xs font-medium text-foreground sm:text-sm">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.tutor}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Live chat */}
          <Card className="flex min-h-0 flex-1 flex-col shadow-card">
            <CardContent className="flex min-h-0 flex-1 flex-col p-3 sm:p-4">
              <div className="mb-2 flex shrink-0 items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">Live Chat</h2>
                <button type="button" className="text-xs font-medium text-primary hover:underline">
                  View All
                </button>
              </div>

              {liveSession ? (
                <>
                  <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
                    {CHAT_MESSAGES.map((msg) => (
                      <div key={msg.user} className="flex items-start gap-2">
                        <Avatar className="h-7 w-7 shrink-0">
                          <AvatarFallback className={cn("text-xs text-white", msg.color)}>
                            {msg.user.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-medium">{msg.user}</span>
                            <span className="text-[10px] text-muted-foreground">{msg.time}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{msg.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 flex shrink-0 gap-2 border-t border-border/60 pt-2">
                    <Input
                      placeholder="Type a message..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      className="h-8 text-xs"
                    />
                    <Button size="icon" className="h-8 w-8 shrink-0 bg-gradient-brand">
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center py-4 text-center">
                  <MessageSquare className="mb-2 h-8 w-8 text-muted-foreground/40" />
                  <p className="text-xs text-muted-foreground">Join a live session to chat</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Attendance */}
          <Card className="shrink-0 shadow-card">
            <CardContent className="p-3 sm:p-4">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">Attendance</h2>
                <button type="button" className="text-xs font-medium text-primary hover:underline">
                  View All
                </button>
              </div>
              {liveSession ? (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Students Attending</span>
                    <Badge variant="secondary">{liveSession.students}</Badge>
                  </div>
                  <div className="flex -space-x-2">
                    {["R", "A", "B", "C", "D", "E"].map((initial) => (
                      <Avatar key={initial} className="h-8 w-8 border-2 border-background">
                        <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                          {initial}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-muted text-xs font-medium">
                      +18
                    </div>
                  </div>
                </div>
              ) : (
                <p className="py-2 text-center text-xs text-muted-foreground">No active session</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
