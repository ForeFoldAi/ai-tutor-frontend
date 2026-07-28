import { useEffect, useMemo, useState } from "react";
import { Building2, Users, GraduationCap, TrendingUp, Upload, Sparkles, Landmark } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

import {
  demoOrganizations,
  demoSchools,
  demoUsers,
  demoTextbookUploads,
  demoSupportLogs,
  userGrowthSeries,
  revenueSeries,
  organizationGrowthSeries,
  aiUsageSeries,
  demoEmbeddingRecords,
} from "@/modules/master-admin/data/demo-master-admin";

import {
  UserGrowthTrendChart,
  RevenueTrendChart,
  OrganizationGrowthChart,
  AIUsageAnalyticsChart,
} from "@/modules/master-admin/components/analytics-charts";
import { GlobalSearchInput } from "@/modules/search";
import { DashboardHeaderActions } from "@/components/dashboard-header-actions";
import { useAuthStore } from "@/lib/auth-store";

function isSameDay(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

function formatCurrencyUSD(value: number) {
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export default function MasterAdminDashboardModulePage() {
  const user = useAuthStore((s) => s.user);
  const welcomeName = user?.fullName?.split(" ")[0] ?? "Admin";
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = window.setTimeout(() => setLoading(false), 650);
    return () => window.clearTimeout(t);
  }, []);

  const derived = useMemo(() => {
    const totalOrgs = demoOrganizations.length;
    const totalSchools = demoSchools.length;
    const totalUsers = demoUsers.length;
    const totalStudents = demoUsers.filter((u) => u.role === "Student").length;
    const totalTutors = demoUsers.filter((u) => u.role === "Tutor").length;
    const activeUsersToday = demoUsers.filter((u) => u.status === "Active" && isSameDay(u.lastLogin)).length;

    const revenueThisMonth = revenueSeries.length > 0 ? revenueSeries[revenueSeries.length - 1].revenue : 0;
    const uploadedTextbooks = demoTextbookUploads.length;
    const aiQueriesToday = aiUsageSeries.find((s) => s.label === "Chat")?.queries ?? 0;

    const pendingOrgs = demoOrganizations.filter((o) => o.status === "Pending");
    const pendingSchools = demoSchools.filter((s) => s.status === "Pending");
    const latestUploads = [...demoTextbookUploads].sort((a, b) => +new Date(b.uploadDate) - +new Date(a.uploadDate)).slice(0, 4);
    const latestEmbeddingFailures = [...demoEmbeddingRecords]
      .filter((r) => r.status === "Failed")
      .sort((a, b) => +new Date(b.lastUpdated) - +new Date(a.lastUpdated))
      .slice(0, 3);

    const recentOrgs = [...demoOrganizations]
      .sort((a, b) => +new Date(b.createdDate) - +new Date(a.createdDate))
      .slice(0, 4);

    return {
      totalOrgs,
      totalSchools,
      totalUsers,
      totalStudents,
      totalTutors,
      activeUsersToday,
      revenueThisMonth,
      uploadedTextbooks,
      aiQueriesToday,
      pendingOrgs,
      pendingSchools,
      latestUploads,
      latestEmbeddingFailures,
      recentOrgs,
    };
  }, []);

  const kpiCards = [
    { label: "Total Organizations", value: derived.totalOrgs, icon: Building2, hint: "Active tenants" },
    { label: "Total Schools", value: derived.totalSchools, icon: GraduationCap, hint: "Campuses onboarded" },
    { label: "Total Users", value: derived.totalUsers, icon: Users, hint: "All roles combined" },
    { label: "Total Students", value: derived.totalStudents, icon: Users, hint: "Enrolled learners" },
    { label: "Total Tutors", value: derived.totalTutors, icon: Sparkles, hint: "AI-ready educators" },
    { label: "Active Users Today", value: derived.activeUsersToday, icon: TrendingUp, hint: "Logged in today" },
    { label: "Revenue This Month", value: formatCurrencyUSD(derived.revenueThisMonth), icon: Landmark, hint: "Last 30 days" },
    { label: "Uploaded Textbooks", value: derived.uploadedTextbooks, icon: Upload, hint: "Ready for OCR" },
    { label: "AI Queries Today", value: derived.aiQueriesToday.toLocaleString(), icon: Sparkles, hint: "Live usage" },
  ];

  // Spec wants 10 KPI cards; we add "Failed Embeddings" as a relevant admin metric.
  const kpiCards10 = [
    ...kpiCards,
    {
      label: "Failed Embeddings",
      value: demoEmbeddingRecords.filter((r) => r.status === "Failed").length,
      icon: TrendingUp,
      hint: "Retry available",
    },
  ];

  const totalEmbeddingFailures = demoEmbeddingRecords.filter((r) => r.status === "Failed").length;
  const embeddingFailureRate = demoEmbeddingRecords.length
    ? Math.round((totalEmbeddingFailures / demoEmbeddingRecords.length) * 100)
    : 0;

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-7 w-[280px]" />
            <Skeleton className="h-4 w-[420px]" />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="pt-6">
                <Skeleton className="h-5 w-32 mb-3" />
                <Skeleton className="h-7 w-24" />
                <Skeleton className="h-3 w-36 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-64 mt-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-64 mt-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-56" />
                <Skeleton className="h-4 w-40 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full mt-3" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome, {welcomeName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Premium overview of platform health, growth, revenue, and AI ingestion pipelines.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Badge variant="outline" className="h-fit">
            <Sparkles className="mr-2 h-4 w-4" />
            Admin-grade analytics
          </Badge>
          <DashboardHeaderActions
            className="hidden lg:flex"
            leading={
              <GlobalSearchInput
                placeholder="Search users, schools..."
                data-testid="master-admin-dashboard-search"
              />
            }
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {kpiCards10.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card
              key={kpi.label}
              className="transition-transform hover:-translate-y-0.5 hover:shadow-md overflow-hidden"
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">{kpi.label}</p>
                    <p className="text-2xl font-bold">{kpi.value}</p>
                    <p className="text-xs text-muted-foreground">{kpi.hint}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              User Growth Trend
            </CardTitle>
            <CardDescription>Monthly active users across the platform</CardDescription>
          </CardHeader>
          <CardContent>
            <UserGrowthTrendChart data={userGrowthSeries.map((d) => ({ month: d.month, users: d.users }))} />
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Landmark className="h-5 w-5 text-primary" />
              Revenue Trend
            </CardTitle>
            <CardDescription>Subscription revenue trend by month</CardDescription>
          </CardHeader>
          <CardContent>
            <RevenueTrendChart data={revenueSeries} />
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Organization Growth
            </CardTitle>
            <CardDescription>New organizations onboarded each month</CardDescription>
          </CardHeader>
          <CardContent>
            <OrganizationGrowthChart data={organizationGrowthSeries} />
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Usage Analytics
            </CardTitle>
            <CardDescription>Volume by AI capability</CardDescription>
          </CardHeader>
          <CardContent>
            <AIUsageAnalyticsChart data={aiUsageSeries} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Recent Organizations</CardTitle>
            <CardDescription>Latest tenants with onboarding completion</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {derived.recentOrgs.map((org) => (
              <div key={org.id} className="flex items-center justify-between gap-4 rounded-lg border p-3 hover:bg-muted/30">
                <div className="min-w-0">
                  <p className="font-medium truncate">{org.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{org.ownerName}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={org.subscriptionPlan === "Enterprise" ? "default" : "secondary"}>{org.subscriptionPlan}</Badge>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(org.createdDate).toLocaleDateString(undefined, { month: "short", day: "2-digit" })}
                  </span>
                </div>
              </div>
            ))}
            <Button variant="ghost" className="w-full justify-center">
              View Organizations
            </Button>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Pending Onboarding Requests</CardTitle>
            <CardDescription>Organizations awaiting activation and schools pending setup</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {derived.pendingOrgs.length === 0 && derived.pendingSchools.length === 0 ? (
              <div className="text-sm text-muted-foreground py-6 text-center">No pending requests right now.</div>
            ) : (
              <>
                {derived.pendingOrgs.slice(0, 3).map((org) => (
                  <div key={org.id} className="flex items-center justify-between gap-4 rounded-lg border p-3">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{org.name}</p>
                      <p className="text-xs text-muted-foreground truncate">Owner: {org.ownerName}</p>
                    </div>
                    <Badge variant="outline">Organization</Badge>
                  </div>
                ))}
                {derived.pendingSchools.slice(0, 2).map((school) => (
                  <div key={school.id} className="flex items-center justify-between gap-4 rounded-lg border p-3">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{school.name}</p>
                      <p className="text-xs text-muted-foreground truncate">Principal: {school.principalName}</p>
                    </div>
                    <Badge variant="outline">School</Badge>
                  </div>
                ))}
              </>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Recent Upload Activity</CardTitle>
            <CardDescription>Textbooks uploaded to the ingestion pipeline</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {derived.latestUploads.map((up) => (
              <div key={up.id} className="flex items-start justify-between gap-4 rounded-lg border p-3">
                <div className="min-w-0">
                  <p className="font-medium truncate">{up.fileName}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {up.board} • {up.className} • {up.subject}
                  </p>
                </div>
                <div className="text-right space-y-1">
                  <Badge variant={up.embeddingStatus === "Embedded" ? "default" : up.embeddingStatus === "Failed" ? "destructive" : "secondary"}>
                    {up.embeddingStatus}
                  </Badge>
                  <p className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(up.uploadDate).toLocaleDateString(undefined, { month: "short", day: "2-digit" })}
                  </p>
                </div>
              </div>
            ))}
            <div className="pt-2">
              <div className="flex items-center justify-between gap-4 mb-2">
                <p className="text-sm font-medium">Embedding failure rate</p>
                <p className="text-sm text-muted-foreground">{embeddingFailureRate}%</p>
              </div>
              <Progress value={embeddingFailureRate} className="h-2" />
              <p className="text-xs text-muted-foreground mt-2">
                {totalEmbeddingFailures} failed embeddings detected. Retry queue for recovery.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Recent Support Logs</CardTitle>
            <CardDescription>Operational alerts from onboarding and AI pipelines</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {demoSupportLogs.map((log) => (
              <div key={log.id} className="flex items-start justify-between gap-4 rounded-lg border p-3 hover:bg-muted/30">
                <div className="min-w-0">
                  <p className="font-medium truncate">{log.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{log.customer}</p>
                </div>
                <div className="text-right">
                  <Badge
                    variant={
                      log.severity === "Critical" ? "destructive" : log.severity === "Warning" ? "secondary" : "outline"
                    }
                  >
                    {log.severity}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1 whitespace-nowrap">{log.time}</p>
                </div>
              </div>
            ))}
            <Button variant="ghost" className="w-full justify-center">
              View Reports
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
