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
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { exportCsv } from "@/modules/master-admin/utils/export-csv";
import { Pagination } from "../components/pagination";
import { Progress } from "@/components/ui/progress";
import {
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  GraduationCap,
  Building2,
  Users,
  Layers,
  Sparkles,
  School as SchoolIcon,
  Zap,
} from "lucide-react";
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
import {
  createSchoolAdmin,
  deleteSchool,
  getCatalogBoards,
  getMasterAdminSchools,
  getTokenTelemetry,
  patchSchool,
} from "@/api/masterAdmin";
import { fetchSignupOptions } from "@/api/signup";
import type { BoardResponse, SchoolSummary, SchoolTokenUsageApi, SignupOptions, TokenTelemetryResponseApi } from "@/api/types";

const onboardSchoolSchema = z.object({
  school_name: z.string().min(2, "School name is required"),
  board: z.string().min(1, "Curriculum / Board is required"),
  branch: z.string().optional(),
  admin_name: z.string().min(2, "Admin full name is required"),
  admin_email: z.string().email("Valid email is required"),
  admin_phone: z.string().min(6, "Phone number is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
type OnboardSchoolValues = z.infer<typeof onboardSchoolSchema>;

const editSchoolSchema = z.object({
  name: z.string().min(2, "School name is required"),
  board: z.string().min(1, "Board is required"),
  branch: z.string().optional(),
  email: z.union([z.literal(""), z.string().email("Valid email is required")]),
  phone: z.string(),
  website: z.string(),
  address: z.string(),
  grades_offered: z.string(),
  student_strength: z.string(),
  curricula: z.array(z.string()),
});
const NONE = "none";
type EditSchoolValues = z.infer<typeof editSchoolSchema>;

function formatDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

export default function MasterAdminSchoolsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [schools, setSchools] = useState<SchoolSummary[]>([]);
  const [boards, setBoards] = useState<BoardResponse[]>([]);
  const [telemetry, setTelemetry] = useState<TokenTelemetryResponseApi | null>(null);

  // Timeframe and Sorting Filters
  const [tokenTimeframe, setTokenTimeframe] = useState<"day" | "week" | "month" | "all">("month");
  const [sortBy, setSortBy] = useState<"name" | "tokens" | "students">("name");

  // Dialogs
  const [onboardOpen, setOnboardOpen] = useState(false);
  const [viewingSchool, setViewingSchool] = useState<SchoolSummary | null>(null);
  const [editingSchool, setEditingSchool] = useState<SchoolSummary | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SchoolSummary | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filters & Pagination
  const [query, setQuery] = useState("");
  const [boardFilter, setBoardFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const form = useForm<OnboardSchoolValues>({
    resolver: zodResolver(onboardSchoolSchema),
    defaultValues: {
      school_name: "",
      board: "CBSE",
      branch: "",
      admin_name: "",
      admin_email: "",
      admin_phone: "",
      password: "",
    },
  });

  const editForm = useForm<EditSchoolValues>({
    resolver: zodResolver(editSchoolSchema),
    defaultValues: {
      name: "",
      board: "CBSE",
      branch: "",
      email: "",
      phone: "",
      website: "",
      address: "",
      grades_offered: NONE,
      student_strength: NONE,
      curricula: [],
    },
  });

  const [options, setOptions] = useState<SignupOptions | null>(null);
  useEffect(() => {
    fetchSignupOptions().then(setOptions).catch(() => null);
  }, []);

  const refresh = async () => {
    try {
      const [sList, bList, telem] = await Promise.all([
        getMasterAdminSchools(),
        getCatalogBoards().catch(() => []),
        getTokenTelemetry(tokenTimeframe).catch(() => null),
      ]);
      setSchools(sList);
      setBoards(bList);
      setTelemetry(telem);
    } catch {
      toast({ title: "Failed to load schools", variant: "destructive" });
    }
  };

  useEffect(() => {
    refresh().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    getTokenTelemetry(tokenTimeframe)
      .then(setTelemetry)
      .catch(() => null);
  }, [tokenTimeframe]);

  // Map of school_id -> SchoolTokenUsageApi
  const schoolTokenMap = useMemo(() => {
    const map: Record<number, SchoolTokenUsageApi> = {};
    telemetry?.school_usage?.forEach((u) => {
      map[u.school_id] = u;
    });
    return map;
  }, [telemetry]);

  // Board options from catalog + schools
  const availableBoards = useMemo(() => {
    const set = new Set<string>();
    boards.forEach((b) => set.add(b.board));
    schools.forEach((s) => {
      if (s.board) set.add(s.board);
    });
    return Array.from(set).sort();
  }, [boards, schools]);

  // Derived KPI metrics
  const metrics = useMemo(() => {
    const totalCampuses = schools.length;
    const totalStudents = schools.reduce((acc, s) => acc + (s.student_count || 0), 0);
    const totalTutors = schools.reduce((acc, s) => acc + (s.tutor_count || 0), 0);
    const activeBoardsCount = new Set(schools.map((s) => s.board).filter(Boolean)).size;
    const totalTokens = telemetry?.total_platform_tokens || 0;
    const promptTokens = telemetry?.total_prompt_tokens || 0;
    const completionTokens = telemetry?.total_completion_tokens || 0;
    return {
      totalCampuses,
      totalStudents,
      totalTutors,
      activeBoardsCount,
      totalTokens,
      promptTokens,
      completionTokens,
    };
  }, [schools, telemetry]);

  // Filtered and Sorted rows
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = schools.filter((s) => {
      if (q) {
        const matchesName = s.name.toLowerCase().includes(q);
        const matchesBranch = s.branch ? s.branch.toLowerCase().includes(q) : false;
        const matchesBoard = s.board ? s.board.toLowerCase().includes(q) : false;
        if (!matchesName && !matchesBranch && !matchesBoard) return false;
      }
      if (boardFilter !== "all" && s.board !== boardFilter) return false;
      return true;
    });

    if (sortBy === "tokens") {
      list.sort((a, b) => {
        const tA = schoolTokenMap[a.id]?.total_tokens || 0;
        const tB = schoolTokenMap[b.id]?.total_tokens || 0;
        return tB - tA;
      });
    } else if (sortBy === "students") {
      list.sort((a, b) => (b.student_count || 0) - (a.student_count || 0));
    } else {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }

    return list;
  }, [schools, query, boardFilter, sortBy, schoolTokenMap]);

  const pageRows = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page],
  );

  // Onboard Submit
  const handleOnboardSubmit = async (values: OnboardSchoolValues) => {
    setIsSubmitting(true);
    try {
      await createSchoolAdmin({
        school_name: values.school_name.trim(),
        board: values.board,
        branch: values.branch?.trim() || undefined,
        full_name: values.admin_name.trim(),
        email: values.admin_email.trim(),
        phone: values.admin_phone.trim(),
        password: values.password,
      });
      toast({
        title: "School Onboarded",
        description: `Successfully registered "${values.school_name}" and created administrator.`,
      });
      setOnboardOpen(false);
      form.reset();
      await refresh();
    } catch (err: any) {
      toast({
        title: "Failed to onboard school",
        description: err.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit School
  const handleOpenEdit = (s: SchoolSummary) => {
    setEditingSchool(s);
    editForm.reset({
      name: s.name,
      board: s.board || "CBSE",
      branch: s.branch || "",
      email: s.email || "",
      phone: s.phone || "",
      website: s.website || "",
      address: s.address || "",
      grades_offered: s.grades_offered || NONE,
      student_strength: s.student_strength || NONE,
      curricula: s.curricula ?? [],
    });
  };

  const handleEditSubmit = async (values: EditSchoolValues) => {
    if (!editingSchool) return;
    setIsSubmitting(true);
    try {
      await patchSchool(editingSchool.id, {
        name: values.name.trim(),
        board: values.board,
        branch: values.branch?.trim() || null,
        email: values.email.trim() || null,
        phone: values.phone.trim() || null,
        website: values.website.trim() || null,
        address: values.address.trim() || null,
        grades_offered: values.grades_offered === NONE ? null : values.grades_offered,
        student_strength: values.student_strength === NONE ? null : values.student_strength,
        curricula: values.curricula,
      });
      toast({ title: "School updated", description: `Updated details for ${values.name}.` });
      setEditingSchool(null);
      await refresh();
    } catch (err: any) {
      toast({
        title: "Update failed",
        description: err.message || "Could not update school details.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete School
  const handleDeleteSchool = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteSchool(deleteTarget.id);
      toast({ title: "School deleted", description: `Removed "${deleteTarget.name}".` });
      setDeleteTarget(null);
      await refresh();
    } catch (err: any) {
      toast({
        title: "Delete failed",
        description: err.message || "Could not remove school.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <PageShell>
        <Skeleton className="h-8 w-[240px]" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </PageShell>
    );
  }

  return (
    <PageShell>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Schools Management</h1>
          <p className="text-sm text-muted-foreground">
            Onboard new educational institutions, manage campus administrators, and monitor student counts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              exportCsv({
                rows: filtered.map((s) => ({
                  ID: s.id,
                  Name: s.name,
                  Branch: s.branch || "Main",
                  Board: s.board || "CBSE",
                  Students: s.student_count || 0,
                  Tutors: s.tutor_count || 0,
                  Classes: s.class_count || 0,
                  Email: s.email || "",
                  Phone: s.phone || "",
                  Address: s.address || "",
                  Admins: s.school_admins?.map((a) => a.full_name).join("; ") || "None",
                  Created: formatDate(s.created_at),
                })),
                columns: [
                  { key: "ID", header: "School ID" },
                  { key: "Name", header: "School Name" },
                  { key: "Branch", header: "Branch" },
                  { key: "Board", header: "Board" },
                  { key: "Students", header: "Students Count" },
                  { key: "Tutors", header: "Tutors Count" },
                  { key: "Classes", header: "Classes Count" },
                  { key: "Email", header: "Email" },
                  { key: "Phone", header: "Phone" },
                  { key: "Address", header: "Address" },
                  { key: "Admins", header: "Administrators" },
                  { key: "Created", header: "Onboarding Date" },
                ],
                fileName: `schools_${new Date().toISOString().slice(0, 10)}.csv`,
              })
            }
            className="h-9 text-xs"
          >
            Export CSV
          </Button>

          <Dialog open={onboardOpen} onOpenChange={setOnboardOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-9 gap-1.5 text-xs bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4" />
                Onboard School
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <SchoolIcon className="h-5 w-5 text-primary" />
                  Onboard New School
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Register a campus and create the initial School Administrator credentials.
                </DialogDescription>
              </DialogHeader>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleOnboardSubmit)} className="space-y-4 pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="school_name"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel className="text-xs">School Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Delhi Public School" className="h-9 text-xs" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="board"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Curriculum / Board</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger className="h-9 text-xs">
                                <SelectValue placeholder="Select Board" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {availableBoards.length === 0 ? (
                                <SelectItem value="CBSE">CBSE</SelectItem>
                              ) : (
                                availableBoards.map((b) => (
                                  <SelectItem key={b} value={b}>
                                    {b}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="branch"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Branch / Campus</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. South Campus" className="h-9 text-xs" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="border-t pt-3">
                    <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
                      Campus Administrator Details
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="admin_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Admin Full Name</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. Dr. Rajesh Sharma" className="h-9 text-xs" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="admin_email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Email Address</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="admin@dps.edu" className="h-9 text-xs" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="admin_phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Contact Phone</FormLabel>
                            <FormControl>
                              <Input placeholder="+91 9876543210" className="h-9 text-xs" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Initial Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="••••••••" className="h-9 text-xs" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setOnboardOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" size="sm" disabled={isSubmitting}>
                      {isSubmitting ? "Onboarding..." : "Confirm & Create"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Total Campuses</p>
                <p className="text-2xl font-bold mt-1 text-foreground">{metrics.totalCampuses}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                <GraduationCap className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Curricula Covered</p>
                <p className="text-2xl font-bold mt-1 text-foreground">{metrics.activeBoardsCount}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600">
                <Layers className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Enrolled Students</p>
                <p className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
                  {metrics.totalStudents.toLocaleString()}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600">
                <Users className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Active Tutors</p>
                <p className="text-2xl font-bold mt-1 text-indigo-600 dark:text-indigo-400">
                  {metrics.totalTutors.toLocaleString()}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600">
                <Sparkles className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Token Usage Summary */}
      <Card className="shadow-sm">
        <CardContent className="p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                  AI Tokens Used ({tokenTimeframe === "all" ? "All time" : `This ${tokenTimeframe}`})
                </p>
                <p className="text-2xl font-bold text-foreground">{metrics.totalTokens.toLocaleString()}</p>
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
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-lg border bg-muted/20">
              <p className="text-muted-foreground">Prompt (input) tokens</p>
              <p className="text-base font-bold mt-0.5">{metrics.promptTokens.toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-lg border bg-muted/20">
              <p className="text-muted-foreground">Completion (output) tokens</p>
              <p className="text-base font-bold mt-0.5">{metrics.completionTokens.toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Table Card */}
      <Card className="shadow-sm">
        <CardContent className="p-5 space-y-4">
          {/* Search & Board Filter Bar */}
          <div className="flex justify-end">
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as "name" | "tokens" | "students")}>
              <SelectTrigger className="h-9 text-xs w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Sort: Name</SelectItem>
                <SelectItem value="tokens">Sort: Most tokens</SelectItem>
                <SelectItem value="students">Sort: Most students</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-3 sm:grid-cols-12">
            <div className="sm:col-span-8 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                className="pl-9 h-9 text-xs"
                placeholder="Search by school name, campus, or board..."
              />
            </div>

            <div className="sm:col-span-4">
              <Select
                value={boardFilter}
                onValueChange={(v) => {
                  setBoardFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="All Boards" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Boards</SelectItem>
                  {availableBoards.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
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
                  <TableHead className="min-w-[200px]">School Name</TableHead>
                  <TableHead className="w-28">Board</TableHead>
                  <TableHead className="w-36">Branch / Campus</TableHead>
                  <TableHead className="w-40">Administrator</TableHead>
                  <TableHead className="w-24 text-center">Students</TableHead>
                  <TableHead className="w-24 text-center">Tutors</TableHead>
                  <TableHead className="w-44">Tokens Used</TableHead>
                  <TableHead className="w-32">Onboarded</TableHead>
                  <TableHead className="w-28 text-right pr-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9}>
                      <div className="py-12 text-center flex flex-col items-center justify-center gap-2">
                        <Building2 className="h-8 w-8 text-muted-foreground/50" />
                        <p className="text-sm font-semibold text-foreground">
                          {query ? "No matching schools found." : "No schools registered in the system."}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Click "Onboard School" to register your first educational institution.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  pageRows.map((s) => {
                    const primaryAdmin = s.school_admins?.[0];
                    return (
                      <TableRow key={s.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-semibold text-foreground">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span>{s.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs uppercase font-mono font-medium">
                            {s.board || "CBSE"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{s.branch || "Main Campus"}</TableCell>
                        <TableCell>
                          {primaryAdmin ? (
                            <div className="text-xs">
                              <p className="font-medium text-foreground">{primaryAdmin.full_name}</p>
                              <p className="text-muted-foreground truncate text-[11px]">{primaryAdmin.email}</p>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">No admin assigned</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center font-mono text-xs font-semibold">
                          {(s.student_count || 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center font-mono text-xs font-semibold">
                          {(s.tutor_count || 0).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const tu = schoolTokenMap[s.id];
                            const used = tu?.total_tokens || 0;
                            const pct = Math.min(100, tu?.quota_used_percent || 0);
                            return (
                              <div className="space-y-1">
                                <p className="font-mono text-xs font-semibold">{used.toLocaleString()}</p>
                                <Progress value={pct} className="h-1" />
                                <p className="text-[10px] text-muted-foreground">
                                  D {(tu?.tokens_day || 0).toLocaleString()} · W {(tu?.tokens_week || 0).toLocaleString()} · M {(tu?.tokens_month || 0).toLocaleString()}
                                </p>
                              </div>
                            );
                          })()}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(s.created_at)}
                        </TableCell>
                        <TableCell className="text-right pr-3">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              title="View School Details"
                              onClick={() => setViewingSchool(s)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              title="Edit School"
                              onClick={() => handleOpenEdit(s)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              title="Delete School"
                              onClick={() => setDeleteTarget(s)}
                            >
                              <Trash2 className="h-4 w-4" />
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

          <Pagination page={page} pageSize={pageSize} total={filtered.length} onPageChange={setPage} />
        </CardContent>
      </Card>

      {/* VIEW DETAILS MODAL */}
      <Dialog open={!!viewingSchool} onOpenChange={(open) => !open && setViewingSchool(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SchoolIcon className="h-5 w-5 text-primary" />
              {viewingSchool?.name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {viewingSchool?.board} • {viewingSchool?.branch || "Main Campus"}
            </DialogDescription>
          </DialogHeader>

          {viewingSchool && (
            <div className="space-y-4 pt-2 text-xs">
              <div className="grid grid-cols-3 gap-3">
                {(
                  [
                    ["Students", viewingSchool.student_count],
                    ["Tutors", viewingSchool.tutor_count],
                    ["Classes", viewingSchool.class_count],
                  ] as const
                ).map(([label, n]) => (
                  <div key={label} className="p-3 rounded-lg border bg-muted/20">
                    <p className="text-muted-foreground">{label}</p>
                    <p className="text-lg font-bold text-foreground mt-0.5">{(n || 0).toLocaleString()}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 rounded-lg border bg-muted/20">
                {(
                  [
                    ["School ID", `#${viewingSchool.id}`],
                    ["Board", viewingSchool.board],
                    ["Branch / Campus", viewingSchool.branch || "Main Campus"],
                    ["Email", viewingSchool.email],
                    ["Phone", viewingSchool.phone],
                    ["Website", viewingSchool.website],
                    ["Address", viewingSchool.address],
                    ["Grades Offered", viewingSchool.grades_offered],
                    ["Student Strength", viewingSchool.student_strength],
                    ["Curricula", viewingSchool.curricula?.join(", ")],
                    ["Onboarded On", formatDate(viewingSchool.created_at)],
                  ] as [string, string | null | undefined][]
                ).map(([label, value]) => (
                  <div key={label}>
                    <p className="text-muted-foreground">{label}</p>
                    <p className="font-semibold text-foreground mt-0.5 break-words">{value || "—"}</p>
                  </div>
                ))}
              </div>

              {(() => {
                const tu = schoolTokenMap[viewingSchool.id];
                return (
                  <div className="p-3 rounded-lg border bg-amber-500/5 space-y-2">
                    <h4 className="font-semibold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5 text-amber-600" /> Token Usage
                    </h4>
                    <div className="grid grid-cols-3 gap-2">
                      {(
                        [
                          ["Today", tu?.tokens_day],
                          ["This week", tu?.tokens_week],
                          ["This month", tu?.tokens_month],
                        ] as const
                      ).map(([label, n]) => (
                        <div key={label}>
                          <p className="text-muted-foreground">{label}</p>
                          <p className="font-bold">{(n || 0).toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              <div>
                <h4 className="font-semibold text-foreground uppercase tracking-wider text-[11px] mb-2">
                  Campus Administrators ({viewingSchool.school_admins?.length || 0})
                </h4>
                {viewingSchool.school_admins?.length ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {viewingSchool.school_admins.map((adm) => (
                      <div key={adm.id} className="p-2.5 rounded-lg border flex items-center justify-between">
                        <div>
                          <p className="font-bold text-foreground">{adm.full_name}</p>
                          <p className="text-muted-foreground text-[11px]">{adm.email}</p>
                        </div>
                        <Badge variant="outline" className="text-[10px]">
                          {adm.is_active ? "Admin" : "Suspended"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground italic">No administrators configured.</p>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    handleOpenEdit(viewingSchool);
                    setViewingSchool(null);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
                </Button>
                <Button size="sm" onClick={() => setViewingSchool(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* EDIT MODAL */}
      <Dialog open={!!editingSchool} onOpenChange={(open) => !open && setEditingSchool(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit School Info</DialogTitle>
            <DialogDescription className="text-xs">Update campus profile, contacts and curriculum mapping.</DialogDescription>
          </DialogHeader>

          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-3 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">School Name</FormLabel>
                    <FormControl>
                      <Input className="h-9 text-xs" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="board"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Board</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="Select Board" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableBoards.map((b) => (
                          <SelectItem key={b} value={b}>
                            {b}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="branch"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Branch / Campus</FormLabel>
                    <FormControl>
                      <Input className="h-9 text-xs" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {(
                [
                  ["email", "Email", "email"],
                  ["phone", "Phone", "tel"],
                  ["website", "Website", "url"],
                ] as const
              ).map(([name, label, type]) => (
                <FormField
                  key={name}
                  control={editForm.control}
                  name={name}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">{label}</FormLabel>
                      <FormControl>
                        <Input type={type} className="h-9 text-xs" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}

              {(
                [
                  ["grades_offered", "Grades Offered", options?.school_grade_ranges],
                  ["student_strength", "Student Strength", options?.student_strength],
                ] as const
              ).map(([name, label, opts]) => (
                <FormField
                  key={name}
                  control={editForm.control}
                  name={name}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">{label}</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={NONE}>Not set</SelectItem>
                          {(opts ?? []).map((o) => (
                            <SelectItem key={o} value={o}>
                              {o}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              ))}

              <FormField
                control={editForm.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Address</FormLabel>
                    <FormControl>
                      <Input className="h-9 text-xs" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              </div>

              <FormField
                control={editForm.control}
                name="curricula"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Curricula</FormLabel>
                    <div className="flex flex-wrap gap-1.5">
                      {(options?.curricula ?? []).map((c) => {
                        const on = field.value.includes(c);
                        return (
                          <Button
                            key={c}
                            type="button"
                            size="sm"
                            variant={on ? "default" : "outline"}
                            className="h-7 px-3 text-xs"
                            aria-pressed={on}
                            onClick={() => field.onChange(on ? field.value.filter((x) => x !== c) : [...field.value, c])}
                          >
                            {c}
                          </Button>
                        );
                      })}
                    </div>
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setEditingSchool(null)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete School Campus?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{deleteTarget?.name}</strong>? This action will unlink associated
              school configurations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <Button variant="destructive" disabled={isDeleting} onClick={handleDeleteSchool}>
              {isDeleting ? "Deleting..." : "Delete School"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}
