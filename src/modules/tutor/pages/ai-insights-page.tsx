import { AffectedStudentsCard } from "@/modules/tutor/components/ai-insights/affected-students-card";
import { QuickActionsCard } from "@/modules/tutor/components/ai-insights/quick-actions-card";
import { SuggestedInterventionsCard } from "@/modules/tutor/components/ai-insights/suggested-interventions-card";
import { WeakTopicsCard } from "@/modules/tutor/components/ai-insights/weak-topics-card";
import {
  DEMO_AFFECTED_STUDENTS,
  DEMO_AFFECTED_STUDENTS_PREVIEW,
  DEMO_QUICK_ACTIONS,
  DEMO_SUGGESTED_INTERVENTIONS,
  DEMO_SUGGESTED_INTERVENTIONS_PREVIEW,
  DEMO_WEAK_TOPICS,
  DEMO_WEAK_TOPICS_PREVIEW,
} from "@/modules/tutor/data/demo-ai-insights";

export default function TutorAIInsightsPage() {
  return (
    <div className="dashboard-fit relative flex min-h-0 flex-1 flex-col gap-3 overflow-hidden bg-gradient-to-br from-violet-50 via-indigo-50/80 to-violet-100 p-4 md:p-5 dark:from-slate-950 dark:via-indigo-950/40 dark:to-violet-950/30">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute right-0 top-1/4 h-64 w-64 rounded-full bg-violet-300/45 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-56 w-56 rounded-full bg-indigo-300/40 blur-3xl" />
      </div>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col gap-3">
        <div className="shrink-0">
          <h1 className="text-2xl font-bold text-blue-900 dark:text-blue-100">AI Insights</h1>
          <p className="text-sm text-muted-foreground">
            Review AI-generated insights about student performance and learning gaps.
          </p>
        </div>

        <div className="grid min-h-0 flex-1 gap-3 overflow-y-auto xl:grid-cols-2 xl:grid-rows-2 xl:gap-4 xl:overflow-hidden">
          <WeakTopicsCard topics={DEMO_WEAK_TOPICS_PREVIEW} allTopics={DEMO_WEAK_TOPICS} />
          <AffectedStudentsCard
            students={DEMO_AFFECTED_STUDENTS_PREVIEW}
            allStudents={DEMO_AFFECTED_STUDENTS}
          />
          <SuggestedInterventionsCard
            interventions={DEMO_SUGGESTED_INTERVENTIONS_PREVIEW}
            allInterventions={DEMO_SUGGESTED_INTERVENTIONS}
          />
          <QuickActionsCard actions={DEMO_QUICK_ACTIONS} />
        </div>
      </div>
    </div>
  );
}
