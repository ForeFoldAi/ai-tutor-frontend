import { useMemo, useState } from "react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import {
  Calculator,
  Calendar,
  Check,
  ChevronRight,
  Clock,
  ExternalLink,
  FileText,
  Filter,
  FlaskConical,
  Globe,
  MessageSquare,
  MoreVertical,
  PencilLine,
  Search,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AiTutorButtonIcon } from "@/components/ai-tutor-button-icon";
import { useInitialLoading } from "@/hooks/use-initial-loading";
import { AssignmentsSkeleton } from "@/components/skeletons/student-page-skeletons";

type AssignmentTab = "all" | "pending" | "in_progress" | "graded";
type AssignmentStatus = "pending" | "in_progress" | "graded";

interface Assignment {
  id: number;
  title: string;
  subject: string;
  teacher: string;
  dueDate: string;
  submittedDate?: string;
  duration: number;
  questions: number;
  status: AssignmentStatus;
  progress?: number;
  score?: number;
  grade?: string;
  icon: typeof Calculator;
  iconBg: string;
}

const ASSIGNMENTS: Assignment[] = [
  {
    id: 1,
    title: "Algebra Problem Set – Chapter 5",
    subject: "Mathematics",
    teacher: "Dr. Smith",
    dueDate: "2026-03-15",
    duration: 45,
    questions: 20,
    status: "pending",
    icon: Calculator,
    iconBg: "bg-amber-500",
  },
  {
    id: 2,
    title: "Lab Report – Photosynthesis",
    subject: "Science",
    teacher: "Prof. Johnson",
    dueDate: "2026-03-18",
    duration: 60,
    questions: 5,
    status: "pending",
    icon: FlaskConical,
    iconBg: "bg-subject-science",
  },
  {
    id: 3,
    title: "Essay Writing – Literature Review",
    subject: "English",
    teacher: "Ms. Davis",
    dueDate: "2026-03-20",
    duration: 90,
    questions: 3,
    status: "in_progress",
    progress: 60,
    icon: Globe,
    iconBg: "bg-subject-english",
  },
  {
    id: 4,
    title: "Programming Exercise – Arrays",
    subject: "Computer Science",
    teacher: "Dr. Chen",
    dueDate: "2026-03-10",
    submittedDate: "2026-03-09",
    duration: 45,
    questions: 10,
    status: "graded",
    score: 85,
    grade: "A",
    icon: PencilLine,
    iconBg: "bg-subject-cs",
  },
  {
    id: 5,
    title: "History Test – World War II",
    subject: "History",
    teacher: "Prof. Williams",
    dueDate: "2026-03-05",
    submittedDate: "2026-03-04",
    duration: 60,
    questions: 25,
    status: "graded",
    score: 92,
    grade: "A+",
    icon: FileText,
    iconBg: "bg-subject-social",
  },
];

const DEADLINES = [
  { title: "Algebra Problem Set", subject: "Mathematics", due: "Mar 15, 2026", icon: Calculator, color: "bg-amber-500" },
  { title: "Lab Report", subject: "Science", due: "Mar 18, 2026", icon: FlaskConical, color: "bg-subject-science" },
  { title: "Essay Writing", subject: "English", due: "Mar 20, 2026", icon: Globe, color: "bg-subject-english" },
];

const TIPS = [
  "Start early and plan your time",
  "Read instructions carefully",
  "Ask AI Tutor if you're stuck",
  "Review before submitting",
];

const STATUS_BADGE: Record<AssignmentStatus, string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
  graded: "bg-success/10 text-success",
};

const TAB_COUNTS = {
  all: ASSIGNMENTS.length,
  pending: ASSIGNMENTS.filter((a) => a.status === "pending").length,
  in_progress: ASSIGNMENTS.filter((a) => a.status === "in_progress").length,
  graded: ASSIGNMENTS.filter((a) => a.status === "graded").length,
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function OverviewChart() {
  const pending = TAB_COUNTS.pending;
  const inProgress = TAB_COUNTS.in_progress;
  const graded = TAB_COUNTS.graded;
  const total = TAB_COUNTS.all;
  const circumference = 2 * Math.PI * 36;
  const pendingLen = (pending / total) * circumference;
  const inProgressLen = (inProgress / total) * circumference;
  const gradedLen = (graded / total) * circumference;

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-24 w-24 shrink-0">
        <svg width={96} height={96} className="-rotate-90">
          <circle cx={48} cy={48} r={36} fill="none" stroke="currentColor" strokeWidth={10} className="text-muted/30" />
          <circle
            cx={48}
            cy={48}
            r={36}
            fill="none"
            stroke="#F59E0B"
            strokeWidth={10}
            strokeDasharray={`${pendingLen} ${circumference}`}
            strokeLinecap="round"
          />
          <circle
            cx={48}
            cy={48}
            r={36}
            fill="none"
            stroke="#3B82F6"
            strokeWidth={10}
            strokeDasharray={`${inProgressLen} ${circumference}`}
            strokeDashoffset={-pendingLen}
            strokeLinecap="round"
          />
          <circle
            cx={48}
            cy={48}
            r={36}
            fill="none"
            stroke="#22C55E"
            strokeWidth={10}
            strokeDasharray={`${gradedLen} ${circumference}`}
            strokeDashoffset={-(pendingLen + inProgressLen)}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-foreground">{total}</span>
          <span className="text-[10px] text-muted-foreground">Total</span>
        </div>
      </div>
      <div className="space-y-1.5 text-xs">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          <span className="text-muted-foreground">{pending} Pending</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-blue-500" />
          <span className="text-muted-foreground">{inProgress} In Progress</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-success" />
          <span className="text-muted-foreground">{graded} Graded</span>
        </div>
      </div>
    </div>
  );
}

export default function AssignmentsPage() {
  const loading = useInitialLoading();
  const [activeTab, setActiveTab] = useState<AssignmentTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("due_date");

  const filteredAssignments = useMemo(() => {
    let list = ASSIGNMENTS.filter((a) => {
      const matchesTab = activeTab === "all" || a.status === activeTab;
      const matchesSearch =
        a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.teacher.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesTab && matchesSearch;
    });

    if (sortBy === "due_date") {
      list = [...list].sort(
        (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      );
    }
    return list;
  }, [activeTab, searchQuery, sortBy]);

  const tabs: { id: AssignmentTab; label: string }[] = [
    { id: "all", label: "All Assignments" },
    { id: "pending", label: `Pending (${TAB_COUNTS.pending})` },
    { id: "in_progress", label: `In Progress (${TAB_COUNTS.in_progress})` },
    { id: "graded", label: `Graded (${TAB_COUNTS.graded})` },
  ];

  if (loading) {
    return <AssignmentsSkeleton />;
  }

  return (
    <div className="dashboard-fit flex min-h-0 flex-1 flex-col overflow-hidden p-4 md:p-5">
      {/* Header */}
      <div className="mb-3 flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">Assignments</h1>
          <p className="text-sm text-muted-foreground">
            View, complete and track your assignments
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="relative w-full sm:w-52">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search assignments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-9"
            />
          </div>
          <Button asChild className="h-9 shrink-0 gap-2 bg-gradient-brand px-4">
            <Link href="/ai-tutor?greet=1">
              <AiTutorButtonIcon />
              <span className="hidden sm:inline">Ask AI Tutor</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-3 lg:gap-4">
        {/* Left column */}
        <div className="flex min-h-0 flex-col gap-3 lg:col-span-2">
          {/* Tabs + sort */}
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-1 overflow-x-auto border-b border-border/60 pb-0">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  data-testid={`tab-${tab.id.replace("_", "-")}`}
                  className={cn(
                    "shrink-0 border-b-2 px-3 py-2 text-xs font-medium transition-colors sm:text-sm",
                    activeTab === tab.id
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-8 w-[140px] text-xs">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="due_date">Due Date</SelectItem>
                  <SelectItem value="title">Title</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" className="h-8 w-8 shrink-0">
                <Filter className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Assignment list */}
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-0.5">
            {filteredAssignments.length === 0 ? (
              <Card className="shadow-card">
                <CardContent className="flex flex-col items-center py-10 text-center">
                  <FileText className="mb-3 h-10 w-10 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No assignments found.</p>
                </CardContent>
              </Card>
            ) : (
              filteredAssignments.map((assignment) => (
                <Card
                  key={assignment.id}
                  className="shadow-card"
                  data-testid={`assignment-card-${assignment.id}`}
                >
                  <CardContent className="flex items-start gap-3 p-3 sm:p-4">
                    <div
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white",
                        assignment.iconBg
                      )}
                    >
                      <assignment.icon className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground">{assignment.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {assignment.subject} · {assignment.teacher}
                          </p>
                        </div>
                        <Badge className={cn("shrink-0 border-0 text-[10px]", STATUS_BADGE[assignment.status])}>
                          {assignment.status === "in_progress"
                            ? "In Progress"
                            : assignment.status.charAt(0).toUpperCase() + assignment.status.slice(1)}
                        </Badge>
                      </div>

                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {assignment.status === "graded" && assignment.submittedDate
                            ? `Submitted ${formatDate(assignment.submittedDate)}`
                            : `Due ${formatDate(assignment.dueDate)}`}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {assignment.duration} min
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {assignment.questions} questions
                        </span>
                      </div>

                      {assignment.status === "in_progress" && assignment.progress !== undefined && (
                        <div className="mt-2 flex items-center gap-2">
                          <Progress value={assignment.progress} className="h-1.5 flex-1" />
                          <span className="text-xs font-medium text-foreground">
                            {assignment.progress}%
                          </span>
                        </div>
                      )}

                      {assignment.status === "graded" && assignment.score !== undefined && (
                        <p className="mt-1.5 text-xs font-semibold text-success">
                          {assignment.score}% · Grade {assignment.grade}
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      {assignment.status === "graded" ? (
                        <Button variant="outline" size="sm" className="h-8 text-xs">
                          View Results
                          <ChevronRight className="ml-1 h-3.5 w-3.5" />
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="h-8 bg-gradient-brand text-xs"
                          data-testid={`button-start-${assignment.id}`}
                        >
                          {assignment.status === "in_progress" ? "Continue" : "Start"}
                          <ChevronRight className="ml-1 h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* AI help banner */}
          <Card className="shrink-0 overflow-hidden border-0 bg-gradient-to-r from-primary/10 via-accent/10 to-brand-secondary/10 shadow-card">
            <CardContent className="flex items-center gap-3 p-3">
              <img src="/login-right.png" alt="" aria-hidden className="h-12 w-12 shrink-0 object-contain" />
              <p className="min-w-0 flex-1 text-sm font-semibold text-foreground">
                Need help with an assignment?
              </p>
              <Button asChild size="sm" className="shrink-0 bg-gradient-brand">
                <Link href="/ai-tutor?greet=1" className="inline-flex items-center gap-1.5">
                  <AiTutorButtonIcon className="h-5 w-5" />
                  Ask AI Tutor
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right sidebar */}
        <div className="flex min-h-0 flex-col gap-3 overflow-y-auto lg:overflow-hidden">
          <Card className="shrink-0 shadow-card">
            <CardContent className="p-3 sm:p-4">
              <h2 className="mb-3 text-sm font-semibold text-foreground">Overview</h2>
              <OverviewChart />
            </CardContent>
          </Card>

          <Card className="shrink-0 shadow-card">
            <CardContent className="p-3 sm:p-4">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">Upcoming Deadlines</h2>
                <button type="button" className="text-xs font-medium text-primary hover:underline">
                  View All
                </button>
              </div>
              <ul className="space-y-2">
                {DEADLINES.map((item) => (
                  <li
                    key={item.title}
                    className="flex items-center gap-2.5 rounded-lg border border-border/60 px-2.5 py-2"
                  >
                    <div
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white",
                        item.color
                      )}
                    >
                      <item.icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-foreground">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.subject}</p>
                    </div>
                    <span className="shrink-0 text-xs font-medium text-destructive">{item.due}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="shrink-0 shadow-card">
            <CardContent className="p-3 sm:p-4">
              <h2 className="mb-2 text-sm font-semibold text-foreground">Tips for Success</h2>
              <div className="flex gap-3">
                <ul className="min-w-0 flex-1 space-y-1.5">
                  {TIPS.map((tip) => (
                    <li key={tip} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
                      {tip}
                    </li>
                  ))}
                </ul>
                <img
                  src="/login-right.png"
                  alt=""
                  aria-hidden
                  className="hidden h-16 w-16 shrink-0 object-contain sm:block"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="shrink-0 shadow-card">
            <CardContent className="p-3 sm:p-4">
              <h2 className="mb-2 text-sm font-semibold text-foreground">Quick Actions</h2>
              <ul className="space-y-1">
                {[
                  { label: "Upload Assignment", icon: Upload },
                  { label: "Assignment Help", icon: MessageSquare, href: "/ai-tutor?greet=1" },
                ].map((action) => (
                  <li key={action.label}>
                    {action.href ? (
                      <Link
                        href={action.href}
                        className="flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-muted/50"
                      >
                        <action.icon className="h-4 w-4 text-primary" />
                        <span className="flex-1 text-foreground">{action.label}</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </Link>
                    ) : (
                      <button
                        type="button"
                        className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-muted/50"
                      >
                        <action.icon className="h-4 w-4 text-primary" />
                        <span className="flex-1 text-left text-foreground">{action.label}</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
