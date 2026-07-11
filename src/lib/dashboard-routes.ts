import { UserRole } from "@/types/schema";

export function getDashboardPath(role?: string | null): string {
  switch (role) {
    case UserRole.TUTOR:
      return "/tutor/dashboard";
    case UserRole.MASTER_ADMIN:
      return "/master-admin/dashboard";
    case UserRole.ORG_ADMIN:
      return "/organization/dashboard";
    case UserRole.SCHOOL_ADMIN:
      return "/dashboard";
    default:
      return "/dashboard";
  }
}
