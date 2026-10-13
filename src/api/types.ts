export type RoleApi =
  | "STUDENT"
  | "TUTOR"
  | "SCHOOL_ADMIN"
  | "MASTER_ADMIN";

/** One school class (grade) and sections — used for tutor scope or student enrollment. */
export interface TeachingClassAssignment {
  grade: string;
  sections: string[];
  curriculum?: string | null;
  school_class_id?: number | null;
}

/** Student enrollment: one grade and exactly one section (matches API validation). */
export interface StudentClassEnrollment {
  grade: string;
  sections: [string];
}

export interface ApiUser {
  id: number;
  full_name: string;
  email: string;
  role: RoleApi;
  is_active: boolean;
  is_verified: boolean;
  approved_at?: string | null;
  school_id: number | null;
  phone?: string | null;
  designation?: string | null;
  teaching_board?: string | null;
  teaching_subjects?: string[] | null;
  teaching_classes?: TeachingClassAssignment[] | null;
  student_grade?: string | null;
  curricula?: string[] | null;
  parent_email?: string | null;
  favorite_subjects?: string[] | null;
  learning_goals?: string[] | null;
  preferred_learning_method?: string | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface TeacherRecord {
  id: number;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  school_id: number | null;
  subject: string | null;
  grades: string | null;
  /** Nested grade → subjects rows for school-admin teachers table. */
  assignments?: TeacherGradeSubjects[];
  assigned_students: number;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
  updated_at: string;
}

export interface TeacherGradeSubjects {
  grade: string;
  subjects: string;
}

export interface TeacherSubjectBrief {
  id: number;
  name: string;
  code: string;
}

export interface TeacherClassBrief {
  id: number;
  grade: string;
  section: string;
  curriculum: string;
}

export interface TeacherStudentBrief {
  id: number;
  full_name: string;
  email: string;
  grade: string | null;
  section: string | null;
}

export interface TeacherDetail extends TeacherRecord {
  subjects: TeacherSubjectBrief[];
  classes: TeacherClassBrief[];
  students: TeacherStudentBrief[];
}

export interface TeacherUnassignPayload {
  subject_ids?: number[];
  class_ids?: number[];
  student_ids?: number[];
}

export interface TeacherCreatePayload {
  full_name: string;
  phone: string;
  email: string;
}

export interface TeacherUpdatePayload {
  full_name?: string;
  phone?: string | null;
  email?: string;
  is_active?: boolean;
  teaching_board?: string | null;
}

export interface PaginationMeta {
  total: number;
  limit: number;
  offset: number;
  default_limit: number;
}

export interface PaginatedTeachersResponse {
  items: TeacherRecord[];
  meta: PaginationMeta;
}

export interface TeacherOptionsResponse {
  subjects: string[];
  default_limit: number;
  page_size_options: number[];
}

export interface StudentRecord {
  id: number;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  school_id: number | null;
  grade: string | null;
  section: string | null;
  curriculum: string | null;
  learning_type: string;
  learning_teacher: string | null;
  learning_teacher_ids?: number[];
  /** Class subjects covered by a matched teacher. */
  teacher_guided_subjects?: string[];
  /** Class subjects with no matched teacher (Self learned). */
  self_learned_subjects?: string[];
  password_status: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StudentCreatePayload {
  roll_number: string;
  student_name: string;
  parent_phone: string;
  parent_email: string;
}

export interface StudentUpdatePayload {
  student_name?: string;
  parent_phone?: string | null;
  parent_email?: string;
  is_active?: boolean;
  grade?: string;
  section?: string;
  curriculum?: string;
  class_id?: number;
}

export interface PaginatedStudentsResponse {
  items: StudentRecord[];
  meta: PaginationMeta;
}

export interface StudentOptionsResponse {
  grades: string[];
  sections: string[];
  curricula: string[];
  learning_types: string[];
  default_limit: number;
  page_size_options: number[];
}

export interface BulkStudentRowError {
  row: number;
  email: string | null;
  roll_number: string | null;
  message: string;
}

export interface BulkStudentCreateResponse {
  created: StudentRecord[];
  errors: BulkStudentRowError[];
}

export interface StudentActionResponse {
  message: string;
  updated: number;
}

export interface BulkTeacherRowError {
  row: number;
  email: string | null;
  message: string;
}

export interface BulkTeacherCreateResponse {
  created: TeacherRecord[];
  errors: BulkTeacherRowError[];
}

export interface TeacherAssignPayload {
  teacher_ids: number[];
  class_ids?: number[];
  subject_ids?: number[];
}

export interface TeacherAssignResponse {
  updated: number;
  message: string;
}

export interface SchoolSubjectRecord {
  id: number;
  name: string;
  code: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SchoolClassRecord {
  id: number;
  grade: string;
  section: string;
  curriculum: string;
  students: number;
  teachers: number;
  created_at: string;
  updated_at: string;
}

export interface PaginatedSubjectsResponse {
  items: SchoolSubjectRecord[];
  meta: PaginationMeta;
}

export interface PaginatedClassesResponse {
  items: SchoolClassRecord[];
  meta: PaginationMeta;
}

export interface ClassOptionsResponse {
  curricula: string[];
  default_limit: number;
  page_size_options: number[];
}

export interface BulkSubjectRowError {
  row: number;
  field: string | null;
  message: string;
}

export interface BulkClassRowError {
  row: number;
  field: string | null;
  message: string;
}

export interface BulkSubjectCreateResponse {
  created: SchoolSubjectRecord[];
  errors: BulkSubjectRowError[];
}

export interface BulkClassCreateResponse {
  created: SchoolClassRecord[];
  errors: BulkClassRowError[];
}

export interface ClassSubjectMappingsResponse {
  mappings: Record<string, Record<string, boolean>>;
  /** class key -> subject id -> chosen publisher textbook id (absent = default book) */
  textbooks?: Record<string, Record<string, number>>;
}

export interface ClassTextbookOption {
  id: number;
  title: string;
  publisher: string | null;
  is_default: boolean;
}

export interface ClassTextbookOptionsResponse {
  /** subject id -> books available for this class's board/grade */
  options: Record<string, ClassTextbookOption[]>;
}

/** GET/PATCH /auth/admin/school */
export interface SchoolDetail {
  id: number;
  name: string;
  branch: string | null;
  board: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  grades_offered: string | null;
  student_strength: string | null;
  curricula: string[];
  is_active: boolean;
  created_at: string;
}

export interface UpdateSchoolProfilePayload {
  name: string;
  branch?: string | null;
  board?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  website?: string | null;
  grades_offered?: string | null;
  student_strength?: string | null;
  curricula?: string[];
}

/** PATCH /auth/me/profile */
export interface UpdateMeProfilePayload {
  full_name: string;
  email: string;
  phone?: string | null;
  designation?: string | null;
  grade?: string | null;
  curricula?: string[];
  parent_email?: string | null;
  favorite_subjects?: string[];
  learning_goals?: string[];
  preferred_learning_method?: string | null;
  current_password?: string;
  new_password?: string;
}

/** GET/PATCH/DELETE /auth/me/settings */
export interface UserSettings {
  /** Sequential account number (same as UserResponse.id). */
  user_id: number;
  username: string | null;
  language: string;
  theme: "light" | "dark";
  notify_email: boolean;
  notify_push: boolean;
  notify_assignments: boolean;
  notify_sessions: boolean;
  notify_messages: boolean;
  created_at: string;
  updated_at: string;
}

export interface UpdateUserSettingsPayload {
  username?: string | null;
  language?: string;
  theme?: "light" | "dark";
  notify_email?: boolean;
  notify_push?: boolean;
  notify_assignments?: boolean;
  notify_sessions?: boolean;
  notify_messages?: boolean;
}


export interface SignupResponse {
  /** Sequential account number: 1, 2, 3, … */
  id: number;
  /** Chosen login user ID */
  user_id: string;
  role: RoleApi;
  message: string;
}

/** GET /auth/signup/options */
export interface SignupOptions {
  curricula: string[];
  student_grades: string[];
  student_subjects: string[];
  learning_goals: string[];
  learning_methods: string[];
  tutor_subjects: string[];
  teaching_experience: string[];
  tutor_grade_ranges: string[];
  class_sizes: string[];
  teaching_modes: string[];
  school_grade_ranges: string[];
  student_strength: string[];
}

/** POST /auth/signup/student */
export interface StudentSignupPayload {
  full_name: string;
  grade: string;
  user_id: string;
  password: string;
  curricula: string[];
  parent_phone?: string;
  parent_email?: string;
  favorite_subjects?: string[];
  learning_goals?: string[];
  preferred_learning_method?: "ai-tutor" | "ai-voice" | "videos";
}

/** POST /auth/signup/tutor */
export interface TutorSignupPayload {
  full_name: string;
  user_id: string;
  password: string;
  email: string;
  mobile: string;
  teaching_experience: string;
  grades_teach: string;
  class_size: string;
  teaching_subjects: string[];
  teaching_modes: string[];
  bio?: string;
}

/** POST /auth/signup/school */
export interface SchoolSignupPayload {
  school_name: string;
  school_email: string;
  phone: string;
  address: string;
  full_name: string;
  designation: string;
  recovery_email: string;
  mobile: string;
  user_id: string;
  password: string;
  grades_offered: string;
  student_strength: string;
  curricula: string[];
  website?: string;
}

export interface AdminCreateUserPayload {
  full_name: string;
  email: string;
  password: string;
  school_id?: number;
}

/** POST /auth/admin/create-tutor */
export interface CreateTutorPayload extends AdminCreateUserPayload {
  school_id: number;
  teaching_board?: string;
  teaching_classes: TeachingClassAssignment[];
}

/** PATCH /auth/admin/users/:id/tutor */
export interface UpdateTutorPayload {
  full_name: string;
  email: string;
  school_id: number;
  teaching_board?: string;
  teaching_classes: TeachingClassAssignment[];
  /** Omit or leave unset to keep the current password. */
  new_password?: string;
}

/** POST /auth/admin/create-student */
export interface CreateStudentPayload extends AdminCreateUserPayload {
  school_id: number;
  teaching_board?: string;
  teaching_classes: [StudentClassEnrollment];
}

/** PATCH /auth/admin/users/:id/student */
export interface UpdateStudentPayload {
  full_name: string;
  email: string;
  school_id: number;
  teaching_board?: string;
  teaching_classes: [StudentClassEnrollment];
  new_password?: string;
}

export interface CreateSchoolAdminPayload extends AdminCreateUserPayload {
  /** Add admin to an existing school (omit school_name / branch / board). */
  school_id?: number;
  /** Required when ``school_id`` is not set (new school onboarding). */
  school_name?: string;
  branch?: string;
  board?: string;
  phone?: string;
}

export interface AuthUsersSummary {
  total: number;
  active: number;
  byRole: Record<string, number>;
}

export interface SchoolAdminBrief {
  id: number;
  full_name: string;
  email: string;
  is_active: boolean;
}

export interface SchoolSummary {
  id: number;
  name: string;
  branch: string | null;
  board: string | null;
  /** Present when API nests schools under an org. */
  organization_name?: string | null;
  created_at: string;
  school_admins: SchoolAdminBrief[];
  tutor_count: number;
  student_count: number;
  class_count?: number;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  address?: string | null;
  grades_offered?: string | null;
  student_strength?: string | null;
  curricula?: string[];
}

/** @deprecated use SchoolSummary */
export type OrganizationSchoolSummary = SchoolSummary;

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
  image_url?: string | null;
  created_at: string;
}

export interface StudentChapterApi {
  id: string | number;
  chapter: string | null;
  file_name: string;
}

export interface StudentSubjectApi {
  id: string | number;
  board: BoardEnumApi;
  class_level: ClassEnumApi;
  subject_name: string;
  image_url?: string | null;
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
  /** Book this chapter was split from; null = standalone chapter (default pool). */
  textbook_id?: number | null;
}

export interface TextbookImageAdminApi {
  id: number;
  textbook_upload_id: number;
  page_index: number;
  sequence: number;
  file_name: string;
  image_url: string;
  caption: string | null;
  caption_normalized: string | null;
  image_type: string;
  figure_number: string | null;
  title: string | null;
  educational_role: string;
  educational_description: string | null;
  is_decorative: boolean;
  image_bbox: string | null;
  structured_content?: string | null;
  content_kind?: string;
  created_at?: string | null;
}

export interface TextbookImageUpdatePayload {
  caption?: string | null;
  title?: string | null;
  figure_number?: string | null;
  image_type?: string | null;
  educational_role?: string | null;
  is_decorative?: boolean | null;
  educational_description?: string | null;
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

export interface WorkerNodeApi {
  name: string;
  status: "online" | "degraded" | "offline";
  concurrency: number;
  active_tasks_count: number;
  processed_total: number;
  active_queues: string[];
}

export interface QueueDepthApi {
  catalog_ingest: number;
  lesson_generate: number;
  mail: number;
}

export interface ActiveJobApi {
  task_id: string;
  task_name: string;
  args: string[];
  worker: string;
  time_start?: number | null;
  target_label?: string;
}

export interface RecentProcessApi {
  id: number;
  file_name: string;
  board: string;
  class_level: string;
  subject_name: string;
  chunk_count: number;
  embedding_status: string;
  updated_at?: string | null;
}

export interface WorkerStatusResponseApi {
  status: "HEALTHY" | "DEGRADED" | "OFFLINE";
  redis_connected: boolean;
  workers: WorkerNodeApi[];
  queue_depths: QueueDepthApi;
  active_jobs: ActiveJobApi[];
  total_documents: number;
  embedded_count: number;
  failed_count: number;
  processing_count: number;
  queued_count: number;
  total_chunks: number;
  recent_processes: RecentProcessApi[];
  vector_backend: string;
  storage_backend: string;
}

export interface TextbookChapterApi {
  id?: number;
  parent_id?: number | null;
  chapter_number: string;
  chapter_title: string;
  hierarchy_level?: string;
  start_pdf_page: number;
  end_pdf_page: number;
  printed_start_page?: string | null;
  printed_end_page?: string | null;
  is_non_chapter_section: boolean;
  section_type: string;
  detection_method: string;
  confidence_score: number;
  confidence_flags: string[];
  status: string;
  error_message?: string | null;
  textbook_upload_id?: number | null;
  sub_chapters?: TextbookChapterApi[];
}

export interface TextbookStructureApi {
  textbook_id: number;
  title: string;
  total_pages: number;
  pdf_type: string;
  status: string;
  page_offset?: number | null;
  confidence_score?: number | null;
  detection_method?: string;
  needs_manual_review?: boolean;
  review_warnings?: string[];
  chapters: TextbookChapterApi[];
  non_chapter_sections: TextbookChapterApi[];
}

export interface TextbookSummaryApi {
  id: number;
  title: string;
  file_name: string;
  board: BoardEnumApi;
  class_level: ClassEnumApi;
  subject_name: string;
  publisher?: string | null;
  is_default?: boolean;
  total_pages: number;
  pdf_type: string;
  status: string;
  chapter_count: number;
  completed_chapters?: number;
  created_at: string;
  updated_at: string;
}

export interface UserTokenUsageApi {
  user_id: number;
  full_name: string;
  email: string;
  role: string;
  school_id: number | null;
  total_tokens: number;
  prompt_tokens: number;
  completion_tokens: number;
  tokens_day: number;
  tokens_week: number;
  tokens_month: number;
}

export interface SchoolTokenUsageApi {
  school_id: number;
  school_name: string;
  branch: string | null;
  board: string | null;
  user_count: number;
  total_tokens: number;
  prompt_tokens: number;
  completion_tokens: number;
  tokens_day: number;
  tokens_week: number;
  tokens_month: number;
  quota_limit: number;
  quota_used_percent: number;
}

export interface TokenTelemetryResponseApi {
  timeframe: string;
  total_platform_tokens: number;
  total_prompt_tokens: number;
  total_completion_tokens: number;
  school_usage: SchoolTokenUsageApi[];
  user_usage: UserTokenUsageApi[];
}

