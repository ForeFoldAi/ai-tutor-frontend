import type { ApiUser } from "@/api/types";

export type LearningType = "Teacher Guided" | "Self Learning";
export type PasswordStatus = "Set" | "Not Set";

export interface SchoolStudentFilters {
  search: string;
  grade: string;
  section: string;
  curriculum: string;
  learningType: string;
}

export interface SchoolStudentRow {
  id: string;
  fullName: string;
  userId: string;
  rollNumber?: string;
  parentPhone?: string;
  parentEmail?: string;
  grade: string;
  section: string;
  curriculum: string;
  learningType: LearningType;
  learningTeacher: string | null;
  passwordStatus: PasswordStatus;
  source?: ApiUser;
}
