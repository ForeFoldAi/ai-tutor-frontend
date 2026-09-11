/** Safe evaluation of simple math formulas with slider/drag variables. */
export function evaluateFormula(
  formula: string,
  vars: Record<string, number>,
): number | null {
  let expr = formula.trim();
  if (!expr) return null;

  // Replace known variable names (longest first to avoid partial matches)
  const names = Object.keys(vars).sort((a, b) => b.length - a.length);
  for (const name of names) {
    expr = expr.replace(new RegExp(`\\b${name}\\b`, "g"), String(vars[name]));
  }

  // Normalize math symbols
  expr = expr
    .replace(/\^/g, "**")
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/π|pi/gi, String(Math.PI))
    .replace(/sqrt\s*\(/gi, "Math.sqrt(")
    .replace(/\btan\s*\(/gi, "Math.tan(")
    .replace(/\bsin\s*\(/gi, "Math.sin(")
    .replace(/\bcos\s*\(/gi, "Math.cos(");

  // Allow only safe characters
  if (!/^[0-9+\-*/().,\sMathsqrtancPie]+$/i.test(expr.replace(/Math\.(sqrt|tan|sin|cos)/g, ""))) {
    return null;
  }

  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function(`"use strict"; return (${expr});`);
    const result = fn();
    return typeof result === "number" && Number.isFinite(result) ? result : null;
  } catch {
    return null;
  }
}

export function formatCalcValue(value: number | null, unit = ""): string {
  if (value === null) return "—";
  const rounded =
    Math.abs(value) >= 1000
      ? value.toLocaleString(undefined, { maximumFractionDigits: 2 })
      : Math.round(value * 100) / 100;
  return unit ? `${rounded} ${unit}` : String(rounded);
}

export function defaultSliderValues(sliders: { id: string; default?: number; min?: number }[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of sliders) {
    out[s.id] = s.default ?? s.min ?? 0;
  }
  return out;
}

export function buildVariableMap(
  sliderValues: Record<string, number>,
  dragPositions: Record<string, { x: number; y: number }>,
): Record<string, number> {
  const vars: Record<string, number> = { ...sliderValues, pi: Math.PI, PI: Math.PI };
  for (const [id, pos] of Object.entries(dragPositions)) {
    vars[id] = pos.x;
    vars[`${id}X`] = pos.x;
    vars[`${id}Y`] = pos.y;
  }
  // Turn / angle slider aliases
  if (vars.turnSlider !== undefined) {
    vars.turn = vars.turnSlider;
    vars.quarters = vars.turnSlider;
  }
  // Common aliases
  if (vars.r !== undefined) vars.radius = vars.r;
  if (vars.radius !== undefined && vars.r === undefined) vars.r = vars.radius;
  if (vars.numerator !== undefined && vars.denominator !== undefined && vars.denominator !== 0) {
    vars.fraction = vars.numerator / vars.denominator;
  }
  return vars;
}
