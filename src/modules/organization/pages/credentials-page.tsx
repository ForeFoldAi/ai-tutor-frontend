import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import {
  exportCredentialsXlsx,
  filtersToApi,
  generateCredentials,
  getCredentialStats,
  listCredentials,
  mapCredentialMetrics,
  mapCredentialRecord,
  sendCredentials,
  type CredentialRecordApi,
} from "@/api/credentials";
import { AddCredsDialog, type AddCredsSubmitValues } from "@/modules/organization/components/credentials/add-creds-dialog";
import { CredentialUsersDialog } from "@/modules/organization/components/credentials/credential-users-dialog";
import { CredentialsFilters } from "@/modules/organization/components/credentials/credentials-filters";
import { CredentialsPagination } from "@/modules/organization/components/credentials/credentials-pagination";
import { CredentialsSummaryCards } from "@/modules/organization/components/credentials/credentials-summary-cards";
import { CredentialsTable } from "@/modules/organization/components/credentials/credentials-table";
import { CredentialsToolbar } from "@/modules/organization/components/credentials/credentials-toolbar";
import type { CredentialFilters, CredentialMetrics } from "@/modules/organization/types/credentials";
import { DEFAULT_CREDENTIAL_FILTERS } from "@/modules/organization/utils/credentials-helpers";
import { DataState } from "@/modules/shared/components/data-state";
import { useEntitySearch } from "@/modules/search";
import { invalidateManyAndBroadcast } from "@/lib/query-broadcast";
import { useToast } from "@/hooks/use-toast";
import { isIndividualTutor } from "@/lib/app-nav-items";
import { useAuthStore } from "@/lib/auth-store";

const EMPTY_METRICS: CredentialMetrics = {
  generated: 0,
  teachersPendingLogin: 0,
  studentsPendingLogin: 0,
  notShared: 0,
  generatedTrend: "—",
  teachersPendingTrend: "—",
  studentsPendingTrend: "—",
  notSharedTrend: "—",
  notSharedTrendUp: false,
};

export default function OrganizationCredentialsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const individual = isIndividualTutor(user?.role, user?.schoolId);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState<CredentialFilters>(DEFAULT_CREDENTIAL_FILTERS);
  const [addCredsOpen, setAddCredsOpen] = useState(false);
  const [sendCredsOpen, setSendCredsOpen] = useState(false);

  const apiFilters = useMemo(() => filtersToApi(filters), [filters]);
  const credentialSearch = useEntitySearch<CredentialRecordApi>("credentials", filters.search);

  const statsQuery = useQuery({
    queryKey: ["credentials", "stats"],
    queryFn: getCredentialStats,
  });

  const listQuery = useQuery({
    queryKey: ["credentials", "list", page, pageSize, apiFilters],
    queryFn: () =>
      listCredentials({
        ...apiFilters,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      }),
    enabled: !credentialSearch.searching,
    placeholderData: keepPreviousData,
  });

  const refreshCredentials = async () => {
    await invalidateManyAndBroadcast(qc, ["credentials"], { refetch: true });
  };

  const generateMutation = useMutation({
    mutationFn: (values: AddCredsSubmitValues) =>
      generateCredentials({
        role: values.role,
        user_ids: values.users.map((u) => Number(u.id)),
      }),
    onSuccess: async (result) => {
      setAddCredsOpen(false);
      await refreshCredentials();
      toast({
        title: "Credentials generated",
        description: result.message,
      });
    },
    onError: (err) => {
      toast({
        title: "Could not generate credentials",
        description: err instanceof Error ? err.message : "Request failed.",
        variant: "destructive",
      });
    },
  });

  const sendMutation = useMutation({
    mutationFn: (values: AddCredsSubmitValues) =>
      sendCredentials({
        role: values.role,
        user_ids: values.users.map((u) => Number(u.id)),
      }),
    onSuccess: async (result) => {
      setSendCredsOpen(false);
      await refreshCredentials();
      toast({
        title: "Credentials sent",
        description: result.message,
      });
    },
    onError: (err) => {
      toast({
        title: "Could not send credentials",
        description: err instanceof Error ? err.message : "Request failed.",
        variant: "destructive",
      });
    },
  });

  const handleFilterChange = (patch: Partial<CredentialFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPage(1);
  };

  const handleDownload = () => {
    void exportCredentialsXlsx(apiFilters)
      .then(() => {
        toast({
          title: "Download started",
          description: "Credentials Excel file downloaded.",
        });
      })
      .catch((err) => {
        toast({
          title: "Download failed",
          description: err instanceof Error ? err.message : "Could not export credentials.",
          variant: "destructive",
        });
      });
  };

  const records = useMemo(() => {
    const raw = credentialSearch.searching
      ? credentialSearch.items
      : (listQuery.data?.items ?? []);
    let mapped = raw.map(mapCredentialRecord);
    if (credentialSearch.searching) {
      if (filters.role !== "all") {
        mapped = mapped.filter((r) => r.role === filters.role);
      }
      if (filters.firstLoginStatus !== "all") {
        mapped = mapped.filter((r) => r.firstLoginStatus === filters.firstLoginStatus);
      }
      if (filters.deliveryStatus !== "all") {
        mapped = mapped.filter((r) => r.deliveryStatus === filters.deliveryStatus);
      }
      if (filters.shared === "shared") {
        mapped = mapped.filter((r) => Boolean(r.credentialShared));
      } else if (filters.shared === "not_shared") {
        mapped = mapped.filter((r) => !r.credentialShared);
      }
    }
    return mapped;
  }, [
    credentialSearch.searching,
    credentialSearch.items,
    listQuery.data?.items,
    filters.role,
    filters.firstLoginStatus,
    filters.deliveryStatus,
    filters.shared,
  ]);
  const total = credentialSearch.searching ? records.length : (listQuery.data?.meta.total ?? 0);
  const listLoading = credentialSearch.searching
    ? credentialSearch.isLoading
    : listQuery.isLoading && !listQuery.data;
  const listError = credentialSearch.searching ? credentialSearch.error : listQuery.error;
  const metrics = statsQuery.data ? mapCredentialMetrics(statsQuery.data) : EMPTY_METRICS;

  return (
    <div className="dashboard-fit flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3 md:p-4">
      <div className="flex shrink-0 flex-col gap-2">
        <CredentialsToolbar
          title={
            <div className="space-y-0.5">
              <h1 className="text-xl font-bold leading-tight text-blue-900 dark:text-blue-100 sm:text-2xl">
                Credentials
              </h1>
              <p className="text-sm text-muted-foreground">
                Track generated credentials, delivery status, and first login progress.
              </p>
            </div>
          }
          onDownloadExcel={handleDownload}
          onSendCreds={() => setSendCredsOpen(true)}
          onAddCreds={() => setAddCredsOpen(true)}
        />
      </div>

      <div className="shrink-0">
        <CredentialsSummaryCards metrics={metrics} hideTeacherMetrics={individual} />
      </div>

      <div className="shrink-0">
        <CredentialsFilters
          filters={filters}
          onChange={handleFilterChange}
          onClear={() => {
            setFilters(DEFAULT_CREDENTIAL_FILTERS);
            setPage(1);
          }}
          hideTeacherRole={individual}
        />
      </div>

      <DataState
        loading={listLoading}
        error={listError ? String(listError) : null}
        empty={total === 0 && !listLoading}
        emptyText="No credential records match your filters."
        onRetry={() =>
          void (credentialSearch.searching ? credentialSearch.refetch() : listQuery.refetch())
        }
      >
        <div className="space-y-0">
          <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
            <CredentialsTable records={records} />
            <div className="border-t border-border/70 px-3 py-3">
              {!credentialSearch.searching ? (
                <CredentialsPagination
                  page={page}
                  pageSize={pageSize}
                  total={total}
                  onPageChange={setPage}
                  onPageSizeChange={(size) => {
                    setPageSize(size);
                    setPage(1);
                  }}
                />
              ) : (
                <p className="text-xs text-muted-foreground">
                  Showing all {total} search result{total === 1 ? "" : "s"}
                </p>
              )}
            </div>
          </div>
        </div>
      </DataState>

      <AddCredsDialog
        open={addCredsOpen}
        onOpenChange={setAddCredsOpen}
        onSubmit={(values) => generateMutation.mutate(values)}
        pending={generateMutation.isPending}
        hideTeacherRole={individual}
      />
      <CredentialUsersDialog
        open={sendCredsOpen}
        onOpenChange={setSendCredsOpen}
        variant="send"
        onSubmit={(values) => sendMutation.mutate(values)}
        pending={sendMutation.isPending}
        hideTeacherRole={individual}
      />
    </div>
  );
}
