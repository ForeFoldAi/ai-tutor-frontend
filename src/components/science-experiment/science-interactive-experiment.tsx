import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import type { ExperimentSpec, ExperimentViewMode } from "@/types/science-experiment";
import { EXPERIMENT_VIEW_LABELS } from "@/types/science-experiment";
import { buildVariableMap, evaluateFormula, formatCalcValue } from "@/components/math-lesson/formula-utils";
import { computeMotion, defaultSliderValues, formatMotionValue } from "./experiment-utils";
import { ExperimentScene } from "./experiment-scenes";

interface Props {
  spec: ExperimentSpec;
}

export function ScienceInteractiveExperiment({ spec }: Props) {
  const [values, setValues] = useState<Record<string, number>>(() => defaultSliderValues(spec));
  const [view, setView] = useState<ExperimentViewMode>("realWorld");
  const [animating, setAnimating] = useState(false);

  const motion = useMemo(() => computeMotion(spec.experimentType, values), [spec.experimentType, values]);

  const onChange = useCallback((id: string, v: number) => {
    setValues((prev) => ({ ...prev, [id]: v }));
  }, []);

  const onReset = useCallback(() => {
    setValues(defaultSliderValues(spec));
    setAnimating(false);
  }, [spec]);

  const onAnimate = useCallback(() => {
    setAnimating(true);
    window.setTimeout(() => setAnimating(false), 4000);
  }, []);

  const viewSpec = spec.threeViews?.[view];
  const vars = { ...buildVariableMap(values, {}), ...motion.values };
  const calcs = spec.liveCalculations ?? [];

  return (
    <div className="rounded-xl border border-sky-500/25 bg-sky-500/5 p-4 space-y-4">
      <div>
        <h4 className="font-semibold text-foreground">{spec.title}</h4>
        {spec.description ? <p className="text-xs text-muted-foreground mt-1">{spec.description}</p> : null}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(EXPERIMENT_VIEW_LABELS) as ExperimentViewMode[]).map((mode) => (
          <Button
            key={mode}
            type="button"
            size="sm"
            variant={view === mode ? "default" : "outline"}
            className={cn("h-8 text-xs", view === mode && "bg-sky-600 hover:bg-sky-700")}
            onClick={() => setView(mode)}
          >
            {EXPERIMENT_VIEW_LABELS[mode]}
          </Button>
        ))}
      </div>

      <ExperimentScene
        experimentType={spec.experimentType}
        view={view}
        values={values}
        animating={animating}
        colorHint={motion.colorHint}
      />

      {viewSpec ? (
        <div className="rounded-lg border border-border/50 bg-background/60 px-3 py-2.5 space-y-1">
          <p className="text-sm font-medium">{viewSpec.title || EXPERIMENT_VIEW_LABELS[view]}</p>
          <p className="text-xs text-foreground/85 leading-relaxed">{viewSpec.description || viewSpec.narration}</p>
          {view === "scientific" && viewSpec.equation ? (
            <p className="text-sm font-mono text-sky-700 dark:text-sky-300 mt-2">{viewSpec.equation}</p>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-3">
        {(spec.sliders ?? []).map((s) => (
          <div key={s.id} className="space-y-1.5">
            <div className="flex justify-between text-xs font-medium">
              <span>{s.label}</span>
              <span className="text-sky-600 tabular-nums">
                {values[s.id] ?? s.default ?? 0}
                {s.unit ? ` ${s.unit}` : ""}
              </span>
            </div>
            <Slider
              value={[values[s.id] ?? s.default ?? s.min ?? 0]}
              min={s.min ?? 0}
              max={s.max ?? 100}
              step={s.step ?? 1}
              onValueChange={([v]) => onChange(s.id, v)}
            />
          </div>
        ))}
      </div>

      {calcs.length > 0 ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {calcs.map((c) => (
            <div key={c.id} className="rounded-lg border border-sky-500/20 bg-sky-500/5 px-3 py-2">
              <p className="text-[11px] text-muted-foreground">{c.label}</p>
              <p className="text-sm font-semibold tabular-nums">
                {formatCalcValue(evaluateFormula(c.formula, vars), c.unit)}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {Object.entries(motion.values).map(([k, v]) => (
            <div key={k} className="rounded-lg border border-sky-500/20 bg-sky-500/5 px-3 py-2">
              <p className="text-[11px] text-muted-foreground capitalize">{k.replace(/_/g, " ")}</p>
              <p className="text-sm font-semibold tabular-nums">{formatMotionValue(v)}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {(spec.buttons ?? []).map((b) => (
          <Button
            key={b.id}
            type="button"
            size="sm"
            variant={b.action === "animate" ? "default" : "outline"}
            className={b.action === "animate" ? "bg-sky-600 hover:bg-sky-700" : ""}
            onClick={() => (b.action === "animate" ? onAnimate() : onReset())}
          >
            {b.label}
          </Button>
        ))}
      </div>

      {spec.hypothesisPrompt ? (
        <p className="text-xs italic text-amber-700 dark:text-amber-400 border-l-2 border-amber-400 pl-3">
          💡 {spec.hypothesisPrompt}
        </p>
      ) : null}
    </div>
  );
}
