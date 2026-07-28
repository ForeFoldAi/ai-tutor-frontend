import type { TeacherRecord } from "@/api/types";

export type TeacherStatus = "Active" | "Inactive";

export interface TeacherFilters {
  search: string;
  subject: string;
  status: string;
}

export interface TeacherAssignmentRow {
  grade: string;
  subjects: string;
}

export interface TeacherRow {
  id: string;
  fullName: string;
  userId: string;
  email?: string;
  phone?: string;
  subject: string;
  grades: string;
  /** One nested row per grade/section for table view. */
  assignments: TeacherAssignmentRow[];
  assignedStudents: number;
  status: TeacherStatus;
  lastLogin: string;
  avatarColor: string;
  source?: TeacherRecord;
}
