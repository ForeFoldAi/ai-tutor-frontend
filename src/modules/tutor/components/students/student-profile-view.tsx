import { useState } from "react";
import { Link } from "wouter";
import {
  BookOpen,
  ChevronRight,
  ClipboardList,
  Clock3,
  MoreVertical,
  Sparkles,
  Star,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { ActivityItem, AssignmentItem, TutorStudentProfile } from "@/modules/tutor/types/student-profile";
import { LiaInsightsPanel } from "@/modules/tutor/components/students/lia-insights-panel";
import { CardViewMoreButton, ViewMoreDialog } from "@/modules/tutor/components/view-more-dialog";
import {
  assignmentStatusClass,
  completionBarClass,
  riskBadgeClass,
} from "@/modules/tutor/utils/student-helpers";

interface StudentProfileViewProps {
  student: TutorStudentProfile;
}

const CARD_CLASS =
  "flex h-full flex-col overflow-hidden rounded-2xl border border-slate-300 bg-card shadow-sm dark:border-slate-600";

const CARD_HEADER =
  "min-h-[4.5rem] shrink-0 space-y-1 border-b border-slate-200 pb-3 dark:border-slate-700";

const STAT_TILE =
  "flex h-full min-h-[8.5rem] flex-col justify-center rounded-xl border border-slate-200 bg-muted/20 px-4 py-3 dark:border-slate-700";

const AI_ACTIVITY_PREVIEW = 3;
const ASSIGNMENTS_PREVIEW = 4;

function AssignmentRow({
  assignment,
  wide = false,
}: {
  assignment: AssignmentItem;
  wide?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 gap-3 overflow-hidden rounded-xl border border-slate-200 bg-muted/20 px-4 py-3 dark:border-slate-700",
        wide
          ? "flex-col sm:flex-row sm:items-start sm:justify-between"
          : "flex-col sm:flex-row sm:items-center sm:justify-between",
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="shrink-0 rounded-lg bg-violet-50 p-2 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300">
          <ClipboardList className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className={cn("font-medium", wide ? "break-words leading-snug" : "truncate")}>
            {assignment.title}
          </p>
          <p className="text-xs text-muted-foreground">Due {assignment.due}</p>
        </div>
      </div>
      <Badge
        variant="outline"
        className={cn("shrink-0 self-start capitalize sm:self-center", assignmentStatusClass(assignment.status))}
      >
        {assignment.status}
      </Badge>
    </div>
  );
}

function AiActivityRow({ item }: { item: ActivityItem }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-muted/20 px-3 py-3 dark:border-slate-700">
      <div className="rounded-lg bg-blue-50 p-2 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
        <BookOpen className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium leading-snug">{item.title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{item.when}</p>
      </div>
    </div>
  );
}

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

function CircularProgress({
  value,
  size = 96,
}: {
  value: number;
  size?: number;
}) {
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const ringClass =
    value >= 70 ? "text-emerald-500" : value >= 45 ? "text-amber-500" : "text-rose-500";

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
          className="text-muted/30"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={cn("transition-all duration-500", ringClass)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold tabular-nums text-blue-900 dark:text-blue-100">
          {value}%
        </span>
      </div>
    </div>
  );
}

function SectionLink({ label }: { label: string }) {
  return <span className="cursor-default text-sm font-medium text-primary">{label}</span>;
}

function SkillRow({
  name,
  score,
  tone,
}: {
  name: string;
  score: number;
  tone: "strength" | "improvement";
}) {
  return (
    <div className="space-y-1.5 rounded-xl border border-slate-200/80 bg-muted/20 px-3 py-2.5 dark:border-slate-700">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="min-w-0 truncate font-medium">{name}</span>
        <span
          className={cn(
            "shrink-0 font-semibold tabular-nums",
            tone === "strength" ? "text-emerald-600" : "text-rose-600",
          )}
        >
          {score}%
        </span>
      </div>
      {tone === "strength" ? (
        <Progress value={score} className="h-1.5 [&>div]:bg-emerald-500" />
      ) : (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full transition-all", completionBarClass(score))}
            style={{ width: `${score}%` }}
          />
        </div>
      )}
    </div>
  );
}

export function StudentProfileView({ student }: StudentProfileViewProps) {
  const [aiActivityOpen, setAiActivityOpen] = useState(false);
  const [assignmentsOpen, setAssignmentsOpen] = useState(false);
  const trendUp = student.quizTrend >= 0;
  const aiActivityPreview = student.aiActivity.slice(0, AI_ACTIVITY_PREVIEW);
  const assignmentsPreview = student.assignments.slice(0, ASSIGNMENTS_PREVIEW);
  const assignmentsSpan =
    student.assignments.length >= 3 ? "lg:col-span-2" : "lg:col-span-1";
  const notesSpan = student.assignments.length >= 3 ? "lg:col-span-1" : "lg:col-span-2";

  return (
    <div className="dashboard-fit flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4 md:p-5">
      <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <nav className="flex items-center gap-1 text-sm">
          <Link href="/tutor/students" className="font-medium text-primary hover:underline">
            Students
          </Link>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-foreground">{student.fullName}</span>
        </nav>
        <Button variant="outline" size="icon" className="h-9 w-9 shrink-0">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </div>

      <Card className={cn(CARD_CLASS, "h-auto shrink-0")}>
        <div
          aria-hidden
          className="h-1.5 w-full bg-gradient-to-r from-[#4f6ef7] via-[#8b4cf7] to-[#4f6ef7]/40"
        />
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-stretch xl:justify-between">
            <div className="flex min-w-0 flex-1 items-start gap-4">
              <Avatar className="h-16 w-16 border-2 border-background shadow-sm sm:h-[4.5rem] sm:w-[4.5rem]">
                <AvatarFallback className="bg-gradient-to-br from-[#4f6ef7]/15 to-[#8b4cf7]/25 text-lg font-bold text-blue-900 dark:text-blue-100">
                  {initials(student.fullName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight text-blue-900 dark:text-blue-100">
                    {student.fullName}
                  </h1>
                  {!student.isActive ? (
                    <Badge variant="outline" className="border-slate-300 text-muted-foreground">
                      Inactive
                    </Badge>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-muted/40 px-2.5 py-1 text-xs font-medium text-foreground dark:border-slate-700">
                    {student.gradeLabel || `Grade ${student.grade} · ${student.section}`}
                  </span>
                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-muted/40 px-2.5 py-1 font-mono text-xs text-muted-foreground dark:border-slate-700">
                    {student.userId}
                  </span>
                  {student.subjects.map((subject) => (
                    <Badge
                      key={subject}
                      variant="secondary"
                      className="rounded-full bg-blue-50 font-normal text-blue-800 dark:bg-blue-950/40 dark:text-blue-200"
                    >
                      {subject}
                    </Badge>
                  ))}
                </div>
                <Badge variant="outline" className={cn("w-fit", riskBadgeClass(student.riskLevel))}>
                  {student.riskLevel === "Not Started" ? "Not Started" : `${student.riskLevel} risk`}
                </Badge>
              </div>
            </div>

            <div className="grid w-full shrink-0 grid-cols-1 gap-3 sm:grid-cols-3 sm:items-stretch xl:w-auto xl:min-w-[28rem]">
              <div className={cn(STAT_TILE, "items-center text-center")}>
                <CircularProgress value={student.overallProgress} size={88} />
                <p className="mt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Overall progress
                </p>
              </div>
              <div className={STAT_TILE}>
                <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <Clock3 className="h-3.5 w-3.5" />
                  Last active
                </p>
                <p className="mt-2 text-sm font-semibold leading-snug text-foreground">
                  {student.lastActive}
                </p>
              </div>
              <div className={STAT_TILE}>
                <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <Target className="h-3.5 w-3.5" />
                  Current topic
                </p>
                <p className="mt-2 line-clamp-3 text-sm font-semibold leading-snug text-blue-900 dark:text-blue-100">
                  {student.currentTopic}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid auto-rows-fr gap-4 lg:grid-cols-3 lg:items-stretch">
        <Card className={CARD_CLASS}>
          <CardHeader className={CARD_HEADER}>
            <CardTitle className="flex items-center gap-2 text-base text-blue-900 dark:text-blue-100">
              <Star className="h-4 w-4 text-emerald-600" />
              Strengths & gaps
            </CardTitle>
            <CardDescription>Skills from learning intelligence</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col space-y-4 pt-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                Strengths
              </p>
              {student.strengths.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-300 px-3 py-4 text-center text-sm text-muted-foreground dark:border-slate-600">
                  No strength data yet.
                </p>
              ) : (
                student.strengths.map((item) => (
                  <SkillRow key={item.name} name={item.name} score={item.score} tone="strength" />
                ))
              )}
            </div>
            <div className="space-y-2 border-t border-slate-200 pt-4 dark:border-slate-700">
              <p className="text-xs font-semibold uppercase tracking-wide text-rose-700 dark:text-rose-400">
                Needs improvement
              </p>
              {student.needsImprovement.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-300 px-3 py-4 text-center text-sm text-muted-foreground dark:border-slate-600">
                  No improvement data yet.
                </p>
              ) : (
                student.needsImprovement.map((item) => (
                  <SkillRow
                    key={item.name}
                    name={item.name}
                    score={item.score}
                    tone="improvement"
                  />
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className={CARD_CLASS}>
          <CardHeader className={cn(CARD_HEADER, "flex flex-row items-start justify-between space-y-0")}>
            <div className="min-w-0 space-y-1 pr-2">
              <CardTitle className="flex items-center gap-2 text-base text-blue-900 dark:text-blue-100">
                <Sparkles className="h-4 w-4 text-primary" />
                Recent AI Tutor Activity
              </CardTitle>
              <CardDescription>Completed study sessions (start – end)</CardDescription>
            </div>
            {student.aiActivity.length > 0 ? (
              <CardViewMoreButton onClick={() => setAiActivityOpen(true)} />
            ) : null}
          </CardHeader>
          <CardContent className="flex flex-1 flex-col space-y-2.5 pt-4">
            {student.aiActivity.length === 0 ? (
              <p className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-slate-300 px-3 py-8 text-center text-sm text-muted-foreground dark:border-slate-600">
                No recent AI tutor activity.
              </p>
            ) : (
              aiActivityPreview.map((item, idx) => (
                <AiActivityRow key={`${item.title}-${item.when}-${idx}`} item={item} />
              ))
            )}
          </CardContent>
        </Card>

        <ViewMoreDialog
          open={aiActivityOpen}
          onOpenChange={setAiActivityOpen}
          title="All AI Tutor Activity"
          description="Completed study sessions with start and end times"
        >
          {student.aiActivity.map((item, idx) => (
            <AiActivityRow key={`${item.title}-${item.when}-${idx}`} item={item} />
          ))}
        </ViewMoreDialog>

        <Card className={CARD_CLASS}>
          <CardHeader className={cn(CARD_HEADER, "flex flex-row items-start justify-between space-y-0")}>
            <div className="min-w-0 space-y-1 pr-2">
              <CardTitle className="flex items-center gap-2 text-base text-blue-900 dark:text-blue-100">
                <ClipboardList className="h-4 w-4 text-primary" />
                Quiz Performance
              </CardTitle>
              <CardDescription>Average and recent scores</CardDescription>
            </div>
            <SectionLink label="View all" />
          </CardHeader>
          <CardContent className="flex flex-1 flex-col space-y-4 pt-4">
            <div className="rounded-xl border border-slate-200 bg-muted/20 px-4 py-3 dark:border-slate-700">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Average score
              </p>
              <p className="mt-1 text-3xl font-bold tabular-nums text-blue-900 dark:text-blue-100">
                {student.averageQuizScore}%
              </p>
              <p
                className={cn(
                  "mt-1 flex items-center gap-1 text-xs font-medium",
                  trendUp ? "text-emerald-600" : "text-rose-600",
                )}
              >
                {trendUp ? (
                  <TrendingUp className="h-3.5 w-3.5" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5" />
                )}
                {Math.abs(student.quizTrend)}% from last week
              </p>
            </div>
            <div className="flex flex-1 flex-col space-y-2">
              {student.recentQuizzes.length === 0 ? (
                <p className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-slate-300 px-3 py-4 text-center text-sm text-muted-foreground dark:border-slate-600">
                  No quizzes yet.
                </p>
              ) : (
                student.recentQuizzes.map((quiz) => (
                  <div
                    key={quiz.name}
                    className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5 text-sm dark:border-slate-700"
                  >
                    <span className="min-w-0 truncate font-medium">{quiz.name}</span>
                    <span className="shrink-0 font-bold tabular-nums text-blue-700 dark:text-blue-300">
                      {quiz.score}%
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className={cn(CARD_CLASS, assignmentsSpan)}>
          <CardHeader className={cn(CARD_HEADER, "flex flex-row items-start justify-between space-y-0")}>
            <div className="min-w-0 space-y-1 pr-2">
              <CardTitle className="text-base text-blue-900 dark:text-blue-100">
                Assignments
              </CardTitle>
              <CardDescription>Worksheet, quiz, and homework status</CardDescription>
            </div>
            {student.assignments.length > ASSIGNMENTS_PREVIEW ? (
              <CardViewMoreButton onClick={() => setAssignmentsOpen(true)} />
            ) : null}
          </CardHeader>
          <CardContent className="flex flex-1 flex-col space-y-2.5 pt-4">
            {student.assignments.length === 0 ? (
              <p className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-slate-300 px-3 py-5 text-center text-sm text-muted-foreground dark:border-slate-600">
                No assignments yet.
              </p>
            ) : (
              assignmentsPreview.map((assignment, idx) => (
                <AssignmentRow
                  key={`${assignment.title}-${assignment.due}-${idx}`}
                  assignment={assignment}
                />
              ))
            )}
          </CardContent>
        </Card>

        <ViewMoreDialog
          open={assignmentsOpen}
          onOpenChange={setAssignmentsOpen}
          title="All Assignments"
          description="Worksheet, quiz, and homework assigned to this student"
          contentClassName="h-auto w-[calc(100%-1.5rem)] max-w-2xl overflow-x-hidden p-6 sm:max-w-2xl sm:p-8"
        >
          {student.assignments.map((assignment, idx) => (
            <AssignmentRow
              key={`${assignment.title}-${assignment.due}-${idx}`}
              assignment={assignment}
              wide
            />
          ))}
        </ViewMoreDialog>

        <Card className={cn(CARD_CLASS, notesSpan)}>
          <CardHeader className={cn(CARD_HEADER, "flex flex-row items-start justify-between space-y-0")}>
            <div className="min-w-0 space-y-1 pr-2">
              <CardTitle className="text-base text-blue-900 dark:text-blue-100">
                Teacher Notes
              </CardTitle>
              <CardDescription>Private observations</CardDescription>
            </div>
            <SectionLink label="Edit" />
          </CardHeader>
          <CardContent className="flex flex-1 flex-col pt-4">
            <div className="flex flex-1 rounded-xl border border-slate-200 bg-muted/20 px-4 py-3 dark:border-slate-700">
              <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {student.teacherNotes || "No teacher notes yet."}
              </p>
            </div>
            {student.notesUpdated ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Last updated {student.notesUpdated}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <LiaInsightsPanel studentId={student.id} className={CARD_CLASS} />
      </div>
    </div>
  );
}
