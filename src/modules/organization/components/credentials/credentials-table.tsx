import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CredentialRecord, DeliveryStatus, FirstLoginStatus } from "@/modules/organization/types/credentials";

interface CredentialsTableProps {
  records: CredentialRecord[];
}

const LOGIN_STATUS_STYLES: Record<FirstLoginStatus, string> = {
  Completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Pending: "border-amber-200 bg-amber-50 text-amber-700",
  "Not Started": "border-red-200 bg-red-50 text-red-600",
};

const DELIVERY_STATUS_STYLES: Record<DeliveryStatus, string> = {
  "Email Sent": "border-emerald-200 bg-emerald-50 text-emerald-700",
  "SMS Sent": "border-sky-200 bg-sky-50 text-sky-700",
  Pending: "border-amber-200 bg-amber-50 text-amber-700",
  "Not Sent": "border-red-200 bg-red-50 text-red-600",
};

export function CredentialsTable({ records }: CredentialsTableProps) {
  return (
    <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-border/70 bg-card">
      <Table className="text-sm [&_td]:px-3 [&_td]:py-2 [&_th]:h-9 [&_th]:px-3 [&_th]:py-2">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-sm font-semibold text-foreground">Name</TableHead>
            <TableHead className="text-sm font-semibold text-foreground">Role</TableHead>
            <TableHead className="text-sm font-semibold text-foreground">User ID</TableHead>
            <TableHead className="text-sm font-semibold text-foreground">Credential Shared</TableHead>
            <TableHead className="text-sm font-semibold text-foreground">First Login Status</TableHead>
            <TableHead className="text-sm font-semibold text-foreground">Last Login</TableHead>
            <TableHead className="text-sm font-semibold text-foreground">Delivery Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="py-6 text-center text-sm text-muted-foreground">
                No credential records match your filters.
              </TableCell>
            </TableRow>
          ) : (
            records.map((record) => (
              <TableRow key={record.id}>
                <TableCell className="font-semibold text-blue-900 dark:text-blue-100">
                  {record.name}
                </TableCell>
                <TableCell>{record.role}</TableCell>
                <TableCell className="text-muted-foreground">{record.userId}</TableCell>
                <TableCell className="text-muted-foreground">
                  {record.credentialShared ?? "—"}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={`px-2 py-0 text-xs ${LOGIN_STATUS_STYLES[record.firstLoginStatus]}`}
                  >
                    {record.firstLoginStatus}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{record.lastLogin ?? "—"}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={`px-2 py-0 text-xs ${DELIVERY_STATUS_STYLES[record.deliveryStatus]}`}
                  >
                    {record.deliveryStatus}
                  </Badge>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
