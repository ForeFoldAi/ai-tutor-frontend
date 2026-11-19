import { apiFetch } from "@/api/index";

export type SearchEntity =
  | "students"
  | "teachers"
  | "classes"
  | "credentials"
  | "sessions"
  | "subjects"
  | "lessons"
  | "users"
  | "schools";

export interface SearchHit {
  entity: SearchEntity | string;
  id: string;
  title: string;
  subtitle: string | null;
  href: string;
}

export interface GlobalSearchResponse {
  q: string;
  hits: SearchHit[];
}

export interface EntitySearchResponse<T = Record<string, unknown>> {
  entity: string;
  q: string;
  total: number;
  items: T[];
}

export async function globalSearch(q: string): Promise<GlobalSearchResponse> {
  const term = q.trim();
  if (!term) return { q: "", hits: [] };
  const sp = new URLSearchParams({ q: term });
  return apiFetch<GlobalSearchResponse>(`/search?${sp}`);
}

export async function searchEntity<T = Record<string, unknown>>(
  entity: SearchEntity,
  q: string,
): Promise<EntitySearchResponse<T>> {
  const term = q.trim();
  if (!term) return { entity, q: "", total: 0, items: [] };
  const sp = new URLSearchParams({ q: term });
  return apiFetch<EntitySearchResponse<T>>(`/search/${entity}?${sp}`);
}
