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
  ChevronRight,
  Clock,
  FlaskConical,
  Globe,
  Monitor,
  Play,
  Sparkles,
  TrendingUp,
  Trophy,
  Video,
} from "lucide-react";
import type { User } from "@/types/schema";
import { cn, cleanDisplayText } from "@/lib/utils";
import { PageShell } from "@/components/page-shell";
import { AskAiTutorButton } from "@/components/ask-ai-tutor-button";
import { DashboardHeaderActions } from "@/components/dashboard-header-actions";
import { brandImages } from "@/lib/brand-images";
import { formatStudyTime, tutorResumeHref } from "@/api/learning";
import { fetchStudentLiveSessions, type LiveSessionApi } from "@/api/tutor";
import { useStudentDashboard } from "@/hooks/use-student-dashboard";
import { GlobalSearchInput } from "@/modules/search";
import { getTodaysLearningTip } from "@/data/learning-tips";
import { isIndividualStudent } from "@/lib/app-nav-items";
import { chapterSelectionPath } from "@/lib/tutor-chapter-nav";

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


const STATUS_LABEL = { not_started: "Not started", in_progress: "In progress", completed: "Completed" } as const;

/** "Unit 1: Family" -> { unit: "Unit 1", title: "Family" }; anything else stays whole. */
function splitChapterTitle(name: string): { unit: string | null; title: string } {
  const m = name.match(/^((?:unit|chapter|lesson)\s*\d+[a-z]?)\s*[:.\-–]\s*(.+)$/i);
  return m ? { unit: m[1], title: m[2] } : { unit: null, title: name };
}

function subjectStyle(name: string) {
  return SUBJECT_STYLE[name] ?? FALLBACK;
}

function ProgressGauge({ value, size = 72 }: { value: number; size?: number }) {
  const stroke = 8;
  const clamped = Math.min(100, Math.max(0, value));
  const width = size;
  const height = size * 0.62;
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
  const continueTitle = splitChapterTitle(cleanDisplayText(continueLearning?.chapter_name) || "Continue chapter");
  const upNext = (data?.recent_lessons ?? [])
    .filter((l) => l.chapter_id !== continueLearning?.chapter_id)
    .slice(0, 2);


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
          <h1 className="line-clamp-2 text-xl font-bold text-foreground sm:text-2xl lg:line-clamp-1">
            Welcome back, {firstName}!
          </h1>
          <p className="hidden text-sm text-muted-foreground sm:block">
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
          <DashboardHeaderActions className="hidden lg:flex" />
        </div>
      </div>

      <div className="grid auto-rows-fr grid-cols-2 gap-3 lg:auto-rows-auto xl:grid-cols-4">
        <StatCard>
          <p className="text-xs font-medium leading-snug text-muted-foreground lg:text-sm">Overall Progress</p>
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
              <p className="text-xs font-medium leading-snug text-muted-foreground lg:text-sm">Lessons Completed</p>
              <p className="mt-1 text-2xl font-bold text-foreground lg:text-xl">
                {stats?.lessons_completed ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">
                of {totalChapters} chapters
              </p>
            </div>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg lg:h-9 lg:w-9 bg-primary/10">
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
              <p className="text-xs font-medium leading-snug text-muted-foreground lg:text-sm">Total Study Time</p>
              <p className="mt-1 text-2xl font-bold text-foreground lg:text-xl">
                {formatStudyTime(stats?.total_study_seconds ?? 0)}
              </p>
              <p className="text-xs text-muted-foreground">Learn Mastro + Voice</p>
            </div>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg lg:h-9 lg:w-9 bg-amber-100 dark:bg-amber-950/40">
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
          </div>
        </StatCard>

        <StatCard>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-medium leading-snug text-muted-foreground lg:text-sm">Current Streak</p>
              <p className="mt-1 text-2xl font-bold text-foreground lg:text-xl">
                {stats?.current_streak ?? 0} day{(stats?.current_streak ?? 0) === 1 ? "" : "s"}
              </p>
              <Link href="/my-learning" className="mt-1 inline-flex text-xs font-medium text-primary hover:underline">
                View My Learning
              </Link>
            </div>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg lg:h-9 lg:w-9 bg-blue-100 dark:bg-blue-950/40">
              <Trophy className="h-4 w-4 text-blue-600" />
            </div>
          </div>
        </StatCard>
      </div>

      <div
        className={cn(
          "grid gap-3 lg:grid-cols-5 lg:gap-3",
          individual ? "lg:items-stretch" : "items-start",
        )}
      >
        <div className={cn("order-1", individual ? "lg:col-span-5" : "lg:col-span-3")}>
          <Card className="hover:translate-y-0 hover:shadow-card shadow-card max-sm:border-0 max-sm:bg-transparent max-sm:shadow-none max-sm:hover:shadow-none">
            <CardContent className="p-4 lg:p-4 max-sm:p-0">
              <div className="hidden sm:block">
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
                        className="flex min-w-0 flex-col items-center rounded-xl border border-border/60 bg-card p-2 text-center shadow-card transition-shadow hover:shadow-card-hover sm:p-2.5"
                      >
                        <div
                          className={cn(
                            "mb-1.5 flex h-8 w-8 items-center justify-center rounded-lg",
                            style.color
                          )}
                        >
                          <Icon className="h-4 w-4 text-white" />
                        </div>
                        <p className="w-full truncate text-xs font-medium text-foreground">
                          {subject.subject_name}
                        </p>
                        <p className={cn("mt-0.5 text-sm font-bold", style.text)}>
                          {subject.progress}%
                        </p>
                        <Progress
                          value={subject.progress}
                          className="mt-2 h-1.5 w-full"
                        />
                        <p className="mt-1 text-xs text-muted-foreground lg:text-[10px]">
                          {subject.completed_chapters}/{subject.total_chapters}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
              </div>

              <div className="border-border/60 sm:mt-5 sm:border-t sm:pt-4 lg:mt-4 lg:pt-4">
                <div className="mb-4 flex items-center justify-between gap-2 lg:mb-3">
                  <h2 className="text-sm font-semibold text-foreground sm:text-base">My Latest Learning</h2>
                  <Link
                    href="/my-learning"
                    className="shrink-0 text-xs font-medium text-primary hover:underline sm:text-sm"
                  >
                    View All
                  </Link>
                </div>
                <div className={cn("grid gap-3", upNext.length > 0 && "lg:grid-cols-2")}>
                  <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-3 shadow-card sm:gap-4 sm:p-4">
                    <div className="flex aspect-square w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#EEF2FF] dark:bg-primary/10 sm:w-36">
                      <img src={brandImages.book} alt="" className="h-[88%] w-[88%] object-contain" />
                    </div>
                    <div className="min-w-0 flex-1">
                      {continueLearning ? (
                        <>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {continueTitle.unit ? (
                              <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary lg:text-[11px]">
                                {continueTitle.unit}
                              </span>
                            ) : null}
                            <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground/80 lg:text-[11px]">
                              {continueLearning.subject_name}
                            </span>
                          </div>
                          <h3 className="mt-1.5 line-clamp-2 text-sm font-bold leading-snug text-foreground sm:text-base">
                            {continueTitle.title}
                          </h3>
                          <div className="mt-2 flex items-center gap-2.5">
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {continueLearning.progress}% complete
                            </span>
                            <Progress
                              value={continueLearning.progress}
                              className="h-1.5 flex-1 [&>div]:bg-gradient-brand"
                            />
                          </div>
                          <div className="mt-3 flex items-center gap-2 sm:flex-wrap sm:justify-between">
                            <Button
                              asChild
                              className="h-8 min-w-0 flex-1 rounded-full bg-gradient-brand px-2 text-xs sm:h-9 sm:flex-none sm:px-4 sm:text-sm"
                            >
                              <Link href={continueHref} className="inline-flex items-center gap-1.5 sm:gap-2">
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/25">
                                  <Play className="h-2.5 w-2.5 fill-white text-white" />
                                </span>
                                Continue<span className="hidden sm:inline"> Learning</span>
                              </Link>
                            </Button>
                            <Button
                              asChild
                              variant="secondary"
                              className="h-8 min-w-0 flex-1 rounded-full px-2 text-xs sm:h-9 sm:flex-none sm:px-4 sm:text-sm"
                            >
                              <Link href={chapterSelectionPath(String(continueLearning.subject_id))}>
                                <span className="hidden sm:inline">View </span>Details
                                <ChevronRight className="ml-1 h-3.5 w-3.5" />
                              </Link>
                            </Button>
                          </div>
                        </>
                      ) : (
                        <>
                          <h3 className="text-sm font-bold leading-snug text-foreground sm:text-base">
                            Start learning with Learn Mastro
                          </h3>
                          <p className="mt-1.5 text-xs text-muted-foreground">
                            Pick a subject from your class to begin.
                          </p>
                          <Button asChild className="mt-3 h-9 rounded-full bg-gradient-brand px-4">
                            <Link href="/ai-learning-studio">Go to Learn Mastro</Link>
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {upNext.length > 0 ? (
                    <ul className="flex flex-col gap-2">
                      {upNext.map((lesson) => {
                        const style = subjectStyle(lesson.subject_name);
                        const Icon = style.icon;
                        return (
                          <li key={`${lesson.subject_id}-${lesson.chapter_id}`} className="flex-1">
                            <Link
                              href={tutorResumeHref({
                                board: lesson.board,
                                class_level: lesson.class_level,
                                subject_name: lesson.subject_name,
                                subject_id: lesson.subject_id,
                                chapter_id: lesson.chapter_id,
                                chapter_name: lesson.chapter_name,
                              })}
                              className="flex h-full items-center gap-3 rounded-2xl border border-border/60 bg-card px-3 py-2.5 shadow-card transition-shadow hover:shadow-card-hover"
                            >
                              <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", style.color)}>
                                <Icon className="h-4 w-4 text-white" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-foreground">
                                  {cleanDisplayText(lesson.chapter_name) || "Chapter"}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">
                                  {lesson.subject_name} • {STATUS_LABEL[lesson.status]}
                                </p>
                                <div className="mt-1 flex items-center gap-2">
                                  <Progress value={lesson.progress} className="h-1.5 flex-1 [&>div]:bg-gradient-brand" />
                                  <span className="w-8 shrink-0 text-right text-xs tabular-nums text-muted-foreground lg:text-[11px]">
                                    {lesson.progress}%
                                  </span>
                                </div>
                              </div>
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                                <Play className="h-3.5 w-3.5 fill-primary text-primary" />
                              </span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {!individual ? (
          <div className="order-2 grid gap-3 lg:col-span-2 lg:row-span-2">
            {sessionsToday.length > 0 ? (
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
                            <Badge className="shrink-0 bg-red-500 text-xs hover:bg-red-500 lg:text-[10px]">
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
          </div>
        ) : null}
        <Card className={cn(
          "order-3 overflow-hidden border-0 bg-gradient-to-r from-primary/10 via-accent/10 to-brand-secondary/10 hover:translate-y-0 hover:shadow-card shadow-card",
          individual ? "lg:col-span-5" : "lg:col-span-3",
        )}>
          <CardContent className="flex flex-row items-center gap-3 p-3 sm:gap-4 sm:p-4 lg:gap-3 lg:p-3">
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg sm:h-16 sm:w-28 lg:h-14 lg:w-24">
              <img
                src={brandImages.chatbot}
                alt=""
                aria-hidden
                className="h-full w-full object-contain object-center p-1"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold text-foreground">
                <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" />
                Today&apos;s Learning Tip
              </p>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground sm:text-sm">
                {getTodaysLearningTip()}
              </p>
            </div>
            <Button asChild variant="ghost" className="h-9 w-auto shrink-0 px-2 text-primary hover:bg-transparent hover:underline">
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
