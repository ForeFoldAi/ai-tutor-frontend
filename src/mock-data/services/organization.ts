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
import { useAuthStore } from "@/lib/auth-store";
import { delay } from "../delay";
import { mockStore } from "../store";

function now() {
  return new Date().toISOString();
}

function makeUser(
  payload: {
    full_name: string;
    email: string;
    role: ApiUser["role"];
    organization_id?: string | null;
    school_id?: string | null;
    teaching_board?: string | null;
    teaching_classes?: ApiUser["teaching_classes"];
  },
  createdBy: string | null,
): ApiUser {
  const ts = now();
  return {
    id: `user-${crypto.randomUUID()}`,
    full_name: payload.full_name,
    email: payload.email,
    role: payload.role,
    is_active: true,
    is_verified: true,
    organization_id: payload.organization_id ?? null,
    school_id: payload.school_id ?? null,
    teaching_board: payload.teaching_board,
    teaching_classes: payload.teaching_classes,
    created_by: createdBy,
    created_at: ts,
    updated_at: ts,
  };
}

export async function getOrganizationUsers(): Promise<ApiUser[]> {
  await delay();
  const currentUser = useAuthStore.getState().user;
  if (currentUser?.role === "master_admin") return [...mockStore.users];
  if (currentUser?.organizationId) {
    return mockStore.users.filter((u) => u.organization_id === currentUser.organizationId);
  }
  return [...mockStore.users];
}

export async function getOrganizationDetail(): Promise<OrganizationDetail> {
  await delay();
  return { ...mockStore.organization };
}

export async function updateOrganization(payload: UpdateOrganizationPayload): Promise<OrganizationDetail> {
  await delay();
  mockStore.organization = {
    ...mockStore.organization,
    name: payload.name.trim(),
    phone: payload.phone?.trim() ? payload.phone.trim() : null,
    address: payload.address?.trim() ? payload.address.trim() : null,
  };
  return { ...mockStore.organization };
}

export async function getOrganizationSchools(): Promise<OrganizationSchoolSummary[]> {
  await delay();
  const currentUser = useAuthStore.getState().user;
  if (currentUser?.organizationId) {
    return mockStore.schools.filter((s) => s.organization_id === currentUser.organizationId);
  }
  return [...mockStore.schools];
}

export async function patchOrganizationSchool(
  schoolId: string,
  payload: PatchSchoolPayload,
): Promise<OrganizationSchoolSummary> {
  await delay();
  const idx = mockStore.schools.findIndex((s) => s.id === schoolId);
  if (idx === -1) throw new Error("School not found");
  mockStore.schools[idx] = {
    ...mockStore.schools[idx],
    ...(payload.name !== undefined ? { name: payload.name } : {}),
    ...(payload.branch !== undefined ? { branch: payload.branch } : {}),
    ...(payload.board !== undefined ? { board: payload.board } : {}),
  };
  return { ...mockStore.schools[idx] };
}

export async function deleteOrganizationSchool(schoolId: string): Promise<{ message: string }> {
  await delay();
  mockStore.schools = mockStore.schools.filter((s) => s.id !== schoolId);
  return { message: "School deleted" };
}

export async function onboardOrganizationTutor(payload: CreateTutorPayload): Promise<ApiUser> {
  await delay();
  const user = makeUser(
    {
      full_name: payload.full_name,
      email: payload.email,
      role: "TUTOR",
      organization_id: payload.organization_id,
      school_id: payload.school_id,
      teaching_board: payload.teaching_board,
      teaching_classes: payload.teaching_classes,
    },
    useAuthStore.getState().user?.id ?? null,
  );
  mockStore.users.push(user);
  return { ...user };
}

export async function createOrganizationStudent(payload: CreateStudentPayload): Promise<ApiUser> {
  await delay();
  const user = makeUser(
    {
      full_name: payload.full_name,
      email: payload.email,
      role: "STUDENT",
      organization_id: payload.organization_id,
      school_id: payload.school_id,
      teaching_board: payload.teaching_board,
      teaching_classes: payload.teaching_classes,
    },
    useAuthStore.getState().user?.id ?? null,
  );
  mockStore.users.push(user);
  return { ...user };
}

export async function createOrganizationSchoolAdmin(payload: CreateSchoolAdminPayload): Promise<ApiUser> {
  await delay();
  let schoolId = payload.school_id;
  if (!schoolId && payload.school_name) {
    const newSchool: OrganizationSchoolSummary = {
      id: `school-${crypto.randomUUID()}`,
      organization_id: mockStore.organization.id,
      organization_name: mockStore.organization.name,
      name: payload.school_name,
      branch: payload.branch ?? null,
      board: payload.board ?? null,
      created_at: now(),
      school_admins: [],
      tutor_count: 0,
      student_count: 0,
    };
    mockStore.schools.push(newSchool);
    schoolId = newSchool.id;
  }
  const user = makeUser(
    {
      full_name: payload.full_name,
      email: payload.email,
      role: "SCHOOL_ADMIN",
      organization_id: payload.organization_id ?? mockStore.organization.id,
      school_id: schoolId ?? null,
    },
    useAuthStore.getState().user?.id ?? null,
  );
  mockStore.users.push(user);
  if (schoolId) {
    const school = mockStore.schools.find((s) => s.id === schoolId);
    if (school) {
      school.school_admins.push({
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        is_active: true,
      });
    }
  }
  return { ...user };
}

export async function updateOrganizationUserStatus(userId: string, is_active: boolean): Promise<ApiUser> {
  await delay();
  const user = mockStore.users.find((u) => u.id === userId);
  if (!user) throw new Error("User not found");
  user.is_active = is_active;
  user.updated_at = now();
  return { ...user };
}

export async function updateOrganizationTutor(userId: string, payload: UpdateTutorPayload): Promise<ApiUser> {
  await delay();
  const user = mockStore.users.find((u) => u.id === userId);
  if (!user) throw new Error("User not found");
  Object.assign(user, {
    full_name: payload.full_name,
    email: payload.email,
    school_id: payload.school_id,
    teaching_board: payload.teaching_board,
    teaching_classes: payload.teaching_classes,
    updated_at: now(),
  });
  return { ...user };
}

export async function deleteOrganizationTutor(userId: string): Promise<{ message: string }> {
  await delay();
  mockStore.users = mockStore.users.filter((u) => u.id !== userId);
  return { message: "Tutor deleted" };
}

export async function updateOrganizationStudent(userId: string, payload: UpdateStudentPayload): Promise<ApiUser> {
  await delay();
  const user = mockStore.users.find((u) => u.id === userId);
  if (!user) throw new Error("User not found");
  Object.assign(user, {
    full_name: payload.full_name,
    email: payload.email,
    school_id: payload.school_id,
    teaching_board: payload.teaching_board,
    teaching_classes: payload.teaching_classes,
    updated_at: now(),
  });
  return { ...user };
}

export async function deleteOrganizationStudent(userId: string): Promise<{ message: string }> {
  await delay();
  mockStore.users = mockStore.users.filter((u) => u.id !== userId);
  return { message: "Student deleted" };
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
