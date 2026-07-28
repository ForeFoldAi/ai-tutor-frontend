import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query";
import {
  createTutorAssignments,
  previewAssignmentMatch,
  type AssignableArtifactType,
} from "@/api/assignments";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { invalidateManyAndBroadcast } from "@/lib/query-broadcast";
import type { GeneratedLessonPlan } from "@/modules/tutor/types/lesson-planner";

const ARTIFACT_LABELS: Record<AssignableArtifactType, string> = {
  worksheet: "Worksheet",
  quiz: "Quiz",
  homework: "Homework",
};

function availableArtifacts(plan: GeneratedLessonPlan | null): AssignableArtifactType[] {
  if (!plan) return [];
  const out: AssignableArtifactType[] = [];
  if (plan.worksheetMarkdown || (plan.worksheet && plan.worksheet.length > 0)) out.push("worksheet");
  if (plan.quizMarkdown || (plan.quiz && plan.quiz.length > 0)) out.push("quiz");
  if (plan.homeworkMarkdown || (plan.homework && plan.homework.length > 0)) out.push("homework");
  return out;
}

function defaultDeadlineLocal(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

interface AssignArtifactsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lessonPlanId: string | null;
  plan: GeneratedLessonPlan | null;
  grade: string;
  sections: string[];
  curriculum: string;
  subject: string;
  initialTypes?: AssignableArtifactType[];
  assignedArtifacts?: AssignableArtifactType[];
}

export function AssignArtifactsDialog({
  open,
  onOpenChange,
  lessonPlanId,
  plan,
  grade,
  sections,
  curriculum,
  subject,
  initialTypes,
  assignedArtifacts = [],
}: AssignArtifactsDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const available = useMemo(() => availableArtifacts(plan), [plan]);
  const already = useMemo(() => new Set(assignedArtifacts), [assignedArtifacts]);
  const assignable = useMemo(
    () => available.filter((t) => !already.has(t)),
    [available, already],
  );
  const [selected, setSelected] = useState<AssignableArtifactType[]>([]);
  const [deadline, setDeadline] = useState(defaultDeadlineLocal);

  useEffect(() => {
    if (!open) return;
    const seed =
      initialTypes?.filter((t) => assignable.includes(t)) ??
      assignable;
    setSelected(seed.length ? seed : assignable);
    setDeadline(defaultDeadlineLocal());
  }, [open, assignable, initialTypes]);

  const matchQueries = useQueries({
    queries: sections.map((section) => ({
      queryKey: ["assignments", "preview-match", grade, section, curriculum, subject, open],
      queryFn: () =>
        previewAssignmentMatch({
          grade,
          section,
          curriculum: curriculum || undefined,
          subject: subject || undefined,
        }),
      enabled: open && Boolean(grade && section),
    })),
  });

  const matched = matchQueries.reduce((sum, q) => sum + (q.data?.matched_count ?? 0), 0);
  const matchLoading = matchQueries.some((q) => q.isLoading);

  const assignMutation = useMutation({
    mutationFn: async (payload: {
      lesson_plan_id: number;
      artifact_types: AssignableArtifactType[];
      deadline: string;
      grade: string;
      sections: string[];
      curriculum?: string;
      subject?: string;
    }) => {
      const results = [];
      for (const section of payload.sections) {
        results.push(
          await createTutorAssignments({
            lesson_plan_id: payload.lesson_plan_id,
            artifact_types: payload.artifact_types,
            deadline: payload.deadline,
            grade: payload.grade,
            section,
            curriculum: payload.curriculum,
            subject: payload.subject,
          }),
        );
      }
      const created = results.flatMap((r) => r.created);
      return {
        created,
        message: `Assigned to ${payload.sections.length} section${payload.sections.length === 1 ? "" : "s"} (${created.length} artifact${created.length === 1 ? "" : "s"}).`,
      };
    },
    onSuccess: (res) => {
      void invalidateManyAndBroadcast(queryClient, ["assignments"]);
      toast({ title: "Assigned", description: res.message });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast({
        title: "Could not assign",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const toggle = (type: AssignableArtifactType, checked: boolean) => {
    if (already.has(type)) return;
    setSelected((prev) =>
      checked ? [...new Set([...prev, type])] : prev.filter((t) => t !== type),
    );
  };

  const handleAssign = () => {
    if (!lessonPlanId || !selected.length || !sections.length) return;
    const iso = new Date(deadline).toISOString();
    assignMutation.mutate({
      lesson_plan_id: Number(lessonPlanId),
      artifact_types: selected,
      deadline: iso,
      grade,
      sections,
      curriculum: curriculum || undefined,
      subject: subject || undefined,
    });
  };

  const gradeLabel = String(grade).replace(/^CLASS_/, "");
  const sectionsLabel = sections.join(", ");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign to class</DialogTitle>
          <DialogDescription>
            Set a deadline and assign Worksheet, Quiz, or Homework to matching students.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <p className="text-sm text-muted-foreground">
            {grade && sections.length
              ? `${matchLoading ? "…" : matched} student${matched === 1 ? "" : "s"} match Grade ${gradeLabel} · Section${sections.length > 1 ? "s" : ""} ${sectionsLabel}${
                  curriculum ? ` · ${curriculum}` : ""
                }${subject ? ` · ${subject}` : ""}.`
              : "Select at least one class section on the lesson form first."}
          </p>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Artifacts</Label>
            {available.length === 0 ? (
              <p className="text-sm text-destructive">No worksheet, quiz, or homework content to assign.</p>
            ) : (
              <div className="space-y-2">
                {available.map((type) => {
                  const isAssigned = already.has(type);
                  return (
                    <label
                      key={type}
                      className={`flex items-center gap-2 text-sm ${isAssigned ? "text-muted-foreground" : ""}`}
                    >
                      <Checkbox
                        checked={isAssigned || selected.includes(type)}
                        disabled={isAssigned}
                        onCheckedChange={(v) => toggle(type, Boolean(v))}
                      />
                      {ARTIFACT_LABELS[type]}
                      {isAssigned ? (
                        <span className="text-xs text-muted-foreground">— Already assigned</span>
                      ) : null}
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="assign-deadline">Deadline</Label>
            <Input
              id="assign-deadline"
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="h-10"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={
              !lessonPlanId ||
              !selected.length ||
              !grade ||
              !sections.length ||
              matched === 0 ||
              assignMutation.isPending
            }
          >
            {assignMutation.isPending ? "Assigning…" : "Assign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
