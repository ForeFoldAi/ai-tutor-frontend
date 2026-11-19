import type { IceServer } from "@/types/voice";

export function createPeer(iceServers: IceServer[]): RTCPeerConnection {
  return new RTCPeerConnection({
    iceServers: iceServers.length ? iceServers : [{ urls: "stun:stun.l.google.com:19302" }],
  });
}

export async function makeOffer(pc: RTCPeerConnection, channelLabel = "audio"): Promise<{
  channel: RTCDataChannel;
  offer: RTCSessionDescriptionInit;
}> {
  const channel = pc.createDataChannel(channelLabel, { ordered: true });
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  await waitIce(pc);
  return { channel, offer: pc.localDescription ?? offer };
}

function waitIce(pc: RTCPeerConnection, ms = 4000): Promise<void> {
  if (pc.iceGatheringState === "complete") return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      pc.removeEventListener("icegatheringstatechange", onChange);
      resolve();
    };
    const onChange = () => {
      if (pc.iceGatheringState === "complete") done();
    };
    pc.addEventListener("icegatheringstatechange", onChange);
    window.setTimeout(done, ms);
  });
}

export async function applyAnswer(pc: RTCPeerConnection, answer: RTCSessionDescriptionInit): Promise<void> {
  await pc.setRemoteDescription(answer);
}

export async function addIce(
  pc: RTCPeerConnection,
  ice: { candidate: string; sdpMid?: string | null; sdpMLineIndex?: number | null },
): Promise<void> {
  if (!ice.candidate) return;
  await pc.addIceCandidate(ice);
}
