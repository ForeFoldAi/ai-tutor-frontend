/**
 * Class 1–10 elementary & middle-school interactive visualizations.
 */
import { useCallback, useState, type ComponentType } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SliderPanel, CalcGrid, type TopicVizProps } from "./topic-viz-shared";

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

export function NumberLineViz({ spec, values, onChange }: TopicVizProps) {
  const start = values.start ?? 0;
  const jump = values.jump ?? 0;
  const result = start + jump;
  const W = 280;
  const toX = (n: number) => 20 + ((n + 5) / 25) * (W - 40);

  return (
    <div className="space-y-4">
      <svg viewBox={`0 0 ${W} 80`} className="w-full h-20">
        <line x1={10} y1={40} x2={W - 10} y2={40} stroke="#64748B" strokeWidth={2} />
        {Array.from({ length: 11 }).map((_, i) => {
          const v = i * 2;
          const x = toX(v);
          return (
            <g key={i}>
              <line x1={x} y1={35} x2={x} y2={45} stroke="#94A3B8" />
              <text x={x} y={58} textAnchor="middle" className="fill-muted-foreground text-[8px]">{v}</text>
            </g>
          );
        })}
        <circle cx={toX(start)} cy={40} r={6} fill="#3B82F6" />
        <circle cx={toX(result)} cy={40} r={6} fill="#10B981" className="transition-all duration-500" />
        {jump !== 0 ? (
          <path
            d={`M ${toX(start)} 28 Q ${(toX(start) + toX(result)) / 2} 15 ${toX(result)} 28`}
            fill="none"
            stroke="#F59E0B"
            strokeWidth={2}
            markerEnd="url(#arrow)"
          />
        ) : null}
      </svg>
      <p className="text-xs text-center">{start} {jump >= 0 ? "+" : ""}{jump} = <strong>{result}</strong></p>
      <SliderPanel spec={spec} values={values} onChange={onChange} />
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

export function ShapesBasicViz({ spec, values, onChange }: TopicVizProps) {
  const sides = Math.max(3, Math.round(values.sides ?? 4));
  const cx = 60;
  const cy = 60;
  const r = 45;
  const pts = Array.from({ length: sides }).map((_, i) => {
    const a = ((i / sides) * 360 - 90) * (Math.PI / 180);
    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
  });

  return (
    <div className="space-y-4">
      <svg viewBox="0 0 120 120" className="w-32 h-32 mx-auto">
        <polygon points={pts.join(" ")} fill="#3B82F633" stroke="#3B82F6" strokeWidth={2} />
      </svg>
      <p className="text-center text-sm font-medium">{sides} sides · {sides} corners</p>
      <SliderPanel spec={spec} values={values} onChange={onChange} />
    </div>
  );
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

export function FactorTreeViz({ spec, values, onChange }: TopicVizProps) {
  const x = Math.round(values.x ?? 12);
  const y = Math.round(values.y ?? 18);
  return (
    <div className="space-y-4 text-center">
      <svg viewBox="0 0 200 100" className="w-full h-24">
        <text x={100} y={20} textAnchor="middle" className="fill-foreground text-xs font-bold">LCM({x},{y})</text>
        <line x1={100} y1={25} x2={60} y2={45} stroke="#64748B" />
        <line x1={100} y1={25} x2={140} y2={45} stroke="#64748B" />
        <circle cx={60} cy={55} r={18} fill="#3B82F622" stroke="#3B82F6" />
        <text x={60} y={59} textAnchor="middle" className="fill-foreground text-[11px]">{x}</text>
        <circle cx={140} cy={55} r={18} fill="#10B98122" stroke="#10B981" />
        <text x={140} y={59} textAnchor="middle" className="fill-foreground text-[11px]">{y}</text>
      </svg>
      <SliderPanel spec={spec} values={values} onChange={onChange} />
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
  "shapes-basic": ShapesBasicViz,
  symmetry: SymmetryViz,
  "factor-tree": FactorTreeViz,
  pythagoras: PythagorasViz,
  "trig-basic": TrigBasicViz,
  "concept-explorer": ConceptExplorerViz,
};

export function isElementaryVisualizationType(vtype: string): boolean {
  return vtype in ELEMENTARY_RENDERERS;
}
