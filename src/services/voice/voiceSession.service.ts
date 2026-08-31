import { getRtcBase } from "@/lib/api-base";
import type { IceServer, VoiceScope } from "@/types/voice";

function base(): string {
  return getRtcBase();
}

async function authed(path: string, token: string, init?: RequestInit) {
  const res = await fetch(`${base()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`voice ${res.status}`);
  return res.json();
}

export const voiceSessionService = {
  ice: (token: string) => authed("/rtc/voice/ice", token) as Promise<{ iceServers: IceServer[] }>,
  start: (token: string, scope: VoiceScope) =>
    authed("/rtc/voice/session", token, { method: "POST", body: JSON.stringify(scope) }) as Promise<{
      id: string;
      conversationId: string;
      iceServers: IceServer[];
    }>,
  end: (token: string, id: string) =>
    authed(`/rtc/voice/session/${id}/end`, token, { method: "POST" }),
};
