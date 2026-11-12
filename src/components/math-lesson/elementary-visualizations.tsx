/**
 * Class 1–10 elementary & middle-school interactive visualizations.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SliderPanel, type TopicVizProps } from "./topic-viz-shared";
import { buildVariableMap, evaluateFormula, formatCalcValue } from "./formula-utils";
import type { VisualizationSpec } from "@/types/math-lesson";
import { buildLcmLadder, missingForPerfectPower } from "./factor-ladder";
import { SIGNATURE, resolvePalette } from "./design-tokens";
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

function signed(n: number): string {
  return n < 0 ? `− ${Math.abs(n)}` : `+ ${n}`;
}

function JumpNumberLine({
  start,
  jump,
  palette: p,
  lo,
  hi,
  onDragStart,
}: {
  start: number;
  jump: number;
  palette: ReturnType<typeof resolvePalette>;
  lo: number;
  hi: number;
  onDragStart?: (n: number) => void;
}) {
  const end = start + jump;
  const W = 320;
  const pad = 18;
  const span = Math.max(1, hi - lo);
  const toX = (n: number) => pad + ((n - lo) / span) * (W - pad * 2);
  const labelEvery = span <= 20 ? 1 : span <= 40 ? 2 : 5;
  const midX = (toX(start) + toX(end)) / 2;
  const arrowDir = jump >= 0 ? 1 : -1;

  return (
    <g>
      <defs>
        <marker id="jl-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill={SIGNATURE.orange} />
        </marker>
      </defs>
      <line x1={6} y1={60} x2={W - 6} y2={60} stroke={p.text} strokeWidth={1.5} markerEnd="url(#jl-arrow)" markerStart="url(#jl-arrow)" />
      {Array.from({ length: span + 1 }).map((_, i) => {
        const v = lo + i;
        const x = toX(v);
        const showLabel = v % labelEvery === 0 || v === start || v === end;
        return (
          <g key={v}>
            <line x1={x} y1={v === 0 ? 52 : 55} x2={x} y2={v === 0 ? 68 : 65} stroke={v === 0 ? p.text : p.axisLine} strokeWidth={v === 0 ? 2 : 1} />
            {showLabel ? (
              <text
                x={x}
                y={80}
                textAnchor="middle"
                fontSize={9}
                fontWeight={v === start || v === end || v === 0 ? 700 : 400}
                fill={v === start ? SIGNATURE.blue : v === end ? SIGNATURE.green : v < 0 ? SIGNATURE.red : p.muted}
              >
                {v}
              </text>
            ) : null}
          </g>
        );
      })}
      {lo < 0 ? (
        <text x={toX(lo) + 2} y={94} fontSize={8} fill={SIGNATURE.red}>
          ← negative
        </text>
      ) : null}
      {hi > 0 ? (
        <text x={toX(hi) - 2} y={94} fontSize={8} textAnchor="end" fill={p.muted}>
          positive →
        </text>
      ) : null}
      {jump !== 0 ? (
        <>
          <path
            d={`M ${toX(start)} 52 Q ${midX} ${18} ${toX(end) - arrowDir * 2} 52`}
            fill="none"
            stroke={SIGNATURE.orange}
            strokeWidth={2}
            markerEnd="url(#jl-arrow)"
          />
          <text x={midX} y={26} textAnchor="middle" fontSize={11} fontWeight={700} fill={SIGNATURE.orange}>
            {jump > 0 ? `+${jump}` : `−${Math.abs(jump)}`}
          </text>
        </>
      ) : null}
      <circle cx={toX(end)} cy={60} r={6} fill={SIGNATURE.green} stroke="#fff" strokeWidth={2} />
      <circle
        cx={toX(start)}
        cy={60}
        r={onDragStart ? 14 : 6}
        fill="transparent"
        style={onDragStart ? { cursor: "grab" } : undefined}
        onPointerDown={
          onDragStart
            ? (e) => {
                const svg = (e.target as Element).closest("svg")!;
                const move = (ev: PointerEvent) => {
                  const r = svg.getBoundingClientRect();
                  const x = ((ev.clientX - r.left) / r.width) * W;
                  onDragStart(Math.round(lo + ((x - pad) / (W - pad * 2)) * span));
                };
                const up = () => {
                  window.removeEventListener("pointermove", move);
                  window.removeEventListener("pointerup", up);
                };
                window.addEventListener("pointermove", move);
                window.addEventListener("pointerup", up);
              }
            : undefined
        }
      />
      <circle cx={toX(start)} cy={60} r={6} fill={SIGNATURE.blue} stroke="#fff" strokeWidth={2} pointerEvents="none" />
    </g>
  );
}

function JumpLegend({ start, jump, palette: p }: { start: number; jump: number; palette: ReturnType<typeof resolvePalette> }) {
  const end = start + jump;
  return (
    <div className="space-y-1 text-center">
      <p className="text-base font-semibold tabular-nums" style={{ color: p.text }}>
        <span style={{ color: SIGNATURE.blue }}>{start}</span> {signed(jump)} ={" "}
        <span style={{ color: SIGNATURE.green }}>{end}</span>
      </p>
      <p className="text-xs" style={{ color: p.muted }}>
        Start at the <span style={{ color: SIGNATURE.blue, fontWeight: 600 }}>blue</span> dot,{" "}
        {jump === 0
          ? "don't move"
          : `move ${Math.abs(jump)} step${Math.abs(jump) === 1 ? "" : "s"} ${jump > 0 ? "right (adding)" : "left (subtracting)"}`}
        , land on the <span style={{ color: SIGNATURE.green, fontWeight: 600 }}>green</span> dot.
      </p>
    </div>
  );
}

function lineRange(...ns: number[]): [number, number] {
  const lo = Math.min(0, ...ns);
  const hi = Math.max(10, ...ns);
  return [Math.floor(lo), Math.ceil(hi)];
}

export function NumberLineViz({ spec, values, onChange, palette, classLevel }: TopicVizProps) {
  const sliders = spec.sliders ?? [];
  const startSlider = sliders.find((s) => s.id === "start");
  const start = values.start ?? 0;
  const jump = values.jump ?? 0;
  const p = palette ?? resolvePalette({ paletteId: spec.paletteId, classLevel, colors: spec.colors });
  const [lo, hi] = lineRange(start, start + jump, startSlider?.min ?? 0);

  return (
    <div className="space-y-4">
      <VizStage palette={p} viewBox="0 0 320 96" heightClass="h-auto" hint="Drag the blue dot or use the sliders">
        <JumpNumberLine
          start={start}
          jump={jump}
          palette={p}
          lo={lo}
          hi={hi}
          onDragStart={(n) =>
            onChange("start", Math.max(startSlider?.min ?? lo, Math.min(startSlider?.max ?? hi, n)))
          }
        />
      </VizStage>
      <JumpLegend start={start} jump={jump} palette={p} />
      <SliderPanel spec={spec} values={values} onChange={onChange} palette={p} />
    </div>
  );
}

function HundredFlat() {
  return (
    <div className="grid grid-cols-10 gap-px w-14 h-14 p-px bg-blue-700 rounded-sm" title="100">
      {Array.from({ length: 100 }).map((_, i) => (
        <div key={i} className="bg-blue-400" />
      ))}
    </div>
  );
}

function TenRod() {
  return (
    <div className="flex flex-col gap-px w-1.5 h-14 p-px bg-emerald-700 rounded-sm" title="10">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex-1 bg-emerald-400" />
      ))}
    </div>
  );
}

export function PlaceValueViz({ spec, values, onChange }: TopicVizProps) {
  const n = Math.round(values.n ?? 247);
  const h = Math.floor(n / 100);
  const t = Math.floor((n % 100) / 10);
  const o = n % 10;
  const columns = [
    { name: "Hundreds", digit: h, worth: 100, color: "text-blue-700", bg: "bg-blue-50 border-blue-200", block: <HundredFlat /> },
    { name: "Tens", digit: t, worth: 10, color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", block: <TenRod /> },
    {
      name: "Ones",
      digit: o,
      worth: 1,
      color: "text-amber-700",
      bg: "bg-amber-50 border-amber-200",
      block: <div className="w-3 h-3 bg-amber-400 border border-amber-700 rounded-sm" title="1" />,
    },
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {columns.map((c) => (
          <div key={c.name} className={cn("rounded-lg border p-2 flex flex-col items-center gap-2", c.bg)}>
            <p className={cn("text-xs font-semibold", c.color)}>
              {c.name} <span className="font-normal text-muted-foreground">(each = {c.worth})</span>
            </p>
            <p className={cn("text-3xl font-bold tabular-nums", c.color)}>{c.digit}</p>
            <div className="flex flex-wrap gap-1 justify-center min-h-[3.5rem] items-end">
              {Array.from({ length: c.digit }).map((_, i) => (
                <span key={i}>{c.block}</span>
              ))}
            </div>
            <p className="text-[11px] tabular-nums text-muted-foreground">
              {c.digit} × {c.worth} = {c.digit * c.worth}
            </p>
          </div>
        ))}
      </div>
      <p className="text-center font-semibold tabular-nums">
        {h * 100} + {t * 10} + {o} = {n}
      </p>
      <SliderPanel spec={spec} values={values} onChange={onChange} />
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

const GROUP_COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899", "#14B8A6"];

export function BarModelViz({ spec, values, onChange }: TopicVizProps) {
  const total = Math.round(values.total ?? 12);
  const groups = Math.max(1, Math.round(values.groups ?? 3));
  const each = Math.floor(total / groups);
  const left = total - each * groups;
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {Array.from({ length: groups }).map((_, g) => (
          <div key={g} className="flex items-center gap-2">
            <span className="w-16 shrink-0 text-xs font-semibold" style={{ color: GROUP_COLORS[g % GROUP_COLORS.length] }}>
              Group {g + 1}
            </span>
            <div className="flex flex-wrap gap-1">
              {Array.from({ length: each }).map((__, i) => (
                <span
                  key={i}
                  className="w-4 h-4 rounded-full"
                  style={{ background: GROUP_COLORS[g % GROUP_COLORS.length] }}
                />
              ))}
            </div>
            <span className="ml-auto text-xs tabular-nums text-muted-foreground">{each}</span>
          </div>
        ))}
        {left > 0 ? (
          <div className="flex items-center gap-2">
            <span className="w-16 shrink-0 text-xs font-semibold text-red-600">Left over</span>
            <div className="flex gap-1">
              {Array.from({ length: left }).map((_, i) => (
                <span key={i} className="w-4 h-4 rounded-full border-2 border-dashed border-red-500" />
              ))}
            </div>
            <span className="ml-auto text-xs tabular-nums text-red-600">{left}</span>
          </div>
        ) : null}
      </div>
      <p className="text-center text-sm font-semibold tabular-nums">
        {total} ÷ {groups} = {each}
        {left > 0 ? ` remainder ${left}` : ""}
      </p>
      <p className="text-center text-xs text-muted-foreground">
        {total} things shared equally into {groups} groups gives {each} in each group
        {left > 0 ? `, with ${left} left over that can't be shared equally.` : "."}
      </p>
      <SliderPanel spec={spec} values={values} onChange={onChange} />
    </div>
  );
}

export function DecimalBlocksViz({ spec, values, onChange }: TopicVizProps) {
  const tenthsTotal = Math.round(values.d ?? 35);
  const ones = Math.floor(tenthsTotal / 10);
  const tenths = tenthsTotal % 10;
  const value = tenthsTotal / 10;
  return (
    <div className="space-y-4 text-center">
      <p className="text-3xl font-bold text-primary tabular-nums">
        <span className="text-blue-700">{ones}</span>.<span className="text-amber-600">{tenths}</span>
      </p>
      <div className="flex justify-center items-end gap-2 flex-wrap">
        {Array.from({ length: ones }).map((_, i) => (
          <div key={i} className="grid grid-cols-10 w-12 h-12 border-2 border-blue-700 bg-blue-400 gap-px" title="1 whole">
            {Array.from({ length: 10 }).map((__, j) => (
              <div key={j} className="bg-blue-400 border-r border-blue-700/40 last:border-r-0" />
            ))}
          </div>
        ))}
        <div className="grid grid-cols-10 w-12 h-12 border-2 border-amber-600" title="tenths of the next whole">
          {Array.from({ length: 10 }).map((_, j) => (
            <div key={j} className={cn("border-r border-amber-600/40 last:border-r-0", j < tenths ? "bg-amber-400" : "bg-white")} />
          ))}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Each square is 1 whole cut into 10 strips. Each strip is <b>0.1</b> (one tenth).
      </p>
      <p className="text-sm font-semibold tabular-nums">
        <span className="text-blue-700">{ones} whole{ones === 1 ? "" : "s"}</span> +{" "}
        <span className="text-amber-600">
          {tenths} tenth{tenths === 1 ? "" : "s"}
        </span>{" "}
        = {value.toFixed(1)}
      </p>
      <SliderPanel
        spec={{
          ...spec,
          sliders: (spec.sliders ?? []).map((s) => (s.id === "d" ? { ...s, label: "Number of tenths (0.1 strips)" } : s)),
        }}
        values={values}
        onChange={onChange}
      />
    </div>
  );
}

export function PercentCircleViz({ spec, values, onChange }: TopicVizProps) {
  const pct = Math.round(values.pct ?? 25);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-10 gap-0.5 w-48 h-48 mx-auto p-1 rounded-lg border bg-white">
        {Array.from({ length: 100 }).map((_, i) => (
          <div key={i} className={cn("rounded-[2px] transition-colors", i < pct ? "bg-blue-500" : "bg-slate-200")} />
        ))}
      </div>
      <p className="text-center text-sm font-semibold tabular-nums">
        {pct} of 100 squares shaded = <span className="text-blue-600">{pct}%</span> = {pct}/100
      </p>
      <p className="text-center text-xs text-muted-foreground">Per cent means “out of 100”. The grid has exactly 100 squares.</p>
      <SliderPanel spec={spec} values={values} onChange={onChange} />
    </div>
  );
}

export function RatioBarViz({ spec, values, onChange }: TopicVizProps) {
  const a = Math.max(1, Math.round(values.a ?? 2));
  const b = Math.max(1, Math.round(values.b ?? 3));
  const total = a + b;
  const row = (count: number, color: string, label: string) => (
    <div className="flex items-center gap-2">
      <span className="w-12 shrink-0 text-xs font-semibold" style={{ color }}>
        {label}
      </span>
      <div className="flex gap-1">
        {Array.from({ length: count }).map((_, i) => (
          <span key={i} className="w-6 h-6 rounded border-2" style={{ background: `${color}55`, borderColor: color }} />
        ))}
      </div>
      <span className="text-xs tabular-nums" style={{ color }}>
        {count} part{count === 1 ? "" : "s"}
      </span>
    </div>
  );
  return (
    <div className="space-y-4">
      <div className="space-y-2 w-fit mx-auto">
        {row(a, "#3B82F6", "A")}
        {row(b, "#10B981", "B")}
      </div>
      <p className="text-center text-sm font-semibold">
        A : B = {a} : {b}
      </p>
      <p className="text-center text-xs text-muted-foreground">
        Every box is the same size. For every {a} box{a === 1 ? "" : "es"} of A there {b === 1 ? "is" : "are"} {b} of B — {total} parts in all, so A is {a}/{total} of the total.
      </p>
      <SliderPanel spec={spec} values={values} onChange={onChange} />
    </div>
  );
}

export function IntegerLineViz({ spec, values, onChange, palette, classLevel }: TopicVizProps) {
  const pos = values.pos ?? -2;
  const move = values.move ?? 5;
  const p = palette ?? resolvePalette({ paletteId: spec.paletteId, classLevel, colors: spec.colors });
  const reach = Math.max(10, Math.abs(pos), Math.abs(pos + move));
  return (
    <div className="space-y-4">
      <VizStage palette={p} viewBox="0 0 320 96" heightClass="h-auto" hint="Drag the blue dot or use the sliders">
        <JumpNumberLine
          start={pos}
          jump={move}
          palette={p}
          lo={-reach}
          hi={reach}
          onDragStart={(n) => onChange("pos", Math.max(-10, Math.min(10, n)))}
        />
      </VizStage>
      <JumpLegend start={pos} jump={move} palette={p} />
      <SliderPanel spec={spec} values={values} onChange={onChange} palette={p} />
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
      <svg viewBox="0 0 120 120" className="w-44 h-44 mx-auto">
        <circle cx={cx} cy={cy} r={54} fill="#F8FAFC" stroke="#3B82F6" strokeWidth={2} />
        {Array.from({ length: 60 }).map((_, i) => {
          const a = ((i * 6 - 90) * Math.PI) / 180;
          const major = i % 5 === 0;
          const r1 = major ? 46 : 49;
          return (
            <line
              key={i}
              x1={cx + r1 * Math.cos(a)}
              y1={cy + r1 * Math.sin(a)}
              x2={cx + 52 * Math.cos(a)}
              y2={cy + 52 * Math.sin(a)}
              stroke={major ? "#1E293B" : "#94A3B8"}
              strokeWidth={major ? 1.4 : 0.6}
            />
          );
        })}
        {Array.from({ length: 12 }).map((_, i) => {
          const num = i + 1;
          const a = ((num * 30 - 90) * Math.PI) / 180;
          return (
            <text key={num} x={cx + 38 * Math.cos(a)} y={cy + 38 * Math.sin(a) + 3} textAnchor="middle" fontSize={9} fontWeight={600} fill="#1E293B">
              {num}
            </text>
          );
        })}
        <line x1={cx} y1={cy} x2={cx + 26 * Math.cos(hRad)} y2={cy + 26 * Math.sin(hRad)} stroke="#1E293B" strokeWidth={3.5} strokeLinecap="round" />
        <line x1={cx} y1={cy} x2={cx + 44 * Math.cos(mRad)} y2={cy + 44 * Math.sin(mRad)} stroke="#F59E0B" strokeWidth={2} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={3} fill="#1E293B" />
      </svg>
      <p className="text-center text-2xl font-bold tabular-nums">
        {hour}:{minute.toString().padStart(2, "0")}
      </p>
      <p className="text-center text-xs text-muted-foreground">
        <span className="font-semibold text-slate-800">Short black hand</span> = hour (
        {minute === 0 ? `on ${hour % 12 || 12}` : `just past ${hour % 12 || 12}`}) ·{" "}
        <span className="font-semibold text-amber-600">Long orange hand</span> ={" "}
        {minute === 0
          ? "on 12, so it is exactly o'clock"
          : minute % 5 === 0
            ? `on ${minute / 5}, and ${minute / 5} × 5 = ${minute} minutes`
            : `${minute} minutes`}
      </p>
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
  const step = Math.max(1, Math.round(values.step ?? 4));
  const matchsticks = 2 * step + 1;
  const S = 32;
  const H = 28;
  const pts = Array.from({ length: step + 2 }).map((_, k) => ({
    x: 12 + (k * S) / 2,
    y: k % 2 === 0 ? 12 + H : 12,
  }));
  const edges: { a: number; b: number }[] = [];
  for (let k = 0; k <= step; k++) edges.push({ a: k, b: k + 1 });
  for (let k = 0; k < step; k++) edges.push({ a: k, b: k + 2 });
  const isNew = (e: { a: number; b: number }) =>
    step > 1 && ((e.a === step && e.b === step + 1) || (e.a === step - 1 && e.b === step + 1));
  const W = 24 + ((step + 1) * S) / 2;

  return (
    <div className="space-y-4">
      <svg viewBox={`0 0 ${W} ${H + 24}`} className="w-full max-w-md mx-auto h-auto max-h-28">
        {edges.map((e, i) => (
          <line
            key={i}
            x1={pts[e.a].x}
            y1={pts[e.a].y}
            x2={pts[e.b].x}
            y2={pts[e.b].y}
            stroke={isNew(e) ? "#2563EB" : "#D97706"}
            strokeWidth={3}
            strokeLinecap="round"
          />
        ))}
      </svg>
      <p className="text-center text-sm font-semibold">
        Step {step}: {step} triangle{step === 1 ? "" : "s"} need {matchsticks} matchsticks
      </p>
      <p className="text-center text-xs text-muted-foreground">
        {step > 1 ? (
          <>
            Each new triangle shares one side, so it only adds <span className="font-semibold text-blue-600">2 blue sticks</span>.
          </>
        ) : (
          "The first triangle needs 3 sticks. Each new one shares a side and adds 2 more."
        )}
      </p>
      <div className="mx-auto w-fit overflow-x-auto">
        <table className="text-xs tabular-nums border-collapse">
          <tbody>
            <tr>
              <th className="pr-2 text-left font-medium text-muted-foreground">Step (n)</th>
              {Array.from({ length: Math.max(step, 5) }).map((_, i) => (
                <td key={i} className={cn("px-2 border text-center", i + 1 === step && "bg-amber-100 font-bold")}>
                  {i + 1}
                </td>
              ))}
            </tr>
            <tr>
              <th className="pr-2 text-left font-medium text-muted-foreground">Sticks</th>
              {Array.from({ length: Math.max(step, 5) }).map((_, i) => (
                <td key={i} className={cn("px-2 border text-center", i + 1 === step && "bg-amber-100 font-bold")}>
                  {2 * (i + 1) + 1}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-center text-xs">
        Rule: sticks = 2 × n + 1 → 2 × {step} + 1 = <b>{matchsticks}</b>
      </p>
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
      : isRect
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

const SYMMETRY_SHAPE = [
  { x: 60, y: 14 },
  { x: 92, y: 40 },
  { x: 80, y: 84 },
  { x: 40, y: 84 },
  { x: 28, y: 40 },
];

export function SymmetryViz({ spec, values, onChange }: TopicVizProps) {
  const fold = values.fold ?? 50;
  const L = 30 + fold * 0.6;
  const onAxis = Math.abs(L - 60) < 1.5;
  const reflected = SYMMETRY_SHAPE.map((pt) => ({ x: 2 * L - pt.x, y: pt.y }));
  const toPts = (arr: { x: number; y: number }[]) => arr.map((pt) => `${pt.x},${pt.y}`).join(" ");
  return (
    <div className="space-y-4">
      <svg viewBox="-40 0 200 100" className="w-full max-w-sm mx-auto h-40">
        <polygon points={toPts(SYMMETRY_SHAPE)} fill="#3B82F633" stroke="#3B82F6" strokeWidth={2} />
        <polygon
          points={toPts(reflected)}
          fill={onAxis ? "#10B98133" : "#F59E0B22"}
          stroke={onAxis ? "#10B981" : "#F59E0B"}
          strokeWidth={2}
          strokeDasharray="5 3"
        />
        <line x1={L} y1={4} x2={L} y2={96} stroke={onAxis ? "#10B981" : "#F59E0B"} strokeWidth={2} strokeDasharray="4 3" />
        <text x={L + 3} y={10} fontSize={7} fill={onAxis ? "#10B981" : "#B45309"}>
          mirror
        </text>
      </svg>
      <p className={cn("text-center text-sm font-semibold", onAxis ? "text-emerald-600" : "text-amber-700")}>
        {onAxis
          ? "The mirror image lands exactly on the shape — this is a line of symmetry!"
          : "The dashed mirror image does not match the shape — not a line of symmetry."}
      </p>
      <p className="text-center text-xs text-muted-foreground">
        Blue = the shape · dashed = its reflection in the mirror line. Move the mirror until both match.
      </p>
      <SliderPanel spec={spec} values={values} onChange={onChange} />
    </div>
  );
}

export function FactorTreeViz({ spec, values, onChange, palette, classLevel }: TopicVizProps) {
  const x = Math.max(2, Math.round(values.x ?? 12));
  const y = Math.max(2, Math.round(values.y ?? 18));
  // Generic descriptions mention both "cube / square"; only the title names the lesson's goal.
  const heading = spec.title ?? "";
  const cubeMode = /perfect\s*cube|cube\s*root/i.test(heading);
  const squareMode = !cubeMode && /perfect\s*square|square\s*root/i.test(heading);
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
              .map(([p, e]) => (e === 1 ? p : `${p}${superscript(e)}`))
              .join(" × ")}
          </p>
          {missing.multiplier === 1 ? (
            <p className="text-sm font-semibold">
              Every power is a multiple of {powerMode}, so {x} is already a perfect {cubeMode ? "cube" : "square"}:{" "}
              <span style={{ color: SIGNATURE.blue }}>
                {x} = {Math.round(Math.pow(x, 1 / powerMode))}
                {cubeMode ? "³" : "²"}
              </span>
            </p>
          ) : (
            <p className="text-sm font-semibold">
              Multiply by{" "}
              <span className="tabular-nums" style={{ color: SIGNATURE.blue }}>
                {missing.multiplier}
              </span>
              {missing.parts.length > 0 ? (
                <span className="font-normal text-muted-foreground">
                  {" "}
                  (= {missing.parts.map((part) => part.replace(/\^(\d+)/g, (_, e) => superscript(Number(e)))).join(" × ")})
                </span>
              ) : null}{" "}
              to get a perfect {cubeMode ? "cube" : "square"}
            </p>
          )}
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

      {!large ? (
        <SliderPanel
          spec={
            powerMode
              ? {
                  ...spec,
                  sliders: (spec.sliders ?? [])
                    .filter((s) => s.id !== "y")
                    .map((s) => (s.id === "x" ? { ...s, label: "Number", max: Math.min(s.max ?? 1000, 1000) } : s)),
                }
              : spec
          }
          values={values}
          onChange={onChange}
          palette={p}
        />
      ) : null}
    </div>
  );
}

const SUPERSCRIPT_DIGITS = "⁰¹²³⁴⁵⁶⁷⁸⁹";
function superscript(n: number): string {
  return String(n)
    .split("")
    .map((d) => SUPERSCRIPT_DIGITS[Number(d)] ?? d)
    .join("");
}

function fmtNum(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

export function PythagorasViz({ spec, values, onChange }: TopicVizProps) {
  const a = values.a ?? 3;
  const b = values.b ?? 4;
  const c2 = a * a + b * b;
  const c = Math.sqrt(c2);
  const exact = Number.isInteger(c);
  // Right angle at R=(0,0); leg a along +x, leg b along +y (math coords).
  const R = { x: 0, y: 0 };
  const P = { x: a, y: 0 };
  const Q = { x: 0, y: b };
  const sqA = [R, P, { x: a, y: -a }, { x: 0, y: -a }];
  const sqB = [R, Q, { x: -b, y: b }, { x: -b, y: 0 }];
  const sqC = [P, Q, { x: b, y: b + a }, { x: a + b, y: a }];
  const minX = -b;
  const maxX = a + b;
  const minY = -a;
  const maxY = a + b;
  const pad = 1.2;
  const unit = 200 / Math.max(maxX - minX + pad * 2, maxY - minY + pad * 2);
  const W = (maxX - minX + pad * 2) * unit;
  const H = (maxY - minY + pad * 2) * unit;
  const sx = (x: number) => (x - minX + pad) * unit;
  const sy = (y: number) => (maxY + pad - y) * unit;
  const poly = (arr: { x: number; y: number }[]) => arr.map((pt) => `${sx(pt.x)},${sy(pt.y)}`).join(" ");
  const center = (arr: { x: number; y: number }[]) => ({
    x: sx(arr.reduce((s, pt) => s + pt.x, 0) / arr.length),
    y: sy(arr.reduce((s, pt) => s + pt.y, 0) / arr.length),
  });
  const fs = Math.max(8, Math.min(13, unit * 0.9));
  const cA = center(sqA);
  const cB = center(sqB);
  const cC = center(sqC);
  const m = Math.min(a, b) * 0.18 * unit;

  return (
    <div className="space-y-4">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-xs mx-auto h-auto">
        <polygon points={poly(sqA)} fill="#3B82F633" stroke="#3B82F6" strokeWidth={1.5} />
        <polygon points={poly(sqB)} fill="#10B98133" stroke="#10B981" strokeWidth={1.5} />
        <polygon points={poly(sqC)} fill="#F59E0B33" stroke="#F59E0B" strokeWidth={1.5} />
        <polygon points={poly([R, P, Q])} fill="#ffffff" stroke="#1E293B" strokeWidth={2} />
        <path
          d={`M ${sx(0) + m} ${sy(0)} L ${sx(0) + m} ${sy(0) - m} L ${sx(0)} ${sy(0) - m}`}
          fill="none"
          stroke="#1E293B"
          strokeWidth={1.2}
        />
        {[
          { c: cA, area: `a² = ${a * a}`, side: `side a = ${a}`, color: "#1D4ED8" },
          { c: cB, area: `b² = ${b * b}`, side: `side b = ${b}`, color: "#047857" },
          { c: cC, area: `c² = ${c2}`, side: `side c = ${exact ? c : c.toFixed(1)}`, color: "#B45309" },
        ].map((sq) => (
          <g key={sq.area}>
            <text x={sq.c.x} y={sq.c.y} textAnchor="middle" fontSize={fs} fontWeight={700} fill={sq.color}>
              {sq.area}
            </text>
            <text x={sq.c.x} y={sq.c.y + fs * 0.95} textAnchor="middle" fontSize={fs * 0.7} fill={sq.color}>
              {sq.side}
            </text>
          </g>
        ))}
      </svg>
      <p className="text-center text-sm font-semibold tabular-nums">
        <span className="text-blue-700">{a * a}</span> + <span className="text-emerald-700">{b * b}</span> ={" "}
        <span className="text-amber-700">{c2}</span>, so c = √{c2} = {exact ? c : `${c.toFixed(2)} (approx.)`}
      </p>
      <p className="text-center text-xs text-muted-foreground">
        The two smaller squares (on the legs a and b) together have exactly the same area as the big square on the
        longest side c.
      </p>
      <SliderPanel spec={spec} values={values} onChange={onChange} />
    </div>
  );
}

export function TrigBasicViz({ spec, values, onChange }: TopicVizProps) {
  const deg = Math.max(0, Math.min(90, values.angle ?? 30));
  const rad = (deg * Math.PI) / 180;
  const hyp = 10;
  const opp = hyp * Math.sin(rad);
  const adj = hyp * Math.cos(rad);
  const k = 12;
  const Ax = 80;
  const Ay = 150;
  const Bx = Ax + adj * k;
  const Cy = Ay - opp * k;
  const tanText = deg >= 90 ? "undefined (adjacent = 0)" : (opp / adj).toFixed(2);
  const arcR = 22;
  const card = (name: string, ratio: string, color: string, num: string, den: string, val: string) => (
    <div className="rounded-lg border p-2 text-center">
      <p className="text-xs font-semibold" style={{ color }}>
        {name} {deg}°
      </p>
      <p className="text-[11px] text-muted-foreground">{ratio}</p>
      <p className="text-xs tabular-nums">
        {num} ÷ {den}
      </p>
      <p className="text-sm font-bold tabular-nums">{val}</p>
    </div>
  );
  return (
    <div className="space-y-4">
      <svg viewBox={`0 ${Math.min(Cy, Ay - 40) - 14} 280 ${Ay + 20 - (Math.min(Cy, Ay - 40) - 14)}`} className="w-full max-w-sm mx-auto h-auto">
        <polygon points={`${Ax},${Ay} ${Bx},${Ay} ${Bx},${Cy}`} fill="#3B82F611" stroke="none" />
        <line x1={Ax} y1={Ay} x2={Bx} y2={Ay} stroke="#10B981" strokeWidth={3} />
        <line x1={Bx} y1={Ay} x2={Bx} y2={Cy} stroke="#EF4444" strokeWidth={3} />
        <line x1={Ax} y1={Ay} x2={Bx} y2={Cy} stroke="#3B82F6" strokeWidth={3} />
        {deg > 0 && deg < 90 ? (
          <path d={`M ${Bx - 8} ${Ay} L ${Bx - 8} ${Ay - 8} L ${Bx} ${Ay - 8}`} fill="none" stroke="#1E293B" strokeWidth={1} />
        ) : null}
        <path
          d={`M ${Ax + arcR} ${Ay} A ${arcR} ${arcR} 0 0 0 ${Ax + arcR * Math.cos(rad)} ${Ay - arcR * Math.sin(rad)}`}
          fill="none"
          stroke="#F59E0B"
          strokeWidth={2}
        />
        <text x={Ax + arcR + 4} y={Ay - 5} fontSize={9} fontWeight={700} fill="#B45309">
          θ = {deg}°
        </text>
        <text x={(Ax + Bx) / 2} y={Ay + 13} textAnchor="middle" fontSize={9} fill="#047857" fontWeight={600}>
          Adjacent = {adj.toFixed(1)}
        </text>
        {opp > 1 ? (
          <text x={Bx + 4} y={(Ay + Cy) / 2} fontSize={9} fill="#B91C1C" fontWeight={600}>
            Opposite = {opp.toFixed(1)}
          </text>
        ) : null}
        <text
          x={Math.max(78, (Ax + Bx) / 2 - 6)}
          y={(Ay + Cy) / 2 - 6}
          textAnchor="end"
          fontSize={9}
          fill="#1D4ED8"
          fontWeight={600}
        >
          Hypotenuse = {hyp}
        </text>
      </svg>
      <p className="text-center text-xs text-muted-foreground">
        Sides are named from the angle θ: <span className="text-red-600 font-semibold">opposite</span> faces it,{" "}
        <span className="text-emerald-600 font-semibold">adjacent</span> touches it,{" "}
        <span className="text-blue-600 font-semibold">hypotenuse</span> is the longest side.
      </p>
      <div className="grid grid-cols-3 gap-2">
        {card("sin", "opposite ÷ hypotenuse", "#B91C1C", opp.toFixed(1), String(hyp), (opp / hyp).toFixed(2))}
        {card("cos", "adjacent ÷ hypotenuse", "#047857", adj.toFixed(1), String(hyp), (adj / hyp).toFixed(2))}
        {card("tan", "opposite ÷ adjacent", "#1D4ED8", opp.toFixed(1), adj.toFixed(1), tanText)}
      </div>
      <SliderPanel spec={spec} values={values} onChange={onChange} />
    </div>
  );
}

function substituteFormula(formula: string, labels: Record<string, string>, vals: Record<string, number>): string {
  return formula
    .replace(/[A-Za-z_]\w*/g, (id) => (id in vals ? fmtNum(vals[id]) : labels[id] ?? id))
    .replace(/\*/g, "×")
    .replace(/\//g, "÷");
}

export function ConceptExplorerViz({ spec, values, onChange, onReset }: TopicVizProps) {
  const [pulse, setPulse] = useState(false);
  const animate = useCallback(() => {
    setPulse(true);
    window.setTimeout(() => setPulse(false), 600);
  }, []);
  const sliders = spec.sliders ?? [];
  const labels = Object.fromEntries(sliders.map((s) => [s.id, s.label]));
  const vals = Object.fromEntries(sliders.map((s) => [s.id, values[s.id] ?? s.default ?? 0]));

  return (
    <div className={cn("space-y-4 transition-transform", pulse && "scale-[1.02]")}>
      {sliders.length > 0 ? (
        <div className="space-y-2 rounded-xl border p-3 bg-white">
          {sliders.map((s, i) => {
            const v = vals[s.id];
            const pct = Math.max(2, Math.min(100, ((v - (s.min ?? 0)) / Math.max(1, (s.max ?? 100) - (s.min ?? 0))) * 100));
            return (
              <div key={s.id} className="flex items-center gap-2">
                <span className="w-28 shrink-0 text-xs font-medium truncate">{s.label}</span>
                <div className="flex-1 h-5 rounded bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded transition-all duration-300"
                    style={{ width: `${pct}%`, background: GROUP_COLORS[i % GROUP_COLORS.length] }}
                  />
                </div>
                <span className="w-16 text-right text-xs font-semibold tabular-nums">{fmtNum(v)}</span>
              </div>
            );
          })}
        </div>
      ) : null}
      {(spec.liveCalculations ?? []).map((c) => (
        <p key={c.id} className="text-center text-sm tabular-nums">
          {c.label} = {substituteFormula(c.formula, labels, vals)} ={" "}
          <b>{formatCalcValue(evaluateFormula(c.formula, buildVariableMap(values, {})), c.unit)}</b>
        </p>
      ))}
      <SliderPanel spec={spec} values={values} onChange={onChange} />
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
