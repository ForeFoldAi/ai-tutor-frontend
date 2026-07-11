import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Calculator,
  Clock,
  FlaskConical,
  Globe,
  Monitor,
  Play,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import type { User } from "@/types/schema";
import { cn } from "@/lib/utils";
import { AiTutorButtonIcon } from "@/components/ai-tutor-button-icon";
import { brandImages } from "@/lib/brand-images";

interface StudentDashboardProps {
  user: User;
}

const subjects = [
  { name: "Mathematics", progress: 80, trend: [52, 58, 65, 70, 75, 80], icon: Calculator, color: "bg-subject-math", text: "text-subject-math" },
  { name: "English", progress: 62, trend: [40, 45, 48, 52, 58, 62], icon: Globe, color: "bg-subject-english", text: "text-subject-english" },
  { name: "Science", progress: 60, trend: [38, 42, 48, 52, 55, 60], icon: FlaskConical, color: "bg-subject-science", text: "text-subject-science" },
  { name: "Social Studies", progress: 50, trend: [30, 35, 38, 42, 46, 50], icon: BookOpen, color: "bg-subject-social", text: "text-subject-social" },
  { name: "Computer", progress: 40, trend: [20, 25, 28, 32, 36, 40], icon: Monitor, color: "bg-subject-cs", text: "text-subject-cs" },
];

const recentLessons = [
  "Multiplication of Fractions",
  "Nouns and Pronouns",
  "States of Matter",
];

function CircularProgress({ value, size = 56 }: { value: number; size?: number }) {
  const stroke = 5;
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
          className="text-muted/40"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#progressGradient)"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#4F6EF7" />
            <stop offset="50%" stopColor="#6C4CF7" />
            <stop offset="100%" stopColor="#8B4CF7" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-base font-bold text-foreground">{value}%</span>
      </div>
    </div>
  );
}

function StatCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <Card className={cn("hover:translate-y-0 hover:shadow-card shadow-card", className)}>
      <CardContent className="p-4 lg:p-3">{children}</CardContent>
    </Card>
  );
}

function SubjectMiniChart({ data, barClass }: { data: number[]; barClass: string }) {
  return (
    <div className="mt-2 flex h-7 w-full items-end gap-0.5 sm:h-8">
      {data.map((value, index) => (
        <div
          key={index}
          className={cn("flex-1 rounded-sm", barClass, index === data.length - 1 ? "opacity-100" : "opacity-50")}
          style={{ height: `${Math.max(value, 8)}%` }}
        />
      ))}
    </div>
  );
}

export default function StudentDashboard({ user }: StudentDashboardProps) {
  const firstName = user.fullName?.split(" ")[0] || "Student";

  return (
    <div className="dashboard-fit overflow-x-hidden overflow-y-auto p-4 md:p-5 lg:p-4">
      {/* Header */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between lg:mb-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold text-foreground sm:text-2xl">
            Welcome back, {firstName}! 👋
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Keep learning and growing every day.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Select defaultValue="week">
            <SelectTrigger className="h-9 w-[120px] bg-card">
              <SelectValue placeholder="This Week" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Button asChild className="h-9 gap-2 bg-gradient-brand px-3 sm:px-4">
            <Link href="/ai-learning-studio">
              <AiTutorButtonIcon />
              <span className="hidden sm:inline">Ask AI Tutor</span>
              <span className="sm:hidden">AI Tutor</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4 lg:mb-3 lg:gap-2.5">
        <StatCard>
          <p className="text-sm font-medium text-muted-foreground">Overall Progress</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <CircularProgress value={82} />
            <p className="flex items-center gap-1 text-xs font-medium text-success sm:text-sm">
              <TrendingUp className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
              <span>+12% from last week</span>
            </p>
          </div>
        </StatCard>

        <StatCard>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-medium text-muted-foreground">Lessons Completed</p>
              <p className="mt-1 text-xl font-bold text-foreground">24</p>
              <p className="text-xs text-muted-foreground">of 29 lessons</p>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <BookOpen className="h-4 w-4 text-primary" />
            </div>
          </div>
          <Progress value={83} className="mt-2 h-1.5" />
        </StatCard>

        <StatCard>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Quizzes Avg. Score</p>
              <p className="mt-1 text-xl font-bold text-foreground">78%</p>
              <p className="text-xs font-medium text-success">Good job!</p>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-subject-science/15">
              <ClipboardList className="h-4 w-4 text-subject-science" />
            </div>
          </div>
        </StatCard>

        <StatCard>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-medium text-muted-foreground">Upcoming Session</p>
              <p className="mt-1 text-base font-bold text-foreground">Tomorrow, 10:00 AM</p>
              <p className="text-xs text-muted-foreground">Math • Grade 6</p>
              <Link href="/live-classes" className="mt-1 inline-flex text-xs font-medium text-primary hover:underline">
                View Details
              </Link>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-subject-cs/15">
              <Calendar className="h-4 w-4 text-subject-cs" />
            </div>
          </div>
        </StatCard>
      </div>

      {/* Main content — left: learning + tip | right: continue + recent */}
      <div className="grid items-start gap-3 lg:grid-cols-5 lg:gap-3">
        <div className="grid gap-3 lg:col-span-3">
          <Card className="hover:translate-y-0 hover:shadow-card shadow-card">
            <CardContent className="p-4 lg:p-4">
              <div className="mb-4 flex items-center justify-between gap-2 lg:mb-3">
                <h2 className="text-sm font-semibold text-foreground sm:text-base">My Learning</h2>
                <Link href="/ai-learning-studio" className="shrink-0 text-xs font-medium text-primary hover:underline sm:text-sm">
                  View All
                </Link>
              </div>
              <div className="grid gap-4 md:grid-cols-[10.5rem_1fr] md:items-center lg:grid-cols-[11.5rem_1fr]">
                <div className="flex aspect-square w-full max-w-[11.5rem] shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#EEF2FF] dark:bg-primary/10">
                  <img
                    src={brandImages.book}
                    alt="Learning illustration"
                    className="h-[92%] w-[92%] object-contain"
                  />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold leading-snug text-foreground sm:text-base">
                    Fractions: Addition and Subtraction
                  </h3>
                  <Badge className="mt-2 w-fit border-0 bg-primary/10 text-primary hover:bg-primary/10">
                    Mathematics
                  </Badge>
                  <div className="mt-3 flex items-center gap-2.5">
                    <span className="shrink-0 text-xs text-muted-foreground sm:text-sm">Lesson 12 of 20</span>
                    <Progress value={60} className="h-2 flex-1 [&>div]:bg-gradient-brand" />
                    <span className="shrink-0 text-sm font-semibold text-foreground">60%</span>
                  </div>
                  <Button asChild className="mt-4 h-10 w-full rounded-xl bg-gradient-brand sm:w-auto sm:min-w-[11rem] sm:px-6">
                    <Link href="/ai-learning-studio" className="inline-flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/25">
                        <Play className="h-3 w-3 fill-white text-white" />
                      </span>
                      Continue Lesson
                    </Link>
                  </Button>
                </div>
              </div>

              <div className="mt-5 border-t border-border/60 pt-4 lg:mt-4 lg:pt-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-foreground sm:text-base">Your Subjects</h2>
                  <Link href="/ai-learning-studio" className="shrink-0 text-xs font-medium text-primary hover:underline sm:text-sm">
                    View All
                  </Link>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5 sm:gap-3">
                  {subjects.map((subject) => (
                    <div
                      key={subject.name}
                      className="flex min-w-0 flex-col items-center rounded-xl border border-border/60 bg-muted/20 p-2.5 text-center sm:p-3"
                      data-testid={`subject-progress-${subject.name.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <div className={cn("mb-1.5 flex h-8 w-8 items-center justify-center rounded-lg sm:h-9 sm:w-9", subject.color)}>
                        <subject.icon className="h-4 w-4 text-white" />
                      </div>
                      <p className="truncate text-xs font-medium text-foreground">{subject.name}</p>
                      <p className={cn("mt-0.5 text-sm font-bold", subject.text)}>{subject.progress}%</p>
                      <SubjectMiniChart data={subject.trend} barClass={subject.color} />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-0 bg-gradient-to-r from-primary/10 via-accent/10 to-brand-secondary/10 hover:translate-y-0 hover:shadow-card shadow-card">
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4 lg:gap-3 lg:p-3">
              <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-lg sm:h-16 sm:w-28 lg:h-14 lg:w-24">
                <img
                  src={brandImages.chatbot}
                  alt=""
                  aria-hidden
                  className="h-full w-full object-contain object-center p-1"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" />
                  Today&apos;s Learning Tip
                </p>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground sm:text-sm">
                  Practice a little every day — even 15 minutes of focused study helps you retain
                  more and build lasting confidence.
                </p>
              </div>
              <Button asChild variant="outline" className="h-9 w-full shrink-0 bg-card/80 sm:w-auto">
                <Link href="/ai-learning-studio">
                  Start Now
                  <ChevronRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-3 lg:col-span-2">
          <Card className="hover:translate-y-0 hover:shadow-card shadow-card">
            <CardContent className="p-4 lg:p-4">
              <div className="mb-4 flex items-center justify-between gap-2 lg:mb-3">
                <h2 className="text-sm font-semibold text-foreground sm:text-base">Continue Learning</h2>
                <Link href="/ai-learning-studio" className="shrink-0 text-xs font-medium text-primary hover:underline sm:text-sm">
                  View All
                </Link>
              </div>
              <div className="flex items-start gap-4">
                <div className="min-w-0 flex-1">
                  <Badge className="w-fit border-0 bg-primary/10 text-primary hover:bg-primary/10">
                    Mathematics
                  </Badge>
                  <h3 className="mt-2 text-base font-bold leading-snug text-foreground sm:text-lg">
                    Fractions: Addition and Subtraction
                  </h3>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
                    <p className="flex items-center gap-2 text-xs text-muted-foreground sm:text-sm">
                      <span className="h-4 w-1 shrink-0 rounded-full bg-primary" aria-hidden />
                      Lesson 12 of 20
                    </p>
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground sm:text-sm">
                      <Clock className="h-3.5 w-3.5 shrink-0" />
                      15 min left
                    </p>
                  </div>
                </div>
                <div className="flex h-[10.5rem] w-[9rem] shrink-0 items-center justify-center sm:h-44 sm:w-[10.5rem]">
                  <img
                    src={brandImages.book}
                    alt=""
                    aria-hidden
                    className="h-full w-full object-contain"
                  />
                </div>
              </div>
              <Button asChild className="mt-5 h-11 w-full rounded-xl bg-gradient-brand text-sm font-semibold">
                <Link href="/ai-learning-studio" className="inline-flex w-full items-center justify-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white">
                    <Play className="h-3.5 w-3.5 fill-primary text-primary" />
                  </span>
                  Continue Lesson
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:translate-y-0 hover:shadow-card shadow-card">
            <CardContent className="p-4 lg:p-3">
              <div className="mb-3 flex items-center justify-between gap-2 lg:mb-2">
                <h2 className="text-sm font-semibold text-foreground sm:text-base">Recent Lessons</h2>
                <Link href="/ai-learning-studio" className="shrink-0 text-xs font-medium text-primary hover:underline sm:text-sm">
                  View All
                </Link>
              </div>
              <ul className="space-y-2">
                {recentLessons.map((lesson) => (
                  <li
                    key={lesson}
                    className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5"
                  >
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                    <span className="truncate text-sm font-medium text-foreground">{lesson}</span>
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
