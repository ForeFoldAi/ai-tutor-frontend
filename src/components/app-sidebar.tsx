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
  Bot,
  BookOpen,
  Video,
  FileText,
  BarChart3,
  Settings,
  Users,
  GraduationCap,
  Calendar,
  ClipboardList,
  Building2,
  LogOut,
  UploadCloud,
  CreditCard,
  Database,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AuthBrandMark } from "@/components/auth/auth-brand-mark";
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
  { title: "Assigned Students", url: "/tutor/students", icon: Users },
  { title: "Sessions", url: "/tutor/sessions", icon: Calendar },
  { title: "AI Interaction", url: "/tutor/ai-interaction", icon: Bot },
  { title: "Progress", url: "/tutor/progress", icon: ClipboardList },
  { title: "Settings", url: "/tutor/settings", icon: Settings },
];

const schoolAdminMenuItems: MenuItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Students", url: "/students", icon: GraduationCap },
  { title: "Tutors", url: "/tutors", icon: Users },
  { title: "Settings", url: "/settings", icon: Settings },
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

const roleColors: Record<string, string> = {
  student: "bg-primary",
  tutor: "bg-accent text-accent-foreground",
  school_admin: "bg-muted-foreground",
  org_admin: "bg-brand-secondary",
  master_admin: "bg-destructive",
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

  const handleNavClick = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="relative border-b border-sidebar-border px-3 py-4 group-data-[collapsible=icon]:px-2">
        <div className="flex items-center pr-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:pr-0">
          <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
            <AuthBrandMark variant="sidebar" />
          </div>
          <img
            src="/logo.png"
            alt="AI Tutor"
            className="hidden h-8 w-8 shrink-0 object-contain group-data-[collapsible=icon]:block"
          />
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
          <SidebarGroupLabel className="px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
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
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border px-3 py-4">
        {user && (
          <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarFallback className="bg-gradient-brand text-primary-foreground text-sm">
                {user.fullName?.charAt(0)?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-1 flex-col overflow-hidden group-data-[collapsible=icon]:hidden">
              <span className="truncate text-sm font-medium">{user.fullName}</span>
              <Badge
                variant="secondary"
                className={`w-fit text-xs ${roleColors[user.role]} text-white`}
              >
                {roleLabels[user.role] || "User"}
              </Badge>
            </div>
            <button
              onClick={logout}
              className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground group-data-[collapsible=icon]:hidden"
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
