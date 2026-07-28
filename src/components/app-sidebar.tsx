import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { LogOut, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AuthBrandMark } from "@/components/auth/auth-brand-mark";
import { getDashboardPath } from "@/lib/dashboard-routes";
import { brandImages } from "@/lib/brand-images";
import { UserRole } from "@/types/schema";
import {
  getAppNavItems,
  isAppNavActive,
  type AppNavItem,
} from "@/lib/app-nav-items";

const roleLabels: Record<string, string> = {
  student: "Student",
  tutor: "Tutor",
  school_admin: "School Admin",
  master_admin: "Master Admin",
};

function SidebarMenuIcon({ item }: { item: AppNavItem }) {
  if (item.imageIcon) {
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-md bg-[#EEF2FF] dark:bg-primary/15">
        <img
          src={item.imageIcon}
          alt=""
          aria-hidden
          className="h-[88%] w-[88%] object-contain"
        />
      </span>
    );
  }

  if (item.icon) {
    const Icon = item.icon;
    return <Icon className="h-4 w-4 shrink-0" />;
  }

  return null;
}

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuthStore();
  const { state, toggleSidebar, isMobile } = useSidebar();

  // Tablet/mobile use AppNavBar; skip Sheet drawer.
  if (isMobile) return null;

  const menuItems = getAppNavItems(user?.role, user?.schoolId, user?.createdBy);
  const sidebarMascot =
    user?.role === UserRole.TUTOR
      ? "/tutor-sidebar.png"
      : user?.role === UserRole.SCHOOL_ADMIN
        ? "/schooladmin.png"
        : !user || user.role === UserRole.STUDENT
          ? brandImages.studentMascot
          : null;
  const dashboardPath = getDashboardPath(user?.role);

  return (
    <Sidebar collapsible="icon" className="tutor-sidebar-theme">
      <SidebarHeader className="relative shrink-0 border-b border-white/10 px-3 py-4 group-data-[collapsible=icon]:px-2">
        <div className="flex items-center gap-2 pr-2 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:pr-0">
          <Link
            href={dashboardPath}
            className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden"
          >
            <AuthBrandMark
              variant="sidebar"
              logoBackground
              className="[&_p]:text-white [&_p:last-child]:text-white/75"
            />
          </Link>
          <Link
            href={dashboardPath}
            className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-sm group-data-[collapsible=icon]:flex"
          >
            <img
              src="/logo.png"
              alt="AI Tutor"
              className="h-7 w-7 object-contain"
            />
          </Link>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="absolute -right-3 top-[calc(50%+1.25rem+20px)] z-20 hidden h-7 w-7 -translate-y-1/2 rounded-md border border-border bg-background shadow-sm hover:bg-accent lg:inline-flex"
          onClick={toggleSidebar}
          data-testid="button-sidebar-toggle"
        >
          {state === "expanded" ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          <span className="sr-only">Toggle Sidebar</span>
        </Button>
      </SidebarHeader>

      <SidebarContent className="overflow-hidden">
        <SidebarGroup className="shrink-0 px-2 py-2">
          <SidebarGroupLabel className="px-3 text-xs font-medium uppercase tracking-wider text-white/55">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isAppNavActive(location, item.url)}
                    tooltip={item.title}
                    data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <Link href={item.url}>
                      <SidebarMenuIcon item={item} />
                      <span className="group-data-[collapsible=icon]:hidden">
                        {item.title}
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {sidebarMascot && (
          <div className="mt-auto flex min-h-0 flex-1 items-end justify-start overflow-hidden px-3 pb-1 pl-0 group-data-[collapsible=icon]:hidden">
            <img
              src={sidebarMascot}
              alt=""
              aria-hidden
              className="max-h-full w-full max-w-[200px] -translate-x-2 object-contain object-bottom"
            />
          </div>
        )}
      </SidebarContent>

      <SidebarFooter className="shrink-0 border-t border-white/10 px-3 py-4">
        {user && (
          <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
            <Avatar className="h-9 w-9 shrink-0 ring-2 ring-white/25">
              <AvatarFallback
                className={
                  user.role === UserRole.SCHOOL_ADMIN
                    ? "bg-gradient-brand text-sm font-semibold text-white"
                    : "bg-white/20 text-sm text-white"
                }
              >
                {user.fullName?.charAt(0)?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-1 flex-col overflow-hidden group-data-[collapsible=icon]:hidden">
              <span className="truncate text-sm font-medium text-white">
                {user.fullName}
              </span>
              <Badge
                variant="secondary"
                className={
                  user.role === UserRole.SCHOOL_ADMIN
                    ? "w-fit border-0 bg-white/25 text-xs text-white hover:bg-white/25"
                    : "w-fit bg-white/20 text-xs text-white hover:bg-white/20"
                }
              >
                {roleLabels[user.role] || "User"}
              </Badge>
            </div>
            <button
              onClick={logout}
              className="rounded-md p-2 text-white/80 transition-colors hover:bg-white/15 hover:text-white group-data-[collapsible=icon]:hidden"
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
