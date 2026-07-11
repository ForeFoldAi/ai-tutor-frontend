import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LessonPlanTabContent } from "@/modules/tutor/components/lesson-planner/lesson-plan-tab-content";
import type { GeneratedLessonPlan, LessonPlanTab } from "@/modules/tutor/types/lesson-planner";

const TAB_ITEMS: { value: LessonPlanTab; label: string }[] = [
  { value: "lesson-plan", label: "Lesson Plan" },
  { value: "teaching-notes", label: "Teaching Notes" },
  { value: "examples", label: "Examples" },
  { value: "worksheet", label: "Worksheet" },
  { value: "quiz", label: "Quiz" },
  { value: "homework", label: "Homework" },
  { value: "ppt-outline", label: "PPT Outline" },
];

const EMPTY_MESSAGE =
  "Configure your lesson on the left and click Generate to see your AI lesson plan here.";

interface GeneratedLessonPanelProps {
  plan: GeneratedLessonPlan | null;
  isSaved: boolean;
}

export function GeneratedLessonPanel({ plan, isSaved }: GeneratedLessonPanelProps) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border/60 px-5 py-4">
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

      <Tabs defaultValue="lesson-plan" className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="shrink-0 border-b border-border/60 px-5 pt-4">
          <TabsList className="h-auto w-full flex-wrap justify-start gap-4 bg-transparent p-0 pb-0">
            {TAB_ITEMS.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="rounded-none border-b-2 border-transparent px-1 pb-2.5 pt-0 text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <TabsContent value="lesson-plan" className="mt-0 space-y-4">
            {plan ? (
              <ol className="space-y-4">
                {plan.phases.map((phase, index) => (
                  <li key={phase.title} className="flex gap-3.5 text-sm">
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

          {TAB_ITEMS.filter((tab) => tab.value !== "lesson-plan").map((tab) => (
            <TabsContent key={tab.value} value={tab.value} className="mt-0">
              <LessonPlanTabContent tab={tab.value} plan={plan} />
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </div>
  );
}
