import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CredentialRecord, FirstLoginStatus } from "@/modules/organization/types/credentials";

interface CredentialsTableProps {
  records: CredentialRecord[];
}

const LOGIN_STATUS_STYLES: Record<FirstLoginStatus, string> = {
  Completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Pending: "border-amber-200 bg-amber-50 text-amber-700",
  "Not Started": "border-red-200 bg-red-50 text-red-600",
};

const DELIVERY_STATUS_STYLES: Record<string, string> = {
  "Email Sent": "border-emerald-200 bg-emerald-50 text-emerald-700",
  "In Process": "border-sky-200 bg-sky-50 text-sky-700",
  Failed: "border-red-200 bg-red-50 text-red-700",
  Pending: "border-red-200 bg-red-50 text-red-700", // legacy = Failed
  "Not Sent": "border-slate-200 bg-slate-50 text-slate-600",
};

const headClass = "h-9 px-2 text-xs font-semibold text-foreground sm:px-3 sm:text-sm";
const cellClass = "px-2 py-2 text-xs sm:px-3 sm:text-sm";

function gradeLabel(record: CredentialRecord) {
  const parts = [record.grade, record.section, record.curriculum]
    .map((p) => p?.trim())
    .filter(Boolean);
  return parts.length ? parts.join(" · ") : "—";
}

export function CredentialsTable({ records }: CredentialsTableProps) {
  return (
    <Table className="min-w-[860px] text-xs sm:min-w-[920px] sm:text-sm">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className={headClass}>Name</TableHead>
          <TableHead className={headClass}>Role</TableHead>
          <TableHead className={headClass}>User ID</TableHead>
          <TableHead className={headClass}>Grade</TableHead>
          <TableHead className={`${headClass} whitespace-normal leading-snug`}>
            Credential Generated
          </TableHead>
          <TableHead className={`${headClass} whitespace-normal leading-snug`}>
            Credential Shared
          </TableHead>
          <TableHead className={`${headClass} whitespace-normal leading-snug`}>First Login</TableHead>
          <TableHead className={`${headClass} whitespace-normal leading-snug`}>Last Login</TableHead>
          <TableHead className={`${headClass} whitespace-normal leading-snug`}>
            Delivery Status
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {records.length === 0 ? (
          <TableRow>
            <TableCell colSpan={9} className={`${cellClass} py-6 text-center text-muted-foreground`}>
              No credential records match your filters.
            </TableCell>
          </TableRow>
        ) : (
          records.map((record) => (
            <TableRow key={record.id}>
              <TableCell className={`${cellClass} font-semibold text-blue-900 dark:text-blue-100`}>
                {record.name}
              </TableCell>
              <TableCell className={`${cellClass} whitespace-nowrap`}>{record.role}</TableCell>
              <TableCell className={`${cellClass} whitespace-nowrap text-muted-foreground`}>
                {record.userId}
              </TableCell>
              <TableCell className={`${cellClass} text-muted-foreground`}>
                {gradeLabel(record)}
              </TableCell>
              <TableCell className={cellClass}>
                {record.hasCredentials ? (
                  <Badge
                    variant="outline"
                    className="inline-flex items-center gap-1 whitespace-nowrap border-emerald-200 bg-emerald-50 px-2 py-0 text-xs text-emerald-700"
                  >
                    <Check className="h-3 w-3" />
                    Yes
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="inline-flex items-center whitespace-nowrap border-slate-200 bg-slate-50 px-2 py-0 text-xs text-muted-foreground"
                  >
                    No
                  </Badge>
                )}
              </TableCell>
              <TableCell className={`${cellClass} text-muted-foreground`}>
                {record.credentialShared ?? "—"}
              </TableCell>
              <TableCell className={cellClass}>
                <Badge
                  variant="outline"
                  className={`whitespace-nowrap px-2 py-0 text-xs ${LOGIN_STATUS_STYLES[record.firstLoginStatus]}`}
                >
                  {record.firstLoginStatus}
                </Badge>
              </TableCell>
              <TableCell className={`${cellClass} text-muted-foreground`}>
                {record.lastLogin ?? "—"}
              </TableCell>
              <TableCell className={cellClass}>
                <Badge
                  variant="outline"
                  className={`whitespace-nowrap px-2 py-0 text-xs ${DELIVERY_STATUS_STYLES[record.deliveryStatus] ?? DELIVERY_STATUS_STYLES["Not Sent"]}`}
                >
                  {record.deliveryStatus}
                </Badge>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
