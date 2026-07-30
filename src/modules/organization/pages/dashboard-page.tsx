import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  CalendarDays,
  Leaf,
  User,
  Users,
} from "lucide-react";
import { getSchoolDashboardSummary } from "@/api/dashboard";
import { useAuthStore } from "@/lib/auth-store";
import { DashboardMetricCard } from "@/modules/organization/components/dashboard/dashboard-metric-card";
import { OnboardingProgressCard } from "@/modules/organization/components/dashboard/onboarding-progress-card";
import { PendingItemsCard } from "@/modules/organization/components/dashboard/pending-items-card";
import { SchoolAdminDashboardHeader } from "@/modules/organization/components/dashboard/school-admin-dashboard-header";
import { SchoolBoardsCard } from "@/modules/organization/components/dashboard/school-boards-card";
import { PageShell } from "@/components/page-shell";
import { DataState } from "@/modules/shared/components/data-state";
import type { SchoolDashboardMetrics } from "@/modules/organization/types/dashboard";

const EMPTY_METRICS: SchoolDashboardMetrics = {
  totalStudents: 0,
  totalTeachers: 0,
  teacherGuidedStudents: 0,
  selfLearningStudents: 0,
  activeThisWeek: 0,
  studentsTrend: "0 this week",
  teachersTrend: "0 this week",
  activeTrend: "0 this week",
  teacherGuidedPercent: "0% of students",
  selfLearningPercent: "0% of students",
};

function getWelcomeName(fullName?: string) {
  if (!fullName?.trim()) return "School Admin";
  return fullName.trim();
}

export default function OrganizationDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const dashboardQuery = useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: getSchoolDashboardSummary,
  });

  const welcomeName = getWelcomeName(user?.fullName);
  const metrics = dashboardQuery.data?.metrics ?? EMPTY_METRICS;
  const onboarding = dashboardQuery.data?.onboarding ?? [];
  const pending = dashboardQuery.data?.pending ?? [];
  const curricula = dashboardQuery.data?.curricula ?? [];

  return (
    <PageShell>
      <div className="shrink-0">
        <SchoolAdminDashboardHeader welcomeName={welcomeName} />
      </div>

      <DataState
        loading={dashboardQuery.isLoading}
        error={dashboardQuery.error ? String(dashboardQuery.error) : null}
        empty={false}
        emptyText=""
        onRetry={() => void dashboardQuery.refetch()}
      >
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
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

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <OnboardingProgressCard items={onboarding} />
          <PendingItemsCard items={pending} />
        </div>

        <div className="mt-4 shrink-0">
          <SchoolBoardsCard curricula={curricula} />
        </div>
      </DataState>
    </PageShell>
  );
}
