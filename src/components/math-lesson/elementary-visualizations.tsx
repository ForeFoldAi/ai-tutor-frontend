/**
 * Class 1–10 elementary & middle-school interactive visualizations.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SliderPanel, CalcGrid, type TopicVizProps } from "./topic-viz-shared";
import type { VisualizationSpec } from "@/types/math-lesson";
import { buildLcmLadder, missingForPerfectPower } from "./factor-ladder";
import { SIGNATURE, resolvePalette } from "./design-tokens";
import { ControlPoint } from "./control-point";
import { VizStage } from "./viz-stage";

function EmojiRow({ count, emoji = "🍎" }: { count: number; emoji?: string }) {
  return (
    <div className="flex flex-wrap gap-1 justify-center min-h-[2.5rem]">
      {Array.from({ length: Math.min(count, 20) }).map((_, i) => (
        <span key={i} className="text-2xl animate-in fade-in duration-300" style={{ animationDelay: `${i * 50}ms` }}>
          {emoji}
        </span>
      ))}
    </div>
  );
}

export function CountingViz({ spec, values, onChange, onReset }: TopicVizProps) {
  const n = Math.round(values.count ?? 5);
  const [animating, setAnimating] = useState(false);

  const handleButton = useCallback(
    (action: string) => {
      if (action === "reset") onReset();
      else if (action === "add") onChange("count", Math.min(20, n + 1));
      else if (action === "animate") {
        setAnimating(true);
        window.setTimeout(() => setAnimating(false), 800);
      }
    },
    [n, onChange, onReset],
  );

  return (
    <div className="space-y-4">
      <EmojiRow count={n} />
      <p className={cn("text-center text-lg font-bold text-primary transition-transform", animating && "scale-110")}>
        {n} objects
      </p>
      <SliderPanel spec={spec} values={values} onChange={onChange} />
      <div className="flex gap-2 flex-wrap">
        {(spec.buttons ?? []).map((b) => (
          <Button key={b.id} type="button" size="sm" variant={b.action === "add" ? "default" : "outline"} onClick={() => handleButton(b.action ?? "")}>
            {b.label}
          </Button>
        ))}
        {!spec.buttons?.length ? (
          <Button type="button" size="sm" variant="outline" onClick={onReset}>Reset</Button>
        ) : null}
      </div>
    </div>
  );
}

export function NumberLineViz({ spec, values, onChange, palette, classLevel }: TopicVizProps) {
  const start = values.start ?? 0;
  const jump = values.jump ?? 0;
  const result = start + jump;
  const W = 280;
  const toX = (n: number) => 20 + ((n + 5) / 25) * (W - 40);
  const p = palette ?? resolvePalette({ paletteId: spec.paletteId, classLevel, colors: spec.colors });

  return (
    <div className="space-y-4">
      <VizStage
        palette={p}
        viewBox={`0 0 ${W} 80`}
        heightClass="h-24"
        hint="Drag the blue point · jump via slider"
      >
        <line x1={10} y1={40} x2={W - 10} y2={40} stroke={p.axisLine} strokeWidth={2} />
        {Array.from({ length: 11 }).map((_, i) => {
          const v = i * 2;
          const x = toX(v);
          return (
            <g key={i}>
              <line x1={x} y1={35} x2={x} y2={45} stroke={p.gridLine} />
              <text x={x} y={58} textAnchor="middle" fill={p.muted} fontSize={8}>
                {v}
              </text>
            </g>
          );
        })}
        <circle cx={toX(result)} cy={40} r={6} fill={SIGNATURE.green} className="transition-all duration-500" />
        {jump !== 0 ? (
          <path
            d={`M ${toX(start)} 28 Q ${(toX(start) + toX(result)) / 2} 15 ${toX(result)} 28`}
            fill="none"
            stroke={SIGNATURE.orange}
            strokeWidth={2}
          />
        ) : null}
        <ControlPoint
          cx={toX(start)}
          cy={40}
          onPointerDown={(e) => {
            e.stopPropagation();
            const svg = (e.target as Element).closest("svg")!;
            const move = (ev: PointerEvent) => {
              const r = svg.getBoundingClientRect();
              const x = ((ev.clientX - r.left) / r.width) * W;
              const n = Math.round(((x - 20) / (W - 40)) * 25 - 5);
              onChange("start", Math.max(-5, Math.min(20, n)));
            };
            const up = () => {
              window.removeEventListener("pointermove", move);
              window.removeEventListener("pointerup", up);
            };
            window.addEventListener("pointermove", move);
            window.addEventListener("pointerup", up);
          }}
        />
      </VizStage>
      <p className="text-xs text-center tabular-nums" style={{ color: p.text }}>
        {start} {jump >= 0 ? "+" : ""}
        {jump} = <strong>{result}</strong>
      </p>
      <SliderPanel spec={spec} values={values} onChange={onChange} palette={p} />
    </div>
  );
}

export function PlaceValueViz({ spec, values, onChange }: TopicVizProps) {
  const n = Math.round(values.n ?? 247);
  const h = Math.floor(n / 100);
  const t = Math.floor((n % 100) / 10);
  const o = n % 10;
  return (
    <div className="space-y-4">
      <div className="flex gap-3 justify-center flex-wrap">
        {Array.from({ length: h }).map((_, i) => (
          <div key={`h${i}`} className="w-8 h-8 bg-blue-500/80 rounded-sm border border-blue-600" title="100" />
        ))}
        {Array.from({ length: t }).map((_, i) => (
          <div key={`t${i}`} className="w-6 h-8 bg-emerald-500/80 rounded-sm border border-emerald-600" title="10" />
        ))}
        {Array.from({ length: o }).map((_, i) => (
          <div key={`o${i}`} className="w-3 h-3 bg-amber-500 rounded-full border border-amber-600" title="1" />
        ))}
      </div>
      <p className="text-center font-mono text-lg">{n} = {h} hundreds + {t} tens + {o} ones</p>
      <SliderPanel spec={spec} values={values} onChange={onChange} />
      <CalcGrid spec={spec} values={values} />
    </div>
  );
}

export function MultiplicationGridViz({ spec, values, onChange }: TopicVizProps) {
  const rows = Math.round(values.rows ?? 3);
  const cols = Math.round(values.cols ?? 4);
  const size = 22;
  return (
    <div className="space-y-4">
      <svg viewBox={`0 0 ${cols * size + 20} ${rows * size + 20}`} className="w-full max-w-xs mx-auto h-auto">
        {Array.from({ length: rows * cols }).map((_, i) => {
          const r = Math.floor(i / cols);
          const c = i % cols;
          return (
            <rect
              key={i}
              x={10 + c * size}
              y={10 + r * size}
              width={size - 2}
              height={size - 2}
              rx={3}
              fill="#3B82F6"
              opacity={0.5 + (i % cols) * 0.05}
              className="transition-all duration-300"
            />
          );
        })}
      </svg>
      <p className="text-center text-sm font-semibold">{rows} × {cols} = {rows * cols}</p>
      <SliderPanel spec={spec} values={values} onChange={onChange} />
    </div>
  );
}

export function BarModelViz({ spec, values, onChange }: TopicVizProps) {
  const total = Math.round(values.total ?? 12);
  const groups = Math.max(1, Math.round(values.groups ?? 3));
  const each = total / groups;
  const W = 260;
  const barW = W - 40;
  return (
    <div className="space-y-4">
      <svg viewBox={`0 0 ${W} 80`} className="w-full h-20">
        <rect x={20} y={20} width={barW} height={24} fill="#E2E8F0" stroke="#64748B" rx={4} />
        {Array.from({ length: groups }).map((_, i) => (
          <rect
            key={i}
            x={20 + (i * barW) / groups}
            y={20}
            width={barW / groups - 2}
            height={24}
            fill={["#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899"][i % 5]}
            opacity={0.85}
            rx={2}
          />
        ))}
      </svg>
      <p className="text-xs text-center">{total} shared in {groups} groups ≈ {each.toFixed(1)} each</p>
      <SliderPanel spec={spec} values={values} onChange={onChange} />
    </div>
  );
}

export function DecimalBlocksViz({ spec, values, onChange }: TopicVizProps) {
  const d = (values.d ?? 35) / 10;
  return (
    <div className="space-y-4 text-center">
      <p className="text-3xl font-bold text-primary">{d.toFixed(1)}</p>
      <div className="flex justify-center gap-1">
        {Array.from({ length: Math.floor(d) }).map((_, i) => (
          <div key={i} className="w-10 h-10 border-2 border-primary bg-primary/20 rounded" />
        ))}
        <div className="w-10 h-10 border-2 border-dashed border-amber-500 bg-amber-500/20 rounded" />
      </div>
      <SliderPanel spec={spec} values={values} onChange={onChange} />
    </div>
  );
}

export function PercentCircleViz({ spec, values, onChange }: TopicVizProps) {
  const pct = values.pct ?? 25;
  const cx = 60;
  const cy = 60;
  const r = 50;
  const endAngle = (pct / 100) * 360;
  const rad = (a: number) => ((a - 90) * Math.PI) / 180;
  const x = cx + r * Math.cos(rad(endAngle));
  const y = cy + r * Math.sin(rad(endAngle));
  const large = endAngle > 180 ? 1 : 0;

  return (
    <div className="space-y-4">
      <svg viewBox="0 0 120 120" className="w-32 h-32 mx-auto">
        <circle cx={cx} cy={cy} r={r} fill="#E2E8F0" />
        {pct > 0 ? (
          <path d={`M ${cx} ${cy} L ${cx} ${cy - r} A ${r} ${r} 0 ${large} 1 ${x} ${y} Z`} fill="#3B82F6" className="transition-all duration-300" />
        ) : null}
        <text x={cx} y={cy + 5} textAnchor="middle" className="fill-foreground text-sm font-bold">{pct}%</text>
      </svg>
      <SliderPanel spec={spec} values={values} onChange={onChange} />
    </div>
  );
}

export function RatioBarViz({ spec, values, onChange }: TopicVizProps) {
  const a = Math.max(1, values.a ?? 2);
  const b = Math.max(1, values.b ?? 3);
  const total = a + b;
  const W = 240;
  return (
    <div className="space-y-4">
      <svg viewBox={`0 0 ${W} 40`} className="w-full h-10">
        <rect x={10} y={10} width={((W - 20) * a) / total} height={20} fill="#3B82F6" rx={3} />
        <rect x={10 + ((W - 20) * a) / total} y={10} width={((W - 20) * b) / total} height={20} fill="#10B981" rx={3} />
      </svg>
      <p className="text-center text-sm font-medium">Ratio {a}:{b}</p>
      <SliderPanel spec={spec} values={values} onChange={onChange} />
    </div>
  );
}

export function IntegerLineViz({ spec, values, onChange }: TopicVizProps) {
  const pos = values.pos ?? -2;
  const move = values.move ?? 5;
  const end = pos + move;
  const W = 280;
  const toX = (n: number) => W / 2 + n * 12;

  return (
    <div className="space-y-4">
      <svg viewBox={`0 0 ${W} 60`} className="w-full h-14">
        <line x1={10} y1={30} x2={W - 10} y2={30} stroke="#64748B" strokeWidth={2} />
        <line x1={W / 2} y1={22} x2={W / 2} y2={38} stroke="#EF4444" strokeWidth={2} />
        {[-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5].map((v) => (
          <text key={v} x={toX(v)} y={50} textAnchor="middle" className="fill-muted-foreground text-[8px]">{v}</text>
        ))}
        <circle cx={toX(pos)} cy={30} r={5} fill="#3B82F6" />
        <circle cx={toX(end)} cy={30} r={5} fill="#10B981" />
      </svg>
      <p className="text-xs text-center">{pos} + ({move}) = {end}</p>
      <SliderPanel spec={spec} values={values} onChange={onChange} />
    </div>
  );
}

export function ClockTimeViz({ spec, values, onChange }: TopicVizProps) {
  const hour = values.hour ?? 3;
  const minute = values.minute ?? 30;
  const cx = 60;
  const cy = 60;
  const hAngle = ((hour % 12) + minute / 60) * 30 - 90;
  const mAngle = minute * 6 - 90;
  const hRad = (hAngle * Math.PI) / 180;
  const mRad = (mAngle * Math.PI) / 180;

  return (
    <div className="space-y-4">
      <svg viewBox="0 0 120 120" className="w-36 h-36 mx-auto">
        <circle cx={cx} cy={cy} r={52} fill="#F8FAFC" stroke="#3B82F6" strokeWidth={2} />
        <line x1={cx} y1={cy} x2={cx + 28 * Math.cos(hRad)} y2={cy + 28 * Math.sin(hRad)} stroke="#1E293B" strokeWidth={3} strokeLinecap="round" />
        <line x1={cx} y1={cy} x2={cx + 38 * Math.cos(mRad)} y2={cy + 38 * Math.sin(mRad)} stroke="#F59E0B" strokeWidth={2} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={3} fill="#1E293B" />
      </svg>
      <p className="text-center font-semibold">{hour}:{minute.toString().padStart(2, "0")}</p>
      <SliderPanel spec={spec} values={values} onChange={onChange} />
    </div>
  );
}

export function MoneyViz({ spec, values, onChange }: TopicVizProps) {
  const coins = values.coins ?? 5;
  const notes = values.notes ?? 2;
  const total = coins * 10 + notes * 50;
  return (
    <div className="space-y-4 text-center">
      <div className="flex justify-center gap-2 flex-wrap">
        {Array.from({ length: Math.min(coins, 10) }).map((_, i) => (
          <span key={i} className="w-10 h-10 rounded-full bg-amber-400 border-2 border-amber-600 flex items-center justify-center text-[10px] font-bold">₹10</span>
        ))}
        {Array.from({ length: Math.min(notes, 5) }).map((_, i) => (
          <span key={i} className="px-3 h-10 rounded bg-emerald-100 border-2 border-emerald-600 flex items-center justify-center text-xs font-bold">₹50</span>
        ))}
      </div>
      <p className="text-xl font-bold text-primary">Total: ₹{total}</p>
      <SliderPanel spec={spec} values={values} onChange={onChange} />
    </div>
  );
}

export function PatternViz({ spec, values, onChange }: TopicVizProps) {
  const step = Math.round(values.step ?? 4);
  const matchsticks = 2 * step + 1;
  return (
    <div className="space-y-4">
      <div className="flex justify-center gap-1">
        {Array.from({ length: step }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-0.5">
            {Array.from({ length: 3 }).map((__, j) => (
              <div key={j} className="w-1 h-4 bg-amber-600 rounded" />
            ))}
          </div>
        ))}
      </div>
      <p className="text-center text-sm">Step {step}: {matchsticks} matchsticks (rule: 2n + 1)</p>
      <SliderPanel spec={spec} values={values} onChange={onChange} />
    </div>
  );
}

export function MatchstickSquaresViz({ spec, values, onChange }: TopicVizProps) {
  const n = Math.max(1, Math.min(4, Math.round(values.squares ?? 2)));
  const sticks = 3 * n + 1;
  const size = 36;
  const pad = 24;
  const w = pad * 2 + n * size;
  const h = pad * 2 + size;
  const stick = { stroke: "#D97706", strokeWidth: 4, strokeLinecap: "round" as const };

  const lines: { x1: number; y1: number; x2: number; y2: number; key: string }[] = [];
  const top = pad;
  const bottom = pad + size;
  const left = pad;

  for (let i = 0; i < n; i++) {
    const x0 = left + i * size;
    const x1 = x0 + size;
    lines.push({ x1: x0, y1: top, x2: x1, y2: top, key: `t${i}` });
    lines.push({ x1: x0, y1: bottom, x2: x1, y2: bottom, key: `b${i}` });
  }
  lines.push({ x1: left, y1: top, x2: left, y2: bottom, key: "l" });
  lines.push({ x1: left + n * size, y1: top, x2: left + n * size, y2: bottom, key: "r" });
  for (let i = 1; i < n; i++) {
    const x = left + i * size;
    lines.push({ x1: x, y1: top, x2: x, y2: bottom, key: `v${i}` });
  }

  return (
    <div className="space-y-4">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-sm h-28 mx-auto">
        {lines.map((ln) => (
          <line key={ln.key} x1={ln.x1} y1={ln.y1} x2={ln.x2} y2={ln.y2} {...stick} />
        ))}
      </svg>
      <p className="text-center text-sm">
        <span className="font-medium">{n} square{n > 1 ? "s" : ""}</span>
        {" · "}
        <span className="text-primary font-semibold">{sticks} matchsticks</span>
        {n > 1 ? " (shared sides save sticks!)" : ""}
      </p>
      <SliderPanel spec={spec} values={values} onChange={onChange} />
    </div>
  );
}

const SHAPE_PICKER = ["triangle", "square", "rectangle", "pentagon", "hexagon"] as const;
type LabShape = (typeof SHAPE_PICKER)[number] | "cuboid";

function lockedShapeFromSpec(spec: VisualizationSpec): LabShape | "picker" | "" {
  const obj = spec.interactiveObjects?.[0];
  const t = String(obj?.type || obj?.id || "").toLowerCase();
  if (t === "picker") return "picker";
  if (t === "cuboid") return "cuboid";
  if ((SHAPE_PICKER as readonly string[]).includes(t)) return t as LabShape;
  return "";
}

function regularPoly(n: number, cx: number, cy: number, r: number) {
  return Array.from({ length: n }, (_, i) => {
    const a = ((i / n) * 360 - 90) * (Math.PI / 180);
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  });
}

function IsometricBox({
  sx,
  sy,
  sz,
  angle,
  label,
}: {
  sx: number;
  sy: number;
  sz: number;
  angle: number;
  label?: string;
}) {
  const scaleX = Math.min(70, Math.max(22, 12 + sx * 8));
  const scaleZ = Math.min(70, Math.max(22, 12 + sz * 8));
  const scaleY = Math.min(70, Math.max(22, 12 + sy * 8));
  const cx = 110;
  const cy = 118;
  const w = scaleX * 0.86;
  const d = scaleZ * 0.5;
  const h = scaleY;
  const y0 = cy - h * 0.12;
  const rad = (angle * Math.PI) / 180;
  const leftOp = 0.55 + 0.25 * Math.max(0, Math.cos(rad));
  const rightOp = 0.55 + 0.25 * Math.max(0, Math.sin(rad));
  const top = `${cx},${y0 - h} ${cx + w},${y0 - h + d} ${cx},${y0} ${cx - w},${y0 - h + d}`;
  const left = `${cx - w},${y0 - h + d} ${cx - w},${y0 + d} ${cx},${y0 + h * 0.55} ${cx},${y0}`;
  const right = `${cx},${y0} ${cx + w},${y0 - h + d} ${cx + w},${y0 + d} ${cx},${y0 + h * 0.55}`;
  return (
    <svg viewBox="0 0 220 210" className="w-52 h-52 mx-auto">
      <defs>
        <linearGradient id="lab-left" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4338ca" stopOpacity={leftOp} />
          <stop offset="100%" stopColor="#312e81" stopOpacity={leftOp + 0.1} />
        </linearGradient>
        <linearGradient id="lab-right" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#6366f1" stopOpacity={rightOp} />
          <stop offset="100%" stopColor="#4f46e5" stopOpacity={rightOp + 0.1} />
        </linearGradient>
        <linearGradient id="lab-top" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#818cf8" stopOpacity={0.85} />
          <stop offset="100%" stopColor="#a5b4fc" stopOpacity={0.95} />
        </linearGradient>
      </defs>
      <polygon points={left} fill="url(#lab-left)" stroke="#312e81" strokeWidth={1.5} strokeLinejoin="round" />
      <polygon points={right} fill="url(#lab-right)" stroke="#312e81" strokeWidth={1.5} strokeLinejoin="round" />
      <polygon points={top} fill="url(#lab-top)" stroke="#4338ca" strokeWidth={1.5} strokeLinejoin="round" />
      {label ? (
        <text x={cx} y={y0 + h * 0.28} textAnchor="middle" className="fill-white text-[11px] font-bold">
          {label}
        </text>
      ) : null}
    </svg>
  );
}

function IsometricPrism({ n, r, h, angle }: { n: number; r: number; h: number; angle: number }) {
  const cx = 110;
  const cy = 130;
  const rad = (angle * Math.PI) / 180;
  const ox = 18 + 8 * Math.cos(rad);
  const oy = -(22 + h * 3);
  const base = regularPoly(n, cx, cy, r);
  const top = base.map((p) => ({ x: p.x + ox, y: p.y + oy }));
  return (
    <svg viewBox="0 0 220 210" className="w-52 h-52 mx-auto">
      {base.map((p, i) => {
        const q = base[(i + 1) % n];
        const t0 = top[i];
        const t1 = top[(i + 1) % n];
        return (
          <polygon
            key={i}
            points={`${p.x},${p.y} ${q.x},${q.y} ${t1.x},${t1.y} ${t0.x},${t0.y}`}
            fill={i % 2 === 0 ? "#4f46e566" : "#6366f155"}
            stroke="#312e81"
            strokeWidth={1.2}
          />
        );
      })}
      <polygon
        points={top.map((p) => `${p.x},${p.y}`).join(" ")}
        fill="#a5b4fcbb"
        stroke="#4338ca"
        strokeWidth={1.5}
      />
    </svg>
  );
}

function RightAngleMark({ x, y, dx, dy, size = 10 }: { x: number; y: number; dx: number; dy: number; size?: number }) {
  return (
    <path
      d={`M ${x + dx * size} ${y} L ${x + dx * size} ${y + dy * size} L ${x} ${y + dy * size}`}
      fill="none"
      stroke="#F59E0B"
      strokeWidth={1.5}
    />
  );
}

function EqualTick({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * 6;
  const ny = (dx / len) * 6;
  return (
    <g stroke="#10B981" strokeWidth={1.6}>
      <line x1={mx - nx} y1={my - ny} x2={mx + nx} y2={my + ny} />
      <line x1={mx - nx + dx * 0.04} y1={my - ny + dy * 0.04} x2={mx + nx + dx * 0.04} y2={my + ny + dy * 0.04} />
    </g>
  );
}

export function ShapeLabViz({ spec, values, onChange, onReset }: TopicVizProps) {
  const obj = spec.interactiveObjects?.[0];
  const lockedRaw = lockedShapeFromSpec(spec);
  const props = (obj?.properties ?? {}) as { lock?: boolean; defaultView?: string };
  const canPick = lockedRaw === "picker" || lockedRaw === "" || props.lock === false;
  const [picked, setPicked] = useState<LabShape>(
    lockedRaw && lockedRaw !== "picker" ? (lockedRaw as LabShape) : "square",
  );
  const shape: LabShape = canPick ? picked : (lockedRaw as LabShape);
  const defaultView = props.defaultView === "3d" || lockedRaw === "cuboid" ? "3d" : "2d";
  const [view, setView] = useState<"2d" | "3d">(defaultView);
  const [rot, setRot] = useState(35);
  const [drawN, setDrawN] = useState(99);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (view !== "3d") return;
    const id = window.setInterval(() => setRot((r) => (r + 0.7) % 360), 40);
    return () => window.clearInterval(id);
  }, [view]);

  useEffect(
    () => () => {
      if (timer.current) window.clearInterval(timer.current);
    },
    [],
  );

  const s = Math.max(1, values.s ?? 4);
  const length = Math.max(1, values.length ?? 6);
  const width = Math.max(1, values.width ?? 4);
  const height = Math.max(1, values.height ?? 4);
  const nSides = shape === "triangle" ? 3 : shape === "pentagon" ? 5 : shape === "hexagon" ? 6 : 4;
  const isRect = shape === "rectangle" || shape === "cuboid";
  const isSquare = shape === "square" || (isRect && length === width);

  const runDraw = useCallback(() => {
    if (timer.current) window.clearInterval(timer.current);
    setView("2d");
    setDrawN(0);
    let step = 0;
    timer.current = window.setInterval(() => {
      step += 1;
      setDrawN(step);
      if (step >= nSides) {
        if (timer.current) window.clearInterval(timer.current);
        timer.current = null;
      }
    }, 420);
  }, [nSides]);

  const visibleSpec = useMemo(() => {
    const sliders = (spec.sliders ?? []).filter((sl) => {
      if (sl.id === "height" && (view === "2d" || shape === "square")) return false;
      if (shape === "square" && (sl.id === "length" || sl.id === "width")) return false;
      if (isRect && sl.id === "s") return false;
      return true;
    });
    return { ...spec, sliders };
  }, [spec, view, shape, isRect]);

  const calcCards = (() => {
    const cards: { label: string; value: string }[] = [];
    if (shape === "square") {
      cards.push({ label: "Perimeter", value: String(4 * s) });
      cards.push({ label: "Area", value: String(s * s) });
      if (view === "3d") {
        cards.push({ label: "Surface area", value: String(6 * s * s) });
        cards.push({ label: "Volume", value: String(s * s * s) });
      }
    } else if (isRect) {
      cards.push({ label: "Perimeter", value: String(2 * (length + width)) });
      cards.push({ label: "Face area", value: String(length * width) });
      if (view === "3d") {
        cards.push({ label: "Volume", value: String(length * width * height) });
      }
    } else {
      const areaFactor = shape === "triangle" ? 0.433 : shape === "pentagon" ? 1.72 : 2.598;
      cards.push({ label: "Perimeter", value: String(nSides * s) });
      cards.push({ label: "Area", value: String(Math.round(areaFactor * s * s * 100) / 100) });
    }
    return cards;
  })();

  const px = isRect ? 18 + length * 14 : 18 + s * 14;
  const py = isRect ? 18 + width * 14 : 18 + s * 14;
  const left = 120 - px / 2;
  const top = 110 - py / 2;
  const squarePts = [
    { x: left, y: top, id: "A" },
    { x: left + px, y: top, id: "B" },
    { x: left + px, y: top + py, id: "C" },
    { x: left, y: top + py, id: "D" },
  ];
  const polyPts =
    shape === "square" || isRect
      ? squarePts
      : regularPoly(nSides, 120, 110, 18 + s * 8).map((p, i) => ({
          ...p,
          id: String.fromCharCode(65 + i),
        }));
  const solidName =
    shape === "square"
      ? "cube"
      : shape === "rectangle" || shape === "cuboid"
        ? "cuboid"
        : shape === "triangle"
          ? "triangular prism"
          : shape === "pentagon"
            ? "pentagonal prism"
            : "hexagonal prism";

  const observation = isSquare && isRect
    ? "Length = width — this rectangle is a square."
    : shape === "square"
      ? "All 4 sides equal · all 4 angles 90°"
      : shape === "rectangle"
        ? "Opposite sides equal · all 4 angles 90°"
        : `${nSides} equal sides · ${nSides} corners`;

  return (
    <div className="space-y-4" data-shape={shape} data-view={view}>
      {canPick ? (
        <div className="flex flex-wrap justify-center gap-1.5">
          {SHAPE_PICKER.map((name) => (
            <Button
              key={name}
              type="button"
              size="sm"
              variant={picked === name ? "default" : "outline"}
              className="h-7 capitalize"
              onClick={() => {
                setPicked(name);
                setDrawN(99);
              }}
            >
              {name}
            </Button>
          ))}
        </div>
      ) : (
        <p className="text-center text-xs font-semibold uppercase tracking-wide text-primary">
          This lesson: {shape} only
        </p>
      )}

      <div className="flex justify-center gap-2">
        <Button type="button" size="sm" variant={view === "2d" ? "default" : "outline"} onClick={() => setView("2d")}>
          2D face
        </Button>
        <Button type="button" size="sm" variant={view === "3d" ? "default" : "outline"} onClick={() => setView("3d")}>
          3D {solidName}
        </Button>
      </div>

      {view === "2d" ? (
        <svg viewBox="0 0 240 220" className="w-full max-w-sm h-56 mx-auto">
          <rect x="8" y="8" width="224" height="204" rx="12" fill="#F8FAFC" stroke="#E2E8F0" />
          {drawN > 0 ? (
            <>
              {drawN >= nSides ? (
                <polygon
                  points={polyPts.map((p) => `${p.x},${p.y}`).join(" ")}
                  fill="#3B82F622"
                  stroke="none"
                />
              ) : null}
              {polyPts.map((p, i) => {
                if (i >= drawN) return null;
                const q = polyPts[(i + 1) % polyPts.length];
                if (i === nSides - 1 && drawN < nSides) return null;
                return (
                  <line
                    key={`e${i}`}
                    x1={p.x}
                    y1={p.y}
                    x2={q.x}
                    y2={q.y}
                    stroke="#3B82F6"
                    strokeWidth={2.4}
                    strokeLinecap="round"
                  />
                );
              })}
            </>
          ) : null}
          {(shape === "square" || isRect) && drawN >= 4
            ? squarePts.map((p, i) => {
                const dx = i === 0 || i === 3 ? 1 : -1;
                const dy = i === 0 || i === 1 ? 1 : -1;
                return <RightAngleMark key={`ra${i}`} x={p.x} y={p.y} dx={dx} dy={dy} />;
              })
            : null}
          {drawN >= nSides
            ? polyPts.map((p, i) => {
                const q = polyPts[(i + 1) % polyPts.length];
                return <EqualTick key={`t${i}`} x1={p.x} y1={p.y} x2={q.x} y2={q.y} />;
              })
            : null}
          {polyPts.slice(0, drawN >= nSides ? polyPts.length : Math.max(0, drawN)).map((p) => (
            <g key={p.id}>
              <circle cx={p.x} cy={p.y} r={4} fill="#1E40AF" />
              <text x={p.x} y={p.y - 8} textAnchor="middle" className="fill-foreground text-[10px] font-semibold">
                {p.id}
              </text>
            </g>
          ))}
        </svg>
      ) : shape === "square" ? (
        <IsometricBox sx={s} sy={s} sz={s} angle={rot} label={`s = ${s}`} />
      ) : isRect ? (
        <IsometricBox sx={length} sy={height} sz={width} angle={rot} label={`${length}×${width}×${height}`} />
      ) : (
        <IsometricPrism n={nSides} r={28 + s * 4} h={height} angle={rot} />
      )}

      <p className="text-center text-sm font-medium">{observation}</p>
      {view === "3d" ? (
        <p className="text-center text-xs text-muted-foreground">
          {shape === "square"
            ? "A cube has 6 square faces. Each face is the square you resized."
            : isRect
              ? "A cuboid has 6 rectangular faces. Opposite faces are equal."
              : `A ${solidName} has this ${shape} as its base.`}
        </p>
      ) : (
        <p className="text-center text-xs text-muted-foreground">
          Green ticks = equal sides
          {shape === "square" || isRect ? " · orange marks = 90° corners" : ""}
        </p>
      )}

      <SliderPanel spec={visibleSpec} values={values} onChange={onChange} />
      <div className="grid gap-2 sm:grid-cols-2">
        {calcCards.map((c) => (
          <div key={c.label} className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
            <p className="text-[11px] text-muted-foreground">{c.label}</p>
            <p className="text-sm font-semibold tabular-nums">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-foreground/85 space-y-1">
        <p className="font-semibold text-primary">How to explore</p>
        <ol className="list-decimal pl-4 space-y-0.5">
          {(spec.studentInteractions ?? []).map((sInt) => (
            <li key={sInt.id}>
              {sInt.description}
              {sInt.expectedObservation ? (
                <span className="text-muted-foreground"> — {sInt.expectedObservation}</span>
              ) : null}
            </li>
          ))}
        </ol>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        <Button type="button" size="sm" onClick={runDraw}>
          ▶ Draw {shape}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            setDrawN(99);
            onReset();
          }}
        >
          Reset
        </Button>
      </div>
    </div>
  );
}

export function ShapesBasicViz(props: TopicVizProps) {
  return <ShapeLabViz {...props} />;
}

export function SymmetryViz({ spec, values, onChange }: TopicVizProps) {
  const fold = values.fold ?? 50;
  return (
    <div className="space-y-4">
      <svg viewBox="0 0 160 100" className="w-full max-w-xs mx-auto h-24">
        <polygon points="20,80 60,20 100,80" fill="#3B82F644" stroke="#3B82F6" />
        <line x1={20 + (fold / 100) * 120} y1={10} x2={20 + (fold / 100) * 120} y2={90} stroke="#F59E0B" strokeWidth={2} strokeDasharray="4 3" />
      </svg>
      <SliderPanel spec={spec} values={values} onChange={onChange} />
    </div>
  );
}

export function FactorTreeViz({ spec, values, onChange, palette, classLevel }: TopicVizProps) {
  const x = Math.max(2, Math.round(values.x ?? 12));
  const y = Math.max(2, Math.round(values.y ?? 18));
  const title = `${spec.title ?? ""} ${spec.description ?? ""}`;
  const cubeMode = /perfect\s*cube/i.test(title);
  const squareMode = /perfect\s*square/i.test(title);
  const powerMode = cubeMode ? 3 : squareMode ? 2 : 0;
  const nums = powerMode || x === y ? [x] : [x, y];
  const { rows, remainder, lcm, hcf } = useMemo(() => buildLcmLadder(nums), [x, y, powerMode]);
  const primes = rows.map((r) => r.divisor);
  const single = nums.length === 1;
  const missing = useMemo(
    () => (powerMode ? missingForPerfectPower(x, powerMode as 2 | 3) : null),
    [x, powerMode],
  );
  const large = x > 200 || y > 200;
  const cellW = large ? "w-14 sm:w-16" : "w-10";
  const p = palette ?? resolvePalette({ paletteId: spec.paletteId, classLevel, colors: spec.colors });

  return (
    <div
      className="space-y-4 rounded-xl border p-4"
      style={{ borderColor: p.gridLine, background: p.surface, boxShadow: "0 1px 2px rgba(26,26,31,0.06)" }}
    >
      <p className="text-xs text-center" style={{ color: p.muted }}>
        {cubeMode
          ? "Prime factorization — make every exponent a multiple of 3"
          : squareMode
            ? "Prime factorization — make every exponent a multiple of 2"
            : single
              ? "Prime factorization — division method"
              : "Division method — divide by a prime whenever it divides any number"}
      </p>

      {/* School L-bar:  2 | 8788 */}
      <div className="mx-auto w-fit font-mono text-sm sm:text-base select-none">
        {rows.map((row, i) => (
          <div key={i} className="flex items-stretch">
            <div
              className="w-8 sm:w-10 flex items-center justify-end pr-2 font-semibold"
              style={{ color: SIGNATURE.blue }}
              aria-label={`divide by ${row.divisor}`}
            >
              {row.divisor}
            </div>
            <div
              className="border-l-2 border-b-2 pl-3 pr-2 py-1 min-w-[4.5rem]"
              style={{ borderColor: "#1a1a1f" }}
            >
              {row.values.map((v, j) => (
                <span key={j} className={`inline-block ${cellW} text-center tabular-nums`}>
                  {v}
                </span>
              ))}
            </div>
          </div>
        ))}
        <div className="flex items-stretch">
          <div className="w-8 sm:w-10" />
          <div className="border-l-2 pl-3 pr-2 py-1" style={{ borderColor: "#1a1a1f", color: "#6b6c76" }}>
            {remainder.map((v, j) => (
              <span key={j} className={`inline-block ${cellW} text-center tabular-nums`}>
                {v}
              </span>
            ))}
          </div>
        </div>
      </div>

      {missing ? (
        <div className="text-center space-y-1">
          <p className="text-sm">
            {x} ={" "}
            {Object.entries(missing.exponents)
              .map(([p, e]) => (e === 1 ? p : `${p}${e === 2 ? "²" : e === 3 ? "³" : `^${e}`}`))
              .join(" × ")}
          </p>
          <p className="text-sm font-semibold">
            Multiply by{" "}
            <span className="tabular-nums" style={{ color: SIGNATURE.blue }}>
              {missing.multiplier}
            </span>
            {missing.parts.length > 0 ? (
              <span className="font-normal text-muted-foreground">
                {" "}
                (= {missing.parts.join(" × ")})
              </span>
            ) : null}{" "}
            to get a perfect {cubeMode ? "cube" : "square"}
          </p>
        </div>
      ) : single ? (
        <p className="text-sm text-center">
          {x} = {primes.join(" × ")}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 text-center text-xs max-w-sm mx-auto">
            <div className="rounded-lg border p-2.5" style={{ borderColor: p.gridLine, background: p.background }}>
              <div className="mb-0.5" style={{ color: p.muted }}>
                HCF ({x}, {y})
              </div>
              <div className="text-lg font-semibold tabular-nums" style={{ color: p.text }}>
                {hcf}
              </div>
            </div>
            <div className="rounded-lg border p-2.5" style={{ borderColor: p.gridLine, background: p.background }}>
              <div className="mb-0.5" style={{ color: p.muted }}>
                LCM ({x}, {y})
              </div>
              <div className="text-lg font-semibold tabular-nums" style={{ color: p.text }}>
                {lcm}
              </div>
            </div>
          </div>
          <p className="text-xs text-center" style={{ color: p.muted }}>
            LCM = {primes.join(" × ")} = <span className="font-semibold" style={{ color: p.text }}>{lcm}</span>
            <span className="mx-1.5">·</span>
            Check: HCF × LCM = {hcf * lcm} = {x} × {y}
          </p>
        </>
      )}

      {!large ? <SliderPanel spec={spec} values={values} onChange={onChange} palette={p} /> : null}
    </div>
  );
}

export function PythagorasViz({ spec, values, onChange }: TopicVizProps) {
  const a = values.a ?? 3;
  const b = values.b ?? 4;
  const c = Math.sqrt(a * a + b * b);
  const scale = 12;
  return (
    <div className="space-y-4">
      <svg viewBox="0 0 180 120" className="w-full max-w-xs mx-auto h-28">
        <polygon points={`20,100 ${20 + a * scale},100 20,${100 - b * scale}`} fill="#3B82F622" stroke="#3B82F6" strokeWidth={2} />
        <text x={20 + (a * scale) / 2} y={115} textAnchor="middle" className="fill-foreground text-[10px]">a={a}</text>
        <text x={8} y={100 - (b * scale) / 2} className="fill-foreground text-[10px]">b={b}</text>
        <text x={35} y={85} className="fill-emerald-600 text-[10px] font-bold">c={c.toFixed(1)}</text>
      </svg>
      <p className="text-xs text-center">{a}² + {b}² = {a * a + b * b} = c²</p>
      <SliderPanel spec={spec} values={values} onChange={onChange} />
    </div>
  );
}

export function TrigBasicViz({ spec, values, onChange }: TopicVizProps) {
  const deg = values.angle ?? 30;
  const rad = (deg * Math.PI) / 180;
  const sin = Math.sin(rad);
  const cos = Math.cos(rad);
  const tan = Math.tan(rad);
  return (
    <div className="space-y-4">
      <svg viewBox="0 0 160 100" className="w-full max-w-xs h-24">
        <line x1={20} y1={80} x2={140} y2={80} stroke="#64748B" />
        <line x1={20} y1={80} x2={120} y2={30} stroke="#3B82F6" strokeWidth={2} />
        <path d="M 40 80 A 25 25 0 0 0 55 62" fill="none" stroke="#F59E0B" />
        <text x={45} y={72} className="fill-foreground text-[9px]">{deg}°</text>
      </svg>
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded border p-1.5"><span className="text-muted-foreground">sin</span><br /><strong>{sin.toFixed(2)}</strong></div>
        <div className="rounded border p-1.5"><span className="text-muted-foreground">cos</span><br /><strong>{cos.toFixed(2)}</strong></div>
        <div className="rounded border p-1.5"><span className="text-muted-foreground">tan</span><br /><strong>{tan.toFixed(2)}</strong></div>
      </div>
      <SliderPanel spec={spec} values={values} onChange={onChange} />
    </div>
  );
}

export function ConceptExplorerViz({ spec, values, onChange, onReset }: TopicVizProps) {
  const [pulse, setPulse] = useState(false);
  const animate = useCallback(() => {
    setPulse(true);
    window.setTimeout(() => setPulse(false), 600);
  }, []);

  return (
    <div className={cn("space-y-4 transition-transform", pulse && "scale-[1.02]")}>
      <SliderPanel spec={spec} values={values} onChange={onChange} />
      <CalcGrid spec={spec} values={values} />
      <div className="flex gap-2">
        {(spec.buttons ?? []).length > 0 ? (
          (spec.buttons ?? []).map((b) => (
            <Button
              key={b.id}
              type="button"
              size="sm"
              variant={b.action === "animate" ? "default" : "outline"}
              onClick={() => (b.action === "reset" ? onReset() : animate())}
            >
              {b.label}
            </Button>
          ))
        ) : (
          <Button type="button" size="sm" onClick={animate}>▶ Explore</Button>
        )}
      </div>
    </div>
  );
}

export const ELEMENTARY_RENDERERS: Record<string, ComponentType<TopicVizProps>> = {
  counting: CountingViz,
  "number-line": NumberLineViz,
  "place-value": PlaceValueViz,
  "multiplication-grid": MultiplicationGridViz,
  "bar-model": BarModelViz,
  "decimal-blocks": DecimalBlocksViz,
  "percent-circle": PercentCircleViz,
  "ratio-bar": RatioBarViz,
  "integer-line": IntegerLineViz,
  "clock-time": ClockTimeViz,
  money: MoneyViz,
  pattern: PatternViz,
  "matchstick-squares": MatchstickSquaresViz,
  "shape-lab": ShapeLabViz,
  "shapes-basic": ShapeLabViz,
  symmetry: SymmetryViz,
  "factor-tree": FactorTreeViz,
  pythagoras: PythagorasViz,
  "trig-basic": TrigBasicViz,
  "concept-explorer": ConceptExplorerViz,
};

export function isElementaryVisualizationType(vtype: string): boolean {
  return vtype in ELEMENTARY_RENDERERS;
}
