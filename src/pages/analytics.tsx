import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Clock,
  BookOpen,
  Target,
  Award,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

const overallStats = [
  { label: "Total Study Time", value: "124h", change: "+12%", trend: "up", icon: Clock },
  { label: "Topics Completed", value: "48", change: "+8", trend: "up", icon: BookOpen },
  { label: "Average Score", value: "82%", change: "+5%", trend: "up", icon: Target },
  { label: "Assignments Done", value: "23", change: "+3", trend: "up", icon: Award },
];

const subjectPerformance = [
  { name: "Mathematics", score: 85, trend: "up", sessions: 24, weakTopics: ["Calculus", "Trigonometry"] },
  { name: "Science", score: 78, trend: "up", sessions: 18, weakTopics: ["Chemistry", "Organic Compounds"] },
  { name: "English", score: 92, trend: "up", sessions: 15, weakTopics: [] },
  { name: "Computer Science", score: 95, trend: "up", sessions: 32, weakTopics: [] },
  { name: "History", score: 68, trend: "down", sessions: 8, weakTopics: ["World War I", "Ancient Rome"] },
];

const weakTopics = [
  { topic: "Calculus", subject: "Mathematics", attempts: 3, lastScore: 45 },
  { topic: "Organic Chemistry", subject: "Science", attempts: 2, lastScore: 52 },
  { topic: "Trigonometry", subject: "Mathematics", attempts: 4, lastScore: 58 },
  { topic: "World War I", subject: "History", attempts: 1, lastScore: 40 },
];

const weeklyActivity = [
  { day: "Mon", hours: 2.5 },
  { day: "Tue", hours: 3.2 },
  { day: "Wed", hours: 1.8 },
  { day: "Thu", hours: 4.0 },
  { day: "Fri", hours: 2.0 },
  { day: "Sat", hours: 5.5 },
  { day: "Sun", hours: 3.0 },
];

export default function AnalyticsPage() {
  const maxHours = Math.max(...weeklyActivity.map((d) => d.hours));

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex min-w-0 items-start justify-between gap-3 sm:items-center sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">Analytics & Reports</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Track your learning progress and performance.</p>
        </div>
        <ThemeToggle className="hidden lg:flex" />
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        {overallStats.map((stat, i) => (
          <Card key={i}>
            <CardContent className="p-3 sm:pt-6 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <div className="p-2 sm:p-3 rounded-lg bg-primary/10 w-fit">
                  <stat.icon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                <div>
                  <p className="text-lg sm:text-2xl font-bold">{stat.value}</p>
                  <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                    <p className="text-xs sm:text-sm text-muted-foreground">{stat.label}</p>
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-xs",
                        stat.trend === "up" ? "text-green-600" : "text-red-600"
                      )}
                    >
                      {stat.trend === "up" ? (
                        <TrendingUp className="mr-1 h-3 w-3" />
                      ) : (
                        <TrendingDown className="mr-1 h-3 w-3" />
                      )}
                      {stat.change}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="performance">
        <TabsList className="w-full sm:w-auto flex overflow-x-auto">
          <TabsTrigger value="performance" className="text-xs sm:text-sm">Performance</TabsTrigger>
          <TabsTrigger value="activity" className="text-xs sm:text-sm">Activity</TabsTrigger>
          <TabsTrigger value="weak" className="text-xs sm:text-sm">Weak Topics</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Subject-wise Performance
              </CardTitle>
              <CardDescription>Your scores and progress across all subjects</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {subjectPerformance.map((subject, i) => (
                <div key={i} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{subject.name}</span>
                      {subject.trend === "up" ? (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">
                        {subject.sessions} sessions
                      </span>
                      <Badge
                        className={cn(
                          subject.score >= 85
                            ? "bg-green-500"
                            : subject.score >= 70
                            ? "bg-yellow-500"
                            : "bg-red-500"
                        )}
                      >
                        {subject.score}%
                      </Badge>
                    </div>
                  </div>
                  <Progress
                    value={subject.score}
                    className={cn(
                      "h-3",
                      subject.score >= 85
                        ? "[&>div]:bg-green-500"
                        : subject.score >= 70
                        ? "[&>div]:bg-yellow-500"
                        : "[&>div]:bg-red-500"
                    )}
                  />
                  {subject.weakTopics.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground">Needs improvement:</span>
                      {subject.weakTopics.map((topic, j) => (
                        <Badge key={j} variant="outline" className="text-xs">
                          {topic}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Weekly Study Activity
              </CardTitle>
              <CardDescription>Hours spent studying each day this week</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between gap-2 h-48">
                {weeklyActivity.map((day, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <div
                      className="w-full bg-primary rounded-t-lg transition-all hover-elevate"
                      style={{ height: `${(day.hours / maxHours) * 100}%`, minHeight: "8px" }}
                    />
                    <span className="text-xs text-muted-foreground">{day.day}</span>
                    <span className="text-xs font-medium">{day.hours}h</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-6 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total this week</p>
                    <p className="text-2xl font-bold">
                      {weeklyActivity.reduce((sum, d) => sum + d.hours, 0).toFixed(1)} hours
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Daily average</p>
                    <p className="text-2xl font-bold">
                      {(weeklyActivity.reduce((sum, d) => sum + d.hours, 0) / 7).toFixed(1)} hours
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="weak" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Topics Needing Improvement
              </CardTitle>
              <CardDescription>Focus on these areas to improve your overall score</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                {weakTopics.map((topic, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-lg border bg-card hover-elevate transition-all"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-medium">{topic.topic}</h3>
                        <p className="text-sm text-muted-foreground">{topic.subject}</p>
                      </div>
                      <Badge
                        variant="destructive"
                        className={cn(
                          topic.lastScore >= 50 ? "bg-yellow-500" : "bg-red-500"
                        )}
                      >
                        {topic.lastScore}%
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{topic.attempts} attempts</span>
                      <button className="text-primary hover:underline">Practice Now</button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
