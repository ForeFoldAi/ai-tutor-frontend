/**
 * Science motion engine — mirrors backend motion_engine.py for live readouts.
 */
import type { ExperimentSpec } from "@/types/science-experiment";

export function defaultSliderValues(spec: ExperimentSpec): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of spec.sliders ?? []) {
    out[s.id] = s.default ?? s.min ?? 0;
  }
  return out;
}

export function computeMotion(
  experimentType: string,
  variables: Record<string, number>,
): { values: Record<string, number>; colorHint?: string } {
  const v = variables;
  const et = experimentType.toLowerCase();

  if (et === "photosynthesis") {
    const rate = (v.light ?? 50) * (v.co2 ?? 50) / 100;
    return { values: { rate, oxygen: rate * 0.8, glucose: rate * 0.6 } };
  }
  if (et === "acids-bases") {
    const ph = v.ph ?? 7;
    const colorHint =
      ph < 3 ? "#ef4444" : ph < 6 ? "#f97316" : ph <= 8 ? "#22c55e" : ph <= 11 ? "#3b82f6" : "#8b5cf6";
    return { values: { ph }, colorHint };
  }
  if (et === "electricity") {
    const voltage = v.voltage ?? 6;
    const resistance = Math.max(1, v.resistance ?? 10);
    const current = voltage / resistance;
    return { values: { current, power: voltage * current } };
  }
  if (et === "chemical-reaction") {
    const rate = ((v.temperature ?? 25) / 25) * ((v.concentration ?? 50) / 50) * 10;
    return { values: { reaction_rate: rate, energy: rate * 4 } };
  }
  if (et === "states-of-matter") {
    const temp = v.temperature ?? 20;
    const speed = temp < 0 ? 0.2 : temp < 100 ? 0.5 + temp / 200 : 1 + (temp - 100) / 50;
    return { values: { particle_speed: speed } };
  }
  if (et === "force-motion") {
    const force = v.force ?? 10;
    const mass = Math.max(1, v.mass ?? 5);
    const acceleration = force / mass;
    return { values: { acceleration, velocity: acceleration * 2 } };
  }
  if (et === "plant-growth") {
    return { values: { height: (v.days ?? 7) * (v.water ?? 50) / 20 } };
  }
  if (et === "blood-circulation") {
    const hr = v.heart_rate ?? 72;
    return { values: { heart_rate: hr, cycles: hr / 60 } };
  }
  if (et === "sound") {
    const freq = v.frequency ?? 440;
    return { values: { wavelength: 343 / Math.max(1, freq), loudness: v.amplitude ?? 50 } };
  }
  if (et === "water-cycle") {
    const evap = (v.temperature ?? 30) * (v.humidity ?? 60) / 100;
    return { values: { evaporation: evap, condensation: evap * 0.7 } };
  }
  if (et === "magnetism") {
    const d = Math.max(1, v.distance ?? 3);
    return { values: { field_strength: (v.strength ?? 80) / (d * d) * 10 } };
  }
  const a = v.value1 ?? 5;
  const b = v.value2 ?? 3;
  return { values: { sum: a + b, product: a * b } };
}

export function formatMotionValue(val: number, unit?: string): string {
  const rounded = Number.isInteger(val) ? String(val) : val.toFixed(2);
  return unit ? `${rounded} ${unit}` : rounded;
}
