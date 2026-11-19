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
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AuthBrandMark } from "@/components/auth/auth-brand-mark";
import { useAuthStore } from "@/lib/auth-store";
import { isMonitorNavActive, monitorNavItems } from "@/modules/monitoring/monitor-nav-items";

export function MonitorSidebar() {
  const [location] = useLocation();
  const { user } = useAuthStore();
  const { state, toggleSidebar } = useSidebar();

  return (
    <Sidebar collapsible="icon" className="tutor-sidebar-theme border-r-0">
      <SidebarHeader className="relative shrink-0 border-b border-white/10 px-3 py-4 group-data-[collapsible=icon]:px-2">
        <div className="flex items-center gap-2 pr-2 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:pr-0">
          <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
            <AuthBrandMark
              variant="sidebar"
              logoBackground
              className="[&_p]:text-white [&_p:last-child]:text-white/75"
            />
            <Badge
              variant="secondary"
              className="mt-2 h-5 border-0 bg-white/15 px-2 text-[10px] font-medium text-white hover:bg-white/20"
            >
              Production Monitor
            </Badge>
          </div>
          <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-sm group-data-[collapsible=icon]:flex">
            <img src="/logo.png" alt="Learn Mastro" className="h-7 w-7 object-contain" />
          </div>
        </div>
        <Button
          variant="ghost"
          size={null}
          className="absolute -right-2.5 top-[calc(50%+0.5rem)] z-20 hidden h-6 w-6 -translate-y-1/2 rounded-md border border-border bg-background shadow-sm hover:bg-accent lg:inline-flex [&_svg]:size-3.5"
          onClick={toggleSidebar}
          data-testid="button-monitor-sidebar-toggle"
          aria-label={state === "collapsed" ? "Expand sidebar" : "Collapse sidebar"}
        >
          {state === "expanded" ? (
            <ChevronLeft strokeWidth={3} />
          ) : (
            <ChevronRight strokeWidth={3} />
          )}
        </Button>
      </SidebarHeader>

      <SidebarContent className="overflow-y-auto">
        <SidebarGroup className="px-2 py-2">
          <SidebarGroupLabel className="px-3 text-xs font-medium uppercase tracking-wider text-white/55">
            Monitoring
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {monitorNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={isMonitorNavActive(location, item.url)}
                      tooltip={item.title}
                      data-testid={`monitor-nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <Link href={item.url} className="min-w-0">
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate group-data-[collapsible=icon]:hidden">
                          {item.shortTitle || item.title}
                        </span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-white/10 p-3">
        <div className="mb-2 truncate text-xs text-white/70 group-data-[collapsible=icon]:hidden">
          {user?.fullName || user?.email || "Master Admin"}
        </div>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="h-9 w-full justify-start gap-2 px-2 text-white/90 hover:bg-white/10 hover:text-white group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
        >
          <a href="/master-admin/dashboard" title="Back to Admin Panel">
            <ArrowLeft className="h-4 w-4 shrink-0" />
            <span className="truncate group-data-[collapsible=icon]:hidden">Back to Admin Panel</span>
          </a>
        </Button>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
