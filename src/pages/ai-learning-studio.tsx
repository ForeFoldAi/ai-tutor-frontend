import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Bot,
  BookOpen,
  ChevronRight,
  Search,
  ArrowLeft,
  Mic,
  PlayCircle,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getMySubjects } from "@/api/student";
import type { StudentSubjectApi } from "@/api/types";

const SUBJECT_STYLES: Record<string, { color: string; bgColor: string }> = {
  Mathematics: { color: "text-blue-600", bgColor: "bg-blue-500" },
  Science: { color: "text-green-600", bgColor: "bg-green-500" },
  Physics: { color: "text-cyan-600", bgColor: "bg-cyan-500" },
  Chemistry: { color: "text-emerald-600", bgColor: "bg-emerald-500" },
  Biology: { color: "text-lime-600", bgColor: "bg-lime-500" },
  English: { color: "text-purple-600", bgColor: "bg-purple-500" },
  Hindi: { color: "text-orange-600", bgColor: "bg-orange-500" },
  History: { color: "text-amber-600", bgColor: "bg-amber-500" },
  Geography: { color: "text-teal-600", bgColor: "bg-teal-500" },
  "Computer Science": { color: "text-indigo-600", bgColor: "bg-indigo-500" },
  "Social Science": { color: "text-rose-600", bgColor: "bg-rose-500" },
  Economics: { color: "text-yellow-600", bgColor: "bg-yellow-500" },
};

const FALLBACK_STYLE = { color: "text-slate-600", bgColor: "bg-slate-500" };

function getSubjectStyle(name: string) {
  return SUBJECT_STYLES[name] ?? FALLBACK_STYLE;
}

function formatClassLevel(cl: string) {
  return cl.replace("CLASS_", "Class ");
}

type LearningMethod = "ai-tutor" | "ai-voice" | "pre-recorded";

interface Chapter {
  id: string;
  chapter: string;
  file_name: string;
}

function SubjectDetailView({ subjectId, subjects }: { subjectId: string; subjects: StudentSubjectApi[] }) {
  const [, setLocation] = useLocation();
  const subject = subjects.find((s) => s.id === subjectId);

  const [selectedChapters, setSelectedChapters] = useState<Set<string>>(new Set());
  const [selectedMethod, setSelectedMethod] = useState<LearningMethod | null>(null);
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());

  if (!subject) {
    return (
      <div className="p-4 sm:p-6">
        <p>Subject not found</p>
      </div>
    );
  }

  const style = getSubjectStyle(subject.subject_name);
  const chapters: Chapter[] = subject.chapters.map((ch, idx) => ({
    id: ch.id,
    chapter: ch.chapter || `Chapter ${idx + 1}`,
    file_name: ch.file_name,
  }));

  const toggleChapter = (chapterId: string) => {
    const next = new Set(selectedChapters);
    if (next.has(chapterId)) next.delete(chapterId);
    else next.add(chapterId);
    setSelectedChapters(next);
  };

  const toggleChapterExpansion = (chapterId: string) => {
    const next = new Set(expandedChapters);
    if (next.has(chapterId)) next.delete(chapterId);
    else next.add(chapterId);
    setExpandedChapters(next);
  };

  const handleStartLearning = () => {
    if (selectedChapters.size === 0 || !selectedMethod) return;

    const params = new URLSearchParams({
      board: subject.board,
      class: subject.class_level,
      subject: subject.subject_name,
      chapters: Array.from(selectedChapters).join(","),
      chapterNames: chapters
        .filter((ch) => selectedChapters.has(ch.id))
        .map((ch) => ch.chapter)
        .join("||"),
    });

    if (selectedMethod === "ai-tutor") {
      setLocation(`/ai-tutor?${params.toString()}`);
    } else if (selectedMethod === "ai-voice") {
      setLocation(`/ai-voice?${params.toString()}`);
    } else if (selectedMethod === "pre-recorded") {
      alert("Pre-recorded videos feature coming soon!");
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation("/ai-learning-studio")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-lg", style.bgColor)}>
            <BookOpen className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold">{subject.subject_name}</h1>
            <p className="text-sm text-muted-foreground">
              {subject.board} &middot; {formatClassLevel(subject.class_level)}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Step 1: Select Chapters */}
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Select Chapters</CardTitle>
            <CardDescription>
              {chapters.length > 0
                ? "Choose the chapters you want to learn"
                : "No textbook chapters have been uploaded for this subject yet."}
            </CardDescription>
          </CardHeader>
          {chapters.length > 0 && (
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {chapters.map((chapter) => (
                  <div key={chapter.id} className="border rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={selectedChapters.has(chapter.id)}
                        onCheckedChange={() => toggleChapter(chapter.id)}
                      />
                      <div
                        className="flex-1 flex items-center justify-between cursor-pointer"
                        onClick={() => toggleChapterExpansion(chapter.id)}
                      >
                        <div>
                          <h3 className="font-medium">{chapter.chapter}</h3>
                          <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                            {chapter.file_name}
                          </p>
                        </div>
                        <ChevronRight
                          className={cn(
                            "h-4 w-4 transition-transform",
                            expandedChapters.has(chapter.id) && "rotate-90"
                          )}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>

        {/* Step 2: Select Learning Method */}
        <Card>
          <CardHeader>
            <CardTitle>Step 2: Select Learning Method</CardTitle>
            <CardDescription>
              Choose how you want to learn the selected content
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <Card
                className={cn(
                  "cursor-pointer hover-elevate transition-all",
                  selectedMethod === "ai-tutor" && "ring-2 ring-primary"
                )}
                onClick={() => setSelectedMethod("ai-tutor")}
              >
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Bot className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-base">AI Tutor</CardTitle>
                  </div>
                  <CardDescription>
                    Interactive AI-powered tutoring with personalized explanations
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card
                className={cn(
                  "cursor-pointer hover-elevate transition-all",
                  selectedMethod === "ai-voice" && "ring-2 ring-primary"
                )}
                onClick={() => setSelectedMethod("ai-voice")}
              >
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-accent/10">
                      <Mic className="h-5 w-5 text-accent" />
                    </div>
                    <CardTitle className="text-base">AI Voice</CardTitle>
                  </div>
                  <CardDescription>
                    Voice-based learning with AI narration and explanations
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card
                className={cn(
                  "cursor-pointer hover-elevate transition-all",
                  selectedMethod === "pre-recorded" && "ring-2 ring-primary"
                )}
                onClick={() => setSelectedMethod("pre-recorded")}
              >
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-green-500/10">
                      <PlayCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <CardTitle className="text-base">Pre-recorded Videos</CardTitle>
                  </div>
                  <CardDescription>
                    Watch pre-recorded class videos at your own pace
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </CardContent>
        </Card>

        {/* Start Learning Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleStartLearning}
            disabled={selectedChapters.size === 0 || !selectedMethod}
            size="lg"
          >
            Start Learning
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function SubjectsTab({ subjects, loading, error }: { subjects: StudentSubjectApi[]; loading: boolean; error: string | null }) {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSubjects = subjects.filter((s) =>
    s.subject_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubjectClick = (subjectId: string) => {
    setLocation(`/ai-learning-studio/subject/${subjectId}`);
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 flex flex-col items-center justify-center gap-3 min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading your subjects...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6 flex flex-col items-center justify-center gap-3 min-h-[300px]">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-destructive font-medium">Failed to load subjects</p>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">Subjects</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Explore and learn from your enrolled subjects.
          </p>
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

      {filteredSubjects.length === 0 && !searchQuery ? (
        <Card className="p-8 text-center">
          <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-2">No subjects available yet</h3>
          <p className="text-sm text-muted-foreground">
            Your subjects will appear here once your school admin or tutor assigns them to your board and class.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSubjects.map((subject) => {
            const style = getSubjectStyle(subject.subject_name);
            return (
              <Card
                key={subject.id}
                className="overflow-hidden hover-elevate cursor-pointer transition-all"
                onClick={() => handleSubjectClick(subject.id)}
                data-testid={`subject-card-${subject.id}`}
              >
                <div className={cn("h-2", style.bgColor)} />
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className={cn("p-3 rounded-lg", style.bgColor)}>
                      <BookOpen className="h-6 w-6 text-white" />
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {subject.board}
                    </Badge>
                  </div>
                  <CardTitle className="mt-3">{subject.subject_name}</CardTitle>
                  <CardDescription>
                    {formatClassLevel(subject.class_level)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <BookOpen className="h-4 w-4" />
                      <span>
                        {subject.chapters.length}{" "}
                        {subject.chapters.length === 1 ? "Chapter" : "Chapters"}
                      </span>
                    </div>
                    <Button variant="ghost" size="sm">
                      Explore
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AILearningStudioPage() {
  const [match, params] = useRoute<{ subjectId: string }>("/ai-learning-studio/subject/:subjectId");

  const [subjects, setSubjects] = useState<StudentSubjectApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getMySubjects()
      .then((data) => {
        if (!cancelled) {
          setSubjects(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Failed to fetch subjects");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  if (match && params?.subjectId) {
    return <SubjectDetailView subjectId={params.subjectId} subjects={subjects} />;
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] overflow-auto">
      <SubjectsTab subjects={subjects} loading={loading} error={error} />
    </div>
  );
}
