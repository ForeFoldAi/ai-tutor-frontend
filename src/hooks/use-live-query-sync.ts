import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/auth-store";
import { buildWsUrl, getHttpApiBase } from "@/lib/api-base";
import { asDomainEntity, invalidateEntity } from "@/lib/query-invalidation";
import { subscribeQueryBroadcast } from "@/lib/query-broadcast";

function eventsWsUrl(token: string): string {
  return buildWsUrl(getHttpApiBase(), "/ws/events", { access_token: token });
}

type DomainEventMessage = {
  type?: string;
  entity?: string;
  action?: string;
  school_id?: number | null;
  actor_id?: number | null;
};

/**
 * Keeps React Query lists fresh:
 * - other browser tabs (BroadcastChannel)
 * - other devices / users (backend /ws/events)
 */
export function useLiveQuerySync() {
  const qc = useQueryClient();
  const token = useAuthStore((s) => s.token);
  const userId = useAuthStore((s) => s.user?.id);
  const wsRef = useRef<WebSocket | null>(null);

  // Same-browser multi-tab sync
  useEffect(() => subscribeQueryBroadcast(qc), [qc]);

  // Cross-device / cross-user domain events
  useEffect(() => {
    if (!token || !userId) return;

    let stopped = false;
    let retryMs = 1500;
    let retryTimer: number | undefined;

    const connect = () => {
      if (stopped) return;
      const ws = new WebSocket(eventsWsUrl(token));
      wsRef.current = ws;

      ws.onopen = () => {
        retryMs = 1500;
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(String(event.data)) as DomainEventMessage;
          if (msg.type === "heartbeat" || msg.type === "connected") return;
          // Always invalidate — same login on another device shares actor_id.
          const entity = asDomainEntity(msg.entity);
          if (!entity) return;
          void invalidateEntity(qc, entity);
        } catch {
          // ignore malformed frames
        }
      };

      ws.onclose = () => {
        wsRef.current = null;
        if (stopped) return;
        retryTimer = window.setTimeout(() => {
          retryMs = Math.min(retryMs * 1.5, 15_000);
          connect();
        }, retryMs);
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connect();

    return () => {
      stopped = true;
      if (retryTimer) window.clearTimeout(retryTimer);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [token, userId, qc]);
}
