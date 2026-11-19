/**
 * Class 9 EM Mathematics — textbook-aligned interactive visualizations.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { VisualizationSpec } from "@/types/math-lesson";
import { defaultSliderValues } from "./formula-utils";
import { ELEMENTARY_RENDERERS } from "./elementary-visualizations";
import { CalcGrid, SliderPanel, type TopicVizProps } from "./topic-viz-shared";
import { ControlPoint } from "./control-point";
import { SIGNATURE, resolvePalette, MOTION } from "./design-tokens";
import { StepScrubber, VizNarrative, VizStage } from "./viz-stage";
import { useAnswerFeedback } from "./use-answer-feedback";
import { GraphPaper, fmtNum, graphFrame, lineLabelAnchor, linearEquation, plotPoints, quadraticEquation } from "./graph-paper";
import { motion } from "framer-motion";
import {
  AreaResizerViz,
  CircleTangentViz,
  ProbabilityCoinViz,
  ProbabilityDiceViz,
  QuadrilateralMorphViz,
  StatisticsLabViz,
  TriangleExplorerViz,
} from "./shape-data-visualizations";
import {
  AlgebraStepperViz,
  CompoundInterestViz,
  HeightsDistancesViz,
  withOptional3D,
} from "./extended-visualizations";


const TILE = 28;
const HALO = { stroke: "white", strokeWidth: 3, paintOrder: "stroke" } as const;

/** Isometric SVG cube — reliable 3D look on all browsers */
function IsometricCubeSvg({ s, angle }: { s: number; angle: number }) {
  const scale = Math.min(72, Math.max(28, 16 + s * 10));
  const cx = 100;
  const cy = 108;
  const w = scale * 0.866;
  const h = scale * 0.5;
  const y0 = cy - scale * 0.15;

  const rad = (angle * Math.PI) / 180;
  const leftOpacity = 0.55 + 0.25 * Math.max(0, Math.cos(rad));
  const rightOpacity = 0.55 + 0.25 * Math.max(0, Math.sin(rad));
  const topOpacity = 0.72;

  const topFace = `${cx},${y0 - scale} ${cx + w},${y0 - scale + h} ${cx},${y0} ${cx - w},${y0 - scale + h}`;
  const leftFace = `${cx - w},${y0 - scale + h} ${cx - w},${y0 + h} ${cx},${y0 + scale} ${cx},${y0}`;
  const rightFace = `${cx},${y0} ${cx + w},${y0 - scale + h} ${cx + w},${y0 + h} ${cx},${y0 + scale}`;

  return (
    <svg viewBox="0 0 200 200" className="w-44 h-44 sm:w-52 sm:h-52 mx-auto">
      <defs>
        <linearGradient id="cube-left" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4338ca" stopOpacity={leftOpacity} />
          <stop offset="100%" stopColor="#312e81" stopOpacity={leftOpacity + 0.1} />
        </linearGradient>
        <linearGradient id="cube-right" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#6366f1" stopOpacity={rightOpacity} />
          <stop offset="100%" stopColor="#4f46e5" stopOpacity={rightOpacity + 0.1} />
        </linearGradient>
        <linearGradient id="cube-top" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#818cf8" stopOpacity={topOpacity} />
          <stop offset="100%" stopColor="#a5b4fc" stopOpacity={topOpacity} />
        </linearGradient>
      </defs>
      <polygon points={leftFace} fill="url(#cube-left)" stroke="#312e81" strokeWidth={1.5} strokeLinejoin="round" />
      <polygon points={rightFace} fill="url(#cube-right)" stroke="#312e81" strokeWidth={1.5} strokeLinejoin="round" />
      <polygon points={topFace} fill="url(#cube-top)" stroke="#4338ca" strokeWidth={1.5} strokeLinejoin="round" />
      <text x={cx} y={y0 + scale * 0.35} textAnchor="middle" className="fill-white text-[11px] font-bold" style={{ pointerEvents: "none" }}>
        s = {s}
      </text>
      <text x={cx + w * 0.55} y={y0 + h + scale * 0.55} textAnchor="middle" className="fill-muted-foreground text-[9px]">
        {s} units
      </text>
    </svg>
  );
}

function Cube3DScene({
  s,
  rotY,
  onPointerDrag,
}: {
  s: number;
  rotY: number;
  rotX?: number;
  onPointerDrag?: (deltaX: number) => void;
}) {
  const dragging = useRef(false);
  const lastX = useRef(0);

  return (
    <div
      className="flex justify-center items-center py-2 select-none touch-none cursor-grab active:cursor-grabbing"
      onPointerDown={(e) => {
        if (!onPointerDrag) return;
        dragging.current = true;
        lastX.current = e.clientX;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!dragging.current || !onPointerDrag) return;
        const dx = e.clientX - lastX.current;
        lastX.current = e.clientX;
        onPointerDrag(dx);
      }}
      onPointerUp={(e) => {
        dragging.current = false;
        try {
          (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
        } catch {
          /* pointer already released */
        }
      }}
      onPointerLeave={() => {
        dragging.current = false;
      }}
    >
      <IsometricCubeSvg s={s} angle={rotY} />
    </div>
  );
}

/** 3D cube with rotation */
export function MensurationCubeViz({ spec, values, onChange }: TopicVizProps) {
  const s = values.s ?? 3;
  const [rot, setRot] = useState(35);
  const [autoRotate, setAutoRotate] = useState(true);

  useEffect(() => {
    if (!autoRotate) return;
    const id = window.setInterval(() => setRot((r) => r + 0.8), 40);
    return () => window.clearInterval(id);
  }, [autoRotate]);

  const handleDrag = useCallback((deltaX: number) => {
    setAutoRotate(false);
    setRot((r) => r + deltaX * 0.6);
  }, []);

  return (
    <div className="space-y-4">
      <Cube3DScene s={s} rotY={rot} onPointerDrag={handleDrag} />
      <p className="text-xs text-center text-muted-foreground">
        Drag to rotate · Side s = {s} → SA = {6 * s * s}, V = {s * s * s}
      </p>
      <div className="flex justify-center gap-2">
        <Button
          type="button"
          size="sm"
          variant={autoRotate ? "default" : "outline"}
          onClick={() => setAutoRotate((v) => !v)}
        >
          {autoRotate ? "⏸ Pause spin" : "▶ Auto spin"}
        </Button>
      </div>
      <SliderPanel spec={spec} values={values} onChange={onChange} />
      <CalcGrid spec={spec} values={values} />
    </div>
  );
}
export function AlgebraTilesViz({ spec, values, onChange, onReset }: TopicVizProps) {
  const a = Math.round(values.a ?? 3);
  const b = Math.round(values.b ?? 2);
  const [hideAb, setHideAb] = useState(false);
  const S = a + b;
  const pad = 26;
  const T = TILE;
  const tiles = [
    { x: 0, y: 0, w: a, h: a, label: "a²", val: a * a, color: "#3B82F6", ab: false },
    { x: a, y: 0, w: b, h: a, label: "ab", val: a * b, color: "#10B981", ab: true },
    { x: 0, y: a, w: a, h: b, label: "ab", val: a * b, color: "#10B981", ab: true },
    { x: a, y: a, w: b, h: b, label: "b²", val: b * b, color: "#F59E0B", ab: false },
  ];
  const brace = (x1: number, x2: number, y: number, label: string, color: string) => (
    <g>
      <line x1={x1 + 2} y1={y} x2={x2 - 2} y2={y} stroke={color} strokeWidth={2} />
      <line x1={x1 + 2} y1={y - 4} x2={x1 + 2} y2={y + 4} stroke={color} strokeWidth={2} />
      <line x1={x2 - 2} y1={y - 4} x2={x2 - 2} y2={y + 4} stroke={color} strokeWidth={2} />
      <text x={(x1 + x2) / 2} y={y - 6} textAnchor="middle" fontSize={11} fontWeight={700} fill={color}>
        {label}
      </text>
    </g>
  );
  const vbrace = (y1: number, y2: number, x: number, label: string, color: string) => (
    <g>
      <line x1={x} y1={y1 + 2} x2={x} y2={y2 - 2} stroke={color} strokeWidth={2} />
      <line x1={x - 4} y1={y1 + 2} x2={x + 4} y2={y1 + 2} stroke={color} strokeWidth={2} />
      <line x1={x - 4} y1={y2 - 2} x2={x + 4} y2={y2 - 2} stroke={color} strokeWidth={2} />
      <text x={x - 6} y={(y1 + y2) / 2 + 4} textAnchor="end" fontSize={11} fontWeight={700} fill={color}>
        {label}
      </text>
    </g>
  );

  return (
    <div className="space-y-4">
      <svg viewBox={`0 0 ${S * T + pad + 8} ${S * T + pad + 8}`} className="w-full max-w-xs mx-auto h-auto">
        {brace(pad, pad + a * T, 14, `a = ${a}`, "#1D4ED8")}
        {brace(pad + a * T, pad + S * T, 14, `b = ${b}`, "#B45309")}
        {vbrace(pad, pad + a * T, 18, `a`, "#1D4ED8")}
        {vbrace(pad + a * T, pad + S * T, 18, `b`, "#B45309")}
        <g transform={`translate(${pad}, ${pad})`}>
          {tiles.map((t, i) => {
            const hidden = hideAb && t.ab;
            return (
              <g key={i} style={{ transition: "opacity 400ms" }} opacity={hidden ? 1 : 1}>
                <rect
                  x={t.x * T}
                  y={t.y * T}
                  width={t.w * T}
                  height={t.h * T}
                  fill={hidden ? "#ffffff" : `${t.color}55`}
                  stroke={hidden ? "#DC2626" : t.color}
                  strokeWidth={hidden ? 1.5 : 1.2}
                  strokeDasharray={hidden ? "5 3" : undefined}
                />
                {!hidden
                  ? Array.from({ length: t.w * t.h }).map((_, k) => (
                      <rect
                        key={k}
                        x={(t.x + (k % t.w)) * T}
                        y={(t.y + Math.floor(k / t.w)) * T}
                        width={T}
                        height={T}
                        fill="none"
                        stroke={t.color}
                        strokeOpacity={0.35}
                        strokeWidth={0.6}
                      />
                    ))
                  : null}
                <text
                  x={(t.x + t.w / 2) * T}
                  y={(t.y + t.h / 2) * T + 4}
                  textAnchor="middle"
                  fontSize={Math.min(12, 6 + Math.min(t.w, t.h) * 3)}
                  fontWeight={700}
                  fill={hidden ? "#DC2626" : "#1E293B"}
                >
                  {hidden ? "missing!" : `${t.label} = ${t.val}`}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
      <p className="text-center text-sm font-semibold tabular-nums">
        (a + b)² = {S}² = {S * S} = <span className="text-blue-700">{a * a}</span> +{" "}
        <span className="text-emerald-700">{a * b}</span> + <span className="text-emerald-700">{a * b}</span> +{" "}
        <span className="text-amber-700">{b * b}</span>
      </p>
      <p className="text-center text-xs text-muted-foreground">
        {hideAb ? (
          <>
            a² + b² = {a * a + b * b} only covers part of the big square — the two{" "}
            <b className="text-red-600">ab</b> pieces ({2 * a * b}) are missing. That is why (a + b)² = a² + <b>2ab</b> + b².
          </>
        ) : (
          <>
            A square of side a + b splits into one a² square, one b² square and <b className="text-emerald-700">two ab rectangles</b>.
          </>
        )}
      </p>
      <SliderPanel spec={spec} values={values} onChange={onChange} />
      <div className="flex gap-2 justify-center">
        <Button type="button" size="sm" onClick={() => setHideAb((v) => !v)}>
          {hideAb ? "Show all four pieces" : "Show only a² + b²"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            setHideAb(false);
            onReset();
          }}
        >
          Reset
        </Button>
      </div>
    </div>
  );
}

function factorTarget(spec: VisualizationSpec): { b: number; c: number } {
  const coeffs = spec.coefficients ?? [];
  if (coeffs.length >= 3 && coeffs[0] === 1) return { b: coeffs[1], c: coeffs[2] };
  const m = /x²\s*\+\s*(\d+)\s*x\s*\+\s*(\d+)/.exec(`${spec.title ?? ""} ${spec.description ?? ""}`);
  if (m) return { b: Number(m[1]), c: Number(m[2]) };
  return { b: 7, c: 12 };
}

/** x² + bx + c as a rectangle of tiles: one x², w + h strips of x, w × h unit squares. */
export function FactorRectangleViz({ spec, values, onChange, palette, classLevel }: TopicVizProps) {
  const w = Math.round(values.width ?? 1);
  const h = Math.round(values.height ?? 2);
  const { b: tb, c: tc } = factorTarget(spec);
  const p = palette ?? resolvePalette({ paletteId: spec.paletteId, classLevel, colors: spec.colors });
  const { feedback, flash } = useAnswerFeedback();
  const u = 18;
  const X = 90;
  const ox = 34;
  const oy = 30;
  const span = Math.min(12, Math.max(6, tb, w, h));
  const Wpx = X + w * u;
  const Hpx = X + h * u;
  const sumOk = w + h === tb;
  const prodOk = w * h === tc;
  const correct = sumOk && prodOk;
  const target = `x² + ${tb}x + ${tc}`;

  return (
    <div className="space-y-4">
      <motion.div
        animate={feedback === "incorrect" ? { x: [0, -6, 6, -6, 6, 0] } : { x: 0 }}
        transition={{ duration: 0.28 }}
      >
        <svg viewBox={`0 0 ${ox + X + span * u + 20} ${oy + X + span * u + 20}`} className="w-full max-w-sm mx-auto h-auto block">
          <text x={ox + X / 2} y={oy - 10} textAnchor="middle" fontSize={11} fontWeight={700} fill="#1D4ED8">
            x
          </text>
          <text x={ox + X + (w * u) / 2} y={oy - 10} textAnchor="middle" fontSize={11} fontWeight={700} fill="#B45309">
            {w}
          </text>
          <text x={ox - 8} y={oy + X / 2 + 4} textAnchor="end" fontSize={11} fontWeight={700} fill="#1D4ED8">
            x
          </text>
          <text x={ox - 8} y={oy + X + (h * u) / 2 + 4} textAnchor="end" fontSize={11} fontWeight={700} fill="#B45309">
            {h}
          </text>
          <g stroke="#CBD5E1" strokeWidth={0.6} strokeDasharray="2 2">
            {Array.from({ length: span + 1 }).map((_, i) => (
              <g key={`g${i}`}>
                <line x1={ox + X + i * u} y1={oy} x2={ox + X + i * u} y2={oy + X + span * u} />
                <line x1={ox} y1={oy + X + i * u} x2={ox + X + span * u} y2={oy + X + i * u} />
              </g>
            ))}
          </g>
          <rect x={ox} y={oy} width={X} height={X} fill="#3B82F655" stroke="#3B82F6" />
          <text x={ox + X / 2} y={oy + X / 2 + 5} textAnchor="middle" fontSize={15} fontWeight={700} fill="#1E3A8A">
            x²
          </text>
          {Array.from({ length: w }).map((_, i) => (
            <rect key={`r${i}`} x={ox + X + i * u} y={oy} width={u} height={X} fill="#10B98144" stroke="#10B981" strokeWidth={0.8} />
          ))}
          {Array.from({ length: h }).map((_, i) => (
            <rect key={`b${i}`} x={ox} y={oy + X + i * u} width={X} height={u} fill="#10B98144" stroke="#10B981" strokeWidth={0.8} />
          ))}
          {Array.from({ length: w * h }).map((_, i) => (
            <rect
              key={`u${i}`}
              x={ox + X + (i % w) * u}
              y={oy + X + Math.floor(i / w) * u}
              width={u}
              height={u}
              fill="#F59E0B55"
              stroke="#F59E0B"
              strokeWidth={0.8}
            />
          ))}
          <text x={ox + X + (w * u) / 2} y={oy + X / 2 + 4} textAnchor="middle" fontSize={9} fontWeight={700} fill="#065F46">
            {w}x
          </text>
          <text x={ox + X / 2} y={oy + X + (h * u) / 2 + 3} textAnchor="middle" fontSize={9} fontWeight={700} fill="#065F46">
            {h}x
          </text>
          <text x={ox + X + (w * u) / 2} y={oy + X + (h * u) / 2 + 3} textAnchor="middle" fontSize={9} fontWeight={700} fill="#92400E">
            {w * h}
          </text>
          <rect
            x={ox}
            y={oy}
            width={Wpx}
            height={Hpx}
            fill="none"
            stroke={correct ? SIGNATURE.green : feedback === "incorrect" ? SIGNATURE.red : "#1E293B"}
            strokeWidth={2}
          />
          <ControlPoint
            cx={ox + Wpx}
            cy={oy + Hpx}
            active
            onPointerDown={(e) => {
              e.stopPropagation();
              const svg = (e.target as Element).closest("svg");
              if (!svg) return;
              const vb = svg.viewBox.baseVal;
              const move = (ev: PointerEvent) => {
                const r = svg.getBoundingClientRect();
                const sx = ((ev.clientX - r.left) / r.width) * vb.width;
                const sy = ((ev.clientY - r.top) / r.height) * vb.height;
                onChange("width", Math.round(Math.min(span, Math.max(1, (sx - ox - X) / u))));
                onChange("height", Math.round(Math.min(span, Math.max(1, (sy - oy - X) / u))));
              };
              const up = () => {
                window.removeEventListener("pointermove", move);
                window.removeEventListener("pointerup", up);
              };
              window.addEventListener("pointermove", move);
              window.addEventListener("pointerup", up);
            }}
          />
        </svg>
      </motion.div>
      <div className="text-center space-y-1">
        <p className="text-sm font-semibold tabular-nums">
          (x + {w})(x + {h}) = x² + {w + h}x + {w * h}
        </p>
        <p className="text-xs">
          Goal: <b>{target}</b>
        </p>
        <div className="flex justify-center gap-2 text-xs">
          <span className={`rounded-full px-2 py-0.5 border ${sumOk ? "bg-emerald-50 border-emerald-300 text-emerald-700" : "bg-slate-50"}`}>
            green x-strips: {w} + {h} = {w + h} {sumOk ? "✓" : `(need ${tb})`}
          </span>
          <span className={`rounded-full px-2 py-0.5 border ${prodOk ? "bg-emerald-50 border-emerald-300 text-emerald-700" : "bg-slate-50"}`}>
            orange squares: {w} × {h} = {w * h} {prodOk ? "✓" : `(need ${tc})`}
          </span>
        </div>
        {correct ? (
          <p className="text-sm font-semibold" style={{ color: SIGNATURE.green }}>
            ✓ {target} = (x + {w})(x + {h})
          </p>
        ) : (
          <p className="text-xs" style={{ color: p.muted }}>
            Find two numbers that add to {tb} and multiply to {tc}. Drag the orange corner or use the sliders.
          </p>
        )}
      </div>
      <div className="flex justify-center">
        <Button type="button" size="sm" onClick={() => flash(correct ? "correct" : "incorrect")} style={{ background: p.primary }}>
          Check factors
        </Button>
      </div>
      <SliderPanel spec={spec} values={values} onChange={onChange} palette={p} />
    </div>
  );
}

/** Point, segment, ray, line */
export function GeometryBasicsViz({ spec }: TopicVizProps) {
  const draggables = spec.draggableObjects ?? [
    { id: "A", label: "A", initialX: 50, initialY: 100, color: "#3B82F6" },
    { id: "B", label: "B", initialX: 200, initialY: 100, color: "#10B981" },
  ];
  const [pts, setPts] = useState(() =>
    Object.fromEntries(draggables.map((d) => [d.id, { x: d.initialX ?? 50, y: d.initialY ?? 80 }])),
  );
  const [mode, setMode] = useState<"segment" | "ray" | "line">("segment");
  const [extend, setExtend] = useState(0);
  const dragging = useRef<string | null>(null);

  const A = pts.A ?? { x: 50, y: 100 };
  const B = pts.B ?? { x: 200, y: 100 };
  const dx = B.x - A.x;
  const dy = B.y - A.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1">
        {(["segment", "ray", "line"] as const).map((m) => (
          <Button key={m} type="button" size="sm" variant={mode === m ? "default" : "outline"} onClick={() => setMode(m)}>
            {m.charAt(0).toUpperCase() + m.slice(1)}
          </Button>
        ))}
        <Button type="button" size="sm" variant="outline" onClick={() => setExtend((e) => (e + 1) % 3)}>▶ Extend</Button>
      </div>
      <svg
        viewBox="0 0 260 160"
        className="w-full h-44 rounded-xl border border-border/50 bg-background touch-none"
        onPointerMove={(e) => {
          if (!dragging.current) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * 260;
          const y = ((e.clientY - rect.top) / rect.height) * 160;
          setPts((p) => ({ ...p, [dragging.current!]: { x, y } }));
        }}
        onPointerUp={() => { dragging.current = null; }}
      >
        {mode === "line" ? (
          <line x1={A.x - ux * 200} y1={A.y - uy * 200} x2={B.x + ux * 200} y2={B.y + uy * 200} stroke="#64748B" strokeWidth={2} strokeDasharray="6 4" />
        ) : null}
        {mode === "ray" || (mode === "segment" && extend > 0) ? (
          <>
            <line x1={A.x} y1={A.y} x2={B.x + ux * 80 * extend} y2={B.y + uy * 80 * extend} stroke="#F59E0B" strokeWidth={2} />
            {mode === "ray" ? (
              <polygon
                points={`${B.x + ux * 80 * extend},${B.y + uy * 80 * extend} ${B.x + ux * 80 * extend - uy * 8 - ux * 4},${B.y + uy * 80 * extend + ux * 8 - uy * 4} ${B.x + ux * 80 * extend + uy * 8 - ux * 4},${B.y + uy * 80 * extend - ux * 8 - uy * 4}`}
                fill="#F59E0B"
              />
            ) : null}
          </>
        ) : null}
        <line x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke={SIGNATURE.blue} strokeWidth={3} />
        {([
          ["A", A] as const,
          ["B", B] as const,
        ]).map(([id, pt]) => (
          <g key={id}>
            <ControlPoint
              cx={pt.x}
              cy={pt.y}
              active={dragging.current === id}
              onPointerDown={(e) => {
                e.stopPropagation();
                e.currentTarget.setPointerCapture(e.pointerId);
                dragging.current = id;
              }}
            />
            <text x={pt.x + 12} y={pt.y - 8} fill="#1a1a1f" fontSize={10} fontWeight={600}>
              {id}
            </text>
          </g>
        ))}
      </svg>
      <p className="text-xs" style={{ color: "#6b6c76" }}>
        {mode === "segment" && "Segment AB — two endpoints, finite length. Drag orange handles."}
        {mode === "ray" && "Ray — starts at A, passes through B, extends infinitely."}
        {mode === "line" && "Line — extends infinitely in both directions."}
      </p>
    </div>
  );
}

/** Point at `deg` (maths convention: 0° = right, anticlockwise) on a circle of radius r. */
function polar(cx: number, cy: number, r: number, deg: number) {
  const t = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(t), y: cy - r * Math.sin(t) };
}

/** Filled wedge from `fromDeg` turning anticlockwise by `sweep` degrees. */
function wedge(cx: number, cy: number, r: number, fromDeg: number, sweep: number) {
  const s = polar(cx, cy, r, fromDeg);
  const e = polar(cx, cy, r, fromDeg + sweep);
  return `M ${cx} ${cy} L ${s.x} ${s.y} A ${r} ${r} 0 ${sweep > 180 ? 1 : 0} 0 ${e.x} ${e.y} Z`;
}

function useSweep(run: (t: number) => void, durationMs = 2400) {
  const timer = useRef<number | null>(null);
  useEffect(() => () => {
    if (timer.current) window.clearInterval(timer.current);
  }, []);
  return useCallback(() => {
    if (timer.current) window.clearInterval(timer.current);
    const start = performance.now();
    timer.current = window.setInterval(() => {
      const t = Math.min(1, (performance.now() - start) / durationMs);
      run(t);
      if (t >= 1 && timer.current) {
        window.clearInterval(timer.current);
        timer.current = null;
      }
    }, 30);
  }, [run, durationMs]);
}

/** Draggable rays angle explorer */
export function AngleExplorerViz({ spec, values, onChange, palette, classLevel }: TopicVizProps) {
  const r1 = values.ray1 ?? 0;
  const r2 = values.ray2 ?? 45;
  const diff = (((r2 - r1) % 360) + 360) % 360;
  const angle = diff <= 180 ? diff : 360 - diff;
  const from = diff <= 180 ? r1 : r2;
  const type =
    angle === 0
      ? "Zero angle"
      : angle < 90
        ? "Acute (less than 90°)"
        : angle === 90
          ? "Right angle (exactly 90°)"
          : angle < 180
            ? "Obtuse (between 90° and 180°)"
            : "Straight angle (exactly 180°)";
  const cx = 120;
  const cy = 120;
  const R = 84;
  const p = palette ?? resolvePalette({ paletteId: spec.paletteId, classLevel, colors: spec.colors });
  const [drag, setDrag] = useState<"ray1" | "ray2" | null>(null);
  const a1 = polar(cx, cy, R, r1);
  const a2 = polar(cx, cy, R, r2);
  const lbl = polar(cx, cy, 44, from + angle / 2);

  const sweep = useSweep(
    useCallback((t: number) => onChange("ray2", Math.round((r1 + 180 * t) % 360)), [onChange, r1]),
  );

  const startDrag = (id: "ray1" | "ray2") => (e: React.PointerEvent) => {
    e.stopPropagation();
    setDrag(id);
    const svg = (e.target as Element).closest("svg")!;
    const move = (ev: PointerEvent) => {
      const r = svg.getBoundingClientRect();
      const x = ((ev.clientX - r.left) / r.width) * 240 - cx;
      const y = cy - ((ev.clientY - r.top) / r.height) * 240;
      let deg = (Math.atan2(y, x) * 180) / Math.PI;
      if (deg < 0) deg += 360;
      onChange(id, Math.round(deg) % 360);
    };
    const up = () => {
      setDrag(null);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    <div className="space-y-3">
      <VizStage palette={p} viewBox="0 0 240 240" heightClass="h-auto" hint="Drag the orange handles at the end of each ray">
        <circle cx={cx} cy={cy} r={R} fill="none" stroke={p.gridLine} />
        {Array.from({ length: 36 }).map((_, i) => {
          const d = i * 10;
          const o = polar(cx, cy, R, d);
          const inner = polar(cx, cy, R - (d % 30 === 0 ? 7 : 4), d);
          const t = polar(cx, cy, R + 11, d);
          return (
            <g key={d}>
              <line x1={inner.x} y1={inner.y} x2={o.x} y2={o.y} stroke={p.axisLine} strokeWidth={d % 30 === 0 ? 1.2 : 0.6} />
              {d % 30 === 0 ? (
                <text x={t.x} y={t.y + 3} textAnchor="middle" fontSize={7.5} fill={p.muted}>
                  {d}°
                </text>
              ) : null}
            </g>
          );
        })}
        {angle === 90 ? (
          (() => {
            const s1 = polar(cx, cy, 14, from);
            const s2 = polar(cx, cy, 14, from + 90);
            const c = { x: s1.x + s2.x - cx, y: s1.y + s2.y - cy };
            return (
              <path
                d={`M ${s1.x} ${s1.y} L ${c.x} ${c.y} L ${s2.x} ${s2.y}`}
                fill={`${SIGNATURE.orange}33`}
                stroke={SIGNATURE.orange}
                strokeWidth={2}
              />
            );
          })()
        ) : angle > 0 ? (
          <path d={wedge(cx, cy, 30, from, angle)} fill={`${SIGNATURE.orange}40`} stroke={SIGNATURE.orange} strokeWidth={2} />
        ) : null}
        <line x1={cx} y1={cy} x2={a1.x} y2={a1.y} stroke={SIGNATURE.blue} strokeWidth={3} strokeLinecap="round" />
        <line x1={cx} y1={cy} x2={a2.x} y2={a2.y} stroke={SIGNATURE.green} strokeWidth={3} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={3} fill="#1E293B" />
        <text x={lbl.x} y={lbl.y + 4} textAnchor="middle" fontSize={11} fontWeight={700} fill="#9A3412">
          {angle}°
        </text>
        <ControlPoint cx={a1.x} cy={a1.y} active={drag === "ray1"} onPointerDown={startDrag("ray1")} />
        <ControlPoint cx={a2.x} cy={a2.y} active={drag === "ray2"} onPointerDown={startDrag("ray2")} />
      </VizStage>
      <div className="text-center space-y-1">
        <p className="text-base font-semibold">
          {angle}° — {type}
        </p>
        <p className="text-xs" style={{ color: p.muted }}>
          The angle is the amount of turn from the <span style={{ color: SIGNATURE.blue, fontWeight: 600 }}>blue ray</span> to
          the <span style={{ color: SIGNATURE.green, fontWeight: 600 }}>green ray</span>, read on the protractor scale.
          {angle > 0 && angle < 180 ? ` Going the long way round is the reflex angle ${360 - angle}°.` : ""}
        </p>
      </div>
      <SliderPanel spec={spec} values={values} onChange={onChange} palette={p} />
      <div className="flex justify-center">
        <Button type="button" size="sm" onClick={sweep}>
          ▶ Sweep from 0° to 180°
        </Button>
      </div>
    </div>
  );
}

type PairMode = "corresponding" | "alternate" | "co-interior" | "vertical";

const PAIR_INFO: Record<PairMode, { label: string; pairs: [number, number][]; rule: string }> = {
  corresponding: {
    label: "Corresponding",
    pairs: [
      [1, 5],
      [2, 6],
      [3, 7],
      [4, 8],
    ],
    rule: "Corresponding angles sit in the same position at each crossing. With parallel lines they are equal.",
  },
  alternate: {
    label: "Alternate interior",
    pairs: [
      [3, 5],
      [4, 6],
    ],
    rule: "Alternate interior angles are between the parallel lines, on opposite sides of the transversal (a Z shape). They are equal.",
  },
  "co-interior": {
    label: "Co-interior",
    pairs: [
      [3, 6],
      [4, 5],
    ],
    rule: "Co-interior angles are between the parallel lines on the same side of the transversal. They add up to 180°.",
  },
  vertical: {
    label: "Vertically opposite",
    pairs: [
      [1, 3],
      [2, 4],
      [5, 7],
      [6, 8],
    ],
    rule: "Vertically opposite angles face each other across a crossing point. They are always equal.",
  },
};

const PAIR_COLORS = ["#2563EB", "#16A34A", "#EA580C", "#9333EA"];

/** Parallel lines + transversal */
export function ParallelTransversalViz({ spec, values, onChange }: TopicVizProps) {
  const theta = Math.max(10, Math.min(170, values.transversal ?? 60));
  const [mode, setMode] = useState<PairMode>("corresponding");
  const W = 300;
  const yTop = 75;
  const yBot = 155;
  const cx = 150;
  const cy = (yTop + yBot) / 2;
  const t = (theta * Math.PI) / 180;
  const xAt = (y: number) => cx + ((cy - y) / Math.sin(t)) * Math.cos(t);
  const P1 = { x: xAt(yTop), y: yTop };
  const P2 = { x: xAt(yBot), y: yBot };
  const far = 140;
  const tA = { x: cx + far * Math.cos(t), y: cy - far * Math.sin(t) };
  const tB = { x: cx - far * Math.cos(t), y: cy + far * Math.sin(t) };

  // Angle n at crossing P: regions anticlockwise from the right-hand side of the parallel line.
  const regions = [
    { from: 0, size: theta },
    { from: theta, size: 180 - theta },
    { from: 180, size: theta },
    { from: 180 + theta, size: 180 - theta },
  ];
  const angles = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => {
    const at = n <= 4 ? P1 : P2;
    const reg = regions[(n - 1) % 4];
    return { n, at, ...reg };
  });
  const [pairIdx, setPairIdx] = useState(0);
  const info = PAIR_INFO[mode];
  const pair = info.pairs[Math.min(pairIdx, info.pairs.length - 1)];
  const pairColor = PAIR_COLORS[Math.min(pairIdx, info.pairs.length - 1) % PAIR_COLORS.length];
  const colorOf = (n: number) => (pair[0] === n || pair[1] === n ? pairColor : null);

  const sweep = useSweep(
    useCallback((k: number) => onChange("transversal", Math.round(30 + 120 * Math.sin(k * Math.PI))), [onChange]),
    3000,
  );

  const sizeOf = (n: number) => Math.round(angles[n - 1].size);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5 justify-center">
        {(Object.keys(PAIR_INFO) as PairMode[]).map((k) => (
          <Button
            key={k}
            type="button"
            size="sm"
            variant={mode === k ? "default" : "outline"}
            onClick={() => {
              setMode(k);
              setPairIdx(0);
            }}
          >
            {PAIR_INFO[k].label}
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5 justify-center text-xs">
        {info.pairs.map(([a, b], i) => (
          <button
            key={`${a}-${b}`}
            type="button"
            onClick={() => setPairIdx(i)}
            className="rounded-full border px-2.5 py-0.5 font-semibold"
            style={
              i === pairIdx
                ? { background: PAIR_COLORS[i % PAIR_COLORS.length], color: "white", borderColor: "transparent" }
                : { color: PAIR_COLORS[i % PAIR_COLORS.length] }
            }
          >
            ∠{a} & ∠{b}
          </button>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} 230`} className="w-full max-w-md mx-auto h-auto rounded-xl border bg-white">
        <defs>
          <clipPath id="pt-clip">
            <rect x={0} y={0} width={W} height={230} />
          </clipPath>
        </defs>
        <g clipPath="url(#pt-clip)">
          {[yTop, yBot].map((y, i) => (
            <g key={y}>
              <line x1={10} y1={y} x2={W - 10} y2={y} stroke="#334155" strokeWidth={2} />
              <path d={`M ${W - 40} ${y - 5} L ${W - 34} ${y} L ${W - 40} ${y + 5}`} fill="none" stroke="#334155" strokeWidth={1.5} />
              <path d={`M ${W - 34} ${y - 5} L ${W - 28} ${y} L ${W - 34} ${y + 5}`} fill="none" stroke="#334155" strokeWidth={1.5} />
              <text x={14} y={y - 6} fontSize={10} fontWeight={700} fill="#334155">
                {i === 0 ? "l" : "m"}
              </text>
            </g>
          ))}
          <line x1={tA.x} y1={tA.y} x2={tB.x} y2={tB.y} stroke="#B45309" strokeWidth={2.5} />
          {angles.map((a) => {
            const col = colorOf(a.n);
            const lab = polar(a.at.x, a.at.y, col ? 36 : 28, a.from + a.size / 2);
            return (
              <g key={a.n}>
                <path
                  d={wedge(a.at.x, a.at.y, col ? 22 : 16, a.from, a.size)}
                  fill={col ? `${col}66` : "#94A3B815"}
                  stroke={col ?? "#E2E8F0"}
                  strokeWidth={col ? 1.5 : 0.6}
                />
                <text
                  x={lab.x}
                  y={lab.y + 3}
                  textAnchor="middle"
                  fontSize={col ? 10 : 8}
                  fontWeight={col ? 700 : 500}
                  fill={col ?? "#94A3B8"}
                  {...HALO}
                >
                  {col ? `∠${a.n} = ${Math.round(a.size)}°` : a.n}
                </text>
              </g>
            );
          })}
        </g>
        <text x={W - 12} y={222} fontSize={8} textAnchor="end" fill="#64748B">
          l ∥ m (the arrows mean the lines are parallel)
        </text>
        <text x={tA.x > W - 30 ? W - 30 : tA.x + 4} y={Math.max(12, tA.y + 12)} fontSize={9} fill="#B45309" fontWeight={600}>
          transversal
        </text>
      </svg>
      <div className="text-center space-y-1 max-w-md mx-auto">
        <p className="text-sm font-semibold">
          <span style={{ color: pairColor }}>
            ∠{pair[0]} and ∠{pair[1]}
          </span>
          {mode === "co-interior"
            ? `: ${sizeOf(pair[0])}° + ${sizeOf(pair[1])}° = 180°`
            : `: ${sizeOf(pair[0])}° = ${sizeOf(pair[1])}°`}
        </p>
        <p className="text-xs text-muted-foreground">
          {info.rule} Tap a pair above to see the others.
        </p>
      </div>
      <SliderPanel spec={spec} values={values} onChange={onChange} />
      <div className="flex justify-center">
        <Button type="button" size="sm" variant="outline" onClick={sweep}>
          ▶ Tilt the transversal
        </Button>
      </div>
    </div>
  );
}

/** y = mx + c, or quadratic sub-mode y = ax² + bx + c */
export function LinearGraphViz({ spec, values, onChange, palette }: TopicVizProps) {
  const coeffs = spec.coefficients ?? [];
  const quadratic =
    spec.curveType === "quadratic" ||
    spec.graphMode === "quadratic" ||
    (spec.visualizationType ?? "").toLowerCase().includes("quadratic") ||
    (values.a !== undefined && values.m === undefined);
  const m = values.m ?? 1;
  const a = values.a ?? coeffs[0] ?? 1;
  const b = values.b ?? coeffs[1] ?? 0;
  const c = values.c ?? (quadratic ? coeffs[2] ?? 0 : 0);
  const frame = graphFrame(quadratic ? 6 : 10);
  const { X, Y } = frame;
  const paren = (n: number) => (n < 0 ? `(${fmtNum(n)})` : fmtNum(n));

  const slider = (id: string) => (spec.sliders ?? []).find((s) => s.id === id);
  const cMin = slider("c")?.min ?? -10;
  const cMax = slider("c")?.max ?? 10;

  if (quadratic) {
    const f = (x: number) => a * x * x + b * x + c;
    const disc = b * b - 4 * a * c;
    const roots: number[] = [];
    if (Math.abs(a) > 1e-9) {
      if (disc > 1e-9) roots.push((-b - Math.sqrt(disc)) / (2 * a), (-b + Math.sqrt(disc)) / (2 * a));
      else if (Math.abs(disc) <= 1e-9) roots.push(-b / (2 * a));
    }
    const h = Math.abs(a) > 1e-9 ? -b / (2 * a) : 0;
    const k = f(h);
    const rootText =
      roots.length === 2
        ? `two real roots: x = ${fmtNum(roots[0])} and x = ${fmtNum(roots[1])}`
        : roots.length === 1
          ? `one real root (touches the x-axis): x = ${fmtNum(roots[0])}`
          : "no real roots (never meets the x-axis)";
    return (
      <div className="space-y-3">
        <GraphPaper
          frame={frame}
          labelEvery={1}
          clipId="quad-clip"
          overlay={
            <text x={8} y={18} fontSize={12} fontWeight={700} fill={SIGNATURE.blue}>
              {quadraticEquation(a, b, c)}
            </text>
          }
        >
          {Math.abs(a) > 1e-9 ? (
            <line x1={X(h)} y1={0} x2={X(h)} y2={frame.size} stroke={SIGNATURE.purple} strokeDasharray="4 4" strokeWidth={1} />
          ) : null}
          <polyline points={plotPoints(frame, f)} fill="none" stroke={SIGNATURE.blue} strokeWidth={2.5} strokeLinejoin="round" />
          {roots.map((rx, i) => (
            <g key={i}>
              <circle cx={X(rx)} cy={Y(0)} r={5} fill={SIGNATURE.red} stroke="#fff" strokeWidth={1.5} />
              <text x={X(rx)} y={Y(0) + (i === 0 ? -9 : 20)} textAnchor="middle" fontSize={9} fontWeight={700} fill={SIGNATURE.red} {...HALO}>
                x = {fmtNum(rx)}
              </text>
            </g>
          ))}
          {Math.abs(a) > 1e-9 && Math.abs(k) < frame.range ? (
            <g>
              <circle cx={X(h)} cy={Y(k)} r={4.5} fill={SIGNATURE.purple} stroke="#fff" strokeWidth={1.5} />
              <text x={X(h) + 7} y={Y(k) + (a > 0 ? 14 : -8)} fontSize={9} fontWeight={600} fill={SIGNATURE.purple} {...HALO}>
                vertex ({fmtNum(h)}, {fmtNum(k)})
              </text>
            </g>
          ) : null}
        </GraphPaper>
        <div className="text-xs text-center space-y-1 max-w-md mx-auto">
          <p>
            <span className="font-semibold">a = {fmtNum(a)}</span>:{" "}
            {a > 0 ? "opens upward (U shape)" : a < 0 ? "opens downward (∩ shape)" : "a = 0 is a straight line, not a parabola"}
          </p>
          <p>
            Discriminant b² − 4ac = {paren(b)}² − 4 × {paren(a)} × {paren(c)} = <b>{fmtNum(disc)}</b>{" "}
            {disc > 0 ? "> 0" : disc === 0 ? "= 0" : "< 0"}, so the curve has{" "}
            <span style={{ color: SIGNATURE.red, fontWeight: 600 }}>{rootText}</span>.
          </p>
          <p className="text-muted-foreground">
            <span style={{ color: SIGNATURE.red }}>Red dots</span> = roots (where y = 0) ·{" "}
            <span style={{ color: SIGNATURE.purple }}>purple</span> = vertex and line of symmetry
          </p>
        </div>
        <SliderPanel spec={spec} values={values} onChange={onChange} palette={palette} />
      </div>
    );
  }

  const f = (x: number) => m * x + c;
  const anchor = lineLabelAnchor(frame, m, c);
  const run = Math.abs(m) <= 2 ? 3 : 1;
  const rise = m * run;
  const riseEnd = c + rise;
  const slopeWord =
    m > 0 ? `goes up ${fmtNum(m)}` : m < 0 ? `goes down ${fmtNum(Math.abs(m))}` : "stays level (flat line)";

  return (
    <div className="space-y-3">
      <GraphPaper
        frame={frame}
        clipId="lin-clip"
        overlay={
          <text x={8} y={18} fontSize={12} fontWeight={700} fill={SIGNATURE.blue}>
            {linearEquation(m, c)}
          </text>
        }
      >
        <polyline points={plotPoints(frame, f, 0.5)} fill="none" stroke={SIGNATURE.blue} strokeWidth={2.5} />
        {m !== 0 ? (
          <g>
            <line x1={X(0)} y1={Y(c)} x2={X(run)} y2={Y(c)} stroke={SIGNATURE.green} strokeWidth={2} strokeDasharray="3 2" />
            <line x1={X(run)} y1={Y(c)} x2={X(run)} y2={Y(riseEnd)} stroke={SIGNATURE.red} strokeWidth={2} strokeDasharray="3 2" />
            <text x={X(run / 2)} y={Y(c) + (m > 0 ? 12 : -5)} fontSize={9} textAnchor="middle" fill={SIGNATURE.green} fontWeight={700} {...HALO}>
              {run} right
            </text>
            <text x={X(run) + 4} y={(Y(c) + Y(riseEnd)) / 2 + 3} fontSize={9} fill={SIGNATURE.red} fontWeight={700} {...HALO}>
              {m > 0 ? `${fmtNum(rise)} up` : `${fmtNum(Math.abs(rise))} down`}
            </text>
          </g>
        ) : null}
        <text x={X(anchor.x) - 4} y={Y(anchor.y) + (m >= 0 ? -6 : 14)} fontSize={9} textAnchor="end" fill={SIGNATURE.blue} fontWeight={600} {...HALO}>
          {linearEquation(m, c)}
        </text>
        <ControlPoint
          cx={X(0)}
          cy={Y(c)}
          onPointerDown={(e) => {
            e.stopPropagation();
            const svg = (e.target as Element).closest("svg")!;
            const move = (ev: PointerEvent) => {
              const r = svg.getBoundingClientRect();
              const py = ((ev.clientY - r.top) / r.height) * frame.size;
              onChange("c", Math.max(cMin, Math.min(cMax, Math.round(frame.fromY(py)))));
            };
            const up = () => {
              window.removeEventListener("pointermove", move);
              window.removeEventListener("pointerup", up);
            };
            window.addEventListener("pointermove", move);
            window.addEventListener("pointerup", up);
          }}
        />
        <text x={X(0) - 8} y={Y(c) - 8} textAnchor="end" fontSize={9} fill={SIGNATURE.orange} fontWeight={700} {...HALO}>
          (0, {fmtNum(c)})
        </text>
      </GraphPaper>
      <div className="text-xs text-center space-y-1 max-w-md mx-auto">
        <p>
          <b>Slope m = {fmtNum(m)}</b>: for every 1 step right, the line {slopeWord}.
        </p>
        {m !== 0 ? (
          <p>
            Triangle on the graph: slope = <span style={{ color: SIGNATURE.red }}>up</span> ÷{" "}
            <span style={{ color: SIGNATURE.green }}>right</span> = {fmtNum(rise)} ÷ {run} = <b>{fmtNum(m)}</b>
          </p>
        ) : null}
        <p>
          <b style={{ color: SIGNATURE.orange }}>Intercept c = {fmtNum(c)}</b>: the line crosses the y-axis at (0, {fmtNum(c)}). Drag
          the orange dot to move it.
        </p>
      </div>
      <SliderPanel spec={spec} values={values} onChange={onChange} palette={palette} />
    </div>
  );
}

/** Two lines intersection */
export function LineIntersectionViz({ spec, values, onChange, palette }: TopicVizProps) {
  const m1 = values.m1 ?? 1;
  const c1 = values.c1 ?? 2;
  const m2 = values.m2 ?? -1;
  const c2 = values.c2 ?? 5;
  const frame = graphFrame(10);
  const { X, Y } = frame;
  const parallel = m1 === m2;
  const same = parallel && c1 === c2;
  const xInt = parallel ? NaN : (c2 - c1) / (m1 - m2);
  const yInt = parallel ? NaN : m1 * xInt + c1;
  const visible = !parallel && Math.abs(xInt) <= 10 && Math.abs(yInt) <= 10;
  const a1 = lineLabelAnchor(frame, m1, c1);
  const a2 = lineLabelAnchor(frame, m2, c2);
  const L1 = SIGNATURE.blue;
  const L2 = SIGNATURE.green;

  return (
    <div className="space-y-3">
      <GraphPaper frame={frame} clipId="int-clip">
        <polyline points={plotPoints(frame, (x) => m1 * x + c1, 0.5)} fill="none" stroke={L1} strokeWidth={2.5} />
        <polyline points={plotPoints(frame, (x) => m2 * x + c2, 0.5)} fill="none" stroke={L2} strokeWidth={2.5} strokeDasharray={same ? "6 4" : undefined} />
        <text x={X(a1.x) - 4} y={Y(a1.y) + (m1 >= 0 ? -6 : 14)} textAnchor="end" fontSize={9} fontWeight={700} fill={L1} {...HALO}>
          {linearEquation(m1, c1)}
        </text>
        <text x={X(a2.x) - 4} y={Y(a2.y) + (m2 >= 0 ? -6 : 14)} textAnchor="end" fontSize={9} fontWeight={700} fill={L2} {...HALO}>
          {linearEquation(m2, c2)}
        </text>
        {visible ? (
          <g>
            <line x1={X(xInt)} y1={Y(yInt)} x2={X(xInt)} y2={Y(0)} stroke={SIGNATURE.orange} strokeDasharray="3 3" />
            <line x1={X(xInt)} y1={Y(yInt)} x2={X(0)} y2={Y(yInt)} stroke={SIGNATURE.orange} strokeDasharray="3 3" />
            <circle cx={X(xInt)} cy={Y(yInt)} r={6} fill={SIGNATURE.orange} stroke="#fff" strokeWidth={2} />
            <text x={X(xInt) + 9} y={Y(yInt) - 8} fontSize={10} fontWeight={700} fill="#9a3412">
              ({fmtNum(xInt)}, {fmtNum(yInt)})
            </text>
          </g>
        ) : null}
      </GraphPaper>
      <div className="text-xs text-center space-y-1 max-w-md mx-auto">
        <p>
          <span style={{ color: L1, fontWeight: 700 }}>Line 1: {linearEquation(m1, c1)}</span> ·{" "}
          <span style={{ color: L2, fontWeight: 700 }}>Line 2: {linearEquation(m2, c2)}</span>
        </p>
        {same ? (
          <p className="font-semibold">Both equations draw the same line, so they meet at every point (infinitely many solutions).</p>
        ) : parallel ? (
          <p className="font-semibold">Same slope, different intercepts: the lines are parallel and never meet (no solution).</p>
        ) : (
          <p>
            They meet where both equations give the same y: x = {fmtNum(xInt)}, y = {fmtNum(yInt)}.{" "}
            <b style={{ color: "#9a3412" }}>
              ({fmtNum(xInt)}, {fmtNum(yInt)}) is the solution of both equations.
            </b>
            {!visible ? " (It is off this grid — change the sliders to bring it into view.)" : ""}
          </p>
        )}
      </div>
      <SliderPanel spec={spec} values={values} onChange={onChange} palette={palette} />
    </div>
  );
}

type Pt = { x: number; y: number };

const ANGLE_SUM_STEPS = [
  "A triangle has three angles: ∠A, ∠B and ∠C. Drag the top corner B to make any triangle you like.",
  "Draw a dashed line through B, parallel to the base AC.",
  "∠A slides up to B and fits exactly beside ∠B — alternate angles between parallel lines are equal.",
  "∠C slides up to the other side of ∠B, for the same reason.",
  "∠A, ∠B and ∠C now sit side by side on a straight line. A straight line is 180°, so the angles of every triangle add up to 180°.",
];

const angleOf = (p: Pt, q: Pt) => Math.atan2(q.y - p.y, q.x - p.x);

/** Signed sweep from a1 to a2, normalised to (-π, π]. */
function sweepBetween(a1: number, a2: number) {
  let d = a2 - a1;
  while (d <= -Math.PI) d += 2 * Math.PI;
  while (d > Math.PI) d -= 2 * Math.PI;
  return d;
}

function wedgePath(p: Pt, a1: number, a2: number, r: number) {
  const d = sweepBetween(a1, a2);
  const s = { x: p.x + r * Math.cos(a1), y: p.y + r * Math.sin(a1) };
  const e = { x: p.x + r * Math.cos(a1 + d), y: p.y + r * Math.sin(a1 + d) };
  return `M ${p.x} ${p.y} L ${s.x} ${s.y} A ${r} ${r} 0 0 ${d > 0 ? 1 : 0} ${e.x} ${e.y} Z`;
}

function wedgeLabel(p: Pt, a1: number, a2: number, r: number): Pt {
  const mid = a1 + sweepBetween(a1, a2) / 2;
  return { x: p.x + r * Math.cos(mid), y: p.y + r * Math.sin(mid) };
}

/** Triangle angle sum: move ∠A and ∠C to the top vertex to show they fill a straight line. */
export function TriangleAngleSumViz({ onReset }: TopicVizProps) {
  const A: Pt = { x: 50, y: 175 };
  const C: Pt = { x: 250, y: 175 };
  const [B, setB] = useState<Pt>({ x: 118, y: 62 });
  const [step, setStep] = useState(0);
  const dragging = useRef(false);
  const last = ANGLE_SUM_STEPS.length - 1;

  const R = 26;
  const colors = { A: "#3B82F6", B: "#10B981", C: "#F59E0B" };
  const wedges = [
    { id: "A" as const, at: A, a1: angleOf(A, C), a2: angleOf(A, B), moved: step >= 2 },
    { id: "B" as const, at: B, a1: angleOf(B, A), a2: angleOf(B, C), moved: false },
    { id: "C" as const, at: C, a1: angleOf(C, A), a2: angleOf(C, B), moved: step >= 3 },
  ];
  const deg = (w: (typeof wedges)[number]) => Math.abs(sweepBetween(w.a1, w.a2)) * (180 / Math.PI);
  const degA = Math.round(deg(wedges[0]));
  const degC = Math.round(deg(wedges[2]));
  const degB = 180 - degA - degC;
  const degrees = { A: degA, B: degB, C: degC };

  // Rotating a wedge 180° about the midpoint of its vertex and B lands it on the
  // alternate angle at B, between the parallel line and the side it shares.
  const moveTo = (p: Pt, moved: boolean) =>
    moved
      ? `translate(${B.x}px, ${B.y}px) rotate(180deg) translate(${-p.x}px, ${-p.y}px)`
      : `translate(${p.x}px, ${p.y}px) rotate(0deg) translate(${-p.x}px, ${-p.y}px)`;
  const slide = { transition: "transform 900ms cubic-bezier(.4,0,.2,1)", transformOrigin: "0 0", transformBox: "view-box" as const };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragging.current) return;
    const ctm = e.currentTarget.getScreenCTM();
    if (!ctm) return;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    setB({ x: Math.min(260, Math.max(40, p.x)), y: Math.min(135, Math.max(40, p.y)) });
  };

  return (
    <div className="space-y-3 text-center">
      <svg
        viewBox="0 0 300 200"
        className="w-full max-w-md mx-auto h-56 touch-none select-none"
        onPointerMove={onPointerMove}
        onPointerUp={() => { dragging.current = false; }}
        onPointerLeave={() => { dragging.current = false; }}
      >
        <polygon
          points={`${A.x},${A.y} ${B.x},${B.y} ${C.x},${C.y}`}
          fill="#64748B10"
          stroke="#64748B"
          strokeWidth={2}
          strokeLinejoin="round"
        />
        {step >= 1 && (
          <g>
            <line x1={B.x - 120} y1={B.y} x2={B.x + 120} y2={B.y} stroke="#64748B" strokeWidth={1.5} strokeDasharray="5 4" />
            <text x={B.x + 118} y={B.y - 6} textAnchor="end" className="text-[9px]" fill="#64748B">parallel to AC</text>
          </g>
        )}

        {wedges.map((w) => (
          <g key={`ghost-${w.id}`}>
            {w.moved && (
              <path d={wedgePath(w.at, w.a1, w.a2, R)} fill="none" stroke={colors[w.id]} strokeDasharray="3 3" opacity={0.6} />
            )}
          </g>
        ))}
        {wedges.map((w) => {
          const label = wedgeLabel(w.at, w.a1, w.a2, R + 13);
          const dx = w.moved ? B.x + w.at.x - 2 * label.x : 0;
          const dy = w.moved ? B.y + w.at.y - 2 * label.y : 0;
          return (
            <g key={w.id}>
              <g style={{ ...slide, transform: moveTo(w.at, w.moved) }}>
                <path d={wedgePath(w.at, w.a1, w.a2, R)} fill={`${colors[w.id]}55`} stroke={colors[w.id]} strokeWidth={1.5} />
              </g>
              <text
                x={label.x}
                y={label.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-[10px] font-semibold"
                fill={colors[w.id]}
                style={{ ...slide, transform: `translate(${dx}px, ${dy}px)` }}
              >
                {degrees[w.id]}°
              </text>
            </g>
          );
        })}

        {([["A", A, 0, 14], ["C", C, 0, 14], ["B", B, 0, -12]] as const).map(([id, p, ox, oy]) => (
          <text key={id} x={p.x + ox} y={p.y + oy} textAnchor="middle" className="text-[11px] font-bold" fill="#334155">
            {id}
          </text>
        ))}
        {step === 0 && (
          <ControlPoint
            cx={B.x}
            cy={B.y}
            active={dragging.current}
            onPointerDown={(e) => {
              e.stopPropagation();
              (e.currentTarget as Element).setPointerCapture(e.pointerId);
              dragging.current = true;
            }}
          />
        )}
      </svg>

      <p className="text-base font-semibold tabular-nums">
        <span style={{ color: colors.A }}>{degA}°</span>
        {" + "}
        <span style={{ color: colors.B }}>{degB}°</span>
        {" + "}
        <span style={{ color: colors.C }}>{degC}°</span>
        {" = "}
        <span className={step === last ? "text-primary" : ""}>180°</span>
      </p>
      <p className="text-sm text-muted-foreground min-h-[3rem] max-w-md mx-auto">
        <span className="font-medium text-foreground">Step {step + 1} of {ANGLE_SUM_STEPS.length}: </span>
        {ANGLE_SUM_STEPS[step]}
      </p>
      <div className="flex gap-2 justify-center">
        <Button type="button" size="sm" variant="outline" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
          ◀ Back
        </Button>
        <Button type="button" size="sm" disabled={step === last} onClick={() => setStep((s) => s + 1)}>
          {step === 0 ? "▶ Show me why" : "Next ▶"}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => { setStep(0); setB({ x: 118, y: 62 }); onReset(); }}>
          Reset
        </Button>
      </div>
    </div>
  );
}

/** Cylinder pseudo-3D */
export function MensurationCylinderViz({ spec, values, onChange }: TopicVizProps) {
  const r = values.r ?? 3;
  const h = values.h ?? 5;
  const k = Math.min(12, 70 / Math.max(r, 1), 120 / Math.max(h, 1));
  const rx = r * k;
  const top = 30;
  const bot = top + h * k;
  const cx = 110;
  const vol = Math.PI * r * r * h;
  const csa = 2 * Math.PI * r * h;
  return (
    <div className="space-y-4">
      <svg viewBox={`0 0 240 ${bot + 30}`} className="w-full max-w-xs mx-auto h-auto">
        <rect x={cx - rx} y={top} width={rx * 2} height={h * k} fill="#3B82F622" stroke="none" />
        <line x1={cx - rx} y1={top} x2={cx - rx} y2={bot} stroke="#3B82F6" strokeWidth={1.8} />
        <line x1={cx + rx} y1={top} x2={cx + rx} y2={bot} stroke="#3B82F6" strokeWidth={1.8} />
        <ellipse cx={cx} cy={bot} rx={rx} ry={10} fill="#3B82F633" stroke="#3B82F6" strokeWidth={1.8} />
        <ellipse cx={cx} cy={top} rx={rx} ry={10} fill="#BFDBFE" stroke="#3B82F6" strokeWidth={1.8} />
        <line x1={cx} y1={top} x2={cx + rx} y2={top} stroke={SIGNATURE.red} strokeWidth={2} />
        <circle cx={cx} cy={top} r={2.5} fill="#0F172A" />
        <text x={cx + rx / 2} y={top - 4} textAnchor="middle" fontSize={10} fontWeight={700} fill={SIGNATURE.red} {...HALO}>
          r = {fmtNum(r)}
        </text>
        <line x1={cx + rx + 14} y1={top} x2={cx + rx + 14} y2={bot} stroke={SIGNATURE.green} strokeWidth={1.5} />
        <text x={cx + rx + 18} y={(top + bot) / 2 + 4} fontSize={10} fontWeight={700} fill={SIGNATURE.green}>
          h = {fmtNum(h)}
        </text>
      </svg>
      <div className="text-center text-xs space-y-1 tabular-nums">
        <p>
          <b>Volume</b> = πr²h = π × {fmtNum(r)}² × {fmtNum(h)} ≈ <b>{fmtNum(Math.round(vol * 10) / 10)} cm³</b> (base circle area × height)
        </p>
        <p>
          <b>Curved surface</b> = 2πrh = 2 × π × {fmtNum(r)} × {fmtNum(h)} ≈ <b>{fmtNum(Math.round(csa * 10) / 10)} cm²</b> (unroll it into a
          rectangle: 2πr long, h tall)
        </p>
      </div>
      <SliderPanel spec={spec} values={values} onChange={onChange} />
    </div>
  );
}

/** Compass & ruler guided construction with scrubbable step history */
export function GeometryConstructionViz({ onReset, palette, classLevel, spec }: TopicVizProps) {
  const [step, setStep] = useState(0);
  const p = palette ?? resolvePalette({ paletteId: spec.paletteId, classLevel, colors: spec.colors });
  const A = { x: 60, y: 100 };
  const B = { x: 180, y: 100 };
  const mid = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 };
  const labels = [
    "Draw segment AB",
    "Arc centred at A",
    "Arc centred at B",
    "Perpendicular bisector",
  ];

  return (
    <div className="space-y-3">
      <StepScrubber step={step} total={4} labels={labels} onChange={setStep} palette={p} />
      <VizStage palette={p} viewBox="0 0 240 160" heightClass="h-40">
        <line x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke={p.axisLine} strokeWidth={2.5} />
        <circle cx={A.x} cy={A.y} r={4} fill={SIGNATURE.blue} />
        <circle cx={B.x} cy={B.y} r={4} fill={SIGNATURE.green} />
        <text x={A.x} y={A.y + 16} textAnchor="middle" fill={p.muted} fontSize={10}>
          A
        </text>
        <text x={B.x} y={B.y + 16} textAnchor="middle" fill={p.muted} fontSize={10}>
          B
        </text>
        {step >= 1 ? (
          <circle cx={A.x} cy={A.y} r={50} fill="none" stroke={SIGNATURE.blue} strokeDasharray="4 3" strokeWidth={1.5} />
        ) : null}
        {step >= 2 ? (
          <circle cx={B.x} cy={B.y} r={50} fill="none" stroke={SIGNATURE.green} strokeDasharray="4 3" strokeWidth={1.5} />
        ) : null}
        {step >= 3 ? (
          <>
            <line x1={mid.x} y1={20} x2={mid.x} y2={140} stroke={SIGNATURE.orange} strokeWidth={2.5} />
            <ControlPoint cx={mid.x} cy={mid.y} r={5} />
          </>
        ) : null}
      </VizStage>
      <div className="flex gap-2 justify-center flex-wrap">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            setStep(0);
            onReset();
          }}
        >
          Reset
        </Button>
      </div>
    </div>
  );
}

/** Integer legs a≥b≥1 with a²+b²=n (textbook √5 → 2 and 1). */
function legsForSqrtN(n: number): { a: number; b: number } {
  const N = Math.max(2, Math.round(n));
  for (let a = Math.floor(Math.sqrt(N - 1)); a >= 1; a--) {
    const b2 = N - a * a;
    const b = Math.round(Math.sqrt(b2));
    if (b >= 1 && b * b === b2) {
      return a >= b ? { a, b } : { a: b, b: a };
    }
  }
  // No integer pair (rare for school surds): keep a on the line, b = √(n−a²).
  const a = Math.max(1, Math.floor(Math.sqrt(N - 1)));
  const b = Math.sqrt(Math.max(0.25, N - a * a));
  return { a, b: Math.round(b * 100) / 100 };
}

/** Compass construction of √n — Cuemath labels: A at 0, B on line, C above B, D = √n; arc C→D. */
export function SqrtNumberLineViz({ values, onChange, onReset, palette, classLevel, spec }: TopicVizProps) {
  const [step, setStep] = useState(0);
  const p = palette ?? resolvePalette({ paletteId: spec.paletteId, classLevel, colors: spec.colors });
  const n = Math.max(2, Math.round(values.n ?? 5));
  const { a, b } = legsForSqrtN(n);
  const hyp = Math.sqrt(n);
  const approx = Math.round(hyp * 100) / 100;

  useEffect(() => {
    if (Math.round(values.a ?? 0) !== Math.round(a)) onChange("a", a);
    if (Math.abs((values.b ?? 0) - b) > 0.02) onChange("b", b);
  }, [n, a, b, values.a, values.b, onChange]);

  const vbW = 420;
  const vbH = 280;
  const padL = 40;
  const padR = 56;
  const padT = 28;
  const padB = 62;
  const maxX = Math.max(a, hyp, 4) + 0.75;
  const maxY = Math.max(b, 1.25);
  const unit = Math.max(
    12,
    Math.min((vbW - padL - padR) / maxX, (vbH - padT - padB) / maxY, 56),
  );
  // A = origin (0), B = (a,0) on the line, C = (a,b) above B, D = (√n, 0) on the line.
  const Ax = padL;
  const Ay = padT + maxY * unit;
  const Bx = Ax + a * unit;
  const By = Ay;
  const Cx = Bx;
  const Cy = Ay - b * unit;
  const Dx = Ax + hyp * unit;
  const Dy = Ay;
  const lineEnd = Math.min(vbW - 12, Ax + maxX * unit + 24);
  const tickMax = Math.ceil(maxX);
  const tickStep = tickMax > 12 ? Math.ceil(tickMax / 8) : tickMax > 8 ? 2 : 1;
  // Keep D's label from sitting on top of B when √n ≈ a (e.g. √5 ≈ 2.24 next to 2).
  const dLabelDx = Dx - Bx < 36 ? 18 : 0;

  useEffect(() => {
    setStep(0);
  }, [n]);

  const labels = [
    `Mark A at 0 and B at ${a}`,
    `Draw BC straight up from B, ${b} unit${b === 1 ? "" : "s"} long`,
    `Join A to C: AC = √${n}`,
    `Swing an arc from C down to the line at D = √${n}`,
  ];
  const why = [
    `A is at 0 and B is at ${a}. AB will be the bottom side of a right triangle.`,
    `BC stands straight up from B (a right angle). We pick ${a} and ${b} because ${a}² + ${b}² = ${n}.`,
    `AC is the longest side (hypotenuse). By Pythagoras, AC² = ${a}² + ${b}² = ${n}, so AC = √${n}.`,
    `Put the compass point on A and swing from C down to the line. The arc keeps the same length, so D is exactly √${n}.`,
  ];

  const draw = prefersReduced()
    ? { pathLength: 1 }
    : { pathLength: 1, transition: { duration: MOTION.drawMs / 1000, ease: MOTION.easeOut.ease } };

  const nOnlySpec = {
    ...spec,
    sliders: (spec.sliders ?? []).filter((s) => s.id === "n"),
  };

  return (
    <div className="space-y-4">
      <VizNarrative
        step={step}
        total={4}
        labels={labels}
        why={why}
        onChange={setStep}
        palette={p}
        callout={step >= 3 ? `√${n} ≈ ${approx}` : null}
      />
      <p className="text-[12px] text-center tabular-nums" style={{ color: p.muted }}>
        Legs: AB = {a}, BC = {b} (because {a}² + {b}² = {n})
      </p>
      <VizStage
        palette={p}
        viewBox={`0 0 ${vbW} ${vbH}`}
        heightClass="h-64"
        hint={
          step >= 3
            ? "The orange arc (centre A) carries the length AC down onto the number line at D."
            : "Press Next to build the construction one step at a time."
        }
      >
        <motion.line
          x1={Math.max(12, Ax - 16)}
          y1={Ay}
          x2={lineEnd}
          y2={Ay}
          stroke={p.axisLine}
          strokeWidth={2.5}
          initial={prefersReduced() ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35 }}
        />
        {Array.from({ length: Math.floor(tickMax / tickStep) + 1 }).map((_, i) => {
          const v = i * tickStep;
          if (v > tickMax) return null;
          const x = Ax + v * unit;
          if (x > lineEnd - 4) return null;
          return (
            <g key={v}>
              <line x1={x} y1={Ay - 7} x2={x} y2={Ay + 7} stroke={p.gridLine} strokeWidth={1.5} />
              <text x={x} y={Ay + 22} textAnchor="middle" fill={p.muted} fontSize={11}>
                {v}
              </text>
            </g>
          );
        })}
        <motion.circle
          cx={Ax}
          cy={Ay}
          r={5}
          fill={SIGNATURE.blue}
          initial={prefersReduced() ? false : { scale: 0 }}
          animate={{ scale: 1 }}
          transition={MOTION.land}
        />
        {/* Point letters above the axis so they don't sit on tick numerals. */}
        <text x={Ax} y={Ay - 14} textAnchor="middle" fill={p.muted} fontSize={12} fontWeight={600}>
          A
        </text>
        {step >= 0 ? (
          <>
            <motion.circle
              cx={Bx}
              cy={By}
              r={5}
              fill={SIGNATURE.green}
              initial={prefersReduced() ? false : { scale: 0 }}
              animate={{ scale: 1 }}
              transition={MOTION.land}
            />
            <text x={Bx - 15} y={By - 14} textAnchor="end" fill={p.muted} fontSize={12} fontWeight={600}>
              B
            </text>
            <text x={(Ax + Bx) / 2} y={Ay - 8} textAnchor="middle" fill={SIGNATURE.green} fontSize={11} fontWeight={600}>
              AB = {a}
            </text>
          </>
        ) : null}
        {step >= 1 ? (
          <>
            <motion.line
              x1={Bx}
              y1={By}
              x2={Cx}
              y2={Cy}
              stroke={SIGNATURE.blue}
              strokeWidth={2.5}
              initial={prefersReduced() ? false : { pathLength: 0 }}
              animate={draw}
            />
            <motion.rect
              x={Bx - 11}
              y={By - 11}
              width={11}
              height={11}
              fill="none"
              stroke={p.muted}
              strokeWidth={1.5}
              initial={prefersReduced() ? false : { opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.25 }}
            />
            <motion.circle
              cx={Cx}
              cy={Cy}
              r={5}
              fill={SIGNATURE.blue}
              initial={prefersReduced() ? false : { scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ ...MOTION.land, delay: 0.2 }}
            />
            <text x={Cx + 14} y={Cy + 4} fill={p.muted} fontSize={12} fontWeight={600}>
              C
            </text>
            <text x={Cx + 10} y={(By + Cy) / 2 + 4} fill={SIGNATURE.blue} fontSize={11} fontWeight={600}>
              BC = {b}
            </text>
          </>
        ) : null}
        {step >= 2 ? (
          <>
            <motion.line
              x1={Ax}
              y1={Ay}
              x2={Cx}
              y2={Cy}
              stroke={SIGNATURE.blue}
              strokeWidth={3}
              initial={prefersReduced() ? false : { pathLength: 0 }}
              animate={draw}
            />
            <text
              x={(Ax + Cx) / 2 - 6}
              y={(Ay + Cy) / 2 - 8}
              fill={SIGNATURE.blue}
              fontSize={13}
              fontWeight={600}
            >
              √{n}
            </text>
          </>
        ) : null}
        {step >= 3 ? (
          <>
            {/* Orange arc C → D, centre A (copies AC onto the number line). */}
            <motion.path
              d={`M ${Cx} ${Cy} A ${hyp * unit} ${hyp * unit} 0 0 1 ${Dx} ${Dy}`}
              fill="none"
              stroke={SIGNATURE.orange}
              strokeWidth={2.5}
              initial={prefersReduced() ? false : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: MOTION.sweepMs / 1000, ease: MOTION.easeOut.ease }}
            />
            <motion.circle
              cx={Dx}
              cy={Dy}
              r={7}
              fill={SIGNATURE.orange}
              initial={prefersReduced() ? false : { scale: 0 }}
              animate={{ scale: [0, 1.25, 1] }}
              transition={{ duration: 0.45, delay: (MOTION.sweepMs / 1000) * 0.7 }}
            />
            <text
              x={Dx + dLabelDx}
              y={Dy + 40}
              textAnchor="middle"
              fill={p.text}
              fontSize={13}
              fontWeight={600}
            >
              D = √{n}
            </text>
          </>
        ) : null}
      </VizStage>
      <SliderPanel
        spec={nOnlySpec.sliders?.length ? nOnlySpec : spec}
        values={values}
        onChange={(id, v) => {
          setStep(0);
          onChange(id, v);
        }}
        palette={p}
      />
      <div className="flex gap-2 justify-center">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            setStep(0);
            onReset();
          }}
        >
          Reset
        </Button>
      </div>
    </div>
  );
}

function prefersReduced(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const TOPIC_RENDERERS: Record<string, React.ComponentType<TopicVizProps>> = {
  ...ELEMENTARY_RENDERERS,
  "algebra-tiles": AlgebraTilesViz,
  "factor-rectangle": FactorRectangleViz,
  "geometry-basics": GeometryBasicsViz,
  "angle-explorer": AngleExplorerViz,
  "parallel-transversal": ParallelTransversalViz,
  "linear-graph": LinearGraphViz,
  "quadratic-grapher": LinearGraphViz,
  "line-intersection": LineIntersectionViz,
  "triangle-explorer": TriangleExplorerViz,
  "triangle-angle-sum": TriangleAngleSumViz,
  "quadrilateral-morph": QuadrilateralMorphViz,
  "statistics-lab": StatisticsLabViz,
  "mensuration-cube": withOptional3D(MensurationCubeViz, "cube"),
  "mensuration-cylinder": withOptional3D(MensurationCylinderViz, "cylinder"),
  "area-resizer": AreaResizerViz,
  "probability-dice": ProbabilityDiceViz,
  "probability-coin": ProbabilityCoinViz,
  "circle-tangent": CircleTangentViz,
  "geometry-construction": GeometryConstructionViz,
  "sqrt-number-line": SqrtNumberLineViz,
  "algebra-stepper": AlgebraStepperViz,
  "compound-interest-visual": CompoundInterestViz,
  "heights-distances-scene": HeightsDistancesViz,
};

export function TopicVisualization({
  spec,
  classLevel,
  palette,
}: {
  spec: VisualizationSpec;
  classLevel?: string;
  palette?: import("./design-tokens").Palette;
}) {
  const sliders = spec.sliders ?? [];
  const initial = useMemo(() => defaultSliderValues(sliders), [sliders]);
  const [values, setValues] = useState(initial);
  const onChange = useCallback((id: string, v: number) => {
    setValues((prev) => ({ ...prev, [id]: v }));
  }, []);
  const onReset = useCallback(() => setValues(defaultSliderValues(sliders)), [sliders]);

  // When catalog marks 3d with scene, parent MathInteractiveVisualization handles SceneRenderer.
  // Topic renderers stay on SVG path unless heights/mensuration use withOptional3D.

  const Renderer = TOPIC_RENDERERS[spec.visualizationType];
  if (Renderer) {
    return (
      <Renderer
        spec={spec}
        values={values}
        onChange={onChange}
        onReset={onReset}
        classLevel={classLevel}
        palette={palette}
      />
    );
  }
  return null;
}

export function isTopicVisualizationType(vtype: string): boolean {
  return vtype in TOPIC_RENDERERS;
}
