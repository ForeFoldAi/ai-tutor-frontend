import { toast } from "@/hooks/use-toast";
import { useAuthStore } from "@/lib/auth-store";

// Must match ALREADY_SIGNED_IN_ELSEWHERE / SESSION_REPLACED in the backend's app/core/student_messages.py.
export const ALREADY_SIGNED_IN_DETAIL = "already signed in on another device";
export const SESSION_REPLACED_DETAIL = "opened on another device";
// Must match WS_CLOSE_SESSION_REPLACED in the backend's app/modules/events/ws.py.
export const WS_CLOSE_SESSION_REPLACED = 4409;

/** Another device took over this student's login: sign out here and say why. */
export function handleSessionReplaced(): void {
  const auth = useAuthStore.getState();
  if (!auth.isAuthenticated) return; // already handled (several requests can fail at once)
  auth.logout();
  toast({
    title: "Signed out",
    description: "You were signed out because your account was opened on another device.",
    variant: "destructive",
  });
}
