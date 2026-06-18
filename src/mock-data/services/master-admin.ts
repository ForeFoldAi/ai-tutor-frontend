import type {
  ApiUser,
  AuthUsersSummary,
  BoardResponse,
  CatalogEnumsResponse,
  ClassEnumApi,
  ContentTypeApi,
  EmbeddingStatsApi,
  OrganizationSchoolSummary,
  OrganizationSignupPayload,
  ProcessingStatusApi,
  ProcessResponseApi,
  SyllabusSubjectResponse,
  TextbookUploadApi,
} from "@/api/types";
import { useAuthStore } from "@/lib/auth-store";
import { delay } from "../delay";
import { catalogEnums, embeddingStats } from "../fixtures/catalog";
import { mockStore } from "../store";
import { createOrganizationSchoolAdmin, createOrganizationStudent, onboardOrganizationTutor } from "./organization";
import { mockSignupOrganization } from "./auth";

function now() {
  return new Date().toISOString();
}

export async function getAdminUsers(): Promise<ApiUser[]> {
  await delay();
  return [...mockStore.users];
}

export async function getOrganizations(): Promise<ApiUser[]> {
  const users = await getAdminUsers();
  return users.filter((u) => u.role === "ORG_ADMIN");
}

export async function createOrganization(payload: OrganizationSignupPayload): Promise<{ message: string }> {
  return mockSignupOrganization(payload);
}

export async function getMasterAdminSchools(): Promise<OrganizationSchoolSummary[]> {
  await delay();
  return [...mockStore.schools];
}

export { onboardOrganizationTutor as createTutor, createOrganizationStudent as createStudent, createOrganizationSchoolAdmin as createSchoolAdmin };

export async function patchUserStatus(userId: string, is_active: boolean): Promise<ApiUser> {
  await delay();
  const user = mockStore.users.find((u) => u.id === userId);
  if (!user) throw new Error("User not found");
  user.is_active = is_active;
  user.updated_at = now();
  return { ...user };
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
  await delay();
  return { ...catalogEnums };
}

export async function getCatalogBoards(): Promise<BoardResponse[]> {
  await delay();
  return [...mockStore.boards];
}

export async function createCatalogBoard(payload: { board: string; country: string }): Promise<BoardResponse> {
  await delay();
  const board: BoardResponse = {
    id: `board-${crypto.randomUUID()}`,
    board: payload.board as BoardResponse["board"],
    country: payload.country,
    created_at: now(),
  };
  mockStore.boards.push(board);
  return { ...board };
}

export async function deleteCatalogBoard(boardId: string): Promise<{ message: string }> {
  await delay();
  mockStore.boards = mockStore.boards.filter((b) => b.id !== boardId);
  return { message: "Board deleted" };
}

export async function getSyllabusSubjects(): Promise<SyllabusSubjectResponse[]> {
  await delay();
  return [...mockStore.syllabus];
}

export async function createSyllabusSubjects(payload: {
  board: string;
  class_names: ClassEnumApi[];
  subject_names: string[];
}): Promise<SyllabusSubjectResponse[]> {
  await delay();
  const created: SyllabusSubjectResponse[] = [];
  for (const class_level of payload.class_names) {
    for (const subject_name of payload.subject_names) {
      const row: SyllabusSubjectResponse = {
        id: `syl-${crypto.randomUUID()}`,
        board: payload.board as SyllabusSubjectResponse["board"],
        class_level,
        subject_name,
        created_at: now(),
      };
      mockStore.syllabus.push(row);
      created.push(row);
    }
  }
  return created;
}

export async function getTextbookUploads(): Promise<TextbookUploadApi[]> {
  await delay();
  return [...mockStore.textbookUploads];
}

export async function createTextbookUpload(payload: {
  file_name: string;
  board: string;
  class_name: string;
  subject: string;
  chapter?: string;
}): Promise<TextbookUploadApi> {
  await delay();
  const upload: TextbookUploadApi = {
    id: `upload-${crypto.randomUUID()}`,
    file_name: payload.file_name,
    board: payload.board as TextbookUploadApi["board"],
    class_level: payload.class_name as TextbookUploadApi["class_level"],
    subject_name: payload.subject,
    chapter: payload.chapter ?? null,
    content_type: "CHAPTER",
    content_label: payload.chapter ?? null,
    file_path: null,
    chunk_count: 0,
    uploaded_by: useAuthStore.getState().user?.id ?? null,
    upload_date: now(),
    ocr_status: "QUEUED",
    chunk_status: "QUEUED",
    embedding_status: "QUEUED",
  };
  mockStore.textbookUploads.push(upload);
  return { ...upload };
}

export async function patchTextbookUploadStatus(
  uploadId: string,
  payload: { ocr_status: ProcessingStatusApi; chunk_status: ProcessingStatusApi; embedding_status: ProcessingStatusApi },
): Promise<TextbookUploadApi> {
  await delay();
  const upload = mockStore.textbookUploads.find((u) => u.id === uploadId);
  if (!upload) throw new Error("Upload not found");
  Object.assign(upload, payload);
  return { ...upload };
}

export async function deleteTextbookUpload(uploadId: string): Promise<{ message: string }> {
  await delay();
  mockStore.textbookUploads = mockStore.textbookUploads.filter((u) => u.id !== uploadId);
  return { message: "Upload deleted" };
}

export async function uploadTextbookFiles(params: {
  files: File[];
  board: string;
  class_name: string;
  subject: string;
  content_type: ContentTypeApi;
  content_labels: string;
}): Promise<TextbookUploadApi[]> {
  await delay(800);
  const labels = params.content_labels.split(",").map((l) => l.trim());
  return params.files.map((file, i) => {
    const upload: TextbookUploadApi = {
      id: `upload-${crypto.randomUUID()}`,
      file_name: file.name,
      board: params.board as TextbookUploadApi["board"],
      class_level: params.class_name as TextbookUploadApi["class_level"],
      subject_name: params.subject,
      chapter: labels[i] ?? null,
      content_type: params.content_type,
      content_label: labels[i] ?? null,
      file_path: `/mock/uploads/${file.name}`,
      chunk_count: 0,
      uploaded_by: useAuthStore.getState().user?.id ?? null,
      upload_date: now(),
      ocr_status: "QUEUED",
      chunk_status: "QUEUED",
      embedding_status: "QUEUED",
    };
    mockStore.textbookUploads.push(upload);
    return { ...upload };
  });
}

export async function processTextbookUpload(uploadId: string): Promise<ProcessResponseApi> {
  await delay(1000);
  const upload = mockStore.textbookUploads.find((u) => u.id === uploadId);
  if (!upload) throw new Error("Upload not found");
  upload.ocr_status = "EMBEDDED";
  upload.chunk_status = "EMBEDDED";
  upload.embedding_status = "EMBEDDED";
  upload.chunk_count = 24;
  return {
    id: uploadId,
    chunk_count: 24,
    chunk_status: "EMBEDDED",
    embedding_status: "EMBEDDED",
    message: "Processing complete",
  };
}

export async function getEmbeddingStats(): Promise<EmbeddingStatsApi> {
  await delay();
  const uploads = mockStore.textbookUploads;
  return {
    ...embeddingStats,
    total_documents: uploads.length,
    embedded_count: uploads.filter((u) => u.embedding_status === "EMBEDDED").length,
    pending_count: uploads.filter((u) => u.embedding_status !== "EMBEDDED").length,
    total_chunks: uploads.reduce((sum, u) => sum + u.chunk_count, 0),
  };
}
