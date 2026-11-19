import { useQuery } from "@tanstack/react-query";
import { fetchMasterAdminReports, getAdminUsers, getMasterAdminSchools } from "@/api/masterAdmin";

export function useMasterAdminOverview() {
  const usersQuery = useQuery({
    queryKey: ["master-admin", "users"],
    queryFn: getAdminUsers,
  });

  const schoolsQuery = useQuery({
    queryKey: ["master-admin", "schools"],
    queryFn: getMasterAdminSchools,
  });

  const reportsQuery = useQuery({
    queryKey: ["master-admin", "reports"],
    queryFn: fetchMasterAdminReports,
  });

  return { usersQuery, schoolsQuery, reportsQuery };
}
