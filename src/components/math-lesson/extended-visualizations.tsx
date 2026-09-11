import { useEffect, useMemo, useState, type ComponentType } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import type { VisualizationSpec } from "@/types/math-lesson";
import { resolvePalette } from "./design-tokens";
import { AlgebraStepperViz } from "./algebra-stepper";
import { CalcGrid, SliderPanel, SvgPolishDefs, type TopicVizProps } from "./topic-viz-shared";

export { AlgebraStepperViz };

/** Principal / rate / years → year-by-year compound growth with SI compare + discount/tax. */
export function CompoundInterestViz({ spec, values, onChange, classLevel, palette }: TopicVizProps) {
  const fin = spec.financeSpec;
  const mode = fin?.mode ?? "compound-interest";
  const P = values.P ?? fin?.principal ?? 10000;
  const r = values.r ?? fin?.rate ?? 8;
  const n = Math.max(1, Math.round(values.n ?? fin?.timeYears ?? 5));
  const freq =
    fin?.compoundingFrequency === "half-yearly" ? 2 : fin?.compoundingFrequency === "quarterly" ? 4 : 1;
  const [shown, setShown] = useState(n);
  const p = palette ?? resolvePalette({ paletteId: spec.paletteId, classLevel, colors: spec.colors });

  useEffect(() => setShown(n), [n]);

  const years = useMemo(() => {
    const rows: { year: number; ci: number; si: number; delta: number }[] = [];
    for (let y = 0; y <= n; y++) {
      const ci = P * (1 + r / (100 * freq)) ** (freq * y);
      const si = P + (P * r * y) / 100;
      const prev = y === 0 ? P : P * (1 + r / (100 * freq)) ** (freq * (y - 1));
      rows.push({ year: y, ci, si, delta: ci - prev });
    }
    return rows;
  }, [P, r, n, freq]);

  const maxAmt = Math.max(...years.map((row) => Math.max(row.ci, row.si)), P);

  if (mode === "discount" || mode === "tax") {
    const rateFrac = r / 100;
    const after = mode === "discount" ? P * (1 - rateFrac) : P * (1 + rateFrac);
    const delta = Math.abs(P - after);
    const barMax = Math.max(P, after);
    return (
      <div className="space-y-3">
        <svg viewBox="0 0 320 120" className="w-full max-w-md h-32 rounded-xl border" style={{ borderColor: p.gridLine, background: p.surface }}>
          <SvgPolishDefs palette={p} prefix="fin" />
          <rect x={40} y={30} width={(P / barMax) * 240} height={24} fill="url(#fin-fill)" filter="url(#fin-shadow)" rx={4} />
          <text x={40} y={24} className="text-[10px]" fill={p.muted}>
            Before ₹{Math.round(P).toLocaleString()}
          </text>
          <rect
            x={40}
            y={70}
            width={(after / barMax) * 240}
            height={24}
            fill={mode === "discount" ? p.secondary : p.accent}
            rx={4}
            opacity={0.85}
          />
          <text x={40} y={64} className="text-[10px]" fill={p.muted}>
            After ₹{Math.round(after).toLocaleString()} ({mode} ₹{Math.round(delta).toLocaleString()})
          </text>
        </svg>
        <SliderPanel spec={spec} values={values} onChange={onChange} palette={p} />
      </div>
    );
  }

  const visible = years.slice(0, shown + 1);
  const showSI = mode === "simple-interest-compare";

  const animate = () => {
    setShown(0);
    let y = 0;
    const id = window.setInterval(() => {
      y += 1;
      setShown(y);
      if (y >= n) window.clearInterval(id);
    }, 450);
  };

  return (
    <div className="space-y-3">
      <svg viewBox="0 0 320 170" className="w-full max-w-md h-44 rounded-xl border" style={{ borderColor: p.gridLine, background: p.surface }}>
        <SvgPolishDefs palette={p} prefix="ci" />
        {visible.map((row, i) => {
          const barH = Math.max(4, (row.ci / maxAmt) * 120);
          const siH = Math.max(4, (row.si / maxAmt) * 120);
          const x = 24 + i * (280 / Math.max(n + 1, 1));
          const w = Math.max(8, 180 / (n + 2));
          return (
            <g key={row.year}>
              {showSI ? (
                <rect x={x + w * 0.55} y={140 - siH} width={w * 0.4} height={siH} fill={p.muted} opacity={0.45} rx={2} />
              ) : null}
              <motion.rect
                x={x}
                y={140 - barH}
                width={showSI ? w * 0.5 : w}
                height={barH}
                fill={i === 0 ? p.muted : "url(#ci-fill)"}
                filter={i > 0 ? "url(#ci-shadow)" : undefined}
                rx={2}
                initial={{ height: 0, y: 140 }}
                animate={{ height: barH, y: 140 - barH }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
              />
              {i > 0 ? (
                <text x={x + w / 2} y={140 - barH - 4} textAnchor="middle" fill={p.accent} className="text-[7px]">
                  +{Math.round(row.delta)}
                </text>
              ) : null}
              <text x={x + w / 2} y={152} textAnchor="middle" fill={p.text} className="text-[8px]">
                Y{row.year}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="text-xs text-center font-medium tabular-nums" style={{ color: p.text }}>
        A = ₹{Math.round(years[Math.min(shown, n)].ci).toLocaleString()} after {shown} year
        {shown === 1 ? "" : "s"}
        {showSI ? ` · SI ₹${Math.round(years[Math.min(shown, n)].si).toLocaleString()}` : ""}
      </p>
      <SliderPanel spec={spec} values={values} onChange={onChange} palette={p} />
      <CalcGrid spec={spec} values={values} palette={p} />
      <Button type="button" size="sm" onClick={animate}>
        ▶ Grow year by year
      </Button>
    </div>
  );
}

/** Fallback 2D summary when 3d scene path is unavailable */
export function HeightsDistancesViz({ spec, values, onChange, classLevel, palette }: TopicVizProps) {
  const angle = values.angle ?? 30;
  const distance = values.distance ?? 40;
  const height = distance * Math.tan((angle * Math.PI) / 180);
  const p = palette ?? resolvePalette({ paletteId: spec.paletteId, classLevel, colors: spec.colors });
  return (
    <div className="space-y-3">
      <p className="text-xs text-center font-medium tabular-nums" style={{ color: p.text }}>
        Height ≈ {height.toFixed(1)} m · tan({angle}°) × {distance} m
      </p>
      <p className="text-[11px] text-center" style={{ color: p.muted }}>
        Open with renderMode 3d + scene for the interactive tower view.
      </p>
      <SliderPanel spec={spec} values={values} onChange={onChange} palette={p} />
    </div>
  );
}

/** Wrap mensuration SVG labs with optional genuine 3D when renderMode is 3d but scene missing. */
export function withOptional3D(
  Base: ComponentType<TopicVizProps>,
  _kind: "cube" | "cylinder",
) {
  return function MensurationWith3D(props: TopicVizProps) {
    // Parent MathInteractiveVisualization prefers SceneRenderer when scene is present.
    return <Base {...props} />;
  };
}

export function prefers3D(spec: VisualizationSpec): boolean {
  if (spec.renderMode === "3d") return true;
  const t = (spec.visualizationType ?? "").toLowerCase();
  return t === "heights-distances-scene";
}
