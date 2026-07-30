import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { listStudentAssignments, type StudentAssignmentListItem } from "@/api/assignments";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { DataState } from "@/modules/shared/components/data-state";
import { PageShell } from "@/components/page-shell";
import { cn } from "@/lib/utils";
import {
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Lightbulb,
  Search,
} from "lucide-react";
import { AskAiTutorButton } from "@/components/ask-ai-tutor-button";
import { brandImages } from "@/lib/brand-images";

type AssignmentTab = "all" | "pending" | "in_progress" | "graded";

const TABS: { id: AssignmentTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "in_progress", label: "In Progress" },
  { id: "graded", label: "Graded" },
];

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-50 text-amber-800",
  in_progress: "bg-blue-50 text-blue-800",
  submitted: "bg-slate-100 text-slate-800",
  graded: "bg-emerald-50 text-emerald-800",
  overdue: "bg-rose-50 text-rose-800",
};

/** Match overview mock: orange / blue / lavender-purple for graded. */
const OVERVIEW_COLORS = {
  pending: "#F5A623",
  in_progress: "#4A90E2",
  graded: "#9B8CFF",
} as const;

const TIPS_FOR_SUCCESS = [
  "Start pending quizzes early so you have time to review tricky questions.",
  "Read each question carefully and check your answers before submitting.",
  "Use AI Tutor to practice weak topics before you open a graded quiz.",
] as const;

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function matchesTab(item: StudentAssignmentListItem, tab: AssignmentTab): boolean {
  if (tab === "all") return true;
  if (tab === "pending") return item.status === "pending" || item.status === "overdue";
  if (tab === "in_progress") return item.status === "in_progress";
  if (tab === "graded") return item.status === "graded" || item.status === "submitted";
  return true;
}

function statusLabel(status: string): string {
  if (status === "in_progress") return "In Progress";
  return status.charAt(0).toUpperCase() + status.slice(1).replace("_", " ");
}

function isPendingStatus(status: string) {
  return status === "pending" || status === "overdue";
}

function isGradedStatus(status: string) {
  return status === "graded" || status === "submitted";
}

function AssignmentOverviewDonut({
  pending,
  inProgress,
  graded,
  total,
}: {
  pending: number;
  inProgress: number;
  graded: number;
  total: number;
}) {
  const size = 128;
  const stroke = 18;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const safeTotal = total > 0 ? total : 1;

  const segments = [
    { key: "pending", value: pending, color: OVERVIEW_COLORS.pending },
    { key: "in_progress", value: inProgress, color: OVERVIEW_COLORS.in_progress },
    { key: "graded", value: graded, color: OVERVIEW_COLORS.graded },
  ];

  let offset = 0;
  const arcs = segments.map((seg) => {
    const length = (seg.value / safeTotal) * circumference;
    const arc = { ...seg, length, dashOffset: -offset };
    offset += length;
    return arc;
  });

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-muted/25"
        />
        {total > 0
          ? arcs.map((arc) =>
              arc.value > 0 ? (
                <circle
                  key={arc.key}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={arc.color}
                  strokeWidth={stroke}
                  strokeDasharray={`${arc.length} ${circumference - arc.length}`}
                  strokeDashoffset={arc.dashOffset}
                  strokeLinecap="butt"
                />
              ) : null
            )
          : null}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold leading-none text-foreground">{total}</span>
        <span className="mt-0.5 text-xs text-muted-foreground">Total</span>
      </div>
    </div>
  );
}

export default function AssignmentsPage() {
  const [tab, setTab] = useState<AssignmentTab>("all");
  const [search, setSearch] = useState("");

  const listQuery = useQuery({
    queryKey: ["student", "assignments"],
    queryFn: listStudentAssignments,
  });

  const items = listQuery.data?.items ?? [];

  const overview = useMemo(() => {
    let pending = 0;
    let inProgress = 0;
    let graded = 0;
    for (const item of items) {
      if (isPendingStatus(item.status)) pending += 1;
      else if (item.status === "in_progress") inProgress += 1;
      else if (isGradedStatus(item.status)) graded += 1;
    }
    return {
      pending,
      inProgress,
      graded,
      total: pending + inProgress + graded,
    };
  }, [items]);

  const topPendingAndInProgress = useMemo(() => {
    return items
      .filter(
        (item) =>
          isPendingStatus(item.status) || item.status === "in_progress"
      )
      .sort((a, b) => {
        const statusRank = (s: string) =>
          s === "in_progress" ? 0 : isPendingStatus(s) ? 1 : 2;
        const byStatus = statusRank(a.status) - statusRank(b.status);
        if (byStatus !== 0) return byStatus;
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      })
      .slice(0, 3);
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (!matchesTab(item, tab)) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.subject.toLowerCase().includes(q) ||
        item.teacher_name.toLowerCase().includes(q) ||
        item.artifact_type.toLowerCase().includes(q)
      );
    });
  }, [items, tab, search]);

  return (
    <PageShell
      className="overflow-x-hidden lg:overflow-hidden"
      contentClassName="min-h-0 flex-1"
    >
      <div className="flex shrink-0 flex-col gap-2">
        <div className="min-w-0 space-y-0.5">
          <h1 className="text-xl font-bold text-blue-900 dark:text-blue-100 sm:text-2xl">
            Assignments
          </h1>
          <p className="text-sm text-muted-foreground">
            Complete worksheets, quizzes, and homework from your teachers.
          </p>
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground sm:left-3 sm:h-4 sm:w-4" />
          <Input
            placeholder="Search assignments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 border border-border/70 bg-background pl-8 text-sm shadow-sm sm:h-9 sm:pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {TABS.map((t) => (
            <Button
              key={t.id}
              size="sm"
              variant={tab === t.id ? "default" : "outline"}
              className="h-8 px-2.5 text-xs sm:px-3 sm:text-sm"
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid min-w-0 gap-3 lg:min-h-0 lg:flex-1 lg:grid-cols-3 lg:gap-4 lg:overflow-hidden">
        <div className="order-1 flex min-w-0 flex-col lg:col-span-2 lg:min-h-0">
          <DataState
            loading={listQuery.isLoading}
            error={listQuery.error ? String(listQuery.error) : null}
            empty={!listQuery.isLoading && filtered.length === 0}
            emptyText="No assignments found."
            onRetry={() => void listQuery.refetch()}
          >
            <div className="space-y-3 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pb-4">
              {filtered.map((assignment) => {
                const done =
                  assignment.status === "graded" || assignment.status === "submitted";
                return (
                  <Card key={assignment.id} className="border-border/70 shadow-sm">
                    <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-foreground">
                              {assignment.title}
                            </p>
                            <Badge
                              className={cn(
                                "border-0 text-[10px] capitalize",
                                STATUS_BADGE[assignment.status]
                              )}
                            >
                              {statusLabel(assignment.status)}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {assignment.subject} · {assignment.teacher_name} ·{" "}
                            {assignment.artifact_type}
                          </p>
                          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              Due {formatDate(assignment.deadline)}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {assignment.question_count} question
                              {assignment.question_count === 1 ? "" : "s"}
                            </span>
                            {done &&
                            assignment.artifact_type === "quiz" &&
                            assignment.score != null &&
                            assignment.max_score != null ? (
                              <span>
                                Score {assignment.score}/{assignment.max_score}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                      <Button asChild size="sm" className="shrink-0">
                        <Link href={`/assignments/${assignment.id}`}>
                          {done
                            ? "View Results"
                            : assignment.status === "in_progress"
                              ? "Continue"
                              : "Start"}
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </DataState>
        </div>

        <aside className="order-2 flex min-w-0 flex-col gap-3 lg:min-h-0 lg:overflow-y-auto lg:pb-4">
          <Card className="shadow-card">
            <CardContent className="p-4">
              <h2 className="mb-4 text-base font-bold text-foreground">Overview</h2>
              <div className="flex items-center gap-4">
                <AssignmentOverviewDonut
                  pending={overview.pending}
                  inProgress={overview.inProgress}
                  graded={overview.graded}
                  total={overview.total}
                />
                <ul className="space-y-2.5 text-sm text-foreground">
                  <li className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: OVERVIEW_COLORS.pending }}
                    />
                    <span>
                      {overview.pending} Pending
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: OVERVIEW_COLORS.in_progress }}
                    />
                    <span>
                      {overview.inProgress} In Progress
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: OVERVIEW_COLORS.graded }}
                    />
                    <span>
                      {overview.graded} Graded
                    </span>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="p-4">
              <h2 className="mb-3 text-sm font-semibold text-foreground sm:text-base">
                Top Pending &amp; In Progress
              </h2>
              {topPendingAndInProgress.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No pending or in-progress assignments.
                </p>
              ) : (
                <ul className="space-y-2">
                  {topPendingAndInProgress.map((item, index) => (
                    <li key={item.id}>
                      <Link href={`/assignments/${item.id}`}>
                        <div className="flex items-start gap-2.5 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5 transition-colors hover:border-primary/30">
                          <span
                            className={cn(
                              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                              item.status === "in_progress"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-amber-100 text-amber-800"
                            )}
                          >
                            {index + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">
                              {item.title}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {statusLabel(item.status)} · {item.subject} · Due{" "}
                              {formatDate(item.deadline)}
                            </p>
                          </div>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="p-4">
              <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-foreground sm:text-base">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                Tips for success
              </h2>
              <ul className="space-y-2.5">
                {TIPS_FOR_SUCCESS.map((tip) => (
                  <li
                    key={tip}
                    className="flex gap-2 rounded-lg border border-border/60 bg-muted/15 px-3 py-2.5 text-xs text-muted-foreground sm:text-sm"
                  >
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="shrink-0 border border-border/70 bg-[#EEF1F8] shadow-sm dark:bg-primary/10">
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4">
              <img
                src={brandImages.chatbot}
                alt=""
                aria-hidden
                className="h-14 w-14 shrink-0 object-contain sm:h-16 sm:w-16"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-blue-900 dark:text-blue-100 sm:text-base">
                  Need help with an assignment?
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
                  Ask AI Tutor for explanations, help with questions, or study tips.
                </p>
              </div>
              <AskAiTutorButton className="h-9 w-full shrink-0 px-4 sm:h-10 sm:w-auto sm:px-5">
                Ask AI Tutor
              </AskAiTutorButton>
            </CardContent>
          </Card>
        </aside>
      </div>
    </PageShell>
  );
}
