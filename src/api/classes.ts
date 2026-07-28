import { apiFetch } from "@/api/index";
import type {
  BulkClassCreateResponse,
  BulkSubjectCreateResponse,
  ClassOptionsResponse,
  ClassSubjectMappingsResponse,
  PaginatedClassesResponse,
  PaginatedSubjectsResponse,
  SchoolClassRecord,
  SchoolSubjectRecord,
} from "@/api/types";

export interface ListSchoolItemsParams {
  q?: string;
  limit?: number;
  offset?: number;
}

function listQuery(params: ListSchoolItemsParams) {
  const sp = new URLSearchParams();
  if (params.q?.trim()) sp.set("q", params.q.trim());
  if (params.limit != null) sp.set("limit", String(params.limit));
  if (params.offset != null) sp.set("offset", String(params.offset));
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

export async function getClassOptions(): Promise<ClassOptionsResponse> {
  return apiFetch<ClassOptionsResponse>("/auth/admin/classes/options");
}

export async function listSubjects(params: ListSchoolItemsParams = {}): Promise<PaginatedSubjectsResponse> {
  return apiFetch<PaginatedSubjectsResponse>(`/auth/admin/classes/subjects${listQuery(params)}`);
}

export async function bulkCreateSubjects(
  subjects: { name: string; code: string }[],
): Promise<BulkSubjectCreateResponse> {
  return apiFetch<BulkSubjectCreateResponse>("/auth/admin/classes/subjects/bulk", {
    method: "POST",
    body: JSON.stringify({ subjects }),
  });
}

export async function deleteSubject(subjectId: string | number): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/auth/admin/classes/subjects/${subjectId}`, { method: "DELETE" });
}

export async function updateSubject(
  subjectId: string | number,
  payload: { name: string; code: string },
): Promise<SchoolSubjectRecord> {
  return apiFetch<SchoolSubjectRecord>(`/auth/admin/classes/subjects/${subjectId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function listClasses(params: ListSchoolItemsParams = {}): Promise<PaginatedClassesResponse> {
  return apiFetch<PaginatedClassesResponse>(`/auth/admin/classes${listQuery(params)}`);
}

export async function bulkCreateClasses(
  classes: { grade: string; section: string; curriculum: string }[],
): Promise<BulkClassCreateResponse> {
  return apiFetch<BulkClassCreateResponse>("/auth/admin/classes/bulk", {
    method: "POST",
    body: JSON.stringify({ classes }),
  });
}

export async function getClassSubjectMappings(): Promise<ClassSubjectMappingsResponse> {
  return apiFetch<ClassSubjectMappingsResponse>("/auth/admin/classes/mappings");
}

export async function saveClassSubjects(
  classId: string | number,
  subjectIds: number[],
): Promise<ClassSubjectMappingsResponse> {
  return apiFetch<ClassSubjectMappingsResponse>(`/auth/admin/classes/${classId}/subjects`, {
    method: "PUT",
    body: JSON.stringify({ subject_ids: subjectIds }),
  });
}

export async function deleteClass(classId: string | number): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/auth/admin/classes/${classId}`, { method: "DELETE" });
}

export async function updateClass(
  classId: string | number,
  payload: { grade: string; section: string; curriculum: string },
): Promise<SchoolClassRecord> {
  return apiFetch<SchoolClassRecord>(`/auth/admin/classes/${classId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export type { SchoolClassRecord, SchoolSubjectRecord };
