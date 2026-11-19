import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, ChevronRight, BookOpen, Layers, FileText, Edit, Trash2 } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { cn } from "@/lib/utils";

interface Subject {
  id: number;
  name: string;
  chapters: number;
  topics: number;
}

interface Chapter {
  id: number;
  name: string;
  topics: number;
  order: number;
}

const subjects: Subject[] = [
  { id: 1, name: "Mathematics", chapters: 12, topics: 48 },
  { id: 2, name: "Science", chapters: 15, topics: 62 },
  { id: 3, name: "English", chapters: 10, topics: 35 },
  { id: 4, name: "Computer Science", chapters: 14, topics: 56 },
  { id: 5, name: "History", chapters: 16, topics: 64 },
];

const sampleChapters: Chapter[] = [
  { id: 1, name: "Numbers and Operations", topics: 5, order: 1 },
  { id: 2, name: "Algebra Fundamentals", topics: 4, order: 2 },
  { id: 3, name: "Linear Equations", topics: 4, order: 3 },
  { id: 4, name: "Quadratic Equations", topics: 5, order: 4 },
  { id: 5, name: "Geometry Basics", topics: 4, order: 5 },
];

export default function SyllabusPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);

  const filteredSubjects = subjects.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <PageShell size="standard">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold sm:text-2xl">Syllabus Management</h1>
          <p className="text-muted-foreground">Manage subjects, chapters, and topics.</p>
        </div>
        <Button data-testid="button-add-subject">
          <Plus className="mr-2 h-4 w-4" />
          Add Subject
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Subjects
              </CardTitle>
              <div className="relative min-w-0 flex-1 sm:flex-none">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 sm:w-48"
                  data-testid="input-search-syllabus"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {filteredSubjects.map((subject) => (
              <div
                key={subject.id}
                className={cn(
                  "flex items-center justify-between p-4 rounded-lg border bg-card hover-elevate transition-all cursor-pointer",
                  selectedSubject?.id === subject.id && "ring-2 ring-primary"
                )}
                onClick={() => setSelectedSubject(subject)}
                data-testid={`subject-item-${subject.id}`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <BookOpen className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">{subject.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {subject.chapters} chapters • {subject.topics} topics
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex min-w-0 items-center gap-2">
                <Layers className="h-5 w-5 shrink-0" />
                <span className="truncate">
                  {selectedSubject ? `${selectedSubject.name} - Chapters` : "Chapters"}
                </span>
              </CardTitle>
              {selectedSubject && (
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Chapter
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {selectedSubject ? (
              <div className="space-y-2">
                {sampleChapters.map((chapter) => (
                  <div
                    key={chapter.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover-elevate transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="w-8 h-8 rounded-full p-0 flex items-center justify-center">
                        {chapter.order}
                      </Badge>
                      <div>
                        <h3 className="font-medium">{chapter.name}</h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {chapter.topics} topics
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Layers className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a subject to view chapters</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
