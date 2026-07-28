import { Link, useLocation } from "wouter";
import { LogOut, Moon, Settings, Sun } from "lucide-react";
import { AuthBrandMark } from "@/components/auth/auth-brand-mark";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationBell } from "@/components/notification-bell";
import { useAuthStore } from "@/lib/auth-store";
import { getDashboardPath, getSettingsPath } from "@/lib/dashboard-routes";
import { useTheme } from "@/lib/theme-provider";
import { UserRole } from "@/types/schema";
import { GlobalSearchInput } from "@/modules/search";

const ROLE_LABEL: Record<string, string> = {
  [UserRole.STUDENT]: "Student",
  [UserRole.TUTOR]: "Tutor",
  [UserRole.SCHOOL_ADMIN]: "School Admin",
  [UserRole.MASTER_ADMIN]: "Master Admin",
};

const SEARCH_PLACEHOLDER: Record<string, string> = {
  [UserRole.STUDENT]: "Search subjects, lessons...",
  [UserRole.TUTOR]: "Search students, sessions...",
  [UserRole.SCHOOL_ADMIN]: "Search teachers, students...",
  [UserRole.MASTER_ADMIN]: "Search users, schools...",
};

const iconBtn =
  "relative h-9 w-9 shrink-0 rounded-full border border-border bg-background shadow-sm hover:bg-muted/50";

export function AppMobileHeader() {
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useTheme();
  const [location, setLocation] = useLocation();

  const role = user?.role;
  const dashboardPath = getDashboardPath(role);
  const settingsPath = getSettingsPath(role);
  const displayName = user?.fullName ?? "User";
  const roleLabel = (role && ROLE_LABEL[role]) || "User";
  const isDashboard = location === dashboardPath;
  const initials =
    displayName
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  const handleSignOut = () => {
    logout();
    setLocation("/login");
  };

  return (
    <header className="flex shrink-0 items-center gap-2 border-b border-border bg-background px-3 py-2 sm:gap-3 sm:px-4 lg:hidden">
      <Link href={dashboardPath} className="shrink-0">
        <AuthBrandMark variant="sidebar" size="compact" className="min-w-0" />
      </Link>

      <GlobalSearchInput
        placeholder={
          (role && SEARCH_PLACEHOLDER[role]) || "Search..."
        }
        className="min-w-0 flex-1 sm:min-w-0 sm:max-w-none"
        data-testid="app-mobile-header-search"
      />

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <Button
          variant="outline"
          size="icon"
          className={iconBtn}
          onClick={toggleTheme}
          aria-label="Toggle light or dark mode"
          data-testid="app-mobile-header-theme-toggle"
        >
          {theme === "light" ? (
            <Moon className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Sun className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>

        {isDashboard ? (
          <NotificationBell
            buttonClassName={iconBtn}
            data-testid="app-mobile-header-notifications"
          />
        ) : null}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-background shadow-sm transition-colors hover:bg-muted/50"
              aria-label="User menu"
              data-testid="app-mobile-header-user-menu"
            >
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-gradient-brand text-[10px] font-semibold text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 border border-border p-0">
            <div className="bg-gradient-brand px-3 py-3 text-white">
              <div className="flex items-center gap-2">
                <Avatar className="h-9 w-9 ring-2 ring-white/30">
                  <AvatarFallback className="bg-white/20 text-sm font-semibold text-white">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{displayName}</p>
                  <p className="truncate text-xs text-white/85">{roleLabel}</p>
                </div>
              </div>
            </div>
            <div className="p-1">
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => setLocation(settingsPath)}
                data-testid="app-mobile-header-settings"
              >
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer text-rose-600 focus:text-rose-600"
                onClick={handleSignOut}
                data-testid="app-mobile-header-sign-out"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
