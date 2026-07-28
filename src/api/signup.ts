import { API_BASE } from "@/api";
import type { SignupOptions } from "@/api/types";

const OPTIONS_TIMEOUT_MS = 8_000;

let cache: SignupOptions | null = null;
let inflight: Promise<SignupOptions> | null = null;

export function invalidateSignupOptionsCache() {
  cache = null;
  inflight = null;
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), OPTIONS_TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    window.clearTimeout(timer);
  }
}

export async function fetchSignupOptions(): Promise<SignupOptions> {
  if (cache) return cache;
  if (!inflight) {
    inflight = fetchWithTimeout(`${API_BASE}/auth/signup/options`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load signup options");
        return res.json() as Promise<SignupOptions>;
      })
      .then((data) => {
        cache = data;
        return data;
      })
      .catch((err) => {
        invalidateSignupOptionsCache();
        if (err instanceof Error && err.name === "AbortError") {
          throw new Error("Could not reach the server. Check your connection and try again.");
        }
        throw err;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}
