/** @deprecated use design-tokens.ts — thin re-export for older imports */
export {
  PALETTES,
  resolvePalette,
  classLevelToDefaultPalette,
  type Palette,
  type PaletteId,
} from "./design-tokens";
import { PALETTES } from "./design-tokens";

export const MATH_TOKENS = {
  primary: PALETTES["middle-6to8"].primary,
  secondary: PALETTES["middle-6to8"].secondary,
  accent: PALETTES["middle-6to8"].accent,
  background: PALETTES["middle-6to8"].background,
  text: PALETTES["middle-6to8"].text,
  muted: PALETTES["middle-6to8"].muted,
  grid: PALETTES["middle-6to8"].gridLine,
  danger: "#DC2626",
  fill: `${PALETTES["middle-6to8"].primary}33`,
  fillStrong: `${PALETTES["middle-6to8"].primary}88`,
} as const;

export function resolveMathColors(colors?: {
  primary?: string;
  secondary?: string;
  accent?: string;
  background?: string;
  text?: string;
} | null) {
  const p = PALETTES["middle-6to8"];
  return {
    primary: colors?.primary || p.primary,
    secondary: colors?.secondary || p.secondary,
    accent: colors?.accent || p.accent,
    background: colors?.background || p.background,
    text: colors?.text || p.text,
    muted: p.muted,
    grid: p.gridLine,
    danger: "#DC2626",
    fill: `${p.primary}33`,
    fillStrong: `${p.primary}88`,
  };
}
