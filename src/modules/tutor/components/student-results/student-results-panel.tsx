import { useEffect, useMemo, useState, Fragment } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getAssignmentResults,
  listTutorAssignments,
  type StudentResultRow,
  type TutorAssignmentItem,
} from "@/api/assignments";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataState } from "@/modules/shared/components/data-state";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  ChevronDown,
  Clock3,
  FileQuestion,
  FileText,
  Home,
  Search,
  Users,
  XCircle,
} from "lucide-react";

type StatusFilter = "all" | "attention" | "done" | "overdue";

const PANEL_BORDER = "border border-slate-300 dark:border-slate-600";
const CONTROL_BORDER =
  "border border-slate-300 bg-background dark:border-slate-600 focus-visible:ring-slate-400/40";

function formatWhen(iso: string, withTime = true): string {
  try {
    const d = new Date(iso);
    if (withTime) {
      return d.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    }
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return iso;
  }
}

function artifactMeta(type: string) {
  const t = type.toLowerCase();
  if (t === "quiz") {
    return {
      label: "Quiz",
      icon: FileQuestion,
      chip: "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
      bar: "bg-violet-500",
    };
  }
  if (t === "homework") {
    return {
      label: "Homework",
      icon: Home,
      chip: "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
      bar: "bg-amber-500",
    };
  }
  return {
    label: "Worksheet",
    icon: FileText,
    chip: "bg-sky-50 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300",
    bar: "bg-sky-500",
  };
}

function statusMeta(status: string) {
  const map: Record<string, { label: string; className: string }> = {
    pending: {
      label: "Not started",
      className: "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200",
    },
    in_progress: {
      label: "In progress",
      className: "bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-200",
    },
    submitted: {
      label: "Submitted",
      className: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
    },
    graded: {
      label: "Graded",
      className: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200",
    },
    overdue: {
      label: "Overdue",
      className: "bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200",
    },
  };
  return (
    map[status] ?? {
      label: status.replace(/_/g, " "),
      className: "bg-muted text-foreground",
    }
  );
}

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

function scoreTone(score: number | null, max: number | null): string {
  if (score == null || max == null || max <= 0) return "text-muted-foreground";
  const pct = (score / max) * 100;
  if (pct >= 80) return "text-emerald-700 dark:text-emerald-400";
  if (pct >= 50) return "text-amber-700 dark:text-amber-400";
  return "text-rose-700 dark:text-rose-400";
}

function completionPct(counts: TutorAssignmentItem["counts"]): number {
  if (!counts.total) return 0;
  return Math.round(((counts.graded + counts.submitted) / counts.total) * 100);
}

function matchesStatusFilter(status: string, filter: StatusFilter): boolean {
  if (filter === "all") return true;
  if (filter === "overdue") return status === "overdue";
  if (filter === "done") return status === "graded" || status === "submitted";
  return status === "pending" || status === "in_progress" || status === "overdue";
}

function PulseStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className={cn("rounded-xl border border-slate-300 px-3 py-2.5 dark:border-slate-600", tone)}>
      <p className="text-[11px] font-medium uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-0.5 text-xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

function StudentResultDetail({ row }: { row: StudentResultRow }) {
  const items = row.result_items ?? [];
  if (!items.length) {
    return (
      <p className="px-5 py-4 text-sm text-muted-foreground">
        {row.status === "graded" || row.status === "submitted"
          ? "No question breakdown available for this submission."
          : "This student has not submitted yet."}
      </p>
    );
  }

  return (
    <div className="space-y-2 px-4 py-4 sm:px-5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Answer review · {items.length} question{items.length === 1 ? "" : "s"}
        {row.auto_scored ? " · Auto-scored" : ""}
      </p>
      <ul className="space-y-2">
        {items.map((item, idx) => {
          const tone =
            item.is_correct == null
              ? "border-slate-300 bg-background dark:border-slate-600"
              : item.is_correct
                ? "border-slate-300 bg-emerald-50/50 dark:border-slate-600 dark:bg-emerald-950/20"
                : "border-slate-300 bg-rose-50/50 dark:border-slate-600 dark:bg-rose-950/20";
          return (
            <li key={item.id} className={cn("rounded-xl border p-3.5 transition-colors", tone)}>
              <div className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-background/80 text-xs font-semibold tabular-nums text-muted-foreground shadow-sm">
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium leading-snug text-foreground">
                      {item.question || "Question"}
                    </p>
                    {item.is_correct == null ? null : item.is_correct ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    ) : (
                      <XCircle className="h-4 w-4 shrink-0 text-rose-600" />
                    )}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="rounded-lg bg-background/70 px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Student
                      </p>
                      <p className="mt-0.5 text-sm text-foreground">
                        {item.student_answer?.trim() || "—"}
                      </p>
                    </div>
                    {item.correct_answer ? (
                      <div className="rounded-lg bg-background/70 px-3 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                          Correct
                        </p>
                        <p className="mt-0.5 text-sm font-medium text-emerald-800 dark:text-emerald-300">
                          {item.correct_answer}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function StudentResultsPanel() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [assignmentSearch, setAssignmentSearch] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const listQuery = useQuery({
    queryKey: ["tutor", "assignments"],
    queryFn: listTutorAssignments,
  });

  const items = listQuery.data?.items ?? [];
  const quizItems = useMemo(
    () => items.filter((a) => a.artifact_type.toLowerCase() === "quiz"),
    [items],
  );
  const filteredAssignments = useMemo(() => {
    const q = assignmentSearch.trim().toLowerCase();
    if (!q) return quizItems;
    return quizItems.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.subject.toLowerCase().includes(q) ||
        a.artifact_type.toLowerCase().includes(q) ||
        a.chapter_name.toLowerCase().includes(q) ||
        `${a.grade}${a.section}`.toLowerCase().includes(q),
    );
  }, [quizItems, assignmentSearch]);

  const selected = useMemo(
    () => quizItems.find((a) => a.id === selectedId) ?? filteredAssignments[0] ?? quizItems[0] ?? null,
    [quizItems, filteredAssignments, selectedId],
  );
  const activeId = selected?.id ?? null;

  useEffect(() => {
    setExpandedId(null);
    setStudentSearch("");
    setStatusFilter("all");
  }, [activeId]);

  const resultsQuery = useQuery({
    queryKey: ["tutor", "assignments", activeId, "results"],
    queryFn: () => getAssignmentResults(activeId!),
    enabled: activeId != null,
  });

  const students = resultsQuery.data?.students ?? [];
  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    return students.filter((row) => {
      if (!matchesStatusFilter(row.status, statusFilter)) return false;
      if (!q) return true;
      return row.student_name.toLowerCase().includes(q);
    });
  }, [students, studentSearch, statusFilter]);

  const selectedMeta = selected ? artifactMeta(selected.artifact_type) : null;
  const SelectedIcon = selectedMeta?.icon;
  const donePct = selected ? completionPct(selected.counts) : 0;

  return (
    <div className="flex flex-col lg:min-h-0 lg:flex-1 lg:overflow-hidden">
      <DataState
        loading={listQuery.isLoading}
        error={listQuery.error ? String(listQuery.error) : null}
        empty={!listQuery.isLoading && quizItems.length === 0}
        emptyText="No quizzes yet. Save a lesson and assign a Quiz."
        onRetry={() => void listQuery.refetch()}
      >
        <div className="grid gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[clamp(15rem,22vw,20rem)_minmax(0,1fr)] lg:overflow-hidden">
          <aside className={cn("flex max-h-80 flex-col overflow-hidden rounded-2xl bg-card shadow-sm lg:max-h-none lg:min-h-0", PANEL_BORDER)}>
            <div className="shrink-0 border-b border-slate-300 p-3 dark:border-slate-600">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={assignmentSearch}
                  onChange={(e) => setAssignmentSearch(e.target.value)}
                  placeholder="Search assignments"
                  className={cn("h-9 rounded-xl bg-background pl-9 text-sm", CONTROL_BORDER)}
                />
              </div>
            </div>
            <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
              {filteredAssignments.length === 0 ? (
                <li className="px-3 py-8 text-center text-sm text-muted-foreground">No matches.</li>
              ) : (
                filteredAssignments.map((item) => {
                  const meta = artifactMeta(item.artifact_type);
                  const Icon = meta.icon;
                  const active = activeId === item.id;
                  const pct = completionPct(item.counts);
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(item.id)}
                        className={cn(
                          "group w-full rounded-xl px-3 py-3 text-left transition-all",
                          active ? "bg-primary/8 ring-1 ring-primary/25" : "hover:bg-muted/50",
                        )}
                      >
                        <div className="flex items-start gap-2.5">
                          <span
                            className={cn(
                              "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                              meta.chip,
                            )}
                          >
                            <Icon className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
                              {item.title}
                            </p>
                            <p className="mt-1 text-[11px] text-muted-foreground">
                              {meta.label} · {item.subject || "Subject"} · Grade{" "}
                              {item.grade.replace(/^CLASS_/, "")}
                              {item.section ? `-${item.section}` : ""}
                            </p>
                            <div className="mt-2 flex items-center gap-2">
                              <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                                <div
                                  className={cn("h-full rounded-full transition-all", meta.bar)}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="shrink-0 text-[10px] font-semibold tabular-nums text-muted-foreground">
                                {pct}%
                              </span>
                            </div>
                            <p className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                              <Clock3 className="h-3 w-3" />
                              Due {formatWhen(item.deadline)}
                              {item.counts.overdue > 0 ? (
                                <span className="ml-1 font-medium text-rose-600">
                                  · {item.counts.overdue} overdue
                                </span>
                              ) : null}
                            </p>
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </aside>

          <section className="flex min-h-0 flex-col gap-3 overflow-hidden">
            {selected && selectedMeta ? (
              <>
                <div className={cn("shrink-0 overflow-hidden rounded-2xl bg-card shadow-sm", PANEL_BORDER)}>
                  <div className="relative overflow-hidden px-4 pb-4 pt-4 sm:px-5">
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-x-0 top-0 h-24 opacity-90"
                      style={{
                        background:
                          "linear-gradient(135deg, hsl(251 91% 63% / 0.08), hsl(217 91% 60% / 0.05), transparent 70%)",
                      }}
                    />
                    <div className="relative min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          className={cn(
                            "gap-1 border border-slate-300 font-medium dark:border-slate-600",
                            selectedMeta.chip,
                          )}
                        >
                          {SelectedIcon ? <SelectedIcon className="h-3.5 w-3.5" /> : null}
                          {selectedMeta.label}
                        </Badge>
                        {selected.chapter_name ? (
                          <span className="text-xs text-muted-foreground">{selected.chapter_name}</span>
                        ) : null}
                      </div>
                      <h2 className="text-lg font-bold leading-snug text-blue-900 dark:text-blue-100 sm:text-xl">
                        {selected.title}
                      </h2>
                      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          Grade {selected.grade.replace(/^CLASS_/, "")}
                          {selected.section ? ` · ${selected.section}` : ""}
                        </span>
                        {selected.subject ? <span>{selected.subject}</span> : null}
                        {selected.curriculum ? <span>{selected.curriculum}</span> : null}
                      </p>
                    </div>

                    <div className="relative mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
                      <PulseStat
                        label="Done"
                        value={selected.counts.graded + selected.counts.submitted}
                        tone="border-slate-300 bg-emerald-50/60 dark:border-slate-600 dark:bg-emerald-950/20"
                      />
                      <PulseStat
                        label="In progress"
                        value={selected.counts.in_progress}
                        tone="border-slate-300 bg-blue-50/60 dark:border-slate-600 dark:bg-blue-950/20"
                      />
                      <PulseStat
                        label="Not started"
                        value={selected.counts.pending}
                        tone="border-slate-300 bg-amber-50/60 dark:border-slate-600 dark:bg-amber-950/20"
                      />
                      <PulseStat
                        label="Overdue"
                        value={selected.counts.overdue}
                        tone="border-slate-300 bg-rose-50/60 dark:border-slate-600 dark:bg-rose-950/20"
                      />
                      <div className="col-span-2 rounded-xl border border-slate-300 bg-background px-3 py-2.5 dark:border-slate-600 sm:col-span-1">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                          Completion
                        </p>
                        <p className="mt-0.5 text-xl font-bold tabular-nums text-foreground">{donePct}%</p>
                        <Progress value={donePct} className="mt-2 h-1.5" />
                      </div>
                    </div>
                  </div>
                </div>

                <DataState
                  loading={resultsQuery.isLoading}
                  error={resultsQuery.error ? String(resultsQuery.error) : null}
                  empty={!resultsQuery.isLoading && students.length === 0}
                  emptyText="No students on this assignment."
                  onRetry={() => void resultsQuery.refetch()}
                >
                  <div
                    className={cn(
                      "flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl bg-card shadow-sm",
                      PANEL_BORDER,
                    )}
                  >
                    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-slate-300 px-3 py-2.5 dark:border-slate-600 sm:px-4">
                      <div className="relative min-w-[160px] flex-1 sm:max-w-xs">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={studentSearch}
                          onChange={(e) => setStudentSearch(e.target.value)}
                          placeholder="Find a student"
                          className={cn("h-9 rounded-xl bg-background pl-9 text-sm", CONTROL_BORDER)}
                        />
                      </div>
                      <Select
                        value={statusFilter}
                        onValueChange={(v) => setStatusFilter(v as StatusFilter)}
                      >
                        <SelectTrigger className={cn("h-9 w-[150px] rounded-xl", CONTROL_BORDER)}>
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All statuses</SelectItem>
                          <SelectItem value="attention">Needs attention</SelectItem>
                          <SelectItem value="done">Submitted / graded</SelectItem>
                          <SelectItem value="overdue">Overdue only</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="ml-auto text-xs text-muted-foreground">
                        {filteredStudents.length} of {students.length}
                      </p>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto">
                      {filteredStudents.length === 0 ? (
                        <p className="px-5 py-12 text-center text-sm text-muted-foreground">
                          No students match this filter.
                        </p>
                      ) : (
                        <ul className="divide-y divide-border/50">
                          {filteredStudents.map((row) => {
                            const open = expandedId === row.submission_id;
                            const canExpand =
                              row.status === "graded" ||
                              row.status === "submitted" ||
                              (row.result_items?.length ?? 0) > 0;
                            const st = statusMeta(row.status);
                            const pct =
                              row.score != null && row.max_score != null && row.max_score > 0
                                ? Math.round((row.score / row.max_score) * 100)
                                : null;

                            return (
                              <Fragment key={row.submission_id}>
                                <li>
                                  <button
                                    type="button"
                                    disabled={!canExpand}
                                    onClick={() => {
                                      if (!canExpand) return;
                                      setExpandedId(open ? null : row.submission_id);
                                    }}
                                    className={cn(
                                      "flex w-full items-center gap-3 px-3 py-3.5 text-left transition-colors sm:px-4",
                                      canExpand && "hover:bg-muted/40",
                                      open && "bg-muted/30",
                                      !canExpand && "cursor-default",
                                    )}
                                  >
                                    <span
                                      className={cn(
                                        "flex h-5 w-5 shrink-0 items-center justify-center text-muted-foreground transition-transform",
                                        open && "rotate-0",
                                      )}
                                    >
                                      {canExpand ? (
                                        <ChevronDown
                                          className={cn(
                                            "h-4 w-4 transition-transform duration-200",
                                            open ? "rotate-0" : "-rotate-90",
                                          )}
                                        />
                                      ) : (
                                        <span className="h-1.5 w-1.5 rounded-full bg-border" />
                                      )}
                                    </span>

                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#4f6ef7]/15 to-[#8b4cf7]/20 text-xs font-bold text-blue-900 dark:text-blue-100">
                                      {initials(row.student_name)}
                                    </span>

                                    <div className="min-w-0 flex-1">
                                      <p className="truncate text-sm font-semibold text-foreground">
                                        {row.student_name}
                                      </p>
                                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                                        {row.submitted_at
                                          ? `Submitted ${formatWhen(row.submitted_at)}`
                                          : row.started_at
                                            ? `Started ${formatWhen(row.started_at)}`
                                            : "Waiting to start"}
                                      </p>
                                    </div>

                                    <Badge className={cn("shrink-0 border-0 capitalize", st.className)}>
                                      {st.label}
                                    </Badge>

                                    <div className="hidden w-[88px] shrink-0 text-right sm:block">
                                      {pct != null ? (
                                        <div>
                                          <p
                                            className={cn(
                                              "text-sm font-bold tabular-nums",
                                              scoreTone(row.score, row.max_score),
                                            )}
                                          >
                                            {row.score}/{row.max_score}
                                          </p>
                                          <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted">
                                            <div
                                              className={cn(
                                                "h-full rounded-full",
                                                pct >= 80
                                                  ? "bg-emerald-500"
                                                  : pct >= 50
                                                    ? "bg-amber-500"
                                                    : "bg-rose-500",
                                              )}
                                              style={{ width: `${pct}%` }}
                                            />
                                          </div>
                                        </div>
                                      ) : (
                                        <span className="text-sm text-muted-foreground">—</span>
                                      )}
                                    </div>
                                  </button>
                                </li>
                                {open ? (
                                  <li className="border-t border-border/40 bg-muted/15">
                                    <StudentResultDetail row={row} />
                                  </li>
                                ) : null}
                              </Fragment>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  </div>
                </DataState>
              </>
            ) : null}
          </section>
        </div>
      </DataState>
    </div>
  );
}
