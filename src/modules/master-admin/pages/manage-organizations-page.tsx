import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { demoOrganizations, type Organization } from "../data/demo-master-admin";
import { Pagination } from "../components/pagination";
import { StatusPill } from "../components/status-pill";
import { exportCsv } from "../utils/export-csv";
import { Eye, Pencil, PauseCircle, Plus, Search, Trash2 } from "lucide-react";

const addOrganizationSchema = z.object({
  organization_name: z.string().min(2, "Organization name is required"),
  contact_person: z.string().min(2, "Contact person is required"),
  email: z.string().email("Email must be valid"),
  phone: z.string().min(6, "Phone is required"),
  address: z.string().min(2, "Address is required"),
  country: z.string().min(2, "Country is required"),
  subscription_plan: z.string().min(1, "Subscription plan is required"),
  max_schools_limit: z.coerce.number().int().min(1),
  status: z.string().min(1, "Status is required"),
});

type AddOrganizationValues = z.infer<typeof addOrganizationSchema>;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "2-digit", year: "numeric" });
}

export default function ManageOrganizationsPage() {
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Organization[]>(demoOrganizations);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Organization | null>(null);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");

  const [sortKey, setSortKey] = useState<keyof Organization>("createdDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const pageSize = 8;

  useEffect(() => {
    const t = window.setTimeout(() => setLoading(false), 500);
    return () => window.clearTimeout(t);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const now = new Date();
    const days = dateFilter === "7d" ? 7 : dateFilter === "30d" ? 30 : null;

    const list = rows.filter((r) => {
      if (q && !r.name.toLowerCase().includes(q)) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (planFilter !== "all" && r.subscriptionPlan !== planFilter) return false;
      if (days) {
        const diffMs = now.getTime() - new Date(r.createdDate).getTime();
        if (diffMs > days * 24 * 60 * 60 * 1000) return false;
      }
      return true;
    });

    list.sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      const av = typeof aVal === "string" ? +new Date(aVal) || aVal : aVal;
      const bv = typeof bVal === "string" ? +new Date(bVal) || bVal : bVal;
      const diff = av > bv ? 1 : av < bv ? -1 : 0;
      return sortDir === "asc" ? diff : -diff;
    });

    return list;
  }, [rows, query, statusFilter, planFilter, dateFilter, sortKey, sortDir]);

  const pageRows = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page]);

  const form = useForm<AddOrganizationValues>({
    resolver: zodResolver(addOrganizationSchema),
    defaultValues: {
      organization_name: "",
      contact_person: "",
      email: "",
      phone: "",
      address: "",
      country: "India",
      subscription_plan: "Starter",
      max_schools_limit: 5,
      status: "Active",
    },
  });

  if (loading) {
    return (
      <PageShell>
        <Skeleton className="h-7 w-[240px]" />
        <Card>
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-80 w-full" />
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Organizations</h1>
          <p className="text-sm text-muted-foreground">Enterprise organization management with filters and lifecycle actions.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              exportCsv({
                rows: filtered,
                columns: [
                  { key: "name", header: "Organization Name" },
                  { key: "ownerName", header: "Owner Name" },
                  { key: "email", header: "Email" },
                  { key: "phone", header: "Phone" },
                  { key: "totalSchools", header: "Total Schools" },
                  { key: "totalUsers", header: "Total Users" },
                  { key: "subscriptionPlan", header: "Subscription Plan" },
                  { key: "status", header: "Status" },
                  { key: "createdDate", header: "Created Date" },
                ],
                fileName: `organizations_${new Date().toISOString().slice(0, 10)}.csv`,
              });
              toast({ title: "Export started", description: "Organizations CSV is downloading." });
            }}
          >
            Export CSV
          </Button>

          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Organization
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Organization</DialogTitle>
                <DialogDescription>Create a new organization and assign subscription limits.</DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form
                  className="grid gap-3 md:grid-cols-2 pt-2"
                  onSubmit={form.handleSubmit((v) => {
                    const newOrg: Organization = {
                      id: `org_${Date.now()}`,
                      name: v.organization_name,
                      ownerName: v.contact_person,
                      email: v.email,
                      phone: v.phone,
                      totalSchools: 0,
                      totalUsers: 0,
                      subscriptionPlan: v.subscription_plan as Organization["subscriptionPlan"],
                      status: v.status as Organization["status"],
                      maxSchoolsLimit: v.max_schools_limit,
                      address: v.address,
                      country: v.country,
                      createdDate: new Date().toISOString(),
                    };
                    setRows((prev) => [newOrg, ...prev]);
                    toast({ title: "Organization added", description: `${v.organization_name} created (demo).` });
                    setAddOpen(false);
                    form.reset();
                  })}
                >
                  <FormField control={form.control} name="organization_name" render={({ field }) => (
                    <FormItem className="md:col-span-2"><FormLabel>Organization Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="contact_person" render={({ field }) => (
                    <FormItem><FormLabel>Contact Person</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="country" render={({ field }) => (
                    <FormItem><FormLabel>Country</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="address" render={({ field }) => (
                    <FormItem className="md:col-span-2"><FormLabel>Address</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="subscription_plan" render={({ field }) => (
                    <FormItem><FormLabel>Subscription Plan</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger><SelectValue placeholder="Select plan" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Starter">Starter</SelectItem>
                          <SelectItem value="Growth">Growth</SelectItem>
                          <SelectItem value="Enterprise">Enterprise</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="max_schools_limit" render={({ field }) => (
                    <FormItem><FormLabel>Max Schools Limit</FormLabel><FormControl><Input type="number" min={1} {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem className="md:col-span-2"><FormLabel>Status</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Active">Active</SelectItem>
                          <SelectItem value="Pending">Pending</SelectItem>
                          <SelectItem value="Suspended">Suspended</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
                    <Button type="submit">Create Organization</Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="grid gap-3 md:grid-cols-12">
            <div className="md:col-span-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search by organization name..."
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setPage(1); }}
                />
              </div>
            </div>
            <div className="md:col-span-3">
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All status</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-3">
              <Select value={planFilter} onValueChange={(v) => { setPlanFilter(v); setPage(1); }}>
                <SelectTrigger><SelectValue placeholder="Subscription Plan" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All plans</SelectItem>
                  <SelectItem value="Starter">Starter</SelectItem>
                  <SelectItem value="Growth">Growth</SelectItem>
                  <SelectItem value="Enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Select value={dateFilter} onValueChange={(v) => { setDateFilter(v); setPage(1); }}>
                <SelectTrigger><SelectValue placeholder="Date Filter" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All time</SelectItem>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-lg border overflow-hidden">
            <Table className="min-w-[1120px]">
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <button className="hover:underline" onClick={() => { setSortKey("name"); setSortDir((d) => sortKey === "name" ? (d === "asc" ? "desc" : "asc") : "asc"); }}>
                      Organization Name
                    </button>
                  </TableHead>
                  <TableHead>Owner Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Total Schools</TableHead>
                  <TableHead>Total Users</TableHead>
                  <TableHead>Subscription Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>
                    <button className="hover:underline" onClick={() => { setSortKey("createdDate"); setSortDir((d) => sortKey === "createdDate" ? (d === "asc" ? "desc" : "asc") : "desc"); }}>
                      Created Date
                    </button>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10}><div className="py-10 text-center text-sm text-muted-foreground">No organizations found.</div></TableCell>
                  </TableRow>
                ) : (
                  pageRows.map((org) => (
                    <TableRow key={org.id}>
                      <TableCell className="font-medium">{org.name}</TableCell>
                      <TableCell>{org.ownerName}</TableCell>
                      <TableCell>{org.email}</TableCell>
                      <TableCell>{org.phone}</TableCell>
                      <TableCell>{org.totalSchools}</TableCell>
                      <TableCell>{org.totalUsers}</TableCell>
                      <TableCell>{org.subscriptionPlan}</TableCell>
                      <TableCell><StatusPill status={org.status} /></TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(org.createdDate)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => toast({ title: "View organization", description: `Opening ${org.name}` })}><Eye className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => toast({ title: "Edit organization", description: `Editing ${org.name}` })}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => toast({ title: "Suspend organization", description: `Updating status for ${org.name}` })}><PauseCircle className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(org)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <Pagination page={page} pageSize={pageSize} total={filtered.length} onPageChange={setPage} />
        </CardContent>
      </Card>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this organization?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ? (
                <>
                  <span className="font-medium text-foreground">{deleteTarget.name}</span> will be removed from the
                  platform. This action can not be undone.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={!deleteTarget}
              onClick={() => {
                if (!deleteTarget) return;
                setRows((prev) => prev.filter((x) => x.id !== deleteTarget.id));
                toast({ title: "Organization deleted", description: `${deleteTarget.name} removed (demo).` });
                setDeleteTarget(null);
              }}
            >
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}
