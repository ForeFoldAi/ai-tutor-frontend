import { useQuery } from "@tanstack/react-query";
import { fetchTutorProgress, fetchTutorSessions, listAssignedStudents } from "@/api/tutor";

export function useTutorData() {
  const studentsQuery = useQuery({
    queryKey: ["tutor", "students", "all"],
    queryFn: () => listAssignedStudents({ limit: 1000, offset: 0 }),
  });
  const sessionsQuery = useQuery({ queryKey: ["tutor", "sessions"], queryFn: fetchTutorSessions });
  const progressQuery = useQuery({ queryKey: ["tutor", "progress"], queryFn: fetchTutorProgress });
  return { studentsQuery, sessionsQuery, progressQuery };
}
