import { Slider } from "@/components/ui/slider";
import type { VisualizationSpec } from "@/types/math-lesson";
import { buildVariableMap, evaluateFormula, formatCalcValue } from "./formula-utils";

export interface TopicVizProps {
  spec: VisualizationSpec;
  values: Record<string, number>;
  onChange: (id: string, v: number) => void;
  onReset: () => void;
}

export function CalcGrid({ spec, values }: { spec: VisualizationSpec; values: Record<string, number> }) {
  const vars = buildVariableMap(values, {});
  const calcs = spec.liveCalculations ?? [];
  if (!calcs.length) return null;
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {calcs.map((c) => (
        <div key={c.id} className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
          <p className="text-[11px] text-muted-foreground">{c.label}</p>
          <p className="text-sm font-semibold tabular-nums">
            {formatCalcValue(evaluateFormula(c.formula, vars), c.unit)}
          </p>
        </div>
      ))}
    </div>
  );
}

export function SliderPanel({ spec, values, onChange }: Pick<TopicVizProps, "spec" | "values" | "onChange">) {
  return (
    <div className="space-y-3">
      {(spec.sliders ?? []).map((s) => (
        <div key={s.id} className="space-y-1">
          <div className="flex justify-between text-xs font-medium">
            <span>{s.label}</span>
            <span className="text-primary tabular-nums">
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
  );
}
