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
import {
  LayoutDashboard,
  BookOpen,
  Video,
  FileText,
  BarChart3,
  Settings,
  Users,
  GraduationCap,
  Calendar,
  Sparkles,
  NotebookPen,
  Building2,
  LogOut,
  UploadCloud,
  CreditCard,
  Database,
  LayoutGrid,
  KeyRound,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AuthBrandMark } from "@/components/auth/auth-brand-mark";
import { getDashboardPath } from "@/lib/dashboard-routes";
import { brandImages } from "@/lib/brand-images";
import { UserRole } from "@/types/schema";
import type { LucideIcon } from "lucide-react";

type MenuItem = {
  title: string;
  url: string;
  icon?: LucideIcon;
  imageIcon?: string;
};

const studentMenuItems: MenuItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "My Learning", url: "/my-learning", icon: BookOpen },
  { title: "AI Tutor", url: "/ai-learning-studio", imageIcon: "/icon.png" },
  { title: "Session", url: "/live-classes", icon: Video },
  { title: "Assignments", url: "/assignments", icon: FileText },
];

const tutorMenuItems: MenuItem[] = [
  { title: "Dashboard", url: "/tutor/dashboard", icon: LayoutDashboard },
  { title: "Students", url: "/tutor/students", icon: Users },
  { title: "Sessions", url: "/tutor/sessions", icon: Calendar },
  { title: "Lesson Planner", url: "/tutor/lesson-planner", icon: NotebookPen },
  { title: "Progress Analytics", url: "/tutor/progress", icon: BarChart3 },
  { title: "AI Insights", url: "/tutor/ai-insights", icon: Sparkles },
];

const schoolAdminMenuItems: MenuItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Teachers", url: "/teachers", icon: Users },
  { title: "Students", url: "/students", icon: GraduationCap },
  { title: "Classes", url: "/classes", icon: LayoutGrid },
  { title: "Credentials", url: "/credentials", icon: KeyRound },
];

const masterAdminMenuItems: MenuItem[] = [
  { title: "Dashboard", url: "/master-admin/dashboard", icon: LayoutDashboard },
  { title: "Organizations", url: "/master-admin/organizations", icon: Building2 },
  { title: "Schools", url: "/master-admin/schools", icon: GraduationCap },
  { title: "Users", url: "/master-admin/users", icon: Users },
  { title: "Boards & Syllabus", url: "/master-admin/boards-syllabus", icon: BookOpen },
  { title: "Textbook Uploads", url: "/master-admin/textbook-uploads", icon: UploadCloud },
  { title: "AI Embeddings", url: "/master-admin/ai-embeddings", icon: Database },
  { title: "Subscriptions", url: "/master-admin/subscriptions", icon: CreditCard },
  { title: "Reports", url: "/master-admin/reports", icon: BookOpen },
  { title: "Settings", url: "/master-admin/settings", icon: Settings },
];

const organizationMenuItems: MenuItem[] = [
  { title: "Dashboard", url: "/organization/dashboard", icon: LayoutDashboard },
  { title: "Schools", url: "/organization/schools", icon: Building2 },
  { title: "Tutors", url: "/organization/tutors", icon: Users },
  { title: "Students", url: "/organization/students", icon: GraduationCap },
  { title: "Reports", url: "/organization/reports", icon: BarChart3 },
  { title: "Settings", url: "/organization/settings", icon: Settings },
];

const roleLabels: Record<string, string> = {
  student: "Student",
  tutor: "Tutor",
  school_admin: "School Admin",
  org_admin: "Organization",
  master_admin: "Master Admin",
};

function SidebarMenuIcon({ item }: { item: MenuItem }) {
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
  const { state, toggleSidebar, isMobile, setOpenMobile } = useSidebar();

  const getMenuItems = (): MenuItem[] => {
    if (!user) return studentMenuItems;

    switch (user.role) {
      case UserRole.TUTOR:
        return tutorMenuItems;
      case UserRole.SCHOOL_ADMIN:
        return schoolAdminMenuItems;
      case UserRole.MASTER_ADMIN:
        return masterAdminMenuItems;
      case UserRole.ORG_ADMIN:
        return organizationMenuItems;
      default:
        return studentMenuItems;
    }
  };

  const menuItems = getMenuItems();
  const sidebarMascot =
    user?.role === UserRole.TUTOR
      ? "/tutor-sidebar.png"
      : user?.role === UserRole.SCHOOL_ADMIN
        ? "/schooladmin.png"
        : !user || user.role === UserRole.STUDENT
          ? brandImages.studentMascot
          : null;
  const dashboardPath = getDashboardPath(user?.role);

  const handleNavClick = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="icon" className="tutor-sidebar-theme">
      <SidebarHeader className="relative border-b border-white/10 px-3 py-4 group-data-[collapsible=icon]:px-2">
        <div className="flex items-center pr-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:pr-0">
          <Link
            href={dashboardPath}
            onClick={handleNavClick}
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
            onClick={handleNavClick}
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
          className="absolute -right-3 top-[calc(50%+1.25rem)] z-20 hidden h-7 w-7 -translate-y-1/2 rounded-md border border-border bg-background shadow-sm hover:bg-accent md:inline-flex"
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

      <SidebarContent>
        <SidebarGroup className="px-2 py-2">
          <SidebarGroupLabel className="px-3 text-xs font-medium uppercase tracking-wider text-white/55">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    tooltip={item.title}
                    data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <Link href={item.url} onClick={handleNavClick}>
                      <SidebarMenuIcon item={item} />
                      <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {sidebarMascot && (
          <div className="mt-auto flex justify-start px-3 pb-3 pl-0 group-data-[collapsible=icon]:hidden">
            <img
              src={sidebarMascot}
              alt=""
              aria-hidden
              className="w-full max-w-[200px] -translate-x-2 object-contain"
            />
          </div>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-white/10 px-3 py-4">
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
              <span className="truncate text-sm font-medium text-white">{user.fullName}</span>
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
