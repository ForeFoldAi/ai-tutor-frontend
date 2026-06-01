import { useQuery } from "@tanstack/react-query";
import { fetchTutorProgress, fetchTutorSessions, getAssignedStudents } from "@/api/tutor";

export function useTutorData() {
  const studentsQuery = useQuery({ queryKey: ["tutor", "students"], queryFn: getAssignedStudents });
  const sessionsQuery = useQuery({ queryKey: ["tutor", "sessions"], queryFn: fetchTutorSessions });
  const progressQuery = useQuery({ queryKey: ["tutor", "progress"], queryFn: fetchTutorProgress });
  return { studentsQuery, sessionsQuery, progressQuery };
}
