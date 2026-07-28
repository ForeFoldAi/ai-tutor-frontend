import { Moon, Sun } from "lucide-react";
import { DashboardHeaderActions } from "@/components/dashboard-header-actions";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/theme-provider";
import { GlobalSearchInput } from "@/modules/search";

interface TutorDashboardHeaderProps {
  firstName: string;
}

const iconBtn =
  "relative h-10 w-10 shrink-0 rounded-full border border-border bg-background shadow-sm hover:bg-muted/50";

export function TutorDashboardHeader({ firstName }: TutorDashboardHeaderProps) {
  const { theme, toggleTheme } = useTheme();

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
          <>
            <GlobalSearchInput
              placeholder="Search students, sessions..."
              className="lg:w-64 xl:w-72"
              data-testid="tutor-dashboard-search"
            />
            <Button
              variant="outline"
              size="icon"
              className={iconBtn}
              onClick={toggleTheme}
              aria-label="Toggle light or dark mode"
              data-testid="tutor-dashboard-theme-toggle"
            >
              {theme === "light" ? (
                <Moon className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Sun className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          </>
        }
      />
    </div>
  );
}
