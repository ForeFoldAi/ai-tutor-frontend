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
} from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { useTutorData } from "@/modules/tutor/hooks/use-tutor-data";
import { DataState } from "@/modules/shared/components/data-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TutorDashboardHeader } from "@/modules/tutor/components/tutor-dashboard-header";
import type { TutorSession } from "@/modules/tutor/types";
import type { LucideIcon } from "lucide-react";

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
    <Card className="border-border/60 shadow-sm">
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div className="space-y-2">
          <p className={`flex items-center gap-2 text-sm font-medium ${labelClassName}`}>
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </p>
          <p className="text-3xl font-bold tracking-tight text-foreground">{value}</p>
          <p
            className={`flex items-center gap-1 text-xs font-medium ${
              trendUp ? "text-emerald-600" : "text-rose-600"
            }`}
          >
            {trendUp ? (
              <TrendingUp className="h-3.5 w-3.5" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5" />
            )}
            {trend}
          </p>
        </div>
        <div className={`rounded-xl p-3 ${iconClassName}`}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

const demoSessions: TutorSession[] = [
  {
    id: "demo-1",
    title: "Algebra Basics",
    subject: "Mathematics",
    grade: "7",
    section: "A",
    startsAt: new Date(new Date().setHours(10, 0, 0, 0)).toISOString(),
    durationMinutes: 60,
  },
  {
    id: "demo-2",
    title: "Fractions Revision",
    subject: "Mathematics",
    grade: "6",
    section: "B",
    startsAt: new Date(new Date().setHours(11, 30, 0, 0)).toISOString(),
    durationMinutes: 45,
  },
  {
    id: "demo-3",
    title: "Geometry Concepts",
    subject: "Mathematics",
    grade: "6",
    section: "A",
    startsAt: new Date(new Date().setHours(14, 0, 0, 0)).toISOString(),
    durationMinutes: 60,
  },
  {
    id: "demo-4",
    title: "Word Problems",
    subject: "Mathematics",
    grade: "6",
    section: "C",
    startsAt: new Date(new Date().setHours(16, 30, 0, 0)).toISOString(),
    durationMinutes: 45,
  },
];

const attentionStudents = [
  { name: "Aarav Patel", detail: "Grade 7 · Algebra", tag: "Low Completion", tagClass: "bg-rose-50 text-rose-700 border-rose-200" },
  { name: "Priya Reddy", detail: "Grade 6 · Fractions", tag: "Inactive 5 Days", tagClass: "bg-amber-50 text-amber-700 border-amber-200" },
  { name: "Kiran Kumar", detail: "Grade 6 · Geometry", tag: "Quiz Performance", tagClass: "bg-yellow-50 text-yellow-700 border-yellow-200" },
];

const aiRecommendations = [
  {
    title: "Fractions Revision Needed",
    description: "12 students are struggling",
    action: "Generate Worksheet",
    icon: FileText,
  },
  {
    title: "Word Problems Practice",
    description: "8 students need more practice",
    action: "Create Practice Quiz",
    icon: PenLine,
  },
  {
    title: "Algebra Basics Weak",
    description: "Schedule a revision session",
    action: "Schedule Revision Session",
    icon: CalendarClock,
  },
];

function formatSessionTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function sessionStatus(startsAt: string): "live" | "upcoming" {
  const start = new Date(startsAt).getTime();
  const now = Date.now();
  const end = start + 60 * 60 * 1000;
  if (now >= start && now <= end) return "live";
  return "upcoming";
}

function getTodaySessions(sessions: TutorSession[]) {
  const today = new Date();
  const filtered = sessions.filter((session) => {
    const d = new Date(session.startsAt);
    return (
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate()
    );
  });
  return filtered.length ? filtered : demoSessions;
}

export default function TutorDashboardModulePage() {
  const { user } = useAuthStore();
  const { progressQuery, sessionsQuery } = useTutorData();
  const metrics = progressQuery.data;
  const firstName = user?.fullName?.split(" ")[0] ?? "Tutor";
  const sessions = getTodaySessions(sessionsQuery.data ?? []);
  const attentionCount = Math.max(
    1,
    (metrics?.totalAssigned ?? 0) - (metrics?.activeStudents ?? 0),
  );

  return (
    <div className="space-y-6 p-6">
      <TutorDashboardHeader firstName={firstName} />

      <DataState
        loading={progressQuery.isLoading}
        error={progressQuery.error ? String(progressQuery.error) : null}
        empty={false}
        emptyText="No tutor metrics available."
        onRetry={() => void progressQuery.refetch()}
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Assigned Students"
            value={metrics?.totalAssigned ?? 42}
            trend="5 this week"
            trendUp
            icon={Users}
            labelClassName="text-blue-600"
            iconClassName="bg-blue-50 text-blue-600"
          />
          <MetricCard
            label="Active This Week"
            value={metrics?.activeStudents ?? 38}
            trend="12 this week"
            trendUp
            icon={Brain}
            labelClassName="text-violet-600"
            iconClassName="bg-violet-50 text-violet-600"
          />
          <MetricCard
            label="Average Completion"
            value={`${metrics?.averageCompletion ?? 78}%`}
            trend="8% this week"
            trendUp
            icon={Target}
            labelClassName="text-emerald-600"
            iconClassName="bg-emerald-50 text-emerald-600"
          />
          <MetricCard
            label="Attention Required"
            value={attentionCount}
            trend="2 from last week"
            trendUp={false}
            icon={Bell}
            labelClassName="text-rose-600"
            iconClassName="bg-rose-50 text-rose-600"
          />
        </div>
      </DataState>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/60 shadow-sm">
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
            {sessions.slice(0, 4).map((session) => {
              const status = sessionStatus(session.startsAt);
              return (
                <div
                  key={session.id}
                  className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold">{formatSessionTime(session.startsAt)}</p>
                    <p className="font-medium">{session.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Grade {session.grade} · Section {session.section}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      status === "live"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-sky-200 bg-sky-50 text-sky-700"
                    }
                  >
                    {status === "live" ? "Live" : "Upcoming"}
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
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
            {attentionStudents.map((student) => (
              <div
                key={student.name}
                className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/20 px-4 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-blue-50 text-blue-600">
                      <User className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-black dark:text-foreground">{student.name}</p>
                    <p className="truncate text-xs text-neutral-600 dark:text-muted-foreground">{student.detail}</p>
                  </div>
                </div>
                <Badge variant="outline" className={`shrink-0 ${student.tagClass}`}>
                  {student.tag}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {aiRecommendations.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
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
                <Button size="sm" className="shrink-0">
                  {item.action}
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
