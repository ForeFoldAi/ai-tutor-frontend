/**
 * Desmos/GeoGebra control point — orange filled circle, large invisible hit area.
 */
import { SIGNATURE, MOTION } from "./design-tokens";
import { motion } from "framer-motion";

export function ControlPoint({
  cx,
  cy,
  r = 6,
  hit = 14,
  active = false,
  feedback,
  onPointerDown,
}: {
  cx: number;
  cy: number;
  r?: number;
  hit?: number;
  active?: boolean;
  feedback?: "correct" | "incorrect" | null;
  onPointerDown?: (e: React.PointerEvent) => void;
}) {
  const fill =
    feedback === "correct"
      ? SIGNATURE.green
      : feedback === "incorrect"
        ? SIGNATURE.red
        : SIGNATURE.orange;

  return (
    <motion.g
      data-control-point
      style={{ cursor: "grab" }}
      animate={
        feedback === "correct"
          ? { scale: [1, 1.08, 1] }
          : feedback === "incorrect"
            ? { x: [0, -6, 6, -6, 6, 0] }
            : { scale: active ? 1.12 : 1, x: 0 }
      }
      transition={
        feedback === "correct"
          ? { duration: MOTION.correctMs / 1000 }
          : feedback === "incorrect"
            ? { duration: MOTION.incorrectMs / 1000 }
            : MOTION.dragSettle
      }
    >
      {/* Invisible hit target (min ~24px) */}
      <circle
        cx={cx}
        cy={cy}
        r={hit}
        fill="transparent"
        onPointerDown={onPointerDown}
      />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill={fill}
        stroke="#ffffff"
        strokeWidth={2}
        style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.28))" }}
        pointerEvents="none"
      />
    </motion.g>
  );
}
