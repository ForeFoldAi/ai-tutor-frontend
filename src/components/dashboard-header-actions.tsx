import type { ReactNode } from "react";
import { useLocation } from "wouter";
import { ChevronDown, LogOut, Settings } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationBell } from "@/components/notification-bell";
import { useAuthStore } from "@/lib/auth-store";
import { getSettingsPath } from "@/lib/dashboard-routes";
import { UserRole } from "@/types/schema";
import { cn } from "@/lib/utils";

const ROLE_LABEL: Record<string, string> = {
  [UserRole.STUDENT]: "Student",
  [UserRole.TUTOR]: "Tutor",
  [UserRole.SCHOOL_ADMIN]: "School Admin",
  [UserRole.MASTER_ADMIN]: "Master Admin",
};

const iconBtn =
  "relative h-10 w-10 shrink-0 rounded-full border border-border bg-background shadow-sm hover:bg-muted/50";

type DashboardHeaderActionsProps = {
  className?: string;
  /** Extra controls rendered before the notification bell (e.g. search). */
  leading?: ReactNode;
};

export function DashboardHeaderActions({ className, leading }: DashboardHeaderActionsProps) {
  const { user, logout } = useAuthStore();
  const [, setLocation] = useLocation();

  const displayName = user?.fullName ?? "User";
  const roleLabel = (user?.role && ROLE_LABEL[user.role]) || "User";
  const settingsPath = getSettingsPath(user?.role);
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
    <div className={cn("flex flex-wrap items-center gap-2 sm:gap-3", className)}>
      {leading}
      <NotificationBell
        buttonClassName={iconBtn}
        data-testid="dashboard-header-notifications"
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex h-10 min-w-0 items-center gap-2 rounded-full border border-border bg-background px-2 py-1.5 pl-1.5 shadow-sm transition-colors hover:bg-muted/50 sm:gap-3 sm:pl-2 sm:pr-3"
            data-testid="dashboard-header-user-menu"
          >
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className="bg-gradient-brand text-xs font-semibold text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="hidden min-w-0 text-left sm:block">
              <p className="truncate text-sm font-medium leading-tight">{displayName}</p>
              <p className="truncate text-xs text-muted-foreground">{roleLabel}</p>
            </div>
            <ChevronDown className="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 border border-border p-0">
          <div className="bg-gradient-brand px-3 py-3 text-white">
            <div className="flex items-center gap-2">
              <Avatar className="h-10 w-10 ring-2 ring-white/30">
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
              data-testid="dashboard-header-settings"
            >
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer text-rose-600 focus:text-rose-600"
              onClick={handleSignOut}
              data-testid="dashboard-header-sign-out"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
