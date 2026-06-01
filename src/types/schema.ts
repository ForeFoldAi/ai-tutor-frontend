// Local types extracted from shared schema for client-only build

export const UserRole = {
  STUDENT: "student",
  TUTOR: "tutor",
  SCHOOL_ADMIN: "school_admin",
  ORG_ADMIN: "org_admin",
  MASTER_ADMIN: "master_admin",
} as const;

export type UserRoleType = (typeof UserRole)[keyof typeof UserRole];

export type User = {
  id: string;
  username: string;
  password?: string;
  email: string;
  fullName: string;
  role: string;
  avatar: string | null;
  organizationId?: string | null;
  schoolId?: string | null;
  teachingBoard?: string | null;
  teachingClasses?: { grade: string; sections: string[] }[] | null;
};
