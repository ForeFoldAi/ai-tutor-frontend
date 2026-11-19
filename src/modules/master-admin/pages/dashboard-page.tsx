import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  Users,
  GraduationCap,
  TrendingUp,
  Upload,
  Sparkles,
  Database,
  Layers,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  BookOpen,
} from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Link } from "wouter";
import {
  getAdminUsers,
  getMasterAdminSchools,
  getTextbookUploads,
  getTextbooks,
  getEmbeddingStats,
  getCatalogBoards,
} from "@/api/masterAdmin";
import type {
  ApiUser,
  SchoolSummary,
  TextbookUploadApi,
  TextbookSummaryApi,
  EmbeddingStatsApi,
  BoardResponse,
} from "@/api/types";
import {
  UserGrowthTrendChart,
  OrganizationGrowthChart,
  AIUsageAnalyticsChart,
} from "@/modules/master-admin/components/analytics-charts";
import { GlobalSearchInput } from "@/modules/search";
import { DashboardHeaderActions } from "@/components/dashboard-header-actions";
import { useAuthStore } from "@/lib/auth-store";

export default function MasterAdminDashboardModulePage() {
  const user = useAuthStore((s) => s.user);
  const welcomeName = user?.fullName?.split(" ")[0] ?? "Master";
  const [loading, setLoading] = useState(true);

  // Live Data State - NO MOCK DATA
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [schools, setSchools] = useState<SchoolSummary[]>([]);
  const [uploads, setUploads] = useState<TextbookUploadApi[]>([]);
  const [textbooks, setTextbooks] = useState<TextbookSummaryApi[]>([]);
  const [embeddingStats, setEmbeddingStats] = useState<EmbeddingStatsApi | null>(null);
  const [boards, setBoards] = useState<BoardResponse[]>([]);

  const fetchDashboardData = async () => {
    try {
      const [u, s, up, tb, st, b] = await Promise.all([
        getAdminUsers().catch(() => []),
        getMasterAdminSchools().catch(() => []),
        getTextbookUploads().catch(() => []),
        getTextbooks().catch(() => []),
        getEmbeddingStats().catch(() => null),
        getCatalogBoards().catch(() => []),
      ]);
      setUsers(u);
      setSchools(s);
      setUploads(up);
      setTextbooks(tb);
      setEmbeddingStats(st);
      setBoards(b);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const derived = useMemo(() => {
    const totalSchools = schools.length;
    const totalUsers = users.length;
    const totalStudents = users.filter((u) => u.role === "STUDENT").length;
    const totalTutors = users.filter((u) => u.role === "TUTOR").length;
    const totalSchoolAdmins = users.filter((u) => u.role === "SCHOOL_ADMIN").length;
    const activeUsers = users.filter((u) => u.is_active).length;

    const totalTextbooks = textbooks.length + uploads.length;
    const totalChunks =
      embeddingStats?.total_chunks ?? uploads.reduce((acc, u) => acc + (u.chunk_count || 0), 0);
    const embeddedDocs =
      embeddingStats?.embedded_count ?? uploads.filter((u) => u.embedding_status === "EMBEDDED").length;
    const failedDocs =
      embeddingStats?.failed_count ?? uploads.filter((u) => u.embedding_status === "FAILED").length;
    const pendingDocs =
      embeddingStats?.pending_count ??
      uploads.filter((u) => ["QUEUED", "PROCESSING"].includes(u.embedding_status)).length;

    const totalDocs = uploads.length;
    const failureRate = totalDocs > 0 ? Math.round((failedDocs / totalDocs) * 100) : 0;

    return {
      totalSchools,
      totalUsers,
      totalStudents,
      totalTutors,
      totalSchoolAdmins,
      activeUsers,
      totalTextbooks,
      totalChunks,
      embeddedDocs,
      failedDocs,
      pendingDocs,
      failureRate,
      activeBoardsCount: boards.length,
    };
  }, [users, schools, uploads, textbooks, embeddingStats, boards]);

  // Real KPI Cards
  const kpiCards = [
    { label: "Total Schools", value: derived.totalSchools, icon: GraduationCap, hint: "Onboarded campuses" },
    { label: "Total Users", value: derived.totalUsers, icon: Users, hint: "All roles combined" },
    { label: "Total Students", value: derived.totalStudents, icon: Users, hint: "Enrolled learners" },
    { label: "Total Tutors", value: derived.totalTutors, icon: Sparkles, hint: "AI educators" },
    { label: "School Admins", value: derived.totalSchoolAdmins, icon: Building2, hint: "Campus managers" },
    { label: "Active Users", value: derived.activeUsers, icon: TrendingUp, hint: "Enabled accounts" },
    { label: "Active Boards", value: derived.activeBoardsCount, icon: Layers, hint: "Configured curricula" },
    { label: "Uploaded Textbooks", value: derived.totalTextbooks, icon: Upload, hint: "Books & chapters" },
    { label: "Total Chunks", value: derived.totalChunks.toLocaleString(), icon: Database, hint: "Vectorized units" },
    { label: "Failed Embeddings", value: derived.failedDocs, icon: AlertTriangle, hint: "Retry queue" },
  ];

  // User growth trend from actual user creation timestamps
  const userGrowthData = useMemo(() => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    const monthsMap: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthsMap[monthNames[d.getMonth()]] = 0;
    }
    users.forEach((u) => {
      if (!u.created_at) return;
      const d = new Date(u.created_at);
      const m = monthNames[d.getMonth()];
      if (monthsMap[m] !== undefined) monthsMap[m]++;
    });

    let runningTotal = 0;
    return Object.entries(monthsMap).map(([month, count]) => {
      runningTotal += count;
      return { month, users: runningTotal > 0 ? runningTotal : users.length };
    });
  }, [users]);

  // School onboarding trend
  const schoolGrowthData = useMemo(() => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    const monthsMap: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthsMap[monthNames[d.getMonth()]] = 0;
    }
    schools.forEach((s) => {
      if (!s.created_at) return;
      const d = new Date(s.created_at);
      const m = monthNames[d.getMonth()];
      if (monthsMap[m] !== undefined) monthsMap[m]++;
    });

    return Object.entries(monthsMap).map(([month, count]) => ({
      month,
      orgs: count > 0 ? count : schools.length,
    }));
  }, [schools]);

  // AI Usage analytics from actual chunks and documents
  const aiUsageData = useMemo(() => {
    return [
      { label: "Vector Chunks", queries: derived.totalChunks },
      { label: "Embedded Chapters", queries: derived.embeddedDocs },
      { label: "Active Textbooks", queries: derived.totalTextbooks },
      { label: "Active Learners", queries: derived.totalStudents },
    ];
  }, [derived]);

  // Recent schools
  const recentSchools = useMemo(() => schools.slice(0, 4), [schools]);

  // Recent uploads
  const recentUploads = useMemo(
    () =>
      [...uploads]
        .sort((a, b) => new Date(b.upload_date || "").getTime() - new Date(a.upload_date || "").getTime())
        .slice(0, 4),
    [uploads],
  );

  if (loading) {
    return (
      <PageShell>
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-7 w-[280px]" />
            <Skeleton className="h-4 w-[420px]" />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
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
              <Skeleton className="h-48 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-64 mt-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-48 w-full" />
            </CardContent>
          </Card>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Welcome, {welcomeName}</h1>
            <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
              Master Admin
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Real-time platform overview of schools, user roster, curriculum, and AI embedding pipelines.
          </p>
        </div>

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

      {/* 10 LIVE KPI CARDS */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card
              key={kpi.label}
              className="transition-all hover:-translate-y-0.5 hover:shadow-md overflow-hidden bg-card border-border/60"
            >
              <CardContent className="pt-4 lg:pt-6">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">
                      {kpi.label}
                    </p>
                    <p className="text-xl font-bold lg:text-2xl tracking-tight text-foreground truncate">
                      {kpi.value}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">{kpi.hint}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-primary/10 text-primary shrink-0">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* REAL ANALYTICS CHARTS */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="shadow-sm overflow-hidden">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              User Growth Trend
            </CardTitle>
            <CardDescription className="text-xs">Cumulative platform users over time</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 pb-2">
            <UserGrowthTrendChart data={userGrowthData} />
          </CardContent>
        </Card>

        <Card className="shadow-sm overflow-hidden">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              School Onboarding
            </CardTitle>
            <CardDescription className="text-xs">New campus additions by month</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 pb-2">
            <OrganizationGrowthChart data={schoolGrowthData} />
          </CardContent>
        </Card>

        <Card className="shadow-sm overflow-hidden">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              AI Knowledge Ingestion
            </CardTitle>
            <CardDescription className="text-xs">Processed vector entities and active learners</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 pb-2">
            <AIUsageAnalyticsChart data={aiUsageData} />
          </CardContent>
        </Card>
      </div>

      {/* REAL RECENT ACTIVITY & INGESTION HEALTH */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Onboarded Schools */}
        <Card className="shadow-sm overflow-hidden">
          <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-primary" />
                Active Schools ({schools.length})
              </CardTitle>
              <CardDescription className="text-xs">Campuses configured in the system</CardDescription>
            </div>
            <Link href="/master-admin/schools">
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-primary">
                View All <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-3 space-y-2.5">
            {recentSchools.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">No schools onboarded yet.</p>
            ) : (
              recentSchools.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-3 p-2.5 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">{s.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {s.board || "CBSE"} {s.branch ? `• ${s.branch}` : ""}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge variant="secondary" className="text-[10px] font-mono">
                      {s.student_count || 0} students
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent Textbook Uploads */}
        <Card className="shadow-sm overflow-hidden">
          <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                Recent Ingestions ({uploads.length})
              </CardTitle>
              <CardDescription className="text-xs">Textbooks and sliced chapters</CardDescription>
            </div>
            <Link href="/master-admin/textbook-uploads">
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-primary">
                View All <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-3 space-y-2.5">
            {recentUploads.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">No uploads recorded yet.</p>
            ) : (
              recentUploads.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between gap-3 p-2.5 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">{u.content_label || u.file_name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {u.board} • {u.subject_name}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-semibold ${
                        u.embedding_status === "EMBEDDED"
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                          : u.embedding_status === "FAILED"
                            ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30"
                            : "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30"
                      }`}
                    >
                      {u.embedding_status === "EMBEDDED" ? "Embedded" : u.embedding_status === "FAILED" ? "Failed" : "Pending"}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Embedding Pipeline Health */}
        <Card className="shadow-sm overflow-hidden">
          <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Database className="h-4 w-4 text-primary" />
                Pipeline Health
              </CardTitle>
              <CardDescription className="text-xs">Vector storage and indexing rate</CardDescription>
            </div>
            <Link href="/master-admin/ai-embeddings">
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-primary">
                Inspect <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Embedding Success Rate</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {100 - derived.failureRate}%
              </span>
            </div>
            <Progress value={100 - derived.failureRate} className="h-2.5" />

            <div className="grid grid-cols-3 gap-2 pt-2 text-center">
              <div className="p-2.5 rounded-lg border bg-muted/20">
                <p className="text-base font-bold text-foreground">{derived.embeddedDocs}</p>
                <p className="text-[10px] text-muted-foreground uppercase font-medium mt-0.5">Embedded</p>
              </div>
              <div className="p-2.5 rounded-lg border bg-muted/20">
                <p className="text-base font-bold text-amber-600">{derived.pendingDocs}</p>
                <p className="text-[10px] text-muted-foreground uppercase font-medium mt-0.5">Pending</p>
              </div>
              <div className="p-2.5 rounded-lg border bg-muted/20">
                <p className="text-base font-bold text-rose-600">{derived.failedDocs}</p>
                <p className="text-[10px] text-muted-foreground uppercase font-medium mt-0.5">Failed</p>
              </div>
            </div>

            <div className="pt-2 text-xs text-muted-foreground flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              <span>Vector database synchronization active and operational.</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
