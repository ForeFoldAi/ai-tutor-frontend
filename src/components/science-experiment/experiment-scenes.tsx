/**
 * Animated experiment scenes — synchronized across three view modes.
 */
import { cn } from "@/lib/utils";
import type { ExperimentViewMode } from "@/types/science-experiment";
import { computeMotion } from "./experiment-utils";

interface SceneProps {
  experimentType: string;
  view: ExperimentViewMode;
  values: Record<string, number>;
  animating: boolean;
  colorHint?: string;
}

function SceneWrapper({ children, animating }: { children: React.ReactNode; animating: boolean }) {
  return (
    <div
      className={cn(
        "relative rounded-xl border border-sky-500/20 bg-gradient-to-b from-sky-50/80 to-emerald-50/40 dark:from-sky-950/30 dark:to-emerald-950/20 overflow-hidden min-h-[200px] flex items-center justify-center",
        animating && "ring-2 ring-sky-400/40",
      )}
    >
      {children}
    </div>
  );
}

function PhotosynthesisScene({ view, values, animating }: SceneProps) {
  const { values: m } = computeMotion("photosynthesis", values);
  const glow = animating ? "animate-pulse" : "";
  if (view === "microscopic") {
    return (
      <SceneWrapper animating={animating}>
        <svg viewBox="0 0 320 180" className="w-full max-w-md">
          <ellipse cx="160" cy="90" rx="100" ry="50" fill="#22c55e" opacity="0.3" />
          {[...Array(8)].map((_, i) => (
            <circle
              key={i}
              cx={80 + i * 30}
              cy={90 + Math.sin(i) * 20}
              r={6 + m.rate / 10}
              fill="#86efac"
              className={animating ? "animate-bounce" : ""}
              style={{ animationDelay: `${i * 0.1}s` }}
            />
          ))}
          <text x="160" y="165" textAnchor="middle" className="fill-foreground text-[10px]">
            Chloroplasts — CO₂ in, O₂ out (rate {m.rate.toFixed(1)})
          </text>
        </svg>
      </SceneWrapper>
    );
  }
  if (view === "scientific") {
    return (
      <SceneWrapper animating={animating}>
        <div className="text-center p-4 space-y-2">
          <p className="text-lg font-mono text-sky-700 dark:text-sky-300">6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂</p>
          <p className="text-sm text-muted-foreground">Rate ∝ light × CO₂</p>
          <p className="text-sm font-semibold">O₂: {m.oxygen.toFixed(1)} | Glucose: {m.glucose.toFixed(1)}</p>
        </div>
      </SceneWrapper>
    );
  }
  return (
    <SceneWrapper animating={animating}>
      <svg viewBox="0 0 320 180" className="w-full max-w-md">
        <rect x="0" y="130" width="320" height="50" fill="#84cc16" />
        <path d="M160 130 Q120 60 160 20 Q200 60 160 130" fill="#16a34a" className={glow} />
        <circle cx="200" cy="80" r="20" fill="#fde047" className={animating ? "animate-pulse" : ""} />
        {animating
          ? [...Array(5)].map((_, i) => (
              <circle
                key={i}
                cx={140 + i * 15}
                cy={100 - i * 8}
                r="4"
                fill="#38bdf8"
                className="animate-ping"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))
          : null}
      </svg>
    </SceneWrapper>
  );
}

function ChemicalReactionScene({ view, values, animating }: SceneProps) {
  const { values: m } = computeMotion("chemical-reaction", values);
  if (view === "microscopic") {
    return (
      <SceneWrapper animating={animating}>
        <svg viewBox="0 0 320 180" className="w-full max-w-md">
          <circle cx="100" cy="90" r="12" fill="#94a3b8" className={animating ? "animate-pulse" : ""} />
          <circle cx="140" cy="90" r="10" fill="#ef4444" className={animating ? "animate-pulse" : ""} />
          <text x="100" y="120" textAnchor="middle" className="fill-muted-foreground text-[9px]">Mg</text>
          <text x="140" y="120" textAnchor="middle" className="fill-muted-foreground text-[9px]">O₂</text>
          <path d="M180 90 L220 90" stroke="#f59e0b" strokeWidth="2" markerEnd="url(#arrow)" />
          <rect x="230" y="75" width="40" height="30" rx="4" fill="#e2e8f0" />
          <text x="250" y="95" textAnchor="middle" className="fill-foreground text-[9px]">MgO</text>
        </svg>
      </SceneWrapper>
    );
  }
  if (view === "scientific") {
    return (
      <SceneWrapper animating={animating}>
        <div className="text-center p-4 space-y-2">
          <p className="text-lg font-mono">2Mg + O₂ → 2MgO</p>
          <p className="text-sm">Combination reaction — heat & light released</p>
          <p className="font-semibold">Rate: {m.reaction_rate.toFixed(2)} | Energy: {m.energy.toFixed(1)} kJ</p>
        </div>
      </SceneWrapper>
    );
  }
  return (
    <SceneWrapper animating={animating}>
      <svg viewBox="0 0 320 180" className="w-full max-w-md">
        <rect x="120" y="60" width="80" height="8" fill="#cbd5e1" transform="rotate(-15 160 64)" />
        {animating ? (
          <>
            <ellipse cx="160" cy="50" rx="40" ry="25" fill="#fef08a" opacity="0.8" className="animate-pulse" />
            <ellipse cx="160" cy="45" rx="25" ry="15" fill="#fff" opacity="0.9" />
          </>
        ) : (
          <rect x="140" y="55" width="40" height="6" fill="#94a3b8" />
        )}
        <text x="160" y="150" textAnchor="middle" className="fill-muted-foreground text-[10px]">
          Magnesium ribbon burning
        </text>
      </svg>
    </SceneWrapper>
  );
}

function ElectricityScene({ view, values, animating }: SceneProps) {
  const { values: m } = computeMotion("electricity", values);
  const glow = m.current > 0.3;
  if (view === "scientific") {
    return (
      <SceneWrapper animating={animating}>
        <div className="text-center p-4 space-y-2">
          <p className="text-lg font-mono">V = I × R</p>
          <p className="font-semibold">I = {m.current.toFixed(2)} A | P = {m.power.toFixed(2)} W</p>
        </div>
      </SceneWrapper>
    );
  }
  if (view === "microscopic") {
    return (
      <SceneWrapper animating={animating}>
        <svg viewBox="0 0 320 180" className="w-full max-w-md">
          <line x1="40" y1="90" x2="280" y2="90" stroke="#64748b" strokeWidth="4" />
          {animating && glow
            ? [...Array(12)].map((_, i) => (
                <circle key={i} cx={50 + i * 20} cy="90" r="3" fill="#fbbf24" className="animate-pulse" />
              ))
            : null}
          <text x="160" y="120" textAnchor="middle" className="fill-muted-foreground text-[10px]">
            Electron drift in wire
          </text>
        </svg>
      </SceneWrapper>
    );
  }
  return (
    <SceneWrapper animating={animating}>
      <svg viewBox="0 0 320 180" className="w-full max-w-md">
        <rect x="30" y="70" width="40" height="40" fill="#334155" rx="4" />
        <text x="50" y="95" textAnchor="middle" className="fill-white text-[10px]">−</text>
        <rect x="250" y="70" width="40" height="40" fill="#334155" rx="4" />
        <text x="270" y="95" textAnchor="middle" className="fill-white text-[10px]">+</text>
        <path d="M80 90 H120 V70 H200 V90 H240" fill="none" stroke="#64748b" strokeWidth="3" />
        <circle cx="160" cy="70" r="15" fill={glow && animating ? "#fde047" : "#fef3c7"} className={glow && animating ? "animate-pulse" : ""} />
      </svg>
    </SceneWrapper>
  );
}

function AcidsBasesScene({ view, values, animating }: SceneProps) {
  const { colorHint, values: m } = computeMotion("acids-bases", values);
  const fill = colorHint ?? "#22c55e";
  if (view === "scientific") {
    return (
      <SceneWrapper animating={animating}>
        <div className="text-center p-4 space-y-2">
          <p className="text-lg font-mono">pH = −log₁₀[H⁺]</p>
          <p className="font-semibold text-2xl" style={{ color: fill }}>
            pH = {m.ph.toFixed(1)}
          </p>
        </div>
      </SceneWrapper>
    );
  }
  if (view === "microscopic") {
    return (
      <SceneWrapper animating={animating}>
        <svg viewBox="0 0 320 180" className="w-full max-w-md">
          {[...Array(15)].map((_, i) => (
            <text
              key={i}
              x={40 + (i % 5) * 50}
              y={50 + Math.floor(i / 5) * 40}
              className="text-[14px] font-bold"
              fill={m.ph < 7 ? "#ef4444" : "#3b82f6"}
            >
              {m.ph < 7 ? "H⁺" : "OH⁻"}
            </text>
          ))}
        </svg>
      </SceneWrapper>
    );
  }
  return (
    <SceneWrapper animating={animating}>
      <svg viewBox="0 0 320 180" className="w-full max-w-md">
        <path d="M130 40 L150 40 L160 130 L140 130 Z" fill="#e2e8f0" stroke="#94a3b8" />
        <rect x="138" y="70" width="24" height="55" fill={fill} className={animating ? "transition-all duration-500" : ""} />
        <text x="160" y="155" textAnchor="middle" className="fill-muted-foreground text-[10px]">
          Indicator colour changes with pH
        </text>
      </svg>
    </SceneWrapper>
  );
}

function WaterCycleScene({ view, values, animating }: SceneProps) {
  const { values: m } = computeMotion("water-cycle", values);
  if (view === "scientific") {
    return (
      <SceneWrapper animating={animating}>
        <div className="text-center p-4">
          <p className="text-sm">Solar energy drives evaporation → condensation → precipitation</p>
          <p className="font-semibold mt-2">Evap: {m.evaporation.toFixed(1)} | Cond: {m.condensation.toFixed(1)}</p>
        </div>
      </SceneWrapper>
    );
  }
  return (
    <SceneWrapper animating={animating}>
      <svg viewBox="0 0 320 180" className="w-full max-w-md">
        <rect x="0" y="120" width="320" height="60" fill="#0ea5e9" opacity="0.4" />
        <circle cx="260" cy="40" r="25" fill="#fde047" className={animating ? "animate-pulse" : ""} />
        <ellipse cx="100" cy="50" rx="50" ry="20" fill="#e2e8f0" opacity="0.8" />
        {animating ? (
          <>
            <path d="M100 120 Q100 80 100 50" stroke="#38bdf8" strokeWidth="2" fill="none" className="animate-pulse" />
            <path d="M200 50 Q220 80 200 120" stroke="#38bdf8" strokeWidth="2" fill="none" strokeDasharray="4 4" className="animate-pulse" />
          </>
        ) : null}
        {view === "microscopic" ? (
          <text x="160" y="100" textAnchor="middle" className="fill-sky-600 text-[9px]">
            H₂O molecules escaping surface
          </text>
        ) : null}
      </svg>
    </SceneWrapper>
  );
}

function GenericScene({ view, values, animating, experimentType }: SceneProps) {
  const { values: m } = computeMotion(experimentType, values);
  const labels = Object.entries(m).slice(0, 3);
  return (
    <SceneWrapper animating={animating}>
      <div className="text-center p-6 space-y-3">
        <div className={cn("w-16 h-16 rounded-full mx-auto bg-sky-400/30", animating && "animate-pulse")} />
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{view} view</p>
        {labels.map(([k, v]) => (
          <p key={k} className="text-sm">
            <span className="text-muted-foreground">{k}: </span>
            <span className="font-semibold">{typeof v === "number" ? v.toFixed(2) : v}</span>
          </p>
        ))}
      </div>
    </SceneWrapper>
  );
}

const SCENE_MAP: Partial<Record<string, React.FC<SceneProps>>> = {
  photosynthesis: PhotosynthesisScene,
  "chemical-reaction": ChemicalReactionScene,
  electricity: ElectricityScene,
  "acids-bases": AcidsBasesScene,
  "water-cycle": WaterCycleScene,
};

export function ExperimentScene(props: SceneProps) {
  const Scene = SCENE_MAP[props.experimentType] ?? GenericScene;
  return <Scene {...props} />;
}
