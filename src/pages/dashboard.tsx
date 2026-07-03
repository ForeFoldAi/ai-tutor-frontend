import { useAuthStore } from "@/lib/auth-store";
import { UserRole } from "@/types/schema";
import StudentDashboard from "@/components/dashboards/student-dashboard";
import TutorDashboard from "@/components/dashboards/tutor-dashboard";
import SchoolAdminDashboard from "@/components/dashboards/school-admin-dashboard";
import MasterAdminDashboardPage from "@/modules/master-admin/pages/dashboard-page";
import OrganizationDashboardPage from "@/modules/organization/pages/dashboard-page";

export default function DashboardPage() {
  const { user } = useAuthStore();

  if (!user) return null;

  switch (user.role) {
    case UserRole.TUTOR:
      return <TutorDashboard user={user} />;
    case UserRole.SCHOOL_ADMIN:
      return <SchoolAdminDashboard user={user} />;
    case UserRole.MASTER_ADMIN:
      return <MasterAdminDashboardPage />;
    case UserRole.ORG_ADMIN:
      return <OrganizationDashboardPage />;
    default:
      return (
        <div className="flex min-h-0 flex-1 flex-col">
          <StudentDashboard user={user} />
        </div>
      );
  }
}
