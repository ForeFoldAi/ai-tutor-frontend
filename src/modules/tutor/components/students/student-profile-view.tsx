import { Link } from "wouter";
import {
  BookOpen,
  ChevronRight,
  ClipboardList,
  MoreVertical,
  Sparkles,
  Star,
  TrendingUp,
  User,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { TutorStudentProfile } from "@/modules/tutor/types/student-profile";
import {
  assignmentStatusClass,
  completionBarClass,
} from "@/modules/tutor/utils/student-helpers";

interface StudentProfileViewProps {
  student: TutorStudentProfile;
}

function CircularProgress({ value, size = 88 }: { value: number; size?: number }) {
  const stroke = 7;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

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
          className="text-primary"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-foreground">{value}%</span>
      </div>
    </div>
  );
}

export function StudentProfileView({ student }: StudentProfileViewProps) {
  return (
    <div className="dashboard-fit flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4 md:p-5">
      <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1 text-sm">
          <Link href="/tutor/students" className="font-medium text-blue-600 hover:underline">
            Students
          </Link>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-foreground">{student.fullName}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button className="h-9 bg-primary px-4">Schedule Session</Button>
          <Button className="h-9 bg-primary px-4">Create Assignment</Button>
          <Button variant="outline" size="icon" className="h-9 w-9">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card className="shrink-0 border-border/70 shadow-sm">
        <CardContent className="flex flex-col gap-6 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-blue-50 text-lg font-semibold text-blue-600">
                <User className="h-7 w-7" />
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {student.fullName}
              </h1>
              <p className="text-sm text-muted-foreground">
                Grade {student.grade} · Section {student.section}
              </p>
              <p className="text-sm text-muted-foreground">User ID: {student.userId}</p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-1">
            <CircularProgress value={student.overallProgress} />
            <p className="text-xs text-muted-foreground">Overall Progress</p>
          </div>

          <div className="grid min-w-[180px] gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Current Topic</p>
              <p className="font-semibold text-blue-900 dark:text-blue-100">{student.currentTopic}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Last Active</p>
              <p className="font-medium">{student.lastActive}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid min-h-0 flex-1 gap-4 overflow-auto lg:grid-cols-3">
        <Card className="border-border/70 shadow-sm lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Star className="h-4 w-4 text-emerald-600" />
              Strengths
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {student.strengths.map((item) => (
              <div key={item.name} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span>{item.name}</span>
                  <span className="font-medium text-emerald-600">{item.score}%</span>
                </div>
                <Progress value={item.score} className="h-2 [&>div]:bg-emerald-500" />
              </div>
            ))}
            <CardTitle className="flex items-center gap-2 pt-2 text-base">
              <TrendingUp className="h-4 w-4 rotate-180 text-amber-600" />
              Needs Improvement
            </CardTitle>
            {student.needsImprovement.map((item) => (
              <div key={item.name} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span>{item.name}</span>
                  <span className="font-medium text-rose-600">{item.score}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${completionBarClass(item.score)}`}
                    style={{ width: `${item.score}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              Recent AI Tutor Activity
            </CardTitle>
            <span className="text-sm font-medium text-primary">View all</span>
          </CardHeader>
          <CardContent className="space-y-3">
            {student.aiActivity.map((item) => (
              <div
                key={`${item.title}-${item.when}`}
                className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5"
              >
                <div className="rounded-md bg-blue-50 p-2 text-blue-600">
                  <BookOpen className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.when}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="h-4 w-4 text-primary" />
              Quiz Performance
            </CardTitle>
            <span className="text-sm font-medium text-primary">View all</span>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Average Score</p>
              <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                {student.averageQuizScore}%
              </p>
              <p
                className={`mt-1 flex items-center gap-1 text-xs font-medium ${
                  student.quizTrend >= 0 ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                <TrendingUp className={`h-3.5 w-3.5 ${student.quizTrend < 0 ? "rotate-180" : ""}`} />
                {Math.abs(student.quizTrend)}% from last week
              </p>
            </div>
            <div className="space-y-2">
              {student.recentQuizzes.map((quiz) => (
                <div
                  key={quiz.name}
                  className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm"
                >
                  <span>{quiz.name}</span>
                  <span className="font-semibold text-blue-700">{quiz.score}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base">Assignments</CardTitle>
            <span className="text-sm font-medium text-primary">View all</span>
          </CardHeader>
          <CardContent className="space-y-3">
            {student.assignments.map((assignment) => (
              <div
                key={assignment.title}
                className="flex flex-col gap-2 rounded-lg border border-border/60 bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-md bg-blue-50 p-2 text-blue-600">
                    <ClipboardList className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium">{assignment.title}</p>
                    <p className="text-xs text-muted-foreground">Due {assignment.due}</p>
                  </div>
                </div>
                <Badge variant="outline" className={assignmentStatusClass(assignment.status)}>
                  {assignment.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base">Teacher Notes</CardTitle>
            <span className="text-sm font-medium text-primary">Edit</span>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-muted-foreground">{student.teacherNotes}</p>
            <p className="mt-4 text-xs text-muted-foreground">Last updated {student.notesUpdated}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
