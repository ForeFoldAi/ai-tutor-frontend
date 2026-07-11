import { useMemo } from "react";
import {
  BookOpen,
  CalendarDays,
  Leaf,
  User,
  Users,
} from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { useOrganizationData } from "@/modules/organization/hooks/use-organization-data";
import { DashboardMetricCard } from "@/modules/organization/components/dashboard/dashboard-metric-card";
import { OnboardingProgressCard } from "@/modules/organization/components/dashboard/onboarding-progress-card";
import { PendingItemsCard } from "@/modules/organization/components/dashboard/pending-items-card";
import { SchoolAdminDashboardHeader } from "@/modules/organization/components/dashboard/school-admin-dashboard-header";
import { SchoolBoardsCard } from "@/modules/organization/components/dashboard/school-boards-card";
import {
  DEMO_PENDING_ITEMS,
  buildMetricsFromApi,
  buildOnboardingFromApi,
} from "@/modules/organization/data/demo-dashboard";

function getWelcomeName(fullName?: string) {
  if (!fullName) return "Greenwood Admin";
  const first = fullName.split(" ")[0];
  if (fullName.toLowerCase().includes("admin")) return fullName;
  return `${first} Admin`;
}

export default function OrganizationDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { reportsQuery } = useOrganizationData();
  const report = reportsQuery.data;

  const metrics = useMemo(
    () =>
      buildMetricsFromApi(
        report?.studentCount ?? 0,
        report?.tutorCount ?? 0,
        report?.activeUsers ?? 0,
      ),
    [report],
  );

  const onboarding = useMemo(
    () => buildOnboardingFromApi(report?.studentCount ?? 0, report?.tutorCount ?? 0),
    [report],
  );

  const welcomeName = getWelcomeName(user?.fullName);

  return (
    <div className="dashboard-fit flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-4 md:p-5">
      <div className="shrink-0">
        <SchoolAdminDashboardHeader welcomeName={welcomeName} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <DashboardMetricCard
          label="Total Students"
          value={metrics.totalStudents.toLocaleString()}
          subtext={`↑ ${metrics.studentsTrend}`}
          icon={Users}
          labelClassName="text-blue-700"
          iconClassName="bg-blue-50 text-blue-600"
        />
        <DashboardMetricCard
          label="Total Teachers"
          value={metrics.totalTeachers.toLocaleString()}
          subtext={`↑ ${metrics.teachersTrend}`}
          icon={User}
          labelClassName="text-blue-700"
          iconClassName="bg-blue-50 text-blue-600"
        />
        <DashboardMetricCard
          label="Teacher Guided Students"
          value={metrics.teacherGuidedStudents.toLocaleString()}
          subtext={metrics.teacherGuidedPercent}
          mutedSubtext
          icon={Leaf}
          labelClassName="text-emerald-700"
          iconClassName="bg-emerald-50 text-emerald-600"
        />
        <DashboardMetricCard
          label="Self Learning Students"
          value={metrics.selfLearningStudents.toLocaleString()}
          subtext={metrics.selfLearningPercent}
          mutedSubtext
          icon={BookOpen}
          labelClassName="text-blue-700"
          iconClassName="bg-blue-50 text-blue-600"
        />
        <DashboardMetricCard
          label="Active This Week"
          value={metrics.activeThisWeek.toLocaleString()}
          subtext={`↑ ${metrics.activeTrend}`}
          icon={CalendarDays}
          labelClassName="text-blue-700"
          iconClassName="bg-blue-50 text-blue-600"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <OnboardingProgressCard items={onboarding} />
        <PendingItemsCard items={DEMO_PENDING_ITEMS} />
      </div>

      <div className="shrink-0">
        <SchoolBoardsCard />
      </div>
    </div>
  );
}
