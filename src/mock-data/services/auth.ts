import type { ApiUser } from "@/api/types";
import { delay } from "../delay";
import { authCredentials, initialUsers } from "../fixtures/users";
import { mockStore } from "../store";

export interface LoginResult {
  access_token: string;
  refresh_token: string;
}

export interface MeProfile {
  id: string;
  full_name: string;
  email: string;
  role: string;
  organization_id: string | null;
  school_id: string | null;
  teaching_board?: string | null;
  teaching_classes?: { grade: string; sections: string[] }[] | null;
}

function findUserByCredential(emailOrUsername: string): ApiUser | undefined {
  const key = emailOrUsername.trim().toLowerCase();
  const password = authCredentials[key];
  if (!password) return undefined;

  return mockStore.users.find((u) => {
    const email = u.email.toLowerCase();
    const username = email.split("@")[0];
    return email === key || username === key;
  });
}

export async function mockLogin(email: string, password: string): Promise<LoginResult> {
  await delay(500);
  const key = email.trim().toLowerCase();
  if (authCredentials[key] !== password) {
    throw new Error("Invalid credentials");
  }
  const user = findUserByCredential(email);
  if (!user) throw new Error("Invalid credentials");
  return {
    access_token: `mock-access-${user.id}`,
    refresh_token: `mock-refresh-${user.id}`,
  };
}

export async function mockGetMe(_token: string): Promise<MeProfile> {
  await delay(200);
  const userId = _token.replace("mock-access-", "");
  const user = mockStore.users.find((u) => u.id === userId) ?? initialUsers[0];
  return {
    id: user.id,
    full_name: user.full_name,
    email: user.email,
    role: user.role,
    organization_id: user.organization_id,
    school_id: user.school_id,
    teaching_board: user.teaching_board,
    teaching_classes: user.teaching_classes,
  };
}

export async function mockRefreshToken(refreshToken: string): Promise<LoginResult> {
  await delay(200);
  const userId = refreshToken.replace("mock-refresh-", "");
  const user = mockStore.users.find((u) => u.id === userId);
  if (!user) throw new Error("Invalid refresh token");
  return {
    access_token: `mock-access-${user.id}`,
    refresh_token: `mock-refresh-${user.id}`,
  };
}

export async function mockSignupStudent(payload: {
  full_name: string;
  email: string;
  password: string;
}): Promise<{ message: string }> {
  await delay(600);
  const now = new Date().toISOString();
  const newUser: ApiUser = {
    id: `user-student-${Date.now()}`,
    full_name: payload.full_name,
    email: payload.email,
    role: "STUDENT",
    is_active: true,
    is_verified: false,
    organization_id: null,
    school_id: null,
    created_by: null,
    created_at: now,
    updated_at: now,
  };
  mockStore.users.push(newUser);
  authCredentials[payload.email.toLowerCase()] = payload.password;
  authCredentials[payload.email.split("@")[0].toLowerCase()] = payload.password;
  return { message: "Student account created successfully" };
}

export async function mockSignupOrganization(payload: {
  full_name: string;
  email: string;
  password: string;
  organization_name: string;
}): Promise<{ message: string }> {
  await delay(600);
  const now = new Date().toISOString();
  const orgId = `org-${Date.now()}`;
  mockStore.organization = {
    id: orgId,
    name: payload.organization_name,
    phone: null,
    address: null,
    is_active: true,
    created_at: now,
  };
  const newUser: ApiUser = {
    id: `user-org-${Date.now()}`,
    full_name: payload.full_name,
    email: payload.email,
    role: "ORG_ADMIN",
    is_active: true,
    is_verified: false,
    organization_id: orgId,
    school_id: null,
    created_by: null,
    created_at: now,
    updated_at: now,
  };
  mockStore.users.push(newUser);
  authCredentials[payload.email.toLowerCase()] = payload.password;
  authCredentials[payload.email.split("@")[0].toLowerCase()] = payload.password;
  return { message: "Organization account created successfully" };
}
