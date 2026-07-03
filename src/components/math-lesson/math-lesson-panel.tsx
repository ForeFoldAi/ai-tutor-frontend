import { useState } from "react";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  Lightbulb,
  AlertTriangle,
  ClipboardList,
  Compass,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { renderTutorText } from "@/lib/render-tutor-text";
import type { MathLesson } from "@/types/math-lesson";
import { MathInteractiveVisualization } from "./math-interactive-visualization";

interface MathLessonPanelProps {
  lesson: MathLesson;
}

function HintProgressive({ hints }: { hints: string[][] }) {
  const [revealed, setRevealed] = useState<Record<number, number>>({});

  return (
    <div className="space-y-3">
      {hints.map((levelHints, levelIdx) => {
        const shown = revealed[levelIdx] ?? 0;
        const labels = ["Easy", "Medium", "Hard", "Challenge"];
        return (
          <div key={levelIdx} className="rounded-lg border border-border/50 bg-muted/20 p-3">
            <p className="text-xs font-semibold text-foreground/80 mb-2">
              {labels[levelIdx] ?? `Level ${levelIdx + 1}`} hints
            </p>
            <ul className="space-y-1.5">
              {levelHints.slice(0, shown).map((h, i) => (
                <li key={i} className="text-xs text-foreground/85 flex gap-2">
                  <Lightbulb className="h-3.5 w-3.5 shrink-0 text-amber-500 mt-0.5" />
                  {h}
                </li>
              ))}
            </ul>
            {shown < levelHints.length ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-2 h-7 text-xs"
                onClick={() => setRevealed((r) => ({ ...r, [levelIdx]: shown + 1 }))}
              >
                <HelpCircle className="h-3.5 w-3.5 mr-1" />
                Need a hint?
              </Button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function AssessmentBlock({ questions }: { questions: MathLesson["assessment"] }) {
  const [open, setOpen] = useState<number | null>(null);
  if (!questions?.length) return null;

  return (
    <div className="space-y-2">
      {questions.map((q, i) => (
        <div key={i} className="rounded-lg border border-border/50 overflow-hidden">
          <button
            type="button"
            className="w-full flex items-start gap-2 px-3 py-2.5 text-left text-sm hover:bg-muted/30 transition-colors"
            onClick={() => setOpen(open === i ? null : i)}
          >
            {open === i ? (
              <ChevronDown className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
            )}
            <span>
              <span className="text-muted-foreground mr-1.5">{i + 1}.</span>
              {q.question}
            </span>
          </button>
        </div>
      ))}
    </div>
  );
}

export function MathLessonPanel({ lesson }: MathLessonPanelProps) {
  const practice = lesson.practiceMode;
  const practiceLevels = [
    { key: "easy", label: "Easy", text: practice?.easy },
    { key: "medium", label: "Medium", text: practice?.medium },
    { key: "hard", label: "Hard", text: practice?.hard },
    { key: "challenge", label: "Challenge", text: practice?.challenge },
  ].filter((p) => p.text?.trim());

  return (
    <div className="mt-4 space-y-4 w-full min-w-0" data-testid="math-lesson-panel">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
        <BookOpen className="h-3.5 w-3.5" />
        Interactive Exploration
      </div>

      {lesson.visualization ? (
        <MathInteractiveVisualization spec={lesson.visualization} />
      ) : null}

      {lesson.guidedExploration && lesson.guidedExploration.length > 0 ? (
        <section className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400 mb-3 flex items-center gap-1.5">
            <Compass className="h-3.5 w-3.5" />
            Guided Exploration
          </h4>
          <ul className="space-y-2">
            {lesson.guidedExploration.map((prompt, i) => (
              <li
                key={i}
                className="flex gap-2 text-sm text-foreground/90 rounded-lg border border-amber-500/20 bg-background/60 px-3 py-2"
              >
                <span className="shrink-0 font-semibold text-amber-600 dark:text-amber-400">
                  {i + 1}.
                </span>
                <span>{prompt}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {practiceLevels.length > 0 ? (
        <section className="rounded-xl border border-border/50 p-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5">
            <ClipboardList className="h-3.5 w-3.5" />
            Practice Mode
          </h4>
          <div className="grid gap-2 sm:grid-cols-2">
            {practiceLevels.map((p) => (
              <div
                key={p.key}
                className={cn(
                  "rounded-lg border px-3 py-2.5 text-sm",
                  p.key === "easy" && "border-green-500/30 bg-green-500/5",
                  p.key === "medium" && "border-blue-500/30 bg-blue-500/5",
                  p.key === "hard" && "border-orange-500/30 bg-orange-500/5",
                  p.key === "challenge" && "border-red-500/30 bg-red-500/5",
                )}
              >
                <p className="text-[11px] font-semibold text-muted-foreground mb-1">{p.label}</p>
                <div className="text-foreground/90 text-xs leading-relaxed">{renderTutorText(p.text!)}</div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {lesson.commonMistakes && lesson.commonMistakes.length > 0 ? (
        <section className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-destructive/80 mb-2 flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />
            Common Mistakes
          </h4>
          <ul className="space-y-1.5 list-disc pl-4 text-sm text-foreground/85">
            {lesson.commonMistakes.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {lesson.aiHints && lesson.aiHints.length > 0 ? (
        <section className="rounded-xl border border-border/50 p-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            AI Hints (progressive)
          </h4>
          <HintProgressive hints={lesson.aiHints} />
        </section>
      ) : null}

      {lesson.assessment && lesson.assessment.length > 0 ? (
        <section className="rounded-xl border border-primary/25 bg-primary/5 p-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-primary mb-3">
            Assessment — 5 Conceptual Questions
          </h4>
          <AssessmentBlock questions={lesson.assessment} />
        </section>
      ) : null}
    </div>
  );
}
