import { apiFetch, API_BASE } from "@/api/index";
import { useAuthStore } from "@/lib/auth-store";
import type {
  BulkTeacherCreateResponse,
  PaginatedTeachersResponse,
  TeacherAssignPayload,
  TeacherAssignResponse,
  TeacherCreatePayload,
  TeacherDetail,
  TeacherOptionsResponse,
  TeacherRecord,
  TeacherUnassignPayload,
  TeacherUpdatePayload,
} from "@/api/types";

export interface ListTeachersParams {
  q?: string;
  subject?: string;
  curriculum?: string;
  status?: "active" | "inactive";
  limit?: number;
  offset?: number;
}

function teachersQuery(params: ListTeachersParams) {
  const sp = new URLSearchParams();
  if (params.q?.trim()) sp.set("q", params.q.trim());
  if (params.subject && params.subject !== "all") sp.set("subject", params.subject);
  if (params.curriculum && params.curriculum !== "all") sp.set("curriculum", params.curriculum);
  if (params.status) sp.set("status", params.status);
  if (params.limit != null) sp.set("limit", String(params.limit));
  if (params.offset != null) sp.set("offset", String(params.offset));
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

export async function getTeacherOptions(): Promise<TeacherOptionsResponse> {
  return apiFetch<TeacherOptionsResponse>("/auth/admin/teachers/options");
}

export async function listTeachers(params: ListTeachersParams = {}): Promise<PaginatedTeachersResponse> {
  return apiFetch<PaginatedTeachersResponse>(`/auth/admin/teachers${teachersQuery(params)}`);
}

export async function getTeacher(teacherId: string | number): Promise<TeacherDetail> {
  return apiFetch<TeacherDetail>(`/auth/admin/teachers/${teacherId}`);
}

export async function unassignTeacherItems(
  teacherId: string | number,
  payload: TeacherUnassignPayload,
): Promise<TeacherDetail> {
  return apiFetch<TeacherDetail>(`/auth/admin/teachers/${teacherId}/unassign`, {
    method: "POST",
    body: JSON.stringify({
      subject_ids: payload.subject_ids ?? [],
      class_ids: payload.class_ids ?? [],
      student_ids: payload.student_ids ?? [],
    }),
  });
}

export async function createTeacher(payload: TeacherCreatePayload): Promise<TeacherRecord> {
  return apiFetch<TeacherRecord>("/auth/admin/teachers", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function bulkCreateTeachers(
  teachers: TeacherCreatePayload[],
): Promise<BulkTeacherCreateResponse> {
  return apiFetch<BulkTeacherCreateResponse>("/auth/admin/teachers/bulk", {
    method: "POST",
    body: JSON.stringify({ teachers }),
  });
}

export async function updateTeacher(
  teacherId: string | number,
  payload: TeacherUpdatePayload,
): Promise<TeacherDetail> {
  return apiFetch<TeacherDetail>(`/auth/admin/teachers/${teacherId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteTeacher(teacherId: string | number): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/auth/admin/teachers/${teacherId}`, { method: "DELETE" });
}

export async function assignClassesToTeachers(
  payload: Pick<TeacherAssignPayload, "teacher_ids" | "class_ids">,
): Promise<TeacherAssignResponse> {
  return apiFetch<TeacherAssignResponse>("/auth/admin/teachers/assign-classes", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function assignSubjectsToTeachers(
  payload: Pick<TeacherAssignPayload, "teacher_ids" | "subject_ids">,
): Promise<TeacherAssignResponse> {
  return apiFetch<TeacherAssignResponse>("/auth/admin/teachers/assign-subjects", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function exportTeachersCsv(params: ListTeachersParams = {}): Promise<void> {
  const token = useAuthStore.getState().token;
  const res = await fetch(`${API_BASE}/auth/admin/teachers/export${teachersQuery(params)}`, {
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
  link.download = `teachers-export-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
