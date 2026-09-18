/**
 * Shared Desmos-grade SVG stage: light canvas, grid optional, pan/zoom optional.
 * VizNarrative: step captions + Play for flagship teaching labs.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Palette } from "./design-tokens";
import { MOTION, SIGNATURE } from "./design-tokens";
import { usePanZoom } from "./use-pan-zoom";

export function VizStage({
  palette,
  viewBox,
  className,
  heightClass = "h-64",
  enablePanZoom = false,
  children,
  hint,
}: {
  palette: Palette;
  viewBox: string;
  className?: string;
  heightClass?: string;
  enablePanZoom?: boolean;
  children: ReactNode;
  hint?: string;
}) {
  const panZoom = usePanZoom();
  const handlers = enablePanZoom ? panZoom.handlers : {};

  return (
    <div className="space-y-2">
      <svg
        viewBox={viewBox}
        className={`w-full max-w-lg mx-auto ${heightClass} rounded-xl border touch-none select-none ${className ?? ""}`}
        style={{
          borderColor: palette.gridLine,
          background: palette.background,
          boxShadow: "inset 0 1px 2px rgba(26,26,31,0.04)",
        }}
        {...handlers}
      >
        {enablePanZoom ? <g transform={panZoom.transform}>{children}</g> : children}
      </svg>
      {hint ? (
        <p className="text-[12px] text-center leading-snug" style={{ color: palette.muted }}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Horizontal step scrubber (GeoGebra construction history pattern). */
export function StepScrubber({
  step,
  total,
  labels,
  onChange,
  palette,
}: {
  step: number;
  total: number;
  labels?: string[];
  onChange: (step: number) => void;
  palette: Palette;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          className="h-9 min-w-[2.25rem] rounded-lg border px-2 text-xs font-medium disabled:opacity-40"
          style={{ borderColor: palette.gridLine, color: palette.text, background: palette.surface }}
          disabled={step <= 0}
          onClick={() => onChange(Math.max(0, step - 1))}
        >
          ←
        </button>
        <div className="flex-1 flex items-center gap-1.5 justify-center">
          {Array.from({ length: total }).map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={labels?.[i] ?? `Step ${i + 1}`}
              className="h-2.5 rounded-full transition-all"
              style={{
                width: i === step ? 22 : 10,
                background: i <= step ? palette.primary : palette.gridLine,
              }}
              onClick={() => onChange(i)}
            />
          ))}
        </div>
        <button
          type="button"
          className="h-9 min-w-[2.25rem] rounded-lg border px-2 text-xs font-medium disabled:opacity-40"
          style={{ borderColor: palette.gridLine, color: palette.text, background: palette.surface }}
          disabled={step >= total - 1}
          onClick={() => onChange(Math.min(total - 1, step + 1))}
        >
          →
        </button>
      </div>
      {labels?.[step] ? (
        <p className="text-[13px] text-center font-medium leading-snug" style={{ color: palette.text }}>
          {labels[step]}
        </p>
      ) : (
        <p className="text-[11px] text-center tabular-nums" style={{ color: palette.muted }}>
          Step {step + 1} of {total}
        </p>
      )}
    </div>
  );
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Playable step narrative for flagship labs — caption + Play/Pause + optional why line. */
export function VizNarrative({
  step,
  total,
  labels,
  why,
  onChange,
  palette,
  callout,
}: {
  step: number;
  total: number;
  labels: string[];
  why?: string[];
  onChange: (step: number) => void;
  palette: Palette;
  callout?: string | null;
}) {
  const [playing, setPlaying] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  useEffect(() => {
    if (!playing) return;
    if (prefersReducedMotion()) {
      onChange(total - 1);
      setPlaying(false);
      return;
    }
    if (step >= total - 1) {
      setPlaying(false);
      return;
    }
    timer.current = setTimeout(() => onChange(step + 1), MOTION.stepPauseMs);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [playing, step, total, onChange]);

  return (
    <div className="space-y-3">
      <StepScrubber step={step} total={total} labels={labels} onChange={onChange} palette={palette} />
      {why?.[step] ? (
        <p className="text-[12px] text-center leading-snug" style={{ color: palette.muted }}>
          {why[step]}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          className="h-9 rounded-lg px-4 text-xs font-semibold text-white"
          style={{ background: SIGNATURE.blue }}
          onClick={() => {
            if (playing) {
              setPlaying(false);
              return;
            }
            if (step >= total - 1) onChange(0);
            setPlaying(true);
          }}
        >
          {playing ? "Pause" : step >= total - 1 ? "Replay" : "Play"}
        </button>
        {callout ? (
          <span
            className="inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold tabular-nums"
            style={{
              borderColor: `${SIGNATURE.orange}66`,
              background: `${SIGNATURE.orange}14`,
              color: SIGNATURE.orange,
            }}
          >
            {callout}
          </span>
        ) : null}
      </div>
    </div>
  );
}
