/**
 * Science motion engine — mirrors backend motion_engine.py for live readouts.
 */
import type { ExperimentSpec } from "@/types/science-experiment";
import { canonicalizeExperimentType } from "@/types/science-experiment";

export function defaultSliderValues(spec: ExperimentSpec): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of spec.sliders ?? []) {
    const v = Number(s.default ?? s.min ?? 0);
    out[s.id] = Number.isFinite(v) ? v : 0;
  }
  return out;
}

/** Resolve 0=air / 1=touch / 2=insect from whatever slider id the panel shipped. */
export function diseaseTransmissionMode(values: Record<string, number>): number {
  const raw = Number(
    values.mode ?? values.transmission_mode ?? values.transmissionMode ?? values.exposure,
  );
  if (!Number.isFinite(raw)) return 0;
  if (raw <= 2) return Math.min(2, Math.max(0, Math.round(raw)));
  // legacy 0–100 exposure slider
  return Math.min(2, Math.max(0, Math.round(raw / 50)));
}

export function computeMotion(
  experimentType: string,
  variables: Record<string, number>,
): { values: Record<string, number>; colorHint?: string } {
  const v = variables;
  const et = canonicalizeExperimentType(experimentType);

  if (et === "plant-anatomy-lab") {
    const rate = ((v.light ?? 50) * (v.co2 ?? 50)) / 100;
    return { values: { rate, oxygen: rate * 0.8, glucose: rate * 0.6 } };
  }
  if (et === "acid-base-indicator-lab" || et === "titration-lab") {
    const ph = v.ph ?? 7;
    const colorHint =
      ph < 3 ? "#ef4444" : ph < 6 ? "#f97316" : ph <= 8 ? "#22c55e" : ph <= 11 ? "#3b82f6" : "#8b5cf6";
    return { values: { ph }, colorHint };
  }
  if (et === "circuit-builder" || et === "electricity-circuit-lab") {
    const voltage = v.voltage ?? 6;
    const resistance = Math.max(1, v.resistance ?? 10);
    const current = voltage / resistance;
    return { values: { current, power: voltage * current } };
  }
  if (et === "reaction-simulator") {
    const rate = ((v.temperature ?? 25) / 25) * ((v.concentration ?? 50) / 50) * 10;
    return { values: { reaction_rate: rate, energy: rate * 4 } };
  }
  if (et === "states-of-matter-lab") {
    const temp = v.temperature ?? 20;
    const speed = temp < 0 ? 0.2 : temp < 100 ? 0.5 + temp / 200 : 1 + (temp - 100) / 50;
    return { values: { particle_speed: speed, temperature: temp } };
  }
  if (et === "force-pressure-lab" || et === "motion-grapher") {
    const force = v.force ?? 10;
    const mass = Math.max(1, v.mass ?? 5);
    const acceleration = force / mass;
    const area = Math.max(1, v.area ?? 10);
    return {
      values: {
        acceleration,
        velocity: acceleration * 2,
        pressure: force / area,
        distance: v.distance ?? acceleration * 10,
      },
    };
  }
  if (et === "human-body-system-3d") {
    const hr = v.heart_rate ?? 72;
    return { values: { heart_rate: hr, cycles: hr / 60 } };
  }
  if (et === "sound-wave-lab") {
    const freq = v.frequency ?? 440;
    return { values: { wavelength: 343 / Math.max(1, freq), loudness: v.amplitude ?? 50, frequency: freq } };
  }
  if (et === "water-cycle-animator") {
    const evap = ((v.temperature ?? 30) * (v.humidity ?? 60)) / 100;
    return { values: { evaporation: evap, condensation: evap * 0.7 } };
  }
  if (et === "magnet-field-visualizer") {
    const d = Math.max(1, v.distance ?? 3);
    return { values: { field_strength: ((v.strength ?? 80) / (d * d)) * 10 } };
  }
  if (et === "light-optics-bench") {
    const angle = v.angle ?? v.incident_angle ?? 45;
    const n = v.refractive_index ?? 1.33;
    const rad = (angle * Math.PI) / 180;
    const refracted = Math.min(90, Math.asin(Math.min(1, Math.sin(rad) / n)) * (180 / Math.PI));
    return { values: { incident: angle, reflected: angle, refracted: Math.round(refracted * 10) / 10 } };
  }
  if (et === "life-cycle-animator") {
    const days = v.days ?? 5;
    const moisture = v.moisture ?? 60;
    return { values: { germination: Math.min(100, (days * moisture) / 8), stage: v.stage ?? 1 } };
  }
  if (et === "electrolysis-lab") {
    const voltage = v.voltage ?? 6;
    const resistance = Math.max(1, v.resistance ?? 10);
    const current = voltage / resistance;
    return { values: { current, gas_volume: current * 2.5 } };
  }
  if (et === "solar-system-3d" || et === "gravitation-orbit-simulator") {
    const mass = v.mass ?? 1;
    const dist = Math.max(1, v.distance ?? 50);
    return {
      values: {
        period: Math.sqrt(dist ** 3 / mass) * 0.5,
        orbital_velocity: Math.sqrt(mass / dist) * 10,
      },
    };
  }
  if (et === "energy-transformation-lab") {
    const input = v.input_energy ?? 100;
    const loss = v.loss ?? 20;
    return { values: { efficiency: Math.max(0, 100 - loss), output: input * (1 - loss / 100) } };
  }
  if (et === "disease-transmission-simulator") {
    const mode = diseaseTransmissionMode(v);
    const chance = [35, 55, 40][mode] ?? 35;
    return { values: { chance_of_spread: chance, mode } };
  }
  if (et === "electromagnet-induction-lab") {
    const speed = v.speed ?? 50;
    return { values: { induced_current: speed * 0.4, flux_change: speed / 10 } };
  }
  if (et === "microscope-lab") {
    return { values: { magnification: v.magnification ?? 100, resolution: 100 / (v.magnification ?? 100) } };
  }
  if (et === "weather-climate-simulator") {
    return {
      values: {
        temperature: v.temperature ?? 25,
        humidity: v.humidity ?? 60,
        wind: v.wind ?? 15,
      },
    };
  }
  if (et === "simple-machines-lab") {
    const load = v.load ?? 10;
    const effort = Math.max(1, v.effort ?? 4);
    return { values: { mechanical_advantage: load / effort } };
  }
  if (et === "ecosystem-lab") {
    return { values: { biodiversity: v.biodiversity ?? 50, biomass: (v.biodiversity ?? 50) * 1.2 } };
  }
  if (et === "material-sorting-lab") {
    return { values: { sorted: v.sorted ?? 60, conductivity: v.conductivity ?? 40 } };
  }
  if (et === "separation-techniques-lab") {
    return { values: { purity: v.purity ?? 75, yield: (v.purity ?? 75) * 0.9 } };
  }
  if (et === "combustion-flame-lab") {
    return { values: { flame_temp: (v.rate ?? 50) * 4, co2: (v.rate ?? 50) * 0.6 } };
  }
  if (et === "human-body-basics") {
    return { values: { sensitivity: v.sensitivity ?? 50, response: (v.sensitivity ?? 50) * 0.8 } };
  }
  if (et === "animal-habitat-explorer") {
    return { values: { habitat_match: (v.habitat ?? 1) * 25, adaptation: v.adaptation ?? 70 } };
  }
  if (et === "food-chain-simple") {
    return { values: { energy_transfer: (v.level ?? 2) * 10, trophic_level: v.level ?? 2 } };
  }
  if (et === "cell-structure-3d") {
    return { values: { cell_size: v.size ?? 20, organelles: v.organelles ?? 5 } };
  }
  if (et === "crystal-lattice-3d") {
    return { values: { lattice_spacing: v.spacing ?? 2.8, ions: v.ions ?? 8 } };
  }
  if (et === "molecule-builder-3d") {
    return { values: { bonds: v.bonds ?? 2, atoms: v.atoms ?? 3 } };
  }
  if (et === "atom-structure-3d") {
    return { values: { atomic_number: v.atomic_number ?? 6, shell: v.shell ?? 2 } };
  }
  if (et === "periodic-table-explorer") {
    return { values: { atomic_number: v.atomic_number ?? 6, group: v.group ?? 14 } };
  }
  if (et === "tissue-explorer-3d") {
    return { values: { layers: v.layers ?? 3, cell_count: (v.layers ?? 3) * 1000 } };
  }
  if (et === "eye-optics-3d") {
    return { values: { focal_length: 100 / (v.lens_power ?? 20), lens_power: v.lens_power ?? 20 } };
  }
  if (et === "heredity-punnett-lab") {
    return { values: { dominant: v.dominant ?? 75, recessive: 100 - (v.dominant ?? 75) } };
  }
  if (et === "concept-explorer") {
    const a = v.value1 ?? 5;
    const b = v.value2 ?? 3;
    return { values: { sum: a + b, product: a * b } };
  }

  const a = v.value1 ?? 5;
  const b = v.value2 ?? 3;
  return { values: { sum: a + b, product: a * b } };
}

export function formatMotionValue(val: number, unit?: string): string {
  const rounded = Number.isInteger(val) ? String(val) : val.toFixed(2);
  return unit ? `${rounded} ${unit}` : rounded;
}

export function deriveObservation(
  experimentType: string,
  view: "realWorld" | "microscopic" | "scientific",
  values: Record<string, number>,
  spec?: ExperimentSpec,
): string {
  if (spec?.expectedObservation && view === "realWorld") return spec.expectedObservation;
  const { values: m, colorHint } = computeMotion(experimentType, values);
  const et = canonicalizeExperimentType(experimentType);

  if (view === "scientific" && spec?.threeViews?.scientific?.equation) {
    return spec.threeViews.scientific.equation;
  }
  if (view === "microscopic") {
    if (et === "plant-anatomy-lab") return `Chloroplast activity rate ${m.rate?.toFixed(1) ?? "—"} — CO₂ in, O₂ out.`;
    if (et === "circuit-builder") return `Electrons drift when the circuit is closed (I ≈ ${m.current?.toFixed(2) ?? "—"} A).`;
    if (et === "states-of-matter-lab") return `Particles move at speed ${m.particle_speed?.toFixed(2) ?? "—"} (model).`;
  }
  if (et === "acid-base-indicator-lab" && colorHint) {
    return `Solution pH is ${m.ph?.toFixed(1) ?? "—"} — indicator shows characteristic colour.`;
  }
  if (et === "water-cycle-animator") {
    return `Evaporation rate ${m.evaporation?.toFixed(1) ?? "—"} with current temperature and humidity.`;
  }
  if (et === "force-pressure-lab") {
    return `Block accelerates at ${m.acceleration?.toFixed(2) ?? "—"} m/s²; pressure on surface ${m.pressure?.toFixed(1) ?? "—"} Pa.`;
  }
  if (et === "disease-transmission-simulator") {
    const modes = ["through air (cough/sneeze)", "by touch", "by insect bite"];
    const mode = diseaseTransmissionMode(values);
    if (view === "microscopic") return "Germs are tiny — too small to see — but they can still make us ill.";
    if (view === "scientific") return "If we block the path, germs cannot reach the next person.";
    return `Germs can pass ${modes[mode]}. Chance of spread ≈ ${Math.round(m.chance_of_spread ?? 0)}%.`;
  }
  const first = Object.entries(m)[0];
  if (first) {
    const [k, val] = first;
    return `${k.replace(/_/g, " ")} reads ${typeof val === "number" ? val.toFixed(2) : val}.`;
  }
  return "Adjust the controls and watch what changes.";
}
