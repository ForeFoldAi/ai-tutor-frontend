import { FlaskConical, AlertTriangle, ListOrdered, Compass } from "lucide-react";
import type { ScienceExperiment } from "@/types/science-experiment";
import { GRADE_TIER_LABELS } from "@/types/science-experiment";
import { ScienceInteractiveExperiment } from "./science-interactive-experiment";

interface ScienceExperimentPanelProps {
  experiment: ScienceExperiment;
}

export function ScienceExperimentPanel({ experiment }: ScienceExperimentPanelProps) {
  const spec = experiment.experiment;
  const tierLabel = spec.gradeTier ? GRADE_TIER_LABELS[spec.gradeTier] ?? spec.gradeTier : null;

  return (
    <div className="mt-4 space-y-4 w-full min-w-0" data-testid="science-experiment-panel">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-sky-600 dark:text-sky-400">
        <FlaskConical className="h-3.5 w-3.5" />
        Interactive Experiment
        {tierLabel ? (
          <span className="normal-case font-medium text-muted-foreground">— {tierLabel}</span>
        ) : null}
      </div>

      {experiment.conceptExplanation ? (
        <p className="text-sm text-foreground/85">{experiment.conceptExplanation}</p>
      ) : null}

      {spec ? <ScienceInteractiveExperiment spec={spec} /> : null}

      {experiment.guidedExploration && experiment.guidedExploration.length > 0 ? (
        <section className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400 mb-3 flex items-center gap-1.5">
            <Compass className="h-3.5 w-3.5" />
            Guided Exploration
          </h4>
          <ul className="space-y-2">
            {experiment.guidedExploration.map((prompt, i) => (
              <li
                key={i}
                className="flex gap-2 text-sm rounded-lg border border-amber-500/20 bg-background/60 px-3 py-2"
              >
                <span className="shrink-0 font-semibold text-amber-600">{i + 1}.</span>
                <span>{prompt}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {spec.procedure && spec.procedure.length > 0 ? (
        <section className="rounded-xl border border-border/50 p-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
            <ListOrdered className="h-3.5 w-3.5" />
            Procedure
          </h4>
          <ol className="list-decimal pl-4 space-y-1 text-sm text-foreground/85">
            {spec.procedure.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </section>
      ) : null}

      {spec.safetyNotes && spec.safetyNotes.length > 0 ? (
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
    </div>
  );
}
