import { useEffect, useMemo, useState, type ComponentType } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import type { VisualizationSpec } from "@/types/math-lesson";
import { resolvePalette } from "./design-tokens";
import { AlgebraStepperViz } from "./algebra-stepper";
import { SliderPanel, SvgPolishDefs, type TopicVizProps } from "./topic-viz-shared";

export { AlgebraStepperViz };

const fmtRate = (v: number) => String(Math.round(v * 10000) / 10000);

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

  const rupees = (v: number) => `₹${Math.round(v).toLocaleString("en-IN")}`;
  const short = (v: number) =>
    v >= 1e7 ? `₹${(v / 1e7).toFixed(1)}Cr` : v >= 1e5 ? `₹${(v / 1e5).toFixed(1)}L` : v >= 1e3 ? `₹${(v / 1e3).toFixed(1)}k` : rupees(v);
  const VW = 340;
  const base = 150;
  const top = 32;
  const scale = (v: number) => ((base - top) * v) / maxAmt;
  const slot = (VW - 30) / (n + 1);
  const bw = Math.min(30, slot * (showSI ? 0.42 : 0.7));
  const labelEvery = n + 1 > 9 ? Math.ceil((n + 1) / 8) : 1;
  const cur = years[Math.min(shown, n)];
  const rate = r / (100 * freq);
  const periods = freq * Math.min(shown, n);

  return (
    <div className="space-y-3">
      <svg viewBox={`0 0 ${VW} 180`} className="w-full max-w-md mx-auto h-auto rounded-xl border" style={{ borderColor: p.gridLine, background: p.surface }}>
        <line x1={20} y1={base} x2={VW - 6} y2={base} stroke="#334155" />
        {visible.map((row, i) => {
          const x = 24 + i * slot + (slot - (showSI ? bw * 2 + 3 : bw)) / 2;
          const pH = scale(P);
          const iH = Math.max(0, scale(row.ci) - pH);
          const showLabel = i % labelEvery === 0 || i === n;
          return (
            <g key={row.year}>
              <rect x={x} y={base - pH} width={bw} height={pH} fill="#94A3B8" rx={2} />
              <motion.rect
                x={x}
                width={bw}
                fill={p.primary}
                rx={2}
                initial={{ height: 0, y: base - pH }}
                animate={{ height: iH, y: base - pH - iH }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
              />
              {showSI ? (
                <rect x={x + bw + 3} y={base - scale(row.si)} width={bw} height={scale(row.si)} fill={p.accent} opacity={0.55} rx={2} />
              ) : null}
              {showLabel ? (
                <text x={x + bw / 2} y={base - scale(row.ci) - 4} textAnchor="middle" fontSize={8} fontWeight={700} fill={p.text}>
                  {short(row.ci)}
                </text>
              ) : null}
              {showLabel ? (
                <text x={x + bw / 2} y={base + 11} textAnchor="middle" fontSize={8} fill={p.text}>
                  {row.year === 0 ? "Start" : `Yr ${row.year}`}
                </text>
              ) : null}
            </g>
          );
        })}
        <g fontSize={8}>
          <rect x={24} y={6} width={8} height={8} fill="#94A3B8" rx={1} />
          <text x={35} y={13} fill={p.text}>
            money you put in (principal)
          </text>
          <rect x={160} y={6} width={8} height={8} fill={p.primary} rx={1} />
          <text x={171} y={13} fill={p.text}>
            interest added
          </text>
          {showSI ? (
            <>
              <rect x={240} y={6} width={8} height={8} fill={p.accent} opacity={0.55} rx={1} />
              <text x={251} y={13} fill={p.text}>
                simple interest
              </text>
            </>
          ) : null}
        </g>
      </svg>
      <div className="text-xs text-center space-y-1 tabular-nums max-w-md mx-auto" style={{ color: p.text }}>
        <p className="text-sm">
          After {Math.min(shown, n)} year{shown === 1 ? "" : "s"}: <b>A = {rupees(cur.ci)}</b> · interest earned ={" "}
          <b style={{ color: p.primary }}>{rupees(cur.ci - P)}</b>
          {showSI ? ` · with simple interest only ${rupees(cur.si)}` : ""}
        </p>
        <p>
          A = P × (1 + {freq > 1 ? `r/${100 * freq}` : "r/100"})
          <sup>{freq > 1 ? `${freq}n` : "n"}</sup> = {rupees(P)} × ({fmtRate(1 + rate)})<sup>{periods}</sup> = {rupees(cur.ci)}
        </p>
        <p style={{ color: p.muted }}>
          Each year the interest is worked out on the new, bigger amount, so the blue part grows faster every year
          {cur.year > 0 ? ` (this year: +${rupees(cur.delta)})` : ""}.
        </p>
      </div>
      <SliderPanel spec={spec} values={values} onChange={onChange} palette={p} />
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
  const ground = 170;
  const ox = 40;
  const k = Math.min(190 / Math.max(distance, 1), 140 / Math.max(height, 1));
  const tx = ox + distance * k;
  const ty = ground - height * k;
  const a = (angle * Math.PI) / 180;
  const arcR = 34;
  return (
    <div className="space-y-3">
      <svg viewBox="0 0 320 200" className="w-full max-w-md mx-auto h-auto rounded-xl border" style={{ borderColor: p.gridLine, background: p.surface }}>
        <line x1={10} y1={ground} x2={310} y2={ground} stroke="#64748B" strokeWidth={2} />
        <rect x={tx - 6} y={ty} width={12} height={ground - ty} fill="#CBD5E1" stroke="#475569" />
        <line x1={ox} y1={ground} x2={tx} y2={ty} stroke="#c74440" strokeWidth={1.8} strokeDasharray="5 3" />
        <path
          d={`M ${ox + arcR} ${ground} A ${arcR} ${arcR} 0 0 0 ${ox + arcR * Math.cos(a)} ${ground - arcR * Math.sin(a)}`}
          fill="none"
          stroke="#e08a2b"
          strokeWidth={2}
        />
        <text x={ox + arcR + 6} y={ground - 8} fontSize={10} fontWeight={700} fill="#B45309">
          {angle}°
        </text>
        <circle cx={ox} cy={ground} r={4} fill="#0F172A" />
        <text x={ox} y={ground + 14} textAnchor="middle" fontSize={9} fill={p.text}>
          you
        </text>
        <polyline points={`${tx - 6},${ground - 10} ${tx - 16},${ground - 10} ${tx - 16},${ground}`} fill="none" stroke="#475569" />
        <text x={(ox + tx) / 2} y={ground + 14} textAnchor="middle" fontSize={10} fontWeight={700} fill="#388c46">
          distance = {distance} m
        </text>
        <text x={tx + 10} y={(ty + ground) / 2} fontSize={10} fontWeight={700} fill="#2d70b3">
          height ≈ {height.toFixed(1)} m
        </text>
        <text x={(ox + tx) / 2 - 10} y={(ground + ty) / 2 - 8} textAnchor="end" fontSize={9} fill="#c74440">
          line of sight
        </text>
      </svg>
      <div className="text-xs text-center space-y-1 tabular-nums" style={{ color: p.text }}>
        <p>
          tan(angle) = <span style={{ color: "#2d70b3" }}>opposite (height)</span> ÷{" "}
          <span style={{ color: "#388c46" }}>adjacent (distance)</span>
        </p>
        <p className="text-sm">
          height = distance × tan({angle}°) = {distance} × {Math.tan(a).toFixed(3)} ≈ <b>{height.toFixed(1)} m</b>
        </p>
      </div>
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
