import type { ApiUser, UpdateMeProfilePayload } from "@/api/types";
import { useAuthStore } from "@/lib/auth-store";
import { delay } from "../delay";
import { mockStore } from "../store";

export async function updateMyProfile(payload: UpdateMeProfilePayload): Promise<ApiUser> {
  await delay();
  const currentUser = useAuthStore.getState().user;
  const user = mockStore.users.find((u) => u.id === currentUser?.id);
  if (!user) throw new Error("User not found");
  user.full_name = payload.full_name.trim();
  user.email = payload.email.trim();
  user.updated_at = new Date().toISOString();
  useAuthStore.getState().updateUser({
    fullName: user.full_name,
    email: user.email,
  });
  return { ...user };
}
