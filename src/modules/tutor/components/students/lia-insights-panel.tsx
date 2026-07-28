import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Brain, Lightbulb, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getLiaKnowledgeMap, getLiaTeacherSummary } from "@/api/lia";
import { DataState } from "@/modules/shared/components/data-state";
import { cn } from "@/lib/utils";
import { humanizeConceptKey } from "@/modules/tutor/utils/lia-helpers";
import { riskBadgeClass } from "@/modules/tutor/utils/student-helpers";
import type { RiskLevel } from "@/modules/tutor/types/student-profile";

interface LiaInsightsPanelProps {
  studentId: string;
  className?: string;
}

function normalizeRisk(level: string): RiskLevel {
  const key = level.toLowerCase().replace(/_/g, " ");
  if (key === "not started") return "Not Started";
  if (key === "high") return "High";
  if (key === "medium") return "Medium";
  if (key === "low") return "Low";
  return "Not Started";
}

export function LiaInsightsPanel({ studentId, className }: LiaInsightsPanelProps) {
  const summaryQuery = useQuery({
    queryKey: ["lia", "teacher-summary", studentId],
    queryFn: () => getLiaTeacherSummary(studentId),
    enabled: Boolean(studentId),
  });

  const mapQuery = useQuery({
    queryKey: ["lia", "knowledge-map", studentId],
    queryFn: () => getLiaKnowledgeMap(studentId),
    enabled: Boolean(studentId),
  });

  const loading = summaryQuery.isLoading || mapQuery.isLoading;
  const error = summaryQuery.error || mapQuery.error;

  return (
    <Card className={cn("lg:col-span-3", className)}>
      <CardHeader className="space-y-1 border-b border-slate-200 pb-3 dark:border-slate-700">
        <CardTitle className="flex items-center gap-2 text-base text-blue-900 dark:text-blue-100">
          <Brain className="h-4 w-4 text-primary" />
          Learning Intelligence (LIA)
        </CardTitle>
        <CardDescription>AI-generated observations and knowledge map</CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <DataState
          loading={loading}
          error={error ? String(error) : null}
          empty={!summaryQuery.data && !mapQuery.data && !loading}
          emptyText="LIA insights will appear after the student interacts with the AI tutor."
          onRetry={() => {
            void summaryQuery.refetch();
            void mapQuery.refetch();
          }}
        >
          {summaryQuery.data ? (
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="space-y-4 rounded-xl border border-slate-200 bg-muted/20 p-4 dark:border-slate-700 lg:col-span-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Risk level</span>
                  <Badge
                    variant="outline"
                    className={riskBadgeClass(normalizeRisk(summaryQuery.data.risk_level))}
                  >
                    {normalizeRisk(summaryQuery.data.risk_level)}
                  </Badge>
                </div>
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-sm font-medium">
                    <Lightbulb className="h-3.5 w-3.5 text-amber-600" />
                    Observations
                  </p>
                  <ul className="space-y-1.5 text-sm text-muted-foreground">
                    {summaryQuery.data.observations.length === 0 ? (
                      <li>No observations yet.</li>
                    ) : (
                      summaryQuery.data.observations.map((item) => <li key={item}>{item}</li>)
                    )}
                  </ul>
                </div>
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-sm font-medium">
                    <Target className="h-3.5 w-3.5 text-primary" />
                    Recommendations
                  </p>
                  <ul className="space-y-1.5 text-sm text-muted-foreground">
                    {summaryQuery.data.recommendations.length === 0 ? (
                      <li>No recommendations yet.</li>
                    ) : (
                      summaryQuery.data.recommendations.map((item) => (
                        <li key={item}>• {item}</li>
                      ))
                    )}
                  </ul>
                </div>
              </div>

              {mapQuery.data ? (
                <>
                  <div className="space-y-3 rounded-xl border border-slate-200 bg-muted/20 p-4 dark:border-slate-700 lg:col-span-1">
                    <p className="text-sm font-medium">Weak concepts</p>
                    {mapQuery.data.concepts.filter((c) => c.mastery_score < 0.55).length === 0 ? (
                      <p className="text-sm text-muted-foreground">No weak concepts detected yet.</p>
                    ) : (
                      mapQuery.data.concepts
                        .filter((c) => c.mastery_score < 0.55)
                        .slice(0, 5)
                        .map((concept) => (
                          <div key={concept.concept_key} className="space-y-1">
                            <div className="flex items-center justify-between gap-2 text-sm">
                              <span className="min-w-0 truncate">
                                {humanizeConceptKey(concept.concept_key)}
                              </span>
                              <span className="shrink-0 font-medium tabular-nums text-rose-600">
                                {Math.round(concept.mastery_score * 100)}%
                              </span>
                            </div>
                            <Progress value={concept.mastery_score * 100} className="h-1.5" />
                          </div>
                        ))
                    )}
                  </div>

                  <div className="space-y-3 rounded-xl border border-slate-200 bg-muted/20 p-4 dark:border-slate-700 lg:col-span-1">
                    <p className="flex items-center gap-1.5 text-sm font-medium">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                      Knowledge gaps
                    </p>
                    {mapQuery.data.knowledge_gaps.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No knowledge gaps flagged.</p>
                    ) : (
                      mapQuery.data.knowledge_gaps.slice(0, 5).map((gap) => (
                        <div
                          key={`${gap.concept_key}-${gap.gap_type}`}
                          className="rounded-lg border border-slate-200 bg-background px-3 py-2 text-sm dark:border-slate-700"
                        >
                          <p className="font-medium">{humanizeConceptKey(gap.concept_key)}</p>
                          <p className="text-xs capitalize text-muted-foreground">
                            {gap.gap_type.replace(/_/g, " ")}
                          </p>
                        </div>
                      ))
                    )}
                    {mapQuery.data.misconceptions.length > 0 ? (
                      <>
                        <p className="pt-2 text-sm font-medium">Misconceptions</p>
                        {mapQuery.data.misconceptions.slice(0, 3).map((m) => (
                          <p key={m.misconception_key} className="text-sm text-muted-foreground">
                            {m.description}
                          </p>
                        ))}
                      </>
                    ) : null}
                  </div>
                </>
              ) : null}
            </div>
          ) : null}
        </DataState>
      </CardContent>
    </Card>
  );
}
