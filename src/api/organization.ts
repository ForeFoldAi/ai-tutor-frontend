import { apiFetch } from "@/api/index";
import type {
  ApiUser,
  CreateSchoolAdminPayload,
  CreateStudentPayload,
  CreateTutorPayload,
  OrganizationDetail,
  OrganizationSchoolSummary,
  PatchSchoolPayload,
  UpdateOrganizationPayload,
  UpdateStudentPayload,
  UpdateTutorPayload,
} from "@/api/types";

export async function getOrganizationUsers(): Promise<ApiUser[]> {
  return apiFetch<ApiUser[]>("/auth/admin/users");
}

export async function getOrganizationDetail(): Promise<OrganizationDetail> {
  return apiFetch<OrganizationDetail>("/auth/admin/organization");
}

export async function updateOrganization(payload: UpdateOrganizationPayload): Promise<OrganizationDetail> {
  return apiFetch<OrganizationDetail>("/auth/admin/organization", {
    method: "PATCH",
    body: JSON.stringify({
      name: payload.name.trim(),
      phone: payload.phone?.trim() ? payload.phone.trim() : null,
      address: payload.address?.trim() ? payload.address.trim() : null,
    }),
  });
}

export async function getOrganizationSchools(): Promise<OrganizationSchoolSummary[]> {
  return apiFetch<OrganizationSchoolSummary[]>("/auth/admin/schools");
}

export async function patchOrganizationSchool(
  schoolId: string,
  payload: PatchSchoolPayload,
): Promise<OrganizationSchoolSummary> {
  return apiFetch<OrganizationSchoolSummary>(`/auth/admin/schools/${schoolId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteOrganizationSchool(schoolId: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/auth/admin/schools/${schoolId}`, { method: "DELETE" });
}

export async function getOrganizationTutors(): Promise<ApiUser[]> {
  const users = await getOrganizationUsers();
  return users.filter((u) => u.role === "TUTOR");
}

export async function getOrganizationStudents(): Promise<ApiUser[]> {
  const users = await getOrganizationUsers();
  return users.filter((u) => u.role === "STUDENT");
}

export async function getOrganizationSchoolAdmins(): Promise<ApiUser[]> {
  const users = await getOrganizationUsers();
  return users.filter((u) => u.role === "SCHOOL_ADMIN");
}

export async function onboardOrganizationTutor(payload: CreateTutorPayload): Promise<ApiUser> {
  return apiFetch<ApiUser>("/auth/admin/create-tutor", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function createOrganizationStudent(payload: CreateStudentPayload): Promise<ApiUser> {
  return apiFetch<ApiUser>("/auth/admin/create-student", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function createOrganizationSchoolAdmin(payload: CreateSchoolAdminPayload): Promise<ApiUser> {
  return apiFetch<ApiUser>("/auth/admin/create-school-admin", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateOrganizationUserStatus(userId: string, is_active: boolean): Promise<ApiUser> {
  return apiFetch<ApiUser>(`/auth/admin/users/${userId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ is_active }),
  });
}

export async function updateOrganizationTutor(userId: string, payload: UpdateTutorPayload): Promise<ApiUser> {
  return apiFetch<ApiUser>(`/auth/admin/users/${userId}/tutor`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteOrganizationTutor(userId: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/auth/admin/users/${userId}/tutor`, { method: "DELETE" });
}

export async function updateOrganizationStudent(userId: string, payload: UpdateStudentPayload): Promise<ApiUser> {
  return apiFetch<ApiUser>(`/auth/admin/users/${userId}/student`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteOrganizationStudent(userId: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/auth/admin/users/${userId}/student`, { method: "DELETE" });
}

export async function fetchOrganizationReports(): Promise<{
  tutorCount: number;
  studentCount: number;
  activeUsers: number;
}> {
  const users = await getOrganizationUsers();
  return {
    tutorCount: users.filter((u) => u.role === "TUTOR").length,
    studentCount: users.filter((u) => u.role === "STUDENT").length,
    activeUsers: users.filter((u) => u.is_active).length,
  };
}
