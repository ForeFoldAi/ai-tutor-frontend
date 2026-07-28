import type { ApiUser } from "@/api/types";
import type { StudentRecord } from "@/api/types";

export type LearningType = "Teacher Guided" | "Self Learning";
export type PasswordStatus = "Not Set" | "Generated" | "Logged In";
export type StudentActiveStatus = "Active" | "Inactive";

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
  status: StudentActiveStatus;
  /** Legacy org-admin user payload */
  source?: ApiUser;
  /** School-admin students API record */
  record?: StudentRecord;
}
