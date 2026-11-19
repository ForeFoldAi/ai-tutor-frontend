import { useCallback, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { renderTutorText } from "@/lib/render-tutor-text";
import type { AlgebraStep, VisualizationSpec } from "@/types/math-lesson";
import { MOTION, resolvePalette } from "./design-tokens";
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

/** "Subtract 5 from both sides" on "2x + 5 = 15" → "2x + 5 - 5 = 15 - 5". */
function bothSides(before: string, operation: string): string | null {
  const parts = before.split("=");
  if (parts.length !== 2) return null;
  const [l, r] = parts.map((s) => s.trim());
  const op = operation.toLowerCase();
  const num = /(-?\d+(?:\.\d+)?|[a-z])\b/;
  let m: RegExpMatchArray | null;
  if ((m = op.match(/subtract\s+(\S+)/)) || (m = op.match(/take away\s+(\S+)/))) {
    const k = m[1].match(num)?.[1];
    return k ? `${l} - ${k} = ${r} - ${k}` : null;
  }
  if ((m = op.match(/add\s+(\S+)/))) {
    const k = m[1].match(num)?.[1];
    return k ? `${l} + ${k} = ${r} + ${k}` : null;
  }
  if ((m = op.match(/divide.*?by\s+(\S+)/))) {
    const k = m[1].match(num)?.[1];
    return k ? `\\frac{${l}}{${k}} = \\frac{${r}}{${k}}` : null;
  }
  if ((m = op.match(/multiply.*?by\s+(\S+)/))) {
    const k = m[1].match(num)?.[1];
    return k ? `${k}(${l}) = ${k}(${r})` : null;
  }
  return null;
}

export function AlgebraStepperViz({ spec, onReset, classLevel, palette }: TopicVizProps) {
  const steps = useMemo(() => normalizeSteps(spec), [spec]);
  const [idx, setIdx] = useState(0);
  const p = palette ?? resolvePalette({ paletteId: spec.paletteId, classLevel, colors: spec.colors });
  const last = steps.length - 1;
  const cur = Math.min(idx, last);

  const reset = useCallback(() => {
    setIdx(0);
    onReset();
  }, [onReset]);

  const shown = steps.slice(0, cur + 1);
  const first = shown[0];

  return (
    <div className="space-y-3">
      <div
        className="rounded-xl border px-4 py-4 text-center space-y-2"
        style={{ borderColor: p.gridLine, background: p.surface, boxShadow: "0 1px 2px rgba(26,26,31,0.06)" }}
      >
        <div className="text-lg font-semibold" style={{ color: cur === 0 ? p.primary : p.text }}>
          {renderTutorText(latexWrap(first.expressionBefore))}
        </div>
        {shown.map((s, i) => {
          if (s.expressionAfter === s.expressionBefore && i === 0) return null;
          const changes = s.expressionAfter !== s.expressionBefore;
          const working = changes ? bothSides(s.expressionBefore, s.operation ?? "") : null;
          const isCurrent = i === cur;
          return (
            <motion.div
              key={s.id + i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={MOTION.dragSettle}
              className="space-y-1.5"
            >
              <div className="flex items-center justify-center gap-2 text-xs">
                <span style={{ color: p.muted }}>↓</span>
                <span
                  className="rounded-full px-2.5 py-0.5 font-semibold"
                  style={{ background: `${p.accent}1F`, color: p.accent }}
                >
                  {s.operation || `Step ${i}`}
                </span>
              </div>
              {working ? (
                <div className="text-sm" style={{ color: p.muted }}>
                  {renderTutorText(latexWrap(working))}
                </div>
              ) : null}
              {s.expressionAfter && (changes || i > 0) ? (
                <div className="text-lg font-bold" style={{ color: isCurrent ? p.primary : p.text }}>
                  {renderTutorText(latexWrap(s.expressionAfter))}
                </div>
              ) : null}
            </motion.div>
          );
        })}
        <p className="text-[11px] pt-1" style={{ color: p.muted }}>
          {cur === 0
            ? "Goal: get x on its own. Whatever we do to one side, we must do to the other side too, so the equation stays balanced."
            : cur === last
              ? "Done: x is on its own. Put the answer back into the first equation to check it."
              : "Same operation on both sides keeps the two sides equal."}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2 justify-center">
        <Button type="button" size="sm" variant="outline" disabled={cur === 0} onClick={() => setIdx((v) => Math.max(0, v - 1))}>
          ◀ Back
        </Button>
        <span className="text-xs tabular-nums" style={{ color: p.muted }}>
          Step {cur + 1} of {steps.length}
        </span>
        <Button type="button" size="sm" disabled={cur === last} onClick={() => setIdx((v) => Math.min(last, v + 1))}>
          Next step ▶
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={reset}>
          Reset
        </Button>
      </div>
    </div>
  );
}
