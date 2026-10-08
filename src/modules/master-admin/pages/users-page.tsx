import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { exportCsv } from "@/modules/master-admin/utils/export-csv";
import { Pagination } from "../components/pagination";
import { StatusPill } from "../components/status-pill";
import { useToast } from "@/hooks/use-toast";
import {
  Eye,
  PauseCircle,
  PlayCircle,
  Search,
  Users,
  GraduationCap,
  Sparkles,
  ShieldCheck,
  Building2,
  Zap,
  Pencil,
  Trash2,
  BookOpen,
} from "lucide-react";
import {
  deleteAdminUser,
  getAdminUsers,
  getMasterAdminSchools,
  getStudentLearning,
  getTokenTelemetry,
  patchAdminUser,
  patchUserStatus,
  setStudentPublisher,
} from "@/api/masterAdmin";
import { invalidateManyAndBroadcast } from "@/lib/query-broadcast";
import type { ApiUser, SchoolSummary, UserTokenUsageApi } from "@/api/types";

const roleLabel = (role: string) => role.replace(/_/g, " ");

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

type SortKey = "newest" | "oldest" | "name" | "email" | "role" | "tokens_desc" | "tokens_asc";

const SORT_LABELS: Record<SortKey, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  name: "Name (A–Z)",
  email: "Email (A–Z)",
  role: "Role",
  tokens_desc: "Most tokens",
  tokens_asc: "Fewest tokens",
};

type EditForm = { full_name: string; email: string; phone: string; school: string; new_password: string };

export default function MasterAdminUsersPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [schoolFilter, setSchoolFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortKey>("newest");
  const [tokenTimeframe, setTokenTimeframe] = useState<"day" | "week" | "month" | "all">("month");

  // User details modal
  const [selectedUser, setSelectedUser] = useState<ApiUser | null>(null);
  const [editUser, setEditUser] = useState<ApiUser | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ full_name: "", email: "", phone: "", school: "none", new_password: "" });
  const [deleteUser, setDeleteUser] = useState<ApiUser | null>(null);

  const openEdit = (u: ApiUser) => {
    setEditUser(u);
    setEditForm({
      full_name: u.full_name,
      email: u.email,
      phone: u.phone ?? "",
      school: u.school_id ? String(u.school_id) : "none",
      new_password: "",
    });
  };

  // Queries
  const usersQuery = useQuery({
    queryKey: ["master-admin", "users"],
    queryFn: getAdminUsers,
  });

  const schoolsQuery = useQuery({
    queryKey: ["master-admin", "schools"],
    queryFn: getMasterAdminSchools,
  });

  const tokensQuery = useQuery({
    queryKey: ["master-admin", "token-telemetry", tokenTimeframe],
    queryFn: () => getTokenTelemetry(tokenTimeframe),
  });

  const users = usersQuery.data ?? [];
  const schools = schoolsQuery.data ?? [];

  const userTokenMap = useMemo(() => {
    const map: Record<number, UserTokenUsageApi> = {};
    tokensQuery.data?.user_usage?.forEach((u) => {
      map[u.user_id] = u;
    });
    return map;
  }, [tokensQuery.data]);

  // School lookup map
  const schoolMap = useMemo(() => {
    const map: Record<number, SchoolSummary> = {};
    schools.forEach((s) => {
      map[s.id] = s;
    });
    return map;
  }, [schools]);

  // Status mutation
  const statusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) => patchUserStatus(id, isActive),
    onSuccess: async (_, vars) => {
      await invalidateManyAndBroadcast(qc, ["users", "students", "teachers", "dashboard"]);
      toast({
        title: vars.isActive ? "User Activated" : "User Suspended",
        description: `Account status updated successfully.`,
      });
    },
    onError: () => toast({ title: "Failed to update status", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, form }: { id: number; form: EditForm }) =>
      patchAdminUser(id, {
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        school_id: form.school === "none" ? null : Number(form.school),
        ...(form.new_password ? { new_password: form.new_password } : {}),
      }),
    onSuccess: async () => {
      await invalidateManyAndBroadcast(qc, ["users", "students", "teachers", "dashboard"]);
      setEditUser(null);
      toast({ title: "User updated" });
    },
    onError: (e: Error) => toast({ title: "Failed to update user", description: e.message, variant: "destructive" }),
  });

  const learningUserId = selectedUser?.role === "STUDENT" ? selectedUser.id : null;
  const learningQuery = useQuery({
    queryKey: ["master-admin", "student-learning", learningUserId],
    queryFn: () => getStudentLearning(learningUserId!),
    enabled: learningUserId !== null,
  });

  const publisherMutation = useMutation({
    mutationFn: ({ subject, textbookId }: { subject: string; textbookId: number | null }) =>
      setStudentPublisher(learningUserId!, subject, textbookId),
    onSuccess: (data) => {
      qc.setQueryData(["master-admin", "student-learning", learningUserId], data);
      toast({ title: "Publisher updated", description: "The student's progress restarts for the new chapter set." });
    },
    onError: (e: Error) => toast({ title: "Failed to set publisher", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteAdminUser(id),
    onSuccess: async () => {
      await invalidateManyAndBroadcast(qc, ["users", "students", "teachers", "dashboard"]);
      setDeleteUser(null);
      setSelectedUser(null);
      toast({ title: "User deleted" });
    },
    onError: (e: Error) => toast({ title: "Failed to delete user", description: e.message, variant: "destructive" }),
  });

  // KPI Metrics
  const metrics = useMemo(() => {
    const total = users.length;
    const students = users.filter((u) => u.role === "STUDENT").length;
    const tutors = users.filter((u) => u.role === "TUTOR").length;
    const schoolAdmins = users.filter((u) => u.role === "SCHOOL_ADMIN").length;
    const activeCount = users.filter((u) => u.is_active).length;
    return { total, students, tutors, schoolAdmins, activeCount };
  }, [users]);

  // Roles available in actual database
  const roles = useMemo(() => Array.from(new Set(users.map((u) => u.role))), [users]);

  // Filtered rows
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (q && !u.full_name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (statusFilter !== "all" && String(u.is_active) !== statusFilter) return false;
      if (schoolFilter !== "all" && String(u.school_id ?? "none") !== schoolFilter) return false;
      return true;
    });
  }, [users, query, roleFilter, statusFilter, schoolFilter]);

  const sorted = useMemo(() => {
    const tokens = (u: ApiUser) => userTokenMap[u.id]?.total_tokens ?? 0;
    const cmp: Record<SortKey, (a: ApiUser, b: ApiUser) => number> = {
      newest: (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at),
      oldest: (a, b) => Date.parse(a.created_at) - Date.parse(b.created_at),
      name: (a, b) => a.full_name.localeCompare(b.full_name),
      email: (a, b) => a.email.localeCompare(b.email),
      role: (a, b) => a.role.localeCompare(b.role) || a.full_name.localeCompare(b.full_name),
      tokens_desc: (a, b) => tokens(b) - tokens(a),
      tokens_asc: (a, b) => tokens(a) - tokens(b),
    };
    return [...filtered].sort(cmp[sortBy]);
  }, [filtered, sortBy, userTokenMap]);

  const pageRows = useMemo(
    () => sorted.slice((page - 1) * pageSize, page * pageSize),
    [sorted, page],
  );

  const userName = (id: number | null) => (id ? users.find((u) => u.id === id)?.full_name ?? `#${id}` : null);

  if (usersQuery.isLoading) {
    return (
      <PageShell>
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </PageShell>
    );
  }

  if (usersQuery.isError) {
    return (
      <PageShell>
        <div className="py-12 text-center space-y-3">
          <p className="text-sm font-semibold text-destructive">Failed to load platform users.</p>
          <Button variant="outline" size="sm" onClick={() => void usersQuery.refetch()}>
            Retry
          </Button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">User Management</h1>
          <p className="text-sm text-muted-foreground">
            Complete platform directory across all schools, roles, and authorization levels.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              exportCsv({
                rows: sorted.map((u) => ({
                  ID: u.id,
                  Name: u.full_name,
                  Email: u.email,
                  Phone: u.phone ?? "",
                  Role: u.role,
                  School: u.school_id ? schoolMap[u.school_id]?.name || `School #${u.school_id}` : "Global",
                  Status: u.is_active ? "Active" : "Suspended",
                  Tokens: userTokenMap[u.id]?.total_tokens ?? 0,
                  Created: formatDate(u.created_at),
                })),
                columns: [
                  { key: "ID", header: "User ID" },
                  { key: "Name", header: "Full Name" },
                  { key: "Email", header: "Email" },
                  { key: "Phone", header: "Phone" },
                  { key: "Role", header: "Role" },
                  { key: "School", header: "Assigned Campus" },
                  { key: "Status", header: "Account Status" },
                  { key: "Tokens", header: `Tokens (${tokenTimeframe})` },
                  { key: "Created", header: "Joined Date" },
                ],
                fileName: `users_${new Date().toISOString().slice(0, 10)}.csv`,
              })
            }
            className="h-9 text-xs"
          >
            Export CSV
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="shadow-sm">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Total Users</p>
                <p className="text-2xl font-bold mt-1 text-foreground">{metrics.total}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                <Users className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Students</p>
                <p className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">{metrics.students}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600">
                <GraduationCap className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Tutors</p>
                <p className="text-2xl font-bold mt-1 text-indigo-600 dark:text-indigo-400">{metrics.tutors}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600">
                <Sparkles className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">School Admins</p>
                <p className="text-2xl font-bold mt-1 text-blue-600 dark:text-blue-400">{metrics.schoolAdmins}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600">
                <Building2 className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Active Accounts</p>
                <p className="text-2xl font-bold mt-1 text-teal-600 dark:text-teal-400">{metrics.activeCount}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-600">
                <ShieldCheck className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Token Usage Summary */}
      <Card className="shadow-sm">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                  AI Tokens Used ({tokenTimeframe === "all" ? "All time" : `This ${tokenTimeframe}`})
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {(tokensQuery.data?.total_platform_tokens ?? 0).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 rounded-lg border p-1 bg-muted/30">
              {(["day", "week", "month", "all"] as const).map((tf) => (
                <Button
                  key={tf}
                  type="button"
                  size="sm"
                  variant={tokenTimeframe === tf ? "default" : "ghost"}
                  className="h-7 px-3 text-xs capitalize"
                  onClick={() => setTokenTimeframe(tf)}
                >
                  {tf === "day" ? "Today" : tf === "all" ? "All Time" : tf}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Table Card */}
      <Card className="shadow-sm">
        <CardContent className="p-5 space-y-4">
          {/* Filters Bar */}
          <div className="grid gap-3 sm:grid-cols-12">
            <div className="sm:col-span-4 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                className="pl-9 h-9 text-xs"
                placeholder="Search by user name or email..."
              />
            </div>

            <div className="sm:col-span-2">
              <Select
                value={roleFilter}
                onValueChange={(v) => {
                  setRoleFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {roles.map((r) => (
                    <SelectItem key={r} value={r}>
                      {roleLabel(r)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-2">
              <Select
                value={statusFilter}
                onValueChange={(v) => {
                  setStatusFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-2">
              <Select
                value={schoolFilter}
                onValueChange={(v) => {
                  setSchoolFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-9 text-xs" aria-label="Filter by campus">
                  <SelectValue placeholder="All Campuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Campuses</SelectItem>
                  <SelectItem value="none">Global / Unassigned</SelectItem>
                  {schools.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-2">
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
                <SelectTrigger className="h-9 text-xs" aria-label="Sort users">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {SORT_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-lg border overflow-hidden">
            <Table className="min-w-[900px]">
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="min-w-[200px]">Full Name</TableHead>
                  <TableHead className="min-w-[220px]">Email Address</TableHead>
                  <TableHead className="w-32">Role</TableHead>
                  <TableHead className="min-w-[180px]">Assigned Campus</TableHead>
                  <TableHead className="w-28 text-center">Status</TableHead>
                  <TableHead className="w-36">Tokens Used</TableHead>
                  <TableHead className="w-32">Joined Date</TableHead>
                  <TableHead className="w-40 text-right pr-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8}>
                      <div className="py-12 text-center flex flex-col items-center justify-center gap-2">
                        <Users className="h-8 w-8 text-muted-foreground/50" />
                        <p className="text-sm font-semibold text-foreground">
                          {query ? "No matching users found." : "No users registered."}
                        </p>
                        <p className="text-xs text-muted-foreground">Adjust filters or create new accounts.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  pageRows.map((u: ApiUser) => {
                    const assignedSchool = u.school_id ? schoolMap[u.school_id] : null;
                    return (
                      <TableRow key={u.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-semibold text-foreground">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-2 h-2 rounded-full shrink-0 ${
                                u.is_active ? "bg-emerald-500" : "bg-rose-500"
                              }`}
                            />
                            <span>{u.full_name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono">{u.email}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-[10px] uppercase font-mono px-2 py-0.5 ${
                              u.role === "MASTER_ADMIN"
                                ? "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30"
                                : u.role === "SCHOOL_ADMIN"
                                  ? "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30"
                                  : u.role === "TUTOR"
                                    ? "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/30"
                                    : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                            }`}
                          >
                            {roleLabel(u.role)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {assignedSchool ? (
                            <span className="font-medium text-foreground">{assignedSchool.name}</span>
                          ) : (
                            <span className="text-muted-foreground italic">Global / Unassigned</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <StatusPill status={u.is_active ? "Active" : "Suspended"} />
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const tu = userTokenMap[u.id];
                            return (
                              <div>
                                <p className="font-mono text-xs font-semibold">
                                  {(tu?.total_tokens ?? 0).toLocaleString()}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  D {(tu?.tokens_day ?? 0).toLocaleString()} · W {(tu?.tokens_week ?? 0).toLocaleString()} · M {(tu?.tokens_month ?? 0).toLocaleString()}
                                </p>
                              </div>
                            );
                          })()}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(u.created_at)}
                        </TableCell>
                        <TableCell className="text-right pr-3">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              title="View User Details"
                              onClick={() => setSelectedUser(u)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              title="Edit User"
                              aria-label="Edit User"
                              onClick={() => openEdit(u)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              title="Delete User"
                              aria-label="Delete User"
                              onClick={() => setDeleteUser(u)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={`h-8 w-8 ${
                                u.is_active
                                  ? "text-muted-foreground hover:text-amber-600 hover:bg-amber-500/10"
                                  : "text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10"
                              }`}
                              title={u.is_active ? "Suspend User" : "Activate User"}
                              disabled={statusMutation.isPending}
                              onClick={() =>
                                statusMutation.mutate({ id: u.id, isActive: !u.is_active })
                              }
                            >
                              {u.is_active ? (
                                <PauseCircle className="h-4 w-4" />
                              ) : (
                                <PlayCircle className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <Pagination page={page} pageSize={pageSize} total={sorted.length} onPageChange={setPage} />
        </CardContent>
      </Card>

      {/* VIEW USER DETAILS MODAL */}
      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              {selectedUser?.full_name}
            </DialogTitle>
            <DialogDescription className="text-xs font-mono">{selectedUser?.email}</DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4 pt-2 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 rounded-lg border bg-muted/20">
                <div>
                  <p className="text-muted-foreground">User ID</p>
                  <p className="font-mono font-bold text-foreground mt-0.5">#{selectedUser.id}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Account Status</p>
                  <div className="mt-0.5">
                    <StatusPill status={selectedUser.is_active ? "Active" : "Suspended"} />
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground">Platform Role</p>
                  <p className="font-semibold text-foreground mt-0.5">{roleLabel(selectedUser.role)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Assigned Campus</p>
                  <p className="font-semibold text-foreground mt-0.5">
                    {selectedUser.school_id ? schoolMap[selectedUser.school_id]?.name || `#${selectedUser.school_id}` : "Global"}
                  </p>
                </div>
                {(
                  [
                    ["Phone", selectedUser.phone],
                    ["Email Verified", selectedUser.is_verified ? "Yes" : "No"],
                    ["Designation", selectedUser.designation],
                    ["Teaching Board", selectedUser.teaching_board],
                    ["Teaching Subjects", selectedUser.teaching_subjects?.join(", ")],
                    [
                      "Classes / Sections",
                      selectedUser.teaching_classes
                        ?.map((c) => `${c.grade}${c.sections?.length ? ` (${c.sections.join(", ")})` : ""}`)
                        .join("; "),
                    ],
                    ["Student Grade", selectedUser.student_grade],
                    ["Curricula", selectedUser.curricula?.join(", ")],
                    ["Parent Email", selectedUser.parent_email],
                    ["Favorite Subjects", selectedUser.favorite_subjects?.join(", ")],
                    ["Learning Goals", selectedUser.learning_goals?.join(", ")],
                    ["Preferred Learning", selectedUser.preferred_learning_method],
                    ["Created By", userName(selectedUser.created_by)],
                    ["Registration Date", formatDate(selectedUser.created_at)],
                    ["Last Updated", formatDate(selectedUser.updated_at)],
                  ] as [string, string | null | undefined][]
                )
                  .filter(([, v]) => v)
                  .map(([label, value]) => (
                    <div key={label}>
                      <p className="text-muted-foreground">{label}</p>
                      <p className="font-semibold text-foreground mt-0.5 break-words">{value}</p>
                    </div>
                  ))}
              </div>

              {learningUserId !== null && (
                <div className="p-3 rounded-lg border bg-primary/5 space-y-2">
                  <h4 className="font-semibold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5 text-primary" /> Subjects, Publishers & Chapters
                  </h4>
                  {learningQuery.isLoading ? (
                    <Skeleton className="h-16 w-full" />
                  ) : !learningQuery.data?.subjects.length ? (
                    <p className="text-muted-foreground">
                      {learningQuery.isError ? "Could not load enrollment." : "No subjects assigned (no class or subjects mapped)."}
                    </p>
                  ) : (
                    <>
                      <p className="text-muted-foreground">
                        {learningQuery.data.source === "class"
                          ? `Class ${learningQuery.data.class_label} — publishers follow the class unless overridden here.`
                          : "Individual student — no class, publisher is set per student."}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 items-start">
                      {learningQuery.data.subjects.map((s) => {
                        const isClass = learningQuery.data!.source === "class";
                        const nameOf = (id: number | null) =>
                          id ? s.options.find((o) => o.id === id)?.publisher ?? `#${id}` : "Default";
                        const value = s.override == null ? (isClass ? "inherit" : "0") : String(s.override);
                        return (
                          <div key={s.subject_name} className="rounded-md border bg-background p-2 space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold">{s.subject_name}</span>
                              <Select
                                value={value}
                                disabled={publisherMutation.isPending}
                                onValueChange={(v) =>
                                  publisherMutation.mutate({
                                    subject: s.subject_name,
                                    textbookId: v === "inherit" || (v === "0" && !isClass) ? null : Number(v),
                                  })
                                }
                              >
                                <SelectTrigger className="h-7 w-36 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {isClass && (
                                    <SelectItem value="inherit">Same as class ({nameOf(s.class_publisher_id)})</SelectItem>
                                  )}
                                  <SelectItem value="0">Default</SelectItem>
                                  {s.options.map((o) => (
                                    <SelectItem key={o.id} value={String(o.id)}>
                                      {o.publisher}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <details>
                              <summary className="cursor-pointer text-muted-foreground">
                                {s.chapters.length} chapter{s.chapters.length === 1 ? "" : "s"} · {nameOf(s.publisher_id)}
                              </summary>
                              <ul className="mt-1 max-h-40 overflow-y-auto list-disc pl-4 space-y-0.5">
                                {s.chapters.map((c) => (
                                  <li key={c.id}>{c.chapter || `Chapter #${c.id}`}</li>
                                ))}
                              </ul>
                            </details>
                          </div>
                        );
                      })}
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="p-3 rounded-lg border bg-amber-500/5 space-y-2">
                <h4 className="font-semibold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-amber-600" /> Token Usage
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <p className="text-muted-foreground">Today</p>
                    <p className="font-bold">{(userTokenMap[selectedUser.id]?.tokens_day ?? 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">This week</p>
                    <p className="font-bold">{(userTokenMap[selectedUser.id]?.tokens_week ?? 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">This month</p>
                    <p className="font-bold">{(userTokenMap[selectedUser.id]?.tokens_month ?? 0).toLocaleString()}</p>
                  </div>
                </div>
                <p className="text-muted-foreground">
                  Prompt {(userTokenMap[selectedUser.id]?.prompt_tokens ?? 0).toLocaleString()} · Completion {(userTokenMap[selectedUser.id]?.completion_tokens ?? 0).toLocaleString()}
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    statusMutation.mutate({
                      id: selectedUser.id,
                      isActive: !selectedUser.is_active,
                    });
                    setSelectedUser(null);
                  }}
                >
                  {selectedUser.is_active ? "Suspend Account" : "Activate Account"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    openEdit(selectedUser);
                    setSelectedUser(null);
                  }}
                >
                  Edit
                </Button>
                <Button variant="destructive" size="sm" onClick={() => setDeleteUser(selectedUser)}>
                  Delete
                </Button>
                <Button size="sm" onClick={() => setSelectedUser(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* EDIT USER DIALOG */}
      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription className="text-xs">
              {editUser ? `${roleLabel(editUser.role)} · #${editUser.id}` : null}
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (editUser) updateMutation.mutate({ id: editUser.id, form: editForm });
            }}
          >
            {(
              [
                ["full_name", "Full Name", "text", true],
                ["email", "Email", "email", true],
                ["phone", "Phone", "tel", false],
                ["new_password", "New Password (leave blank to keep)", "password", false],
              ] as const
            ).map(([key, label, type, required]) => (
              <div key={key} className="space-y-1">
                <Label htmlFor={`edit-${key}`} className="text-xs">
                  {label}
                </Label>
                <Input
                  id={`edit-${key}`}
                  type={type}
                  required={required}
                  minLength={key === "new_password" ? 8 : key === "full_name" ? 2 : undefined}
                  autoComplete={key === "new_password" ? "new-password" : undefined}
                  value={editForm[key]}
                  onChange={(e) => setEditForm((f) => ({ ...f, [key]: e.target.value }))}
                  className="h-9 text-xs"
                />
              </div>
            ))}
            <div className="space-y-1">
              <Label className="text-xs">Assigned Campus</Label>
              <Select value={editForm.school} onValueChange={(v) => setEditForm((f) => ({ ...f, school: v }))}>
                <SelectTrigger className="h-9 text-xs" aria-label="Assigned campus">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Global / Unassigned</SelectItem>
                  {schools.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setEditUser(null)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving…" : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION */}
      <AlertDialog open={!!deleteUser} onOpenChange={(open) => !open && setDeleteUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteUser?.full_name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the account ({deleteUser?.email}). If the user still owns classes or
              assignments, the delete is refused — suspend the account instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (deleteUser) deleteMutation.mutate(deleteUser.id);
              }}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}
