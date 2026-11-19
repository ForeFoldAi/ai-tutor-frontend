import { Suspense, type CSSProperties, type ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { MonitorSidebar } from "@/modules/monitoring/monitor-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";

interface MonitorLayoutProps {
  children: ReactNode;
}

const monitorSidebarVars = {
  "--sidebar-width": "17.5rem",
  "--app-sidebar-width": "17.5rem",
} as CSSProperties;

export function MonitorLayout({ children }: MonitorLayoutProps) {
  return (
    <SidebarProvider style={monitorSidebarVars}>
      <div className="flex h-dvh max-h-dvh w-full flex-col overflow-hidden lg:flex-row">
        <MonitorSidebar />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-background px-3 lg:hidden">
            <SidebarTrigger />
            <span className="text-sm font-medium">Production Monitor</span>
            <div className="ml-auto">
              <ThemeToggle />
            </div>
          </header>
          <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto overflow-x-hidden bg-background">
            <Suspense
              fallback={
                <div className="p-6 text-sm text-muted-foreground">Loading monitoring console…</div>
              }
            >
              {children}
            </Suspense>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
