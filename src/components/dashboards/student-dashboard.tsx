import { useMemo } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Calculator,
  CheckCircle2,
  ChevronRight,
  Clock,
  FlaskConical,
  Globe,
  Monitor,
  Moon,
  Play,
  Sparkles,
  Sun,
  TrendingUp,
  Trophy,
  Video,
} from "lucide-react";
import type { User } from "@/types/schema";
import { cn } from "@/lib/utils";
import { PageShell } from "@/components/page-shell";
import { AskAiTutorButton } from "@/components/ask-ai-tutor-button";
import { DashboardHeaderActions } from "@/components/dashboard-header-actions";
import { brandImages } from "@/lib/brand-images";
import { formatStudyTime, tutorResumeHref } from "@/api/learning";
import { fetchStudentLiveSessions, type LiveSessionApi } from "@/api/tutor";
import { useStudentDashboard } from "@/hooks/use-student-dashboard";
import { GlobalSearchInput } from "@/modules/search";
import { getTodaysLearningTip } from "@/data/learning-tips";
import { useTheme } from "@/lib/theme-provider";
import { isIndividualStudent } from "@/lib/app-nav-items";

interface StudentDashboardProps {
  user: User;
}

const SUBJECT_STYLE: Record<
  string,
  { icon: typeof Calculator; color: string; text: string }
> = {
  Mathematics: { icon: Calculator, color: "bg-subject-math", text: "text-subject-math" },
  English: { icon: Globe, color: "bg-subject-english", text: "text-subject-english" },
  Science: { icon: FlaskConical, color: "bg-subject-science", text: "text-subject-science" },
  "Social Studies": { icon: BookOpen, color: "bg-subject-social", text: "text-subject-social" },
  Computer: { icon: Monitor, color: "bg-subject-cs", text: "text-subject-cs" },
  "Computer Science": { icon: Monitor, color: "bg-subject-cs", text: "text-subject-cs" },
};

const FALLBACK = { icon: BookOpen, color: "bg-primary", text: "text-primary" };

const desktopThemeBtn =
  "relative h-10 w-10 shrink-0 rounded-full border border-border bg-background shadow-sm hover:bg-muted/50";

function subjectStyle(name: string) {
  return SUBJECT_STYLE[name] ?? FALLBACK;
}

function ProgressGauge({ value, size = 72 }: { value: number; size?: number }) {
  const stroke = 8;
  const clamped = Math.min(100, Math.max(0, value));
  const width = size;
  const height = size * 0.62;
  const cx = width / 2;
  const cy = height - stroke / 2;
  const radius = (width - stroke) / 2;
  // ponytail: semicircle gauge; swap to full ring if we need more than one KPI in this card
  const arcLen = Math.PI * radius;
  const offset = arcLen - (clamped / 100) * arcLen;
  const gradId = "overallProgressGauge";

  return (
    <div className="relative shrink-0" style={{ width, height }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#4F6EF7" />
            <stop offset="55%" stopColor="#6C4CF7" />
            <stop offset="100%" stopColor="#8B4CF7" />
          </linearGradient>
        </defs>
        <path
          d={`M ${stroke / 2} ${cy} A ${radius} ${radius} 0 0 1 ${width - stroke / 2} ${cy}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          className="text-muted/35"
        />
        <path
          d={`M ${stroke / 2} ${cy} A ${radius} ${radius} 0 0 1 ${width - stroke / 2} ${cy}`}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={arcLen}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center justify-end pb-0.5">
        <span className="text-lg font-bold leading-none tabular-nums text-foreground">
          {clamped}%
        </span>
      </div>
    </div>
  );
}

function StatCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <Card className={cn("hover:translate-y-0 hover:shadow-card shadow-card", className)}>
      <CardContent className="p-3 sm:p-4">{children}</CardContent>
    </Card>
  );
}

function isSameDay(dateStr: string, day: Date) {
  return new Date(dateStr).toDateString() === day.toDateString();
}

function sessionLabel(session: LiveSessionApi) {
  const chapter = session.chapter?.trim();
  const topic = session.title?.trim();
  return chapter || topic || "Session";
}

function formatSessionWhen(dateStr: string, durationMinutes: number) {
  const d = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const end = new Date(d.getTime() + durationMinutes * 60_000);
  const endTime = end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (isSameDay(dateStr, today)) return `Today ${time} – ${endTime}`;
  if (isSameDay(dateStr, tomorrow)) return `Tomorrow ${time} – ${endTime}`;
  return `${d.toLocaleDateString([], { month: "short", day: "numeric" })} ${time}`;
}

export default function StudentDashboard({ user }: StudentDashboardProps) {
  const firstName = user.fullName?.split(" ")[0] || "Student";
  const { theme, toggleTheme } = useTheme();
  const individual = isIndividualStudent(user.role, user.schoolId, user.createdBy);
  const { data } = useStudentDashboard();
  const { data: sessions = [] } = useQuery({
    queryKey: ["student", "live-sessions"],
    queryFn: fetchStudentLiveSessions,
    staleTime: 60 * 1000,
    enabled: !individual,
  });
  const stats = data?.stats;
  const subjects = data?.subjects ?? [];
  const continueLearning = data?.continue_learning ?? null;
  // ponytail: cap at 10 on the client; bump if the summary API grows a limit param
  const recentLessons = individual
    ? (data?.recent_lessons ?? []).slice(0, 10)
    : (data?.recent_lessons ?? []);
  const overallProgress = data?.overall_progress ?? 0;
  const totalChapters = data?.total_chapters ?? 0;
  const continueHref = continueLearning
    ? tutorResumeHref({
        board: continueLearning.board,
        class_level: continueLearning.class_level,
        subject_name: continueLearning.subject_name,
        subject_id: continueLearning.subject_id,
        chapter_id: continueLearning.chapter_id,
        chapter_name: continueLearning.chapter_name,
        greet: true,
      })
    : "/ai-learning-studio";

  const sessionsToday = useMemo(
    () =>
      sessions
        .filter((s) => isSameDay(s.starts_at, new Date()) && s.status !== "completed")
        .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
        .slice(0, 2),
    [sessions]
  );

  const upcomingSessions = useMemo(
    () =>
      sessions
        .filter((s) => s.status === "upcoming" && !isSameDay(s.starts_at, new Date()))
        .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
        .slice(0, 2),
    [sessions]
  );

  return (
    <PageShell className="overflow-x-hidden student-dashboard">
      <div className="flex shrink-0 items-start justify-between gap-2 sm:gap-3 lg:items-center lg:gap-4">
        <div className="min-w-0 flex-1 space-y-0.5">
          <h1 className="truncate text-xl font-bold text-foreground sm:text-2xl">
            Welcome back, {firstName}!
          </h1>
          <p className="text-sm text-muted-foreground">
            Keep learning and growing every day.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <GlobalSearchInput
            placeholder="Search subjects, lessons, sessions..."
            className="hidden lg:block lg:w-64 xl:w-72"
            data-testid="student-dashboard-search"
          />
          <AskAiTutorButton className="h-8 shrink-0 px-3 sm:h-9 sm:px-4" />
          <DashboardHeaderActions
            className="hidden lg:flex"
            leading={
              <Button
                variant="outline"
                size="icon"
                className={desktopThemeBtn}
                onClick={toggleTheme}
                aria-label="Toggle light or dark mode"
                data-testid="student-dashboard-theme-toggle"
              >
                {theme === "light" ? (
                  <Moon className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Sun className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            }
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
        <StatCard>
          <p className="text-sm font-medium text-muted-foreground">Overall Progress</p>
          <div className="mt-1.5 flex flex-wrap items-end gap-3">
            <ProgressGauge value={overallProgress} />
            <p className="mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground sm:text-sm">
              <TrendingUp className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
              <span>
                {stats?.enrolled_subjects ?? 0} enrolled subject
                {(stats?.enrolled_subjects ?? 0) === 1 ? "" : "s"}
              </span>
            </p>
          </div>
        </StatCard>

        <StatCard>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-medium text-muted-foreground">Lessons Completed</p>
              <p className="mt-1 text-xl font-bold text-foreground">
                {stats?.lessons_completed ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">
                of {totalChapters} chapters
              </p>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <BookOpen className="h-4 w-4 text-primary" />
            </div>
          </div>
          <Progress
            value={totalChapters ? Math.round(((stats?.lessons_completed ?? 0) / totalChapters) * 100) : 0}
            className="mt-2 h-1.5"
          />
        </StatCard>

        <StatCard>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Study Time</p>
              <p className="mt-1 text-xl font-bold text-foreground">
                {formatStudyTime(stats?.total_study_seconds ?? 0)}
              </p>
              <p className="text-xs text-muted-foreground">AI Tutor + Voice</p>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950/40">
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
          </div>
        </StatCard>

        <StatCard>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-medium text-muted-foreground">Current Streak</p>
              <p className="mt-1 text-xl font-bold text-foreground">
                {stats?.current_streak ?? 0} day{(stats?.current_streak ?? 0) === 1 ? "" : "s"}
              </p>
              <Link href="/my-learning" className="mt-1 inline-flex text-xs font-medium text-primary hover:underline">
                View My Learning
              </Link>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950/40">
              <Trophy className="h-4 w-4 text-blue-600" />
            </div>
          </div>
        </StatCard>
      </div>

      <div className="grid items-start gap-3 lg:grid-cols-5 lg:gap-3">
        <div className="order-1 lg:col-span-3">
          <Card className="hover:translate-y-0 hover:shadow-card shadow-card">
            <CardContent className="p-4 lg:p-4">
              <h2 className="mb-3 text-sm font-semibold text-foreground sm:text-base">
                Learning Progress
              </h2>
              {subjects.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No subjects assigned to your class yet.
                </p>
              ) : (
                <div
                  className="grid grid-cols-2 gap-2 sm:gap-3 sm:[grid-template-columns:repeat(var(--subject-count),minmax(0,1fr))]"
                  style={
                    {
                      ["--subject-count" as string]: subjects.length,
                    } as React.CSSProperties
                  }
                >
                  {subjects.map((subject) => {
                    const style = subjectStyle(subject.subject_name);
                    const Icon = style.icon;
                    return (
                      <div
                        key={subject.id}
                        className="flex min-w-0 flex-col items-center rounded-xl border border-border/60 bg-muted/20 p-2 text-center sm:p-2.5"
                      >
                        <div
                          className={cn(
                            "mb-1.5 flex h-8 w-8 items-center justify-center rounded-lg",
                            style.color
                          )}
                        >
                          <Icon className="h-4 w-4 text-white" />
                        </div>
                        <p className="w-full truncate text-[11px] font-medium text-foreground sm:text-xs">
                          {subject.subject_name}
                        </p>
                        <p className={cn("mt-0.5 text-sm font-bold", style.text)}>
                          {subject.progress}%
                        </p>
                        <Progress
                          value={subject.progress}
                          className="mt-2 h-1.5 w-full"
                        />
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          {subject.completed_chapters}/{subject.total_chapters}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mt-5 border-t border-border/60 pt-4 lg:mt-4 lg:pt-4">
                <div className="mb-4 flex items-center justify-between gap-2 lg:mb-3">
                  <h2 className="text-sm font-semibold text-foreground sm:text-base">My Latest Learning</h2>
                  <Link
                    href="/my-learning"
                    className="shrink-0 text-xs font-medium text-primary hover:underline sm:text-sm"
                  >
                    View All
                  </Link>
                </div>
                <div className="grid grid-cols-[6.5rem_1fr] items-center gap-3 sm:grid-cols-[10.5rem_1fr] sm:gap-4 lg:grid-cols-[11.5rem_1fr]">
                  <div className="flex aspect-square w-full max-w-[11.5rem] shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#EEF2FF] dark:bg-primary/10">
                    <img
                      src={brandImages.book}
                      alt="Learning illustration"
                      className="h-[92%] w-[92%] object-contain"
                    />
                  </div>
                  <div className="min-w-0">
                    {continueLearning ? (
                      <>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                          <h3 className="min-w-0 flex-1 text-sm font-bold leading-snug text-foreground sm:text-base">
                            {continueLearning.chapter_name || "Continue chapter"}
                          </h3>
                          <Button
                            asChild
                            className="h-8 shrink-0 rounded-xl bg-gradient-brand px-3 text-xs sm:h-9 sm:px-4 sm:text-sm"
                          >
                            <Link href={continueHref} className="inline-flex items-center gap-1.5 sm:gap-2">
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/25">
                                <Play className="h-2.5 w-2.5 fill-white text-white" />
                              </span>
                              Continue Lesson
                            </Link>
                          </Button>
                        </div>
                        <Badge className="mt-2 w-fit border-0 bg-primary/10 text-primary hover:bg-primary/10">
                          {continueLearning.subject_name}
                        </Badge>
                        <div className="mt-3 flex items-center gap-2.5">
                          <span className="shrink-0 text-xs text-muted-foreground sm:text-sm">
                            {continueLearning.progress}% complete
                          </span>
                          <Progress
                            value={continueLearning.progress}
                            className="h-2 flex-1 [&>div]:bg-gradient-brand"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <h3 className="text-sm font-bold leading-snug text-foreground sm:text-base">
                          Start learning with AI Tutor
                        </h3>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Pick a subject from your class to begin.
                        </p>
                        <Button
                          asChild
                          className="mt-4 h-9 w-auto min-w-[9rem] rounded-xl bg-gradient-brand px-4 sm:h-10 sm:min-w-[11rem] sm:px-6"
                        >
                          <Link href="/ai-learning-studio">Go to AI Tutor</Link>
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="order-2 grid gap-3 lg:col-span-2 lg:row-span-2">
          <Card className="hover:translate-y-0 hover:shadow-card shadow-card">
            <CardContent className="p-4 lg:p-3">
              <div className="mb-3 flex items-center justify-between gap-2 lg:mb-2">
                <h2 className="text-sm font-semibold text-foreground sm:text-base">Recent Lessons</h2>
                <Link
                  href="/my-learning"
                  className="shrink-0 text-xs font-medium text-primary hover:underline sm:text-sm"
                >
                  View All
                </Link>
              </div>
              <ul className="max-h-[22rem] space-y-2 overflow-y-auto pr-0.5">
                {recentLessons.length === 0 ? (
                  <li className="text-sm text-muted-foreground">No recent lessons yet.</li>
                ) : (
                  recentLessons.map((lesson) => (
                    <li key={`${lesson.subject_id}-${lesson.chapter_id}`}>
                      <Link
                        href={tutorResumeHref({
                          board: lesson.board,
                          class_level: lesson.class_level,
                          subject_name: lesson.subject_name,
                          subject_id: lesson.subject_id,
                          chapter_id: lesson.chapter_id,
                          chapter_name: lesson.chapter_name,
                        })}
                      >
                        <div className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5 transition-colors hover:border-primary/30">
                          {lesson.status === "completed" ? (
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                          ) : (
                            <Play className="h-4 w-4 shrink-0 text-muted-foreground" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">
                              {lesson.chapter_name || lesson.file_name || lesson.subject_name}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {lesson.subject_name}
                            </p>
                          </div>
                        </div>
                      </Link>
                    </li>
                  ))
                )}
              </ul>
            </CardContent>
          </Card>

          {!individual && sessionsToday.length > 0 ? (
            <Card className="hover:translate-y-0 hover:shadow-card shadow-card">
              <CardContent className="p-4 lg:p-3">
                <div className="mb-3 flex items-center justify-between gap-2 lg:mb-2">
                  <h2 className="text-sm font-semibold text-foreground sm:text-base">
                    Today&apos;s Session
                  </h2>
                  <Link
                    href="/live-classes"
                    className="shrink-0 text-xs font-medium text-primary hover:underline sm:text-sm"
                  >
                    View All
                  </Link>
                </div>
                <ul className="space-y-2">
                  {sessionsToday.map((session) => (
                    <li key={session.id}>
                      <Link href="/live-classes">
                        <div className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5 transition-colors hover:border-primary/30">
                          <Video className="h-4 w-4 shrink-0 text-primary" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">
                              {sessionLabel(session)}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {session.tutor_name}
                              {session.subject ? ` · ${session.subject}` : ""}
                            </p>
                            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3 shrink-0" />
                              {formatSessionWhen(session.starts_at, session.duration_minutes)}
                            </p>
                          </div>
                          {session.status === "live" ? (
                            <Badge className="shrink-0 bg-red-500 text-[10px] hover:bg-red-500">
                              LIVE
                            </Badge>
                          ) : null}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          {!individual ? (
            <Card className="hover:translate-y-0 hover:shadow-card shadow-card">
              <CardContent className="p-4 lg:p-3">
                <div className="mb-3 flex items-center justify-between gap-2 lg:mb-2">
                  <h2 className="text-sm font-semibold text-foreground sm:text-base">
                    Upcoming Session
                  </h2>
                  <Link
                    href="/live-classes"
                    className="shrink-0 text-xs font-medium text-primary hover:underline sm:text-sm"
                  >
                    View All
                  </Link>
                </div>
                <ul className="space-y-2">
                  {upcomingSessions.length === 0 ? (
                    <li className="text-sm text-muted-foreground">No upcoming sessions.</li>
                  ) : (
                    upcomingSessions.map((session) => (
                      <li key={session.id}>
                        <Link href="/live-classes">
                          <div className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5 transition-colors hover:border-primary/30">
                            <Video className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-foreground">
                                {sessionLabel(session)}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {session.tutor_name}
                                {session.subject ? ` · ${session.subject}` : ""}
                              </p>
                              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3 shrink-0" />
                                {formatSessionWhen(session.starts_at, session.duration_minutes)}
                              </p>
                            </div>
                          </div>
                        </Link>
                      </li>
                    ))
                  )}
                </ul>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <Card className="order-3 overflow-hidden border-0 bg-gradient-to-r from-primary/10 via-accent/10 to-brand-secondary/10 hover:translate-y-0 hover:shadow-card shadow-card lg:col-span-3">
          <CardContent className="flex flex-row items-center gap-3 p-3 sm:gap-4 sm:p-4 lg:gap-3 lg:p-3">
            <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded-lg sm:h-16 sm:w-28 lg:h-14 lg:w-24">
              <img
                src={brandImages.chatbot}
                alt=""
                aria-hidden
                className="h-full w-full object-contain object-center p-1"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" />
                Today&apos;s Learning Tip
              </p>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground sm:text-sm">
                {getTodaysLearningTip()}
              </p>
            </div>
            <Button asChild variant="outline" className="h-9 w-auto shrink-0 bg-card/80 px-3">
              <Link href="/ai-learning-studio">
                Start Now
                <ChevronRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
