/** HTTP API base from Vite env. Empty = same-origin (dev Vite proxy only). */
export function getHttpApiBase(): string {
  return String(import.meta.env.VITE_API_URL ?? "").trim().replace(/\/$/, "");
}

/** Voice HTTP base; falls back to API base. */
export function getVoiceHttpBase(): string {
  const voice = String(import.meta.env.VITE_VOICE_URL ?? "").trim().replace(/\/$/, "");
  return voice || getHttpApiBase();
}

/** Convert http(s) base → ws(s). Empty base → same-origin host (dev proxy). */
export function toWsBase(httpBase: string): string {
  if (httpBase) return httpBase.replace(/^http/, "ws");
  if (typeof window === "undefined") return "";
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}`;
}

export function buildWsUrl(httpBase: string, path: string, query?: Record<string, string>): string {
  const wsBase = toWsBase(httpBase);
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const qs = query
    ? `?${new URLSearchParams(Object.entries(query).filter(([, v]) => v !== "")).toString()}`
    : "";
  return `${wsBase}${normalized}${qs}`;
}

/** Production static hosts (Vercel) need an absolute API URL — Vite proxy does not exist there. */
export function assertProdApiConfigured(): void {
  if (!import.meta.env.PROD) return;
  if (getHttpApiBase()) return;
  console.error(
    "[api] VITE_API_URL is empty in production. Set it in Vercel env to your backend HTTPS URL (and VITE_VOICE_URL for voice/WS).",
  );
}
