import type { ApiUser, AuthUsersSummary } from "@/api/types";

export interface MasterAdminOverview {
  summary: AuthUsersSummary;
  organizations: ApiUser[];
  tutors: ApiUser[];
  students: ApiUser[];
}
