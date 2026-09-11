import { Line, Html } from "@react-three/drei";
import { useRef, useState } from "react";
import { SIGNATURE, type Palette } from "../design-tokens";

/** Sightline triangle + draggable elevation angle (Phase 7). */
export function HeightsDistancesOverlay({
  angleDeg,
  distance,
  palette,
  onAngleChange,
}: {
  angleDeg: number;
  distance: number;
  palette: Palette;
  onAngleChange?: (deg: number) => void;
}) {
  const rad = (angleDeg * Math.PI) / 180;
  const dist = Math.max(1, distance * 0.08);
  const height = Math.max(0.4, dist * Math.tan(rad));
  const eye: [number, number, number] = [0, 0.25, 0];
  const base: [number, number, number] = [dist, 0.02, 0];
  const top: [number, number, number] = [dist, height, 0];
  const handleR = 0.95;
  const handlePos: [number, number, number] = [
    eye[0] + handleR * Math.cos(rad),
    eye[1] + handleR * Math.sin(rad),
    0,
  ];

  const arcPts: [number, number, number][] = [];
  for (let i = 0; i <= 12; i++) {
    const t = (i / 12) * rad;
    const r = 0.9;
    arcPts.push([eye[0] + r * Math.cos(t), eye[1] + r * Math.sin(t), 0]);
  }

  const [dragging, setDragging] = useState(false);
  const start = useRef({ y: 0, angle: angleDeg });

  return (
    <group>
      <Line points={[eye, base, top, eye]} color={palette.primary} lineWidth={2} />
      <Line points={[eye, top]} color={SIGNATURE.green} lineWidth={2.5} />
      <Line points={arcPts} color={SIGNATURE.orange} lineWidth={2} />

      <Html position={handlePos} center style={{ pointerEvents: "auto" }}>
        <button
          type="button"
          aria-label="Drag to change elevation angle"
          className="h-5 w-5 rounded-full border-2 border-white shadow-md cursor-grab active:cursor-grabbing touch-none"
          style={{
            background: SIGNATURE.orange,
            transform: dragging ? "scale(1.2)" : "scale(1)",
          }}
          onPointerDown={(e) => {
            if (!onAngleChange) return;
            e.stopPropagation();
            e.currentTarget.setPointerCapture(e.pointerId);
            setDragging(true);
            start.current = { y: e.clientY, angle: angleDeg };
            const move = (ev: PointerEvent) => {
              const dy = start.current.y - ev.clientY;
              const next = Math.round(Math.min(75, Math.max(15, start.current.angle + dy / 3)));
              onAngleChange(next);
            };
            const up = () => {
              setDragging(false);
              window.removeEventListener("pointermove", move);
              window.removeEventListener("pointerup", up);
            };
            window.addEventListener("pointermove", move);
            window.addEventListener("pointerup", up);
          }}
        />
      </Html>

      <Html position={[0.7, 0.55, 0]} center distanceFactor={10} style={{ pointerEvents: "none" }}>
        <span
          className="text-[10px] font-bold px-1.5 py-0.5 rounded-md border"
          style={{ background: palette.surface, color: SIGNATURE.orange, borderColor: palette.gridLine }}
        >
          {angleDeg}°
        </span>
      </Html>
      <Html position={[dist / 2, -0.15, 0]} center distanceFactor={10} style={{ pointerEvents: "none" }}>
        <span className="text-[9px] tabular-nums" style={{ color: palette.muted }}>
          {distance} m
        </span>
      </Html>
      <Html position={[dist + 0.4, height / 2, 0]} center distanceFactor={10} style={{ pointerEvents: "none" }}>
        <span className="text-[9px] font-semibold tabular-nums" style={{ color: palette.primary }}>
          h ≈ {(distance * Math.tan(rad)).toFixed(1)} m
        </span>
      </Html>
    </group>
  );
}
