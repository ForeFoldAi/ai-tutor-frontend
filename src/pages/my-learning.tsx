import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  GraduationCap,
  Monitor,
  Play,
  Search,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AiTutorButtonIcon } from "@/components/ai-tutor-button-icon";
import type { StudentSubjectApi } from "@/api/types";
import { useMySubjects } from "@/hooks/use-my-subjects";

type SubjectFilter = "all" | "in_progress" | "not_started" | "completed";
type SubjectStatus = "in_progress" | "not_started" | "completed";

interface LearningSubject {
  id: string;
  name: string;
  topic: string;
  completedLessons: number;
  totalLessons: number;
  progress: number;
  status: SubjectStatus;
  icon: typeof Calculator;
  color: string;
  barClass: string;
}

const DEMO_SUBJECTS: Omit<LearningSubject, "id">[] = [
  {
    name: "Mathematics",
    topic: "Fractions & Decimals",
    completedLessons: 16,
    totalLessons: 20,
    progress: 80,
    status: "in_progress",
    icon: Calculator,
    color: "bg-subject-math",
    barClass: "[&>div]:bg-subject-math",
  },
  {
    name: "English",
    topic: "Grammar & Composition",
    completedLessons: 10,
    totalLessons: 16,
    progress: 62,
    status: "in_progress",
    icon: Globe,
    color: "bg-subject-english",
    barClass: "[&>div]:bg-subject-english",
  },
  {
    name: "Science",
    topic: "Physics & Chemistry",
    completedLessons: 9,
    totalLessons: 15,
    progress: 60,
    status: "in_progress",
    icon: FlaskConical,
    color: "bg-subject-science",
    barClass: "[&>div]:bg-subject-science",
  },
  {
    name: "Social Studies",
    topic: "History & Civics",
    completedLessons: 6,
    totalLessons: 12,
    progress: 50,
    status: "in_progress",
    icon: BookOpen,
    color: "bg-subject-social",
    barClass: "[&>div]:bg-subject-social",
  },
  {
    name: "Computer",
    topic: "Programming Basics",
    completedLessons: 4,
    totalLessons: 10,
    progress: 40,
    status: "not_started",
    icon: Monitor,
    color: "bg-subject-cs",
    barClass: "[&>div]:bg-subject-cs",
  },
];

const RECENT_LESSONS = [
  { title: "Multiplication of Fractions", subject: "Mathematics", icon: Calculator, color: "bg-subject-math" },
  { title: "Nouns and Pronouns", subject: "English", icon: Globe, color: "bg-subject-english" },
  { title: "States of Matter", subject: "Science", icon: FlaskConical, color: "bg-subject-science" },
];

const FILTER_TABS: { id: SubjectFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "in_progress", label: "In Progress" },
  { id: "not_started", label: "Not Started" },
  { id: "completed", label: "Completed" },
];

const OVERVIEW_STATS = [
  {
    label: "Enrolled Subjects",
    value: "5 subjects",
    icon: GraduationCap,
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
  },
  {
    label: "Lessons Completed",
    value: "24 of 29",
    icon: TrendingUp,
    iconBg: "bg-success/10",
    iconColor: "text-success",
  },
  {
    label: "Total Study Time",
    value: "12h 45m",
    icon: Clock,
    iconBg: "bg-amber-100 dark:bg-amber-950/40",
    iconColor: "text-amber-600",
  },
  {
    label: "Current Streak",
    value: "7 days",
    icon: Trophy,
    iconBg: "bg-blue-100 dark:bg-blue-950/40",
    iconColor: "text-blue-600",
  },
];

function mapApiSubjects(apiSubjects: StudentSubjectApi[]): LearningSubject[] {
  if (apiSubjects.length === 0) {
    return DEMO_SUBJECTS.map((s, i) => ({ ...s, id: `demo-${i}` }));
  }

  return apiSubjects.map((subject, index) => {
    const demo = DEMO_SUBJECTS[index % DEMO_SUBJECTS.length];
    const total = Math.max(subject.chapters.length, demo.totalLessons);
    const completed = Math.min(demo.completedLessons, total);
    const progress = total > 0 ? Math.round((completed / total) * 100) : demo.progress;

    return {
      id: subject.id,
      name: subject.subject_name,
      topic: subject.chapters[0]?.chapter || demo.topic,
      completedLessons: completed,
      totalLessons: total,
      progress,
      status: progress >= 100 ? "completed" : progress > 0 ? "in_progress" : "not_started",
      icon: demo.icon,
      color: demo.color,
      barClass: demo.barClass,
    };
  });
}

export default function MyLearningPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<SubjectFilter>("all");
  const { data } = useMySubjects();
  const [subjects, setSubjects] = useState<LearningSubject[]>(
    DEMO_SUBJECTS.map((s, i) => ({ ...s, id: `demo-${i}` }))
  );

  useEffect(() => {
    if (data) setSubjects(mapApiSubjects(data));
  }, [data]);

  const filteredSubjects = useMemo(() => {
    return subjects.filter((subject) => {
      const matchesSearch =
        subject.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        subject.topic.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = filter === "all" || subject.status === filter;
      return matchesSearch && matchesFilter;
    });
  }, [subjects, searchQuery, filter]);

  return (
    <div className="dashboard-fit flex min-h-0 flex-1 flex-col overflow-hidden p-4 md:p-5">
      {/* Header */}
      <div className="mb-3 flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">My Learning</h1>
          <p className="text-sm text-muted-foreground">
            Your personalized learning path and progress
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="relative w-full sm:w-52">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search topics, lessons..."
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

      {/* Overview stats */}
      <Card className="mb-3 shrink-0 shadow-card">
        <CardContent className="grid grid-cols-2 gap-3 p-3 xl:grid-cols-4">
          {OVERVIEW_STATS.map((stat) => (
            <div key={stat.label} className="flex items-center gap-2.5">
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
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

      {/* Main grid — fills remaining height */}
      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-3 lg:gap-4">
        {/* Left column */}
        <div className="flex min-h-0 flex-col gap-3 lg:col-span-2">
          <Card className="flex min-h-0 flex-1 flex-col shadow-card">
            <CardContent className="flex min-h-0 flex-1 flex-col p-3 sm:p-4">
              <div className="mb-2 flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-sm font-semibold text-foreground sm:text-base">Your Subjects</h2>
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
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-0.5">
                {filteredSubjects.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No subjects match your search or filter.
                  </p>
                ) : (
                  filteredSubjects.map((subject) => (
                    <Link key={subject.id} href="/ai-learning-studio">
                      <div className="group flex cursor-pointer items-center gap-2.5 rounded-xl border border-border/60 p-2.5 transition-all hover:border-primary/30 hover:bg-muted/20 sm:gap-3">
                        <div
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white",
                            subject.color
                          )}
                        >
                          <subject.icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {subject.name}
                            </p>
                            <span className="shrink-0 text-xs font-semibold text-foreground">
                              {subject.progress}%
                            </span>
                          </div>
                          <p className="truncate text-xs text-muted-foreground">
                            {subject.topic} · {subject.completedLessons}/{subject.totalLessons} lessons
                          </p>
                          <Progress
                            value={subject.progress}
                            className={cn("mt-1.5 h-1.5", subject.barClass)}
                          />
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* AI Tutor banner */}
          <Card className="shrink-0 overflow-hidden border-0 bg-gradient-to-r from-primary/10 via-accent/10 to-brand-secondary/10 shadow-card">
            <CardContent className="flex items-center gap-3 p-3">
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
              <Button asChild size="sm" className="shrink-0 bg-gradient-brand">
                <Link href="/ai-tutor?greet=1" className="inline-flex items-center">
                  <AiTutorButtonIcon className="mr-1.5 h-5 w-5" />
                  Ask AI Tutor
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="flex min-h-0 flex-col gap-3">
          <Card className="shrink-0 shadow-card">
            <CardContent className="p-3 sm:p-4">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground sm:text-base">Continue Learning</h2>
                <Link href="/ai-learning-studio" className="text-xs font-medium text-primary hover:underline">
                  View All
                </Link>
              </div>

              <div className="rounded-xl bg-gradient-to-br from-primary/15 via-accent/10 to-brand-secondary/15 p-3">
                <Badge className="mb-1.5 bg-subject-math/15 text-subject-math hover:bg-subject-math/15">
                  Mathematics
                </Badge>
                <p className="text-sm font-semibold text-foreground">Fractions: Addition and Subtraction</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Lesson 12 of 20 · 15 min left</p>
                <div className="my-2 flex h-20 items-center justify-center overflow-hidden rounded-lg bg-background/50">
                  <img
                    src="/book.png"
                    alt=""
                    aria-hidden
                    className="h-full w-full object-contain p-1"
                  />
                </div>
                <Progress value={60} className="mb-2 h-1.5" />
                <Button asChild size="sm" className="h-9 w-full bg-gradient-brand">
                  <Link href="/ai-learning-studio">
                    <Play className="mr-1.5 h-3.5 w-3.5" />
                    Continue Lesson
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="flex min-h-0 flex-1 flex-col shadow-card">
            <CardContent className="flex min-h-0 flex-1 flex-col p-3 sm:p-4">
              <div className="mb-2 flex shrink-0 items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground sm:text-base">Recent Lessons</h2>
                <Link href="/ai-learning-studio" className="text-xs font-medium text-primary hover:underline">
                  View All
                </Link>
              </div>

              <ul className="min-h-0 flex-1 space-y-2">
                {RECENT_LESSONS.map((lesson) => (
                  <li
                    key={lesson.title}
                    className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-muted/20 px-2.5 py-2"
                  >
                    <div
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white",
                        lesson.color
                      )}
                    >
                      <lesson.icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-foreground sm:text-sm">
                        {lesson.title}
                      </p>
                      <p className="text-xs text-muted-foreground">{lesson.subject}</p>
                    </div>
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
