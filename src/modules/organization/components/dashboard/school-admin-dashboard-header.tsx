import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Bell, ChevronDown, LogOut, Moon, Search, Settings, Sun } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { useTheme } from "@/lib/theme-provider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SchoolAdminDashboardHeaderProps {
  welcomeName: string;
}

const headerIconButtonClass =
  "relative h-10 w-10 shrink-0 rounded-full border border-border bg-background shadow-sm hover:bg-muted/50";

const profileAvatarClass = "bg-gradient-brand text-xs font-semibold text-white";

export function SchoolAdminDashboardHeader({ welcomeName }: SchoolAdminDashboardHeaderProps) {
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useTheme();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

  const displayName = user?.fullName ?? "School Admin";
  const initials =
    displayName
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "SA";

  const handleSignOut = () => {
    logout();
    setLocation("/login");
  };

  return (
    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
      <div className="min-w-0 shrink-0">
        <h1 className="text-2xl font-bold tracking-tight text-blue-900 dark:text-blue-100 md:text-3xl">
          Welcome, {welcomeName} 👋
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Here&apos;s an overview of your school.</p>
      </div>

      <div className="flex w-full flex-wrap items-center gap-2 sm:gap-3 xl:w-auto xl:justify-end">
        <div className="relative min-w-[180px] flex-1 sm:min-w-[220px] sm:max-w-xs xl:w-64 xl:flex-none">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search teachers, students..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="h-10 rounded-full border border-border bg-background pl-9 shadow-sm"
            data-testid="school-admin-dashboard-search"
          />
        </div>

        <Button
          variant="outline"
          size="icon"
          className={headerIconButtonClass}
          onClick={toggleTheme}
          aria-label="Toggle light or dark mode"
          data-testid="school-admin-dashboard-theme-toggle"
        >
          {theme === "light" ? (
            <Moon className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Sun className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>

        <Button
          variant="outline"
          size="icon"
          className={headerIconButtonClass}
          aria-label="Notifications"
          data-testid="school-admin-dashboard-notifications"
        >
          <Bell className="h-4 w-4 text-muted-foreground" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-background" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex h-10 min-w-0 items-center gap-2 rounded-full border border-border bg-background px-2 py-1.5 pl-1.5 shadow-sm transition-colors hover:bg-muted/50 sm:gap-3 sm:pl-2 sm:pr-3"
              data-testid="school-admin-dashboard-user-menu"
            >
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className={profileAvatarClass}>{initials}</AvatarFallback>
              </Avatar>
              <div className="hidden min-w-0 text-left sm:block">
                <p className="truncate text-sm font-medium leading-tight">{displayName}</p>
                <p className="truncate text-xs text-muted-foreground">School Admin</p>
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
                  <p className="truncate text-xs text-white/85">School Admin</p>
                </div>
              </div>
            </div>
            <div className="p-1">
              <DropdownMenuItem asChild>
                <Link href="/settings" className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer text-rose-600 focus:text-rose-600"
                onClick={handleSignOut}
                data-testid="school-admin-dashboard-sign-out"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
