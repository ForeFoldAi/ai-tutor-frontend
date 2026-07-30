import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { exportCsv } from "@/modules/master-admin/utils/export-csv";
import type { School } from "../data/demo-master-admin";
import { demoOrganizations, demoSchools } from "../data/demo-master-admin";
import { Pagination } from "../components/pagination";
import { StatusPill } from "../components/status-pill";
import { Plus, Search, Eye, Pencil, Trash2, PauseCircle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

const onboardSchoolSchema = z.object({
  school_name: z.string().min(2, "School name is required"),
  organization: z.string().min(2, "Organization is required"),
  principal_name: z.string().min(2, "Principal name is required"),
  email: z.string().email("Email must be valid"),
  phone: z.string().min(6, "Phone is required"),
  address: z.string().min(2, "Address is required"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  country: z.string().min(2, "Country is required"),
  school_type: z.string().min(2, "School type is required"),
  status: z.string().min(1, "Status is required"),
});

type OnboardSchoolValues = z.infer<typeof onboardSchoolSchema>;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

function getUnique<T>(items: T[]) {
  return Array.from(new Set(items));
}

export default function MasterAdminSchoolsPage() {
  const { toast } = useToast();

  const organizations = useMemo(() => demoOrganizations, []);

  const [loading, setLoading] = useState(true);
  const [onboardOpen, setOnboardOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<School | null>(null);

  const [query, setQuery] = useState("");
  const [orgFilter, setOrgFilter] = useState<string>("all");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [sortKey, setSortKey] = useState<keyof School>("createdDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [page, setPage] = useState(1);
  const pageSize = 8;

  const cities = useMemo(() => getUnique(demoSchools.map((s) => s.city)).sort(), []);

  useEffect(() => {
    const t = window.setTimeout(() => setLoading(false), 550);
    return () => window.clearTimeout(t);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = demoSchools.filter((s) => {
      if (q && !s.name.toLowerCase().includes(q)) return false;
      if (orgFilter !== "all" && s.organizationName !== orgFilter) return false;
      if (cityFilter !== "all" && s.city !== cityFilter) return false;
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      return true;
    });

    rows.sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const av = typeof aVal === "string" ? +new Date(aVal) || (aVal as any) : (aVal as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bv = typeof bVal === "string" ? +new Date(bVal) || (bVal as any) : (bVal as any);
      const diff = av > bv ? 1 : av < bv ? -1 : 0;
      return sortDir === "asc" ? diff : -diff;
    });

    return rows;
  }, [query, orgFilter, cityFilter, statusFilter, sortKey, sortDir]);

  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page]);

  const form = useForm<OnboardSchoolValues>({
    resolver: zodResolver(onboardSchoolSchema),
    defaultValues: {
      school_name: "",
      organization: "",
      principal_name: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      state: "",
      country: "",
      school_type: "Secondary",
      status: "Active",
    },
  });

  if (loading) {
    return (
      <PageShell>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-7 w-[220px]" />
            <Skeleton className="h-4 w-[420px]" />
          </div>
          <Skeleton className="h-9 w-[180px]" />
        </div>
        <Card>
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-10 w-full" />
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
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Schools</h1>
          <p className="text-sm text-muted-foreground">Manage campuses across organizations, with fast search and onboarding.</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              exportCsv({
                rows: filtered,
                columns: [
                  { key: "name", header: "School Name" },
                  { key: "organizationName", header: "Organization" },
                  { key: "principalName", header: "Principal Name" },
                  { key: "email", header: "Email" },
                  { key: "phone", header: "Phone" },
                  { key: "students", header: "Students" },
                  { key: "tutors", header: "Tutors" },
                  { key: "status", header: "Status" },
                  { key: "createdDate", header: "Created Date" },
                ],
                fileName: `schools_${new Date().toISOString().slice(0, 10)}.csv`,
              });
              toast({ title: "Export started", description: "Schools CSV is being downloaded." });
            }}
          >
            Export CSV
          </Button>

          <Dialog open={onboardOpen} onOpenChange={setOnboardOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Onboard School
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Onboard a school</DialogTitle>
                <DialogDescription>Create the campus record and activate school-level access.</DialogDescription>
              </DialogHeader>

              <Form {...form}>
                <form
                  className="grid gap-3 md:grid-cols-2 pt-2"
                  onSubmit={form.handleSubmit((v) => {
                    toast({
                      title: "School onboarding submitted",
                      description: `${v.school_name} will be reviewed and created.`,
                    });
                    setOnboardOpen(false);
                    form.reset();
                  })}
                >
                  <FormField
                    control={form.control}
                    name="school_name"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>School Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Riverside Institute - Central Campus" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="organization"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Organization</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select organization" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {organizations.map((o) => (
                              <SelectItem key={o.id} value={o.name}>
                                {o.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="principal_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Principal Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Dr. Maria Fernandes" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="principal@school.edu" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="+91 90000 12345" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Input placeholder="Street, building, landmark" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g. Bengaluru" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g. Karnataka" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Country</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g. India" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="school_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>School Type</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select school type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Primary">Primary</SelectItem>
                            <SelectItem value="Middle">Middle</SelectItem>
                            <SelectItem value="Secondary">Secondary</SelectItem>
                            <SelectItem value="Higher Secondary">Higher Secondary</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Active">Active</SelectItem>
                            <SelectItem value="Pending">Pending</SelectItem>
                            <SelectItem value="Suspended">Suspended</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => setOnboardOpen(false)} disabled={form.formState.isSubmitting}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                      {form.formState.isSubmitting ? "Submitting..." : "Onboard school"}
                    </Button>
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
            <div className="md:col-span-5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search school name..."
                  className="pl-9"
                />
              </div>
            </div>

            <div className="md:col-span-3">
              <Select
                value={orgFilter}
                onValueChange={(v) => {
                  setOrgFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Organization" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All organizations</SelectItem>
                  {organizations.map((o) => (
                    <SelectItem key={o.id} value={o.name}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2">
              <Select
                value={cityFilter}
                onValueChange={(v) => {
                  setCityFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="City" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All cities</SelectItem>
                  {cities.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2">
              <Select
                value={statusFilter}
                onValueChange={(v) => {
                  setStatusFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All status</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-lg border overflow-hidden">
            <Table className="min-w-[1120px]">
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <button
                      className="inline-flex items-center gap-1 hover:underline"
                      onClick={() => {
                        setSortKey("name");
                        setSortDir((d) => (sortKey === "name" ? (d === "asc" ? "desc" : "asc") : "asc"));
                      }}
                    >
                      School Name
                    </button>
                  </TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Principal Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Students</TableHead>
                  <TableHead>Tutors</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>
                    <button
                      className="inline-flex items-center gap-1 hover:underline"
                      onClick={() => {
                        setSortKey("createdDate");
                        setSortDir((d) => (sortKey === "createdDate" ? (d === "asc" ? "desc" : "asc") : "desc"));
                      }}
                    >
                      Created Date
                    </button>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10}>
                      <div className="py-10 text-center text-sm text-muted-foreground">No schools found.</div>
                    </TableCell>
                  </TableRow>
                ) : (
                  pageRows.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell>{s.organizationName}</TableCell>
                      <TableCell>{s.principalName}</TableCell>
                      <TableCell>{s.email}</TableCell>
                      <TableCell>{s.phone}</TableCell>
                      <TableCell>{s.students.toLocaleString()}</TableCell>
                      <TableCell>{s.tutors.toLocaleString()}</TableCell>
                      <TableCell>
                        <StatusPill status={s.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(s.createdDate)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toast({ title: "View school", description: `Opening ${s.name}` })}
                            aria-label={`View ${s.name}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toast({ title: "Edit school", description: `Editing ${s.name}` })}
                            aria-label={`Edit ${s.name}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toast({ title: "Suspend/Activate", description: `Updating status for ${s.name}` })}
                            aria-label={`Suspend ${s.name}`}
                          >
                            <PauseCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteTarget(s)}
                            aria-label={`Delete ${s.name}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
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

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this school?</AlertDialogTitle>
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
                toast({ title: "School deleted", description: "The school will be deleted (demo)." });
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

