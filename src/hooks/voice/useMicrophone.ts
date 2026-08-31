function micErrorCode(err: unknown): string {
  const name = err instanceof DOMException ? err.name : "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError") return "denied";
  if (name === "NotFoundError") return "missing";
  if (name === "NotReadableError") return "inuse";
  return "error";
}

export async function requestMicrophone(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw Object.assign(new Error("unsupported"), { code: "unsupported" });
  }
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
  } catch (err) {
    try {
      return await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (fallbackErr) {
      throw Object.assign(fallbackErr instanceof Error ? fallbackErr : new Error("mic"), {
        code: micErrorCode(fallbackErr),
      });
    }
  }
}

export function stopStream(stream: MediaStream | null): void {
  stream?.getTracks().forEach((t) => t.stop());
}
