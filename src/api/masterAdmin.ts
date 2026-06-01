import { apiFetch, API_BASE } from "@/api/index";
import { useAuthStore } from "@/lib/auth-store";
import type {
  ApiUser,
  AuthUsersSummary,
  BoardResponse,
  CatalogEnumsResponse,
  ClassEnumApi,
  ContentTypeApi,
  CreateSchoolAdminPayload,
  CreateStudentPayload,
  CreateTutorPayload,
  EmbeddingStatsApi,
  OrganizationSchoolSummary,
  OrganizationSignupPayload,
  ProcessingStatusApi,
  ProcessResponseApi,
  SyllabusSubjectResponse,
  TextbookUploadApi,
} from "@/api/types";

export async function getAdminUsers(): Promise<ApiUser[]> {
  return apiFetch<ApiUser[]>("/auth/admin/users");
}

export async function getOrganizations(): Promise<ApiUser[]> {
  const users = await getAdminUsers();
  return users.filter((u) => u.role === "ORG_ADMIN");
}

export async function createOrganization(payload: OrganizationSignupPayload): Promise<{ message: string }> {
  return apiFetch<{ message: string }>("/auth/signup/organization", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getMasterAdminSchools(): Promise<OrganizationSchoolSummary[]> {
  return apiFetch<OrganizationSchoolSummary[]>("/auth/admin/schools");
}

export async function createTutor(payload: CreateTutorPayload): Promise<ApiUser> {
  return apiFetch<ApiUser>("/auth/admin/create-tutor", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function createStudent(payload: CreateStudentPayload): Promise<ApiUser> {
  return apiFetch<ApiUser>("/auth/admin/create-student", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function createSchoolAdmin(payload: CreateSchoolAdminPayload): Promise<ApiUser> {
  return apiFetch<ApiUser>("/auth/admin/create-school-admin", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function patchUserStatus(userId: string, is_active: boolean): Promise<ApiUser> {
  return apiFetch<ApiUser>(`/auth/admin/users/${userId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ is_active }),
  });
}

export async function fetchMasterAdminReports(): Promise<AuthUsersSummary> {
  const users = await getAdminUsers();
  const byRole = users.reduce<Record<string, number>>((acc, user) => {
    acc[user.role] = (acc[user.role] || 0) + 1;
    return acc;
  }, {});
  return {
    total: users.length,
    active: users.filter((u) => u.is_active).length,
    byRole,
  };
}

export async function getCatalogEnums(): Promise<CatalogEnumsResponse> {
  return apiFetch<CatalogEnumsResponse>("/auth/admin/catalog/enums");
}

export async function getCatalogBoards(): Promise<BoardResponse[]> {
  return apiFetch<BoardResponse[]>("/auth/admin/catalog/boards");
}

export async function createCatalogBoard(payload: { board: string; country: string }): Promise<BoardResponse> {
  return apiFetch<BoardResponse>("/auth/admin/catalog/boards", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteCatalogBoard(boardId: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/auth/admin/catalog/boards/${boardId}`, { method: "DELETE" });
}

export async function getSyllabusSubjects(): Promise<SyllabusSubjectResponse[]> {
  return apiFetch<SyllabusSubjectResponse[]>("/auth/admin/catalog/syllabus");
}

export async function createSyllabusSubjects(payload: {
  board: string;
  class_names: ClassEnumApi[];
  subject_names: string[];
}): Promise<SyllabusSubjectResponse[]> {
  return apiFetch<SyllabusSubjectResponse[]>("/auth/admin/catalog/syllabus", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getTextbookUploads(): Promise<TextbookUploadApi[]> {
  return apiFetch<TextbookUploadApi[]>("/auth/admin/catalog/textbook-uploads");
}

export async function createTextbookUpload(payload: {
  file_name: string;
  board: string;
  class_name: string;
  subject: string;
  chapter?: string;
}): Promise<TextbookUploadApi> {
  return apiFetch<TextbookUploadApi>("/auth/admin/catalog/textbook-uploads", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function patchTextbookUploadStatus(
  uploadId: string,
  payload: { ocr_status: ProcessingStatusApi; chunk_status: ProcessingStatusApi; embedding_status: ProcessingStatusApi },
): Promise<TextbookUploadApi> {
  return apiFetch<TextbookUploadApi>(`/auth/admin/catalog/textbook-uploads/${uploadId}/status`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteTextbookUpload(uploadId: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/auth/admin/catalog/textbook-uploads/${uploadId}`, { method: "DELETE" });
}

export async function uploadTextbookFiles(params: {
  files: File[];
  board: string;
  class_name: string;
  subject: string;
  content_type: ContentTypeApi;
  content_labels: string;
}): Promise<TextbookUploadApi[]> {
  const formData = new FormData();
  for (const file of params.files) {
    formData.append("files", file);
  }
  formData.append("board", params.board);
  formData.append("class_name", params.class_name);
  formData.append("subject", params.subject);
  formData.append("content_type", params.content_type);
  formData.append("content_labels", params.content_labels);

  const token = useAuthStore.getState().token;
  const res = await fetch(`${API_BASE}/auth/admin/catalog/textbook-uploads/upload`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Upload failed (${res.status})`);
  }
  return res.json();
}

export async function processTextbookUpload(uploadId: string): Promise<ProcessResponseApi> {
  return apiFetch<ProcessResponseApi>(`/auth/admin/catalog/textbook-uploads/${uploadId}/process`, { method: "POST" });
}

export async function getEmbeddingStats(): Promise<EmbeddingStatsApi> {
  return apiFetch<EmbeddingStatsApi>("/auth/admin/catalog/embedding-stats");
}
