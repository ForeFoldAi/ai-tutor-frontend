import { Slider } from "@/components/ui/slider";
import type { VisualizationSpec } from "@/types/math-lesson";
import { buildVariableMap, evaluateFormula, formatCalcValue } from "./formula-utils";
import { resolvePalette, type Palette } from "./design-tokens";

export interface TopicVizProps {
  spec: VisualizationSpec;
  values: Record<string, number>;
  onChange: (id: string, v: number) => void;
  onReset: () => void;
  classLevel?: string;
  palette?: Palette;
}

export function useVizPalette(spec: VisualizationSpec, classLevel?: string): Palette {
  return resolvePalette({
    paletteId: spec.paletteId,
    classLevel,
    colors: spec.colors,
  });
}

export function CalcGrid({
  spec,
  values,
  palette,
}: {
  spec: VisualizationSpec;
  values: Record<string, number>;
  palette?: Palette;
}) {
  const vars = buildVariableMap(values, {});
  const calcs = spec.liveCalculations ?? [];
  const p = palette ?? resolvePalette({ paletteId: spec.paletteId, colors: spec.colors });
  if (!calcs.length) return null;
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {calcs.map((c) => (
        <div
          key={c.id}
          className="rounded-xl border px-3.5 py-2.5"
          style={{
            borderColor: p.gridLine,
            background: p.surface,
            boxShadow: "0 1px 2px rgba(26,26,31,0.06)",
          }}
        >
          <p className="text-[11px] font-medium mb-0.5" style={{ color: p.muted }}>
            {c.label}
          </p>
          <p
            className="text-base font-semibold tabular-nums"
            style={{ color: p.text, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
          >
            {formatCalcValue(evaluateFormula(c.formula, vars), c.unit)}
          </p>
        </div>
      ))}
    </div>
  );
}

export function SliderPanel({
  spec,
  values,
  onChange,
  palette,
}: Pick<TopicVizProps, "spec" | "values" | "onChange"> & { palette?: Palette }) {
  const p = palette ?? resolvePalette({ paletteId: spec.paletteId, colors: spec.colors });
  return (
    <div className="space-y-3">
      {(spec.sliders ?? []).map((s) => (
        <div key={s.id} className="space-y-1">
          <div className="flex justify-between text-xs font-medium" style={{ color: p.text }}>
            <span>{s.label}</span>
            <span className="tabular-nums" style={{ color: p.primary }}>
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

/** Shared SVG polish: drop shadow + soft fill gradient */
export function SvgPolishDefs({ palette, prefix = "mp" }: { palette: Palette; prefix?: string }) {
  return (
    <defs>
      <filter id={`${prefix}-shadow`} x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor={palette.shadow} floodOpacity="0.35" />
      </filter>
      <linearGradient id={`${prefix}-fill`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={palette.primary} stopOpacity="0.85" />
        <stop offset="100%" stopColor={palette.primary} stopOpacity="0.45" />
      </linearGradient>
      <linearGradient id={`${prefix}-accent`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor={palette.accent} stopOpacity="0.9" />
        <stop offset="100%" stopColor={palette.secondary} stopOpacity="0.55" />
      </linearGradient>
    </defs>
  );
}
