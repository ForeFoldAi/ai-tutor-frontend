import type { LessonPlannerWsEvent } from "@/modules/tutor/types/lesson-planner-ws";

export type LessonPlannerWsCallbacks = {
  onEvent?: (event: LessonPlannerWsEvent) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
};

export function connectLessonPlannerWs(
  url: string,
  callbacks: LessonPlannerWsCallbacks,
): WebSocket {
  const ws = new WebSocket(url);

  ws.onopen = () => callbacks.onOpen?.();

  ws.onmessage = (message) => {
    try {
      const data = JSON.parse(String(message.data)) as LessonPlannerWsEvent;
      if (data.event === "heartbeat") return;
      callbacks.onEvent?.(data);
    } catch {
      // ignore malformed frames
    }
  };

  ws.onerror = (err) => callbacks.onError?.(err);
  ws.onclose = () => callbacks.onClose?.();

  const ping = window.setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "ping" }));
    }
  }, 25_000);

  const originalClose = ws.close.bind(ws);
  ws.close = (...args) => {
    window.clearInterval(ping);
    originalClose(...args);
  };

  return ws;
}
