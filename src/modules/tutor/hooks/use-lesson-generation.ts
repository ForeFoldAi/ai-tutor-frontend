import { useCallback, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  buildLessonPlannerWsUrl,
  generateLessonPlan,
  getLessonPlan,
  resumeLessonPlanJob,
} from "@/api/lesson-planner";
import { useAuthStore } from "@/lib/auth-store";
import { connectLessonPlannerWs } from "@/modules/tutor/lib/lesson-planner-ws";
import type { GeneratedLessonPlan, LessonPlanFormValues } from "@/modules/tutor/types/lesson-planner";
import {
  INITIAL_GENERATION_PROGRESS,
  type LessonGenerationProgress,
  type LessonPlannerWsEvent,
} from "@/modules/tutor/types/lesson-planner-ws";
import { formValuesToGeneratePayload } from "@/modules/tutor/utils/lesson-planner-payload";
import { mapApiPlanToGenerated, mapWsOutputsToGenerated } from "@/modules/tutor/utils/lesson-planner-mappers";

export function useLessonGeneration() {
  const [generatedPlan, setGeneratedPlan] = useState<GeneratedLessonPlan | null>(null);
  const [lessonPlanId, setLessonPlanId] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState<LessonGenerationProgress>(INITIAL_GENERATION_PROGRESS);
  const wsRef = useRef<WebSocket | null>(null);
  const outputsRef = useRef<Record<string, Record<string, unknown>>>({});
  const generateLockRef = useRef(false);

  const closeWs = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
  }, []);

  const releaseGenerateLock = useCallback(() => {
    generateLockRef.current = false;
  }, []);

  const handleWsEvent = useCallback((event: LessonPlannerWsEvent) => {
    switch (event.event) {
      case "progress":
        setProgress((p) => ({
          ...p,
          progress: event.progress ?? p.progress,
          message: event.message ?? p.message,
        }));
        break;
      case "artifact_started":
        setProgress((p) => ({
          ...p,
          activeArtifact: event.artifact ?? null,
        }));
        break;
      case "artifact_completed":
        if (event.artifact && event.data) {
          outputsRef.current[event.artifact] = event.data;
          setGeneratedPlan((prev) => mapWsOutputsToGenerated(outputsRef.current, prev));
          setProgress((p) => ({
            ...p,
            completedArtifacts: event.artifact
              ? [...new Set([...p.completedArtifacts, event.artifact])]
              : p.completedArtifacts,
            activeArtifact: null,
          }));
        }
        break;
      case "completed":
        if (event.result?.outputs) {
          outputsRef.current = event.result.outputs;
          setGeneratedPlan((prev) => mapWsOutputsToGenerated(event.result!.outputs!, prev));
        }
        setProgress((p) => ({ ...p, progress: 100, message: "Completed", activeArtifact: null }));
        releaseGenerateLock();
        break;
      case "error":
        setProgress((p) => ({ ...p, error: event.message ?? "Generation failed" }));
        releaseGenerateLock();
        break;
      case "cancelled":
        setProgress((p) => ({ ...p, error: "Generation cancelled" }));
        releaseGenerateLock();
        break;
      default:
        break;
    }
  }, [releaseGenerateLock]);

  const openWs = useCallback(
    (websocketUrl: string, planId: string) => {
      closeWs();
      const token = useAuthStore.getState().token;
      if (!token) return;

      const url = buildLessonPlannerWsUrl(websocketUrl, token);
      wsRef.current = connectLessonPlannerWs(url, {
        onEvent: handleWsEvent,
        onClose: async () => {
          try {
            const plan = await getLessonPlan(planId);
            setGeneratedPlan(mapApiPlanToGenerated(plan));
          } catch {
            // partial WS outputs already rendered
          }
        },
      });
    },
    [closeWs, handleWsEvent],
  );

  const generateMutation = useMutation({
    mutationFn: async (values: LessonPlanFormValues) => {
      if (generateLockRef.current) {
        throw new Error("Generation already in progress");
      }
      generateLockRef.current = true;
      outputsRef.current = {};
      setProgress(INITIAL_GENERATION_PROGRESS);
      setGeneratedPlan(null);
      const payload = formValuesToGeneratePayload(values);
      // Reuse the open plan when regenerating; first click creates one.
      if (lessonPlanId) {
        payload.lesson_plan_id = lessonPlanId;
      }
      try {
        return await generateLessonPlan(payload);
      } catch (err) {
        generateLockRef.current = false;
        throw err;
      }
    },
    onSuccess: (data) => {
      setJobId(data.job_id);
      setLessonPlanId(data.lesson_plan_id);
      setProgress({ ...INITIAL_GENERATION_PROGRESS, message: "Queued…", progress: 2 });
      openWs(data.websocket_url, data.lesson_plan_id);
    },
    onError: (err: Error) => {
      generateLockRef.current = false;
      setProgress((p) => ({ ...p, error: err.message }));
    },
  });

  const resumeMutation = useMutation({
    mutationFn: async (resumeJobId: string) => resumeLessonPlanJob(resumeJobId),
    onSuccess: (data) => {
      generateLockRef.current = true;
      setJobId(data.job_id);
      setLessonPlanId(data.lesson_plan_id);
      openWs(data.websocket_url, data.lesson_plan_id);
    },
  });

  const reset = useCallback(() => {
    closeWs();
    outputsRef.current = {};
    generateLockRef.current = false;
    setGeneratedPlan(null);
    setLessonPlanId(null);
    setJobId(null);
    setProgress(INITIAL_GENERATION_PROGRESS);
  }, [closeWs]);

  const busy =
    generateMutation.isPending ||
    (progress.progress > 0 && progress.progress < 100 && !progress.error) ||
    (Boolean(jobId) && progress.progress < 100 && !progress.error);

  return {
    generatedPlan,
    setGeneratedPlan,
    lessonPlanId,
    setLessonPlanId,
    jobId,
    progress,
    isGenerating: busy,
    generate: generateMutation.mutate,
    resume: resumeMutation.mutate,
    reset,
    closeWs,
  };
}
