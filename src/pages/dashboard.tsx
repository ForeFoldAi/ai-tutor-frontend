import { useAuthStore } from "@/lib/auth-store";
import { UserRole } from "@/types/schema";
import StudentDashboard from "@/components/dashboards/student-dashboard";
import { StudentAppLoadingShell } from "@/components/skeletons/student-page-skeletons";
import MasterAdminDashboardPage from "@/modules/master-admin/pages/dashboard-page";
import OrganizationDashboardPage from "@/modules/organization/pages/dashboard-page";
import TutorDashboardModulePage from "@/modules/tutor/pages/dashboard-page";

export default function DashboardPage() {
  const { user } = useAuthStore();

  if (!user) {
    return <StudentAppLoadingShell />;
  }

  switch (user.role) {
    case UserRole.TUTOR:
      return <TutorDashboardModulePage />;
    case UserRole.SCHOOL_ADMIN:
      return <OrganizationDashboardPage />;
    case UserRole.MASTER_ADMIN:
      return <MasterAdminDashboardPage />;
    case UserRole.ORG_ADMIN:
      return <OrganizationDashboardPage />;
    default:
      return <StudentDashboard user={user} />;
  }
}
