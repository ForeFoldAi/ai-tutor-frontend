/**
 * Shared Desmos-grade SVG stage: light canvas, grid optional, pan/zoom optional.
 */
import type { ReactNode } from "react";
import type { Palette } from "./design-tokens";
import { usePanZoom } from "./use-pan-zoom";

export function VizStage({
  palette,
  viewBox,
  className,
  heightClass = "h-52",
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
        className={`w-full max-w-md mx-auto ${heightClass} rounded-xl border touch-none select-none ${className ?? ""}`}
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
        <p className="text-[11px] text-center" style={{ color: palette.muted }}>
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
          className="h-8 min-w-[2rem] rounded-lg border px-2 text-xs font-medium disabled:opacity-40"
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
          className="h-8 min-w-[2rem] rounded-lg border px-2 text-xs font-medium disabled:opacity-40"
          style={{ borderColor: palette.gridLine, color: palette.text, background: palette.surface }}
          disabled={step >= total - 1}
          onClick={() => onChange(Math.min(total - 1, step + 1))}
        >
          →
        </button>
      </div>
      {labels?.[step] ? (
        <p className="text-[11px] text-center font-medium" style={{ color: palette.primary }}>
          {step + 1}/{total}: {labels[step]}
        </p>
      ) : (
        <p className="text-[11px] text-center tabular-nums" style={{ color: palette.muted }}>
          Step {step + 1} of {total}
        </p>
      )}
    </div>
  );
}
