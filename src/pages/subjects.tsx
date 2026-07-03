import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Calculator,
  FlaskConical,
  Globe,
  Palette,
  Code,
  BookOpen,
  ChevronRight,
  Search,
  Clock,
  CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Subject {
  id: number;
  name: string;
  description: string;
  icon: any;
  color: string;
  bgColor: string;
  progress: number;
  chapters: number;
  completedChapters: number;
  lastAccessed: string;
}

const subjects: Subject[] = [
  {
    id: 1,
    name: "Mathematics",
    description: "Algebra, Geometry, Calculus and more",
    icon: Calculator,
    color: "text-subject-math",
    bgColor: "bg-subject-math",
    progress: 72,
    chapters: 12,
    completedChapters: 8,
    lastAccessed: "2 hours ago",
  },
  {
    id: 2,
    name: "Science",
    description: "Physics, Chemistry, Biology",
    icon: FlaskConical,
    color: "text-subject-science",
    bgColor: "bg-subject-science",
    progress: 58,
    chapters: 15,
    completedChapters: 9,
    lastAccessed: "Yesterday",
  },
  {
    id: 3,
    name: "English",
    description: "Grammar, Literature, Writing",
    icon: Globe,
    color: "text-subject-english",
    bgColor: "bg-subject-english",
    progress: 85,
    chapters: 10,
    completedChapters: 8,
    lastAccessed: "Today",
  },
  {
    id: 4,
    name: "Art & Design",
    description: "Drawing, Painting, Digital Art",
    icon: Palette,
    color: "text-subject-social",
    bgColor: "bg-subject-social",
    progress: 45,
    chapters: 8,
    completedChapters: 4,
    lastAccessed: "3 days ago",
  },
  {
    id: 5,
    name: "Computer Science",
    description: "Programming, Algorithms, Data Structures",
    icon: Code,
    color: "text-subject-cs",
    bgColor: "bg-subject-cs",
    progress: 91,
    chapters: 14,
    completedChapters: 13,
    lastAccessed: "1 hour ago",
  },
  {
    id: 6,
    name: "History",
    description: "World History, Civilizations, Modern Era",
    icon: BookOpen,
    color: "text-subject-social",
    bgColor: "bg-subject-social",
    progress: 35,
    chapters: 16,
    completedChapters: 5,
    lastAccessed: "1 week ago",
  },
];

export default function SubjectsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);

  const filteredSubjects = subjects.filter((subject) =>
    subject.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">Subjects</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Explore and learn from your enrolled subjects.</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search subjects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-subjects"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredSubjects.map((subject) => (
          <Card
            key={subject.id}
            className={cn(
              "overflow-hidden hover-elevate cursor-pointer transition-all",
              selectedSubject?.id === subject.id && "ring-2 ring-primary"
            )}
            onClick={() => setSelectedSubject(subject)}
            data-testid={`subject-card-${subject.id}`}
          >
            <div className={cn("h-2", subject.bgColor)} />
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div className={cn("p-3 rounded-lg", subject.bgColor)}>
                  <subject.icon className="h-6 w-6 text-white" />
                </div>
                <Badge variant="outline" className="text-xs">
                  <Clock className="mr-1 h-3 w-3" />
                  {subject.lastAccessed}
                </Badge>
              </div>
              <CardTitle className="mt-3">{subject.name}</CardTitle>
              <CardDescription>{subject.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{subject.progress}%</span>
                </div>
                <Progress value={subject.progress} className="h-2" />
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <CheckCircle className="h-4 w-4" />
                  <span>
                    {subject.completedChapters}/{subject.chapters} Chapters
                  </span>
                </div>
                <Button variant="ghost" size="sm">
                  Continue
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedSubject && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-lg", selectedSubject.bgColor)}>
                <selectedSubject.icon className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle>{selectedSubject.name} - Chapters</CardTitle>
                <CardDescription>
                  View all chapters and topics in this subject
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: selectedSubject.chapters }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "p-4 rounded-lg border hover-elevate transition-all cursor-pointer",
                    i < selectedSubject.completedChapters
                      ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900"
                      : "bg-card"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge
                      variant={i < selectedSubject.completedChapters ? "default" : "secondary"}
                      className={
                        i < selectedSubject.completedChapters ? "bg-green-500" : ""
                      }
                    >
                      Chapter {i + 1}
                    </Badge>
                    {i < selectedSubject.completedChapters && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                  <p className="font-medium text-sm">
                    {["Introduction", "Basics", "Core Concepts", "Advanced", "Practice"][i % 5]}{" "}
                    {Math.floor(i / 5) + 1}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">5 topics</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
