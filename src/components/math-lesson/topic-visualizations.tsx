/**
 * Class 9 EM Mathematics — textbook-aligned interactive visualizations.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { VisualizationSpec } from "@/types/math-lesson";
import { defaultSliderValues } from "./formula-utils";
import { ELEMENTARY_RENDERERS } from "./elementary-visualizations";
import { CalcGrid, SliderPanel, type TopicVizProps } from "./topic-viz-shared";

const TILE = 28;

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
  const [expanded, setExpanded] = useState(true);
  const total = (a + b) * TILE;

  return (
    <div className="space-y-4">
      <svg viewBox={`0 0 ${total + 20} ${total + 40}`} className="w-full max-w-sm mx-auto h-auto">
        <text x={(total + 20) / 2} y={14} textAnchor="middle" className="fill-foreground text-[11px] font-medium">
          (a+b)² = a² + 2ab + b²
        </text>
        <g transform={`translate(10, 22) ${expanded ? "" : `scale(${0.6})`}`} className="transition-transform duration-500">
          <rect x={0} y={0} width={a * TILE} height={a * TILE} fill="#3B82F688" stroke="#3B82F6" />
          <text x={(a * TILE) / 2} y={(a * TILE) / 2} textAnchor="middle" className="fill-foreground text-[10px]">a²</text>
          <rect x={a * TILE} y={0} width={b * TILE} height={a * TILE} fill="#10B98166" stroke="#10B981" />
          <text x={a * TILE + (b * TILE) / 2} y={(a * TILE) / 2} textAnchor="middle" className="fill-foreground text-[10px]">ab</text>
          <rect x={0} y={a * TILE} width={a * TILE} height={b * TILE} fill="#10B98166" stroke="#10B981" />
          <text x={(a * TILE) / 2} y={a * TILE + (b * TILE) / 2} textAnchor="middle" className="fill-foreground text-[10px]">ab</text>
          <rect x={a * TILE} y={a * TILE} width={b * TILE} height={b * TILE} fill="#F59E0B66" stroke="#F59E0B" />
          <text x={a * TILE + (b * TILE) / 2} y={a * TILE + (b * TILE) / 2} textAnchor="middle" className="fill-foreground text-[10px]">b²</text>
        </g>
      </svg>
      <p className="text-xs text-center text-muted-foreground">
        The two <strong className="text-emerald-600">ab</strong> tiles are the missing terms in a²+b²
      </p>
      <SliderPanel spec={spec} values={values} onChange={onChange} />
      <CalcGrid spec={spec} values={values} />
      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={() => setExpanded((e) => !e)}>▶ Expand & Collapse</Button>
        <Button type="button" size="sm" variant="outline" onClick={onReset}>Reset</Button>
      </div>
    </div>
  );
}

/** x²+bx+c factor rectangle */
export function FactorRectangleViz({ spec, values, onChange }: TopicVizProps) {
  const w = values.width ?? 3;
  const h = values.height ?? 4;
  const correct = w === 3 && h === 4;
  const scale = 18;
  return (
    <div className="space-y-4">
      <svg viewBox="0 0 220 160" className="w-full max-w-md mx-auto">
        <rect x={30} y={30} width={w * scale} height={h * scale} fill="#3B82F622" stroke="#3B82F6" strokeWidth={2} />
        <text x={30 + (w * scale) / 2} y={22} textAnchor="middle" className="fill-foreground text-[10px]">x + {w}</text>
        <text x={18} y={30 + (h * scale) / 2} textAnchor="middle" className="fill-foreground text-[10px]" transform={`rotate(-90 18 ${30 + (h * scale) / 2})`}>x + {h}</text>
        <text x={30 + w * scale + 8} y={30 + h * scale / 2} className="fill-muted-foreground text-[10px]">Area ≈ x² + {w + h}x + {w * h}</text>
      </svg>
      {correct ? (
        <p className="text-xs text-center text-emerald-600 font-medium">✓ (x+3)(x+4) = x² + 7x + 12</p>
      ) : (
        <p className="text-xs text-center text-muted-foreground">Find factors: product = 12, sum = 7</p>
      )}
      <SliderPanel spec={spec} values={values} onChange={onChange} />
      <CalcGrid spec={spec} values={values} />
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
        <line x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke="#3B82F6" strokeWidth={3} />
        {[["A", A], ["B", B]].map(([id, p]) => (
          <g key={id}>
            <circle
              cx={p.x}
              cy={p.y}
              r={8}
              fill={id === "A" ? "#3B82F6" : "#10B981"}
              className="cursor-grab"
              onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); dragging.current = id; }}
            />
            <text x={p.x + 10} y={p.y - 8} className="fill-foreground text-[10px]">{id}</text>
          </g>
        ))}
      </svg>
      <p className="text-xs text-muted-foreground">
        {mode === "segment" && "Segment AB — two endpoints, finite length."}
        {mode === "ray" && "Ray — starts at A, passes through B, extends infinitely."}
        {mode === "line" && "Line — extends infinitely in both directions."}
      </p>
    </div>
  );
}

/** Draggable rays angle explorer */
export function AngleExplorerViz({ spec, values, onChange }: TopicVizProps) {
  const r1 = values.ray1 ?? 0;
  const r2 = values.ray2 ?? 45;
  let angle = Math.abs(r2 - r1) % 360;
  if (angle > 180) angle = 360 - angle;
  const type =
    angle === 0 ? "Zero" : angle < 90 ? "Acute" : angle === 90 ? "Right" : angle < 180 ? "Obtuse" : angle === 180 ? "Straight" : "Reflex";
  const cx = 110;
  const cy = 110;
  const rad = (deg: number) => ((deg - 90) * Math.PI) / 180;
  const arm = (deg: number) => ({ x: cx + 80 * Math.cos(rad(deg)), y: cy + 80 * Math.sin(rad(deg)) });

  return (
    <div className="space-y-4">
      <svg viewBox="0 0 220 220" className="w-52 h-52 mx-auto">
        <circle cx={cx} cy={cy} r={80} fill="none" stroke="#E2E8F0" />
        <line x1={cx} y1={cy} x2={arm(r1).x} y2={arm(r1).y} stroke="#3B82F6" strokeWidth={3} />
        <line x1={cx} y1={cy} x2={arm(r2).x} y2={arm(r2).y} stroke="#F59E0B" strokeWidth={3} />
        <text x={cx} y={24} textAnchor="middle" className="fill-foreground text-xs font-semibold">{angle}° — {type}</text>
      </svg>
      <SliderPanel spec={spec} values={values} onChange={onChange} />
    </div>
  );
}

/** Parallel lines + transversal */
export function ParallelTransversalViz({ spec, values, onChange }: TopicVizProps) {
  const angle = values.transversal ?? 60;
  const [highlight, setHighlight] = useState<"none" | "corresponding" | "alternate">("none");
  const y1 = 60;
  const y2 = 120;
  const rad = ((angle - 90) * Math.PI) / 180;
  const xMid = 130;

  return (
    <div className="space-y-3">
      <svg viewBox="0 0 260 180" className="w-full max-w-md mx-auto h-44">
        <line x1={20} y1={y1} x2={240} y2={y1} stroke="#3B82F6" strokeWidth={2} />
        <line x1={20} y1={y2} x2={240} y2={y2} stroke="#3B82F6" strokeWidth={2} />
        <line
          x1={xMid - 90 * Math.cos(rad)}
          y1={y1 - 90 * Math.sin(rad)}
          x2={xMid + 90 * Math.cos(rad)}
          y2={y2 + 90 * Math.sin(rad)}
          stroke="#F59E0B"
          strokeWidth={2}
        />
        {highlight !== "none" ? (
          <text x={130} y={170} textAnchor="middle" className="fill-emerald-600 text-[10px]">
            {highlight === "corresponding" ? "Corresponding angles equal" : "Alternate interior angles equal"}
          </text>
        ) : null}
      </svg>
      <SliderPanel spec={spec} values={values} onChange={onChange} />
      <div className="flex gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => setHighlight("corresponding")}>Corresponding</Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setHighlight("alternate")}>Alternate</Button>
      </div>
    </div>
  );
}

/** y = mx + c */
export function LinearGraphViz({ spec, values, onChange }: TopicVizProps) {
  const m = values.m ?? 1;
  const c = values.c ?? 0;
  const W = 280;
  const H = 200;
  const pts: string[] = [];
  for (let px = 0; px <= W; px += 2) {
    const x = (px / W) * 10 - 5;
    const y = m * x + c;
    const sy = H / 2 - y * 12;
    if (sy >= 0 && sy <= H) pts.push(`${px},${sy}`);
  }
  return (
    <div className="space-y-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-md h-48 rounded-xl border border-border/50">
        <line x1={0} y1={H / 2} x2={W} y2={H / 2} stroke="#CBD5E1" />
        <line x1={W / 2} y1={0} x2={W / 2} y2={H} stroke="#CBD5E1" />
        <polyline points={pts.join(" ")} fill="none" stroke="#3B82F6" strokeWidth={2.5} />
        <text x={8} y={16} className="fill-foreground text-[10px]">y = {m}x + {c}</text>
      </svg>
      <SliderPanel spec={spec} values={values} onChange={onChange} />
    </div>
  );
}

/** Two lines intersection */
export function LineIntersectionViz({ spec, values, onChange }: TopicVizProps) {
  const m1 = values.m1 ?? 1;
  const c1 = values.c1 ?? 2;
  const m2 = values.m2 ?? -1;
  const c2 = values.c2 ?? 5;
  const xInt = m1 !== m2 ? (c2 - c1) / (m1 - m2) : NaN;
  const yInt = !Number.isNaN(xInt) ? m1 * xInt + c1 : NaN;
  const W = 280;
  const H = 200;
  const linePts = (m: number, c: number) => {
    const out: string[] = [];
    for (let px = 0; px <= W; px += 4) {
      const x = (px / W) * 10 - 5;
      const y = m * x + c;
      const sy = H / 2 - y * 12;
      if (sy >= 0 && sy <= H) out.push(`${px},${sy}`);
    }
    return out.join(" ");
  };
  const ix = !Number.isNaN(xInt) ? ((xInt + 5) / 10) * W : null;
  const iy = !Number.isNaN(yInt) ? H / 2 - yInt * 12 : null;

  return (
    <div className="space-y-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-md h-48 rounded-xl border border-border/50">
        <line x1={0} y1={H / 2} x2={W} y2={H / 2} stroke="#CBD5E1" />
        <line x1={W / 2} y1={0} x2={W / 2} y2={H} stroke="#CBD5E1" />
        <polyline points={linePts(m1, c1)} fill="none" stroke="#3B82F6" strokeWidth={2} />
        <polyline points={linePts(m2, c2)} fill="none" stroke="#10B981" strokeWidth={2} />
        {ix != null && iy != null ? <circle cx={ix} cy={iy} r={6} fill="#F59E0B" /> : null}
      </svg>
      {!Number.isNaN(xInt) ? (
        <p className="text-xs text-center font-medium">Intersection: ({xInt.toFixed(1)}, {yInt.toFixed(1)})</p>
      ) : (
        <p className="text-xs text-center text-muted-foreground">Parallel lines — no intersection</p>
      )}
      <SliderPanel spec={spec} values={values} onChange={onChange} />
    </div>
  );
}

/** Triangle with draggable vertices */
export function TriangleExplorerViz({ spec }: TopicVizProps) {
  const defs = spec.draggableObjects ?? [
    { id: "A", label: "A", initialX: 80, initialY: 40, color: "#3B82F6" },
    { id: "B", label: "B", initialX: 30, initialY: 130, color: "#10B981" },
    { id: "C", label: "C", initialX: 180, initialY: 130, color: "#F59E0B" },
  ];
  const [pts, setPts] = useState(() =>
    Object.fromEntries(defs.map((d) => [d.id, { x: d.initialX ?? 80, y: d.initialY ?? 80 }])),
  );
  const drag = useRef<string | null>(null);
  const A = pts.A ?? { x: 80, y: 40 };
  const B = pts.B ?? { x: 30, y: 130 };
  const C = pts.C ?? { x: 180, y: 130 };
  const dist = (p: { x: number; y: number }, q: { x: number; y: number }) =>
    Math.round(Math.hypot(p.x - q.x, p.y - q.y) / 10);

  return (
    <div className="space-y-3">
      <svg
        viewBox="0 0 220 160"
        className="w-full h-44 rounded-xl border touch-none"
        onPointerMove={(e) => {
          if (!drag.current) return;
          const r = e.currentTarget.getBoundingClientRect();
          setPts((p) => ({
            ...p,
            [drag.current!]: {
              x: ((e.clientX - r.left) / r.width) * 220,
              y: ((e.clientY - r.top) / r.height) * 160,
            },
          }));
        }}
        onPointerUp={() => { drag.current = null; }}
      >
        <polygon points={`${A.x},${A.y} ${B.x},${B.y} ${C.x},${C.y}`} fill="#3B82F622" stroke="#3B82F6" strokeWidth={2} />
        {([["A", A], ["B", B], ["C", C]] as const).map(([id, p]) => (
          <circle
            key={id}
            cx={p.x}
            cy={p.y}
            r={8}
            fill={id === "A" ? "#3B82F6" : id === "B" ? "#10B981" : "#F59E0B"}
            className="cursor-grab"
            onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); drag.current = id; }}
          />
        ))}
      </svg>
      <p className="text-xs text-center text-muted-foreground">
        AB = {dist(A, B)} · BC = {dist(B, C)} · CA = {dist(C, A)} (relative units)
      </p>
    </div>
  );
}

/** Triangle angle sum animation */
export function TriangleAngleSumViz({ onReset }: TopicVizProps) {
  const [step, setStep] = useState(0);
  const run = () => {
    setStep(0);
    let s = 0;
    const t = window.setInterval(() => {
      s += 1;
      setStep(s);
      if (s >= 3) window.clearInterval(t);
    }, 700);
  };
  return (
    <div className="space-y-4 text-center">
      <svg viewBox="0 0 280 120" className="w-full max-w-md mx-auto h-28">
        {step < 3 ? (
          <polygon points="40,90 120,20 200,90" fill="#3B82F622" stroke="#3B82F6" strokeWidth={2} />
        ) : (
          <>
            <line x1={20} y1={90} x2={260} y2={90} stroke="#64748B" strokeWidth={2} />
            <path d="M 40 90 A 30 30 0 0 1 70 70" fill="#3B82F644" stroke="#3B82F6" />
            <path d="M 120 20 L 70 70" stroke="#10B981" strokeWidth={2} />
            <path d="M 200 90 L 70 70" stroke="#F59E0B" strokeWidth={2} />
          </>
        )}
      </svg>
      <p className="text-sm font-medium">{step >= 3 ? "Angles form a straight line → 180°" : "Three angles inside the triangle"}</p>
      <div className="flex gap-2 justify-center">
        <Button type="button" size="sm" onClick={run}>▶ Rearrange angles</Button>
        <Button type="button" size="sm" variant="outline" onClick={() => { setStep(0); onReset(); }}>Reset</Button>
      </div>
    </div>
  );
}

/** Quadrilateral morph */
export function QuadrilateralMorphViz({ spec }: TopicVizProps) {
  const defs = spec.draggableObjects ?? [
    { id: "P1", initialX: 50, initialY: 30, color: "#3B82F6" },
    { id: "P2", initialX: 170, initialY: 30, color: "#3B82F6" },
    { id: "P3", initialX: 180, initialY: 120, color: "#10B981" },
    { id: "P4", initialX: 40, initialY: 120, color: "#10B981" },
  ];
  const [pts, setPts] = useState(() =>
    Object.fromEntries(defs.map((d) => [d.id, { x: d.initialX ?? 50, y: d.initialY ?? 50 }])),
  );
  const drag = useRef<string | null>(null);
  const keys = ["P1", "P2", "P3", "P4"] as const;
  const poly = keys.map((k) => pts[k] ?? { x: 0, y: 0 });

  return (
    <div className="space-y-3">
      <svg
        viewBox="0 0 220 160"
        className="w-full h-44 border rounded-xl touch-none"
        onPointerMove={(e) => {
          if (!drag.current) return;
          const r = e.currentTarget.getBoundingClientRect();
          setPts((p) => ({
            ...p,
            [drag.current!]: {
              x: ((e.clientX - r.left) / r.width) * 220,
              y: ((e.clientY - r.top) / r.height) * 160,
            },
          }));
        }}
        onPointerUp={() => { drag.current = null; }}
      >
        <polygon points={poly.map((p) => `${p.x},${p.y}`).join(" ")} fill="#3B82F618" stroke="#3B82F6" strokeWidth={2} />
        {keys.map((id) => (
          <circle
            key={id}
            cx={pts[id]?.x ?? 0}
            cy={pts[id]?.y ?? 0}
            r={7}
            fill="#3B82F6"
            className="cursor-grab"
            onPointerDown={(e) => { drag.current = id; e.currentTarget.setPointerCapture(e.pointerId); }}
          />
        ))}
      </svg>
      <p className="text-xs text-center text-muted-foreground">Drag corners to form different quadrilaterals</p>
    </div>
  );
}

/** Statistics lab with editable dataset */
export function StatisticsLabViz(_props: TopicVizProps) {
  const [data, setData] = useState([12, 15, 18, 14, 16, 20, 13]);
  const sorted = [...data].sort((a, b) => a - b);
  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  const median = sorted[Math.floor(sorted.length / 2)];
  const freq: Record<number, number> = {};
  data.forEach((v) => { freq[v] = (freq[v] ?? 0) + 1; });
  const mode = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
  const chartData = data.map((v, i) => ({ i: `S${i + 1}`, marks: v }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {data.map((v, i) => (
          <Input
            key={i}
            type="number"
            className="w-14 h-8 text-xs text-center"
            value={v}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (!Number.isFinite(n)) return;
              setData((d) => d.map((x, j) => (j === i ? n : x)));
            }}
          />
        ))}
        <Button type="button" size="sm" variant="outline" onClick={() => setData((d) => [...d, 15])}>+ Add</Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setData((d) => d.slice(0, -1))}>− Remove</Button>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg border p-2"><p className="text-[10px] text-muted-foreground">Mean</p><p className="font-semibold">{mean.toFixed(1)}</p></div>
        <div className="rounded-lg border p-2"><p className="text-[10px] text-muted-foreground">Median</p><p className="font-semibold">{median}</p></div>
        <div className="rounded-lg border p-2"><p className="text-[10px] text-muted-foreground">Mode</p><p className="font-semibold">{mode}</p></div>
      </div>
      <ResponsiveContainer width="100%" height={140}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="i" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Bar dataKey="marks" fill="#3B82F6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Cylinder pseudo-3D */
export function MensurationCylinderViz({ spec, values, onChange }: TopicVizProps) {
  const r = values.r ?? 3;
  const h = values.h ?? 5;
  void r;
  void h;
  return (
    <div className="space-y-4">
      <svg viewBox="0 0 120 160" className="w-32 h-40 mx-auto">
        <ellipse cx={60} cy={25} rx={r * 8} ry={8} fill="#3B82F633" stroke="#3B82F6" />
        <rect x={60 - r * 8} y={25} width={r * 16} height={h * 12} fill="#3B82F622" stroke="#3B82F6" />
        <ellipse cx={60} cy={25 + h * 12} rx={r * 8} ry={8} fill="#3B82F644" stroke="#3B82F6" />
      </svg>
      <SliderPanel spec={spec} values={values} onChange={onChange} />
      <CalcGrid spec={spec} values={values} />
    </div>
  );
}

/** Rectangle + triangle areas */
export function AreaResizerViz({ spec, values, onChange }: TopicVizProps) {
  const w = values.width ?? 6;
  const h = values.height ?? 4;
  const base = values.base ?? 8;
  const th = values.triHeight ?? 5;
  return (
    <div className="space-y-4">
      <svg viewBox="0 0 260 140" className="w-full max-w-md mx-auto">
        <rect x={20} y={20} width={w * 12} height={h * 12} fill="#3B82F633" stroke="#3B82F6" />
        <text x={20 + w * 6} y={16} textAnchor="middle" className="fill-foreground text-[9px]">Rectangle</text>
        <polygon points={`${160},${120} ${160 + base * 8},${120} ${160 + base * 4},${120 - th * 12}`} fill="#10B98133" stroke="#10B981" />
        <text x={160 + base * 4} y={135} textAnchor="middle" className="fill-foreground text-[9px]">Triangle</text>
      </svg>
      <SliderPanel spec={spec} values={values} onChange={onChange} />
      <CalcGrid spec={spec} values={values} />
    </div>
  );
}

/** Dice simulator */
export function ProbabilityDiceViz(_props: TopicVizProps) {
  const [counts, setCounts] = useState<number[]>([0, 0, 0, 0, 0, 0]);
  const [total, setTotal] = useState(0);
  const roll = () => {
    const v = Math.floor(Math.random() * 6);
    setCounts((c) => c.map((x, i) => (i === v ? x + 1 : x)));
    setTotal((t) => t + 1);
  };
  const rollMany = (n: number) => {
    setCounts([0, 0, 0, 0, 0, 0]);
    let t = 0;
    const batch = () => {
      for (let i = 0; i < 50 && t < n; i++, t++) {
        const v = Math.floor(Math.random() * 6);
        setCounts((c) => {
          const next = [...c];
          next[v] += 1;
          return next;
        });
      }
      setTotal(t);
      if (t < n) requestAnimationFrame(batch);
    };
    batch();
  };
  const chartData = counts.map((c, i) => ({
    face: String(i + 1),
    count: c,
    pct: total ? ((c / total) * 100).toFixed(1) : "0",
  }));

  return (
    <div className="space-y-3">
      <div className="flex gap-2 justify-center">
        <Button type="button" size="sm" onClick={roll}>Roll</Button>
        <Button type="button" size="sm" onClick={() => rollMany(1000)}>Roll 1000×</Button>
        <Button type="button" size="sm" variant="outline" onClick={() => { setCounts([0, 0, 0, 0, 0, 0]); setTotal(0); }}>Reset</Button>
      </div>
      <p className="text-xs text-center">Rolls: {total} · Expected each face ≈ 16.7%</p>
      <ResponsiveContainer width="100%" height={120}>
        <BarChart data={chartData}>
          <XAxis dataKey="face" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Bar dataKey="count" fill="#3B82F6" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Coin toss */
export function ProbabilityCoinViz(_props: TopicVizProps) {
  const [heads, setHeads] = useState(0);
  const [tails, setTails] = useState(0);
  const total = heads + tails;
  const flip = () => (Math.random() < 0.5 ? setHeads((h) => h + 1) : setTails((t) => t + 1));
  const flipMany = (n: number) => {
    let h = 0;
    let t = 0;
    for (let i = 0; i < n; i++) (Math.random() < 0.5 ? h++ : t++);
    setHeads((x) => x + h);
    setTails((x) => x + t);
  };
  const history = useMemo(() => {
    const pts: { n: number; p: number }[] = [];
    let h = 0;
    for (let i = 1; i <= Math.min(total, 50); i++) {
      h += Math.random() < (heads / total || 0.5) ? 1 : 0;
      pts.push({ n: i, p: (h / i) * 100 });
    }
    return pts.length ? pts : [{ n: 0, p: 50 }];
  }, [total, heads]);

  return (
    <div className="space-y-3">
      <div className="flex gap-4 justify-center text-sm">
        <span>H: {heads}</span>
        <span>T: {tails}</span>
        <span>P(H) = {total ? ((heads / total) * 100).toFixed(1) : "—"}%</span>
      </div>
      <div className="flex gap-2 justify-center">
        <Button type="button" size="sm" onClick={flip}>Flip</Button>
        <Button type="button" size="sm" onClick={() => flipMany(100)}>Flip 100×</Button>
        <Button type="button" size="sm" variant="outline" onClick={() => { setHeads(0); setTails(0); }}>Reset</Button>
      </div>
      <ResponsiveContainer width="100%" height={100}>
        <LineChart data={history}>
          <Line type="monotone" dataKey="p" stroke="#3B82F6" dot={false} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 9 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Circle + draggable tangent */
export function CircleTangentViz({ spec, values, onChange }: TopicVizProps) {
  const r = (values.r ?? 5) * 10;
  const angle = values.tangentAngle ?? 45;
  const cx = 110;
  const cy = 110;
  const rad = ((angle - 90) * Math.PI) / 180;
  const px = cx + r * Math.cos(rad);
  const py = cy + r * Math.sin(rad);
  const tx = -Math.sin(rad);
  const ty = Math.cos(rad);

  return (
    <div className="space-y-3">
      <svg viewBox="0 0 220 220" className="w-52 h-52 mx-auto">
        <circle cx={cx} cy={cy} r={r} fill="#3B82F611" stroke="#3B82F6" strokeWidth={2} />
        <line x1={px - tx * 60} y1={py - ty * 60} x2={px + tx * 60} y2={py + ty * 60} stroke="#F59E0B" strokeWidth={2} />
        <circle cx={px} cy={py} r={5} fill="#10B981" />
        <line x1={cx} y1={cy} x2={px} y2={py} stroke="#64748B" strokeDasharray="4 3" />
        <text x={px + 8} y={py - 8} className="fill-emerald-600 text-[9px]">one point</text>
      </svg>
      <SliderPanel spec={spec} values={values} onChange={onChange} />
      <CalcGrid spec={spec} values={values} />
    </div>
  );
}

/** Compass & ruler guided construction */
export function GeometryConstructionViz({ spec, onReset }: TopicVizProps) {
  const [step, setStep] = useState(0);
  const A = { x: 60, y: 100 };
  const B = { x: 180, y: 100 };
  const mid = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 };
  return (
    <div className="space-y-3">
      <svg viewBox="0 0 240 160" className="w-full h-40 border rounded-xl">
        <line x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke="#64748B" strokeWidth={2} />
        <circle cx={A.x} cy={A.y} r={4} fill="#3B82F6" />
        <circle cx={B.x} cy={B.y} r={4} fill="#10B981" />
        {step >= 1 ? <circle cx={A.x} cy={A.y} r={50} fill="none" stroke="#3B82F6" strokeDasharray="4 3" /> : null}
        {step >= 2 ? <circle cx={B.x} cy={B.y} r={50} fill="none" stroke="#10B981" strokeDasharray="4 3" /> : null}
        {step >= 3 ? <line x1={mid.x} y1={20} x2={mid.x} y2={140} stroke="#F59E0B" strokeWidth={2} /> : null}
      </svg>
      <p className="text-xs text-center text-muted-foreground">
        {step === 0 && "Segment AB — ready to construct perpendicular bisector"}
        {step === 1 && "Step 1: Arc centred at A"}
        {step === 2 && "Step 2: Arc centred at B"}
        {step >= 3 && "Step 3: Perpendicular bisector through midpoint"}
      </p>
      <div className="flex gap-2 justify-center flex-wrap">
        <Button type="button" size="sm" onClick={() => setStep((s) => Math.min(s + 1, 3))}>Next step</Button>
        <Button type="button" size="sm" variant="outline" onClick={() => { setStep(0); onReset(); }}>Reset</Button>
      </div>
    </div>
  );
}

const TOPIC_RENDERERS: Record<string, React.ComponentType<TopicVizProps>> = {
  ...ELEMENTARY_RENDERERS,
  "algebra-tiles": AlgebraTilesViz,
  "factor-rectangle": FactorRectangleViz,
  "geometry-basics": GeometryBasicsViz,
  "angle-explorer": AngleExplorerViz,
  "parallel-transversal": ParallelTransversalViz,
  "linear-graph": LinearGraphViz,
  "line-intersection": LineIntersectionViz,
  "triangle-explorer": TriangleExplorerViz,
  "triangle-angle-sum": TriangleAngleSumViz,
  "quadrilateral-morph": QuadrilateralMorphViz,
  "statistics-lab": StatisticsLabViz,
  "mensuration-cube": MensurationCubeViz,
  "mensuration-cylinder": MensurationCylinderViz,
  "area-resizer": AreaResizerViz,
  "probability-dice": ProbabilityDiceViz,
  "probability-coin": ProbabilityCoinViz,
  "circle-tangent": CircleTangentViz,
  "geometry-construction": GeometryConstructionViz,
};

export function TopicVisualization({ spec }: { spec: VisualizationSpec }) {
  const sliders = spec.sliders ?? [];
  const initial = useMemo(() => defaultSliderValues(sliders), [sliders]);
  const [values, setValues] = useState(initial);
  const onChange = useCallback((id: string, v: number) => {
    setValues((prev) => ({ ...prev, [id]: v }));
  }, []);
  const onReset = useCallback(() => setValues(defaultSliderValues(sliders)), [sliders]);

  const Renderer = TOPIC_RENDERERS[spec.visualizationType];
  if (Renderer) {
    return <Renderer spec={spec} values={values} onChange={onChange} onReset={onReset} />;
  }
  return null;
}

export function isTopicVisualizationType(vtype: string): boolean {
  return vtype in TOPIC_RENDERERS;
}
