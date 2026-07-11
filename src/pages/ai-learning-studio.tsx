import { useEffect, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BookOpen,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  Calculator,
  FlaskConical,
  Globe,
  Monitor,
  MessageCircle,
  PencilLine,
  Lightbulb,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AiTutorButtonIcon } from "@/components/ai-tutor-button-icon";
import { AiTutorStudioSkeleton } from "@/components/skeletons/student-page-skeletons";
import { useMySubjects } from "@/hooks/use-my-subjects";
import type { StudentSubjectApi } from "@/api/types";
import { useAuthStore } from "@/lib/auth-store";
import { LearningSetupWizard } from "@/components/learning/learning-setup-wizard";
import { MSG, studentFriendlyError } from "@/lib/student-messages";

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

type LearningMethod = "ai-tutor" | "ai-voice" | "pre-recorded";

const QUICK_START = [
  {
    title: "Ask Anything",
    description: "Get instant answers",
    icon: MessageCircle,
    iconColor: "text-blue-600",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    method: "ai-tutor" as LearningMethod,
  },
  {
    title: "Practice Problems",
    description: "Solve with AI help",
    icon: PencilLine,
    iconColor: "text-pink-600",
    bg: "bg-pink-50 dark:bg-pink-950/30",
    method: "ai-tutor" as LearningMethod,
  },
  {
    title: "Explain a Topic",
    description: "Step-by-step help",
    icon: Lightbulb,
    iconColor: "text-amber-600",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    method: "ai-tutor" as LearningMethod,
  },
];

function buildTutorUrl(subject: StudentSubjectApi, chapterIds: string[], chapterNames: string[]) {
  const params = new URLSearchParams({
    board: subject.board,
    class: subject.class_level,
    subject: subject.subject_name,
    subjectId: subject.id,
    chapters: chapterIds.join(","),
    chapterNames: chapterNames.join("||"),
    greet: "1",
  });
  return `/ai-tutor?${params.toString()}`;
}

function StudioHomeView({
  subjects,
  loading,
  error,
  onSubjectSelect,
  onRetry,
  retrying,
}: {
  subjects: StudentSubjectApi[];
  loading: boolean;
  error: string | null;
  onSubjectSelect: (subjectId: string) => void;
  onRetry: () => void;
  retrying?: boolean;
}) {
  const [, setLocation] = useLocation();
  const { user } = useAuthStore();
  const firstName = user?.fullName?.split(" ")[0] || "Student";

  const continueSubject = subjects[0];
  const continueChapter = continueSubject?.chapters[0];

  const handleSubjectClick = (subjectId: string) => {
    onSubjectSelect(subjectId);
  };

  const handleResume = () => {
    if (!continueSubject || !continueChapter) return;
    setLocation(
      buildTutorUrl(
        continueSubject,
        [continueChapter.id],
        [continueChapter.chapter || "Chapter 1"]
      )
    );
  };

  const handleQuickStart = (subject?: StudentSubjectApi) => {
    const target = subject ?? continueSubject ?? subjects[0];
    if (!target) return;
    const chapter = target.chapters[0];
    if (!chapter) {
      onSubjectSelect(target.id);
      return;
    }
    setLocation(
      buildTutorUrl(target, [chapter.id], [chapter.chapter || "Chapter 1"])
    );
  };

  if (loading) {
    return <AiTutorStudioSkeleton />;
  }

  if (error) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 p-6 text-center">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="font-medium text-destructive">{MSG.subjectsLoad}</p>
        <p className="max-w-md text-sm text-muted-foreground">{error}</p>
        <Button
          type="button"
          variant="outline"
          className="mt-1 gap-2"
          onClick={onRetry}
          disabled={retrying}
        >
          <RefreshCw className={cn("h-4 w-4", retrying && "animate-spin")} />
          {retrying ? "Refreshing…" : MSG.refresh}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">Hi {firstName}! 👋</h1>
          <p className="mt-0.5 text-sm text-muted-foreground sm:text-base">
            Your personal AI learning assistant
          </p>
        </div>
        <Button asChild className="h-10 shrink-0 gap-2 bg-gradient-brand px-5">
          <Link href="/ai-tutor?greet=1">
            <AiTutorButtonIcon />
            Ask AI Tutor
          </Link>
        </Button>
      </div>

      {/* Continue Learning */}
      <Card className="overflow-hidden shadow-card">
        <CardContent className="p-0">
          <div className="flex flex-col sm:flex-row">
            <div className="flex shrink-0 items-center justify-center bg-gradient-to-br from-primary/5 to-accent/10 p-4 sm:w-44 md:w-52">
              <img
                src="/book.png"
                alt=""
                aria-hidden
                className="h-28 w-full object-contain sm:h-32"
              />
            </div>
            <div className="relative flex flex-1 flex-col justify-center gap-3 p-4 sm:p-5">
              {continueSubject && continueChapter ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute right-4 top-4 h-8 border-primary/20 bg-primary/5 text-primary hover:bg-primary/10"
                    onClick={handleResume}
                  >
                    Resume
                  </Button>
                  <div className="pr-20">
                    <p className="text-base font-bold text-foreground">{continueSubject.subject_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {continueChapter.chapter || "Chapter 1: Getting Started"}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-semibold text-foreground">60%</span>
                    </div>
                    <Progress value={60} className="h-2" />
                    <p className="text-xs text-muted-foreground">Last studied: Today, 10:30 AM</p>
                  </div>
                </>
              ) : (
                <div className="py-2">
                  <p className="text-base font-bold text-foreground">Start your learning journey</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Your subjects will appear here once they are assigned to you.
                  </p>
                  <Button className="mt-4 bg-gradient-brand" disabled={subjects.length === 0}>
                    Explore Subjects
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Start */}
      <div>
        <h2 className="text-base font-semibold text-foreground sm:text-lg">Quick Start with AI Tutor</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Get help instantly or explore suggested topics
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {QUICK_START.map((item) => (
            <button
              key={item.title}
              type="button"
              className={cn(
                "rounded-2xl border border-border/60 p-4 text-left transition-all hover:border-primary/30 hover:shadow-card",
                item.bg
              )}
              onClick={() => handleQuickStart()}
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-background/80 shadow-sm">
                <item.icon className={cn("h-5 w-5", item.iconColor)} />
              </div>
              <p className="text-sm font-semibold text-foreground">{item.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Your Subjects */}
      <div>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-foreground sm:text-lg">Your Subjects</h2>
          {subjects.length > 0 && (
            <button
              type="button"
              className="flex items-center gap-0.5 text-sm font-medium text-primary hover:underline"
              onClick={() => subjects[0] && handleSubjectClick(subjects[0].id)}
            >
              Select All
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>

        {subjects.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="flex flex-col items-center p-8 text-center">
              <BookOpen className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-medium text-foreground">No subjects available yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Subjects will appear here once your school assigns them to your class.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {subjects.map((subject) => {
              const config = getSubjectConfig(subject.subject_name);
              const SubjectIcon = config.icon;
              return (
                <Card
                  key={subject.id}
                  className="cursor-pointer shadow-card transition-all hover:border-primary/30 hover:shadow-card-hover"
                  onClick={() => handleSubjectClick(subject.id)}
                  data-testid={`subject-card-${subject.id}`}
                >
                  <CardContent className="flex flex-col items-center p-4 text-center">
                    <div className={cn("mb-3 flex h-11 w-11 items-center justify-center rounded-xl", config.bg)}>
                      <SubjectIcon className="h-5 w-5 text-white" />
                    </div>
                    <p className="truncate text-sm font-semibold text-foreground">{subject.subject_name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {subject.chapters.length} {subject.chapters.length === 1 ? "Chapter" : "Chapters"}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* AI Recommended */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-base font-semibold text-foreground sm:text-lg">AI Recommended for You</h2>
          <Badge className="bg-primary/10 text-primary hover:bg-primary/10">New</Badge>
        </div>
        <Card className="shadow-card">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-brand">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-foreground">Polynomials – Practice Questions</p>
              <p className="text-sm text-muted-foreground">Based on your recent performance</p>
            </div>
            <Button
              className="h-9 shrink-0 bg-gradient-brand"
              onClick={() => handleQuickStart(subjects.find((s) => s.subject_name === "Mathematics") ?? continueSubject)}
            >
              Start Now
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function AILearningStudioPage() {
  const [match, params] = useRoute<{ subjectId: string }>("/ai-learning-studio/subject/:subjectId");
  const [, setLocation] = useLocation();

  const { data: subjects = [], isLoading, isFetching, error, refetch } = useMySubjects();
  const loading = isLoading && subjects.length === 0;
  const retrying = isFetching && !isLoading;
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardSubjectId, setWizardSubjectId] = useState<string | null>(null);

  const wizardSubject = subjects.find((s) => s.id === wizardSubjectId) ?? null;

  const openWizard = (subjectId: string) => {
    setWizardSubjectId(subjectId);
    setWizardOpen(true);
  };

  const handleWizardOpenChange = (open: boolean) => {
    setWizardOpen(open);
    if (!open) {
      setWizardSubjectId(null);
      if (match) setLocation("/ai-learning-studio");
    }
  };

  useEffect(() => {
    if (match && params?.subjectId && subjects.length > 0 && !loading) {
      openWizard(params.subjectId);
    }
  }, [match, params?.subjectId, subjects.length, loading]);

  return (
    <div className="dashboard-fit overflow-auto">
      <StudioHomeView
        subjects={subjects}
        loading={loading}
        error={error ? studentFriendlyError(error, MSG.subjectsLoad) : null}
        onSubjectSelect={openWizard}
        onRetry={() => void refetch()}
        retrying={retrying}
      />
      <LearningSetupWizard
        open={wizardOpen}
        onOpenChange={handleWizardOpenChange}
        subject={wizardSubject}
      />
    </div>
  );
}
