import type {
  BoardResponse,
  CatalogEnumsResponse,
  EmbeddingStatsApi,
  SyllabusSubjectResponse,
  TextbookUploadApi,
} from "@/api/types";

export const catalogEnums: CatalogEnumsResponse = {
  boards: ["CBSE", "ICSE", "STATE_BOARD", "IB", "CAMBRIDGE"],
  classes: [
    "CLASS_1",
    "CLASS_2",
    "CLASS_3",
    "CLASS_4",
    "CLASS_5",
    "CLASS_6",
    "CLASS_7",
    "CLASS_8",
    "CLASS_9",
    "CLASS_10",
  ],
};

export const initialBoards: BoardResponse[] = [
  { id: "board-1", board: "CBSE", country: "India", created_at: "2026-01-01T00:00:00.000Z" },
  { id: "board-2", board: "ICSE", country: "India", created_at: "2026-01-02T00:00:00.000Z" },
  { id: "board-3", board: "IB", country: "International", created_at: "2026-01-03T00:00:00.000Z" },
];

export const initialSyllabus: SyllabusSubjectResponse[] = [
  {
    id: "syl-1",
    board: "CBSE",
    class_level: "CLASS_9",
    subject_name: "Mathematics",
    created_at: "2026-02-01T00:00:00.000Z",
  },
  {
    id: "syl-2",
    board: "CBSE",
    class_level: "CLASS_9",
    subject_name: "Science",
    created_at: "2026-02-01T00:00:00.000Z",
  },
  {
    id: "syl-3",
    board: "CBSE",
    class_level: "CLASS_10",
    subject_name: "Physics",
    created_at: "2026-02-02T00:00:00.000Z",
  },
  {
    id: "syl-4",
    board: "CBSE",
    class_level: "CLASS_8",
    subject_name: "English",
    created_at: "2026-02-03T00:00:00.000Z",
  },
];

export const initialTextbookUploads: TextbookUploadApi[] = [
  {
    id: "upload-1",
    file_name: "ncert-math-class9-ch1.pdf",
    board: "CBSE",
    class_level: "CLASS_9",
    subject_name: "Mathematics",
    chapter: "Number Systems",
    content_type: "CHAPTER",
    content_label: "Chapter 1",
    file_path: "/mock/textbooks/ncert-math-class9-ch1.pdf",
    chunk_count: 42,
    uploaded_by: "user-master-1",
    upload_date: "2026-03-15T08:00:00.000Z",
    ocr_status: "EMBEDDED",
    chunk_status: "EMBEDDED",
    embedding_status: "EMBEDDED",
  },
  {
    id: "upload-2",
    file_name: "ncert-science-class9-ch3.pdf",
    board: "CBSE",
    class_level: "CLASS_9",
    subject_name: "Science",
    chapter: "Atoms and Molecules",
    content_type: "CHAPTER",
    content_label: "Chapter 3",
    file_path: "/mock/textbooks/ncert-science-class9-ch3.pdf",
    chunk_count: 38,
    uploaded_by: "user-master-1",
    upload_date: "2026-03-16T09:30:00.000Z",
    ocr_status: "EMBEDDED",
    chunk_status: "EMBEDDED",
    embedding_status: "EMBEDDED",
  },
  {
    id: "upload-3",
    file_name: "ncert-physics-class10-ch2.pdf",
    board: "CBSE",
    class_level: "CLASS_10",
    subject_name: "Physics",
    chapter: "Light - Reflection and Refraction",
    content_type: "CHAPTER",
    content_label: "Chapter 2",
    file_path: null,
    chunk_count: 0,
    uploaded_by: "user-master-1",
    upload_date: "2026-04-01T12:00:00.000Z",
    ocr_status: "PROCESSING",
    chunk_status: "QUEUED",
    embedding_status: "QUEUED",
  },
];

export const embeddingStats: EmbeddingStatsApi = {
  total_documents: 3,
  embedded_count: 2,
  failed_count: 0,
  pending_count: 1,
  total_chunks: 80,
  embedding_model: "text-embedding-3-small",
};
