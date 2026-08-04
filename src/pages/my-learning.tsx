import { useMemo, useState } from "react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  BookOpen,
  Calculator,
  CheckCircle2,
  ChevronRight,
  Clock,
  FlaskConical,
  Globe,
  GraduationCap,
  Monitor,
  Play,
  Search,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageShell } from "@/components/page-shell";
import { AskAiTutorButton } from "@/components/ask-ai-tutor-button";
import { formatStudyTime, tutorResumeHref, type LearningSubjectApi } from "@/api/learning";
import { useLearningOverview } from "@/hooks/use-learning-overview";
import { chapterSelectionPath } from "@/lib/tutor-chapter-nav";

type SubjectFilter = "all" | "in_progress" | "not_started" | "completed";

const FILTER_TABS: { id: SubjectFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "in_progress", label: "In Progress" },
  { id: "not_started", label: "Not Started" },
  { id: "completed", label: "Completed" },
];

const SUBJECT_STYLE: Record<
  string,
  { icon: typeof Calculator; color: string; barClass: string }
> = {
  Mathematics: {
    icon: Calculator,
    color: "bg-subject-math",
    barClass: "[&>div]:bg-subject-math",
  },
  English: {
    icon: Globe,
    color: "bg-subject-english",
    barClass: "[&>div]:bg-subject-english",
  },
  Science: {
    icon: FlaskConical,
    color: "bg-subject-science",
    barClass: "[&>div]:bg-subject-science",
  },
  "Social Studies": {
    icon: BookOpen,
    color: "bg-subject-social",
    barClass: "[&>div]:bg-subject-social",
  },
  Computer: {
    icon: Monitor,
    color: "bg-subject-cs",
    barClass: "[&>div]:bg-subject-cs",
  },
  "Computer Science": {
    icon: Monitor,
    color: "bg-subject-cs",
    barClass: "[&>div]:bg-subject-cs",
  },
};

const FALLBACK_STYLE = {
  icon: BookOpen,
  color: "bg-primary",
  barClass: "[&>div]:bg-primary",
};

function subjectStyle(name: string) {
  return SUBJECT_STYLE[name] ?? FALLBACK_STYLE;
}

function topicLabel(subject: LearningSubjectApi): string {
  const inProgress = subject.chapters.find((c) => c.status === "in_progress");
  if (inProgress) {
    const pct = inProgress.progress ?? 0;
    const name = inProgress.chapter || "Current chapter";
    return pct > 0 ? `${name} · ${pct}%` : name;
  }
  const next = subject.chapters.find((c) => c.status === "not_started");
  if (next?.chapter) return next.chapter;
  return subject.chapters[0]?.chapter || "No chapters yet";
}

export default function MyLearningPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<SubjectFilter>("all");
  const { data, isLoading, isError } = useLearningOverview();

  const subjects = data?.subjects ?? [];
  const stats = data?.stats;
  const recentLessons = data?.recent_lessons ?? [];

  const filteredSubjects = useMemo(() => {
    return subjects.filter((subject) => {
      const topic = topicLabel(subject);
      const matchesSearch =
        subject.subject_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        topic.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = filter === "all" || subject.status === filter;
      return matchesSearch && matchesFilter;
    });
  }, [subjects, searchQuery, filter]);

  const overviewStats = [
    {
      label: "Enrolled Subjects",
      value: stats
        ? `${stats.enrolled_subjects} subject${stats.enrolled_subjects === 1 ? "" : "s"}`
        : "—",
      icon: GraduationCap,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
    },
    {
      label: "Lessons Completed",
      value: stats ? String(stats.lessons_completed) : "—",
      icon: TrendingUp,
      iconBg: "bg-success/10",
      iconColor: "text-success",
    },
    {
      label: "Total Study Time",
      value: stats ? formatStudyTime(stats.total_study_seconds) : "—",
      icon: Clock,
      iconBg: "bg-amber-100 dark:bg-amber-950/40",
      iconColor: "text-amber-600",
    },
    {
      label: "Current Streak",
      value: stats
        ? `${stats.current_streak} day${stats.current_streak === 1 ? "" : "s"}`
        : "—",
      icon: Trophy,
      iconBg: "bg-blue-100 dark:bg-blue-950/40",
      iconColor: "text-blue-600",
    },
  ];

  return (
    <PageShell
      className="overflow-x-hidden lg:overflow-hidden"
      contentClassName="min-h-0 flex-1"
    >
      <div className="flex min-w-0 shrink-0 flex-col gap-2">
        <div className="flex min-w-0 items-start justify-between gap-2 sm:gap-3 lg:items-center lg:gap-4">
          <div className="min-w-0 flex-1 space-y-0.5">
            <h1 className="truncate text-xl font-bold text-foreground sm:text-2xl">My Learning</h1>
            <p className="text-sm text-muted-foreground">
              Your personalized learning path and progress
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="relative hidden lg:block lg:w-64 xl:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search topics, lessons..."
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
            placeholder="Search topics, lessons..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 min-w-0 pl-8 text-sm"
          />
        </div>
      </div>

      <Card className="min-w-0 shrink-0 shadow-card">
        <CardContent className="grid grid-cols-2 gap-2 p-3 sm:gap-3 xl:grid-cols-4">
          {overviewStats.map((stat) => (
            <div key={stat.label} className="flex min-w-0 items-center gap-2">
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:h-9 sm:w-9",
                  stat.iconBg
                )}
              >
                <stat.icon className={cn("h-4 w-4", stat.iconColor)} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs text-muted-foreground">{stat.label}</p>
                <p className="truncate text-sm font-semibold text-foreground">{stat.value}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid min-w-0 gap-3 lg:min-h-0 lg:flex-1 lg:grid-cols-3 lg:gap-4 lg:overflow-hidden">
        <Card className="order-1 flex min-w-0 flex-col shadow-card lg:col-span-2 lg:min-h-0 lg:flex-1">
          <CardContent className="flex min-w-0 flex-col p-3 sm:p-4 lg:min-h-0 lg:flex-1">
            <div className="mb-2 flex min-w-0 shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-sm font-semibold text-foreground sm:text-base">Your Subjects</h2>
              <div className="flex min-w-0 flex-wrap gap-1.5">
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
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="min-w-0 space-y-2 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-0.5">
              {isLoading ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Loading subjects…</p>
              ) : isError ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Could not load your subjects. Try again later.
                </p>
              ) : filteredSubjects.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  {subjects.length === 0
                    ? "No subjects assigned to your class yet. Ask your teacher or school admin."
                    : "No subjects match your search or filter."}
                </p>
              ) : (
                filteredSubjects.map((subject) => {
                  const style = subjectStyle(subject.subject_name);
                  const Icon = style.icon;
                  return (
                    <Link
                      key={subject.id}
                        href={chapterSelectionPath(String(subject.id), { from: "my-learning" })}
                      className="block min-w-0"
                    >
                      <div className="group flex min-w-0 cursor-pointer items-center gap-2 rounded-xl border border-border/60 p-2.5 transition-all hover:border-primary/30 hover:bg-muted/20 sm:gap-3">
                        <div
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white",
                            style.color
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 items-center justify-between gap-2">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {subject.subject_name}
                            </p>
                            <span className="shrink-0 text-xs font-semibold text-foreground">
                              {subject.progress}%
                            </span>
                          </div>
                          <p className="truncate text-xs text-muted-foreground">
                            {topicLabel(subject)} · {subject.completed_chapters}/
                            {subject.total_chapters} chapters done
                          </p>
                          <Progress
                            value={subject.progress}
                            className={cn("mt-1.5 h-1.5", style.barClass)}
                          />
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="order-2 flex min-w-0 flex-col shadow-card lg:row-span-2 lg:min-h-0 lg:flex-1">
          <CardContent className="flex min-w-0 flex-col p-3 sm:p-4 lg:min-h-0 lg:flex-1">
            <div className="mb-2 flex min-w-0 shrink-0 items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-foreground sm:text-base">
                Recent Lessons
              </h2>
              <Link
                href="/ai-learning-studio"
                className="shrink-0 text-xs font-medium text-primary hover:underline"
              >
                View All
              </Link>
            </div>

            <ul className="max-h-72 min-w-0 space-y-2 overflow-y-auto pr-0.5 sm:max-h-96 lg:max-h-none lg:min-h-0 lg:flex-1">
              {recentLessons.length === 0 ? (
                <li className="py-4 text-center text-sm text-muted-foreground">
                  No recent lessons yet.
                </li>
              ) : (
                recentLessons.map((lesson) => {
                  const style = subjectStyle(lesson.subject_name);
                  const Icon = style.icon;
                  const href = tutorResumeHref({
                    board: lesson.board,
                    class_level: lesson.class_level,
                    subject_name: lesson.subject_name,
                    subject_id: lesson.subject_id,
                    chapter_id: lesson.chapter_id,
                    chapter_name: lesson.chapter_name,
                  });
                  return (
                    <li key={`${lesson.subject_id}-${lesson.chapter_id}`} className="min-w-0">
                      <Link href={href} className="block min-w-0">
                        <div className="flex min-w-0 items-center gap-2.5 rounded-lg border border-border/60 bg-muted/20 px-2.5 py-2 transition-colors hover:border-primary/30">
                          <div
                            className={cn(
                              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white",
                              style.color
                            )}
                          >
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium text-foreground sm:text-sm">
                              {lesson.chapter_name || "Chapter"}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {lesson.subject_name}
                            </p>
                          </div>
                          {lesson.status === "completed" ? (
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                          ) : (
                            <Play className="h-4 w-4 shrink-0 text-muted-foreground" />
                          )}
                        </div>
                      </Link>
                    </li>
                  );
                })
              )}
            </ul>
          </CardContent>
        </Card>

        <Card className="order-3 min-w-0 shrink-0 self-start overflow-hidden border-0 bg-gradient-to-r from-primary/10 via-accent/10 to-brand-secondary/10 shadow-card lg:col-span-2">
          <CardContent className="flex min-w-0 flex-row items-center gap-3 p-3">
            <img
              src="/login-right.png"
              alt=""
              aria-hidden
              className="h-14 w-14 shrink-0 object-contain"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">
                Need help understanding a topic?
              </p>
              <p className="text-xs text-muted-foreground">
                Ask your AI Tutor for step-by-step explanations.
              </p>
            </div>
            <AskAiTutorButton className="h-8 w-auto shrink-0 px-3 text-sm">
              Ask AI Tutor
            </AskAiTutorButton>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
