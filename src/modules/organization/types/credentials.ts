export type CredentialRole = "Teacher" | "Student";

export type FirstLoginStatus = "Completed" | "Pending" | "Not Started";

export type DeliveryStatus =
  | "Email Sent"
  | "In Process"
  | "Failed"
  | "Not Sent"
  | "Pending"; // legacy rows mapped from backend

export interface CredentialCandidate {
  id: string;
  name: string;
  role: CredentialRole;
  userId: string;
  grade?: string;
  section?: string;
  detail?: string;
  hasCredentials: boolean;
}

export type CredentialCandidateSort = "name_asc" | "name_desc" | "user_id_asc";

export interface AddCredsCandidateFilters {
  search: string;
  grade: string;
  section: string;
  credentialStatus: "all" | "needs" | "has";
  sort: CredentialCandidateSort;
}

export interface CredentialRecord {
  id: string;
  name: string;
  role: CredentialRole;
  userId: string;
  grade: string | null;
  section: string | null;
  curriculum: string | null;
  hasCredentials: boolean;
  credentialShared: string | null;
  firstLoginStatus: FirstLoginStatus;
  lastLogin: string | null;
  deliveryStatus: DeliveryStatus;
}

export interface CredentialMetrics {
  generated: number;
  teachersPendingLogin: number;
  studentsPendingLogin: number;
  notShared: number;
  generatedTrend: string;
  teachersPendingTrend: string;
  studentsPendingTrend: string;
  notSharedTrend: string;
  notSharedTrendUp: boolean;
}

export interface CredentialFilters {
  search: string;
  role: CredentialRole | "all";
  firstLoginStatus: FirstLoginStatus | "all";
  deliveryStatus: DeliveryStatus | "all";
  shared: "all" | "shared" | "not_shared";
}
