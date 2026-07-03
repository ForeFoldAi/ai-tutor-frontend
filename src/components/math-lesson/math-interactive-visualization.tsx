import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { VisualizationSpec } from "@/types/math-lesson";
import {
  buildVariableMap,
  defaultSliderValues,
  evaluateFormula,
  formatCalcValue,
} from "./formula-utils";
import {
  isTopicVisualizationType,
  TopicVisualization,
} from "./topic-visualizations";

interface VizProps {
  spec: VisualizationSpec;
}

function VizControls({
  spec,
  values,
  onChange,
  onReset,
  onAnimate,
  animating = false,
}: {
  spec: VisualizationSpec;
  values: Record<string, number>;
  onChange: (id: string, v: number) => void;
  onReset: () => void;
  onAnimate?: () => void;
  animating?: boolean;
}) {
  const sliders = spec.sliders ?? [];
  const buttons = spec.buttons ?? [];
  const calcs = spec.liveCalculations ?? [];
  const vars = buildVariableMap(values, {});

  return (
    <div className="space-y-4">
      {sliders.map((s) => (
        <div key={s.id} className="space-y-1.5">
          <div className="flex justify-between text-xs font-medium text-foreground/90">
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
            className="cursor-pointer"
          />
        </div>
      ))}
      {calcs.length > 0 ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {calcs.map((c) => (
            <div
              key={c.id}
              className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2"
            >
              <p className="text-[11px] text-muted-foreground">{c.label}</p>
              <p className="text-sm font-semibold text-foreground tabular-nums">
                {formatCalcValue(evaluateFormula(c.formula, vars), c.unit)}
              </p>
            </div>
          ))}
        </div>
      ) : null}
      {buttons.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {buttons.map((b) => (
            <Button
              key={b.id}
              type="button"
              variant={b.action === "animate" ? "default" : "outline"}
              size="sm"
              disabled={b.action === "animate" && animating}
              onClick={() => {
                if (b.action === "reset") onReset();
                else if (b.action === "animate" && onAnimate) onAnimate();
                else if (b.action === "animate") onAnimate?.();
                else onReset();
              }}
            >
              {b.label}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function FractionsViz({
  spec,
  values,
  onChange,
  onReset,
}: VizProps & {
  values: Record<string, number>;
  onChange: (id: string, v: number) => void;
  onReset: () => void;
}) {
  const num = values.numerator ?? values.num ?? 1;
  const den = Math.max(1, values.denominator ?? values.den ?? 4);
  const slices = Math.min(den, 12);
  const filled = Math.round((num / den) * slices);
  const colors = spec.colors ?? {};

  return (
    <div className="flex flex-col items-center gap-4">
      <svg viewBox="0 0 200 200" className="w-48 h-48 drop-shadow-sm">
        {Array.from({ length: slices }).map((_, i) => {
          const start = (i / slices) * 2 * Math.PI - Math.PI / 2;
          const end = ((i + 1) / slices) * 2 * Math.PI - Math.PI / 2;
          const x1 = 100 + 80 * Math.cos(start);
          const y1 = 100 + 80 * Math.sin(start);
          const x2 = 100 + 80 * Math.cos(end);
          const y2 = 100 + 80 * Math.sin(end);
          const large = end - start > Math.PI ? 1 : 0;
          const filledSlice = i < filled;
          return (
            <path
              key={i}
              d={`M 100 100 L ${x1} ${y1} A 80 80 0 ${large} 1 ${x2} ${y2} Z`}
              fill={filledSlice ? colors.primary ?? "#3B82F6" : colors.background ?? "#E2E8F0"}
              stroke={colors.text ?? "#64748B"}
              strokeWidth={1.5}
              className="transition-colors duration-300"
            />
          );
        })}
        <circle cx="100" cy="100" r="80" fill="none" stroke={colors.text ?? "#64748B"} strokeWidth={2} />
      </svg>
      <p className="text-sm font-medium text-foreground">
        {num}/{den} = {Math.round((num / den) * 100)}%
      </p>
      <VizControls spec={spec} values={values} onChange={onChange} onReset={onReset} />
    </div>
  );
}

function TurnCircleViz({
  spec,
  values,
  onChange,
  onReset,
  colors,
  vars,
  sliderId,
  quarters,
}: {
  spec: VisualizationSpec;
  values: Record<string, number>;
  onChange: (id: string, v: number) => void;
  onReset: () => void;
  colors: NonNullable<VisualizationSpec["colors"]>;
  vars: Record<string, number>;
  sliderId: string;
  quarters: number;
}) {
  const angleDeg = evaluateFormula("turnSlider * 90", { ...vars, turnSlider: quarters }) ?? quarters * 90;
  const cx = 110;
  const cy = 110;
  const radius = 80;
  const armRad = ((angleDeg - 90) * Math.PI) / 180;
  const armX = cx + radius * Math.cos(armRad);
  const armY = cy + radius * Math.sin(armRad);
  const [animating, setAnimating] = useState(false);
  const timerRef = useRef<number | null>(null);

  const runAnimation = useCallback(() => {
    if (animating) return;
    setAnimating(true);
    let step = 0;
    onChange(sliderId, 0);
    timerRef.current = window.setInterval(() => {
      step += 1;
      onChange(sliderId, step);
      if (step >= 4) {
        if (timerRef.current) window.clearInterval(timerRef.current);
        timerRef.current = null;
        setAnimating(false);
      }
    }, 900);
  }, [animating, onChange, sliderId]);

  useEffect(
    () => () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    },
    [],
  );

  const hasAnimateBtn = (spec.buttons ?? []).some((b) => b.action === "animate");

  return (
    <div className="flex flex-col items-center gap-4">
      <svg viewBox="0 0 220 220" className="w-52 h-52">
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill={`${colors.background ?? "#F8FAFC"}`}
          stroke={colors.primary ?? "#3B82F6"}
          strokeWidth={2}
        />
        {[0, 1, 2, 3].map((i) => {
          const rad = ((i * 90 - 90) * Math.PI) / 180;
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={cx + radius * Math.cos(rad)}
              y2={cy + radius * Math.sin(rad)}
              stroke={i === 2 ? colors.secondary ?? "#10B981" : "#CBD5E1"}
              strokeWidth={i === 2 ? 2 : 1}
              strokeDasharray={i === 2 ? undefined : "4 3"}
            />
          );
        })}
        {angleDeg > 0 ? (
          <path
            d={`M ${cx} ${cy} L ${cx} ${cy - radius} A ${radius} ${radius} 0 ${angleDeg > 180 ? 1 : 0} 1 ${armX} ${armY} Z`}
            fill={`${colors.secondary ?? "#10B981"}44`}
            stroke={colors.secondary ?? "#10B981"}
            strokeWidth={1.5}
            className="transition-all duration-700 ease-in-out"
          />
        ) : null}
        <line
          x1={cx}
          y1={cy}
          x2={armX}
          y2={armY}
          stroke={colors.accent ?? "#F59E0B"}
          strokeWidth={3}
          strokeLinecap="round"
          className="transition-all duration-700 ease-in-out"
        />
        <circle cx={cx} cy={cy} r={5} fill={colors.primary ?? "#3B82F6"} />
        <text x={cx} y={24} textAnchor="middle" className="fill-foreground text-[11px] font-medium">
          {quarters} quarter turn{quarters !== 1 ? "s" : ""} = {angleDeg}°
        </text>
        {quarters === 2 ? (
          <text x={cx} y={200} textAnchor="middle" className="fill-emerald-600 text-[10px] font-semibold">
            ✓ 2 quarter turns = 1 half turn (180°)
          </text>
        ) : null}
      </svg>
      <div className="grid grid-cols-2 gap-3 w-full max-w-xs text-center">
        <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
          <p className="text-[11px] text-muted-foreground">Total angle</p>
          <p className="text-sm font-semibold tabular-nums">{angleDeg}°</p>
        </div>
        <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
          <p className="text-[11px] text-muted-foreground">Turn type</p>
          <p className="text-sm font-semibold">
            {quarters === 0
              ? "Start"
              : quarters === 1
                ? "Quarter turn"
                : quarters === 2
                  ? "Half turn"
                  : quarters === 4
                    ? "Full turn"
                    : `${quarters} quarters`}
          </p>
        </div>
      </div>
      <VizControls
        spec={spec}
        values={values}
        onChange={onChange}
        onReset={onReset}
        onAnimate={runAnimation}
        animating={animating}
      />
      {!hasAnimateBtn ? (
        <Button type="button" size="sm" onClick={runAnimation} disabled={animating}>
          ▶ Animate Turns
        </Button>
      ) : null}
    </div>
  );
}

function CircleViz({
  spec,
  values,
  onChange,
  onReset,
}: VizProps & {
  values: Record<string, number>;
  onChange: (id: string, v: number) => void;
  onReset: () => void;
}) {
  const colors = spec.colors ?? {};
  const vars = buildVariableMap(values, {});

  const turnQuarters =
    values.turnSlider ??
    values.turn ??
    values.quarterTurns ??
    values.quarters ??
    null;
  const isTurnMode = turnQuarters !== null || (spec.sliders ?? []).some((s) =>
    /turn|quarter|angle/i.test(s.id + s.label),
  );

  if (isTurnMode) {
    const sliderId = spec.sliders?.[0]?.id ?? "turnSlider";
    const quarters =
      turnQuarters ??
      values[sliderId] ??
      spec.sliders?.[0]?.default ??
      0;
    return (
      <TurnCircleViz
        spec={spec}
        values={values}
        onChange={onChange}
        onReset={onReset}
        colors={colors}
        vars={vars}
        sliderId={sliderId}
        quarters={quarters}
      />
    );
  }

  const mathR = values.r ?? values.radius ?? 5;
  const displayR = Math.min(88, 14 + mathR * 7.5);
  const cx = 110;
  const cy = 110;
  const diameter = 2 * mathR;
  const dragging = useRef(false);

  const setRadiusFromPointer = useCallback(
    (clientX: number, clientY: number, rect: DOMRect) => {
      const sx = ((clientX - rect.left) / rect.width) * 220;
      const sy = ((clientY - rect.top) / rect.height) * 220;
      const dist = Math.hypot(sx - cx, sy - cy);
      const nextDisplay = Math.max(14, Math.min(88, dist));
      const nextR = Math.round((nextDisplay - 14) / 7.5);
      const slider = spec.sliders?.find((s) => s.id === "r" || s.id === "radius");
      const min = slider?.min ?? 1;
      const max = slider?.max ?? 10;
      onChange(slider?.id ?? "r", Math.max(min, Math.min(max, nextR)));
    },
    [cx, cy, onChange, spec.sliders],
  );

  return (
    <div className="flex flex-col items-center gap-4">
      <svg
        viewBox="0 0 220 220"
        className="w-56 h-56 touch-none select-none"
        onPointerMove={(e) => {
          if (!dragging.current) return;
          setRadiusFromPointer(e.clientX, e.clientY, e.currentTarget.getBoundingClientRect());
        }}
        onPointerUp={() => {
          dragging.current = false;
        }}
        onPointerLeave={() => {
          dragging.current = false;
        }}
      >
        <circle
          cx={cx}
          cy={cy}
          r={displayR}
          fill={`${colors.primary ?? "#3B82F6"}33`}
          stroke={colors.primary ?? "#3B82F6"}
          strokeWidth={2}
          className="transition-all duration-200"
        />
        <line
          x1={cx - displayR}
          y1={cy}
          x2={cx + displayR}
          y2={cy}
          stroke={colors.secondary ?? "#10B981"}
          strokeWidth={1.5}
          strokeDasharray="5 4"
          opacity={0.7}
        />
        <line
          x1={cx}
          y1={cy}
          x2={cx + displayR}
          y2={cy}
          stroke={colors.accent ?? "#F59E0B"}
          strokeWidth={2.5}
        />
        <circle cx={cx} cy={cy} r={4} fill={colors.primary ?? "#3B82F6"} />
        <circle
          cx={cx + displayR}
          cy={cy}
          r={9}
          fill={colors.accent ?? "#F59E0B"}
          stroke="#fff"
          strokeWidth={2}
          className="cursor-grab active:cursor-grabbing"
          onPointerDown={(e) => {
            dragging.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
        />
        <text x={cx + displayR / 2} y={cy - 10} textAnchor="middle" className="fill-foreground text-[11px] font-medium">
          r = {mathR}
        </text>
        <text x={cx} y={cy + displayR + 18} textAnchor="middle" className="fill-muted-foreground text-[10px]">
          d = {diameter}
        </text>
      </svg>
      <p className="text-xs text-center text-muted-foreground -mt-2">
        Drag the orange handle or use the slider below
      </p>
      <VizControls spec={spec} values={values} onChange={onChange} onReset={onReset} />
    </div>
  );
}

function CoordinateViz({ spec }: VizProps) {
  const draggables = spec.draggableObjects ?? [{ id: "p1", label: "Point A", initialX: 2, initialY: 3, color: "#3B82F6" }];
  const [points, setPoints] = useState(() =>
    Object.fromEntries(
      draggables.map((d) => [d.id, { x: d.initialX ?? 0, y: d.initialY ?? 0 }]),
    ),
  );
  const [dragging, setDragging] = useState<string | null>(null);
  const colors = spec.colors ?? {};

  const toSvg = (x: number, y: number) => ({
    sx: 30 + (x + 5) * 20,
    sy: 170 - (y + 5) * 20,
  });

  const handlePointer = useCallback(
    (id: string, clientX: number, clientY: number, rect: DOMRect) => {
      const sx = clientX - rect.left;
      const sy = clientY - rect.top;
      const x = Math.round((sx - 30) / 20 - 5);
      const y = Math.round((170 - sy) / 20 - 5);
      setPoints((prev) => ({ ...prev, [id]: { x: Math.max(-5, Math.min(5, x)), y: Math.max(-5, Math.min(5, y)) } }));
    },
    [],
  );

  return (
    <div className="flex flex-col items-center gap-3">
      <svg
        viewBox="0 0 240 200"
        className="w-full max-w-md h-52 rounded-xl border border-border/50 bg-background touch-none"
        onPointerMove={(e) => {
          if (!dragging) return;
          const rect = e.currentTarget.getBoundingClientRect();
          handlePointer(dragging, e.clientX, e.clientY, rect);
        }}
        onPointerUp={() => setDragging(null)}
        onPointerLeave={() => setDragging(null)}
      >
        {/* grid */}
        {Array.from({ length: 11 }).map((_, i) => (
          <g key={i}>
            <line x1={30 + i * 20} y1="10" x2={30 + i * 20} y2="190" stroke="#E2E8F0" strokeWidth={1} />
            <line x1="10" y1={10 + i * 18} x2="230" y2={10 + i * 18} stroke="#E2E8F0" strokeWidth={1} />
          </g>
        ))}
        <line x1="30" y1="100" x2="230" y2="100" stroke={colors.text ?? "#64748B"} strokeWidth={1.5} />
        <line x1="130" y1="10" x2="130" y2="190" stroke={colors.text ?? "#64748B"} strokeWidth={1.5} />
        {draggables.map((d) => {
          const p = points[d.id] ?? { x: 0, y: 0 };
          const { sx, sy } = toSvg(p.x, p.y);
          return (
            <g key={d.id}>
              <circle
                cx={sx}
                cy={sy}
                r={8}
                fill={d.color ?? colors.primary ?? "#3B82F6"}
                stroke="white"
                strokeWidth={2}
                className="cursor-grab active:cursor-grabbing"
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  setDragging(d.id);
                }}
              />
              <text x={sx + 12} y={sy - 8} className="fill-foreground text-[10px]">
                ({p.x}, {p.y})
              </text>
            </g>
          );
        })}
      </svg>
      <p className="text-xs text-muted-foreground">Drag the points to explore coordinates</p>
    </div>
  );
}

function ProbabilityViz({ spec }: VizProps) {
  const [dice, setDice] = useState(1);
  const [coin, setCoin] = useState<"heads" | "tails">("heads");
  const [spinAngle, setSpinAngle] = useState(0);
  const colors = spec.colors ?? {};
  const vType = spec.visualizationType.toLowerCase();

  const rollDice = () => setDice(Math.floor(Math.random() * 6) + 1);
  const flipCoin = () => setCoin(Math.random() < 0.5 ? "heads" : "tails");
  const spin = () => setSpinAngle((a) => a + 720 + Math.random() * 360);

  return (
    <div className="flex flex-col items-center gap-4">
      {vType.includes("dice") || vType === "probability" ? (
        <div
          className="w-20 h-20 rounded-xl border-2 flex items-center justify-center text-3xl font-bold shadow-md transition-transform"
          style={{ borderColor: colors.primary ?? "#3B82F6", background: colors.background ?? "#F8FAFC" }}
        >
          {["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"][dice - 1]}
        </div>
      ) : null}
      {vType.includes("coin") ? (
        <div
          className={cn(
            "w-20 h-20 rounded-full border-4 flex items-center justify-center text-sm font-bold transition-all duration-500",
            coin === "heads" ? "bg-amber-100 border-amber-400" : "bg-slate-200 border-slate-400",
          )}
        >
          {coin === "heads" ? "H" : "T"}
        </div>
      ) : null}
      {(vType.includes("spinner") || vType === "probability") && (
        <svg viewBox="0 0 120 120" className="w-28 h-28" style={{ transform: `rotate(${spinAngle}deg)`, transition: "transform 1s ease-out" }}>
          {[0, 1, 2, 3].map((i) => {
            const start = (i / 4) * 2 * Math.PI;
            const end = ((i + 1) / 4) * 2 * Math.PI;
            const x1 = 60 + 50 * Math.cos(start);
            const y1 = 60 + 50 * Math.sin(start);
            const x2 = 60 + 50 * Math.cos(end);
            const y2 = 60 + 50 * Math.sin(end);
            const palette = [colors.primary, colors.secondary, colors.accent, "#94A3B8"];
            return (
              <path
                key={i}
                d={`M 60 60 L ${x1} ${y1} A 50 50 0 0 1 ${x2} ${y2} Z`}
                fill={palette[i] ?? "#3B82F6"}
              />
            );
          })}
        </svg>
      )}
      <div className="flex flex-wrap gap-2 justify-center">
        {(spec.buttons ?? []).length > 0
          ? (spec.buttons ?? []).map((b) => (
              <Button
                key={b.id}
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  if (b.action === "flip") flipCoin();
                  else if (b.action === "roll") rollDice();
                  else if (b.action === "animate") spin();
                  else rollDice();
                }}
              >
                {b.label}
              </Button>
            ))
          : (
            <>
              <Button type="button" size="sm" variant="outline" onClick={rollDice}>Roll Dice</Button>
              <Button type="button" size="sm" variant="outline" onClick={flipCoin}>Flip Coin</Button>
              <Button type="button" size="sm" variant="outline" onClick={spin}>Spin</Button>
            </>
          )}
      </div>
    </div>
  );
}

function GraphViz({
  spec,
  values,
  onChange,
  onReset,
}: VizProps & {
  values: Record<string, number>;
  onChange: (id: string, v: number) => void;
  onReset: () => void;
}) {
  const a = values.a ?? values.coefficient ?? 1;
  const b = values.b ?? 0;
  const c = values.c ?? 0;
  const width = 280;
  const height = 180;
  const points: string[] = [];
  for (let px = 0; px <= width; px += 4) {
    const x = (px / width) * 10 - 5;
    const y = a * x * x + b * x + c;
    const sy = height / 2 - y * 8;
    if (sy >= 0 && sy <= height) points.push(`${px},${sy}`);
  }

  return (
    <div className="space-y-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-md h-44 rounded-xl border border-border/50 bg-background">
        <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="#CBD5E1" />
        <line x1={width / 2} y1="0" x2={width / 2} y2={height} stroke="#CBD5E1" />
        {points.length > 1 ? (
          <polyline points={points.join(" ")} fill="none" stroke={spec.colors?.primary ?? "#3B82F6"} strokeWidth={2.5} />
        ) : null}
      </svg>
      <VizControls spec={spec} values={values} onChange={onChange} onReset={onReset} />
    </div>
  );
}

function GenericViz({ spec, values, onChange, onReset }: VizProps & {
  values: Record<string, number>;
  onChange: (id: string, v: number) => void;
  onReset: () => void;
}) {
  const draggables = spec.draggableObjects ?? [];
  const [dragPos] = useState(() =>
    Object.fromEntries(draggables.map((d) => [d.id, { x: d.initialX ?? 50, y: d.initialY ?? 50 }])),
  );

  return (
    <div className="space-y-4">
      {draggables.length > 0 ? (
        <svg viewBox="0 0 300 160" className="w-full h-40 rounded-xl border border-border/50 bg-muted/20">
          {draggables.map((d) => {
            const p = dragPos[d.id] ?? { x: 50, y: 50 };
            return (
              <circle
                key={d.id}
                cx={p.x * 2.5}
                cy={p.y * 1.2}
                r={10}
                fill={d.color ?? spec.colors?.primary ?? "#3B82F6"}
                className="cursor-grab"
                onPointerDown={() => {}}
              />
            );
          })}
        </svg>
      ) : null}
      <VizControls spec={spec} values={values} onChange={onChange} onReset={onReset} />
      {(spec.studentInteractions ?? []).length > 0 ? (
        <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
          {spec.studentInteractions!.map((s) => (
            <li key={s.id}>{s.description}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function MathInteractiveVisualization({ spec }: VizProps) {
  const sliders = spec.sliders ?? [];
  const initial = useMemo(() => defaultSliderValues(sliders), [sliders]);
  const [values, setValues] = useState(initial);

  const onChange = useCallback((id: string, v: number) => {
    setValues((prev) => ({ ...prev, [id]: v }));
  }, []);

  const onReset = useCallback(() => {
    setValues(defaultSliderValues(sliders));
  }, [sliders]);

  const vType = (spec.visualizationType ?? "generic").toLowerCase();

  if (isTopicVisualizationType(vType)) {
    return (
      <div
        className="rounded-xl border border-primary/25 bg-gradient-to-b from-primary/5 to-background p-4 sm:p-5"
        data-viz-type={vType}
      >
        <h4 className="text-sm font-semibold text-foreground mb-1">{spec.title}</h4>
        {spec.description ? (
          <p className="text-xs text-muted-foreground mb-4 leading-relaxed">{spec.description}</p>
        ) : null}
        <TopicVisualization spec={spec} />
      </div>
    );
  }

  let body: React.ReactNode;
  const shared = { spec, values, onChange, onReset };
  if (vType.includes("fraction")) {
    body = <FractionsViz {...shared} />;
  } else if (vType.includes("circle") && !vType.includes("tangent")) {
    body = <CircleViz {...shared} />;
  } else if (vType.includes("coordinate") || vType.includes("graph-point")) {
    body = <CoordinateViz spec={spec} />;
  } else if (vType === "graph" || (vType.includes("graph") && !vType.includes("linear"))) {
    body = <GraphViz {...shared} />;
  } else if (vType.includes("prob") || vType.includes("spinner")) {
    body = <ProbabilityViz spec={spec} />;
  } else {
    body = <GenericViz {...shared} />;
  }

  return (
    <div
      className="rounded-xl border border-primary/25 bg-gradient-to-b from-primary/5 to-background p-4 sm:p-5"
      data-viz-type={vType}
    >
      <h4 className="text-sm font-semibold text-foreground mb-1">{spec.title}</h4>
      {spec.description ? (
        <p className="text-xs text-muted-foreground mb-4 leading-relaxed">{spec.description}</p>
      ) : null}
      {body}
    </div>
  );
}
