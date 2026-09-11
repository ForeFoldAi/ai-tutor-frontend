import { useMemo } from "react";
import * as THREE from "three";
import { Html } from "@react-three/drei";
import type { SceneObject } from "@/types/math-lesson";
import { resolveObjectColor, type Palette } from "../design-tokens";

function asVec3(v: number[] | undefined, fallback: [number, number, number]): [number, number, number] {
  if (!v || v.length < 3) return fallback;
  return [v[0], v[1], v[2]];
}

export function PrimitiveMesh({
  obj,
  palette,
  sliderValues,
  wireframeActive = false,
}: {
  obj: SceneObject;
  palette: Palette;
  sliderValues: Record<string, number>;
  /** Orange edges only while actively resizing (Desmos/Phase 7) */
  wireframeActive?: boolean;
}) {
  const color = resolveObjectColor(obj.color, palette);
  const baseScale = asVec3(obj.scale as number[] | undefined, [1, 1, 1]);
  const driven = obj.scaleDrivenBy ? sliderValues[obj.scaleDrivenBy] : undefined;
  const scale: [number, number, number] = useMemo(() => {
    const clampScale = (s: [number, number, number]): [number, number, number] => {
      const m = Math.max(s[0], s[1], s[2], 0.01);
      if (m <= 1.35) return s;
      const k = 1.35 / m;
      return [s[0] * k, s[1] * k, s[2] * k];
    };
    if (driven == null || !Number.isFinite(driven)) return clampScale(baseScale);
    const f = Math.max(0.5, Math.min(1.35, 0.4 + driven * 0.095));
    if (obj.type === "cylinder" || obj.type === "cone") {
      const h = Math.max(0.55, Math.min(1.35, (sliderValues.h ?? driven) * 0.12));
      return [f, h, f];
    }
    const bx = baseScale[0] ?? 1;
    const by = baseScale[1] ?? 1;
    const bz = baseScale[2] ?? 1;
    if (Math.abs(bx - by) > 0.05 || Math.abs(by - bz) > 0.05) {
      const k = f / Math.max(bx, by, bz);
      return clampScale([bx * k, by * k, bz * k]);
    }
    return [f, f, f];
  }, [driven, baseScale, obj.type, sliderValues.h]);

  const position = asVec3(obj.position as number[] | undefined, [0, 0, 0]);
  const lifted: [number, number, number] = useMemo(() => {
    const s = scale[1] ?? 1;
    if (obj.type === "sphere") return [position[0], Math.max(position[1], s * 0.7), position[2]];
    if (obj.type === "box" || obj.type === "cylinder" || obj.type === "cone") {
      return [position[0], Math.max(position[1], s * 0.5), position[2]];
    }
    return position;
  }, [position, scale, obj.type]);

  const rotation = asVec3(obj.rotation as number[] | undefined, [0, 0, 0]);
  // Matte teaching-tool look (not glossy CAD)
  const roughness = obj.roughness ?? 0.42;
  const metalness = obj.metalness ?? 0.08;
  const wire = wireframeActive && obj.wireframeAccent !== false;

  let geometry: JSX.Element;
  switch (obj.type) {
    case "cylinder":
      geometry = <cylinderGeometry args={[0.55, 0.55, 1.15, 48]} />;
      break;
    case "cone":
      geometry = <coneGeometry args={[0.65, 1.35, 48]} />;
      break;
    case "sphere":
      geometry = <sphereGeometry args={[0.65, 48, 48]} />;
      break;
    case "box":
    default:
      geometry = <boxGeometry args={[1, 1, 1]} />;
      break;
  }

  const edgeGeo = useMemo(() => {
    if (obj.type === "cylinder") return new THREE.CylinderGeometry(0.55, 0.55, 1.15, 24);
    if (obj.type === "cone") return new THREE.ConeGeometry(0.65, 1.35, 24);
    if (obj.type === "sphere") return new THREE.SphereGeometry(0.65, 16, 16);
    return new THREE.BoxGeometry(1, 1, 1);
  }, [obj.type]);

  return (
    <group position={lifted} rotation={rotation as unknown as [number, number, number]} scale={scale}>
      <mesh castShadow receiveShadow>
        {geometry}
        <meshStandardMaterial
          color={color}
          roughness={roughness}
          metalness={metalness}
          envMapIntensity={0.35}
        />
      </mesh>
      {wire ? (
        <lineSegments>
          <edgesGeometry args={[edgeGeo]} />
          <lineBasicMaterial color={palette.accent} linewidth={2} transparent opacity={0.95} />
        </lineSegments>
      ) : null}
    </group>
  );
}

export function CompositeMesh({
  obj,
  palette,
  sliderValues,
}: {
  obj: SceneObject;
  palette: Palette;
  sliderValues: Record<string, number>;
}) {
  const position = asVec3(obj.position as number[] | undefined, [0, 0, 0]);
  const rotation = asVec3(obj.rotation as number[] | undefined, [0, 0, 0]);
  const children = obj.children ?? [];
  return (
    <group position={position} rotation={rotation as unknown as [number, number, number]}>
      {children.map((child) =>
        child.type === "composite" ? (
          <CompositeMesh key={child.id} obj={child} palette={palette} sliderValues={sliderValues} />
        ) : (
          <PrimitiveMesh key={child.id} obj={child} palette={palette} sliderValues={sliderValues} />
        ),
      )}
    </group>
  );
}

export function LabelOverlay({
  text,
  position,
  palette,
}: {
  text: string;
  position: [number, number, number];
  palette: Palette;
}) {
  return (
    <Html position={position} center distanceFactor={8} style={{ pointerEvents: "none" }}>
      <div
        className="rounded px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap shadow"
        style={{ background: palette.surface, color: palette.text, border: `1px solid ${palette.gridLine}` }}
      >
        {text}
      </div>
    </Html>
  );
}
