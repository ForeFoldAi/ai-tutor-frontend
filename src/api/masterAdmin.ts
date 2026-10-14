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
  SchoolSummary,
  ProcessingStatusApi,
  ProcessResponseApi,
  SubjectImageApi,
  SubjectImageUploadApi,
  SyllabusSubjectResponse,
  TextbookChapterApi,
  TextbookImageAdminApi,
  TextbookImageUpdatePayload,
  TextbookStructureApi,
  TextbookSummaryApi,
  TextbookUploadApi,
  TokenTelemetryResponseApi,
  WorkerStatusResponseApi,
} from "@/api/types";

export async function getAdminUsers(): Promise<ApiUser[]> {
  return apiFetch<ApiUser[]>("/auth/admin/users");
}

export async function getMasterAdminSchools(): Promise<SchoolSummary[]> {
  return apiFetch<SchoolSummary[]>("/auth/admin/schools");
}

export async function deleteSchool(schoolId: number): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/auth/admin/schools/${schoolId}`, { method: "DELETE" });
}

export async function patchSchool(
  schoolId: number,
  payload: Partial<
    Pick<
      SchoolSummary,
      "name" | "branch" | "board" | "email" | "phone" | "website" | "address" | "grades_offered" | "student_strength" | "curricula"
    >
  >
): Promise<SchoolSummary> {
  return apiFetch<SchoolSummary>(`/auth/admin/schools/${schoolId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
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

export async function patchUserStatus(userId: number, is_active: boolean): Promise<ApiUser> {
  return apiFetch<ApiUser>(`/auth/admin/users/${userId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ is_active }),
  });
}

export async function approveUser(userId: number): Promise<ApiUser> {
  return apiFetch<ApiUser>(`/auth/admin/users/${userId}/approve`, { method: "POST" });
}

export type AdminUserUpdatePayload = {
  full_name?: string;
  email?: string;
  phone?: string | null;
  school_id?: number | null;
  new_password?: string;
};

export async function patchAdminUser(userId: number, payload: AdminUserUpdatePayload): Promise<ApiUser> {
  return apiFetch<ApiUser>(`/auth/admin/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteAdminUser(userId: number): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/auth/admin/users/${userId}`, { method: "DELETE" });
}

export type StudentLearning = {
  source: "class" | "individual" | "none";
  class_label: string | null;
  subjects: {
    subject_name: string;
    chapters: { id: number; chapter: string | null }[];
    publisher_id: number | null;
    class_publisher_id: number | null;
    /** null = follows class, 0 = forced default, id = student's own publisher */
    override: number | null;
    options: { id: number; publisher: string }[];
  }[];
};

export async function getStudentLearning(userId: number): Promise<StudentLearning> {
  return apiFetch<StudentLearning>(`/auth/admin/users/${userId}/learning`);
}

export async function setStudentPublisher(
  userId: number,
  subject: string,
  textbook_id: number | null,
): Promise<StudentLearning> {
  return apiFetch<StudentLearning>(`/auth/admin/users/${userId}/publisher`, {
    method: "PUT",
    body: JSON.stringify({ subject, textbook_id }),
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

export async function updateSyllabusSubject(
  id: string | number,
  payload: { board?: string; class_level?: ClassEnumApi; subject_name?: string; image_id?: number | null },
): Promise<SyllabusSubjectResponse> {
  return apiFetch<SyllabusSubjectResponse>(`/auth/admin/catalog/syllabus/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function listSubjectImages(): Promise<SubjectImageApi[]> {
  return apiFetch<SubjectImageApi[]>("/auth/admin/catalog/subject-images");
}

export async function uploadSubjectImages(files: File[]): Promise<SubjectImageUploadApi> {
  const formData = new FormData();
  for (const file of files) formData.append("files", file);
  return apiFetch<SubjectImageUploadApi>("/auth/admin/catalog/subject-images", {
    method: "POST",
    body: formData,
  });
}

export async function deleteSubjectImage(id: number): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/auth/admin/catalog/subject-images/${id}`, { method: "DELETE" });
}

export async function deleteSyllabusSubject(id: string | number): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/auth/admin/catalog/syllabus/${id}`, { method: "DELETE" });
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

export async function deleteTextbookUpload(uploadId: string | number): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/auth/admin/catalog/textbook-uploads/${uploadId}`, { method: "DELETE" });
}

export async function updateTextbookUpload(
  uploadId: string | number,
  payload: { chapter?: string; content_label?: string; content_type?: string }
): Promise<TextbookUploadApi> {
  return apiFetch<TextbookUploadApi>(`/auth/admin/catalog/textbook-uploads/${uploadId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function getTextbookUploadFileUrl(uploadId: string | number): string {
  const token = useAuthStore.getState().token;
  return `${API_BASE}/auth/admin/catalog/textbook-uploads/${uploadId}/file${token ? `?access_token=${encodeURIComponent(token)}&token=${encodeURIComponent(token)}` : ""}`;
}

export async function uploadTextbookFiles(params: {
  files: File[];
  board: string;
  class_name: string;
  subject: string;
  content_type: ContentTypeApi;
  content_labels: string;
  /** Publisher book to attach to; omit for the default pool. */
  textbook_id?: number;
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
  if (params.textbook_id !== undefined) formData.append("textbook_id", String(params.textbook_id));

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

export async function getWorkerStatus(): Promise<WorkerStatusResponseApi> {
  return apiFetch<WorkerStatusResponseApi>("/auth/admin/catalog/worker-status");
}

export async function retryAllFailedUploads(): Promise<{ message: string }> {
  return apiFetch<{ message: string }>("/auth/admin/catalog/retry-all-failed", { method: "POST" });
}

export async function uploadFullTextbook(params: {
  file: File;
  board: string;
  class_name: string;
  subject: string;
  title?: string;
  publisher?: string;
  is_default?: boolean;
  /** Fill an existing publisher that has no PDF yet. */
  textbook_id?: number;
}): Promise<TextbookSummaryApi> {
  const formData = new FormData();
  formData.append("file", params.file);
  formData.append("board", params.board);
  formData.append("class_name", params.class_name);
  formData.append("subject", params.subject);
  if (params.title) formData.append("title", params.title);
  if (params.publisher) formData.append("publisher", params.publisher);
  if (params.is_default !== undefined) formData.append("is_default", String(params.is_default));
  if (params.textbook_id !== undefined) formData.append("textbook_id", String(params.textbook_id));

  const token = useAuthStore.getState().token;
  const res = await fetch(`${API_BASE}/auth/admin/catalog/textbooks/upload`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Full textbook upload failed (${res.status})`);
  }
  return res.json();
}

export async function createPublisher(payload: {
  board: string;
  class_name: string;
  subject: string;
  publisher: string;
}): Promise<TextbookSummaryApi> {
  return apiFetch<TextbookSummaryApi>("/auth/admin/catalog/textbooks/publishers", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** Deletes a book / publisher together with all of its chapters. */
export async function deleteTextbook(textbookId: number): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/auth/admin/catalog/textbooks/${textbookId}`, { method: "DELETE" });
}

export async function getTextbooks(): Promise<TextbookSummaryApi[]> {
  return apiFetch<TextbookSummaryApi[]>("/auth/admin/catalog/textbooks");
}

export async function updateTextbookPublisher(
  textbookId: number,
  payload: { publisher?: string; is_default?: boolean },
): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/auth/admin/catalog/textbooks/${textbookId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function getTextbookStructure(textbookId: number): Promise<TextbookStructureApi> {
  return apiFetch<TextbookStructureApi>(`/auth/admin/catalog/textbooks/${textbookId}/structure`);
}

export async function updateTextbookStructure(
  textbookId: number,
  payload: { chapters: TextbookChapterApi[] },
): Promise<TextbookStructureApi> {
  return apiFetch<TextbookStructureApi>(`/auth/admin/catalog/textbooks/${textbookId}/structure`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function confirmTextbookStructure(textbookId: number): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/auth/admin/catalog/textbooks/${textbookId}/confirm`, {
    method: "POST",
  });
}

export async function retryTextbookProcessing(textbookId: number): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/auth/admin/catalog/textbooks/${textbookId}/retry`, {
    method: "POST",
  });
}

export async function getTextbookStatus(textbookId: number): Promise<{
  textbook_id: number;
  title: string;
  status: string;
  total_chapters: number;
  completed: number;
  failed: number;
  processing: number;
  progress_percent: number;
  chapters: Array<{
    id: number;
    chapter_number: string;
    chapter_title: string;
    start_pdf_page: number;
    end_pdf_page: number;
    status: string;
    error_message?: string;
    textbook_upload_id?: number;
  }>;
}> {
  return apiFetch(`/auth/admin/catalog/textbooks/${textbookId}/status`);
}

export async function getTokenTelemetry(timeframe: string = "month"): Promise<TokenTelemetryResponseApi> {
  return apiFetch<TokenTelemetryResponseApi>(`/auth/admin/telemetry/tokens?timeframe=${encodeURIComponent(timeframe)}`);
}

export async function getTextbookUploadImages(uploadId: number | string): Promise<TextbookImageAdminApi[]> {
  return apiFetch<TextbookImageAdminApi[]>(`/auth/admin/catalog/textbook-uploads/${uploadId}/images`);
}

export async function updateTextbookImage(
  imageId: number,
  payload: TextbookImageUpdatePayload,
): Promise<TextbookImageAdminApi> {
  return apiFetch<TextbookImageAdminApi>(`/auth/admin/catalog/textbook-images/${imageId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteTextbookImage(imageId: number): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/auth/admin/catalog/textbook-images/${imageId}`, {
    method: "DELETE",
  });
}

export async function cropTextbookImage(
  imageId: number,
  payload: {
    file?: Blob | File;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    rotate?: number;
    page_index?: number;
  },
): Promise<TextbookImageAdminApi> {
  const formData = new FormData();
  if (payload.file) {
    formData.append("file", payload.file);
  }
  if (payload.x !== undefined) formData.append("x", String(payload.x));
  if (payload.y !== undefined) formData.append("y", String(payload.y));
  if (payload.width !== undefined) formData.append("width", String(payload.width));
  if (payload.height !== undefined) formData.append("height", String(payload.height));
  if (payload.rotate !== undefined) formData.append("rotate", String(payload.rotate));
  if (payload.page_index !== undefined) formData.append("page_index", String(payload.page_index));

  const token = useAuthStore.getState().token;
  const res = await fetch(`${API_BASE}/auth/admin/catalog/textbook-images/${imageId}/crop`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  if (!res.ok) {
    const text = await res.text();
    let msg = `Failed to crop image (${res.status})`;
    try {
      const parsed = JSON.parse(text);
      if (parsed.detail) msg = parsed.detail;
    } catch {
      if (text) msg = text;
    }
    throw new Error(msg);
  }
  return res.json();
}

export async function getUploadPdfPagesInfo(uploadId: number | string): Promise<{
  upload_id: number;
  total_pages: number;
  file_name: string;
}> {
  return apiFetch(`/auth/admin/catalog/textbook-uploads/${uploadId}/pdf-pages-info`);
}

export function getUploadPdfPageImageUrl(uploadId: number | string, pageIndex: number, dpi: number = 150): string {
  const token = useAuthStore.getState().token;
  const authQuery = token ? `?token=${encodeURIComponent(token)}&dpi=${dpi}` : `?dpi=${dpi}`;
  return `${API_BASE}/auth/admin/catalog/textbook-uploads/${uploadId}/pdf-page/${pageIndex}${authQuery}`;
}

export async function createManualTextbookImage(
  uploadId: number | string,
  payload: {
    file: Blob | File;
    caption?: string;
    figure_number?: string;
    page_index: number;
    image_type?: string;
    educational_role?: string;
    title?: string;
  },
): Promise<TextbookImageAdminApi> {
  const formData = new FormData();
  formData.append("file", payload.file);
  if (payload.caption) formData.append("caption", payload.caption);
  if (payload.figure_number) formData.append("figure_number", payload.figure_number);
  formData.append("page_index", String(payload.page_index));
  if (payload.image_type) formData.append("image_type", payload.image_type);
  if (payload.educational_role) formData.append("educational_role", payload.educational_role);
  if (payload.title) formData.append("title", payload.title);

  const token = useAuthStore.getState().token;
  const res = await fetch(`${API_BASE}/auth/admin/catalog/textbook-uploads/${uploadId}/images`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  if (!res.ok) {
    const text = await res.text();
    let msg = `Failed to create figure from crop (${res.status})`;
    try {
      const parsed = JSON.parse(text);
      if (parsed.detail) msg = parsed.detail;
    } catch {
      if (text) msg = text;
    }
    throw new Error(msg);
  }
  return res.json();
}

