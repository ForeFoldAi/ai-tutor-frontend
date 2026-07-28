import { UserRole } from "@/types/schema";

export function getDashboardPath(role?: string | null): string {
  switch (role) {
    case UserRole.TUTOR:
      return "/tutor/dashboard";
    case UserRole.MASTER_ADMIN:
      return "/master-admin/dashboard";
    case UserRole.SCHOOL_ADMIN:
      return "/dashboard";
    default:
      return "/dashboard";
  }
}

export function getSettingsPath(role?: string | null): string {
  switch (role) {
    case UserRole.TUTOR:
      return "/tutor/settings";
    case UserRole.MASTER_ADMIN:
      return "/master-admin/settings";
    case UserRole.SCHOOL_ADMIN:
      return "/school-settings";
    default:
      return "/settings";
  }
}
