import { useTutorData } from "@/modules/tutor/hooks/use-tutor-data";
import { AtRiskStudentsCard } from "@/modules/tutor/components/progress-analytics/at-risk-students-card";
import { ClassHealthScoreCard } from "@/modules/tutor/components/progress-analytics/class-health-score-card";
import { CompletionTrendCard } from "@/modules/tutor/components/progress-analytics/completion-trend-card";
import { TopicMasteryCard } from "@/modules/tutor/components/progress-analytics/topic-mastery-card";
import {
  DEMO_AT_RISK_STUDENTS,
  DEMO_AT_RISK_STUDENTS_PREVIEW,
  DEMO_CLASS_HEALTH,
  DEMO_COMPLETION_TREND,
  DEMO_TOPIC_MASTERY,
  DEMO_TOPIC_MASTERY_PREVIEW,
} from "@/modules/tutor/data/demo-progress-analytics";

export default function TutorProgressTrackingPage() {
  const { progressQuery } = useTutorData();
  const apiScore = progressQuery.data?.averageCompletion;

  const classHealth = {
    ...DEMO_CLASS_HEALTH,
    score: apiScore ?? DEMO_CLASS_HEALTH.score,
  };

  return (
    <div className="dashboard-fit flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-5">
      <div className="shrink-0">
        <h1 className="text-2xl font-bold text-blue-900 dark:text-blue-100">Progress Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Track class health, topic mastery, and students who need attention.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-4">
        <ClassHealthScoreCard metrics={classHealth} />
        <TopicMasteryCard topics={DEMO_TOPIC_MASTERY_PREVIEW} allTopics={DEMO_TOPIC_MASTERY} />
        <CompletionTrendCard data={DEMO_COMPLETION_TREND} />
        <AtRiskStudentsCard students={DEMO_AT_RISK_STUDENTS_PREVIEW} allStudents={DEMO_AT_RISK_STUDENTS} />
      </div>
    </div>
  );
}
