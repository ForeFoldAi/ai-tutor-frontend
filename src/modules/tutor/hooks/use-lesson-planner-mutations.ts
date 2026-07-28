import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  cancelLessonPlanJob,
  downloadLessonPlanExport,
  exportLessonPlan,
  getLessonPlanExport,
  saveLessonPlan,
  type ExportFormat,
  type LessonArtifactType,
} from "@/api/lesson-planner";
import { useToast } from "@/hooks/use-toast";
import { LESSON_PLANS_KEY, lessonPlanKey } from "@/modules/tutor/hooks/use-lesson-planner";

async function pollExportReady(exportId: string, attempts = 20, delayMs = 1500) {
  for (let i = 0; i < attempts; i += 1) {
    const exp = await getLessonPlanExport(exportId);
    if (exp.status === "completed") return exp;
    if (exp.status === "failed") throw new Error("Export failed");
    await new Promise((r) => window.setTimeout(r, delayMs));
  }
  throw new Error("Export timed out");
}

export function useLessonPlannerMutations() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const saveMutation = useMutation({
    mutationFn: saveLessonPlan,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LESSON_PLANS_KEY });
      toast({ title: "Lesson plan saved" });
    },
    onError: (err: Error) => toast({ title: "Save failed", description: err.message, variant: "destructive" }),
  });

  const exportMutation = useMutation({
    mutationFn: async ({
      lessonPlanId,
      format,
      artifactTypes,
      filename,
    }: {
      lessonPlanId: string;
      format: ExportFormat;
      artifactTypes: LessonArtifactType[];
      filename: string;
    }) => {
      const started = await exportLessonPlan({
        lesson_plan_id: lessonPlanId,
        export_format: format,
        artifact_types: artifactTypes,
      });
      const exp = await pollExportReady(started.export_id);
      return { exp, filename };
    },
    onSuccess: async ({ exp, filename }) => {
      await downloadLessonPlanExport(exp.export_id, filename);
      toast({ title: "Download started" });
    },
    onError: (err: Error) => toast({ title: "Export failed", description: err.message, variant: "destructive" }),
  });

  const cancelMutation = useMutation({
    mutationFn: cancelLessonPlanJob,
    onSuccess: () => toast({ title: "Generation cancelled" }),
  });

  const invalidatePlan = (planId: string) => {
    void qc.invalidateQueries({ queryKey: lessonPlanKey(planId) });
    void qc.invalidateQueries({ queryKey: LESSON_PLANS_KEY });
  };

  return {
    save: saveMutation,
    exportPlan: exportMutation,
    cancel: cancelMutation,
    invalidatePlan,
  };
}
