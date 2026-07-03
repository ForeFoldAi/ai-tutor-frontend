import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  GraduationCap,
  TrendingUp,
  BarChart3,
  ChevronRight,
  BookOpen,
  Award,
  Calendar,
} from "lucide-react";
import type { User } from "@/types/schema";

interface SchoolAdminDashboardProps {
  user: User;
}

const performanceData = [
  { subject: "Mathematics", avgScore: 78, students: 245 },
  { subject: "Science", avgScore: 82, students: 230 },
  { subject: "English", avgScore: 85, students: 260 },
  { subject: "History", avgScore: 74, students: 180 },
];

const topPerformers = [
  { name: "Alice Johnson", score: 98, subject: "Mathematics" },
  { name: "Bob Smith", score: 96, subject: "Science" },
  { name: "Carol White", score: 95, subject: "English" },
];

export default function SchoolAdminDashboard({ user: _user }: SchoolAdminDashboardProps) {
  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">School Overview</h1>
          <p className="text-muted-foreground">Monitor school performance and manage users.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/students">Manage Students</Link>
          </Button>
          <Button asChild>
            <Link href="/tutors">Manage Tutors</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <GraduationCap className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">1,247</p>
                <p className="text-sm text-muted-foreground">Total Students</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-accent/10">
                <Users className="h-6 w-6 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">48</p>
                <p className="text-sm text-muted-foreground">Total Tutors</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-500/10">
                <TrendingUp className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">82%</p>
                <p className="text-sm text-muted-foreground">Avg. Performance</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-orange-500/10">
                <Calendar className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">156</p>
                <p className="text-sm text-muted-foreground">Classes This Week</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Subject Performance
            </CardTitle>
            <CardDescription>Average scores by subject</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {performanceData.map((item, i) => (
              <div key={i} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{item.subject}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {item.students} students
                    </span>
                    <Badge variant={item.avgScore >= 80 ? "default" : "secondary"}>
                      {item.avgScore}%
                    </Badge>
                  </div>
                </div>
                <Progress value={item.avgScore} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Top Performers
            </CardTitle>
            <CardDescription>Students with highest scores this month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topPerformers.map((student, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full font-bold text-sm ${
                        i === 0
                          ? "bg-yellow-500 text-white"
                          : i === 1
                          ? "bg-gray-400 text-white"
                          : "bg-orange-600 text-white"
                      }`}
                    >
                      {i + 1}
                    </div>
                    <div>
                      <p className="font-medium">{student.name}</p>
                      <p className="text-sm text-muted-foreground">{student.subject}</p>
                    </div>
                  </div>
                  <Badge className="bg-green-500">{student.score}%</Badge>
                </div>
              ))}
            </div>
            <Button asChild variant="ghost" className="w-full mt-4">
              <Link href="/students">
                View All Students
                <ChevronRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" className="h-auto p-4 flex flex-col gap-2" asChild>
              <Link href="/students">
                <GraduationCap className="h-6 w-6" />
                <span>View Students</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col gap-2" asChild>
              <Link href="/tutors">
                <Users className="h-6 w-6" />
                <span>View Tutors</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col gap-2" asChild>
              <Link href="/settings">
                <Calendar className="h-6 w-6" />
                <span>Settings</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
