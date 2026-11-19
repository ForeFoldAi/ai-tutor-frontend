/**
 * Subject chrome accents — diagram colors use SIGNATURE / real-world conventions.
 * biology/chem molecules may use real-world CPK colors (O red, H white, C grey, N blue)
 * — do not "fix" to signature palette.
 */
import { SIGNATURE } from "@/components/math-lesson/design-tokens";

export const SUBJECT_ACCENT = {
  physics: SIGNATURE.blue,
  chemistry: SIGNATURE.purple,
  biology: SIGNATURE.green,
  evs: SIGNATURE.orange,
} as const;

export type ScienceSubject = keyof typeof SUBJECT_ACCENT;

export function subjectAccent(subject?: string): string {
  const key = (subject ?? "").trim().toLowerCase() as ScienceSubject;
  return SUBJECT_ACCENT[key] ?? SIGNATURE.blue;
}

/** CPK atom colors for molecule-builder — international convention, not signature palette. */
export const CPK = {
  C: "#909090",
  H: "#ffffff",
  O: "#ff0d0d",
  N: "#3050f8",
  Na: "#ab5cf2",
  Cl: "#1ff01f",
} as const;
