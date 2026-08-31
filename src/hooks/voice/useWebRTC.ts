import { useCallback, useRef } from "react";
import { addIce, applyAnswer, createPeer, makeOffer } from "@/services/voice/webrtc.service";
import type { IceServer } from "@/types/voice";

export function useWebRTC() {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const queueRef = useRef<ArrayBuffer[]>([]);
  const iceQueueRef = useRef<RTCIceCandidateInit[]>([]);

  const flushIce = useCallback(async (pc: RTCPeerConnection) => {
    const pending = iceQueueRef.current;
    iceQueueRef.current = [];
    for (const ice of pending) {
      if (!ice.candidate) continue;
      try {
        await addIce(pc, { ...ice, candidate: ice.candidate });
      } catch {
        /* ignore stale candidates */
      }
    }
  }, []);

  const connect = useCallback(
    async (
      iceServers: IceServer[],
      onLocalIce: (ice: RTCIceCandidateInit) => void,
      onPcm: (buf: ArrayBuffer) => void,
      onOpen?: () => void,
    ) => {
      iceQueueRef.current = [];
      const pc = createPeer(iceServers);
      pcRef.current = pc;
      pc.onicecandidate = (ev) => {
        if (ev.candidate) onLocalIce(ev.candidate.toJSON());
      };
      const { channel, offer } = await makeOffer(pc);
      dcRef.current = channel;
      channel.binaryType = "arraybuffer";
      channel.onopen = () => {
        for (const buf of queueRef.current) channel.send(buf);
        queueRef.current = [];
        onOpen?.();
      };
      channel.onmessage = (ev) => {
        const data = ev.data;
        if (data instanceof ArrayBuffer) onPcm(data);
        else if (data instanceof Blob) void data.arrayBuffer().then(onPcm);
        else if (ArrayBuffer.isView(data))
          onPcm(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength));
      };
      return { offer, channel };
    },
    [],
  );

  const remoteAnswer = useCallback(
    async (sdp: string) => {
      const pc = pcRef.current;
      if (!pc) return;
      await applyAnswer(pc, { type: "answer", sdp });
      await flushIce(pc);
    },
    [flushIce],
  );

  const remoteIce = useCallback(async (ice: RTCIceCandidateInit) => {
    const pc = pcRef.current;
    if (!pc || !ice.candidate) return;
    if (!pc.remoteDescription) {
      iceQueueRef.current.push(ice);
      return;
    }
    try {
      await addIce(pc, { ...ice, candidate: ice.candidate });
    } catch {
      /* ignore */
    }
  }, []);

  const send = useCallback((buf: ArrayBuffer) => {
    const dc = dcRef.current;
    if (dc && dc.readyState === "open") dc.send(buf);
    else queueRef.current.push(buf);
  }, []);

  const close = useCallback(() => {
    dcRef.current?.close();
    pcRef.current?.close();
    dcRef.current = null;
    pcRef.current = null;
    queueRef.current = [];
    iceQueueRef.current = [];
  }, []);

  return { connect, remoteAnswer, remoteIce, send, close, dcRef, pcRef };
}
