import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getStudentAssignment,
  startStudentAssignment,
  submitStudentAssignment,
  type AssignmentContentItem,
  type StudentAssignmentDetail,
} from "@/api/assignments";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DataState } from "@/modules/shared/components/data-state";
import { PageShell } from "@/components/page-shell";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

function itemPrompt(item: AssignmentContentItem): string {
  if (item.title && item.description) return `${item.title}: ${item.description}`;
  return item.question || item.title || item.description || `Question ${item.number}`;
}

function ResultView({ detail }: { detail: StudentAssignmentDetail }) {
  const items = detail.result?.items ?? [];
  const isQuiz = detail.artifact_type === "quiz";
  const showScore =
    isQuiz && detail.score != null && detail.max_score != null;
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="rounded-xl border border-border/70 bg-card p-4">
        <p className="text-sm font-semibold text-foreground">{detail.title}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {showScore
            ? `Score: ${detail.score} / ${detail.max_score}`
            : detail.status === "submitted" || detail.status === "graded"
              ? "Submitted"
              : "Completed"}
        </p>
      </div>
      <ul className="space-y-3">
        {items.map((row) => (
          <li key={row.id} className="rounded-xl border border-border/70 bg-card p-4 text-sm">
            <div className="flex items-start gap-2">
              {isQuiz && row.is_correct != null ? (
                row.is_correct ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                ) : (
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                )
              ) : null}
              <div className="min-w-0 space-y-1">
                <p className="font-medium">{row.question}</p>
                <p className="text-muted-foreground">Your answer: {row.student_answer || "—"}</p>
                {isQuiz && row.correct_answer != null && row.correct_answer !== "" ? (
                  <p className="font-medium text-emerald-700 dark:text-emerald-400">
                    Correct answer: {row.correct_answer}
                  </p>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function AssignmentTakePage() {
  const params = useParams<{ id: string }>();
  const assignmentId = Number(params.id);
  const { toast } = useToast();
  const qc = useQueryClient();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [started, setStarted] = useState(false);

  const detailQuery = useQuery({
    queryKey: ["student", "assignments", assignmentId],
    queryFn: () => getStudentAssignment(assignmentId),
    enabled: Number.isFinite(assignmentId),
  });

  const startMutation = useMutation({
    mutationFn: () => startStudentAssignment(assignmentId),
    onSuccess: (data) => {
      setStarted(true);
      void qc.setQueryData(["student", "assignments", assignmentId], data);
    },
    onError: (err: Error) => {
      toast({ title: "Could not start", description: err.message, variant: "destructive" });
    },
  });

  const submitMutation = useMutation({
    mutationFn: () => submitStudentAssignment(assignmentId, answers),
    onSuccess: async (data) => {
      void qc.setQueryData(["student", "assignments", assignmentId], data);
      await qc.invalidateQueries({ queryKey: ["student", "assignments"] });
      toast({ title: "Submitted" });
    },
    onError: (err: Error) => {
      toast({ title: "Submit failed", description: err.message, variant: "destructive" });
    },
  });

  const detail = detailQuery.data;
  const done =
    detail?.status === "graded" || detail?.status === "submitted";
  const items = detail?.content?.items ?? [];

  useEffect(() => {
    if (!detail) return;
    if (detail.status === "in_progress" || done) setStarted(true);
    if (detail.answers) setAnswers(detail.answers);
  }, [detail?.id, detail?.status]);

  const canTake = started && !done && detail?.content;

  const title = useMemo(() => detail?.title ?? "Assignment", [detail?.title]);

  return (
    <PageShell size="standard" contentClassName="min-h-0 flex-1">
      <div className="flex shrink-0 flex-col gap-2">
        <Button asChild variant="ghost" size="sm" className="h-8 w-fit gap-1.5 px-2">
          <Link href="/assignments">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>
        <div className="flex min-w-0 items-start justify-between gap-2">
          <div className="min-w-0 space-y-0.5">
            <h1 className="text-xl font-bold text-blue-900 dark:text-blue-100 sm:text-2xl">
              {title}
            </h1>
            {detail ? (
              <p className="text-xs text-muted-foreground sm:text-sm">
                {detail.subject} · {detail.teacher_name} · {detail.artifact_type}
              </p>
            ) : null}
          </div>
          {detail ? (
            <Badge className="shrink-0 border-0 capitalize">{detail.status.replace("_", " ")}</Badge>
          ) : null}
        </div>
      </div>

      <DataState
        loading={detailQuery.isLoading}
        error={detailQuery.error ? String(detailQuery.error) : null}
        empty={false}
        emptyText="Assignment not found."
        onRetry={() => void detailQuery.refetch()}
      >
        <div className="min-h-0 flex-1 overflow-y-auto pb-6">
          {done && detail ? <ResultView detail={detail} /> : null}

          {!done && detail && !started ? (
            <div className="mx-auto max-w-lg space-y-4 rounded-xl border border-border/70 bg-card p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Answers are hidden until you finish. You can copy and paste while working.
              </p>
              <Button
                onClick={() => startMutation.mutate()}
                disabled={startMutation.isPending}
              >
                {startMutation.isPending ? "Starting…" : "Start assignment"}
              </Button>
            </div>
          ) : null}

          {canTake ? (
            <form
              className="mx-auto max-w-2xl space-y-5"
              onSubmit={(e) => {
                e.preventDefault();
                submitMutation.mutate();
              }}
            >
              {items.map((item) => {
                const prompt = itemPrompt(item);
                const value = answers[item.id] ?? "";
                return (
                  <div key={item.id} className="space-y-2 rounded-xl border border-border/70 bg-card p-4">
                    <Label className="text-sm font-medium leading-relaxed">
                      {item.number}. {prompt}
                    </Label>
                    {item.type === "mcq" && item.options?.length ? (
                      <div className="space-y-2">
                        {item.options.map((opt, idx) => {
                          const key = item.option_keys?.[idx] ?? String.fromCharCode(65 + idx);
                          const selected = value === key || value === opt;
                          return (
                            <button
                              key={`${item.id}-${key}`}
                              type="button"
                              className={cn(
                                "flex w-full items-start gap-2 rounded-lg border px-3 py-2 text-left text-sm",
                                selected
                                  ? "border-primary bg-primary/5"
                                  : "border-border/70 hover:bg-muted/40",
                              )}
                              onClick={() =>
                                setAnswers((prev) => ({ ...prev, [item.id]: key }))
                              }
                            >
                              <span className="font-semibold text-muted-foreground">{key}.</span>
                              <span>{opt}</span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <Textarea
                        value={value}
                        onChange={(e) =>
                          setAnswers((prev) => ({ ...prev, [item.id]: e.target.value }))
                        }
                        rows={3}
                        placeholder="Type your answer…"
                        className="resize-y"
                      />
                    )}
                  </div>
                );
              })}
              <div className="flex justify-end gap-2">
                <Button type="submit" disabled={submitMutation.isPending || items.length === 0}>
                  {submitMutation.isPending ? "Submitting…" : "Submit"}
                </Button>
              </div>
            </form>
          ) : null}
        </div>
      </DataState>
    </PageShell>
  );
}
