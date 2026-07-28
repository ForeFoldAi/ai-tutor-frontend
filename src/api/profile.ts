import { apiFetch } from "@/api/index";
import type { ApiUser, UpdateMeProfilePayload } from "@/api/types";

export async function getMyProfile(): Promise<ApiUser> {
  return apiFetch<ApiUser>("/auth/me");
}

export async function updateMyProfile(payload: UpdateMeProfilePayload): Promise<ApiUser> {
  const body: Record<string, string | string[] | null> = {
    full_name: payload.full_name.trim(),
    email: payload.email.trim(),
  };
  if (payload.phone !== undefined) {
    body.phone = payload.phone?.trim() ? payload.phone.trim() : null;
  }
  if (payload.designation !== undefined) {
    body.designation = payload.designation?.trim() ? payload.designation.trim() : null;
  }
  if (payload.grade !== undefined) {
    body.grade = payload.grade?.trim() ? payload.grade.trim() : null;
  }
  if (payload.curricula !== undefined) {
    body.curricula = payload.curricula;
  }
  if (payload.parent_email !== undefined) {
    body.parent_email = payload.parent_email?.trim() ? payload.parent_email.trim() : null;
  }
  if (payload.favorite_subjects !== undefined) {
    body.favorite_subjects = payload.favorite_subjects;
  }
  if (payload.learning_goals !== undefined) {
    body.learning_goals = payload.learning_goals;
  }
  if (payload.preferred_learning_method !== undefined) {
    body.preferred_learning_method = payload.preferred_learning_method?.trim()
      ? payload.preferred_learning_method.trim()
      : null;
  }
  const cp = payload.current_password?.trim();
  const np = payload.new_password?.trim();
  if (cp) body.current_password = cp;
  if (np) body.new_password = np;
  return apiFetch<ApiUser>("/auth/me/profile", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}
