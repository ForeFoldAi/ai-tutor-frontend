import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  BookOpen,
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
import { AskAiTutorButton } from "@/components/ask-ai-tutor-button";
import { useAskAiTutorStore, type AskAiTutorMode } from "@/lib/ask-ai-tutor-store";
import { AiTutorStudioSkeleton } from "@/components/skeletons/student-page-skeletons";
import { useAuthStore } from "@/lib/auth-store";
import { LearningSetupWizard } from "@/components/learning/learning-setup-wizard";
import { MSG, studentFriendlyError } from "@/lib/student-messages";
import { useLearningOverview } from "@/hooks/use-learning-overview";
import {
  tutorResumeHref,
  type LearningSubjectApi,
  type RecommendedTopicApi,
} from "@/api/learning";
import type { StudentSubjectApi } from "@/api/types";

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

const QUICK_START: Array<{
  title: string;
  description: string;
  icon: typeof MessageCircle;
  iconColor: string;
  bg: string;
  mode: AskAiTutorMode;
}> = [
  {
    title: "Ask Textbook Q&A",
    description: "Ask questions about the textbook",
    icon: MessageCircle,
    iconColor: "text-blue-600",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    mode: "ask",
  },
  {
    title: "Practice Problems",
    description: "Textbook drills",
    icon: PencilLine,
    iconColor: "text-pink-600",
    bg: "bg-pink-50 dark:bg-pink-950/30",
    mode: "practice",
  },
  {
    title: "Explain a Topic",
    description: "Step-by-step lesson",
    icon: Lightbulb,
    iconColor: "text-amber-600",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    mode: "explain",
  },
];

function toStudentSubject(s: LearningSubjectApi): StudentSubjectApi {
  return {
    id: String(s.id),
    board: s.board,
    class_level: s.class_level,
    subject_name: s.subject_name,
    chapters: s.chapters.map((c) => ({
      id: String(c.id),
      chapter: c.chapter,
      file_name: c.file_name,
    })),
  };
}

function formatLastStudied(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function StudioHomeView({
  subjects,
  continueLearning,
  recommendedTopics,
  loading,
  error,
  onSubjectSelect,
  onRetry,
  retrying,
}: {
  subjects: LearningSubjectApi[];
  continueLearning: ReturnType<typeof useLearningOverview>["data"] extends infer D
    ? D extends { continue_learning: infer C }
      ? C
      : null
    : null;
  recommendedTopics: RecommendedTopicApi[];
  loading: boolean;
  error: string | null;
  onSubjectSelect: (subjectId: string) => void;
  onRetry: () => void;
  retrying?: boolean;
}) {
  const [, setLocation] = useLocation();
  const openAskAiTutor = useAskAiTutorStore((s) => s.openAskAiTutor);
  const { user } = useAuthStore();
  const firstName = user?.fullName?.split(" ")[0] || "Student";

  const handleResume = () => {
    if (!continueLearning) return;
    setLocation(
      tutorResumeHref({
        board: continueLearning.board,
        class_level: continueLearning.class_level,
        subject_name: continueLearning.subject_name,
        subject_id: continueLearning.subject_id,
        chapter_id: continueLearning.chapter_id,
        chapter_name: continueLearning.chapter_name,
        greet: true,
      })
    );
  };

  const openRecommended = (topic: RecommendedTopicApi) => {
    setLocation(
      tutorResumeHref({
        board: topic.board,
        class_level: topic.class_level,
        subject_name: topic.subject_name,
        subject_id: topic.subject_id,
        chapter_id: topic.chapter_id,
        chapter_name: topic.chapter_name,
        agent_mode: "explain",
        greet: true,
      })
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
    <div className="space-y-3 p-3 md:space-y-4 md:p-4">
      <div className="flex min-w-0 items-start justify-between gap-2 sm:gap-3 lg:items-center lg:gap-4">
        <div className="min-w-0 flex-1 space-y-0.5">
          <h1 className="truncate text-xl font-bold text-foreground sm:text-2xl">Hi {firstName}!</h1>
          <p className="text-sm text-muted-foreground">
            Your personal AI learning assistant
          </p>
        </div>
        <AskAiTutorButton className="h-8 shrink-0 px-3 sm:h-9 sm:px-4">
          Ask AI Tutor
        </AskAiTutorButton>
      </div>

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
              {continueLearning ? (
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
                    <p className="text-base font-bold text-foreground">
                      {continueLearning.subject_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {continueLearning.chapter_name || "Continue chapter"}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-semibold text-foreground">
                        {continueLearning.progress}%
                      </span>
                    </div>
                    <Progress value={continueLearning.progress} className="h-2" />
                    {continueLearning.last_accessed_at && (
                      <p className="text-xs text-muted-foreground">
                        Last studied: {formatLastStudied(continueLearning.last_accessed_at)}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <div className="py-2">
                  <p className="text-base font-bold text-foreground">Start your learning journey</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Your subjects will appear here once they are assigned to your class.
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-base font-semibold text-foreground sm:text-lg">
          Quick Start with AI Tutor
        </h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Ask, practice, or get an explanation — subject is detected from your question
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {QUICK_START.map((item) => (
            <button
              key={item.title}
              type="button"
              onClick={() => openAskAiTutor(item.mode)}
              className={cn(
                "h-full rounded-2xl border border-border/60 p-4 text-left transition-all hover:border-primary/30 hover:shadow-card",
                item.bg
              )}
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

      <div>
        <h2 className="mb-3 text-base font-semibold text-foreground sm:text-lg">Your Subjects</h2>

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
                  onClick={() => onSubjectSelect(String(subject.id))}
                >
                  <CardContent className="flex flex-col items-center p-4 text-center">
                    <div
                      className={cn(
                        "mb-3 flex h-11 w-11 items-center justify-center rounded-xl",
                        config.bg
                      )}
                    >
                      <SubjectIcon className="h-5 w-5 text-white" />
                    </div>
                    <p className="truncate text-sm font-semibold text-foreground">
                      {subject.subject_name}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {subject.progress}% covered · {subject.completed_chapters}/
                      {subject.total_chapters} chapters
                    </p>
                    <Progress value={subject.progress} className="mt-2 h-1.5 w-full" />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {recommendedTopics.length > 0 ? (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold text-foreground sm:text-lg">
              AI Recommended for you
            </h2>
          </div>
          <p className="mb-3 text-sm text-muted-foreground">
            Topics picked from your progress — tap one to start with AI Tutor
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {recommendedTopics.map((topic) => {
              const config = getSubjectConfig(topic.subject_name);
              return (
                <button
                  key={`${topic.subject_id}-${topic.chapter_id}-${topic.title}`}
                  type="button"
                  onClick={() => openRecommended(topic)}
                  className="rounded-2xl border border-border/60 bg-card p-4 text-left shadow-card transition-all hover:border-primary/30 hover:shadow-card-hover"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white",
                        config.bg
                      )}
                    >
                      <Lightbulb className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{topic.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{topic.subject_name}</p>
                      <p className="mt-1.5 text-xs text-primary">{topic.reason}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function AILearningStudioPage() {
  const [match, params] = useRoute<{ subjectId: string }>("/ai-learning-studio/subject/:subjectId");
  const [, setLocation] = useLocation();

  const { data, isLoading, isFetching, error, refetch } = useLearningOverview();
  const subjects = data?.subjects ?? [];
  const loading = isLoading && subjects.length === 0;
  const retrying = isFetching && !isLoading;
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardSubjectId, setWizardSubjectId] = useState<string | null>(null);

  const wizardSubjectApi =
    subjects.find((s) => String(s.id) === wizardSubjectId) ?? null;
  const wizardSubject = wizardSubjectApi ? toStudentSubject(wizardSubjectApi) : null;

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
        continueLearning={data?.continue_learning ?? null}
        recommendedTopics={data?.recommended_topics ?? []}
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
        chapterStatusById={
          wizardSubjectApi
            ? Object.fromEntries(
                wizardSubjectApi.chapters.map((c) => [String(c.id), c.status])
              )
            : undefined
        }
        chapterProgressById={
          wizardSubjectApi
            ? Object.fromEntries(
                wizardSubjectApi.chapters.map((c) => [String(c.id), c.progress ?? 0])
              )
            : undefined
        }
      />
    </div>
  );
}
