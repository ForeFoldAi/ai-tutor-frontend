import {
  Activity,
  AlertTriangle,
  Bell,
  Bot,
  FileText,
  Gauge,
  HardDrive,
  LayoutDashboard,
  LineChart,
  ListTree,
  Radar,
  Server,
  Settings,
  Siren,
  type LucideIcon,
} from "lucide-react";

export type MonitorNavItem = {
  title: string;
  /** Shorter label for narrow sidebar; tooltip still uses `title`. */
  shortTitle?: string;
  url: string;
  icon: LucideIcon;
};

export const monitorNavItems: MonitorNavItem[] = [
  { title: "Production Overview", shortTitle: "Overview", url: "/master-admin/monitor/overview", icon: LayoutDashboard },
  { title: "Issues & Exceptions", shortTitle: "Issues", url: "/master-admin/monitor/issues", icon: AlertTriangle },
  { title: "Production Logs", shortTitle: "Logs", url: "/master-admin/monitor/logs", icon: ListTree },
  { title: "Incident Management", shortTitle: "Incidents", url: "/master-admin/monitor/incidents", icon: Siren },
  { title: "Services & API Monitoring", shortTitle: "Services & API", url: "/master-admin/monitor/services", icon: Server },
  { title: "Infrastructure & VPS", shortTitle: "Infrastructure", url: "/master-admin/monitor/infrastructure", icon: HardDrive },
  { title: "Performance Monitoring", shortTitle: "Performance", url: "/master-admin/monitor/performance", icon: Gauge },
  { title: "AI Tutor Monitoring", shortTitle: "AI Tutor", url: "/master-admin/monitor/ai-tutor", icon: Bot },
  { title: "User Experience Monitoring", shortTitle: "User Experience", url: "/master-admin/monitor/user-experience", icon: Activity },
  { title: "Alerts & Notification Rules", shortTitle: "Alerts & Rules", url: "/master-admin/monitor/alerts", icon: Bell },
  { title: "Deployment Tracking", shortTitle: "Deployments", url: "/master-admin/monitor/deployments", icon: Radar },
  { title: "Reports & Analytics", shortTitle: "Reports", url: "/master-admin/monitor/reports", icon: LineChart },
  { title: "Monitoring Settings", shortTitle: "Settings", url: "/master-admin/monitor/settings", icon: Settings },
];

export function isMonitorNavActive(location: string, url: string): boolean {
  return location === url || location.startsWith(`${url}/`);
}

export const monitorDocsIcon = FileText;
