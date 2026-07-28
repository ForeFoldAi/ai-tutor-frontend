import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Bot,
  Check,
  Layers,
  Mic,
  PlayCircle,
  Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { brandImages } from "@/lib/brand-images";
import type { StudentSubjectApi } from "@/api/types";

export type LearningMethod = "ai-tutor" | "ai-voice" | "pre-recorded";

type WizardStep = 2 | 3 | 4;
type ChapterFilter = "all" | "not_started" | "in_progress" | "completed";
type ChapterStatus = "not_started" | "in_progress" | "completed";

interface ChapterItem {
  id: string;
  title: string;
  subtitle: string;
  status: ChapterStatus;
  progress: number;
  iconBg: string;
}

interface LearningSetupWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject: StudentSubjectApi | null;
  /** Real chapter progress from learning overview (chapter id → status). */
  chapterStatusById?: Record<string, ChapterStatus>;
  /** Topic-coverage % per chapter id (0–100). */
  chapterProgressById?: Record<string, number>;
}

const METHOD_OPTIONS: {
  id: LearningMethod;
  title: string;
  description: string;
  icon: typeof Bot;
  iconBg: string;
  recommended?: boolean;
}[] = [
  {
    id: "ai-tutor",
    title: "AI Tutor (Text to Text)",
    description:
      "Interactive chat with AI. Get step-by-step explanations, solve doubts, and practice questions.",
    icon: Bot,
    iconBg: "bg-primary/10",
    recommended: true,
  },
  {
    id: "ai-voice",
    title: "AI Voice Tutor",
    description:
      "Talk with AI using voice. Ask questions, listen to explanations, and learn hands-free.",
    icon: Mic,
    iconBg: "bg-accent/10",
  },
  {
    id: "pre-recorded",
    title: "Pre-recorded Videos",
    description: "Watch concept videos at your own pace with structured playlists.",
    icon: PlayCircle,
    iconBg: "bg-success/10",
  },
];

const CHAPTER_ICON_COLORS = [
  "bg-subject-math",
  "bg-subject-english",
  "bg-subject-science",
  "bg-subject-social",
  "bg-subject-cs",
];

const FILTER_TABS: { id: ChapterFilter; label: string }[] = [
  { id: "all", label: "All Chapters" },
  { id: "not_started", label: "Not Started" },
  { id: "in_progress", label: "In Progress" },
  { id: "completed", label: "Completed" },
];

function formatClassLevel(cl: string) {
  return cl.replace("CLASS_", "Class ");
}

function getChapterMeta(
  chapterId: string,
  statusById?: Record<string, ChapterStatus>,
  progressById?: Record<string, number>
): { status: ChapterStatus; progress: number } {
  const status = statusById?.[chapterId] ?? "not_started";
  if (progressById && chapterId in progressById) {
    const progress = Math.max(0, Math.min(100, Math.round(progressById[chapterId] ?? 0)));
    return { status, progress };
  }
  if (status === "completed") return { status, progress: 100 };
  if (status === "in_progress") return { status, progress: 50 };
  return { status: "not_started", progress: 0 };
}

function statusLabel(status: ChapterStatus) {
  if (status === "completed") return "Completed";
  if (status === "in_progress") return "In Progress";
  return "Not Started";
}

function statusBadgeClass(status: ChapterStatus) {
  if (status === "completed") return "bg-success/10 text-success";
  if (status === "in_progress") return "bg-primary/10 text-primary";
  return "bg-muted text-muted-foreground";
}

function progressBarClass(status: ChapterStatus) {
  if (status === "completed") return "[&>div]:bg-success";
  if (status === "in_progress") return "[&>div]:bg-primary";
  return "[&>div]:bg-muted-foreground/30";
}

function methodLabel(method: LearningMethod) {
  return METHOD_OPTIONS.find((m) => m.id === method)?.title ?? method;
}

function StepBadge({ step, title }: { step: number; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-brand text-xs font-bold text-primary-foreground">
        {step}
      </span>
      <span className="text-base font-bold text-foreground">{title}</span>
    </div>
  );
}

export function LearningSetupWizard({
  open,
  onOpenChange,
  subject,
  chapterStatusById,
  chapterProgressById,
}: LearningSetupWizardProps) {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<WizardStep>(2);
  const [filter, setFilter] = useState<ChapterFilter>("all");
  const [selectedChapters, setSelectedChapters] = useState<Set<string>>(new Set());
  const [selectedMethod, setSelectedMethod] = useState<LearningMethod>("ai-tutor");

  const chapters: ChapterItem[] = useMemo(() => {
    if (!subject) return [];
    return subject.chapters.map((ch, idx) => {
      const id = String(ch.id);
      const meta = getChapterMeta(id, chapterStatusById, chapterProgressById);
      return {
        id,
        title: ch.chapter || `Chapter ${idx + 1}`,
        subtitle: ch.file_name,
        status: meta.status,
        progress: meta.progress,
        iconBg: CHAPTER_ICON_COLORS[idx % CHAPTER_ICON_COLORS.length],
      };
    });
  }, [subject, chapterStatusById, chapterProgressById]);

  const filteredChapters = useMemo(() => {
    if (filter === "all") return chapters;
    return chapters.filter((ch) => ch.status === filter);
  }, [chapters, filter]);

  const completedCount = chapters.filter((ch) => ch.status === "completed").length;
  const overallProgress = chapters.length
    ? Math.round(chapters.reduce((sum, ch) => sum + ch.progress, 0) / chapters.length)
    : 0;

  const selectedChapterItems = chapters.filter((ch) => selectedChapters.has(ch.id));

  useEffect(() => {
    if (!open) {
      setStep(2);
      setFilter("all");
      setSelectedChapters(new Set());
      setSelectedMethod("ai-tutor");
      return;
    }
    setSelectedChapters(new Set());
  }, [open, subject?.id, subject?.chapters.length]);

  const toggleChapter = (chapterId: string) => {
    setSelectedChapters((prev) => {
      const next = new Set(prev);
      if (next.has(chapterId)) next.delete(chapterId);
      else next.add(chapterId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedChapters.size === filteredChapters.length) {
      setSelectedChapters(new Set());
    } else {
      setSelectedChapters(new Set(filteredChapters.map((ch) => ch.id)));
    }
  };

  const handleClose = () => onOpenChange(false);

  const handleBack = () => {
    if (step === 2) handleClose();
    else if (step === 3) setStep(2);
    else setStep(3);
  };

  const handleStartLearning = () => {
    if (!subject || selectedChapters.size === 0) return;

    const params = new URLSearchParams({
      board: subject.board,
      class: subject.class_level,
      subject: subject.subject_name,
      subjectId: String(subject.id),
      chapters: Array.from(selectedChapters).join(","),
      chapterNames: selectedChapterItems.map((ch) => ch.title).join("||"),
      greet: "1",
    });

    handleClose();

    if (selectedMethod === "ai-tutor") {
      setLocation(`/ai-tutor?${params.toString()}`);
    } else if (selectedMethod === "ai-voice") {
      setLocation(`/ai-voice?${params.toString()}`);
    } else {
      alert("Pre-recorded videos feature coming soon!");
    }
  };

  if (!subject) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-xl gap-0 overflow-hidden p-0 sm:max-w-2xl [&>button]:hidden">
        <div className="flex max-h-[90vh] flex-col bg-card">
          {/* Step header strip */}
          <div className="border-b border-border/60 px-5 py-4">
            {step === 2 && <StepBadge step={2} title="Select Chapter" />}
            {step === 3 && <StepBadge step={3} title="Choose Learning Method" />}
            {step === 4 && <StepBadge step={4} title="Review & Start" />}
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            {step === 2 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={handleBack}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-subject-math">
                    <BookOpen className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-foreground">{subject.subject_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatClassLevel(subject.class_level)} ({subject.board})
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-foreground">Progress Overview</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {completedCount} / {chapters.length} Chapters Completed
                      </p>
                      <div className="mt-3 flex items-center gap-3">
                        <Progress value={overallProgress} className="h-2.5 flex-1" />
                        <span className="text-sm font-semibold text-foreground">{overallProgress}%</span>
                      </div>
                    </div>
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/40">
                      <Trophy className="h-5 w-5 text-amber-600" />
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {FILTER_TABS.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setFilter(tab.id)}
                      className={cn(
                        "rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors sm:text-sm",
                        filter === tab.id
                          ? "bg-gradient-brand text-primary-foreground"
                          : "border border-border/60 bg-background text-muted-foreground hover:border-primary/30"
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {chapters.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border/60 p-8 text-center">
                    <p className="font-medium text-foreground">No chapters available</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Textbook chapters will appear here once uploaded for this subject.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {filteredChapters.map((chapter, idx) => {
                      const isSelected = selectedChapters.has(chapter.id);
                      return (
                        <button
                          key={chapter.id}
                          type="button"
                          onClick={() => toggleChapter(chapter.id)}
                          className={cn(
                            "relative rounded-2xl border p-3 text-left transition-all sm:p-4",
                            isSelected
                              ? "border-green-500 bg-green-50 shadow-sm ring-1 ring-green-500/25 dark:bg-green-950/25"
                              : "border-border/60 bg-background hover:border-green-500/40"
                          )}
                        >
                          <div
                            className={cn(
                              "absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors",
                              isSelected
                                ? "border-green-600 bg-green-600 text-white"
                                : "border-muted-foreground/25 bg-background"
                            )}
                          >
                            {isSelected ? <Check className="h-3 w-3" /> : null}
                          </div>
                          <div className="flex flex-col gap-2 pr-6">
                            <div
                              className={cn(
                                "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white",
                                isSelected ? "bg-green-600" : chapter.iconBg
                              )}
                            >
                              {idx + 1}
                            </div>
                            <div className="min-w-0">
                              <p
                                className={cn(
                                  "line-clamp-2 text-sm font-semibold leading-snug",
                                  isSelected ? "text-green-800 dark:text-green-100" : "text-foreground"
                                )}
                              >
                                {chapter.title}
                              </p>
                              <p className="mt-0.5 line-clamp-1 text-[10px] text-muted-foreground sm:text-xs">
                                {chapter.subtitle}
                              </p>
                            </div>
                            <Badge
                              className={cn(
                                "w-fit border-0 text-[10px] font-medium",
                                isSelected
                                  ? "bg-green-600/15 text-green-700 dark:text-green-300"
                                  : statusBadgeClass(chapter.status)
                              )}
                            >
                              {statusLabel(chapter.status)}
                            </Badge>
                            <div className="flex items-center gap-2">
                              <Progress
                                value={chapter.progress}
                                className={cn(
                                  "h-1.5 flex-1",
                                  isSelected ? "[&>div]:bg-green-600" : progressBarClass(chapter.status)
                                )}
                              />
                              <span
                                className={cn(
                                  "w-8 text-right text-[10px] font-medium sm:text-xs",
                                  isSelected ? "text-green-700 dark:text-green-300" : "text-muted-foreground"
                                )}
                              >
                                {chapter.progress}%
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={handleBack}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div>
                    <p className="text-lg font-bold text-foreground">Learning Method</p>
                    <p className="text-sm text-muted-foreground">How would you like to learn?</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {METHOD_OPTIONS.map((method) => {
                    const isSelected = selectedMethod === method.id;
                    return (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => setSelectedMethod(method.id)}
                        className={cn(
                          "flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition-all",
                          isSelected
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-border/60 bg-background hover:border-primary/20"
                        )}
                      >
                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-primary/5 to-accent/10">
                          {method.id === "ai-tutor" ? (
                            <img
                              src={brandImages.chatbot}
                              alt=""
                              aria-hidden
                              className="h-full w-full object-contain p-1"
                            />
                          ) : (
                            <div
                              className={cn(
                                "flex h-full w-full items-center justify-center",
                                method.iconBg
                              )}
                            >
                              <method.icon
                                className={cn(
                                  "h-6 w-6",
                                  method.id === "ai-voice" ? "text-accent" : "text-success"
                                )}
                              />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-foreground">{method.title}</p>
                            {method.recommended && (
                              <Badge className="bg-primary/10 text-primary hover:bg-primary/10">
                                Recommended
                              </Badge>
                            )}
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">{method.description}</p>
                        </div>
                        <div
                          className={cn(
                            "mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
                            isSelected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-muted-foreground/30"
                          )}
                        >
                          {isSelected && <Check className="h-3 w-3" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="rounded-2xl border border-border/60 bg-gradient-to-r from-primary/5 via-accent/5 to-brand-secondary/5 p-4">
                  <div className="flex items-center gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-foreground">Why use AI Tutor?</p>
                      <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                        {[
                          "Personalized explanations",
                          "Instant answers to any question",
                          "Practice and quizzes",
                          "Available 24/7",
                        ].map((item) => (
                          <li key={item} className="flex items-center gap-2">
                            <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <img
                      src={brandImages.chatbot}
                      alt=""
                      aria-hidden
                      className="hidden h-24 w-24 shrink-0 object-contain sm:block"
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={handleBack}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div>
                    <p className="text-lg font-bold text-foreground">Review Your Selection</p>
                    <p className="text-sm text-muted-foreground">Please review before you start</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {[
                    {
                      icon: BookOpen,
                      label: "Subject",
                      value: subject.subject_name,
                    },
                    {
                      icon: Layers,
                      label: "Chapters",
                      value: `${selectedChapters.size} Chapter${selectedChapters.size === 1 ? "" : "s"} Selected`,
                      sub: selectedChapterItems.map((ch) => ch.title).join(", "),
                    },
                    {
                      icon: Bot,
                      label: "Learning Method",
                      value: methodLabel(selectedMethod),
                    },
                    
                  ].map((row) => (
                    <div
                      key={row.label}
                      className="flex items-start gap-3 rounded-2xl border border-border/60 bg-muted/20 p-4"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                        <row.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-muted-foreground">{row.label}</p>
                        <p className="font-semibold text-foreground">{row.value}</p>
                        {"sub" in row && row.sub && (
                          <p className="mt-0.5 text-sm text-muted-foreground">{row.sub}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl border border-border/60 bg-gradient-to-r from-primary/5 via-accent/5 to-brand-secondary/5 p-4">
                  <div className="flex items-center gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-foreground">You can change these selections anytime</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Your progress will be saved automatically
                      </p>
                    </div>
                    <img
                      src="/login-right.png"
                      alt=""
                      aria-hidden
                      className="h-20 w-20 shrink-0 object-contain"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border/60 bg-card px-5 py-4">
            {step === 2 && (
              <div className="flex items-center justify-between gap-3">
                <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-foreground">
                  <Checkbox
                    checked={
                      filteredChapters.length > 0 &&
                      selectedChapters.size === filteredChapters.length
                    }
                    onCheckedChange={toggleSelectAll}
                  />
                  Select All
                </label>
                <Button
                  className="bg-gradient-brand"
                  disabled={selectedChapters.size === 0}
                  onClick={() => setStep(3)}
                >
                  Continue ({selectedChapters.size} selected)
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}

            {step === 3 && (
              <Button className="h-11 w-full bg-gradient-brand" onClick={() => setStep(4)}>
                Start Learning
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}

            {step === 4 && (
              <Button
                className="h-11 w-full bg-gradient-brand"
                onClick={handleStartLearning}
                disabled={selectedChapters.size === 0}
              >
                Start Learning
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
