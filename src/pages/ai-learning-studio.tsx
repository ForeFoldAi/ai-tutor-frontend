import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Bot,
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
  ArrowLeft,
  Mic,
  PlayCircle,
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

interface Chapter {
  id: number;
  name: string;
  topics: Topic[];
}

interface Topic {
  id: number;
  name: string;
}

const subjects: Subject[] = [
  {
    id: 1,
    name: "Mathematics",
    description: "Algebra, Geometry, Calculus and more",
    icon: Calculator,
    color: "text-blue-600",
    bgColor: "bg-blue-500",
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
    color: "text-green-600",
    bgColor: "bg-green-500",
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
    color: "text-purple-600",
    bgColor: "bg-purple-500",
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
    color: "text-pink-600",
    bgColor: "bg-pink-500",
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
    color: "text-orange-600",
    bgColor: "bg-orange-500",
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
    color: "text-amber-600",
    bgColor: "bg-amber-500",
    progress: 35,
    chapters: 16,
    completedChapters: 5,
    lastAccessed: "1 week ago",
  },
];


// Mock data for chapters and topics
const getChaptersForSubject = (subjectId: number): Chapter[] => {
  const subject = subjects.find((s) => s.id === subjectId);
  if (!subject) return [];
  
  return Array.from({ length: subject.chapters }).map((_, i) => ({
    id: i + 1,
    name: `Chapter ${i + 1}: ${["Introduction", "Basics", "Core Concepts", "Advanced", "Practice"][i % 5]} ${Math.floor(i / 5) + 1}`,
    topics: Array.from({ length: 5 }).map((_, j) => ({
      id: j + 1,
      name: `Topic ${j + 1}: ${["Fundamentals", "Applications", "Examples", "Exercises", "Review"][j]}`,
    })),
  }));
};

type LearningMethod = "ai-tutor" | "ai-voice" | "pre-recorded";

function SubjectDetailView({ subjectId }: { subjectId: number }) {
  const [, setLocation] = useLocation();
  const subject = subjects.find((s) => s.id === subjectId);
  const chapters = getChaptersForSubject(subjectId);
  
  const [selectedChapters, setSelectedChapters] = useState<Set<number>>(new Set());
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set());
  const [selectedMethod, setSelectedMethod] = useState<LearningMethod | null>(null);
  const [expandedChapters, setExpandedChapters] = useState<Set<number>>(new Set());

  if (!subject) {
    return (
      <div className="p-4 sm:p-6">
        <p>Subject not found</p>
      </div>
    );
  }

  const toggleChapter = (chapterId: number) => {
    const newSelected = new Set(selectedChapters);
    if (newSelected.has(chapterId)) {
      newSelected.delete(chapterId);
      // Remove all topics from this chapter
      const chapter = chapters.find((c) => c.id === chapterId);
      if (chapter) {
        const newTopics = new Set(selectedTopics);
        chapter.topics.forEach((topic) => {
          newTopics.delete(`${chapterId}-${topic.id}`);
        });
        setSelectedTopics(newTopics);
      }
    } else {
      newSelected.add(chapterId);
      // Select all topics in this chapter
      const chapter = chapters.find((c) => c.id === chapterId);
      if (chapter) {
        const newTopics = new Set(selectedTopics);
        chapter.topics.forEach((topic) => {
          newTopics.add(`${chapterId}-${topic.id}`);
        });
        setSelectedTopics(newTopics);
      }
    }
    setSelectedChapters(newSelected);
  };

  const toggleTopic = (chapterId: number, topicId: number) => {
    const key = `${chapterId}-${topicId}`;
    const newSelected = new Set(selectedTopics);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    setSelectedTopics(newSelected);
    
    // Update chapter selection based on topics
    const chapter = chapters.find((c) => c.id === chapterId);
    if (chapter) {
      const allSelected = chapter.topics.every((topic) =>
        newSelected.has(`${chapterId}-${topic.id}`)
      );
      const newChapters = new Set(selectedChapters);
      if (allSelected) {
        newChapters.add(chapterId);
      } else {
        newChapters.delete(chapterId);
      }
      setSelectedChapters(newChapters);
    }
  };

  const toggleChapterExpansion = (chapterId: number) => {
    const newExpanded = new Set(expandedChapters);
    if (newExpanded.has(chapterId)) {
      newExpanded.delete(chapterId);
    } else {
      newExpanded.add(chapterId);
    }
    setExpandedChapters(newExpanded);
  };

  const handleStartLearning = () => {
    if (selectedTopics.size === 0 || !selectedMethod) {
      return;
    }
    
    // Navigate based on selected method
    if (selectedMethod === "ai-tutor") {
      // Navigate to AI Tutor page
      setLocation("/ai-tutor");
    } else if (selectedMethod === "ai-voice") {
      // Navigate to AI voice page
      setLocation("/ai-voice");
    } else if (selectedMethod === "pre-recorded") {
      // Navigate to pre-recorded videos page (to be implemented)
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
          <div className={cn("p-2 rounded-lg", subject.bgColor)}>
            <subject.icon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold">{subject.name}</h1>
            <p className="text-sm text-muted-foreground">{subject.description}</p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Step 1: Select Chapters & Topics */}
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Select Chapters & Topics</CardTitle>
            <CardDescription>
              Choose the chapters and topics you want to learn
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {chapters.map((chapter) => (
                <div key={chapter.id} className="border rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Checkbox
                      checked={selectedChapters.has(chapter.id)}
                      onCheckedChange={() => toggleChapter(chapter.id)}
                    />
                    <div
                      className="flex-1 flex items-center justify-between cursor-pointer"
                      onClick={() => toggleChapterExpansion(chapter.id)}
                    >
                      <div>
                        <h3 className="font-medium">{chapter.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {chapter.topics.length} topics
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
                  
                  {expandedChapters.has(chapter.id) && (
                    <div className="ml-7 space-y-2 mt-3">
                      {chapter.topics.map((topic) => (
                        <div
                          key={topic.id}
                          className="flex items-center gap-2 p-2 rounded hover:bg-muted/50"
                        >
                          <Checkbox
                            checked={selectedTopics.has(`${chapter.id}-${topic.id}`)}
                            onCheckedChange={() => toggleTopic(chapter.id, topic.id)}
                          />
                          <label className="text-sm cursor-pointer flex-1">
                            {topic.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
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
            disabled={selectedTopics.size === 0 || !selectedMethod}
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

function SubjectsTab() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSubjects = subjects.filter((subject) =>
    subject.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubjectClick = (subjectId: number) => {
    setLocation(`/ai-learning-studio/subject/${subjectId}`);
  };

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

      <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredSubjects.map((subject) => (
          <Card
            key={subject.id}
            className="overflow-hidden hover-elevate cursor-pointer transition-all"
            onClick={() => handleSubjectClick(subject.id)}
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
    </div>
  );
}

// AITutorTab component removed - not currently used
// Can be re-added if needed when implementing AI Tutor as a learning method

export default function AILearningStudioPage() {
  const [match, params] = useRoute<{ subjectId: string }>("/ai-learning-studio/subject/:subjectId");
  
  // Check if we're on a subject detail page
  if (match && params?.subjectId) {
    const subjectId = parseInt(params.subjectId, 10);
    if (!isNaN(subjectId)) {
      return <SubjectDetailView subjectId={subjectId} />;
    }
  }

  // Show subjects view directly (no tabs)
  return (
    <div className="h-[calc(100vh-3.5rem)] overflow-auto">
      <SubjectsTab />
    </div>
  );
}
