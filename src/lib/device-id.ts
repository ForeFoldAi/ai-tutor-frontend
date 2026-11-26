// Random id for this browser, created once and kept in localStorage. The backend uses it so that
// signing in again from the same browser is not treated as "another device".
const STORAGE_KEY = "device-id";

function randomId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().replace(/-/g, "");
  }
  return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
}

export function getDeviceId(): string | undefined {
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing && /^[A-Za-z0-9-]{8,64}$/.test(existing)) return existing;
    const created = randomId();
    window.localStorage.setItem(STORAGE_KEY, created);
    return created;
  } catch {
    // Storage blocked (private mode, disabled cookies): no id, so the next login is treated as another device.
    return undefined;
  }
}
