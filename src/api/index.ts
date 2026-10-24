import { useAuthStore } from "@/lib/auth-store";
import { assertProdApiConfigured, getHttpApiBase } from "@/lib/api-base";
import { studentFriendlyApiError } from "@/lib/student-messages";

// Empty VITE_API_URL = same-origin (Vite dev proxy → backend); set full URL on Vercel.
const API_BASE = getHttpApiBase();
assertProdApiConfigured();
const FETCH_TIMEOUT_MS = 120_000;

function getAuthHeader(): Record<string, string> {
  const token = useAuthStore.getState().token;
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

let refreshPromise: Promise<string | null> | null = null;
const REFRESH_RETRY_DELAYS_MS = [1_000, 3_000, 8_000];

/**
 * New access token, or null. Logs out only when the server rejects the refresh token (401/403);
 * a restarting backend (5xx, proxy error, network failure) keeps the session and is retried.
 */
export async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      for (let attempt = 0; ; attempt++) {
        // Another tab may have rotated the refresh token already; use the latest stored one.
        await useAuthStore.persist.rehydrate();
        const refreshToken = useAuthStore.getState().refreshToken;
        if (!refreshToken) return null;
        let res: Response | null = null;
        try {
          res = await fetch(`${API_BASE}/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refresh_token: refreshToken }),
          });
        } catch {
          res = null;
        }
        if (res?.ok) {
          const payload = (await res.json()) as { access_token?: string; refresh_token?: string };
          if (!payload.access_token || !payload.refresh_token) return null;
          useAuthStore.getState().setToken(payload.access_token);
          useAuthStore.getState().setRefreshToken(payload.refresh_token);
          return payload.access_token;
        }
        if (res && (res.status === 401 || res.status === 403)) {
          useAuthStore.getState().logout();
          return null;
        }
        if (attempt >= REFRESH_RETRY_DELAYS_MS.length) return null;
        await new Promise((r) => window.setTimeout(r, REFRESH_RETRY_DELAYS_MS[attempt]));
      }
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

function tokenExpiryMs(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

// Refresh a minute before the access token expires so polling pages never hit a burst of 401s.
let refreshTimer: number | undefined;
function scheduleProactiveRefresh(token: string | null) {
  window.clearTimeout(refreshTimer);
  const exp = token ? tokenExpiryMs(token) : null;
  if (!exp) return;
  refreshTimer = window.setTimeout(() => void refreshAccessToken(), Math.max(5_000, exp - Date.now() - 60_000));
}
scheduleProactiveRefresh(useAuthStore.getState().token);
useAuthStore.subscribe((s, prev) => {
  if (s.token !== prev.token) scheduleProactiveRefresh(s.token);
});

async function doFetch(path: string, init: RequestInit = {}, tokenOverride?: string): Promise<Response> {
  const authHeader = tokenOverride ? { Authorization: `Bearer ${tokenOverride}` } : getAuthHeader();
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const isFormData = typeof FormData !== "undefined" && init.body instanceof FormData;
  try {
    return await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...authHeader,
        ...(init.headers || {}),
      },
    });
  } finally {
    window.clearTimeout(timer);
  }
}

export async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  let res = await doFetch(path, init);
  if (res.status === 401) {
    const fresh = await refreshAccessToken();
    if (fresh) {
      res = await doFetch(path, init, fresh);
      // A brand-new token still rejected means the account itself is no longer valid.
      if (res.status === 401) useAuthStore.getState().logout();
    }
  }
  return res;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await authFetch(path, init);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(studentFriendlyApiError(text, res.status));
  }

  if (res.status === 204) return null as T;
  return (await res.json()) as T;
}

export { API_BASE };
