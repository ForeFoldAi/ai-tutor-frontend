import { useMemo, useState } from "react";
import { AddCredsDialog, type AddCredsSubmitValues } from "@/modules/organization/components/credentials/add-creds-dialog";
import { CredentialUsersDialog } from "@/modules/organization/components/credentials/credential-users-dialog";
import { CredentialsFilters } from "@/modules/organization/components/credentials/credentials-filters";
import { CredentialsPagination } from "@/modules/organization/components/credentials/credentials-pagination";
import { CredentialsSummaryCards } from "@/modules/organization/components/credentials/credentials-summary-cards";
import { CredentialsTable } from "@/modules/organization/components/credentials/credentials-table";
import { CredentialsToolbar } from "@/modules/organization/components/credentials/credentials-toolbar";
import {
  DEMO_CREDENTIAL_METRICS,
  DEMO_CREDENTIAL_RECORDS,
} from "@/modules/organization/data/demo-credentials";
import type { CredentialFilters } from "@/modules/organization/types/credentials";
import {
  DEFAULT_CREDENTIAL_FILTERS,
  filterCredentialRecords,
} from "@/modules/organization/utils/credentials-helpers";
import { useToast } from "@/hooks/use-toast";

export default function OrganizationCredentialsPage() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState<CredentialFilters>(DEFAULT_CREDENTIAL_FILTERS);
  const [addCredsOpen, setAddCredsOpen] = useState(false);
  const [sendCredsOpen, setSendCredsOpen] = useState(false);

  const filteredRecords = useMemo(
    () => filterCredentialRecords(DEMO_CREDENTIAL_RECORDS, filters),
    [filters],
  );

  const paginatedRecords = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, page, pageSize]);

  const handleFilterChange = (patch: Partial<CredentialFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPage(1);
  };

  const handleAddCreds = (values: AddCredsSubmitValues) => {
    toast({
      title: "Credentials generated",
      description: `${values.users.length} ${values.role.toLowerCase()} credential(s) queued.`,
    });
  };

  const handleSendCreds = (values: AddCredsSubmitValues) => {
    toast({
      title: "Credentials sent",
      description: `${values.users.length} ${values.role.toLowerCase()} credential(s) queued for delivery.`,
    });
  };

  return (
    <div className="dashboard-fit flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-3 md:p-4">
      <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-0.5">
          <h1 className="text-2xl font-bold leading-tight text-blue-900 dark:text-blue-100">Credentials</h1>
          <p className="text-sm text-muted-foreground">
            Track generated credentials, delivery status, and first login progress.
          </p>
        </div>
        <CredentialsToolbar
          onDownloadExcel={() =>
            toast({
              title: "Download started",
              description: "Credentials Excel file is being prepared.",
            })
          }
          onSendCreds={() => setSendCredsOpen(true)}
          onAddCreds={() => setAddCredsOpen(true)}
        />
      </div>

      <div className="shrink-0">
        <CredentialsSummaryCards metrics={DEMO_CREDENTIAL_METRICS} />
      </div>

      <div className="shrink-0">
        <CredentialsFilters
          filters={filters}
          onChange={handleFilterChange}
          onClear={() => {
            setFilters(DEFAULT_CREDENTIAL_FILTERS);
            setPage(1);
          }}
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
        <CredentialsTable records={paginatedRecords} />
        <CredentialsPagination
          page={page}
          pageSize={pageSize}
          total={filteredRecords.length}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      </div>

      <AddCredsDialog open={addCredsOpen} onOpenChange={setAddCredsOpen} onSubmit={handleAddCreds} />
      <CredentialUsersDialog
        open={sendCredsOpen}
        onOpenChange={setSendCredsOpen}
        variant="send"
        onSubmit={handleSendCreds}
      />
    </div>
  );
}
