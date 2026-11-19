import { apiFetch } from "@/api/index";
import type {
  ApiUser,
  CreateSchoolAdminPayload,
  CreateStudentPayload,
  CreateTutorPayload,
  SchoolDetail,
  SchoolSummary,
  PatchSchoolPayload,
  UpdateSchoolProfilePayload,
  UpdateStudentPayload,
  UpdateTutorPayload,
} from "@/api/types";

export async function getOrganizationUsers(): Promise<ApiUser[]> {
  return apiFetch<ApiUser[]>("/auth/admin/users");
}

export async function getSchoolDetail(): Promise<SchoolDetail> {
  return apiFetch<SchoolDetail>("/auth/admin/school");
}

/** @deprecated use getSchoolDetail */
export const getOrganizationDetail = getSchoolDetail;

export async function updateSchoolProfile(payload: UpdateSchoolProfilePayload): Promise<SchoolDetail> {
  return apiFetch<SchoolDetail>("/auth/admin/school", {
    method: "PATCH",
    body: JSON.stringify({
      name: payload.name.trim(),
      branch: payload.branch?.trim() ? payload.branch.trim() : null,
      board: payload.board?.trim() ? payload.board.trim() : null,
      email: payload.email?.trim() ? payload.email.trim() : null,
      phone: payload.phone?.trim() ? payload.phone.trim() : null,
      address: payload.address?.trim() ? payload.address.trim() : null,
      website: payload.website?.trim() ? payload.website.trim() : null,
      grades_offered: payload.grades_offered?.trim() ? payload.grades_offered.trim() : null,
      student_strength: payload.student_strength?.trim() ? payload.student_strength.trim() : null,
      curricula: payload.curricula ?? [],
    }),
  });
}

/** @deprecated use updateSchoolProfile */
export const updateOrganization = updateSchoolProfile;

export async function getOrganizationSchools(): Promise<SchoolSummary[]> {
  return apiFetch<SchoolSummary[]>("/auth/admin/schools");
}

export async function patchOrganizationSchool(
  schoolId: string | number,
  payload: PatchSchoolPayload,
): Promise<SchoolSummary> {
  return apiFetch<SchoolSummary>(`/auth/admin/schools/${schoolId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteOrganizationSchool(schoolId: string | number): Promise<{ message: string }> {
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

export async function updateOrganizationUserStatus(userId: number, is_active: boolean): Promise<ApiUser> {
  return apiFetch<ApiUser>(`/auth/admin/users/${userId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ is_active }),
  });
}

export async function updateOrganizationTutor(userId: number, payload: UpdateTutorPayload): Promise<ApiUser> {
  return apiFetch<ApiUser>(`/auth/admin/users/${userId}/tutor`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteOrganizationTutor(userId: number): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/auth/admin/users/${userId}/tutor`, { method: "DELETE" });
}

export async function updateOrganizationStudent(userId: number, payload: UpdateStudentPayload): Promise<ApiUser> {
  return apiFetch<ApiUser>(`/auth/admin/users/${userId}/student`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteOrganizationStudent(userId: number): Promise<{ message: string }> {
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
