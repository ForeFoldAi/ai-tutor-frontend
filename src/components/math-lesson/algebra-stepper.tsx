import { useCallback, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { renderTutorText } from "@/lib/render-tutor-text";
import type { AlgebraStep, VisualizationSpec } from "@/types/math-lesson";
import { MOTION, resolvePalette } from "./design-tokens";
import { StepScrubber } from "./viz-stage";
import type { TopicVizProps } from "./topic-viz-shared";

const DEFAULT_STEPS: AlgebraStep[] = [
  {
    id: "s0",
    expressionBefore: "2x + 5 = 15",
    expressionAfter: "2x + 5 = 15",
    operation: "Start with the equation",
    highlightTerms: ["2x", "5"],
  },
  {
    id: "s1",
    expressionBefore: "2x + 5 = 15",
    expressionAfter: "2x = 10",
    operation: "Subtract 5 from both sides",
    highlightTerms: ["5"],
  },
  {
    id: "s2",
    expressionBefore: "2x = 10",
    expressionAfter: "x = 5",
    operation: "Divide both sides by 2",
    highlightTerms: ["2"],
  },
];

function normalizeSteps(spec: VisualizationSpec): AlgebraStep[] {
  if (spec.algebraSteps?.length) return spec.algebraSteps;
  if (spec.steps?.length) {
    return spec.steps.map((s, i) => ({
      id: `legacy-${i}`,
      expressionBefore: s.expression,
      expressionAfter: s.expression,
      operation: s.explanation ?? "",
      highlightTerms: [],
    }));
  }
  return DEFAULT_STEPS;
}

function latexWrap(expr: string): string {
  const t = expr.trim();
  if (t.startsWith("$") || t.startsWith("\\(")) return t;
  return `$${t}$`;
}

export function AlgebraStepperViz({ spec, onReset, classLevel, palette }: TopicVizProps) {
  const steps = useMemo(() => normalizeSteps(spec), [spec]);
  const [idx, setIdx] = useState(0);
  const p = palette ?? resolvePalette({ paletteId: spec.paletteId, classLevel, colors: spec.colors });
  const step = steps[Math.min(idx, steps.length - 1)];
  const labels = steps.map((s, i) => s.operation || `Step ${i + 1}`);

  const reset = useCallback(() => {
    setIdx(0);
    onReset();
  }, [onReset]);

  return (
    <div className="space-y-3">
      <StepScrubber
        step={idx}
        total={steps.length}
        labels={labels}
        onChange={setIdx}
        palette={p}
      />
      <div
        className="rounded-xl border px-4 py-5 text-center overflow-hidden"
        style={{
          borderColor: p.gridLine,
          background: p.surface,
          boxShadow: "0 1px 2px rgba(26,26,31,0.06)",
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={step.id + idx}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={MOTION.dragSettle}
            className="space-y-3"
          >
            <div className="text-lg font-semibold katex-display" style={{ color: p.text }}>
              {renderTutorText(latexWrap(step.expressionBefore))}
            </div>
            {step.expressionAfter && step.expressionAfter !== step.expressionBefore ? (
              <motion.div layout className="text-xl font-bold" style={{ color: p.primary }}>
                {renderTutorText(latexWrap(step.expressionAfter))}
              </motion.div>
            ) : null}
            {step.operation ? (
              <p className="text-xs leading-relaxed" style={{ color: p.muted }}>
                {step.operation}
              </p>
            ) : null}
            {(step.highlightTerms ?? []).length > 0 ? (
              <div className="flex flex-wrap gap-1.5 justify-center">
                {step.highlightTerms!.map((t) => (
                  <motion.span
                    key={t}
                    layoutId={`term-${t}`}
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: `${p.accent}22`, color: p.accent }}
                  >
                    {t}
                  </motion.span>
                ))}
              </div>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="flex flex-wrap gap-2 justify-center">
        <Button type="button" size="sm" variant="outline" onClick={reset}>
          Reset
        </Button>
      </div>
    </div>
  );
}
