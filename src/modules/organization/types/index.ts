import type { ApiUser } from "@/api/types";

export interface OrganizationReport {
  tutorCount: number;
  studentCount: number;
  activeUsers: number;
}

export interface OrganizationAssignment {
  tutor: ApiUser;
  students: ApiUser[];
}
