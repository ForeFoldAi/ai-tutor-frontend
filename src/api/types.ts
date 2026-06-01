export type RoleApi =
  | "STUDENT"
  | "TUTOR"
  | "SCHOOL_ADMIN"
  | "ORG_ADMIN"
  | "MASTER_ADMIN";

/** One school class (grade) and sections — used for tutor scope or student enrollment. */
export interface TeachingClassAssignment {
  grade: string;
  sections: string[];
}

/** Student enrollment: one grade and exactly one section (matches API validation). */
export interface StudentClassEnrollment {
  grade: string;
  sections: [string];
}

export interface ApiUser {
  id: string;
  full_name: string;
  email: string;
  role: RoleApi;
  is_active: boolean;
  is_verified: boolean;
  organization_id: string | null;
  school_id: string | null;
  teaching_board?: string | null;
  teaching_classes?: TeachingClassAssignment[] | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** GET/PATCH /auth/admin/organization */
export interface OrganizationDetail {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  is_active: boolean;
  created_at: string;
}

export interface UpdateOrganizationPayload {
  name: string;
  phone?: string | null;
  address?: string | null;
}

/** PATCH /auth/me/profile */
export interface UpdateMeProfilePayload {
  full_name: string;
  email: string;
  current_password?: string;
  new_password?: string;
}

export interface OrganizationSignupPayload {
  full_name: string;
  email: string;
  password: string;
  organization_name: string;
  phone?: string;
  address?: string;
}

export interface AdminCreateUserPayload {
  full_name: string;
  email: string;
  password: string;
  organization_id?: string;
  school_id?: string;
}

/** POST /auth/admin/create-tutor */
export interface CreateTutorPayload extends AdminCreateUserPayload {
  school_id: string;
  teaching_board?: string;
  teaching_classes: TeachingClassAssignment[];
}

/** PATCH /auth/admin/users/:id/tutor */
export interface UpdateTutorPayload {
  full_name: string;
  email: string;
  school_id: string;
  teaching_board?: string;
  teaching_classes: TeachingClassAssignment[];
  /** Omit or leave unset to keep the current password. */
  new_password?: string;
}

/** POST /auth/admin/create-student */
export interface CreateStudentPayload extends AdminCreateUserPayload {
  school_id: string;
  teaching_board?: string;
  teaching_classes: [StudentClassEnrollment];
}

/** PATCH /auth/admin/users/:id/student */
export interface UpdateStudentPayload {
  full_name: string;
  email: string;
  school_id: string;
  teaching_board?: string;
  teaching_classes: [StudentClassEnrollment];
  new_password?: string;
}

export interface CreateSchoolAdminPayload extends AdminCreateUserPayload {
  /** Add admin to an existing school (omit school_name / branch / board). */
  school_id?: string;
  /** Required when ``school_id`` is not set (new school onboarding). */
  school_name?: string;
  branch?: string;
  board?: string;
}

export interface AuthUsersSummary {
  total: number;
  active: number;
  byRole: Record<string, number>;
}

export interface SchoolAdminBrief {
  id: string;
  full_name: string;
  email: string;
  is_active: boolean;
}

export interface OrganizationSchoolSummary {
  id: string;
  organization_id: string;
  organization_name: string | null;
  name: string;
  branch: string | null;
  board: string | null;
  created_at: string;
  school_admins: SchoolAdminBrief[];
  tutor_count: number;
  student_count: number;
}

export interface PatchSchoolPayload {
  name?: string;
  branch?: string | null;
  board?: string | null;
}

export type BoardEnumApi = "CBSE" | "ICSE" | "STATE_BOARD" | "IB" | "CAMBRIDGE";
export type ClassEnumApi =
  | "CLASS_1"
  | "CLASS_2"
  | "CLASS_3"
  | "CLASS_4"
  | "CLASS_5"
  | "CLASS_6"
  | "CLASS_7"
  | "CLASS_8"
  | "CLASS_9"
  | "CLASS_10";
export type ProcessingStatusApi = "QUEUED" | "PROCESSING" | "EMBEDDED" | "FAILED";

export interface CatalogEnumsResponse {
  boards: BoardEnumApi[];
  classes: ClassEnumApi[];
}

export interface BoardResponse {
  id: string;
  board: BoardEnumApi;
  country: string;
  created_at: string;
}

export interface SyllabusSubjectResponse {
  id: string;
  board: BoardEnumApi;
  class_level: ClassEnumApi;
  subject_name: string;
  created_at: string;
}

export interface StudentChapterApi {
  id: string;
  chapter: string | null;
  file_name: string;
}

export interface StudentSubjectApi {
  id: string;
  board: BoardEnumApi;
  class_level: ClassEnumApi;
  subject_name: string;
  chapters: StudentChapterApi[];
}

export interface TextbookUploadApi {
  id: string;
  file_name: string;
  board: BoardEnumApi;
  class_level: ClassEnumApi;
  subject_name: string;
  chapter: string | null;
  content_type: string | null;
  content_label: string | null;
  file_path: string | null;
  chunk_count: number;
  uploaded_by: string | null;
  upload_date: string;
  ocr_status: ProcessingStatusApi;
  chunk_status: ProcessingStatusApi;
  embedding_status: ProcessingStatusApi;
}

export type ContentTypeApi = "CHAPTER" | "POEM" | "UNIT" | "LESSON" | "MASTER";

export interface EmbeddingStatsApi {
  total_documents: number;
  embedded_count: number;
  failed_count: number;
  pending_count: number;
  total_chunks: number;
  embedding_model: string;
}

export interface ProcessResponseApi {
  id: string;
  chunk_count: number;
  chunk_status: ProcessingStatusApi;
  embedding_status: ProcessingStatusApi;
  message: string;
}
