import { useAuthStore } from "@/lib/auth-store";
import { assertProdApiConfigured, getHttpApiBase } from "@/lib/api-base";
import { studentFriendlyApiError } from "@/lib/student-messages";

// Empty VITE_API_URL = same-origin (Vite dev proxy → backend); set full URL on Vercel.
const API_BASE = getHttpApiBase();
assertProdApiConfigured();
const FETCH_TIMEOUT_MS = 20_000;

function getAuthHeader(): Record<string, string> {
  const token = useAuthStore.getState().token;
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const state = useAuthStore.getState();
  const refreshToken = state.refreshToken;
  if (!refreshToken) return null;

  if (!refreshPromise) {
    refreshPromise = (async () => {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (!res.ok) {
        useAuthStore.getState().logout();
        return null;
      }
      const payload = (await res.json()) as { access_token?: string; refresh_token?: string };
      if (!payload.access_token || !payload.refresh_token) {
        useAuthStore.getState().logout();
        return null;
      }
      useAuthStore.getState().setToken(payload.access_token);
      useAuthStore.getState().setRefreshToken(payload.refresh_token);
      return payload.access_token;
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

async function doFetch(path: string, init: RequestInit = {}, tokenOverride?: string): Promise<Response> {
  const authHeader = tokenOverride ? { Authorization: `Bearer ${tokenOverride}` } : getAuthHeader();
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
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
    }
  }
  if (res.status === 401) {
    useAuthStore.getState().logout();
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
