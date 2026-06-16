import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/** Animated bars for voice call participant tiles. */
export function AiWaveform({
  active,
  intensity = 0.3,
  variant = "ai",
  className,
}: {
  active: boolean;
  intensity?: number;
  variant?: "ai" | "student";
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const colors =
    variant === "student"
      ? { top: "rgba(52,211,153,0.95)", bottom: "rgba(45,212,191,0.75)", idle: "bg-emerald-400/50" }
      : { top: "rgba(129,140,248,0.95)", bottom: "rgba(168,85,247,0.75)", idle: "bg-indigo-400/50" };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !active) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const top = variant === "student" ? "rgba(52,211,153,0.95)" : "rgba(129,140,248,0.95)";
    const bottom = variant === "student" ? "rgba(45,212,191,0.75)" : "rgba(168,85,247,0.75)";
    let raf = 0;
    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      canvas.width = Math.floor(r.width * dpr);
      canvas.height = Math.floor(r.height * dpr);
    };
    resize();
    const bars = 24;
    const draw = (t: number) => {
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);
      const barW = width / (bars * 1.6);
      const gap = barW * 0.6;
      const baseH = height * 0.35;
      for (let i = 0; i < bars; i++) {
        const wave =
          0.35 +
          intensity * 0.55 +
          0.25 * Math.sin(t / 200 + i * 0.45) * Math.cos(t / 380 + i * 0.2);
        const h = baseH + wave * height * 0.45;
        const x = i * (barW + gap) + gap;
        const y = (height - h) / 2;
        const grad = ctx.createLinearGradient(0, y, 0, y + h);
        grad.addColorStop(0, top);
        grad.addColorStop(1, bottom);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.rect(x, y, barW, h);
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(raf);
    };
  }, [active, intensity, variant]);

  if (!active) {
    return (
      <div className={cn("flex items-end justify-center gap-0.5 h-8 opacity-40", className)}>
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className={cn("w-1 rounded-full", colors.idle)} style={{ height: 6 + (i % 3) * 4 }} />
        ))}
      </div>
    );
  }

  return <canvas ref={canvasRef} className={cn("w-full h-8", className)} aria-hidden />;
}
