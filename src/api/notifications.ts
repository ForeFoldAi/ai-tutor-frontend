import { apiFetch } from "@/api/index";

export type AppNotification = {
  id: number;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
  actor_user_id: number | null;
};

export type NotificationListResponse = {
  items: AppNotification[];
  unread_count: number;
};

export function listNotifications(limit = 50): Promise<NotificationListResponse> {
  return apiFetch<NotificationListResponse>(`/auth/me/notifications?limit=${limit}`);
}

export function getUnreadNotificationCount(): Promise<{ count: number }> {
  return apiFetch<{ count: number }>("/auth/me/notifications/unread-count");
}

export function markNotificationsRead(ids?: number[]): Promise<{ updated: number }> {
  return apiFetch<{ updated: number }>("/auth/me/notifications/mark-read", {
    method: "POST",
    body: JSON.stringify(ids ? { ids } : {}),
  });
}

export function sendMasterNotification(payload: {
  recipient_ids: number[];
  title: string;
  body: string;
}): Promise<{ created: number }> {
  return apiFetch<{ created: number }>("/auth/master/notifications", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
