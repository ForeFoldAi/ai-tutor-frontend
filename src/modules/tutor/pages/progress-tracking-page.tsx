import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchProgressAnalytics } from "@/api/tutor-progress-analytics";
import { AtRiskStudentsCard } from "@/modules/tutor/components/progress-analytics/at-risk-students-card";
import { ClassHealthScoreCard } from "@/modules/tutor/components/progress-analytics/class-health-score-card";
import { CompletionTrendCard } from "@/modules/tutor/components/progress-analytics/completion-trend-card";
import { TopicMasteryCard } from "@/modules/tutor/components/progress-analytics/topic-mastery-card";
import { StudentResultsPanel } from "@/modules/tutor/components/student-results/student-results-panel";
import { DataState } from "@/modules/shared/components/data-state";
import { cn } from "@/lib/utils";

type ProgressTab = "analytics" | "results";

function readProgressTab(): ProgressTab {
  return new URLSearchParams(window.location.search).get("tab") === "results"
    ? "results"
    : "analytics";
}

export default function TutorProgressTrackingPage() {
  const [, setLocation] = useLocation();
  const [tab, setTabState] = useState<ProgressTab>(readProgressTab);

  const analyticsQuery = useQuery({
    queryKey: ["tutor", "progress", "analytics"],
    queryFn: fetchProgressAnalytics,
    enabled: tab === "analytics",
  });

  const setTab = (value: string) => {
    const next: ProgressTab = value === "results" ? "results" : "analytics";
    setTabState(next);
    setLocation(next === "results" ? "/tutor/progress?tab=results" : "/tutor/progress");
  };

  const topicMastery = analyticsQuery.data?.topicMastery ?? [];
  const atRiskStudents = analyticsQuery.data?.atRiskStudents ?? [];

  return (
    <div
      className={cn(
        "dashboard-fit flex min-h-0 flex-1 flex-col gap-2 p-3 md:p-4",
        tab === "results" ? "overflow-hidden" : "overflow-y-auto",
      )}
    >
      <div className="shrink-0 space-y-2">
        <div className="space-y-0.5">
          <h1 className="text-xl font-bold leading-tight text-blue-900 dark:text-blue-100 sm:text-2xl">
            Progress Analytics
          </h1>
          <p className="text-sm text-muted-foreground">
            Track class health, topic mastery, and assignment results.
          </p>
        </div>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="h-auto w-fit gap-6 rounded-none border-b border-border/60 bg-transparent p-0">
            <TabsTrigger
              value="analytics"
              className="rounded-none border-b-2 border-transparent px-1 pb-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
            >
              Analytics
            </TabsTrigger>
            <TabsTrigger
              value="results"
              className="rounded-none border-b-2 border-transparent px-1 pb-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
            >
              Student Results
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {tab === "analytics" ? (
        <DataState
          loading={analyticsQuery.isLoading}
          error={analyticsQuery.error ? String(analyticsQuery.error) : null}
          empty={!analyticsQuery.isLoading && !analyticsQuery.error && !analyticsQuery.data}
          emptyText="No analytics yet."
          onRetry={() => void analyticsQuery.refetch()}
        >
          {analyticsQuery.data ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4">
              <ClassHealthScoreCard metrics={analyticsQuery.data.classHealth} />
              <TopicMasteryCard
                topics={topicMastery.slice(0, 4)}
                allTopics={topicMastery}
              />
              <CompletionTrendCard data={analyticsQuery.data.completionTrend} />
              <AtRiskStudentsCard
                students={atRiskStudents.slice(0, 4)}
                allStudents={atRiskStudents}
              />
            </div>
          ) : null}
        </DataState>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <StudentResultsPanel />
        </div>
      )}
    </div>
  );
}
