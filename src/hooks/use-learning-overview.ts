import { useQuery } from "@tanstack/react-query";
import { getLearningOverview } from "@/api/learning";

export const LEARNING_OVERVIEW_KEY = ["learning-overview"] as const;

export function useLearningOverview() {
  return useQuery({
    queryKey: LEARNING_OVERVIEW_KEY,
    queryFn: () => getLearningOverview(),
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
