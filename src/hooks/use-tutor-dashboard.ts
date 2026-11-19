import { useQuery } from "@tanstack/react-query";
import { getTutorDashboardSummary } from "@/api/tutor-dashboard";

export const TUTOR_DASHBOARD_KEY = ["tutor", "dashboard"] as const;

export function useTutorDashboard() {
  return useQuery({
    queryKey: TUTOR_DASHBOARD_KEY,
    queryFn: getTutorDashboardSummary,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
