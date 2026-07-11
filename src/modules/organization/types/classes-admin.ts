export interface ClassOverviewItem {
  id: string;
  grade: string;
  section: string;
  students: number;
  teachers: number;
  curriculums: string[];
  iconClassName: string;
}

export interface CurriculumItem {
  id: string;
  name: string;
  grades: string;
  subjectsCount: number;
}

export interface SubjectItem {
  id: string;
  name: string;
  code: string;
  curriculums: string[];
  gradeRange: string;
  active: boolean;
}

export interface SubjectMappingOption {
  id: string;
  name: string;
  mapped: boolean;
}

export type TextbookUploadStatus = "Embedded" | "Processing" | "Failed";

export interface TextbookUploadRow {
  id: string;
  fileName: string;
  classLabel: string;
  subjectName: string;
  curriculum: string;
  grade: string;
  section: string;
  contentType: string;
  chapter: string | null;
  chapterName: string | null;
  uploadedAt: string;
  status: TextbookUploadStatus;
}
