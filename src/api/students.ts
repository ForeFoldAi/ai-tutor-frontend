import { apiFetch, API_BASE } from "@/api/index";
import { useAuthStore } from "@/lib/auth-store";
import type {
  BulkStudentCreateResponse,
  PaginatedStudentsResponse,
  StudentActionResponse,
  StudentCreatePayload,
  StudentOptionsResponse,
  StudentRecord,
  StudentUpdatePayload,
} from "@/api/types";

export interface ListStudentsParams {
  q?: string;
  grade?: string;
  section?: string;
  curriculum?: string;
  learning_type?: string;
  status?: "active" | "inactive";
  limit?: number;
  offset?: number;
}

function studentsQuery(params: ListStudentsParams) {
  const sp = new URLSearchParams();
  if (params.q?.trim()) sp.set("q", params.q.trim());
  if (params.grade && params.grade !== "all") sp.set("grade", params.grade);
  if (params.section && params.section !== "all") sp.set("section", params.section);
  if (params.curriculum && params.curriculum !== "all") sp.set("curriculum", params.curriculum);
  if (params.learning_type && params.learning_type !== "all") {
    sp.set("learning_type", params.learning_type);
  }
  if (params.status) sp.set("status", params.status);
  if (params.limit != null) sp.set("limit", String(params.limit));
  if (params.offset != null) sp.set("offset", String(params.offset));
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

export async function getStudentOptions(): Promise<StudentOptionsResponse> {
  return apiFetch<StudentOptionsResponse>("/auth/admin/students/options");
}

export async function listStudents(params: ListStudentsParams = {}): Promise<PaginatedStudentsResponse> {
  return apiFetch<PaginatedStudentsResponse>(`/auth/admin/students${studentsQuery(params)}`);
}

export async function getStudent(studentId: string | number): Promise<StudentRecord> {
  return apiFetch<StudentRecord>(`/auth/admin/students/${studentId}`);
}

export async function createStudent(payload: StudentCreatePayload): Promise<StudentRecord> {
  return apiFetch<StudentRecord>("/auth/admin/students", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function bulkCreateStudents(
  students: StudentCreatePayload[],
): Promise<BulkStudentCreateResponse> {
  return apiFetch<BulkStudentCreateResponse>("/auth/admin/students/bulk", {
    method: "POST",
    body: JSON.stringify({ students }),
  });
}

export async function updateStudent(
  studentId: string | number,
  payload: StudentUpdatePayload,
): Promise<StudentRecord> {
  return apiFetch<StudentRecord>(`/auth/admin/students/${studentId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteStudent(studentId: string | number): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/auth/admin/students/${studentId}`, { method: "DELETE" });
}

export async function assignTeacherToStudents(payload: {
  teacher_ids: number[];
  student_ids: number[];
}): Promise<StudentActionResponse> {
  return apiFetch<StudentActionResponse>("/auth/admin/students/assign-teacher", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function moveStudentsToClass(payload: {
  student_ids: number[];
  class_id: number;
}): Promise<StudentActionResponse> {
  return apiFetch<StudentActionResponse>("/auth/admin/students/move-class", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function exportStudentsCsv(params: ListStudentsParams = {}): Promise<void> {
  const token = useAuthStore.getState().token;
  const res = await fetch(`${API_BASE}/auth/admin/students/export${studentsQuery(params)}`, {
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
  link.download = `students-export-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
