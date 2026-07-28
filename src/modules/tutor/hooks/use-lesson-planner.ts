import { useQuery } from "@tanstack/react-query";
import { getLessonPlan, listLessonPlans } from "@/api/lesson-planner";
import { mapApiPlanToGenerated, mapSummaryToSaved } from "@/modules/tutor/utils/lesson-planner-mappers";

export const LESSON_PLANS_KEY = ["tutor", "lesson-plans"] as const;
export const lessonPlanKey = (id: string) => ["tutor", "lesson-plan", id] as const;

export function useLessonPlans() {
  return useQuery({
    queryKey: LESSON_PLANS_KEY,
    queryFn: async () => {
      const plans = await listLessonPlans();
      return plans.map(mapSummaryToSaved);
    },
  });
}

export function useLessonPlan(planId: string | null) {
  return useQuery({
    queryKey: planId ? lessonPlanKey(planId) : ["tutor", "lesson-plan", "none"],
    queryFn: async () => {
      if (!planId) return null;
      const plan = await getLessonPlan(planId);
      return {
        api: plan,
        generated: mapApiPlanToGenerated(plan),
      };
    },
    enabled: Boolean(planId),
  });
}
