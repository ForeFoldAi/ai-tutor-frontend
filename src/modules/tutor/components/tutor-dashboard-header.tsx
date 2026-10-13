import { DashboardHeaderActions } from "@/components/dashboard-header-actions";
import { GlobalSearchInput } from "@/modules/search";

interface TutorDashboardHeaderProps {
  firstName: string;
}

export function TutorDashboardHeader({ firstName }: TutorDashboardHeaderProps) {
  return (
    <div className="flex shrink-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between lg:gap-4">
      <div className="min-w-0">
        <h1 className="text-xl font-bold tracking-tight text-blue-900 dark:text-blue-100 sm:text-2xl md:text-3xl">
          Welcome back, {firstName}! 👋
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here&apos;s what&apos;s happening with your classes today.
        </p>
      </div>
      <DashboardHeaderActions
        className="hidden lg:flex"
        leading={
          <GlobalSearchInput
            placeholder="Search students, sessions..."
            className="lg:w-64 xl:w-72"
            data-testid="tutor-dashboard-search"
          />
        }
      />
    </div>
  );
}
