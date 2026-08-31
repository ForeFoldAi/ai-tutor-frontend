import { getRtcBase, toWsBase } from "@/lib/api-base";

export function voiceWsUrl(token: string): string {
  const http = getRtcBase();
  const ws = toWsBase(http) || `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}`;
  return `${ws}/rtc/voice?token=${encodeURIComponent(token)}`;
}

export type VoiceSock = {
  send: (msg: Record<string, unknown>) => void;
  sendBinary: (buf: ArrayBuffer) => void;
  close: () => void;
};

export function connectVoiceEvents(
  token: string,
  onEvent: (msg: Record<string, unknown>) => void,
  onClose: () => void,
  onOpen?: () => void,
  onError?: () => void,
  onBinary?: (buf: ArrayBuffer) => void,
): VoiceSock {
  const ws = new WebSocket(voiceWsUrl(token));
  ws.binaryType = "arraybuffer";
  ws.onopen = () => onOpen?.();
  ws.onmessage = (ev) => {
    const data = ev.data;
    if (data instanceof ArrayBuffer) {
      onBinary?.(data);
      return;
    }
    if (data instanceof Blob) {
      void data.arrayBuffer().then((buf) => onBinary?.(buf));
      return;
    }
    try {
      onEvent(JSON.parse(String(data)) as Record<string, unknown>);
    } catch {
      /* ignore */
    }
  };
  ws.onerror = () => onError?.();
  ws.onclose = onClose;
  return {
    send(msg) {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
    },
    sendBinary(buf) {
      if (ws.readyState === WebSocket.OPEN) ws.send(buf);
    },
    close() {
      ws.onclose = null;
      ws.onerror = null;
      ws.onopen = null;
      if (ws.readyState === WebSocket.CONNECTING) {
        ws.addEventListener("open", () => ws.close(), { once: true });
      } else if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    },
  };
}
