import { Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LessonPlanMarkdownView } from "@/modules/tutor/components/lesson-planner/lesson-plan-markdown-view";
import { LessonPlanTabContent } from "@/modules/tutor/components/lesson-planner/lesson-plan-tab-content";
import type { GeneratedLessonPlan, LessonPlanTab } from "@/modules/tutor/types/lesson-planner";
import type { AssignableArtifactType } from "@/api/assignments";

const TAB_ITEMS: { value: LessonPlanTab; label: string }[] = [
  { value: "lesson-plan", label: "Lesson Plan" },
  { value: "teaching-notes", label: "Teaching Notes" },
  { value: "examples", label: "Examples" },
  { value: "worksheet", label: "Worksheet" },
  { value: "quiz", label: "Quiz" },
  { value: "homework", label: "Homework" },
  { value: "ppt-outline", label: "PPT Outline" },
];

const TAB_ARTIFACT: Partial<Record<LessonPlanTab, string>> = {
  "lesson-plan": "lesson_plan",
  "teaching-notes": "teaching_notes",
  examples: "examples",
  worksheet: "worksheet",
  quiz: "quiz",
  homework: "homework",
  "ppt-outline": "ppt_outline",
};

const ASSIGNABLE_TABS: Partial<Record<LessonPlanTab, AssignableArtifactType>> = {
  worksheet: "worksheet",
  quiz: "quiz",
  homework: "homework",
};

const EMPTY_MESSAGE =
  "Configure your lesson on the left and click Generate to see your AI lesson plan here.";

interface GeneratedLessonPanelProps {
  plan: GeneratedLessonPlan | null;
  isSaved: boolean;
  isGenerating?: boolean;
  progress?: number;
  progressMessage?: string;
  completedArtifacts?: string[];
  error?: string | null;
  canAssign?: boolean;
  assignedArtifacts?: AssignableArtifactType[];
  onAssignArtifact?: (type: AssignableArtifactType) => void;
}

export function GeneratedLessonPanel({
  plan,
  isSaved,
  isGenerating,
  progress = 0,
  progressMessage,
  completedArtifacts = [],
  error,
  canAssign,
  assignedArtifacts = [],
  onAssignArtifact,
}: GeneratedLessonPanelProps) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border/70 bg-card shadow-card">
      <div className="flex shrink-0 flex-col gap-3 border-b border-border/60 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-blue-900 dark:text-blue-100">Generated Lesson Plan</h2>
          <Badge
            variant="outline"
            className={
              isSaved
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-red-200 bg-red-50 text-red-600"
            }
          >
            {isSaved ? "Saved" : "Draft not saved"}
          </Badge>
        </div>
        {isGenerating || (progress > 0 && progress < 100) ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{progressMessage || "Generating…"}</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        ) : null}
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>

      <Tabs defaultValue="lesson-plan" className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="shrink-0 border-b border-border/60 px-5 pt-4">
          <TabsList className="h-auto w-full flex-wrap justify-start gap-4 bg-transparent p-0 pb-0">
            {TAB_ITEMS.map((tab) => {
              const artifact = TAB_ARTIFACT[tab.value];
              const done = artifact ? completedArtifacts.includes(artifact) : false;
              return (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="rounded-none border-b-2 border-transparent px-1 pb-2.5 pt-0 text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
                >
                  {tab.label}
                  {done ? <span className="ml-1 text-emerald-600">✓</span> : null}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <TabsContent value="lesson-plan" className="mt-0 space-y-4">
            {plan?.lessonPlanMarkdown ? (
              <LessonPlanMarkdownView markdown={plan.lessonPlanMarkdown} />
            ) : plan?.phases?.length ? (
              <ol className="space-y-4">
                {plan.phases.map((phase, index) => (
                  <li key={`${phase.title}-${index}`} className="flex gap-3.5 text-sm">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {index + 1}
                    </span>
                    <div className="space-y-1">
                      <p className="font-semibold text-foreground">
                        {phase.title}{" "}
                        <span className="font-normal text-muted-foreground">({phase.duration})</span>
                      </p>
                      <p className="leading-relaxed text-muted-foreground">{phase.description}</p>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm leading-relaxed text-muted-foreground">{EMPTY_MESSAGE}</p>
            )}
          </TabsContent>

          {TAB_ITEMS.filter((tab) => tab.value !== "lesson-plan").map((tab) => {
            const assignType = ASSIGNABLE_TABS[tab.value];
            const alreadyAssigned = assignType ? assignedArtifacts.includes(assignType) : false;
            return (
              <TabsContent key={tab.value} value={tab.value} className="mt-0 space-y-3">
                {assignType ? (
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">
                      {alreadyAssigned
                        ? "This was already assigned to your class."
                        : canAssign
                          ? `Assign this ${tab.label.toLowerCase()} to your class.`
                          : "Save the lesson first to assign."}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      disabled={alreadyAssigned || !canAssign || !onAssignArtifact}
                      onClick={() => onAssignArtifact?.(assignType)}
                    >
                      <Send className="h-3.5 w-3.5" />
                      {alreadyAssigned ? "Already assigned" : `Assign ${tab.label}`}
                    </Button>
                  </div>
                ) : null}
                <LessonPlanTabContent tab={tab.value as Exclude<LessonPlanTab, "lesson-plan">} plan={plan} />
              </TabsContent>
            );
          })}
        </div>
      </Tabs>
    </div>
  );
}
