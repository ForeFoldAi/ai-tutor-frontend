import { useQuery } from "@tanstack/react-query";
import { fetchMasterAdminReports, getAdminUsers, getOrganizations } from "@/api/masterAdmin";

export function useMasterAdminOverview() {
  const usersQuery = useQuery({
    queryKey: ["master-admin", "users"],
    queryFn: getAdminUsers,
  });

  const orgsQuery = useQuery({
    queryKey: ["master-admin", "organizations"],
    queryFn: getOrganizations,
  });

  const reportsQuery = useQuery({
    queryKey: ["master-admin", "reports"],
    queryFn: fetchMasterAdminReports,
  });

  return { usersQuery, orgsQuery, reportsQuery };
}
