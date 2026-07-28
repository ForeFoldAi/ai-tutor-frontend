import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AppNavBar } from "@/components/app-nav-bar";
import { AppMobileHeader } from "@/components/app-mobile-header";
import { AskAiTutorDialog } from "@/components/ask-ai-tutor-dialog";
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
      <div className="flex h-dvh max-h-dvh w-full flex-col overflow-hidden lg:flex-row">
        <AppSidebar />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <AppMobileHeader />
          <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto overflow-x-hidden bg-background pb-[calc(3.5rem+env(safe-area-inset-bottom))] lg:pb-0 [&:has(.dashboard-fit)]:overflow-x-hidden [&:has(.dashboard-fit)]:overflow-y-auto">
            {children}
          </main>
          {showFloatingSettings && <FloatingSettingsButton />}
          <AppNavBar />
        </div>
      </div>
      {isStudent ? <AskAiTutorDialog /> : null}
    </SidebarProvider>
  );
}
