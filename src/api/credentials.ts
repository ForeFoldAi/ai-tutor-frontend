import { apiFetch, API_BASE } from "@/api/index";
import { useAuthStore } from "@/lib/auth-store";
import type {
  CredentialCandidate,
  CredentialFilters,
  CredentialMetrics,
  CredentialRecord,
  CredentialRole,
} from "@/modules/organization/types/credentials";

export interface CredentialsListParams {
  q?: string;
  role?: string;
  first_login_status?: string;
  delivery_status?: string;
  shared?: string;
  limit?: number;
  offset?: number;
}

export interface PaginatedCredentialsResponse {
  items: CredentialRecordApi[];
  meta: {
    total: number;
    limit: number;
    offset: number;
    default_limit: number;
  };
}

export interface CredentialRecordApi {
  id: number;
  name: string;
  role: string;
  user_id: string;
  grade: string | null;
  section: string | null;
  curriculum: string | null;
  has_credentials: boolean;
  credential_shared: string | null;
  first_login_status: string;
  last_login: string | null;
  delivery_status: string;
}

export interface CredentialMetricsApi {
  generated: number;
  teachers_pending_login: number;
  students_pending_login: number;
  not_shared: number;
  generated_trend: string;
  teachers_pending_trend: string;
  students_pending_trend: string;
  not_shared_trend: string;
  not_shared_trend_up: boolean;
}

export interface CredentialCandidateApi {
  id: number;
  name: string;
  role: string;
  user_id: string;
  grade: string | null;
  section: string | null;
  detail: string | null;
  has_credentials: boolean;
}

export interface CredentialCandidatesResponse {
  items: CredentialCandidateApi[];
  grades: string[];
  sections: string[];
}

export interface CredentialGenerateResponse {
  message: string;
  items: Array<{
    id: number;
    name: string;
    role: string;
    user_id: string;
    password: string;
  }>;
}

export interface CredentialSendResponse {
  message: string;
  updated: number;
}

function credentialsQuery(params: CredentialsListParams) {
  const sp = new URLSearchParams();
  if (params.q?.trim()) sp.set("q", params.q.trim());
  if (params.role && params.role !== "all") sp.set("role", params.role);
  if (params.first_login_status && params.first_login_status !== "all") {
    sp.set("first_login_status", params.first_login_status);
  }
  if (params.delivery_status && params.delivery_status !== "all") {
    sp.set("delivery_status", params.delivery_status);
  }
  if (params.shared && params.shared !== "all") sp.set("shared", params.shared);
  if (params.limit != null) sp.set("limit", String(params.limit));
  if (params.offset != null) sp.set("offset", String(params.offset));
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

export function mapCredentialRecord(row: CredentialRecordApi): CredentialRecord {
  return {
    id: String(row.id),
    name: row.name,
    role: row.role as CredentialRole,
    userId: row.user_id,
    grade: row.grade ?? null,
    section: row.section ?? null,
    curriculum: row.curriculum ?? null,
    hasCredentials: Boolean(row.has_credentials),
    credentialShared: row.credential_shared,
    firstLoginStatus: row.first_login_status as CredentialRecord["firstLoginStatus"],
    lastLogin: row.last_login?.replace(/ IST$/, "") ?? null,
    deliveryStatus: (row.delivery_status === "Pending" ? "Failed" : row.delivery_status) as CredentialRecord["deliveryStatus"],
  };
}

export function mapCredentialMetrics(row: CredentialMetricsApi): CredentialMetrics {
  return {
    generated: row.generated,
    teachersPendingLogin: row.teachers_pending_login,
    studentsPendingLogin: row.students_pending_login,
    notShared: row.not_shared,
    generatedTrend: row.generated_trend,
    teachersPendingTrend: row.teachers_pending_trend,
    studentsPendingTrend: row.students_pending_trend,
    notSharedTrend: row.not_shared_trend,
    notSharedTrendUp: row.not_shared_trend_up,
  };
}

export function mapCredentialCandidate(row: CredentialCandidateApi): CredentialCandidate {
  return {
    id: String(row.id),
    name: row.name,
    role: row.role as CredentialRole,
    userId: row.user_id,
    grade: row.grade ?? undefined,
    section: row.section ?? undefined,
    detail: row.detail ?? undefined,
    hasCredentials: row.has_credentials,
  };
}

export function filtersToApi(filters: CredentialFilters): CredentialsListParams {
  return {
    q: filters.search || undefined,
    role: filters.role,
    first_login_status: filters.firstLoginStatus,
    delivery_status: filters.deliveryStatus,
    shared: filters.shared,
  };
}

export async function getCredentialStats(): Promise<CredentialMetricsApi> {
  return apiFetch<CredentialMetricsApi>("/auth/admin/credentials/stats");
}

export async function listCredentials(
  params: CredentialsListParams = {},
): Promise<PaginatedCredentialsResponse> {
  return apiFetch<PaginatedCredentialsResponse>(`/auth/admin/credentials${credentialsQuery(params)}`);
}

export async function listCredentialCandidates(params: {
  role: CredentialRole;
  q?: string;
  grade?: string;
  section?: string;
  credential_status?: string;
}): Promise<CredentialCandidatesResponse> {
  const sp = new URLSearchParams();
  sp.set("role", params.role);
  if (params.q?.trim()) sp.set("q", params.q.trim());
  if (params.grade && params.grade !== "all") sp.set("grade", params.grade);
  if (params.section && params.section !== "all") sp.set("section", params.section);
  if (params.credential_status && params.credential_status !== "all") {
    sp.set("credential_status", params.credential_status);
  }
  return apiFetch<CredentialCandidatesResponse>(`/auth/admin/credentials/candidates?${sp}`);
}

export async function generateCredentials(payload: {
  role: CredentialRole;
  user_ids: number[];
}): Promise<CredentialGenerateResponse> {
  return apiFetch<CredentialGenerateResponse>("/auth/admin/credentials/generate", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function sendCredentials(payload: {
  role: CredentialRole;
  user_ids: number[];
}): Promise<CredentialSendResponse> {
  return apiFetch<CredentialSendResponse>("/auth/admin/credentials/send", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function exportCredentialsXlsx(params: CredentialsListParams = {}): Promise<void> {
  const token = useAuthStore.getState().token;
  const res = await fetch(`${API_BASE}/auth/admin/credentials/export${credentialsQuery(params)}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Export failed (${res.status})`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `credentials-${new Date().toISOString().slice(0, 10)}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}
