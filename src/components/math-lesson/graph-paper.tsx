/**
 * Square graph paper with equal x/y scale, unit grid and numbered axes.
 */
import type { ReactNode } from "react";

export interface GraphFrame {
  size: number;
  range: number;
  X: (x: number) => number;
  Y: (y: number) => number;
  /** Inverse of X/Y for pointer dragging (SVG units → graph units). */
  fromX: (px: number) => number;
  fromY: (py: number) => number;
}

export function graphFrame(range = 10, size = 300): GraphFrame {
  const u = size / (2 * range);
  return {
    size,
    range,
    X: (x) => size / 2 + x * u,
    Y: (y) => size / 2 - y * u,
    fromX: (px) => (px - size / 2) / u,
    fromY: (py) => (size / 2 - py) / u,
  };
}

export function GraphPaper({
  frame,
  labelEvery = 2,
  clipId,
  children,
  overlay,
  className = "w-full max-w-sm mx-auto h-auto rounded-xl border touch-none select-none",
  svgProps,
}: {
  frame: GraphFrame;
  labelEvery?: number;
  clipId: string;
  children: ReactNode;
  /** Drawn on top of the plot without clipping (labels near edges). */
  overlay?: ReactNode;
  className?: string;
  svgProps?: React.SVGProps<SVGSVGElement>;
}) {
  const { size, range, X, Y } = frame;
  const ticks = Array.from({ length: 2 * range + 1 }, (_, i) => i - range);
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className={className} style={{ background: "#fff", borderColor: "#e5e7eb" }} {...svgProps}>
      <defs>
        <clipPath id={clipId}>
          <rect x={0} y={0} width={size} height={size} />
        </clipPath>
        <marker id={`${clipId}-ax`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#334155" />
        </marker>
      </defs>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={X(t)} y1={0} x2={X(t)} y2={size} stroke={t % 5 === 0 ? "#d6d9e0" : "#eef0f3"} strokeWidth={1} />
          <line x1={0} y1={Y(t)} x2={size} y2={Y(t)} stroke={t % 5 === 0 ? "#d6d9e0" : "#eef0f3"} strokeWidth={1} />
        </g>
      ))}
      <line x1={2} y1={Y(0)} x2={size - 2} y2={Y(0)} stroke="#334155" strokeWidth={1.4} markerEnd={`url(#${clipId}-ax)`} />
      <line x1={X(0)} y1={size - 2} x2={X(0)} y2={2} stroke="#334155" strokeWidth={1.4} markerEnd={`url(#${clipId}-ax)`} />
      <text x={size - 8} y={Y(0) - 6} fontSize={11} fontStyle="italic" fill="#334155" textAnchor="end">
        x
      </text>
      <text x={X(0) + 7} y={12} fontSize={11} fontStyle="italic" fill="#334155">
        y
      </text>
      {ticks
        .filter((t) => t !== 0 && t % labelEvery === 0 && Math.abs(t) < range)
        .map((t) => (
          <g key={`l${t}`}>
            <text x={X(t)} y={Y(0) + 11} fontSize={8} textAnchor="middle" fill="#64748b">
              {t}
            </text>
            <text x={X(0) - 4} y={Y(t) + 3} fontSize={8} textAnchor="end" fill="#64748b">
              {t}
            </text>
          </g>
        ))}
      <text x={X(0) - 4} y={Y(0) + 11} fontSize={8} textAnchor="end" fill="#64748b">
        0
      </text>
      <g clipPath={`url(#${clipId})`}>{children}</g>
      {overlay}
    </svg>
  );
}

export function fmtNum(n: number, dp = 2): string {
  if (!Number.isFinite(n)) return "—";
  const r = Math.round(n * 10 ** dp) / 10 ** dp;
  return Object.is(r, -0) ? "0" : String(r).replace("-", "−");
}

/** "y = 2x − 3", "y = −x", "y = 4" */
export function linearEquation(m: number, c: number): string {
  const mPart = m === 0 ? "" : m === 1 ? "x" : m === -1 ? "−x" : `${fmtNum(m)}x`;
  if (!mPart) return `y = ${fmtNum(c)}`;
  if (c === 0) return `y = ${mPart}`;
  return `y = ${mPart} ${c > 0 ? "+" : "−"} ${fmtNum(Math.abs(c))}`;
}

/** "y = x² − 1", "y = −2x² + 3x" */
export function quadraticEquation(a: number, b: number, c: number): string {
  const terms: string[] = [];
  const push = (coef: number, sym: string) => {
    if (coef === 0) return;
    const abs = Math.abs(coef);
    const body = sym && abs === 1 ? sym : `${fmtNum(abs)}${sym}`;
    if (!terms.length) terms.push(coef < 0 ? `−${body}` : body);
    else terms.push(`${coef < 0 ? "−" : "+"} ${body}`);
  };
  push(a, "x²");
  push(b, "x");
  push(c, "");
  return `y = ${terms.length ? terms.join(" ") : "0"}`;
}

/** Points for y = f(x) across the frame, split where the curve leaves a generous band. */
export function plotPoints(frame: GraphFrame, f: (x: number) => number, step = 0.1): string {
  const pts: string[] = [];
  for (let x = -frame.range; x <= frame.range + 1e-9; x += step) {
    const y = f(x);
    if (Math.abs(y) > frame.range * 4) continue;
    pts.push(`${frame.X(x).toFixed(1)},${frame.Y(y).toFixed(1)}`);
  }
  return pts.join(" ");
}

/** Where y = mx + c leaves the visible square on the right (for placing its label). */
export function lineLabelAnchor(frame: GraphFrame, m: number, c: number): { x: number; y: number } {
  const r = frame.range * 0.92;
  const ry = frame.range * 0.8;
  let x = r;
  let y = m * x + c;
  if (y > ry || y < -ry) {
    y = y > ry ? ry : -ry;
    x = m !== 0 ? (y - c) / m : r;
  }
  return { x, y };
}
