import type { ApiUser } from "@/api/types";

export type TeacherStatus = "Active" | "Inactive";

export interface TeacherFilters {
  search: string;
  subject: string;
  status: string;
}

export interface TeacherRow {
  id: string;
  fullName: string;
  userId: string;
  email?: string;
  phone?: string;
  subject: string;
  grades: string;
  assignedStudents: number;
  status: TeacherStatus;
  lastLogin: string;
  avatarColor: string;
  source?: ApiUser;
}
