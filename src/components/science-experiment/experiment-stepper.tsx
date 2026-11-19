import { useState } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight, FlaskConical, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PALETTES } from "@/components/math-lesson/design-tokens";

const CANVAS = PALETTES["technical-9to10"];

export interface ProcedureStepSpec {
  id: string;
  instruction: string;
  safetyNote?: string;
}

interface ExperimentStepperProps {
  steps: ProcedureStepSpec[];
  apparatus: string[];
  safetyNotes: string[];
  safetyLevel?: string;
}

export function ExperimentStepper({ steps, apparatus, safetyNotes, safetyLevel }: ExperimentStepperProps) {
  const [idx, setIdx] = useState(0);
  const step = steps[idx];
  const total = steps.length;

  if (!total && !apparatus.length && !safetyNotes.length) return null;

  return (
    <section
      className="rounded-2xl border bg-white p-4 space-y-4 shadow-sm"
      style={{ borderColor: CANVAS.gridLine }}
      data-testid="experiment-stepper"
    >
      <div className="flex items-center justify-between gap-2">
        <h4
          className="text-[11px] font-semibold uppercase tracking-[0.08em] flex items-center gap-1.5"
          style={{ color: CANVAS.primary }}
        >
          <FlaskConical className="h-3.5 w-3.5" />
          Lab Procedure
        </h4>
        {safetyLevel ? (
          <span className="text-[10px] font-medium uppercase px-2 py-0.5 rounded-full border border-destructive/30 text-destructive bg-destructive/5">
            {safetyLevel}
          </span>
        ) : null}
      </div>

      {apparatus.length > 0 ? (
        <div className="rounded-lg border px-3 py-2.5" style={{ borderColor: CANVAS.gridLine, background: CANVAS.background }}>
          <p className="text-[10px] font-semibold uppercase tracking-wide mb-2 flex items-center gap-1" style={{ color: CANVAS.muted }}>
            <Wrench className="h-3 w-3" />
            Apparatus
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {apparatus.map((item) => (
              <li
                key={item}
                className="text-xs px-2 py-1 rounded-md border"
                style={{ borderColor: CANVAS.gridLine, background: CANVAS.surface }}
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {step ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs" style={{ color: CANVAS.muted }}>
            <span>
              Step {idx + 1} of {total}
            </span>
            <div className="flex gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={idx === 0}
                onClick={() => setIdx((i) => Math.max(0, i - 1))}
                aria-label="Previous step"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={idx >= total - 1}
                onClick={() => setIdx((i) => Math.min(total - 1, i + 1))}
                aria-label="Next step"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: CANVAS.text }}>
            {step.instruction}
          </p>
          {step.safetyNote ? (
            <p className="text-xs flex gap-1.5 items-start text-destructive/90">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              {step.safetyNote}
            </p>
          ) : null}
        </div>
      ) : null}

      {safetyNotes.length > 0 ? (
        <div className="rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-destructive mb-2 flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5" />
            Safety
          </p>
          <ul className="space-y-1">
            {safetyNotes.map((note, i) => (
              <li key={i} className={cn("text-xs text-foreground/85", i > 0 && "mt-1")}>
                {note}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
