import type { QueryClient, QueryKey } from "@tanstack/react-query";

/** Domain entities used by live invalidation + WS events. */
export type DomainEntity =
  | "students"
  | "teachers"
  | "classes"
  | "credentials"
  | "sessions"
  | "assignments"
  | "users"
  | "schools"
  | "dashboard"
  | "search"
  | "notifications";

const ENTITY_QUERY_KEYS: Record<DomainEntity, QueryKey[]> = {
  students: [
    ["students"],
    ["tutor", "students"],
    ["organization", "students"],
    ["organization", "users"],
    ["tutor", "progress"],
    ["search", "entity", "students"],
    ["search", "global"],
    ["notifications"],
  ],
  teachers: [
    ["teachers"],
    ["organization", "tutors"],
    ["organization", "users"],
    ["search", "entity", "teachers"],
    ["search", "global"],
    ["notifications"],
  ],
  classes: [
    ["classes"],
    ["lesson-planner", "profile"],
    ["lesson-planner", "subjects"],
    ["search", "entity", "classes"],
    ["search", "global"],
    ["notifications"],
  ],
  credentials: [
    ["credentials"],
    ["search", "entity", "credentials"],
    ["search", "global"],
  ],
  sessions: [
    ["tutor", "sessions"],
    ["student", "live-sessions"],
    ["search", "entity", "sessions"],
    ["search", "global"],
    ["notifications"],
  ],
  assignments: [
    ["tutor", "assignments"],
    ["student", "assignments"],
    ["notifications"],
  ],
  users: [
    ["organization", "users"],
    ["master-admin", "users"],
    ["admin", "users"],
    ["search", "entity", "users"],
    ["search", "global"],
  ],
  schools: [
    ["organization", "schools"],
    ["master-admin", "schools"],
    ["schools"],
    ["search", "entity", "schools"],
    ["search", "global"],
  ],
  dashboard: [["dashboard"], ["tutor", "dashboard"]],
  search: [["search"]],
  notifications: [["notifications"]],
};

export function queryKeysForEntity(entity: DomainEntity): QueryKey[] {
  return ENTITY_QUERY_KEYS[entity] ?? [];
}

export async function invalidateEntity(
  qc: QueryClient,
  entity: DomainEntity,
  options?: { refetch?: boolean },
): Promise<void> {
  const keys = queryKeysForEntity(entity);
  await Promise.all(keys.map((queryKey) => qc.invalidateQueries({ queryKey })));
  if (options?.refetch) {
    await Promise.all(keys.map((queryKey) => qc.refetchQueries({ queryKey })));
  }
}

export async function invalidateEntities(
  qc: QueryClient,
  entities: DomainEntity[],
  options?: { refetch?: boolean },
): Promise<void> {
  for (const entity of entities) {
    await invalidateEntity(qc, entity, options);
  }
}

/** Map a WS/broadcast event entity string to known DomainEntity. */
export function asDomainEntity(value: string | undefined | null): DomainEntity | null {
  if (!value) return null;
  return value in ENTITY_QUERY_KEYS ? (value as DomainEntity) : null;
}
