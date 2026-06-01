import { apiFetch } from "@/api/index";
import type { ApiUser, UpdateMeProfilePayload } from "@/api/types";

export async function updateMyProfile(payload: UpdateMeProfilePayload): Promise<ApiUser> {
  const body: Record<string, string> = {
    full_name: payload.full_name.trim(),
    email: payload.email.trim(),
  };
  const cp = payload.current_password?.trim();
  const np = payload.new_password?.trim();
  if (cp) body.current_password = cp;
  if (np) body.new_password = np;
  return apiFetch<ApiUser>("/auth/me/profile", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}
