import { Link } from "wouter";
import {
  Users,
  Brain,
  Target,
  Bell,
  FileText,
  PenLine,
  CalendarClock,
  TrendingUp,
  TrendingDown,
  Sparkles,
  User,
  Lightbulb,
} from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { useTutorDashboard } from "@/hooks/use-tutor-dashboard";
import { DataState } from "@/modules/shared/components/data-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PageShell } from "@/components/page-shell";
import { TutorDashboardHeader } from "@/modules/tutor/components/tutor-dashboard-header";
import type { TutorAiRecommendationApi } from "@/api/tutor-dashboard";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type MetricCardProps = {
  label: string;
  value: string | number;
  trend: string;
  trendUp: boolean;
  icon: LucideIcon;
  labelClassName: string;
  iconClassName: string;
};

function MetricCard({
  label,
  value,
  trend,
  trendUp,
  icon: Icon,
  labelClassName,
  iconClassName,
}: MetricCardProps) {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardContent className="flex items-start justify-between gap-2 p-3 sm:gap-4 sm:p-4">
        <div className="min-w-0 space-y-1 sm:space-y-2">
          <p className={`flex items-center gap-1.5 text-xs font-medium sm:gap-2 sm:text-sm ${labelClassName}`}>
            <Icon className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
            <span className="leading-snug">{label}</span>
          </p>
          <p className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{value}</p>
          <p
            className={`flex items-center gap-1 text-[11px] font-medium sm:text-xs ${
              trendUp ? "text-emerald-600" : "text-rose-600"
            }`}
          >
            {trendUp ? (
              <TrendingUp className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5 shrink-0" />
            )}
            {trend}
          </p>
        </div>
        <div className={`hidden rounded-xl p-2.5 sm:block sm:p-3 ${iconClassName}`}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function formatSessionTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function recommendationIcon(icon: TutorAiRecommendationApi["icon"]): LucideIcon {
  if (icon === "quiz") return PenLine;
  if (icon === "worksheet") return FileText;
  if (icon === "revision") return CalendarClock;
  return Lightbulb;
}

function riskTagClass(risk: string) {
  if (risk === "High") return "bg-rose-50 text-rose-700 border-rose-200";
  if (risk === "Medium") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-yellow-50 text-yellow-700 border-yellow-200";
}

export default function TutorDashboardModulePage() {
  const { user } = useAuthStore();
  const dashboardQuery = useTutorDashboard();
  const data = dashboardQuery.data;
  const metrics = data?.metrics;
  const firstName = user?.fullName?.split(" ")[0] ?? "Tutor";
  const sessions = data?.todays_sessions ?? [];
  const attentionStudents = data?.attention_students ?? [];
  const aiRecommendations = data?.ai_recommendations ?? [];

  return (
    <PageShell>
      <TutorDashboardHeader firstName={firstName} />

      <DataState
        loading={dashboardQuery.isLoading}
        error={dashboardQuery.error ? String(dashboardQuery.error) : null}
        empty={false}
        emptyText="No tutor metrics available."
        onRetry={() => void dashboardQuery.refetch()}
      >
        <div className="grid grid-cols-2 gap-2 md:grid-cols-2 xl:grid-cols-4 md:gap-4">
          <MetricCard
            label="Assigned Students"
            value={metrics?.total_assigned ?? 0}
            trend={metrics?.assigned_trend ?? "—"}
            trendUp
            icon={Users}
            labelClassName="text-blue-600"
            iconClassName="bg-blue-50 text-blue-600"
          />
          <MetricCard
            label="Active This Week"
            value={metrics?.active_this_week ?? 0}
            trend={metrics?.active_trend ?? "—"}
            trendUp
            icon={Brain}
            labelClassName="text-violet-600"
            iconClassName="bg-violet-50 text-violet-600"
          />
          <MetricCard
            label="Average Completion"
            value={`${metrics?.average_completion ?? 0}%`}
            trend={metrics?.completion_trend ?? "—"}
            trendUp
            icon={Target}
            labelClassName="text-emerald-600"
            iconClassName="bg-emerald-50 text-emerald-600"
          />
          <MetricCard
            label="Attention Required"
            value={metrics?.attention_required ?? 0}
            trend={metrics?.attention_trend ?? "—"}
            trendUp={false}
            icon={Bell}
            labelClassName="text-rose-600"
            iconClassName="bg-rose-50 text-rose-600"
          />
        </div>
      </DataState>

      <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-blue-700">
              <CalendarClock className="h-5 w-5 text-blue-600" />
              Today&apos;s Sessions
            </CardTitle>
            <Link href="/tutor/sessions" className="text-sm font-medium text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sessions scheduled for today.</p>
            ) : (
              sessions.slice(0, 4).map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold">{formatSessionTime(session.starts_at)}</p>
                    <p className="font-medium">{session.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Grade {session.grade} · Section {session.section}
                      {session.subject ? ` · ${session.subject}` : ""}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      session.status === "live"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : session.status === "completed"
                          ? "border-slate-200 bg-slate-50 text-slate-700"
                          : "border-sky-200 bg-sky-50 text-sky-700"
                    }
                  >
                    {session.status === "live"
                      ? "Live"
                      : session.status === "completed"
                        ? "Done"
                        : "Upcoming"}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-blue-700">
              <Users className="h-5 w-5 text-blue-600" />
              Students Needing Attention
            </CardTitle>
            <Link href="/tutor/students" className="text-sm font-medium text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {attentionStudents.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No high-risk students right now.
              </p>
            ) : (
              attentionStudents.map((student) => (
                <Link
                  key={student.student_user_id}
                  href={`/tutor/students/${student.student_user_id}`}
                >
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/20 px-4 py-3 transition-colors hover:border-primary/30">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-blue-50 text-blue-600">
                          <User className="h-5 w-5" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-black dark:text-foreground">
                          {student.name}
                        </p>
                        <p className="truncate text-xs text-neutral-600 dark:text-muted-foreground">
                          Grade {student.grade} · {student.topic}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn("shrink-0", riskTagClass(student.risk_level))}
                    >
                      {student.tag}
                    </Badge>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Recommendations
          </CardTitle>
          <Link href="/tutor/ai-insights" className="text-sm font-medium text-primary hover:underline">
            View all
          </Link>
        </CardHeader>
        <CardContent className="space-y-3">
          {aiRecommendations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Recommendations will appear as students learn with AI Tutor.
            </p>
          ) : (
            aiRecommendations.map((item) => {
              const Icon = recommendationIcon(item.icon);
              return (
                <div
                  key={item.id}
                  className="flex flex-col gap-3 rounded-xl border border-border/60 bg-muted/20 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-primary/10 p-2 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                  <Button asChild size="sm" className="shrink-0">
                    <Link href={item.action_href}>{item.action_label}</Link>
                  </Button>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
