import { Suspense, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Bounds, ContactShadows, Html, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { SceneSpec, VisualizationSpec } from "@/types/math-lesson";
import { SIGNATURE, type Palette } from "../design-tokens";
import { CompositeMesh, LabelOverlay, PrimitiveMesh } from "./primitive-mesh";
import { HeightsDistancesOverlay } from "./heights-overlay";

function asVec3(v: number[] | undefined, fallback: [number, number, number]): [number, number, number] {
  if (!v || v.length < 3) return fallback;
  return [v[0], v[1], v[2]];
}

/** Corner resize handle — Html sprite; syncs scaleDrivenBy slider (Phase 7). */
function ResizeHandle({
  position,
  sliderId,
  value,
  min,
  max,
  onChange,
}: {
  position: [number, number, number];
  sliderId: string;
  value: number;
  min: number;
  max: number;
  onChange: (id: string, v: number) => void;
}) {
  const [dragging, setDragging] = useState(false);
  return (
    <Html position={position} center style={{ pointerEvents: "auto" }}>
      <button
        type="button"
        aria-label="Resize"
        className="h-5 w-5 rounded-full border-2 border-white shadow-md cursor-nwse-resize touch-none"
        style={{
          background: SIGNATURE.orange,
          transform: dragging ? "scale(1.15)" : "scale(1)",
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
          e.currentTarget.setPointerCapture(e.pointerId);
          setDragging(true);
          const startY = e.clientY;
          const startVal = value;
          const move = (ev: PointerEvent) => {
            const dy = startY - ev.clientY;
            const next = Math.round(Math.min(max, Math.max(min, startVal + dy / 14)));
            onChange(sliderId, next);
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
  );
}

function SceneContents({
  scene,
  palette,
  sliderValues,
  visualizationType,
  autoRotate,
  onChange,
}: {
  scene: SceneSpec;
  palette: Palette;
  sliderValues: Record<string, number>;
  visualizationType: string;
  autoRotate?: boolean;
  onChange?: (id: string, v: number) => void;
}) {
  const showHeights = visualizationType === "heights-distances-scene";
  const bg = palette.background || "#fafafa";

  // First scaleDrivenBy box gets a resize handle
  const resizeTarget = useMemo(() => {
    const obj = scene.objects.find((o) => o.type === "box" && o.scaleDrivenBy);
    if (!obj?.scaleDrivenBy) return null;
    const driven = sliderValues[obj.scaleDrivenBy] ?? 3;
    const f = Math.max(0.5, Math.min(1.35, 0.4 + driven * 0.095));
    return {
      id: obj.scaleDrivenBy,
      value: driven,
      position: [f * 0.55, f * 1.05, f * 0.55] as [number, number, number],
    };
  }, [scene.objects, sliderValues]);

  return (
    <>
      <color attach="background" args={[bg]} />
      <fog attach="fog" args={["#e8e8ec", 14, 36]} />

      <hemisphereLight intensity={0.75} color="#ffffff" groundColor="#e8e8ec" />
      <ambientLight intensity={0.55} />
      <directionalLight
        position={[4.5, 8, 3.5]}
        intensity={1.05}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0002}
      />
      <directionalLight position={[-3, 2, -2]} intensity={0.35} color="#ffffff" />

      {scene.groundGrid !== false ? (
        <gridHelper args={[10, 10, palette.gridLine, palette.gridLine]} position={[0, 0, 0]} />
      ) : null}

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]} receiveShadow>
        <circleGeometry args={[5, 48]} />
        <meshStandardMaterial color="#f3f3f5" roughness={1} metalness={0} />
      </mesh>

      <Bounds fit observe margin={1.45} maxDuration={0.35}>
        {scene.objects.map((obj) =>
          obj.type === "composite" ? (
            <CompositeMesh key={obj.id} obj={obj} palette={palette} sliderValues={sliderValues} />
          ) : (
            <PrimitiveMesh
              key={obj.id}
              obj={obj}
              palette={palette}
              sliderValues={sliderValues}
              wireframeActive={false}
            />
          ),
        )}
      </Bounds>

      {resizeTarget && onChange ? (
        <ResizeHandle
          position={resizeTarget.position}
          sliderId={resizeTarget.id}
          value={resizeTarget.value}
          min={1}
          max={10}
          onChange={onChange}
        />
      ) : null}

      {(scene.labels ?? []).map((lab, i) => (
        <LabelOverlay
          key={lab.id ?? `lab-${i}`}
          text={lab.text}
          position={asVec3(lab.position, [0, 1.5, 0])}
          palette={palette}
        />
      ))}

      {showHeights ? (
        <HeightsDistancesOverlay
          angleDeg={sliderValues.angle ?? 30}
          distance={sliderValues.distance ?? 40}
          palette={palette}
          onAngleChange={onChange ? (deg) => onChange("angle", deg) : undefined}
        />
      ) : null}

      <ContactShadows position={[0, 0.01, 0]} opacity={0.35} scale={10} blur={2.4} far={5} color="#1a1a1f" />
      <OrbitControls
        enablePan={false}
        enableZoom={false}
        maxPolarAngle={Math.PI / 2.05}
        minDistance={3.5}
        maxDistance={14}
        autoRotate={autoRotate}
        autoRotateSpeed={1.2}
        enableDamping
        dampingFactor={0.08}
        makeDefault
      />
    </>
  );
}

export function SceneRenderer({
  scene,
  palette,
  sliderValues,
  visualizationType = "",
  className,
  autoRotate = false,
  onChange,
}: {
  scene: SceneSpec;
  palette: Palette;
  sliderValues: Record<string, number>;
  visualizationType?: string;
  className?: string;
  autoRotate?: boolean;
  onChange?: (id: string, v: number) => void;
}) {
  const cam = scene.camera ?? {};
  const position = asVec3(cam.position as number[] | undefined, [4.8, 3.2, 5.6]);
  const target = asVec3(cam.target as number[] | undefined, [0, 0.65, 0]);
  const fov = cam.fov ?? 40;

  return (
    <div
      className={className ?? "h-72 w-full rounded-xl overflow-hidden border"}
      style={{
        borderColor: palette.gridLine,
        background: palette.background,
        boxShadow: "inset 0 1px 2px rgba(26,26,31,0.06)",
      }}
    >
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position, fov, near: 0.1, far: 50 }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.05,
        }}
        onCreated={({ camera }) => {
          camera.lookAt(target[0], target[1], target[2]);
        }}
      >
        <Suspense fallback={null}>
          <SceneContents
            scene={scene}
            palette={palette}
            sliderValues={sliderValues}
            visualizationType={visualizationType}
            autoRotate={autoRotate}
            onChange={onChange}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}

export function sceneFromSpec(spec: VisualizationSpec): SceneSpec | null {
  if (spec.renderMode !== "3d" || !spec.scene?.objects?.length) return null;
  return spec.scene;
}
