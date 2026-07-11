import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AuthBrandMark } from "@/components/auth/auth-brand-mark";
import { FloatingSettingsButton } from "@/components/floating-settings-button";
import { useAuthStore } from "@/lib/auth-store";
import { UserRole } from "@/types/schema";
import { useLocation } from "wouter";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user } = useAuthStore();
  const [location] = useLocation();
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };
  const isStudent = !user || user.role === UserRole.STUDENT;
  const showFloatingSettings =
    isStudent && (location === "/dashboard" || location === "/settings");

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full flex-col md:flex-row">
        <AppSidebar />
        <div className="flex min-h-0 flex-1 flex-col">
          <header className="flex shrink-0 items-center gap-3 border-b border-border bg-background px-4 py-3 md:hidden">
            <SidebarTrigger className="h-9 w-9" data-testid="button-mobile-menu" />
            <AuthBrandMark variant="sidebar" className="min-w-0 flex-1" />
          </header>
          <main className="flex min-h-0 flex-1 flex-col overflow-auto bg-background [&:has(.dashboard-fit)]:overflow-y-auto">
            {children}
          </main>
          {showFloatingSettings && <FloatingSettingsButton />}
        </div>
      </div>
    </SidebarProvider>
  );
}
