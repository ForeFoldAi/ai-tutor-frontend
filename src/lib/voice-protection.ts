/**
 * Client helpers for server voice-protection (VAD / speaker / barge-check).
 */

export type BargeCheckResult = {
  allow_interrupt: boolean;
  reason: string;
  speech_probability?: number;
  speech_duration_ms?: number;
  echo_similarity_score?: number;
  speaker_similarity?: number;
  noise_reduction_db?: number;
  intent?: { is_interrupt_intent?: boolean; matched_phrase?: string | null };
  interrupt_latency_ms?: number;
};

export async function fetchProtectionInfo(baseUrl: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/voice/protection-info`);
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function checkBargeIn(
  audio: Blob,
  baseUrl: string,
  opts: {
    transcript?: string;
    recentAiSpeech?: string;
    studentKey?: string;
    token?: string | null;
  },
): Promise<BargeCheckResult> {
  const root = baseUrl.replace(/\/$/, "");
  const form = new FormData();
  form.append("audio", audio, "barge.webm");
  if (opts.transcript) form.append("transcript", opts.transcript);
  if (opts.recentAiSpeech) form.append("recent_ai_speech", opts.recentAiSpeech);
  if (opts.studentKey) form.append("student_key", opts.studentKey);

  const res = await fetch(`${root}/voice/barge-check`, {
    method: "POST",
    headers: opts.token ? { Authorization: `Bearer ${opts.token}` } : {},
    body: form,
  });
  if (!res.ok) {
    // Fail-open on network errors would cause false interrupts — fail closed.
    return { allow_interrupt: false, reason: `http_${res.status}` };
  }
  return (await res.json()) as BargeCheckResult;
}

export async function enrollSpeaker(
  audio: Blob,
  baseUrl: string,
  opts: { studentKey: string; token?: string | null },
): Promise<{ ok: boolean; error?: string; prompt?: string }> {
  const root = baseUrl.replace(/\/$/, "");
  const form = new FormData();
  form.append("audio", audio, "enroll.webm");
  form.append("student_key", opts.studentKey);
  const res = await fetch(`${root}/auth/voice-enroll`, {
    method: "POST",
    headers: opts.token ? { Authorization: `Bearer ${opts.token}` } : {},
    body: form,
  });
  if (!res.ok) {
    return { ok: false, error: await res.text() };
  }
  return (await res.json()) as { ok: boolean; prompt?: string };
}

/** In-memory protection metrics for the session (client-side). */
export type VoiceProtectionMetrics = {
  speech_probability: number;
  speech_duration_ms: number;
  speaker_similarity: number;
  echo_similarity_score: number;
  echo_rejected_count: number;
  speaker_rejections: number;
  false_interrupt_count: number;
  interrupt_accepted_count: number;
  interrupt_rejected_count: number;
};

export function createClientProtectionMetrics(): VoiceProtectionMetrics & {
  bump: (key: keyof VoiceProtectionMetrics, by?: number) => void;
  set: (key: keyof VoiceProtectionMetrics, value: number) => void;
} {
  const m: VoiceProtectionMetrics = {
    speech_probability: 0,
    speech_duration_ms: 0,
    speaker_similarity: 0,
    echo_similarity_score: 0,
    echo_rejected_count: 0,
    speaker_rejections: 0,
    false_interrupt_count: 0,
    interrupt_accepted_count: 0,
    interrupt_rejected_count: 0,
  };
  return {
    ...m,
    bump(key, by = 1) {
      (this as VoiceProtectionMetrics)[key] =
        Number((this as VoiceProtectionMetrics)[key]) + by;
    },
    set(key, value) {
      (this as VoiceProtectionMetrics)[key] = value;
    },
  };
}
