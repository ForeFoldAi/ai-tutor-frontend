import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Strip control/zero-width chars that render as □ (e.g. \\b from Word paste). */
export function cleanDisplayText(value: string | null | undefined): string {
  if (!value) return ""
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200D\uFEFF]/g, "").trim()
}
