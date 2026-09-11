import { useState } from "react";
import {
  FlaskConical,
  AlertTriangle,
  Compass,
  ClipboardList,
  HelpCircle,
  Lightbulb,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ScienceExperiment } from "@/types/science-experiment";
import { PALETTES } from "@/components/math-lesson/design-tokens";
import { subjectAccent } from "./science-tokens";
import { ScienceInteractiveExperiment } from "./science-interactive-experiment";
import { ExperimentStepper } from "./experiment-stepper";
import type { ProcedureStepSpec } from "./experiment-stepper";

const CANVAS = PALETTES["technical-9to10"];

interface ScienceExperimentPanelProps {
  experiment: ScienceExperiment;
}

function procedureToSteps(procedure?: string[]): ProcedureStepSpec[] {
  return (procedure ?? []).map((instruction, i) => ({
    id: `step-${i}`,
    instruction,
  }));
}

function HintBlock({ hints }: { hints: string[][] }) {
  const [revealed, setRevealed] = useState<Record<number, number>>({});

  return (
    <div className="space-y-3">
      {hints.map((levelHints, levelIdx) => {
        const shown = revealed[levelIdx] ?? 0;
        const labels = ["Easy", "Medium", "Hard", "Challenge"];
        return (
          <div key={levelIdx} className="rounded-lg border p-3" style={{ borderColor: CANVAS.gridLine, background: CANVAS.background }}>
            <p className="text-xs font-semibold mb-2" style={{ color: CANVAS.text }}>
              {labels[levelIdx] ?? `Level ${levelIdx + 1}`} hints
            </p>
            <ul className="space-y-1.5">
              {levelHints.slice(0, shown).map((h, i) => (
                <li key={i} className="text-xs flex gap-2" style={{ color: CANVAS.text }}>
                  <Lightbulb className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: "#e08a2b" }} />
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

function AssessmentBlock({ questions }: { questions: NonNullable<ScienceExperiment["experiment"]["assessment"]> }) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="space-y-2">
      {questions.map((q, i) => (
        <div key={i} className="rounded-lg border overflow-hidden" style={{ borderColor: CANVAS.gridLine }}>
          <button
            type="button"
            className="w-full flex items-start gap-2 px-3 py-2.5 text-left text-sm hover:bg-black/[0.02] transition-colors"
            onClick={() => setOpen(open === i ? null : i)}
          >
            {open === i ? (
              <ChevronDown className="h-4 w-4 shrink-0 mt-0.5" style={{ color: CANVAS.muted }} />
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0 mt-0.5" style={{ color: CANVAS.muted }} />
            )}
            <span style={{ color: CANVAS.text }}>
              <span className="mr-1.5" style={{ color: CANVAS.muted }}>{i + 1}.</span>
              {q.question}
            </span>
          </button>
          {open === i && q.answer ? (
            <p className="px-3 pb-2.5 text-xs pl-9" style={{ color: CANVAS.muted }}>{q.answer}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function ScienceExperimentPanel({ experiment }: ScienceExperimentPanelProps) {
  const spec = experiment.experiment;
  const subjectKey = (spec.subject ?? experiment.subject ?? "").toLowerCase();
  const accent = subjectAccent(subjectKey || undefined);
  const [showMore, setShowMore] = useState(false);

  const steps: ProcedureStepSpec[] =
    spec.procedureSteps && spec.procedureSteps.length > 0
      ? spec.procedureSteps
      : procedureToSteps(spec.procedure);

  const practiceLevels = spec.practice
    ? Object.entries(spec.practice).filter(([, text]) => text?.trim())
    : [];

  const hasExtra =
    steps.length > 0 ||
    (spec.apparatus?.length ?? 0) > 0 ||
    (spec.safetyNotes?.length ?? 0) > 0 ||
    (experiment.guidedExploration?.length ?? 0) > 0 ||
    practiceLevels.length > 0 ||
    (spec.hints?.length ?? 0) > 0 ||
    (spec.assessment?.length ?? 0) > 0;

  return (
    <div
      className="mt-4 space-y-3 w-full min-w-0 rounded-xl border bg-white p-4 sm:p-5"
      style={{ borderColor: CANVAS.gridLine }}
      data-testid="science-experiment-panel"
    >
      <div
        className="flex items-center gap-2 text-xs font-semibold"
        style={{ color: accent }}
      >
        <FlaskConical className="h-3.5 w-3.5" />
        Try it yourself
      </div>

      {experiment.conceptExplanation ? (
        <p className="text-sm leading-relaxed" style={{ color: CANVAS.text }}>
          {experiment.conceptExplanation}
        </p>
      ) : null}

      {spec ? (
        <ScienceInteractiveExperiment spec={spec} />
      ) : null}

      {hasExtra ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 text-xs px-0"
          onClick={() => setShowMore((v) => !v)}
        >
          {showMore ? <ChevronDown className="h-3.5 w-3.5 mr-1" /> : <ChevronRight className="h-3.5 w-3.5 mr-1" />}
          {showMore ? "Hide extras" : "More steps & practice"}
        </Button>
      ) : null}

      {showMore && (steps.length > 0 || (spec.apparatus?.length ?? 0) > 0 || (spec.safetyNotes?.length ?? 0) > 0) ? (
        <ExperimentStepper
          steps={steps}
          apparatus={spec.apparatus ?? []}
          safetyNotes={spec.safetyNotes ?? []}
          safetyLevel={spec.safetyLevel}
        />
      ) : null}

      {showMore && experiment.guidedExploration && experiment.guidedExploration.length > 0 ? (
        <section className="space-y-2">
          <h4
            className="text-xs font-semibold flex items-center gap-1.5"
            style={{ color: CANVAS.muted }}
          >
            <Compass className="h-3.5 w-3.5" />
            Try next
          </h4>
          <ol className="list-decimal pl-5 space-y-1.5 text-sm" style={{ color: CANVAS.text }}>
            {experiment.guidedExploration.map((prompt, i) => (
              <li key={i}>{prompt}</li>
            ))}
          </ol>
        </section>
      ) : null}

      {showMore && spec.safetyNotes && spec.safetyNotes.length > 0 && steps.length === 0 ? (
        <section className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-destructive/80 mb-2 flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />
            Safety Notes
          </h4>
          <ul className="list-disc pl-4 space-y-1 text-sm text-foreground/85">
            {spec.safetyNotes.map((note, i) => (
              <li key={i}>{note}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {showMore && practiceLevels.length > 0 ? (
        <section className="space-y-2">
          <h4 className="text-xs font-semibold flex items-center gap-1.5" style={{ color: CANVAS.muted }}>
            <ClipboardList className="h-3.5 w-3.5" />
            Practice
          </h4>
          <div className="space-y-2">
            {practiceLevels.map(([level, text]) => (
              <div key={level} className="text-sm" style={{ color: CANVAS.text }}>
                <span className="text-xs font-semibold uppercase mr-2" style={{ color: CANVAS.muted }}>{level}</span>
                {text}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {showMore && spec.hints && spec.hints.length > 0 ? (
        <section className="space-y-2">
          <h4 className="text-xs font-semibold flex items-center gap-1.5" style={{ color: CANVAS.muted }}>
            <Lightbulb className="h-3.5 w-3.5" />
            Hints
          </h4>
          <HintBlock hints={spec.hints} />
        </section>
      ) : null}

      {showMore && spec.assessment && spec.assessment.length > 0 ? (
        <section className="space-y-2">
          <h4 className="text-xs font-semibold flex items-center gap-1.5" style={{ color: CANVAS.muted }}>
            <ClipboardList className="h-3.5 w-3.5" />
            Check your understanding
          </h4>
          <AssessmentBlock questions={spec.assessment} />
        </section>
      ) : null}
    </div>
  );
}
