/**
 * Geometry shape builders, area/volume models and data / probability charts.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { VisualizationSpec } from "@/types/math-lesson";
import { SliderPanel, type TopicVizProps } from "./topic-viz-shared";
import { ControlPoint } from "./control-point";
import { SIGNATURE } from "./design-tokens";
import { fmtNum } from "./graph-paper";

type Pt = { x: number; y: number };

const HALO = { stroke: "white", strokeWidth: 3, paintOrder: "stroke" } as const;
const CARD = "w-full max-w-md mx-auto h-auto rounded-xl border bg-white touch-none select-none";

const dist = (p: Pt, q: Pt) => Math.hypot(p.x - q.x, p.y - q.y);
const unit = (p: Pt, q: Pt): Pt => {
  const d = dist(p, q) || 1;
  return { x: (q.x - p.x) / d, y: (q.y - p.y) / d };
};
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const snap10 = (v: number, lo: number, hi: number) => Math.round(clamp(v, lo, hi) / 10) * 10;

function toSvg(svg: SVGSVGElement, clientX: number, clientY: number): Pt {
  const m = svg.getScreenCTM();
  if (!m) return { x: 0, y: 0 };
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const p = pt.matrixTransform(m.inverse());
  return { x: p.x, y: p.y };
}

function startDrag(e: React.PointerEvent, onMove: (p: Pt) => void) {
  e.stopPropagation();
  const svg = (e.target as Element).closest("svg") as SVGSVGElement | null;
  if (!svg) return;
  const move = (ev: PointerEvent) => onMove(toSvg(svg, ev.clientX, ev.clientY));
  const up = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
}

/** Angle at p between rays p→q and p→r, in degrees (0–180). */
function angleAt(p: Pt, q: Pt, r: Pt) {
  const u = unit(p, q);
  const w = unit(p, r);
  return (Math.acos(clamp(u.x * w.x + u.y * w.y, -1, 1)) * 180) / Math.PI;
}

/** Filled wedge for the smaller angle at p between rays to q and r. */
function arcWedge(p: Pt, q: Pt, r: Pt, rad: number) {
  const a1 = Math.atan2(q.y - p.y, q.x - p.x);
  let d = Math.atan2(r.y - p.y, r.x - p.x) - a1;
  while (d <= -Math.PI) d += 2 * Math.PI;
  while (d > Math.PI) d -= 2 * Math.PI;
  const s = { x: p.x + rad * Math.cos(a1), y: p.y + rad * Math.sin(a1) };
  const e = { x: p.x + rad * Math.cos(a1 + d), y: p.y + rad * Math.sin(a1 + d) };
  return `M ${p.x} ${p.y} L ${s.x} ${s.y} A ${rad} ${rad} 0 0 ${d > 0 ? 1 : 0} ${e.x} ${e.y} Z`;
}

function bisector(p: Pt, q: Pt, r: Pt, rad: number, flip = false): Pt {
  const u = unit(p, q);
  const w = unit(p, r);
  let b = { x: u.x + w.x, y: u.y + w.y };
  const len = Math.hypot(b.x, b.y);
  b = len < 1e-6 ? { x: -u.y, y: u.x } : { x: b.x / len, y: b.y / len };
  const k = flip ? -1 : 1;
  return { x: p.x + b.x * rad * k, y: p.y + b.y * rad * k };
}

function RightMark({ p, q, r, size = 10, color }: { p: Pt; q: Pt; r: Pt; size?: number; color: string }) {
  const u = unit(p, q);
  const w = unit(p, r);
  const a = { x: p.x + u.x * size, y: p.y + u.y * size };
  const b = { x: a.x + w.x * size, y: a.y + w.y * size };
  const c = { x: p.x + w.x * size, y: p.y + w.y * size };
  return (
    <polyline points={`${a.x},${a.y} ${b.x},${b.y} ${c.x},${c.y}`} fill={`${color}22`} stroke={color} strokeWidth={1.5} />
  );
}

function awayFrom(p: Pt, g: Pt, d: number): Pt {
  const u = unit(g, p);
  return { x: p.x + u.x * d, y: p.y + u.y * d };
}

/** Text placement just outside side pq (away from the shape centre g). */
function sideLabelPos(p: Pt, q: Pt, g: Pt, gap = 8): { x: number; y: number; anchor: "start" | "middle" | "end" } {
  const u = unit(p, q);
  let n = { x: -u.y, y: u.x };
  const m = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
  if (n.x * (m.x - g.x) + n.y * (m.y - g.y) < 0) n = { x: -n.x, y: -n.y };
  const anchor = n.x > 0.35 ? "start" : n.x < -0.35 ? "end" : "middle";
  return { x: m.x + n.x * gap, y: m.y + n.y * gap + (n.y > 0.35 ? 8 : n.y < -0.35 ? -2 : 4), anchor };
}

/** Small perpendicular tick(s) at the midpoint of a side — marks equal sides. */
function EqualTick({ p, q, count, color }: { p: Pt; q: Pt; count: number; color: string }) {
  const u = unit(p, q);
  const n = { x: -u.y, y: u.x };
  const m = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
  return (
    <g stroke={color} strokeWidth={1.6}>
      {Array.from({ length: count }).map((_, i) => {
        const off = (i - (count - 1) / 2) * 4;
        const c = { x: m.x + u.x * off, y: m.y + u.y * off };
        return <line key={i} x1={c.x - n.x * 5} y1={c.y - n.y * 5} x2={c.x + n.x * 5} y2={c.y + n.y * 5} />;
      })}
    </g>
  );
}

function GridDots({ w, h, step = 20 }: { w: number; h: number; step?: number }) {
  return (
    <g stroke="#EEF2F7" strokeWidth={1}>
      {Array.from({ length: Math.floor(w / step) + 1 }).map((_, i) => (
        <line key={`v${i}`} x1={i * step} y1={0} x2={i * step} y2={h} />
      ))}
      {Array.from({ length: Math.floor(h / step) + 1 }).map((_, i) => (
        <line key={`h${i}`} x1={0} y1={i * step} x2={w} y2={i * step} />
      ))}
    </g>
  );
}

const UNIT_PX = 20;
const lenLabel = (px: number) => fmtNum(Math.round((px / UNIT_PX) * 10) / 10);

/* ───────────────────────────── Triangle builder ───────────────────────────── */

type TriKey = "A" | "B" | "C";
const TRI_W = 300;
const TRI_H = 220;
const TRI_PRESETS: Record<string, { label: string; pts: Record<TriKey, Pt> }> = {
  scalene: { label: "Scalene", pts: { A: { x: 120, y: 50 }, B: { x: 60, y: 180 }, C: { x: 240, y: 170 } } },
  isosceles: { label: "Isosceles", pts: { A: { x: 150, y: 40 }, B: { x: 90, y: 180 }, C: { x: 210, y: 180 } } },
  equilateral: { label: "Equilateral", pts: { A: { x: 150, y: 42 }, B: { x: 70, y: 180 }, C: { x: 230, y: 180 } } },
  right: { label: "Right-angled", pts: { A: { x: 70, y: 60 }, B: { x: 70, y: 180 }, C: { x: 230, y: 180 } } },
  obtuse: { label: "Obtuse", pts: { A: { x: 110, y: 130 }, B: { x: 50, y: 180 }, C: { x: 250, y: 180 } } },
};
const ANGLE_COLORS: Record<TriKey, string> = { A: SIGNATURE.red, B: SIGNATURE.green, C: SIGNATURE.purple };

export function TriangleExplorerViz(_props: TopicVizProps) {
  const [pts, setPts] = useState<Record<TriKey, Pt>>(TRI_PRESETS.scalene.pts);
  const [active, setActive] = useState<TriKey | null>(null);
  const { A, B, C } = pts;
  const G = { x: (A.x + B.x + C.x) / 3, y: (A.y + B.y + C.y) / 3 };
  const area2 = Math.abs((B.x - A.x) * (C.y - A.y) - (C.x - A.x) * (B.y - A.y));
  const flat = area2 < 400;

  const sides = { AB: dist(A, B), BC: dist(B, C), CA: dist(C, A) };
  const eq = (x: number, y: number) => Math.abs(x - y) < 3;
  const equalPairs = [eq(sides.AB, sides.BC), eq(sides.BC, sides.CA), eq(sides.CA, sides.AB)].filter(Boolean).length;
  const sideType =
    equalPairs === 3
      ? "Equilateral: all three sides are equal"
      : equalPairs >= 1
        ? "Isosceles: two sides are equal"
        : "Scalene: all three sides are different";

  const angA = angleAt(A, B, C);
  const angB = angleAt(B, C, A);
  const angC = 180 - angA - angB;
  const rA = Math.round(angA);
  const rB = Math.round(angB);
  const rC = 180 - rA - rB;
  const rounded: Record<TriKey, number> = { A: rA, B: rB, C: rC };
  const biggest = Math.max(angA, angB, angC);
  const angleType =
    Math.abs(biggest - 90) < 0.6
      ? "Right-angled: one angle is exactly 90°"
      : biggest > 90
        ? "Obtuse: one angle is more than 90°"
        : "Acute: every angle is less than 90°";

  const hasTwin = (s: number) => Object.values(sides).filter((o) => eq(o, s)).length > 1;

  const verts: [TriKey, Pt, Pt, Pt][] = [
    ["A", A, B, C],
    ["B", B, C, A],
    ["C", C, A, B],
  ];
  const sideList: [string, Pt, Pt, number][] = [
    ["AB", A, B, sides.AB],
    ["BC", B, C, sides.BC],
    ["CA", C, A, sides.CA],
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5 justify-center">
        {Object.entries(TRI_PRESETS).map(([k, v]) => (
          <Button key={k} type="button" size="sm" variant="outline" onClick={() => setPts(v.pts)}>
            {v.label}
          </Button>
        ))}
      </div>
      <svg viewBox={`0 0 ${TRI_W} ${TRI_H}`} className={CARD}>
        <GridDots w={TRI_W} h={TRI_H} />
        <polygon
          points={`${A.x},${A.y} ${B.x},${B.y} ${C.x},${C.y}`}
          fill={`${SIGNATURE.blue}1A`}
          stroke={SIGNATURE.blue}
          strokeWidth={2.2}
          strokeLinejoin="round"
        />
        {!flat
          ? verts.map(([k, p, q, r]) => {
              const col = ANGLE_COLORS[k];
              const ang = angleAt(p, q, r);
              const lab = bisector(p, q, r, ang < 40 ? 40 : 30);
              return (
                <g key={`ang${k}`}>
                  {Math.abs(ang - 90) < 0.6 ? (
                    <RightMark p={p} q={q} r={r} size={12} color={col} />
                  ) : (
                    <path d={arcWedge(p, q, r, 18)} fill={`${col}33`} stroke={col} strokeWidth={1.4} />
                  )}
                  <text x={lab.x} y={lab.y + 4} textAnchor="middle" fontSize={11} fontWeight={700} fill={col} {...HALO}>
                    {rounded[k]}°
                  </text>
                </g>
              );
            })
          : null}
        {sideList.map(([name, p, q, len]) => {
          const at = sideLabelPos(p, q, G);
          return (
            <g key={name}>
              {hasTwin(len) ? <EqualTick p={p} q={q} count={1} color={SIGNATURE.blue} /> : null}
              <text x={at.x} y={at.y} textAnchor={at.anchor} fontSize={10} fontWeight={600} fill="#334155" {...HALO}>
                {name} = {lenLabel(len)}
              </text>
            </g>
          );
        })}
        {verts.map(([k, p]) => {
          const at = awayFrom(p, G, 17);
          return (
            <text key={`lab${k}`} x={at.x} y={at.y + 5} textAnchor="middle" fontSize={14} fontWeight={800} fill="#0F172A" {...HALO}>
              {k}
            </text>
          );
        })}
        {verts.map(([k, p]) => (
          <ControlPoint
            key={`cp${k}`}
            cx={p.x}
            cy={p.y}
            active={active === k}
            onPointerDown={(e) => {
              setActive(k);
              startDrag(e, (pt) =>
                setPts((prev) => ({ ...prev, [k]: { x: snap10(pt.x, 20, TRI_W - 20), y: snap10(pt.y, 20, TRI_H - 20) } })),
              );
            }}
          />
        ))}
      </svg>
      <p className="text-[11px] text-center text-muted-foreground">
        Drag the orange corners. Side lengths are in grid squares (1 square = 1 unit).
      </p>
      {flat ? (
        <p className="text-sm text-center font-semibold" style={{ color: SIGNATURE.red }}>
          The three corners are (almost) in a straight line, so this is not a triangle. Pull one corner away.
        </p>
      ) : (
        <div className="space-y-2 text-center">
          <div className="flex flex-wrap justify-center gap-2 text-xs">
            <span className="rounded-full border px-2.5 py-1 bg-slate-50">
              <b>By sides:</b> {sideType}
            </span>
            <span className="rounded-full border px-2.5 py-1 bg-slate-50">
              <b>By angles:</b> {angleType}
            </span>
          </div>
          <p className="text-sm font-semibold tabular-nums">
            <span style={{ color: ANGLE_COLORS.A }}>∠A</span> + <span style={{ color: ANGLE_COLORS.B }}>∠B</span> +{" "}
            <span style={{ color: ANGLE_COLORS.C }}>∠C</span> = {rA}° + {rB}° + {rC}° = 180°
          </p>
          <p className="text-xs text-muted-foreground">
            However you drag the corners, the three angles always add up to 180°. The longest side is always opposite the
            biggest angle.
          </p>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── Quadrilateral explorer ─────────────────────────── */

const QUAD_W = 300;
const QUAD_H = 210;
const QUAD_NAMES = ["A", "B", "C", "D"] as const;
const QUAD_PRESETS: Record<string, Pt[]> = {
  Square: [
    { x: 90, y: 40 },
    { x: 210, y: 40 },
    { x: 210, y: 160 },
    { x: 90, y: 160 },
  ],
  Rectangle: [
    { x: 50, y: 50 },
    { x: 250, y: 50 },
    { x: 250, y: 150 },
    { x: 50, y: 150 },
  ],
  Rhombus: [
    { x: 150, y: 40 },
    { x: 195, y: 100 },
    { x: 150, y: 160 },
    { x: 105, y: 100 },
  ],
  Parallelogram: [
    { x: 90, y: 50 },
    { x: 250, y: 50 },
    { x: 210, y: 150 },
    { x: 50, y: 150 },
  ],
  Trapezium: [
    { x: 100, y: 50 },
    { x: 200, y: 50 },
    { x: 250, y: 150 },
    { x: 50, y: 150 },
  ],
  Kite: [
    { x: 150, y: 30 },
    { x: 210, y: 90 },
    { x: 150, y: 180 },
    { x: 90, y: 90 },
  ],
};

const QUAD_WHY: Record<string, string> = {
  Square: "4 equal sides and 4 right angles.",
  Rectangle: "Both pairs of opposite sides are parallel and all 4 angles are 90°.",
  Rhombus: "All 4 sides are equal (opposite sides are parallel too).",
  Parallelogram: "Both pairs of opposite sides are parallel (and equal).",
  Trapezium: "Exactly one pair of opposite sides is parallel.",
  Kite: "Two pairs of equal sides that sit next to each other.",
  Quadrilateral: "4 sides, but no equal sides or parallel sides that give it a special name.",
  Concave: "One inside angle is more than 180°, so the shape caves in.",
};

function segmentsCross(p1: Pt, p2: Pt, p3: Pt, p4: Pt) {
  const o = (a: Pt, b: Pt, c: Pt) => Math.sign((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x));
  return o(p1, p2, p3) * o(p1, p2, p4) < 0 && o(p3, p4, p1) * o(p3, p4, p2) < 0;
}

export function QuadrilateralMorphViz(_props: TopicVizProps) {
  const [P, setP] = useState<Pt[]>(QUAD_PRESETS.Trapezium);
  const [active, setActive] = useState<number | null>(null);
  const G = { x: P.reduce((s, p) => s + p.x, 0) / 4, y: P.reduce((s, p) => s + p.y, 0) / 4 };
  const next = (i: number) => P[(i + 1) % 4];
  const prev = (i: number) => P[(i + 3) % 4];
  const sides = P.map((p, i) => dist(p, next(i)));
  const eq = (a: number, b: number) => Math.abs(a - b) < 3;
  const vec = (i: number) => ({ x: next(i).x - P[i].x, y: next(i).y - P[i].y });
  const parallel = (i: number, j: number) => {
    const a = vec(i);
    const b = vec(j);
    return Math.abs(a.x * b.y - a.y * b.x) / ((Math.hypot(a.x, a.y) || 1) * (Math.hypot(b.x, b.y) || 1)) < 0.02;
  };
  const crossed = segmentsCross(P[0], P[1], P[2], P[3]) || segmentsCross(P[1], P[2], P[3], P[0]);
  const orient = Math.sign(P.reduce((s, p, i) => s + (p.x * next(i).y - next(i).x * p.y), 0));
  const interior = P.map((p, i) => {
    const base = angleAt(p, prev(i), next(i));
    const e1 = { x: p.x - prev(i).x, y: p.y - prev(i).y };
    const e2 = vec(i);
    const turn = Math.sign(e1.x * e2.y - e1.y * e2.x);
    return turn === orient || turn === 0 ? base : 360 - base;
  });
  const roundedAngles = interior.map((a) => Math.round(a));
  roundedAngles[3] = 360 - roundedAngles[0] - roundedAngles[1] - roundedAngles[2];

  const abDc = parallel(0, 2);
  const adBc = parallel(1, 3);
  const allEqual = sides.every((s) => eq(s, sides[0]));
  const allRight = interior.every((a) => Math.abs(a - 90) < 0.6);
  const kite = (eq(sides[0], sides[1]) && eq(sides[2], sides[3])) || (eq(sides[1], sides[2]) && eq(sides[3], sides[0]));
  const concave = interior.some((a) => a > 180.5);
  const name = concave
    ? "Concave"
    : allEqual && allRight
      ? "Square"
      : abDc && adBc && allRight
        ? "Rectangle"
        : allEqual
          ? "Rhombus"
          : abDc && adBc
            ? "Parallelogram"
            : abDc || adBc
              ? "Trapezium"
              : kite
                ? "Kite"
                : "Quadrilateral";
  const title = name === "Concave" ? "Concave quadrilateral" : name === "Quadrilateral" ? "General quadrilateral" : name;

  const parColor = (i: number) => {
    if ((i === 0 || i === 2) && abDc) return SIGNATURE.blue;
    if ((i === 1 || i === 3) && adBc) return SIGNATURE.green;
    return "#475569";
  };
  const arrowCount = (i: number) => ((i === 0 || i === 2) && abDc ? 1 : (i === 1 || i === 3) && adBc ? 2 : 0);

  const check = (ok: boolean, text: string) => (
    <span
      className={`rounded-full border px-2 py-0.5 ${ok ? "bg-emerald-50 border-emerald-300 text-emerald-700" : "bg-slate-50 text-slate-500"}`}
    >
      {ok ? "✓" : "✗"} {text}
    </span>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5 justify-center">
        {Object.keys(QUAD_PRESETS).map((k) => (
          <Button key={k} type="button" size="sm" variant={name === k ? "default" : "outline"} onClick={() => setP(QUAD_PRESETS[k])}>
            {k}
          </Button>
        ))}
      </div>
      <svg viewBox={`0 0 ${QUAD_W} ${QUAD_H}`} className={CARD}>
        <GridDots w={QUAD_W} h={QUAD_H} />
        <polygon
          points={P.map((p) => `${p.x},${p.y}`).join(" ")}
          fill={crossed ? `${SIGNATURE.red}14` : `${SIGNATURE.blue}14`}
          stroke="none"
        />
        {P.map((p, i) => {
          const q = next(i);
          const col = parColor(i);
          const n = arrowCount(i);
          const u = i >= 2 ? unit(q, p) : unit(p, q);
          const m = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
          const lab = sideLabelPos(p, q, G);
          return (
            <g key={`s${i}`}>
              <line x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke={col} strokeWidth={2.4} strokeLinecap="round" />
              {Array.from({ length: n }).map((_, k) => {
                const c = { x: m.x + u.x * (k * 6 - (n - 1) * 3), y: m.y + u.y * (k * 6 - (n - 1) * 3) };
                const nx = -u.y;
                const ny = u.x;
                return (
                  <polyline
                    key={k}
                    points={`${c.x - u.x * 5 + nx * 4},${c.y - u.y * 5 + ny * 4} ${c.x},${c.y} ${c.x - u.x * 5 - nx * 4},${c.y - u.y * 5 - ny * 4}`}
                    fill="none"
                    stroke={col}
                    strokeWidth={1.8}
                  />
                );
              })}
              {!crossed ? (
                <text x={lab.x} y={lab.y} textAnchor={lab.anchor} fontSize={9.5} fontWeight={600} fill="#334155" {...HALO}>
                  {QUAD_NAMES[i]}
                  {QUAD_NAMES[(i + 1) % 4]} = {lenLabel(sides[i])}
                </text>
              ) : null}
            </g>
          );
        })}
        {!crossed
          ? P.map((p, i) => {
              const ang = interior[i];
              const reflex = ang > 180.5;
              const lab = bisector(p, prev(i), next(i), 26, reflex);
              return (
                <g key={`a${i}`}>
                  {Math.abs(ang - 90) < 0.6 ? (
                    <RightMark p={p} q={prev(i)} r={next(i)} size={10} color={SIGNATURE.orange} />
                  ) : !reflex ? (
                    <path d={arcWedge(p, prev(i), next(i), 14)} fill={`${SIGNATURE.orange}33`} stroke={SIGNATURE.orange} strokeWidth={1.2} />
                  ) : null}
                  <text x={lab.x} y={lab.y + 4} textAnchor="middle" fontSize={9.5} fontWeight={700} fill="#B45309" {...HALO}>
                    {roundedAngles[i]}°
                  </text>
                </g>
              );
            })
          : null}
        {P.map((p, i) => {
          const at = awayFrom(p, G, 16);
          return (
            <text key={`n${i}`} x={at.x} y={at.y + 5} textAnchor="middle" fontSize={13} fontWeight={800} fill="#0F172A" {...HALO}>
              {QUAD_NAMES[i]}
            </text>
          );
        })}
        {P.map((p, i) => (
          <ControlPoint
            key={`cp${i}`}
            cx={p.x}
            cy={p.y}
            active={active === i}
            onPointerDown={(e) => {
              setActive(i);
              startDrag(e, (pt) =>
                setP((old) =>
                  old.map((o, j) => (j === i ? { x: snap10(pt.x, 20, QUAD_W - 20), y: snap10(pt.y, 20, QUAD_H - 20) } : o)),
                ),
              );
            }}
          />
        ))}
      </svg>
      {crossed ? (
        <p className="text-sm text-center font-semibold" style={{ color: SIGNATURE.red }}>
          The sides cross each other, so this is not a quadrilateral. Drag a corner back.
        </p>
      ) : (
        <div className="text-center space-y-2">
          <p className="text-base font-bold" style={{ color: SIGNATURE.blue }}>
            This is a {title}
          </p>
          <p className="text-xs">{QUAD_WHY[name]}</p>
          <div className="flex flex-wrap justify-center gap-1.5 text-[11px]">
            {check(abDc, "AB ∥ DC")}
            {check(adBc, "AD ∥ BC")}
            {check(allEqual, "all sides equal")}
            {check(allRight, "all angles 90°")}
          </div>
          <p className="text-xs tabular-nums text-muted-foreground">
            ∠A + ∠B + ∠C + ∠D = {roundedAngles.map((a) => `${a}°`).join(" + ")} = 360°. Matching arrows mark parallel sides.
          </p>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────── Bar chart ─────────────────────────────── */

function niceStep(raw: number) {
  const p = Math.pow(10, Math.floor(Math.log10(Math.max(raw, 1e-9))));
  const f = raw / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
}

function BarsChart({
  bars,
  yMax,
  refLine,
  yTitle,
  xTitle,
  valueText,
  color = SIGNATURE.blue,
}: {
  bars: { label: string; value: number; highlight?: boolean }[];
  yMax: number;
  refLine?: { value: number; label: string; color?: string };
  yTitle: string;
  xTitle: string;
  valueText: (v: number, i: number) => string;
  color?: string;
}) {
  const W = 320;
  const H = 180;
  const L = 40;
  const R = refLine ? 58 : 12;
  const T = 16;
  const B = 34;
  const step = niceStep(yMax / 4);
  const top = Math.ceil(yMax / step) * step || 1;
  const Y = (v: number) => T + (H - T - B) * (1 - v / top);
  const slot = (W - L - R) / Math.max(1, bars.length);
  const bw = Math.min(34, slot * 0.66);
  const refCol = refLine?.color ?? SIGNATURE.red;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-md mx-auto h-auto">
      {Array.from({ length: Math.round(top / step) + 1 }).map((_, i) => {
        const v = i * step;
        return (
          <g key={i}>
            <line x1={L} y1={Y(v)} x2={W - R} y2={Y(v)} stroke="#EEF2F7" />
            <text x={L - 4} y={Y(v) + 3} textAnchor="end" fontSize={8} fill="#64748B">
              {fmtNum(v)}
            </text>
          </g>
        );
      })}
      <line x1={L} y1={T - 4} x2={L} y2={Y(0)} stroke="#334155" />
      <line x1={L} y1={Y(0)} x2={W - R} y2={Y(0)} stroke="#334155" />
      {bars.map((b, i) => {
        const x = L + slot * i + (slot - bw) / 2;
        return (
          <g key={i}>
            <rect
              x={x}
              y={Y(b.value)}
              width={bw}
              height={Math.max(0, Y(0) - Y(b.value))}
              rx={2}
              fill={b.highlight ? SIGNATURE.orange : color}
              opacity={0.85}
            />
            <text x={x + bw / 2} y={Y(b.value) - 3} textAnchor="middle" fontSize={8} fontWeight={700} fill="#1E293B">
              {valueText(b.value, i)}
            </text>
            <text x={x + bw / 2} y={Y(0) + 11} textAnchor="middle" fontSize={8.5} fill="#334155">
              {b.label}
            </text>
          </g>
        );
      })}
      {refLine ? (
        <g>
          <line x1={L} y1={Y(refLine.value)} x2={W - R} y2={Y(refLine.value)} stroke={refCol} strokeWidth={1.5} strokeDasharray="5 3" />
          {refLine.label.split("\n").map((ln, k, arr) => (
            <text
              key={k}
              x={W - R + 4}
              y={Y(refLine.value) + 3 + (k - (arr.length - 1) / 2) * 10}
              fontSize={8.5}
              fontWeight={700}
              fill={refCol}
            >
              {ln}
            </text>
          ))}
        </g>
      ) : null}
      <text x={(L + W - R) / 2} y={H - 4} textAnchor="middle" fontSize={9} fontWeight={600} fill="#475569">
        {xTitle}
      </text>
      <text
        x={10}
        y={(T + Y(0)) / 2}
        textAnchor="middle"
        fontSize={9}
        fontWeight={600}
        fill="#475569"
        transform={`rotate(-90 10 ${(T + Y(0)) / 2})`}
      >
        {yTitle}
      </text>
    </svg>
  );
}

/* ─────────────────────────────── Statistics ─────────────────────────────── */

const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
};

export function StatisticsLabViz(_props: TopicVizProps) {
  const [data, setData] = useState([12, 15, 18, 14, 16, 20, 13]);
  const n = data.length;
  const sum = data.reduce((a, b) => a + b, 0);
  const mean = sum / n;
  const sorted = [...data].sort((a, b) => a - b);
  const odd = n % 2 === 1;
  const midIdx = odd ? [(n - 1) / 2] : [n / 2 - 1, n / 2];
  const median = odd ? sorted[midIdx[0]] : (sorted[midIdx[0]] + sorted[midIdx[1]]) / 2;
  const freq = new Map<number, number>();
  data.forEach((v) => freq.set(v, (freq.get(v) ?? 0) + 1));
  const maxF = Math.max(...freq.values());
  const modes = maxF > 1 ? [...freq.entries()].filter(([, f]) => f === maxF).map(([v]) => v).sort((a, b) => a - b) : [];
  const r1 = (v: number) => fmtNum(Math.round(v * 10) / 10);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium mb-1.5">Marks of each student (type to change):</p>
        <div className="flex flex-wrap gap-2 items-end">
          {data.map((v, i) => (
            <label key={i} className="flex flex-col items-center gap-0.5">
              <span className="text-[10px] text-muted-foreground">S{i + 1}</span>
              <Input
                type="number"
                inputMode="numeric"
                className="w-16 h-9 text-sm text-center px-1"
                value={v}
                onChange={(e) => {
                  const num = Number(e.target.value);
                  if (!Number.isFinite(num)) return;
                  setData((d) => d.map((x, j) => (j === i ? Math.max(0, num) : x)));
                }}
              />
            </label>
          ))}
          <Button type="button" size="sm" variant="outline" disabled={n >= 12} onClick={() => setData((d) => [...d, 15])}>
            + Add
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={n <= 2} onClick={() => setData((d) => d.slice(0, -1))}>
            − Remove
          </Button>
        </div>
      </div>

      <BarsChart
        bars={data.map((v, i) => ({ label: `S${i + 1}`, value: v, highlight: modes.includes(v) }))}
        yMax={Math.max(...data, 1) * 1.1}
        refLine={{ value: mean, label: `mean\n= ${r1(mean)}` }}
        yTitle="Marks"
        xTitle="Student"
        valueText={(v) => fmtNum(v)}
      />

      <div className="grid gap-2 sm:grid-cols-3 text-xs">
        <div className="rounded-lg border p-2.5 space-y-1">
          <p className="font-semibold" style={{ color: SIGNATURE.red }}>
            Mean (average) = {r1(mean)}
          </p>
          <p className="text-muted-foreground break-words">
            Add all marks, then divide by how many: ({data.join(" + ")}) ÷ {n} = {fmtNum(sum)} ÷ {n} = {r1(mean)}
          </p>
        </div>
        <div className="rounded-lg border p-2.5 space-y-1">
          <p className="font-semibold">Median (middle) = {fmtNum(median)}</p>
          <div className="flex flex-wrap gap-1">
            {sorted.map((v, i) => (
              <span
                key={i}
                className={`rounded px-1.5 py-0.5 tabular-nums ${midIdx.includes(i) ? "bg-amber-100 text-amber-800 font-bold" : "bg-slate-100"}`}
              >
                {v}
              </span>
            ))}
          </div>
          <p className="text-muted-foreground">
            {odd
              ? `Put them in order. ${n} values, so the middle one is the ${ordinal(midIdx[0] + 1)}.`
              : `Put them in order. ${n} values has two middle ones: (${sorted[midIdx[0]]} + ${sorted[midIdx[1]]}) ÷ 2 = ${fmtNum(median)}.`}
          </p>
        </div>
        <div className="rounded-lg border p-2.5 space-y-1">
          <p className="font-semibold" style={{ color: SIGNATURE.orange }}>
            Mode (most often) = {modes.length ? modes.join(", ") : "none"}
          </p>
          <p className="text-muted-foreground">
            {modes.length
              ? `${modes.join(" and ")} appear${modes.length === 1 ? "s" : ""} ${maxF} times, more than any other mark (orange bars).`
              : "Every mark appears only once, so there is no mode. Change two marks to the same number to make one."}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────── Probability ─────────────────────────────── */

export function ProbabilityDiceViz(_props: TopicVizProps) {
  const [counts, setCounts] = useState<number[]>([0, 0, 0, 0, 0, 0]);
  const total = counts.reduce((a, b) => a + b, 0);
  const roll = (times: number) =>
    setCounts((c) => {
      const next = [...c];
      for (let i = 0; i < times; i++) next[Math.floor(Math.random() * 6)] += 1;
      return next;
    });
  const pct = counts.map((c) => (total ? (c / total) * 100 : 0));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 justify-center">
        <Button type="button" size="sm" onClick={() => roll(1)}>
          Roll once
        </Button>
        <Button type="button" size="sm" onClick={() => roll(10)}>
          Roll 10×
        </Button>
        <Button type="button" size="sm" onClick={() => roll(1000)}>
          Roll 1000×
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setCounts([0, 0, 0, 0, 0, 0])}>
          Reset
        </Button>
      </div>
      <p className="text-xs text-center tabular-nums">
        Total rolls: <b>{total}</b>
      </p>
      <BarsChart
        bars={pct.map((v, i) => ({ label: `${i + 1}`, value: v }))}
        yMax={Math.max(30, ...pct)}
        refLine={{ value: 100 / 6, label: "expected\n1/6 ≈ 16.7%" }}
        yTitle="% of rolls"
        xTitle="Face of the dice"
        valueText={(v) => (total ? `${Math.round(v)}%` : "")}
      />
      {total ? (
        <p className="text-[11px] text-center tabular-nums text-muted-foreground">
          Times each face came up: {counts.map((c, i) => `${i + 1} → ${c}`).join(" · ")}
        </p>
      ) : null}
      <p className="text-xs text-center text-muted-foreground max-w-md mx-auto">
        Each face has 1 chance in 6. With only a few rolls the bars are uneven. Roll 1000 times and every bar ends up close to the
        dashed line at 16.7%.
      </p>
    </div>
  );
}

export function ProbabilityCoinViz(_props: TopicVizProps) {
  const [state, setState] = useState<{ heads: number; total: number; hist: number[] }>({ heads: 0, total: 0, hist: [] });
  const flip = (times: number) =>
    setState((s) => {
      let { heads, total } = s;
      const hist = [...s.hist];
      for (let i = 0; i < times; i++) {
        if (Math.random() < 0.5) heads += 1;
        total += 1;
        hist.push((heads / total) * 100);
      }
      return { heads, total, hist };
    });
  const { heads, total, hist } = state;
  const W = 320;
  const H = 170;
  const L = 40;
  const R = 58;
  const T = 12;
  const B = 32;
  const xMax = Math.max(10, total);
  const X = (i: number) => L + ((W - L - R) * i) / xMax;
  const Y = (p: number) => T + ((H - T - B) * (100 - p)) / 100;
  const stride = Math.max(1, Math.floor(hist.length / 400));
  const line = hist
    .filter((_, i) => i % stride === 0 || i === hist.length - 1)
    .map((p, k, arr) => {
      const i = k === arr.length - 1 ? hist.length : k * stride + 1;
      return `${X(i)},${Y(p)}`;
    })
    .join(" ");

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 justify-center">
        <Button type="button" size="sm" onClick={() => flip(1)}>
          Flip once
        </Button>
        <Button type="button" size="sm" onClick={() => flip(10)}>
          Flip 10×
        </Button>
        <Button type="button" size="sm" onClick={() => flip(100)}>
          Flip 100×
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setState({ heads: 0, total: 0, hist: [] })}>
          Reset
        </Button>
      </div>
      <div className="flex gap-4 justify-center text-sm tabular-nums">
        <span>Heads: {heads}</span>
        <span>Tails: {total - heads}</span>
        <span>
          P(heads) ≈ {heads}/{total || 0} = <b>{total ? `${((heads / total) * 100).toFixed(1)}%` : "—"}</b>
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-md mx-auto h-auto">
        {[0, 25, 50, 75, 100].map((p) => (
          <g key={p}>
            <line x1={L} y1={Y(p)} x2={W - R} y2={Y(p)} stroke="#EEF2F7" />
            <text x={L - 4} y={Y(p) + 3} textAnchor="end" fontSize={8} fill="#64748B">
              {p}%
            </text>
          </g>
        ))}
        <line x1={L} y1={T} x2={L} y2={Y(0)} stroke="#334155" />
        <line x1={L} y1={Y(0)} x2={W - R} y2={Y(0)} stroke="#334155" />
        <line x1={L} y1={Y(50)} x2={W - R} y2={Y(50)} stroke={SIGNATURE.red} strokeWidth={1.5} strokeDasharray="5 3" />
        <text x={W - R + 4} y={Y(50) - 2} fontSize={8.5} fontWeight={700} fill={SIGNATURE.red}>
          50%
        </text>
        <text x={W - R + 4} y={Y(50) + 9} fontSize={8} fill={SIGNATURE.red}>
          (1 in 2)
        </text>
        {hist.length ? <polyline points={line} fill="none" stroke={SIGNATURE.blue} strokeWidth={2} /> : null}
        <text x={L} y={Y(0) + 11} textAnchor="middle" fontSize={8} fill="#64748B">
          0
        </text>
        <text x={W - R} y={Y(0) + 11} textAnchor="end" fontSize={8} fill="#64748B">
          {xMax}
        </text>
        <text x={(L + W - R) / 2} y={H - 4} textAnchor="middle" fontSize={9} fontWeight={600} fill="#475569">
          Number of flips
        </text>
        <text
          x={10}
          y={(T + Y(0)) / 2}
          textAnchor="middle"
          fontSize={9}
          fontWeight={600}
          fill="#475569"
          transform={`rotate(-90 10 ${(T + Y(0)) / 2})`}
        >
          % heads so far
        </text>
      </svg>
      <p className="text-xs text-center text-muted-foreground max-w-md mx-auto">
        The blue line is the share of heads after each flip. At first it jumps around a lot; after many flips it settles close to
        50%.
      </p>
    </div>
  );
}

/* ─────────────────────────────── Circle & tangent ─────────────────────────────── */

function sliderSpec(spec: VisualizationSpec, id: string) {
  return (spec.sliders ?? []).find((s) => s.id === id);
}

export function CircleTangentViz({ spec, values, onChange }: TopicVizProps) {
  const rv = values.r ?? 5;
  const ang = values.tangentAngle ?? 45;
  const angSpec = sliderSpec(spec, "tangentAngle");
  const W = 300;
  const H = 260;
  const cx = 150;
  const cy = 130;
  const R = clamp(rv * 15, 30, 100);
  const th = (ang * Math.PI) / 180;
  const u = { x: Math.cos(th), y: -Math.sin(th) };
  const t = { x: Math.sin(th), y: Math.cos(th) };
  const P = { x: cx + R * u.x, y: cy + R * u.y };
  const mOP = { x: (cx + P.x) / 2, y: (cy + P.y) / 2 };
  const s = 11;
  const tanLab = { x: P.x + t.x * 70 + u.x * 12, y: P.y + t.y * 70 + u.y * 12 };

  return (
    <div className="space-y-3">
      <svg viewBox={`0 0 ${W} ${H}`} className={CARD}>
        <circle cx={cx} cy={cy} r={R} fill={`${SIGNATURE.blue}10`} stroke={SIGNATURE.blue} strokeWidth={2} />
        <line x1={P.x - t.x * 140} y1={P.y - t.y * 140} x2={P.x + t.x * 140} y2={P.y + t.y * 140} stroke={SIGNATURE.orange} strokeWidth={2.4} />
        <line x1={cx} y1={cy} x2={P.x} y2={P.y} stroke={SIGNATURE.purple} strokeWidth={2} />
        <polyline
          points={`${P.x - u.x * s},${P.y - u.y * s} ${P.x - u.x * s + t.x * s},${P.y - u.y * s + t.y * s} ${P.x + t.x * s},${P.y + t.y * s}`}
          fill={`${SIGNATURE.red}22`}
          stroke={SIGNATURE.red}
          strokeWidth={1.5}
        />
        <text
          x={P.x - u.x * 24 + t.x * 22}
          y={P.y - u.y * 24 + t.y * 22 + 4}
          textAnchor="middle"
          fontSize={11}
          fontWeight={800}
          fill={SIGNATURE.red}
          {...HALO}
        >
          90°
        </text>
        <circle cx={cx} cy={cy} r={3.5} fill="#0F172A" />
        <text x={cx - 8} y={cy + 14} textAnchor="end" fontSize={13} fontWeight={800} fill="#0F172A" {...HALO}>
          O
        </text>
        <text
          x={mOP.x - t.x * 12}
          y={mOP.y - t.y * 12 + 4}
          textAnchor="middle"
          fontSize={11}
          fontWeight={700}
          fill={SIGNATURE.purple}
          {...HALO}
        >
          radius
        </text>
        <text x={tanLab.x} y={tanLab.y + 4} textAnchor="middle" fontSize={11} fontWeight={700} fill="#B45309" {...HALO}>
          tangent
        </text>
        <text x={P.x + u.x * 16} y={P.y + u.y * 16 + 5} textAnchor="middle" fontSize={13} fontWeight={800} fill="#0F172A" {...HALO}>
          P
        </text>
        <ControlPoint
          cx={P.x}
          cy={P.y}
          onPointerDown={(e) =>
            startDrag(e, (pt) => {
              let deg = (Math.atan2(-(pt.y - cy), pt.x - cx) * 180) / Math.PI;
              if (deg < 0) deg += 360;
              onChange("tangentAngle", Math.round(clamp(deg, angSpec?.min ?? 0, angSpec?.max ?? 360)));
            })
          }
        />
      </svg>
      <div className="text-center space-y-1 max-w-md mx-auto">
        <p className="text-sm font-semibold">The radius OP and the tangent always meet at 90°.</p>
        <p className="text-xs text-muted-foreground">
          The orange tangent line touches the circle at exactly one point, P (the point of contact). Drag P round the circle: the
          right angle never changes.
        </p>
      </div>
      <SliderPanel spec={spec} values={values} onChange={onChange} />
    </div>
  );
}

/* ─────────────────────────────── Area resizer ─────────────────────────────── */

export function AreaResizerViz(props: TopicVizProps) {
  if ((props.spec.sliders ?? []).some((s) => s.id === "sheetLength")) return <OpenBoxViz {...props} />;
  return <RectTriangleAreaViz {...props} />;
}

function sideWord(spec: VisualizationSpec, id: string, fallback: string) {
  const label = sliderSpec(spec, id)?.label ?? fallback;
  return label.replace(/^(rectangle|triangle)\s+/i, "").replace(/\s*\(.*\)$/, "").toLowerCase();
}

function RectTriangleAreaViz({ spec, values, onChange, palette }: TopicVizProps) {
  const sl = (id: string, lo: number, hi: number) => {
    const s = sliderSpec(spec, id);
    return { min: s?.min ?? lo, max: s?.max ?? hi };
  };
  const hasTri = (spec.sliders ?? []).some((s) => s.id === "base");
  const w = values.width ?? 6;
  const h = values.height ?? 4;
  const base = values.base ?? 8;
  const th = values.triHeight ?? 5;
  const wR = sl("width", 1, 12);
  const hR = sl("height", 1, 10);
  const bR = sl("base", 2, 12);
  const tR = sl("triHeight", 1, 10);
  const lenWord = sideWord(spec, "width", "length");
  const brWord = sideWord(spec, "height", "breadth");

  const u = Math.min(16, 300 / (wR.max + (hasTri ? bR.max : 0)), 150 / Math.max(hR.max, hasTri ? tR.max : 0));
  const pad = 34;
  const gap = 40;
  const baseline = pad + Math.max(hR.max, hasTri ? tR.max : 0) * u;
  const W = pad + wR.max * u + (hasTri ? gap + bR.max * u : 0) + 16;
  const H = baseline + 34;
  const rx = pad;
  const ry = baseline - h * u;
  const tx0 = pad + wR.max * u + gap;
  const apex = { x: tx0 + base * u * 0.35, y: baseline - th * u };

  return (
    <div className="space-y-4">
      <svg viewBox={`0 0 ${W} ${H}`} className={CARD} style={{ maxWidth: W * 1.6 }}>
        <g stroke="#E2E8F0" strokeWidth={0.6} strokeDasharray="2 2">
          {Array.from({ length: wR.max + 1 }).map((_, i) => (
            <line key={`bv${i}`} x1={rx + i * u} y1={baseline - hR.max * u} x2={rx + i * u} y2={baseline} />
          ))}
          {Array.from({ length: hR.max + 1 }).map((_, i) => (
            <line key={`bh${i}`} x1={rx} y1={baseline - i * u} x2={rx + wR.max * u} y2={baseline - i * u} />
          ))}
        </g>
        <g stroke={`${SIGNATURE.blue}40`} strokeWidth={0.7}>
          {Array.from({ length: Math.max(0, Math.round(w) - 1) }).map((_, i) => (
            <line key={`gv${i}`} x1={rx + (i + 1) * u} y1={ry} x2={rx + (i + 1) * u} y2={baseline} />
          ))}
          {Array.from({ length: Math.max(0, Math.round(h) - 1) }).map((_, i) => (
            <line key={`gh${i}`} x1={rx} y1={ry + (i + 1) * u} x2={rx + w * u} y2={ry + (i + 1) * u} />
          ))}
        </g>
        <rect x={rx} y={ry} width={w * u} height={h * u} fill={`${SIGNATURE.blue}1F`} stroke={SIGNATURE.blue} strokeWidth={2} />
        <text x={rx + (w * u) / 2} y={baseline + 14} textAnchor="middle" fontSize={10} fontWeight={700} fill={SIGNATURE.blue}>
          {lenWord} = {fmtNum(w)}
        </text>
        <text
          x={rx - 8}
          y={ry + (h * u) / 2}
          textAnchor="middle"
          fontSize={10}
          fontWeight={700}
          fill={SIGNATURE.blue}
          transform={`rotate(-90 ${rx - 8} ${ry + (h * u) / 2})`}
        >
          {brWord} = {fmtNum(h)}
        </text>
        <text x={rx + (w * u) / 2} y={ry + (h * u) / 2 + 4} textAnchor="middle" fontSize={11} fontWeight={800} fill="#1E3A8A" {...HALO}>
          {w * u >= 72 ? `${fmtNum(w * h)} squares` : fmtNum(w * h)}
        </text>
        <ControlPoint
          cx={rx + w * u}
          cy={ry}
          onPointerDown={(e) =>
            startDrag(e, (pt) => {
              onChange("width", Math.round(clamp((pt.x - rx) / u, wR.min, wR.max)));
              onChange("height", Math.round(clamp((baseline - pt.y) / u, hR.min, hR.max)));
            })
          }
        />

        {hasTri ? (
          <g>
            <rect x={tx0} y={apex.y} width={base * u} height={th * u} fill="none" stroke="#94A3B8" strokeDasharray="3 3" />
            <polygon
              points={`${tx0},${baseline} ${tx0 + base * u},${baseline} ${apex.x},${apex.y}`}
              fill={`${SIGNATURE.green}2E`}
              stroke={SIGNATURE.green}
              strokeWidth={2}
            />
            <line x1={apex.x} y1={apex.y} x2={apex.x} y2={baseline} stroke={SIGNATURE.red} strokeWidth={1.5} strokeDasharray="4 3" />
            <polyline
              points={`${apex.x},${baseline - 8} ${apex.x + 8},${baseline - 8} ${apex.x + 8},${baseline}`}
              fill="none"
              stroke={SIGNATURE.red}
              strokeWidth={1.2}
            />
            <text x={apex.x - 4} y={(apex.y + baseline) / 2 + 4} textAnchor="end" fontSize={10} fontWeight={700} fill={SIGNATURE.red} {...HALO}>
              height = {fmtNum(th)}
            </text>
            <text x={tx0 + (base * u) / 2} y={baseline + 14} textAnchor="middle" fontSize={10} fontWeight={700} fill={SIGNATURE.green}>
              base = {fmtNum(base)}
            </text>
            <ControlPoint
              cx={apex.x}
              cy={apex.y}
              onPointerDown={(e) =>
                startDrag(e, (pt) => onChange("triHeight", Math.round(clamp((baseline - pt.y) / u, tR.min, tR.max))))
              }
            />
            <ControlPoint
              cx={tx0 + base * u}
              cy={baseline}
              onPointerDown={(e) => startDrag(e, (pt) => onChange("base", Math.round(clamp((pt.x - tx0) / u, bR.min, bR.max))))}
            />
          </g>
        ) : null}
      </svg>
      <p className="text-[11px] text-center text-muted-foreground">Drag the orange dots or use the sliders. Each small square is 1 square unit.</p>
      <div className="text-center text-xs space-y-1.5 max-w-md mx-auto tabular-nums">
        <p>
          <b style={{ color: SIGNATURE.blue }}>Rectangle area</b> = {lenWord} × {brWord} = {fmtNum(w)} × {fmtNum(h)} ={" "}
          <b>{fmtNum(w * h)} square units</b> (count the squares!)
        </p>
        <p>
          <b style={{ color: SIGNATURE.blue }}>Perimeter</b> = 2 × ({lenWord} + {brWord}) = 2 × ({fmtNum(w)} + {fmtNum(h)}) ={" "}
          <b>{fmtNum(2 * (w + h))} units</b> (the distance all the way round)
        </p>
        {hasTri ? (
          <p>
            <b style={{ color: SIGNATURE.green }}>Triangle area</b> = ½ × base × height = ½ × {fmtNum(base)} × {fmtNum(th)} ={" "}
            <b>{fmtNum((base * th) / 2)} square units</b>. It is exactly half of the dashed rectangle around it.
          </p>
        ) : null}
      </div>
      <SliderPanel spec={spec} values={values} onChange={onChange} palette={palette} />
    </div>
  );
}

const BOX_SLIDERS = ["sheetLength", "sheetWidth", "cut"];

function OpenBoxViz({ spec, values, onChange, palette }: TopicVizProps) {
  const [showBest, setShowBest] = useState(false);
  const L = values.sheetLength ?? 20;
  const Wd = values.sheetWidth ?? 14;
  const x = values.cut ?? 2;
  const bl = L - 2 * x;
  const bw = Wd - 2 * x;
  const ok = bl > 0 && bw > 0 && x > 0;
  const vol = ok ? bl * bw * x : 0;
  const cutSpec = sliderSpec(spec, "cut");

  let best = { cut: 0, vol: 0 };
  const step = cutSpec?.step ?? 1;
  for (let c = cutSpec?.min ?? 1; c <= (cutSpec?.max ?? 6) + 1e-9; c += step) {
    const v = Math.max(0, L - 2 * c) * Math.max(0, Wd - 2 * c) * c;
    if (v > best.vol) best = { cut: Math.round(c * 100) / 100, vol: v };
  }

  const s = Math.min(160 / L, 110 / Wd);
  const sx = 30;
  const sy = 34;
  const sheetBottom = sy + 110;
  const ox = 236;
  const sb = ok ? Math.min(s, 130 / (bl + bw * 0.435), 95 / (x + bw * 0.25)) : s;
  const blp = Math.max(0, bl) * sb;
  const dep = Math.max(0, bw) * sb * 0.5;
  const dx = dep * 0.87;
  const dy = -dep * 0.5;
  const hh = x * sb;
  const by = sheetBottom;
  const W = 420;
  const H = sheetBottom + 30;
  const cut = x * s;
  const sheetPts = { x0: sx, y0: sy, x1: sx + L * s, y1: sy + Wd * s };
  const filtered = { ...spec, sliders: (spec.sliders ?? []).filter((sl) => BOX_SLIDERS.includes(sl.id)) };

  return (
    <div className="space-y-4">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full mx-auto h-auto rounded-xl border bg-white">
        <text x={sx} y={16} fontSize={10} fontWeight={700} fill="#334155">
          1. Cut the 4 red corners
        </text>
        <rect x={sheetPts.x0} y={sheetPts.y0} width={L * s} height={Wd * s} fill={`${SIGNATURE.blue}14`} stroke={SIGNATURE.blue} strokeWidth={1.8} />
        {ok ? (
          <g>
            <rect x={sheetPts.x0 + cut} y={sheetPts.y0 + cut} width={blp} height={bw * s} fill={`${SIGNATURE.blue}22`} stroke="none" />
            <g stroke={SIGNATURE.blue} strokeDasharray="4 3" strokeWidth={1}>
              <line x1={sheetPts.x0 + cut} y1={sheetPts.y0} x2={sheetPts.x0 + cut} y2={sheetPts.y1} />
              <line x1={sheetPts.x1 - cut} y1={sheetPts.y0} x2={sheetPts.x1 - cut} y2={sheetPts.y1} />
              <line x1={sheetPts.x0} y1={sheetPts.y0 + cut} x2={sheetPts.x1} y2={sheetPts.y0 + cut} />
              <line x1={sheetPts.x0} y1={sheetPts.y1 - cut} x2={sheetPts.x1} y2={sheetPts.y1 - cut} />
            </g>
          </g>
        ) : null}
        {[
          [sheetPts.x0, sheetPts.y0],
          [sheetPts.x1 - cut, sheetPts.y0],
          [sheetPts.x0, sheetPts.y1 - cut],
          [sheetPts.x1 - cut, sheetPts.y1 - cut],
        ].map(([cx0, cy0], i) => (
          <rect key={i} x={cx0} y={cy0} width={cut} height={cut} fill="#FEE2E2" stroke={SIGNATURE.red} strokeWidth={1.2} />
        ))}
        <text x={sheetPts.x0 + cut / 2} y={sheetPts.y0 + cut / 2 + 3} textAnchor="middle" fontSize={8} fontWeight={700} fill={SIGNATURE.red}>
          {fmtNum(x)}
        </text>
        <text x={(sheetPts.x0 + sheetPts.x1) / 2} y={sheetPts.y1 + 13} textAnchor="middle" fontSize={9} fontWeight={600} fill={SIGNATURE.blue}>
          sheet length {fmtNum(L)} cm
        </text>
        <text
          x={sheetPts.x0 - 7}
          y={(sheetPts.y0 + sheetPts.y1) / 2}
          textAnchor="middle"
          fontSize={9}
          fontWeight={600}
          fill={SIGNATURE.blue}
          transform={`rotate(-90 ${sheetPts.x0 - 7} ${(sheetPts.y0 + sheetPts.y1) / 2})`}
        >
          sheet width {fmtNum(Wd)} cm
        </text>
        {ok ? (
          <text x={(sheetPts.x0 + sheetPts.x1) / 2} y={(sheetPts.y0 + sheetPts.y1) / 2 + 3} textAnchor="middle" fontSize={8} fill="#1E3A8A">
            base
          </text>
        ) : null}

        <text x={ox} y={16} fontSize={10} fontWeight={700} fill="#334155">
          2. Fold up the flaps
        </text>
        {ok ? (
          <g strokeLinejoin="round">
            <polygon
              points={`${ox},${by - hh} ${ox + blp},${by - hh} ${ox + blp + dx},${by - hh + dy} ${ox + dx},${by - hh + dy}`}
              fill={`${SIGNATURE.blue}10`}
              stroke={SIGNATURE.blue}
              strokeWidth={1.4}
            />
            <polygon
              points={`${ox + blp},${by} ${ox + blp + dx},${by + dy} ${ox + blp + dx},${by - hh + dy} ${ox + blp},${by - hh}`}
              fill={`${SIGNATURE.blue}40`}
              stroke={SIGNATURE.blue}
              strokeWidth={1.4}
            />
            <rect x={ox} y={by - hh} width={blp} height={hh} fill={`${SIGNATURE.blue}2E`} stroke={SIGNATURE.blue} strokeWidth={1.6} />
            <text x={ox + blp / 2} y={by + 13} textAnchor="middle" fontSize={9} fontWeight={700} fill="#1E3A8A">
              length {fmtNum(L)} − 2×{fmtNum(x)} = {fmtNum(bl)}
            </text>
            <text x={ox + blp + dx + 5} y={by + dy / 2 + 2} fontSize={9} fontWeight={700} fill="#1E3A8A">
              width {fmtNum(bw)}
            </text>
            <text x={ox - 4} y={by - hh / 2 + 3} textAnchor="end" fontSize={9} fontWeight={700} fill={SIGNATURE.red} {...HALO}>
              height {fmtNum(x)}
            </text>
          </g>
        ) : (
          <text x={ox} y={sheetBottom / 2 + 10} fontSize={10} fill={SIGNATURE.red}>
            Cut too big: no base left
          </text>
        )}
      </svg>
      <div className="text-center space-y-1.5 max-w-md mx-auto text-xs tabular-nums">
        {ok ? (
          <p className="text-sm">
            <b>Volume</b> = length × width × height = ({fmtNum(L)} − 2×{fmtNum(x)}) × ({fmtNum(Wd)} − 2×{fmtNum(x)}) × {fmtNum(x)} ={" "}
            {fmtNum(bl)} × {fmtNum(bw)} × {fmtNum(x)} = <b style={{ color: SIGNATURE.blue }}>{fmtNum(vol)} cm³</b>
          </p>
        ) : (
          <p className="text-sm font-semibold" style={{ color: SIGNATURE.red }}>
            2 × cut must be smaller than the sheet width, otherwise nothing is left for the base.
          </p>
        )}
        <p className="text-muted-foreground">
          The side of each cut square becomes the height of the box. A bigger cut makes a taller box but a smaller base.
        </p>
        <div className="flex justify-center gap-2 pt-1">
          <Button type="button" size="sm" variant="outline" onClick={() => setShowBest((v) => !v)}>
            {showBest ? "Hide" : "Which cut gives the biggest box?"}
          </Button>
          {showBest && best.vol > 0 ? (
            <Button type="button" size="sm" onClick={() => onChange("cut", best.cut)}>
              Try cut = {fmtNum(best.cut)}
            </Button>
          ) : null}
        </div>
        {showBest && best.vol > 0 ? (
          <p>
            Trying every cut on the slider, the biggest volume is with a cut of <b>{fmtNum(best.cut)} cm</b>:{" "}
            {fmtNum(L - 2 * best.cut)} × {fmtNum(Wd - 2 * best.cut)} × {fmtNum(best.cut)} = <b>{fmtNum(best.vol)} cm³</b>.
          </p>
        ) : null}
      </div>
      <SliderPanel spec={filtered} values={values} onChange={onChange} palette={palette} />
    </div>
  );
}
