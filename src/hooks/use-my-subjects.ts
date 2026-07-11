import { useQuery } from "@tanstack/react-query";
import { getMySubjects } from "@/api/student";

const MY_SUBJECTS_KEY = ["my-subjects"] as const;

/** Shared cached subjects fetch for student learning pages. */
export function useMySubjects() {
  return useQuery({
    queryKey: MY_SUBJECTS_KEY,
    queryFn: getMySubjects,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
