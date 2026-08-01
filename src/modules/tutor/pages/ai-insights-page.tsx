import { useQuery } from "@tanstack/react-query";
import { getLiaClassInsights } from "@/api/lia";
import { AffectedStudentsCard } from "@/modules/tutor/components/ai-insights/affected-students-card";
import { QuickActionsCard } from "@/modules/tutor/components/ai-insights/quick-actions-card";
import { SuggestedInterventionsCard } from "@/modules/tutor/components/ai-insights/suggested-interventions-card";
import { WeakTopicsCard } from "@/modules/tutor/components/ai-insights/weak-topics-card";
import { AI_INSIGHTS_PREVIEW_LIMIT } from "@/modules/tutor/components/ai-insights/card-styles";
import { DEMO_QUICK_ACTIONS } from "@/modules/tutor/data/demo-ai-insights";
import { mapLiaClassInsights } from "@/modules/tutor/utils/lia-helpers";
import { DataState } from "@/modules/shared/components/data-state";
import { PageShell } from "@/components/page-shell";

export default function TutorAIInsightsPage() {
  const insightsQuery = useQuery({
    queryKey: ["lia", "class-insights"],
    queryFn: getLiaClassInsights,
  });

  const mapped = insightsQuery.data ? mapLiaClassInsights(insightsQuery.data) : null;
  const weakPreview = mapped?.weakTopics.slice(0, AI_INSIGHTS_PREVIEW_LIMIT) ?? [];
  const affectedPreview = mapped?.affectedStudents.slice(0, AI_INSIGHTS_PREVIEW_LIMIT) ?? [];
  const interventionPreview = mapped?.interventions.slice(0, AI_INSIGHTS_PREVIEW_LIMIT) ?? [];
  const quickActionPreview = DEMO_QUICK_ACTIONS.slice(0, AI_INSIGHTS_PREVIEW_LIMIT);

  return (
    <PageShell
      className="relative bg-gradient-to-br from-violet-50 via-indigo-50/80 to-violet-100 dark:from-slate-950 dark:via-indigo-950/40 dark:to-violet-950/30"
      contentClassName="relative z-10"
    >
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden>
        <div className="absolute right-0 top-1/4 h-64 w-64 rounded-full bg-violet-300/45 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-56 w-56 rounded-full bg-indigo-300/40 blur-3xl" />
      </div>

      <div className="space-y-0.5">
        <h1 className="text-xl font-bold leading-tight text-blue-900 dark:text-blue-100 sm:text-2xl">
          AI Insights
        </h1>
        <p className="text-sm text-muted-foreground">
          LIA-powered insights from student learning patterns — weak topics, at-risk students, and
          recommended interventions.
        </p>
      </div>

      <DataState
        loading={insightsQuery.isLoading}
        error={insightsQuery.error ? String(insightsQuery.error) : null}
        empty={Boolean(mapped && !mapped.weakTopics.length && !mapped.affectedStudents.length)}
        emptyText="No LIA insights yet. Insights appear after students use the AI tutor."
        onRetry={() => void insightsQuery.refetch()}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          <WeakTopicsCard
            topics={weakPreview}
            allTopics={mapped?.weakTopics ?? []}
          />
          <AffectedStudentsCard
            students={affectedPreview}
            allStudents={mapped?.affectedStudents ?? []}
          />
          <SuggestedInterventionsCard
            interventions={interventionPreview}
            allInterventions={mapped?.interventions ?? []}
          />
          <QuickActionsCard actions={quickActionPreview} allActions={DEMO_QUICK_ACTIONS} />
        </div>
      </DataState>
    </PageShell>
  );
}
