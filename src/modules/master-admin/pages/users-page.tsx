import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { exportCsv } from "@/modules/master-admin/utils/export-csv";
import { Pagination } from "../components/pagination";
import { StatusPill } from "../components/status-pill";
import { useToast } from "@/hooks/use-toast";
import { Eye, PauseCircle, Search } from "lucide-react";
import { getAdminUsers, patchUserStatus } from "@/api/masterAdmin";
import type { ApiUser } from "@/api/types";

const roleLabel = (role: string) => role.replace(/_/g, " ");

export default function MasterAdminUsersPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const refresh = async () => {
    const rows = await getAdminUsers();
    setUsers(rows);
  };

  useEffect(() => {
    refresh()
      .catch(() => toast({ title: "Failed to load users", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, []);

  const roles = useMemo(() => Array.from(new Set(users.map((u) => u.role))), [users]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (q && !u.full_name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (statusFilter !== "all" && String(u.is_active) !== statusFilter) return false;
      return true;
    });
  }, [users, query, roleFilter, statusFilter]);
  const pageRows = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page]);

  if (loading) return <div className="p-6"><Skeleton className="h-80 w-full" /></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-semibold tracking-tight">Users</h1><p className="text-sm text-muted-foreground">API-backed user management.</p></div>
        <Button variant="outline" onClick={() => exportCsv({ rows: filtered as unknown as Record<string, unknown>[], columns: [{ key: "full_name", header: "Name" }, { key: "email", header: "Email" }, { key: "role", header: "Role" }, { key: "is_active", header: "Active" }, { key: "created_at", header: "Created At" }], fileName: `users_${new Date().toISOString().slice(0, 10)}.csv` })}>Export CSV</Button>
      </div>
      <Card><CardContent className="p-6 space-y-4">
        <div className="grid gap-3 md:grid-cols-12">
          <div className="md:col-span-6"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} className="pl-9" placeholder="Search name or email..." /></div></div>
          <div className="md:col-span-3"><Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1); }}><SelectTrigger><SelectValue placeholder="Role" /></SelectTrigger><SelectContent><SelectItem value="all">All roles</SelectItem>{roles.map((r) => <SelectItem key={r} value={r}>{roleLabel(r)}</SelectItem>)}</SelectContent></Select></div>
          <div className="md:col-span-3"><Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}><SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All status</SelectItem><SelectItem value="true">Active</SelectItem><SelectItem value="false">Suspended</SelectItem></SelectContent></Select></div>
        </div>
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Organization</TableHead><TableHead>School</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {pageRows.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.full_name}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell><Badge variant="secondary">{roleLabel(u.role)}</Badge></TableCell>
                  <TableCell>{u.organization_id?.slice(0, 8) ?? "-"}</TableCell>
                  <TableCell>{u.school_id?.slice(0, 8) ?? "-"}</TableCell>
                  <TableCell><StatusPill status={u.is_active ? "Active" : "Suspended"} /></TableCell>
                  <TableCell className="text-right"><div className="flex justify-end gap-1"><Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={async () => { await patchUserStatus(u.id, !u.is_active); await refresh(); }}><PauseCircle className="h-4 w-4" /></Button></div></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <Pagination page={page} pageSize={pageSize} total={filtered.length} onPageChange={setPage} />
      </CardContent></Card>
    </div>
  );
}
