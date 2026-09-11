/**
 * Desmos / GeoGebra / Brilliant–grade design tokens.
 * All palettes share a light canvas — grade bands differ in typography/density only.
 * Signature object colors are fixed across every lesson (pattern recognition).
 */

export type PaletteId =
  | "primary-1to2"
  | "primary-3to5"
  | "middle-6to8"
  | "technical-9to10";

export interface Palette {
  background: string;
  surface: string;
  primary: string;
  secondary: string;
  accent: string;
  text: string;
  muted: string;
  gridLine: string;
  axisLine: string;
  shadow: string;
  /** Touch / type scale hints for grade band */
  bodyPx: number;
  touchMinPx: number;
}

/** Fixed signature colors (Desmos-style) — never per-lesson */
export const SIGNATURE = {
  blue: "#2d70b3",
  red: "#c74440",
  green: "#388c46",
  purple: "#6042a6",
  orange: "#e08a2b",
} as const;

export const MOTION = {
  dragSettle: { type: "spring" as const, stiffness: 300, damping: 25 },
  correctMs: 250,
  incorrectMs: 300,
};

const LIGHT_BASE = {
  background: "#fafafa",
  surface: "#ffffff",
  text: "#1a1a1f",
  muted: "#6b6c76",
  gridLine: "#e8e8ec",
  axisLine: "#c4c5cb",
  shadow: "#1a1a1f",
  primary: SIGNATURE.blue,
  secondary: SIGNATURE.green,
  accent: SIGNATURE.orange,
};

export const PALETTES: Record<PaletteId, Palette> = {
  "primary-1to2": {
    ...LIGHT_BASE,
    background: "#ffffff",
    bodyPx: 18,
    touchMinPx: 44,
  },
  "primary-3to5": {
    ...LIGHT_BASE,
    bodyPx: 16,
    touchMinPx: 40,
  },
  "middle-6to8": {
    ...LIGHT_BASE,
    bodyPx: 15,
    touchMinPx: 36,
  },
  // Precision via denser layout + monospace numerals — still light canvas
  "technical-9to10": {
    ...LIGHT_BASE,
    background: "#fafafa",
    surface: "#ffffff",
    primary: SIGNATURE.blue,
    secondary: SIGNATURE.purple,
    accent: SIGNATURE.orange,
    text: "#1a1a1f",
    muted: "#5c5d66",
    gridLine: "#e8e8ec",
    axisLine: "#c4c5cb",
    shadow: "#1a1a1f",
    bodyPx: 14,
    touchMinPx: 32,
  },
};

const CLASS_NUM_RE = /(?:class[_\s]*)?(\d{1,2})/i;

export function parseClassNum(classLevel?: string | null): number {
  if (!classLevel) return 6;
  const m = CLASS_NUM_RE.exec(classLevel.replace(/_/g, " "));
  if (m) return Math.max(1, Math.min(10, parseInt(m[1], 10)));
  return 6;
}

export function classLevelToDefaultPalette(classLevel?: string | null): PaletteId {
  const n = parseClassNum(classLevel);
  if (n <= 2) return "primary-1to2";
  if (n <= 5) return "primary-3to5";
  if (n <= 8) return "middle-6to8";
  return "technical-9to10";
}

export function resolvePalette(opts: {
  paletteId?: string | null;
  classLevel?: string | null;
  colors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
    background?: string;
    text?: string;
  } | null;
}): Palette {
  const id = (opts.paletteId as PaletteId) || classLevelToDefaultPalette(opts.classLevel);
  const base = { ...(PALETTES[id] ?? PALETTES["middle-6to8"]) };
  const c = opts.colors;
  if (c) {
    if (c.primary) base.primary = c.primary;
    if (c.secondary) base.secondary = c.secondary;
    if (c.accent) base.accent = c.accent;
    if (c.background) base.background = c.background;
    if (c.text) base.text = c.text;
  }
  return base;
}

export function resolveObjectColor(token: string | null | undefined, palette: Palette): string {
  if (!token) return palette.primary;
  const key = token.toLowerCase();
  if (key === "primary" || key === "blue") return SIGNATURE.blue;
  if (key === "secondary" || key === "green") return SIGNATURE.green;
  if (key === "accent" || key === "orange") return SIGNATURE.orange;
  if (key === "red") return SIGNATURE.red;
  if (key === "purple") return SIGNATURE.purple;
  if (key in palette) return (palette as unknown as Record<string, string>)[key];
  if (key.startsWith("#")) return token;
  return palette.primary;
}

export function svgPolishDefs(palette: Palette, idPrefix = "math") {
  return { idPrefix, palette };
}
