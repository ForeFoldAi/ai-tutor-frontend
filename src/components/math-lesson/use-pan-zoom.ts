/**
 * Shared pan + cursor-anchored zoom for 2D SVG explorers (Desmos feel).
 * Scroll/pinch zooms around cursor; drag-on-background pans.
 */
import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from "react";

export type PanZoom = {
  x: number;
  y: number;
  scale: number;
};

const DEFAULT: PanZoom = { x: 0, y: 0, scale: 1 };

export function usePanZoom(opts?: { minScale?: number; maxScale?: number }) {
  const minScale = opts?.minScale ?? 0.55;
  const maxScale = opts?.maxScale ?? 3.5;
  const [view, setView] = useState<PanZoom>(DEFAULT);
  const panning = useRef(false);
  const last = useRef({ x: 0, y: 0 });

  const onWheel = useCallback(
    (e: ReactWheelEvent<SVGSVGElement>) => {
      e.preventDefault();
      const svg = e.currentTarget;
      const rect = svg.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.08 : 1 / 1.08;
      setView((v) => {
        const next = Math.min(maxScale, Math.max(minScale, v.scale * factor));
        const k = next / v.scale;
        // Keep point under cursor fixed
        return {
          scale: next,
          x: cx - (cx - v.x) * k,
          y: cy - (cy - v.y) * k,
        };
      });
    },
    [minScale, maxScale],
  );

  const onPointerDownBackground = useCallback((e: ReactPointerEvent) => {
    if ((e.target as Element).closest("[data-control-point]")) return;
    panning.current = true;
    last.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: ReactPointerEvent) => {
    if (!panning.current) return;
    const dx = e.clientX - last.current.x;
    const dy = e.clientY - last.current.y;
    last.current = { x: e.clientX, y: e.clientY };
    setView((v) => ({ ...v, x: v.x + dx, y: v.y + dy }));
  }, []);

  const onPointerUp = useCallback(() => {
    panning.current = false;
  }, []);

  const reset = useCallback(() => setView(DEFAULT), []);

  const transform = `translate(${view.x} ${view.y}) scale(${view.scale})`;

  return {
    view,
    transform,
    reset,
    handlers: {
      onWheel,
      onPointerDown: onPointerDownBackground,
      onPointerMove,
      onPointerUp,
      onPointerLeave: onPointerUp,
    },
  };
}
