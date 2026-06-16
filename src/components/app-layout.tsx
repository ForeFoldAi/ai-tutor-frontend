import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuthStore } from "@/lib/auth-store";
import { Badge } from "@/components/ui/badge";

const roleLabels: Record<string, string> = {
  student: "Student",
  tutor: "Tutor",
  school_admin: "School Admin",
  org_admin: "Organization",
  master_admin: "Master Admin",
};

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user } = useAuthStore();

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col overflow-hidden min-h-0">
          <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b px-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center gap-4">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
            </div>
            <div className="flex items-center gap-3">
              {user && (
                <Badge variant="outline" className="hidden sm:flex">
                  {roleLabels[user.role] || "User"}
                </Badge>
              )}
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 min-h-0 overflow-auto bg-background">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
