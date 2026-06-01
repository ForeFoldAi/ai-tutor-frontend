import { useQuery } from "@tanstack/react-query";
import {
  getOrganizationSchoolAdmins,
  fetchOrganizationReports,
  getOrganizationStudents,
  getOrganizationTutors,
  getOrganizationUsers,
} from "@/api/organization";

export function useOrganizationData() {
  const usersQuery = useQuery({ queryKey: ["organization", "users"], queryFn: getOrganizationUsers });
  const tutorsQuery = useQuery({ queryKey: ["organization", "tutors"], queryFn: getOrganizationTutors });
  const studentsQuery = useQuery({ queryKey: ["organization", "students"], queryFn: getOrganizationStudents });
  const schoolAdminsQuery = useQuery({
    queryKey: ["organization", "school-admins"],
    queryFn: getOrganizationSchoolAdmins,
  });
  const reportsQuery = useQuery({ queryKey: ["organization", "reports"], queryFn: fetchOrganizationReports });
  return { usersQuery, tutorsQuery, studentsQuery, schoolAdminsQuery, reportsQuery };
}
