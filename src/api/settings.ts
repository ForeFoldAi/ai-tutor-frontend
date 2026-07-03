import { apiFetch } from "@/api/index";
import type { UpdateUserSettingsPayload, UserSettings } from "@/api/types";

export async function getMySettings(): Promise<UserSettings> {
  return apiFetch<UserSettings>("/auth/me/settings");
}

export async function updateMySettings(payload: UpdateUserSettingsPayload): Promise<UserSettings> {
  return apiFetch<UserSettings>("/auth/me/settings", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function resetMySettings(): Promise<UserSettings> {
  return apiFetch<UserSettings>("/auth/me/settings", {
    method: "DELETE",
  });
}
