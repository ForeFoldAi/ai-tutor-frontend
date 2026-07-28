import { useQuery } from "@tanstack/react-query";
import { getStudentDashboard } from "@/api/student-dashboard";

export const STUDENT_DASHBOARD_KEY = ["student-dashboard"] as const;

export function useStudentDashboard() {
  return useQuery({
    queryKey: STUDENT_DASHBOARD_KEY,
    queryFn: () => getStudentDashboard(),
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
