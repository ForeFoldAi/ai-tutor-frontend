import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  BookOpen,
  Calculator,
  CheckCircle2,
  FlaskConical,
  Globe,
  Monitor,
  Play,
  Search,
} from "lucide-react";
import { cn, cleanDisplayText } from "@/lib/utils";
import { PageShell } from "@/components/page-shell";
import { AskAiTutorButton } from "@/components/ask-ai-tutor-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { tutorResumeHref, type LearningSubjectApi } from "@/api/learning";
import { useLearningOverview } from "@/hooks/use-learning-overview";
import { chapterSelectionPath } from "@/lib/tutor-chapter-nav";
import { textbookImageSrc } from "@/components/voice/voice-image-utils";
import { useAuthStore } from "@/lib/auth-store";


type SubjectConfig = {
  icon: typeof Calculator;
  color: string;
  bg: string;
  cardBg: string;
};

const SUBJECT_CONFIG: Record<string, SubjectConfig> = {
  Mathematics: {
    icon: Calculator,
    color: "text-subject-math",
    bg: "bg-subject-math",
    cardBg: "bg-subject-math/10",
  },
  Science: {
    icon: FlaskConical,
    color: "text-subject-science",
    bg: "bg-subject-science",
    cardBg: "bg-subject-science/10",
  },
  English: {
    icon: Globe,
    color: "text-subject-english",
    bg: "bg-subject-english",
    cardBg: "bg-subject-english/10",
  },
  "Social Studies": {
    icon: BookOpen,
    color: "text-subject-social",
    bg: "bg-subject-social",
    cardBg: "bg-subject-social/10",
  },
  "Computer Science": {
    icon: Monitor,
    color: "text-subject-cs",
    bg: "bg-subject-cs",
    cardBg: "bg-subject-cs/10",
  },
  Computer: {
    icon: Monitor,
    color: "text-subject-cs",
    bg: "bg-subject-cs",
    cardBg: "bg-subject-cs/10",
  },
};

const FALLBACK_CONFIG: SubjectConfig = {
  icon: BookOpen,
  color: "text-primary",
  bg: "bg-primary",
  cardBg: "bg-primary/10",
};

function getSubjectConfig(name: string) {
  return SUBJECT_CONFIG[name] ?? FALLBACK_CONFIG;
}

function topicLabel(subject: LearningSubjectApi): string {
  const inProgress = subject.chapters.find((c) => c.status === "in_progress");
  if (inProgress) {
    const pct = inProgress.progress ?? 0;
    const name = cleanDisplayText(inProgress.chapter) || "Current chapter";
    return pct > 0 ? `${name} · ${pct}%` : name;
  }
  const next = subject.chapters.find((c) => c.status === "not_started");
  if (next?.chapter) return cleanDisplayText(next.chapter);
  return cleanDisplayText(subject.chapters[0]?.chapter) || "No chapters yet";
}

export default function MyLearningPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const { data, isLoading, isError } = useLearningOverview();
  const token = useAuthStore((s) => s.token);

  const subjects = data?.subjects ?? [];
  const recentLessons = data?.recent_lessons ?? [];

  const filteredSubjects = useMemo(() => {
    return subjects.filter((subject) => {
      const topic = topicLabel(subject);
      return (
        subject.subject_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        topic.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  }, [subjects, searchQuery]);

  const listContainerRef = useRef<HTMLDivElement>(null);
  const [maxVisibleItems, setMaxVisibleItems] = useState<number>(6);

  useEffect(() => {
    const el = listContainerRef.current;
    if (!el) return;

    const updateMaxItems = () => {
      if (typeof window !== "undefined" && window.innerWidth < 1024) {
        setMaxVisibleItems(5);
        return;
      }
      const availableHeight = el.clientHeight;
      if (availableHeight <= 0) return;

      const firstItem = el.querySelector("li");
      const itemHeight = firstItem ? firstItem.getBoundingClientRect().height : 56;
      const gap = 8;
      const count = Math.max(1, Math.floor((availableHeight + gap) / (itemHeight + gap)));
      setMaxVisibleItems(count);
    };

    updateMaxItems();
    const ro = new ResizeObserver(updateMaxItems);
    ro.observe(el);
    return () => ro.disconnect();
  }, [recentLessons.length]);

  const visibleLessons = useMemo(() => {
    return recentLessons.slice(0, maxVisibleItems);
  }, [recentLessons, maxVisibleItems]);

  return (
    <PageShell className="overflow-x-hidden" contentClassName="min-h-0 flex-1 flex flex-col">
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
            <ThemeToggle className="hidden lg:flex" />
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


      <div className="grid min-w-0 gap-3 lg:grid-cols-3 lg:grid-rows-[auto_1fr] lg:gap-4 lg:min-h-0 lg:flex-1">
        <div className="order-1 flex min-w-0 flex-col lg:col-start-1 lg:col-span-2 lg:row-start-1">
          <h2 className="mb-3 text-base font-semibold text-foreground sm:text-lg">Your Subjects</h2>

          {isLoading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Loading subjects…</p>
          ) : isError ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Could not load your subjects. Try again later.
            </p>
          ) : filteredSubjects.length === 0 ? (
            <Card className="shadow-card">
              <CardContent className="flex flex-col items-center p-8 text-center">
                <BookOpen className="mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="font-medium text-foreground">
                  {subjects.length === 0
                    ? "No subjects available yet"
                    : "No subjects match your search."}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {subjects.length === 0
                    ? "Subjects will appear here once your school assigns them to your class."
                    : "Try searching for a different topic or subject name."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              {filteredSubjects.map((subject) => {
                const config = getSubjectConfig(subject.subject_name);
                const SubjectIcon = config.icon;
                return (
                  <Link
                    key={subject.id}
                    href={chapterSelectionPath(String(subject.id), { from: "my-learning" })}
                    className="block min-w-0"
                  >
                    <Card className="flex h-full cursor-pointer flex-col overflow-hidden shadow-card transition-all hover:border-primary/30 hover:shadow-card-hover">
                      {subject.image_url && (
                        <img
                          src={textbookImageSrc(subject.image_url, token)}
                          alt=""
                          loading="lazy"
                          className="min-h-28 w-full flex-1 object-cover"
                        />
                      )}
                      <CardContent className={cn("flex flex-col items-center p-4 text-center", subject.image_url && "pt-3")}>
                        {subject.image_url ? null : (
                          <div
                            className={cn(
                              "mb-3 flex h-11 w-11 items-center justify-center rounded-xl",
                              config.bg
                            )}
                          >
                            <SubjectIcon className="h-5 w-5 text-white" />
                          </div>
                        )}
                        <p
                          className="line-clamp-2 w-full break-words text-sm font-semibold text-foreground"
                          title={subject.subject_name}
                        >
                          {subject.subject_name}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {subject.progress}% covered · {subject.completed_chapters}/
                          {subject.total_chapters} chapters
                        </p>
                        <Progress value={subject.progress} className="mt-2 h-1.5 w-full" />
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <Card className="order-2 flex min-w-0 flex-col shadow-card overflow-hidden lg:col-start-3 lg:col-span-1 lg:row-start-1 lg:row-span-2 lg:h-full lg:min-h-0">
          <CardContent className="flex min-w-0 flex-1 flex-col p-4 sm:p-5 min-h-0 overflow-hidden">
            <div className="mb-3 flex min-w-0 shrink-0 items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-foreground sm:text-lg">
                Recent Lessons
              </h2>
              <Link
                href="/ai-learning-studio"
                className="shrink-0 text-xs font-medium text-primary hover:underline"
              >
                View All
              </Link>
            </div>

            <div ref={listContainerRef} className="flex min-w-0 flex-1 flex-col min-h-0 overflow-hidden">
              <ul className="space-y-2 overflow-hidden">
                {recentLessons.length === 0 ? (
                  <li className="py-4 text-center text-sm text-muted-foreground">
                    No recent lessons yet.
                  </li>
                ) : (
                  visibleLessons.map((lesson) => {
                  const config = getSubjectConfig(lesson.subject_name);
                  const Icon = config.icon;
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
                        <div className="flex min-w-0 items-center gap-2.5 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5 transition-colors hover:border-primary/30">
                          <div
                            className={cn(
                              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white",
                              config.bg
                            )}
                          >
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium text-foreground sm:text-sm">
                              {cleanDisplayText(lesson.chapter_name) || "Chapter"}
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
            </div>
          </CardContent>
        </Card>

        <Card className="order-3 min-w-0 shrink-0 self-start overflow-hidden border-0 bg-gradient-to-r from-primary/10 via-accent/10 to-brand-secondary/10 shadow-card lg:col-start-1 lg:col-span-2 lg:row-start-2">
          <CardContent className="flex min-w-0 flex-row items-center gap-3 p-3.5 sm:p-4">
            <img
              src="/login-right.webp"
              alt=""
              aria-hidden
              className="h-14 w-14 shrink-0 object-contain"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground sm:text-base">
                Need help understanding a topic?
              </p>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Ask Learn Mastro for step-by-step explanations.
              </p>
            </div>
            <AskAiTutorButton className="h-8 w-auto shrink-0 px-3 text-sm sm:h-9 sm:px-4">
              Ask Learn Mastro
            </AskAiTutorButton>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
