import { useState } from "react";
import { Download, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GeneratedLessonPanel } from "@/modules/tutor/components/lesson-planner/generated-lesson-panel";
import { LessonPlanForm } from "@/modules/tutor/components/lesson-planner/lesson-plan-form";
import { SavedLessonPlansTable } from "@/modules/tutor/components/lesson-planner/saved-lesson-plans-table";
import {
  DEFAULT_LESSON_FORM,
  DEMO_GENERATED_PLAN,
  DEMO_SAVED_LESSON_PLANS,
} from "@/modules/tutor/data/demo-lesson-plans";
import type { GeneratedLessonPlan, LessonPlanFormValues } from "@/modules/tutor/types/lesson-planner";

export default function TutorLessonPlannerPage() {
  const [formValues, setFormValues] = useState<LessonPlanFormValues>(DEFAULT_LESSON_FORM);
  const [generatedPlan, setGeneratedPlan] = useState<GeneratedLessonPlan | null>(DEMO_GENERATED_PLAN);
  const [isSaved, setIsSaved] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = () => {
    setIsGenerating(true);
    setIsSaved(false);
    window.setTimeout(() => {
      setGeneratedPlan(DEMO_GENERATED_PLAN);
      setIsGenerating(false);
    }, 600);
  };

  return (
    <div className="dashboard-fit flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-4 md:p-5">
      <div className="flex shrink-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-blue-900 dark:text-blue-100">Lesson Planner</h1>
          <p className="text-sm text-muted-foreground">
            Plan lessons, worksheets, and revision topics for your classes.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 border-primary/30 text-primary"
            disabled={!generatedPlan}
          >
            <Download className="h-3.5 w-3.5" />
            Download
          </Button>
          <Button
            size="sm"
            className="gap-1.5 bg-primary"
            disabled={!generatedPlan}
            onClick={() => setIsSaved(true)}
          >
            <Save className="h-3.5 w-3.5" />
            Save Lesson
          </Button>
        </div>
      </div>

      <Tabs defaultValue="plan" className="flex min-h-0 flex-1 flex-col gap-3">
        <TabsList className="h-auto w-fit shrink-0 gap-6 rounded-none border-b border-border/60 bg-transparent p-0">
          <TabsTrigger
            value="plan"
            className="rounded-none border-b-2 border-transparent px-1 pb-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
          >
            Plan Lesson
          </TabsTrigger>
          <TabsTrigger
            value="saved"
            className="rounded-none border-b-2 border-transparent px-1 pb-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
          >
            Saved Lessons
          </TabsTrigger>
        </TabsList>

        <TabsContent value="plan" className="mt-0 min-h-0 flex-1 overflow-hidden">
          <div className="grid h-full min-h-0 gap-4 overflow-hidden lg:grid-cols-[30%_minmax(0,1fr)]">
            <div className="min-h-0 overflow-hidden">
              <LessonPlanForm
                values={formValues}
                onChange={setFormValues}
                onGenerate={handleGenerate}
                isGenerating={isGenerating}
              />
            </div>

            <div className="min-h-0 overflow-hidden">
              <GeneratedLessonPanel plan={generatedPlan} isSaved={isSaved} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="saved" className="mt-0 min-h-0 flex-1 overflow-hidden">
          <SavedLessonPlansTable plans={DEMO_SAVED_LESSON_PLANS} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
