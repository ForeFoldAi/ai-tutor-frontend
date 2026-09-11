/**
 * Science lab SVG renderers — one polished diagram per ontology visualizationType.
 * biology/chem molecules use CPK colors where noted — not signature palette.
 */
import { cn } from "@/lib/utils";
import { SIGNATURE } from "@/components/math-lesson/design-tokens";
import type { ExperimentViewMode } from "@/types/science-experiment";
import { CPK } from "../science-tokens";
import { computeMotion } from "../experiment-utils";

export interface LabProps {
  experimentType: string;
  view: ExperimentViewMode;
  values: Record<string, number>;
  animating: boolean;
  colorHint?: string;
  onObservation?: (text: string) => void;
}

function LabSvg({
  children,
  className,
  viewBox = "0 0 360 220",
}: {
  children: React.ReactNode;
  className?: string;
  viewBox?: string;
}) {
  return (
    <svg viewBox={viewBox} className={cn("w-full h-full max-h-[280px] block", className)} role="img">
      <defs>
        <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#1a1a1f" />
        </marker>
      </defs>
      {children}
    </svg>
  );
}

function Lbl({
  x,
  y,
  children,
  size = 11,
  anchor = "middle",
  fill = "#1a1a1f",
}: {
  x: number;
  y: number;
  children: React.ReactNode;
  size?: number;
  anchor?: "start" | "middle" | "end";
  fill?: string;
}) {
  return (
    <text x={x} y={y} textAnchor={anchor} fontSize={size} fill={fill} fontFamily="system-ui, sans-serif">
      {children}
    </text>
  );
}

function Sci({ eq, note }: { eq: string; note?: string }) {
  return (
    <foreignObject x="20" y="30" width="320" height="160">
      <div className="flex flex-col items-center justify-center h-full text-center px-4 space-y-2">
        <p className="text-base font-mono font-semibold" style={{ color: SIGNATURE.blue }}>{eq}</p>
        {note ? <p className="text-xs text-[#6b6c76]">{note}</p> : null}
      </div>
    </foreignObject>
  );
}

function pulse(on: boolean) {
  return on ? "animate-pulse" : "";
}

function bounce(on: boolean) {
  return on ? "animate-bounce" : "";
}

type LabFn = React.FC<LabProps>;

function tri(real: LabFn, micro: LabFn, sci: LabFn): LabFn {
  return (p) => {
    if (p.view === "microscopic") return micro(p);
    if (p.view === "scientific") return sci(p);
    return real(p);
  };
}

// ─── human-body-basics ───────────────────────────────────────────────────────
const HumanBodyBasicsLab = tri(
  ({ animating }) => (
    <LabSvg>
      <circle cx="180" cy="55" r="28" fill="#fcd9b6" stroke="#c4a882" />
      <Lbl x={180} y={60}>Head</Lbl>
      <rect x="165" y="83" width="30" height="45" rx="8" fill="#2d70b3" opacity="0.85" />
      <Lbl x={180} y={108}>Torso</Lbl>
      <line x1="165" y1="95" x2="130" y2="120" stroke="#388c46" strokeWidth="8" strokeLinecap="round" />
      <line x1="195" y1="95" x2="230" y2="120" stroke="#388c46" strokeWidth="8" strokeLinecap="round" />
      <Lbl x={120} y={130}>Arm</Lbl>
      <line x1="175" y1="128" x2="165" y2="175" stroke="#6042a6" strokeWidth="8" strokeLinecap="round" />
      <line x1="185" y1="128" x2="195" y2="175" stroke="#6042a6" strokeWidth="8" strokeLinecap="round" />
      <Lbl x={180} y={195}>Legs</Lbl>
      <circle cx="145" cy="48" r="4" fill="#1a1a1f" className={pulse(animating)} />
      <circle cx="215" cy="48" r="4" fill="#1a1a1f" className={pulse(animating)} />
      <Lbl x={145} y={38} size={9}>Eye</Lbl>
      <Lbl x={215} y={38} size={9}>Eye</Lbl>
    </LabSvg>
  ),
  () => (
    <LabSvg>
      <circle cx="180" cy="110" r="60" fill="#fff5f5" stroke="#c74440" strokeWidth="2" />
      <Lbl x={180} y={115}>Brain (control centre)</Lbl>
      <path d="M120 140 Q180 170 240 140" fill="none" stroke="#388c46" strokeWidth="3" />
      <Lbl x={180} y={185}>Spinal cord</Lbl>
      <circle cx="140" cy="100" r="8" fill="#2d70b3" className="animate-pulse" />
      <Lbl x={140} y={88} size={9}>Nerve</Lbl>
    </LabSvg>
  ),
  () => <LabSvg><Sci eq="Senses → Brain → Response" note="Eyes, ears, skin send signals to the brain." /></LabSvg>,
);

// ─── plant-anatomy-lab ───────────────────────────────────────────────────────
const PlantAnatomyLab = tri(
  ({ values, animating }) => {
    const { values: m } = computeMotion("plant-anatomy-lab", values);
    return (
      <LabSvg>
        <rect x="0" y="170" width="360" height="50" fill="#84cc16" opacity="0.5" />
        <Lbl x={40} y={195}>Soil</Lbl>
        <path d="M180 170 L180 120" stroke="#8B4513" strokeWidth="6" />
        <Lbl x={200} y={145}>Stem</Lbl>
        <ellipse cx="180" cy="175" rx="25" ry="8" fill="#a16207" />
        <Lbl x={230} y={178} size={9}>Root</Lbl>
        <ellipse cx="180" cy="90" rx="55" ry="35" fill="#388c46" className={pulse(animating)} />
        <Lbl x={180} y={95}>Leaf</Lbl>
        <circle cx="280" cy="50" r="22" fill="#fde047" className={pulse(animating)} />
        <Lbl x={280} y={55}>Sun</Lbl>
        <Lbl x={180} y={210} size={10}>O₂ rate: {m.oxygen?.toFixed?.(1) ?? "—"}</Lbl>
      </LabSvg>
    );
  },
  ({ values, animating }) => {
    const { values: m } = computeMotion("plant-anatomy-lab", values);
    return (
      <LabSvg>
        <ellipse cx="180" cy="110" rx="90" ry="50" fill="#86efac" opacity="0.4" />
        <Lbl x={180} y={115}>Chloroplast</Lbl>
        {[0, 1, 2, 3, 4].map((i) => (
          <circle key={i} cx={100 + i * 40} cy={100 + (i % 2) * 20} r={5 + (m.rate ?? 0) / 20} fill="#388c46" className={bounce(animating)} style={{ animationDelay: `${i * 0.1}s` }} />
        ))}
        <Lbl x={180} y={185}>CO₂ in → O₂ out (rate {m.rate?.toFixed?.(1) ?? "—"})</Lbl>
      </LabSvg>
    );
  },
  () => <LabSvg><Sci eq="6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂" note="Photosynthesis in chloroplasts" /></LabSvg>,
);

// ─── animal-habitat-explorer ─────────────────────────────────────────────────
const AnimalHabitatLab = tri(
  ({ values, animating }) => (
    <LabSvg>
      <rect x="0" y="140" width="120" height="80" fill="#84cc16" />
      <Lbl x={60} y={165}>Forest</Lbl>
      <rect x="120" y="160" width="120" height="60" fill="#0ea5e9" opacity="0.6" />
      <Lbl x={180} y={190}>Water</Lbl>
      <rect x="240" y="150" width="120" height="70" fill="#fde68a" />
      <Lbl x={300} y={185}>Desert</Lbl>
      <circle cx={60 + (values.habitat ?? 1) * 120} cy="120" r="18" fill="#6042a6" className={bounce(animating)} />
      <Lbl x={180} y={115}>Animal adapts to habitat</Lbl>
    </LabSvg>
  ),
  () => (
    <LabSvg>
      <rect x="40" y="60" width="280" height="120" rx="8" fill="#f0fdf4" stroke="#388c46" />
      <Lbl x={180} y={90}>Camouflage / body cover</Lbl>
      <Lbl x={180} y={115}>Feet &amp; limbs for movement</Lbl>
      <Lbl x={180} y={140}>Diet matched to food source</Lbl>
    </LabSvg>
  ),
  () => <LabSvg><Sci eq="Adaptation = trait + environment" note="Form fits function in each habitat." /></LabSvg>,
);

// ─── concept-explorer ────────────────────────────────────────────────────────
const ConceptExplorerLab = tri(
  ({ values, animating }) => (
    <LabSvg>
      <rect x="40" y="50" width="100" height="60" rx="8" fill={SIGNATURE.blue} opacity="0.2" stroke={SIGNATURE.blue} />
      <rect x="160" y="50" width="100" height="60" rx="8" fill={SIGNATURE.green} opacity="0.2" stroke={SIGNATURE.green} />
      <rect x="280" y="50" width="60" height="60" rx="8" fill={SIGNATURE.orange} opacity="0.2" stroke={SIGNATURE.orange} className={pulse(animating)} />
      <Lbl x={90} y={85}>Idea A</Lbl>
      <Lbl x={210} y={85}>Idea B</Lbl>
      <Lbl x={310} y={85}>Link</Lbl>
      <path d="M140 80 L160 80 M260 80 L280 80" stroke="#6b6c76" strokeWidth="2" markerEnd="url(#arr)" />
      <Lbl x={180} y={170}>Explore: {values.value1 ?? 5} + {values.value2 ?? 3} = {(values.value1 ?? 5) + (values.value2 ?? 3)}</Lbl>
    </LabSvg>
  ),
  () => (
    <LabSvg>
      <circle cx="180" cy="110" r="70" fill="none" stroke={SIGNATURE.purple} strokeWidth="2" strokeDasharray="6 4" />
      <Lbl x={180} y={115}>Hidden details inside</Lbl>
    </LabSvg>
  ),
  ({ values }) => <LabSvg><Sci eq={`Effect = ${values.value1 ?? 5} × ${values.value2 ?? 3}`} note="Concept relationships" /></LabSvg>,
);

// ─── food-chain-simple ───────────────────────────────────────────────────────
const FoodChainLab = tri(
  ({ animating }) => (
    <LabSvg>
      <circle cx="70" cy="110" r="25" fill="#388c46" className={pulse(animating)} />
      <Lbl x={70} y={115} size={9}>Plant</Lbl>
      <path d="M95 110 H130" stroke="#1a1a1f" strokeWidth="2" markerEnd="url(#arr)" />
      <circle cx="165" cy="110" r="22" fill="#e08a2b" />
      <Lbl x={165} y={115} size={9}>Herbivore</Lbl>
      <path d="M187 110 H222" stroke="#1a1a1f" strokeWidth="2" />
      <circle cx="255" cy="110" r="24" fill="#6042a6" />
      <Lbl x={255} y={115} size={9}>Carnivore</Lbl>
      <Lbl x={180} y={180}>Energy flows one way →</Lbl>
    </LabSvg>
  ),
  () => (
    <LabSvg>
      <Lbl x={180} y={60}>Sunlight → chemical energy in plants</Lbl>
      <rect x="80" y="80" width="200" height="30" fill="#fde047" opacity="0.5" />
      <Lbl x={180} y={100}>Glucose in cells</Lbl>
      <Lbl x={180} y={150}>~10% passed to next level</Lbl>
    </LabSvg>
  ),
  () => <LabSvg><Sci eq="Energy: Sun → Producer → Consumer" note="Food chains show who eats whom." /></LabSvg>,
);

// ─── water-cycle-animator ────────────────────────────────────────────────────
const WaterCycleLab = tri(
  ({ values, animating }) => {
    const { values: m } = computeMotion("water-cycle-animator", values);
    return (
      <LabSvg>
        <rect x="0" y="160" width="360" height="60" fill="#2d70b3" opacity="0.35" />
        <Lbl x={50} y={190}>Ocean / Lake</Lbl>
        <circle cx="300" cy="45" r="28" fill="#fde047" className={pulse(animating)} />
        <Lbl x={300} y={50}>Sun</Lbl>
        <ellipse cx="120" cy="70" rx="55" ry="22" fill="#e2e8f0" />
        <Lbl x={120} y={75}>Cloud</Lbl>
        {animating ? (
          <>
            <path d="M120 160 Q120 100 120 70" stroke="#38bdf8" strokeWidth="2" fill="none" className="animate-pulse" />
            <path d="M200 70 Q220 120 200 160" stroke="#38bdf8" strokeWidth="2" fill="none" strokeDasharray="4 4" className="animate-pulse" />
          </>
        ) : null}
        <Lbl x={180} y={210} size={10}>Evap: {m.evaporation?.toFixed?.(1) ?? "—"}</Lbl>
      </LabSvg>
    );
  },
  () => (
    <LabSvg>
      {[...Array(12)].map((_, i) => (
        <circle key={i} cx={60 + (i % 4) * 70} cy={70 + Math.floor(i / 4) * 40} r="4" fill="#2d70b3" className="animate-bounce" style={{ animationDelay: `${i * 0.05}s` }} />
      ))}
      <Lbl x={180} y={180}>H₂O molecules evaporate from surface</Lbl>
    </LabSvg>
  ),
  () => <LabSvg><Sci eq="Evaporation → Condensation → Precipitation" note="Solar energy drives the cycle." /></LabSvg>,
);

// ─── human-body-system-3d ────────────────────────────────────────────────────
const HumanBodySystemLab = tri(
  ({ animating }) => (
    <LabSvg>
      <ellipse cx="180" cy="100" rx="50" ry="70" fill="#fcd9b6" stroke="#c4a882" />
      <path d="M155 90 Q180 120 205 90" fill="#c74440" opacity="0.7" className={pulse(animating)} />
      <Lbl x={180} y={105}>Heart</Lbl>
      <path d="M160 130 L200 130 L190 160 L170 160 Z" fill="#388c46" opacity="0.5" />
      <Lbl x={180} y={148}>Lungs</Lbl>
      <Lbl x={180} y={195}>Organ systems work together</Lbl>
    </LabSvg>
  ),
  ({ values }) => {
    const hr = values.heart_rate ?? 72;
    return (
      <LabSvg>
        <circle cx="180" cy="110" r="45" fill="#fee2e2" stroke="#c74440" strokeWidth="2" className="animate-pulse" />
        <Lbl x={180} y={115}>Heart chambers</Lbl>
        <Lbl x={180} y={180}>{hr} bpm — blood carries O₂ &amp; nutrients</Lbl>
      </LabSvg>
    );
  },
  ({ values }) => <LabSvg><Sci eq={`Heart rate ≈ ${values.heart_rate ?? 72} bpm`} note="Circulatory + respiratory systems linked." /></LabSvg>,
);

// ─── life-cycle-animator ─────────────────────────────────────────────────────
const LifeCycleLab = tri(
  ({ values, animating }) => {
    const stage = Math.floor((values.stage ?? 1) % 4);
    const labels = ["Egg", "Larva", "Pupa", "Adult"];
    return (
      <LabSvg>
        {[0, 1, 2, 3].map((i) => (
          <g key={i}>
            <circle cx={70 + i * 80} cy="110" r="28" fill={i === stage ? SIGNATURE.orange : "#e8e8ec"} stroke={SIGNATURE.green} className={i === stage && animating ? "animate-pulse" : ""} />
            <Lbl x={70 + i * 80} y={115} size={9}>{labels[i]}</Lbl>
          </g>
        ))}
        <path d="M98 110 H122 M178 110 H202 M258 110 H282" stroke="#6b6c76" strokeWidth="2" />
      </LabSvg>
    );
  },
  () => (
    <LabSvg>
      <Lbl x={180} y={80}>Cells divide &amp; specialise</Lbl>
      <circle cx="180" cy="120" r="40" fill="#dcfce7" stroke="#388c46" />
      <Lbl x={180} y={125}>Growth inside</Lbl>
    </LabSvg>
  ),
  () => <LabSvg><Sci eq="Life cycle: birth → growth → reproduction" note="Metamorphosis in insects &amp; amphibians." /></LabSvg>,
);

// ─── weather-climate-simulator ───────────────────────────────────────────────
const WeatherClimateLab = tri(
  ({ values, animating }) => (
    <LabSvg>
      <rect x="0" y="150" width="360" height="70" fill="#84cc16" opacity="0.4" />
      <circle cx="80" cy="60" r="30" fill="#fde047" className={pulse(animating)} />
      <Lbl x={80} y={65}>Sun</Lbl>
      <ellipse cx="220" cy="70" rx="70" ry="28" fill="#94a3b8" opacity="0.7" />
      <Lbl x={220} y={75}>Cloud</Lbl>
      <Lbl x={180} y={130}>Temp: {values.temperature ?? 25}°C | Humidity: {values.humidity ?? 60}%</Lbl>
      <path d="M300 100 L340 80 L320 120 Z" fill="#2d70b3" className={animating ? "animate-bounce" : ""} />
      <Lbl x={330} y={140} size={9}>Wind</Lbl>
    </LabSvg>
  ),
  () => (
    <LabSvg>
      <Lbl x={180} y={90}>Warm air rises → low pressure</Lbl>
      <Lbl x={180} y={120}>Cool air sinks → high pressure</Lbl>
      <path d="M100 140 Q180 100 260 140" fill="none" stroke="#2d70b3" strokeWidth="2" />
      <Lbl x={180} y={170}>Convection cells</Lbl>
    </LabSvg>
  ),
  ({ values }) => <LabSvg><Sci eq={`Dew point ∝ humidity (${values.humidity ?? 60}%)`} note="Weather = short-term; climate = long-term pattern." /></LabSvg>,
);

// ─── simple-machines-lab ─────────────────────────────────────────────────────
const SimpleMachinesLab = tri(
  ({ values, animating }) => {
    const load = values.load ?? 10;
    const effort = values.effort ?? 4;
    const ma = load / Math.max(1, effort);
    return (
      <LabSvg>
        <polygon points="80,160 280,160 180,140" fill="#94a3b8" />
        <Lbl x={180} y={175}>Fulcrum</Lbl>
        <rect x="100" y="110" width="160" height="12" fill="#6042a6" transform={`rotate(${-5 + effort} 180 116)`} className={animating ? "transition-transform" : ""} />
        <rect x="110" y="85" width="40" height="30" fill="#2d70b3" />
        <Lbl x={130} y={105} size={9}>Load</Lbl>
        <Lbl x={250} y={100}>Effort</Lbl>
        <Lbl x={180} y={210} size={10}>MA ≈ {ma.toFixed(1)}</Lbl>
      </LabSvg>
    );
  },
  () => <LabSvg><Lbl x={180} y={110}>Lever: force × distance trade-off</Lbl></LabSvg>,
  ({ values }) => <LabSvg><Sci eq={`MA = Load / Effort = ${((values.load ?? 10) / Math.max(1, values.effort ?? 4)).toFixed(1)}`} note="Wheel, pulley, inclined plane save effort." /></LabSvg>,
);

// ─── states-of-matter-lab ────────────────────────────────────────────────────
const StatesOfMatterLab = tri(
  ({ values, animating }) => {
    const { values: m } = computeMotion("states-of-matter-lab", values);
    const temp = values.temperature ?? 20;
    const state = temp < 0 ? "Solid" : temp < 100 ? "Liquid" : "Gas";
    return (
      <LabSvg>
        <rect x="130" y="60" width="100" height="100" rx="6" fill="#fff" stroke="#2d70b3" strokeWidth="2" />
        <Lbl x={180} y={55}>{state}</Lbl>
        {[...Array(8)].map((_, i) => (
          <circle key={i} cx={150 + (i % 4) * 20} cy={90 + Math.floor(i / 4) * 35} r={state === "Gas" ? 5 : 7} fill={SIGNATURE.blue} className={animating ? "animate-bounce" : ""} style={{ animationDuration: `${1 / (m.particle_speed ?? 1)}s` }} />
        ))}
        <Lbl x={180} y={190}>T = {temp}°C | speed {m.particle_speed?.toFixed?.(2) ?? "—"}</Lbl>
      </LabSvg>
    );
  },
  ({ values, animating }) => (
    <LabSvg>
      {[...Array(15)].map((_, i) => (
        <circle key={i} cx={40 + (i % 5) * 60} cy={50 + Math.floor(i / 5) * 45} r="5" fill="#2d70b3" className={animating ? "animate-pulse" : ""} />
      ))}
      <Lbl x={180} y={200}>Particles {values.temperature ?? 20}°C — {values.temperature ?? 20 < 0 ? "vibrate in place" : "move freely"}</Lbl>
    </LabSvg>
  ),
  () => <LabSvg><Sci eq="Solid ⇌ Liquid ⇌ Gas (heat)" note="Particle model of matter." /></LabSvg>,
);

// ─── ecosystem-lab ─────────────────────────────────────────────────────────────
const EcosystemLab = tri(
  ({ values, animating }) => (
    <LabSvg>
      <rect x="20" y="40" width="320" height="140" rx="12" fill="#dcfce7" stroke="#388c46" />
      <circle cx="80" cy="100" r="20" fill="#388c46" className={pulse(animating)} />
      <Lbl x={80} y={105} size={9}>Producer</Lbl>
      <circle cx="180" cy="90" r="18" fill="#e08a2b" />
      <Lbl x={180} y={95} size={9}>Consumer</Lbl>
      <circle cx="280" cy="110" r="16" fill="#6042a6" />
      <Lbl x={280} y={115} size={9}>Decomposer</Lbl>
      <Lbl x={180} y={170}>Biodiversity: {values.biodiversity ?? 50}%</Lbl>
    </LabSvg>
  ),
  () => <LabSvg><Lbl x={180} y={110}>Nutrients cycle; energy flows one way</Lbl></LabSvg>,
  () => <LabSvg><Sci eq="Producers + Consumers + Decomposers" note="Balance keeps ecosystems healthy." /></LabSvg>,
);

// ─── material-sorting-lab ────────────────────────────────────────────────────
const MaterialSortingLab = tri(
  ({ values }) => (
    <LabSvg>
      <rect x="40" y="50" width="80" height="100" fill="#fef3c7" stroke="#e08a2b" />
      <Lbl x={80} y={105}>Magnetic</Lbl>
      <rect x="140" y="50" width="80" height="100" fill="#dbeafe" stroke="#2d70b3" />
      <Lbl x={180} y={105}>Non-magnetic</Lbl>
      <rect x="240" y="50" width="80" height="100" fill="#f3e8ff" stroke="#6042a6" />
      <Lbl x={280} y={105}>Insulator</Lbl>
      <Lbl x={180} y={190}>Sorted: {Math.round(values.sorted ?? 60)}%</Lbl>
    </LabSvg>
  ),
  () => <LabSvg><Lbl x={180} y={110}>Properties: lustre, hardness, conductivity</Lbl></LabSvg>,
  () => <LabSvg><Sci eq="Group by observable properties" note="Classification before naming." /></LabSvg>,
);

// ─── separation-techniques-lab ───────────────────────────────────────────────
const SeparationLab = tri(
  ({ values, animating }) => (
    <LabSvg>
      <path d="M150 50 L170 50 L180 130 L140 130 Z" fill="#e2e8f0" stroke="#94a3b8" />
      <Lbl x={160} y={145}>Filter funnel</Lbl>
      <circle cx="160" cy="100" r="8" fill="#6042a6" className={animating ? "animate-bounce" : ""} />
      <rect x="130" y="155" width="60" height="40" fill="#2d70b3" opacity="0.3" />
      <Lbl x={160} y={178}>Filtrate</Lbl>
      <Lbl x={280} y={100}>Purity: {Math.round(values.purity ?? 75)}%</Lbl>
    </LabSvg>
  ),
  () => <LabSvg><Lbl x={180} y={110}>Particle size decides method</Lbl></LabSvg>,
  () => <LabSvg><Sci eq="Filtration | Evaporation | Decantation" note="Separate mixtures by physical means." /></LabSvg>,
);

// ─── reaction-simulator ──────────────────────────────────────────────────────
const ReactionSimulatorLab = tri(
  ({ values, animating }) => {
    const { values: m } = computeMotion("reaction-simulator", values);
    return (
      <LabSvg>
        <rect x="120" y="55" width="40" height="6" fill="#94a3b8" transform="rotate(-10 140 58)" />
        {animating ? (
          <>
            <ellipse cx="180" cy="45" rx="35" ry="20" fill="#fde047" opacity="0.8" className="animate-pulse" />
            <ellipse cx="180" cy="40" rx="20" ry="12" fill="#fff" />
          </>
        ) : null}
        <Lbl x={180} y={150}>Mg + O₂ → bright flame</Lbl>
        <Lbl x={180} y={175} size={10}>Rate: {m.reaction_rate?.toFixed?.(2) ?? "—"}</Lbl>
      </LabSvg>
    );
  },
  () => (
    <LabSvg>
      <circle cx="120" cy="100" r="14" fill="#909090" /><Lbl x={120} y={130} size={9}>Mg</Lbl>
      <circle cx="180" cy="100" r="12" fill="#ff0d0d" /><Lbl x={180} y={130} size={9}>O</Lbl>
      <path d="M200 100 H240" stroke="#e08a2b" strokeWidth="2" />
      <circle cx="280" cy="100" r="16" fill="#cbd5e1" /><Lbl x={280} y={130} size={9}>MgO</Lbl>
    </LabSvg>
  ),
  ({ values }) => {
    const { values: m } = computeMotion("reaction-simulator", values);
    return <LabSvg><Sci eq="2Mg + O₂ → 2MgO" note={`Rate ∝ T × conc → ${m.reaction_rate?.toFixed?.(2) ?? "—"}`} /></LabSvg>;
  },
);

// ─── motion-grapher ────────────────────────────────────────────────────────────
const MotionGrapherLab = tri(
  ({ values, animating }) => {
    const d = values.distance ?? 50;
    return (
      <LabSvg>
        <line x1="40" y1="170" x2="320" y2="170" stroke="#1a1a1f" strokeWidth="2" />
        <rect x={40 + d * 2.5} y="140" width="30" height="30" fill={SIGNATURE.blue} className={animating ? "animate-bounce" : ""} />
        <Lbl x={55 + d * 2.5} y={135}>Object</Lbl>
        <polyline points="40,50 120,90 200,70 320,110" fill="none" stroke={SIGNATURE.red} strokeWidth="2" />
        <Lbl x={180} y={40}>Distance–time graph</Lbl>
      </LabSvg>
    );
  },
  () => <LabSvg><Lbl x={180} y={110}>Position changes each instant</Lbl></LabSvg>,
  ({ values }) => {
    const { values: m } = computeMotion("motion-grapher", values);
    return <LabSvg><Sci eq={`v = Δs/Δt ≈ ${m.velocity?.toFixed?.(2) ?? "—"} m/s`} note={`a = ${m.acceleration?.toFixed?.(2) ?? "—"} m/s²`} /></LabSvg>;
  },
);

// ─── light-optics-bench ────────────────────────────────────────────────────────
const LightOpticsLab = tri(
  ({ values, animating }) => {
    const ang = values.angle ?? values.incident_angle ?? 45;
    return (
      <LabSvg>
        <line x1="180" y1="180" x2="180" y2="40" stroke="#94a3b8" strokeWidth="3" />
        <Lbl x={195} y={110}>Mirror</Lbl>
        <line x1="60" y1="120" x2="180" y2="120" stroke="#e08a2b" strokeWidth="2" className={pulse(animating)} />
        <line x1="180" y1="120" x2="260" y2="120" stroke="#e08a2b" strokeWidth="2" strokeDasharray="4 2" />
        <Lbl x={100} y={115} size={9}>Incident {ang}°</Lbl>
        <Lbl x={220} y={115} size={9}>Reflect {ang}°</Lbl>
      </LabSvg>
    );
  },
  () => <LabSvg><Lbl x={180} y={110}>Light travels in straight lines (rays)</Lbl></LabSvg>,
  ({ values }) => {
    const { values: m } = computeMotion("light-optics-bench", values);
    return <LabSvg><Sci eq="∠i = ∠r" note={`Incident ${m.incident ?? 45}° → Reflected ${m.reflected ?? 45}°`} /></LabSvg>;
  },
);

// ─── circuit-builder ───────────────────────────────────────────────────────────
const CircuitBuilderLab = tri(
  ({ values, animating }) => {
    const { values: m } = computeMotion("circuit-builder", values);
    const glow = m.current > 0.3;
    return (
      <LabSvg>
        <rect x="40" y="80" width="35" height="35" fill="#334155" rx="4" /><Lbl x={57} y={102} size={9} fill="#fff">−</Lbl>
        <rect x="285" y="80" width="35" height="35" fill="#334155" rx="4" /><Lbl x={302} y={102} size={9} fill="#fff">+</Lbl>
        <path d="M75 97 H130 V70 H230 V97 H285" fill="none" stroke="#64748b" strokeWidth="3" />
        <circle cx="180" cy="70" r="14" fill={glow && animating ? "#fde047" : "#fef3c7"} className={glow && animating ? "animate-pulse" : ""} />
        <Lbl x={180} y={55}>Bulb</Lbl>
        <Lbl x={180} y={150}>I = {m.current?.toFixed?.(2) ?? "—"} A</Lbl>
      </LabSvg>
    );
  },
  ({ animating }) => (
    <LabSvg>
      <line x1="50" y1="110" x2="310" y2="110" stroke="#64748b" strokeWidth="4" />
      {animating ? [...Array(10)].map((_, i) => (
        <circle key={i} cx={60 + i * 25} cy="110" r="3" fill="#e08a2b" className="animate-pulse" />
      )) : null}
      <Lbl x={180} y={140}>Electron drift (conventional current opposite)</Lbl>
    </LabSvg>
  ),
  ({ values }) => {
    const { values: m } = computeMotion("circuit-builder", values);
    return <LabSvg><Sci eq="V = I × R" note={`P = ${m.power?.toFixed?.(2) ?? "—"} W`} /></LabSvg>;
  },
);

// ─── magnet-field-visualizer ───────────────────────────────────────────────────
const MagnetFieldLab = tri(
  ({ values, animating }) => {
    const { values: m } = computeMotion("magnet-field-visualizer", values);
    return (
      <LabSvg>
        <rect x="120" y="90" width="120" height="40" fill="#c74440" rx="4" />
        <rect x="120" y="90" width="60" height="40" fill="#2d70b3" />
        <Lbl x={150} y={115} fill="#fff" size={10}>N</Lbl>
        <Lbl x={210} y={115} fill="#fff" size={10}>S</Lbl>
        {[0, 1, 2, 3].map((i) => (
          <path key={i} d={`M${60 + i * 80} 50 Q180 ${30 + i * 15} ${300 - i * 80} 50`} fill="none" stroke="#6042a6" strokeWidth="1.5" className={animating ? "animate-pulse" : ""} />
        ))}
        <Lbl x={180} y={180}>Field: {m.field_strength?.toFixed?.(1) ?? "—"}</Lbl>
      </LabSvg>
    );
  },
  () => <LabSvg><Lbl x={180} y={110}>Magnetic domains aligned in material</Lbl></LabSvg>,
  ({ values }) => <LabSvg><Sci eq="B ∝ 1/d²" note={`Distance ${values.distance ?? 3} cm`} /></LabSvg>,
);

// ─── microscope-lab ────────────────────────────────────────────────────────────
const MicroscopeLab = tri(
  ({ values, animating }) => (
    <LabSvg>
      <rect x="150" y="40" width="60" height="120" fill="#64748b" rx="4" />
      <circle cx="180" cy="100" r="25" fill="#fff" stroke="#2d70b3" strokeWidth="2" />
      <circle cx="180" cy="100" r="8" fill="#388c46" className={pulse(animating)} />
      <Lbl x={180} y={175}>Magnification ×{values.magnification ?? 100}</Lbl>
    </LabSvg>
  ),
  () => (
    <LabSvg>
      <circle cx="180" cy="110" r="50" fill="#fef9c3" stroke="#ca8a04" />
      <circle cx="165" cy="100" r="6" fill="#388c46" /><circle cx="195" cy="115" r="5" fill="#6042a6" />
      <Lbl x={180} y={180}>Bacteria / cells visible</Lbl>
    </LabSvg>
  ),
  () => <LabSvg><Sci eq="Resolution ∝ λ / NA" note="Microscope reveals microscopic world." /></LabSvg>,
);

// ─── acid-base-indicator-lab ───────────────────────────────────────────────────
const AcidBaseLab = tri(
  ({ values, animating, colorHint }) => {
    const { values: m, colorHint: ch } = computeMotion("acid-base-indicator-lab", values);
    const fill = colorHint ?? ch ?? "#22c55e";
    return (
      <LabSvg>
        <path d="M150 45 L175 45 L185 140 L140 140 Z" fill="#e2e8f0" stroke="#94a3b8" />
        <rect x="148" y="80" width="29" height="55" fill={fill} className={animating ? "transition-all duration-500" : ""} />
        <Lbl x={180} y={165}>Indicator colour</Lbl>
        <text x={180} y={190} textAnchor="middle" fontSize={11} fill={fill} fontFamily="system-ui, sans-serif">
          pH = {m.ph?.toFixed?.(1) ?? "—"}
        </text>
      </LabSvg>
    );
  },
  ({ values }) => {
    const ph = values.ph ?? 7;
    return (
      <LabSvg>
        {[...Array(12)].map((_, i) => (
          <text key={i} x={50 + (i % 4) * 70} y={70 + Math.floor(i / 4) * 40} fontSize="14" fill={ph < 7 ? "#c74440" : "#2d70b3"}>{ph < 7 ? "H⁺" : "OH⁻"}</text>
        ))}
      </LabSvg>
    );
  },
  ({ values }) => <LabSvg><Sci eq="pH = −log₁₀[H⁺]" note={`Current pH ${(values.ph ?? 7).toFixed(1)}`} /></LabSvg>,
);

// ─── cell-structure-3d ───────────────────────────────────────────────────────────
const CellStructureLab = tri(
  ({ animating }) => (
    <LabSvg>
      <ellipse cx="180" cy="110" rx="100" ry="65" fill="#fef9c3" stroke="#388c46" strokeWidth="2" />
      <circle cx="180" cy="110" r="28" fill="#6042a6" opacity="0.6" className={pulse(animating)} />
      <Lbl x={180} y={115} fill="#fff">Nucleus</Lbl>
      <ellipse cx="120" cy="90" rx="25" ry="12" fill="#388c46" opacity="0.7" />
      <Lbl x={120} y={95} size={9}>Chloroplast</Lbl>
      <Lbl x={180} y={190}>Plant cell</Lbl>
    </LabSvg>
  ),
  () => (
    <LabSvg>
      <circle cx="180" cy="110" r="60" fill="#fff5f5" stroke="#c74440" />
      <Lbl x={180} y={115}>Nuclear membrane</Lbl>
      <circle cx="180" cy="110" r="20" fill="#6042a6" /><Lbl x={180} y={115} fill="#fff" size={9}>DNA</Lbl>
    </LabSvg>
  ),
  () => <LabSvg><Sci eq="Cell = membrane + cytoplasm + organelles" note="Basic unit of life." /></LabSvg>,
);

// ─── crystal-lattice-3d ──────────────────────────────────────────────────────────
const CrystalLatticeLab = tri(
  ({ animating }) => (
    <LabSvg>
      {[0, 1, 2].map((row) =>
        [0, 1, 2, 3].map((col) => (
          <circle key={`${row}-${col}`} cx={80 + col * 50} cy={60 + row * 45} r="10" fill={col % 2 ? CPK.Na : CPK.Cl} stroke="#1a1a1f" className={animating ? "animate-pulse" : ""} style={{ animationDelay: `${(row + col) * 0.05}s` }} />
        )),
      )}
      <Lbl x={180} y={200}>Ionic lattice (NaCl)</Lbl>
    </LabSvg>
  ),
  () => <LabSvg><Lbl x={180} y={110}>Ions in fixed positions</Lbl></LabSvg>,
  () => <LabSvg><Sci eq="Metal + Non-metal → Ionic compound" note="Strong electrostatic forces." /></LabSvg>,
);

// ─── combustion-flame-lab ────────────────────────────────────────────────────────
const CombustionFlameLab = tri(
  ({ values, animating }) => {
    const rate = values.rate ?? 50;
    return (
    <LabSvg>
      <rect x="160" y="120" width="40" height="8" fill="#94a3b8" />
      {animating ? (
        <>
          <ellipse cx="180" cy="90" rx="30" ry="35" fill="#e08a2b" opacity="0.8" className="animate-pulse" />
          <ellipse cx="180" cy="75" rx="18" ry="22" fill="#fde047" />
          <ellipse cx="180" cy="60" rx="8" ry="12" fill="#38bdf8" />
        </>
      ) : (
        <ellipse cx="180" cy="100" rx="15" ry="20" fill="#f97316" opacity="0.5" />
      )}
      <Lbl x={180} y={155}>Bunsen flame zones</Lbl>
      <Lbl x={180} y={175} size={9}>Blue inner = hottest | rate {rate}%</Lbl>
    </LabSvg>
    );
  },
  () => <LabSvg><Lbl x={180} y={110}>Fuel vapour + O₂ → CO₂ + H₂O + heat</Lbl></LabSvg>,
  ({ values }) => <LabSvg><Sci eq="Fuel + O₂ → CO₂ + H₂O + Energy" note={`Combustion rate ${values.rate ?? 50}%`} /></LabSvg>,
);

// ─── electrolysis-lab ────────────────────────────────────────────────────────────
const ElectrolysisLab = tri(
  ({ values, animating }) => {
    const { values: m } = computeMotion("electrolysis-lab", values);
    return (
      <LabSvg>
        <rect x="100" y="70" width="160" height="90" fill="#dbeafe" stroke="#2d70b3" rx="4" />
        <rect x="130" y="50" width="8" height="110" fill="#6042a6" />
        <rect x="222" y="50" width="8" height="110" fill="#c74440" />
        <Lbl x={134} y={45} size={9}>Cathode −</Lbl>
        <Lbl x={226} y={45} size={9}>Anode +</Lbl>
        {animating ? (
          <>
            <circle cx="134" cy="100" r="4" fill="#38bdf8" className="animate-bounce" />
            <circle cx="226" cy="100" r="4" fill="#fde047" className="animate-bounce" />
          </>
        ) : null}
        <Lbl x={180} y={180}>Gas: {m.gas_volume?.toFixed?.(1) ?? "—"} mL</Lbl>
      </LabSvg>
    );
  },
  () => <LabSvg><Lbl x={180} y={110}>Ions move to electrodes</Lbl></LabSvg>,
  ({ values }) => {
    const { values: m } = computeMotion("electrolysis-lab", values);
    return <LabSvg><Sci eq="I = V/R" note={`Current ${m.current?.toFixed?.(2) ?? "—"} A`} /></LabSvg>;
  },
);

// ─── force-pressure-lab ──────────────────────────────────────────────────────────
const ForcePressureLab = tri(
  ({ values, animating }) => {
    const { values: m } = computeMotion("force-pressure-lab", values);
    const area = values.area ?? 10;
    const force = values.force ?? 20;
    return (
      <LabSvg>
        <rect x="120" y="130" width="120" height="20" fill="#94a3b8" />
        <rect x="140" y="90" width={area * 4} height="40" fill={SIGNATURE.blue} className={animating ? "animate-pulse" : ""} />
        <Lbl x={180} y={115}>Block</Lbl>
        <path d="M180 50 L180 85" stroke="#c74440" strokeWidth="3" markerEnd="url(#arr)" />
        <Lbl x={195} y={70}>F = {force} N</Lbl>
        <Lbl x={180} y={175}>P = {m.pressure?.toFixed?.(1) ?? "—"} Pa</Lbl>
      </LabSvg>
    );
  },
  () => <LabSvg><Lbl x={180} y={110}>Force spreads over contact area</Lbl></LabSvg>,
  ({ values }) => {
    const { values: m } = computeMotion("force-pressure-lab", values);
    return <LabSvg><Sci eq="P = F/A" note={`a = ${m.acceleration?.toFixed?.(2) ?? "—"} m/s² (F=ma)`} /></LabSvg>;
  },
);

// ─── sound-wave-lab ────────────────────────────────────────────────────────────────
const SoundWaveLab = tri(
  ({ values, animating }) => {
    const freq = values.frequency ?? 440;
    const amp = values.amplitude ?? 50;
    const pts = Array.from({ length: 40 }, (_, i) => {
      const x = 40 + i * 7;
      const y = 110 + Math.sin(i * freq / 200) * (amp / 3);
      return `${x},${y}`;
    }).join(" ");
    return (
      <LabSvg>
        <polyline points={pts} fill="none" stroke={SIGNATURE.blue} strokeWidth="2" className={animating ? "animate-pulse" : ""} />
        <Lbl x={180} y={40}>Waveform</Lbl>
        <Lbl x={180} y={190}>f = {freq} Hz | A = {amp}</Lbl>
      </LabSvg>
    );
  },
  () => <LabSvg><Lbl x={180} y={110}>Compressions &amp; rarefactions in medium</Lbl></LabSvg>,
  ({ values }) => {
    const { values: m } = computeMotion("sound-wave-lab", values);
    return <LabSvg><Sci eq="v = f × λ" note={`λ = ${m.wavelength?.toFixed?.(3) ?? "—"} m`} /></LabSvg>;
  },
);

// ─── solar-system-3d ───────────────────────────────────────────────────────────────
const SolarSystemLab = tri(
  ({ animating }) => (
    <LabSvg>
      <circle cx="180" cy="110" r="25" fill="#fde047" className={pulse(animating)} />
      <Lbl x={180} y={115}>Sun</Lbl>
      <ellipse cx="180" cy="110" rx="90" ry="45" fill="none" stroke="#94a3b8" strokeDasharray="4 4" />
      <circle cx="270" cy="110" r="10" fill="#2d70b3" className={animating ? "animate-spin" : ""} style={{ transformOrigin: "270px 110px", animationDuration: "8s" }} />
      <Lbl x={270} y={95} size={9}>Earth</Lbl>
      <circle cx="120" cy="110" r="6" fill="#c74440" />
      <Lbl x={120} y={100} size={9}>Mars</Lbl>
      <Lbl x={180} y={200} size={10}>Not to true scale</Lbl>
    </LabSvg>
  ),
  () => <LabSvg><Lbl x={180} y={110}>Gravity keeps planets in orbit</Lbl></LabSvg>,
  ({ values }) => {
    const { values: m } = computeMotion("solar-system-3d", values);
    return <LabSvg><Sci eq="F = GMm/r²" note={`Orbital period ≈ ${m.period?.toFixed?.(1) ?? "—"} (relative)`} /></LabSvg>;
  },
);

// ─── molecule-builder-3d (CPK colors) ───────────────────────────────────────────
const MoleculeBuilderLab = tri(
  ({ animating }) => (
    <LabSvg>
      {/* CPK: O red, H white, C grey — do not remap to signature palette */}
      <line x1="180" y1="80" x2="180" y2="130" stroke="#6b6c76" strokeWidth="4" />
      <circle cx="180" cy="70" r="18" fill={CPK.O} stroke="#1a1a1f" className={pulse(animating)} />
      <Lbl x={180} y={75} fill="#fff">O</Lbl>
      <circle cx="180" cy="140" r="14" fill={CPK.H} stroke="#1a1a1f" />
      <Lbl x={180} y={145}>H</Lbl>
      <circle cx="140" cy="140" r="14" fill={CPK.H} stroke="#1a1a1f" />
      <Lbl x={140} y={145}>H</Lbl>
      <Lbl x={180} y={190}>H₂O — bent shape</Lbl>
    </LabSvg>
  ),
  () => (
    <LabSvg>
      <circle cx="160" cy="100" r="16" fill={CPK.O} /><circle cx="200" cy="100" r="14" fill={CPK.H} />
      <circle cx="180" cy="130" r="14" fill={CPK.H} />
      <Lbl x={180} y={170}>Shared electron pairs (covalent)</Lbl>
    </LabSvg>
  ),
  () => <LabSvg><Sci eq="H–O–H bond angle ≈ 104.5°" note="CPK atom colours" /></LabSvg>,
);

// ─── atom-structure-3d ───────────────────────────────────────────────────────────
const AtomStructureLab = tri(
  ({ values, animating }) => (
    <LabSvg>
      <circle cx="180" cy="110" r="8" fill="#6042a6" />
      <Lbl x={180} y={115} size={9}>Nucleus</Lbl>
      <circle cx="180" cy="110" r="35" fill="none" stroke="#2d70b3" strokeDasharray="4 2" className={animating ? "animate-spin" : ""} style={{ transformOrigin: "180px 110px", animationDuration: "6s" }} />
      <circle cx="180" cy="110" r="60" fill="none" stroke="#388c46" strokeDasharray="4 2" />
      <circle cx="215" cy="110" r="4" fill="#2d70b3" className={pulse(animating)} />
      <Lbl x={180} y={190}>Shell {values.shell ?? 2} | Z = {values.atomic_number ?? 6}</Lbl>
    </LabSvg>
  ),
  () => <LabSvg><Lbl x={180} y={110}>Protons + neutrons in nucleus; electrons in shells</Lbl></LabSvg>,
  () => <LabSvg><Sci eq="2n² electrons per shell (max)" note="Bohr model (simplified)." /></LabSvg>,
);

// ─── gravitation-orbit-simulator ───────────────────────────────────────────────────
const GravitationOrbitLab = tri(
  ({ values, animating }) => (
    <LabSvg>
      <circle cx="180" cy="110" r="20" fill="#fde047" />
      <Lbl x={180} y={115} size={9}>Star</Lbl>
      <ellipse cx="180" cy="110" rx={80 + (values.distance ?? 50)} ry="40" fill="none" stroke="#2d70b3" />
      <circle cx={180 + 80 + (values.distance ?? 50) * 0.5} cy="110" r="12" fill="#388c46" className={animating ? "animate-pulse" : ""} />
      <Lbl x={180} y={190}>Mass ↑ → orbit tighter</Lbl>
    </LabSvg>
  ),
  () => <LabSvg><Lbl x={180} y={110}>Gravitational pull provides centripetal force</Lbl></LabSvg>,
  ({ values }) => {
    const { values: m } = computeMotion("gravitation-orbit-simulator", values);
    return <LabSvg><Sci eq="v = √(GM/r)" note={`v ≈ ${m.orbital_velocity?.toFixed?.(2) ?? "—"} (rel.)`} /></LabSvg>;
  },
);

// ─── energy-transformation-lab ─────────────────────────────────────────────────────
const EnergyTransformLab = tri(
  ({ animating }) => (
    <LabSvg>
      <circle cx="60" cy="110" r="22" fill="#fde047" className={pulse(animating)} /><Lbl x={60} y={115} size={9}>Sun</Lbl>
      <rect x="110" y="95" width="50" height="30" fill="#388c46" /><Lbl x={135} y={115} size={9}>Panel</Lbl>
      <rect x="180" y="95" width="50" height="30" fill="#2d70b3" /><Lbl x={205} y={115} size={9}>Wire</Lbl>
      <circle cx="280" cy="110" r="18" fill="#fde047" className={animating ? "animate-pulse" : ""} /><Lbl x={280} y={115} size={9}>Bulb</Lbl>
      <path d="M82 110 H110 M160 110 H180 M230 110 H262" stroke="#e08a2b" strokeWidth="2" strokeDasharray="6 4" className={animating ? "animate-pulse" : ""} />
    </LabSvg>
  ),
  () => <LabSvg><Lbl x={180} y={110}>Energy converts; total conserved (ideal)</Lbl></LabSvg>,
  ({ values }) => {
    const { values: m } = computeMotion("energy-transformation-lab", values);
    return <LabSvg><Sci eq="Efficiency = useful out / total in" note={`η ≈ ${m.efficiency?.toFixed?.(0) ?? "—"}%`} /></LabSvg>;
  },
);

// ─── tissue-explorer-3d ────────────────────────────────────────────────────────────
const TissueExplorerLab = tri(
  ({ animating }) => (
    <LabSvg>
      <rect x="60" y="60" width="80" height="100" fill="#fecaca" stroke="#c74440" className={pulse(animating)} />
      <Lbl x={100} y={115}>Muscle</Lbl>
      <rect x="150" y="60" width="60" height="100" fill="#f5f5f4" stroke="#78716c" />
      <Lbl x={180} y={115}>Bone</Lbl>
      <rect x="220" y="60" width="80" height="100" fill="#bfdbfe" stroke="#2d70b3" />
      <Lbl x={260} y={115}>Epithelial</Lbl>
      <Lbl x={180} y={190}>Animal tissues — real-world colours</Lbl>
    </LabSvg>
  ),
  () => <LabSvg><Lbl x={180} y={110}>Cells with similar structure &amp; function</Lbl></LabSvg>,
  () => <LabSvg><Sci eq="Tissue → Organ → Organ system" note="Hierarchy in multicellular organisms." /></LabSvg>,
);

// ─── disease-transmission-simulator (factual, non-graphic) ───────────────────────
function HumanFigure({
  x,
  y,
  tint = "#388c46",
  sick = false,
}: {
  x: number;
  y: number;
  tint?: string;
  sick?: boolean;
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle cx="0" cy="-36" r="14" fill={sick ? "#fecaca" : "#fcd9b6"} stroke="#c4a882" />
      <rect x="-13" y="-20" width="26" height="34" rx="7" fill={sick ? "#c74440" : tint} />
      <line x1="-13" y1="-10" x2="-26" y2="6" stroke="#fcd9b6" strokeWidth="6" strokeLinecap="round" />
      <line x1="13" y1="-10" x2="26" y2="6" stroke="#fcd9b6" strokeWidth="6" strokeLinecap="round" />
      <line x1="-6" y1="14" x2="-10" y2="40" stroke="#6042a6" strokeWidth="7" strokeLinecap="round" />
      <line x1="6" y1="14" x2="10" y2="40" stroke="#6042a6" strokeWidth="7" strokeLinecap="round" />
    </g>
  );
}

const DISEASE_MODES = ["Air / cough", "Touch", "Insect bite"] as const;

function DiseasePath({ mode, animating }: { mode: number; animating: boolean }) {
  // Distinct path per mode so the slider change is obvious
  if (mode === 1) {
    return (
      <>
        <path d="M118 100 H242" stroke="#6042a6" strokeWidth="3" markerEnd="url(#arr)" />
        <Lbl x={180} y={88} size={10}>Hands touch</Lbl>
        {animating ? (
          <circle r="7" fill="#c74440">
            <animateMotion dur="1.6s" repeatCount="2" path="M118 100 H242" />
          </circle>
        ) : null}
      </>
    );
  }
  if (mode === 2) {
    return (
      <>
        <path d="M120 70 Q180 20 240 70" fill="none" stroke="#e08a2b" strokeWidth="2.5" strokeDasharray="5 4" markerEnd="url(#arr)" />
        <Lbl x={180} y={38} size={10}>Insect flies</Lbl>
        {/* simple mosquito mark */}
        <ellipse cx="180" cy="48" rx="10" ry="5" fill="#1a1a1f" opacity="0.7" className={animating ? "animate-bounce" : ""} />
        {animating ? (
          <circle r="6" fill="#c74440">
            <animateMotion dur="2s" repeatCount="2" path="M120 70 Q180 20 240 70" />
          </circle>
        ) : null}
      </>
    );
  }
  // air / cough — floating droplets
  return (
    <>
      <path d="M120 85 H240" stroke="#2d70b3" strokeWidth="2.5" strokeDasharray="6 4" markerEnd="url(#arr)" />
      <Lbl x={180} y={72} size={10}>Air droplets</Lbl>
      {[0, 1, 2].map((i) => (
        <circle
          key={i}
          cx={140 + i * 35}
          cy={85 - (i % 2) * 10}
          r={4 + (i % 2)}
          fill="#2d70b3"
          opacity="0.85"
          className={animating ? "animate-pulse" : ""}
        />
      ))}
      {animating ? (
        <circle r="6" fill="#c74440">
          <animateMotion dur="1.8s" repeatCount="2" path="M120 85 H240" />
        </circle>
      ) : null}
    </>
  );
}

const DiseaseTransmissionLab = tri(
  ({ values, animating }) => {
    const { values: m } = computeMotion("disease-transmission-simulator", values);
    const mode = Math.min(2, Math.max(0, Math.round(m.mode ?? 0)));
    const label = DISEASE_MODES[mode] ?? DISEASE_MODES[0];
    return (
      <LabSvg>
        <HumanFigure x={90} y={110} tint="#388c46" sick={animating} />
        <HumanFigure x={270} y={110} tint="#2d70b3" sick={animating} />
        <DiseasePath mode={mode} animating={animating} />
        <Lbl x={180} y={175} size={13}>{label}</Lbl>
      </LabSvg>
    );
  },
  ({ values, animating }) => {
    const { values: m } = computeMotion("disease-transmission-simulator", values);
    return (
      <LabSvg>
        <circle cx="120" cy="110" r="18" fill="#c74440" className={animating ? "animate-pulse" : ""} />
        <Lbl x={120} y={115} size={9} fill="#fff">Germ</Lbl>
        <path d="M145 110 H220" stroke="#6042a6" strokeWidth="2" strokeDasharray="4 3" markerEnd="url(#arr)" />
        <circle cx="250" cy="110" r="28" fill="#fcd9b6" stroke="#c4a882" />
        <Lbl x={250} y={115} size={9}>Body</Lbl>
        <Lbl x={180} y={175} size={11}>Tiny germs can enter the body</Lbl>
        <Lbl x={180} y={195} size={10}>Spread chance ≈ {Math.round(m.chance_of_spread ?? 0)}%</Lbl>
      </LabSvg>
    );
  },
  ({ values }) => {
    const { values: m } = computeMotion("disease-transmission-simulator", values);
    return (
      <LabSvg>
        <Sci eq="Stop the path → stop the spread" note={`Chance of spread ≈ ${Math.round(m.chance_of_spread ?? 0)}%`} />
      </LabSvg>
    );
  },
);

// ─── periodic-table-explorer ───────────────────────────────────────────────────────
const PeriodicTableLab = tri(
  ({ values }) => {
    const z = values.atomic_number ?? 6;
    return (
      <LabSvg>
        <rect x="120" y="70" width="120" height="80" fill="#fff" stroke="#6042a6" strokeWidth="2" rx="4" />
        <Lbl x={180} y={100} size={20}>{z}</Lbl>
        <Lbl x={180} y={125}>C</Lbl>
        <Lbl x={180} y={145} size={9}>Carbon</Lbl>
        <Lbl x={180} y={190}>Period ↓ Group →</Lbl>
      </LabSvg>
    );
  },
  () => <LabSvg><Lbl x={180} y={110}>Proton number = atomic number</Lbl></LabSvg>,
  () => <LabSvg><Sci eq="Z = proton number" note="Elements arranged by increasing Z." /></LabSvg>,
);

// ─── eye-optics-3d ─────────────────────────────────────────────────────────────────
const EyeOpticsLab = tri(
  ({ animating }) => (
    <LabSvg>
      <ellipse cx="180" cy="110" rx="90" ry="50" fill="#fef3c7" stroke="#ca8a04" />
      <circle cx="220" cy="110" r="18" fill="#fff" stroke="#2d70b3" strokeWidth="2" />
      <Lbl x={220} y={115} size={9}>Lens</Lbl>
      <line x1="40" y1="110" x2="130" y2="110" stroke="#e08a2b" strokeWidth="2" className={pulse(animating)} />
      <line x1="130" y1="110" x2="220" y2="110" stroke="#e08a2b" strokeWidth="1" strokeDasharray="3 2" />
      <Lbl x={180} y={175}>Focus at retina</Lbl>
    </LabSvg>
  ),
  () => <LabSvg><Lbl x={180} y={110}>Cornea + lens bend light rays</Lbl></LabSvg>,
  ({ values }) => <LabSvg><Sci eq="1/f = 1/u + 1/v" note={`Power ${values.lens_power ?? 20} D (model)`} /></LabSvg>,
);

// ─── electromagnet-induction-lab ───────────────────────────────────────────────────
const ElectromagnetInductionLab = tri(
  ({ animating }) => (
    <LabSvg>
      <rect x="140" y="80" width="80" height="60" fill="none" stroke="#6042a6" strokeWidth="3" rx="8" />
      <Lbl x={180} y={115}>Coil</Lbl>
      <rect x="250" y="95" width="30" height="30" fill="#c74440" className={animating ? "animate-bounce" : ""} />
      <Lbl x={265} y={115} fill="#fff" size={9}>N</Lbl>
      <Lbl x={180} y={175}>Move magnet → induced current</Lbl>
    </LabSvg>
  ),
  () => <LabSvg><Lbl x={180} y={110}>Changing flux induces EMF (Lenz's law)</Lbl></LabSvg>,
  ({ values }) => {
    const { values: m } = computeMotion("electromagnet-induction-lab", values);
    return <LabSvg><Sci eq="ε = −dΦ/dt" note={`Induced I ≈ ${m.induced_current?.toFixed?.(2) ?? "—"} mA`} /></LabSvg>;
  },
);

// ─── heredity-punnett-lab ──────────────────────────────────────────────────────────
const HeredityPunnettLab = tri(
  ({ values }) => {
    const dom = values.dominant ?? 75;
    return (
      <LabSvg>
        <rect x="100" y="60" width="160" height="100" fill="#fff" stroke="#388c46" strokeWidth="2" />
        <line x1="180" y1="60" x2="180" y2="160" stroke="#388c46" />
        <line x1="100" y1="110" x2="260" y2="110" stroke="#388c46" />
        <Lbl x={140} y={90} size={10}>T</Lbl><Lbl x={220} y={90} size={10}>t</Lbl>
        <Lbl x={140} y={140} size={10}>T</Lbl><Lbl x={220} y={140} size={10}>t</Lbl>
        <Lbl x={180} y={190}>Dominant trait ≈ {dom}%</Lbl>
      </LabSvg>
    );
  },
  () => <LabSvg><Lbl x={180} y={110}>Alleles on chromosome pairs</Lbl></LabSvg>,
  () => <LabSvg><Sci eq="Punnett square → genotype ratios" note="T = tall, t = short (example)" /></LabSvg>,
);

// ─── SVG defs + registry ───────────────────────────────────────────────────────────
function LabFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full h-full min-h-[240px] flex items-center justify-center p-2">
      {children}
    </div>
  );
}

function wrapLab(Lab: LabFn): LabFn {
  return (p) => (
    <LabFrame>
      <Lab {...p} />
    </LabFrame>
  );
}

const BASE_RENDERERS: Record<string, LabFn> = {
  "human-body-basics": HumanBodyBasicsLab,
  "plant-anatomy-lab": PlantAnatomyLab,
  "animal-habitat-explorer": AnimalHabitatLab,
  "concept-explorer": ConceptExplorerLab,
  "food-chain-simple": FoodChainLab,
  "water-cycle-animator": WaterCycleLab,
  "human-body-system-3d": HumanBodySystemLab,
  "life-cycle-animator": LifeCycleLab,
  "weather-climate-simulator": WeatherClimateLab,
  "simple-machines-lab": SimpleMachinesLab,
  "states-of-matter-lab": StatesOfMatterLab,
  "ecosystem-lab": EcosystemLab,
  "material-sorting-lab": MaterialSortingLab,
  "separation-techniques-lab": SeparationLab,
  "reaction-simulator": ReactionSimulatorLab,
  "motion-grapher": MotionGrapherLab,
  "light-optics-bench": LightOpticsLab,
  "circuit-builder": CircuitBuilderLab,
  "electricity-circuit-lab": CircuitBuilderLab,
  "magnet-field-visualizer": MagnetFieldLab,
  "microscope-lab": MicroscopeLab,
  "acid-base-indicator-lab": AcidBaseLab,
  "titration-lab": AcidBaseLab,
  "cell-structure-3d": CellStructureLab,
  "crystal-lattice-3d": CrystalLatticeLab,
  "combustion-flame-lab": CombustionFlameLab,
  "electrolysis-lab": ElectrolysisLab,
  "force-pressure-lab": ForcePressureLab,
  "sound-wave-lab": SoundWaveLab,
  "solar-system-3d": SolarSystemLab,
  "molecule-builder-3d": MoleculeBuilderLab,
  "atom-structure-3d": AtomStructureLab,
  "gravitation-orbit-simulator": GravitationOrbitLab,
  "energy-transformation-lab": EnergyTransformLab,
  "tissue-explorer-3d": TissueExplorerLab,
  "disease-transmission-simulator": DiseaseTransmissionLab,
  "periodic-table-explorer": PeriodicTableLab,
  "eye-optics-3d": EyeOpticsLab,
  "electromagnet-induction-lab": ElectromagnetInductionLab,
  "heredity-punnett-lab": HeredityPunnettLab,
};

export const SCIENCE_LAB_RENDERERS: Record<string, React.FC<LabProps>> = Object.fromEntries(
  Object.entries(BASE_RENDERERS).map(([k, fn]) => [k, wrapLab(fn)]),
);

export function ScienceLabScene(props: LabProps & { experimentType: string }) {
  const Lab = SCIENCE_LAB_RENDERERS[props.experimentType] ?? SCIENCE_LAB_RENDERERS["concept-explorer"];
  return <Lab {...props} />;
}
