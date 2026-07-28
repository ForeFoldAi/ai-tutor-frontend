import type { QueryClient } from "@tanstack/react-query";
import {
  asDomainEntity,
  invalidateEntity,
  type DomainEntity,
} from "@/lib/query-invalidation";

const CHANNEL = "forefold-query-sync";

type BroadcastPayload = {
  type: "invalidate";
  entity: DomainEntity;
  /** Skip handling in the tab that originated the mutation. */
  originId: string;
};

const originId =
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `tab-${Math.random().toString(36).slice(2)}`;

let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === "undefined") return null;
  if (!channel) channel = new BroadcastChannel(CHANNEL);
  return channel;
}

/** Call after a local mutation so other same-browser tabs refetch. */
export function broadcastInvalidate(entity: DomainEntity): void {
  getChannel()?.postMessage({
    type: "invalidate",
    entity,
    originId,
  } satisfies BroadcastPayload);
}

export async function invalidateAndBroadcast(
  qc: QueryClient,
  entity: DomainEntity,
  options?: { refetch?: boolean },
): Promise<void> {
  await invalidateEntity(qc, entity, options);
  broadcastInvalidate(entity);
}

export async function invalidateManyAndBroadcast(
  qc: QueryClient,
  entities: DomainEntity[],
  options?: { refetch?: boolean },
): Promise<void> {
  for (const entity of entities) {
    await invalidateAndBroadcast(qc, entity, options);
  }
}

/** Listen for other tabs' invalidations. */
export function subscribeQueryBroadcast(qc: QueryClient): () => void {
  const ch = getChannel();
  if (!ch) return () => undefined;

  const onMessage = (event: MessageEvent<BroadcastPayload>) => {
    const data = event.data;
    if (!data || data.type !== "invalidate" || data.originId === originId) return;
    const entity = asDomainEntity(data.entity);
    if (!entity) return;
    void invalidateEntity(qc, entity);
  };

  ch.addEventListener("message", onMessage);
  return () => ch.removeEventListener("message", onMessage);
}
