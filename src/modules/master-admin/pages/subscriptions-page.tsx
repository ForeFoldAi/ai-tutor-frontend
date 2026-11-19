import { useEffect, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PageShell } from "@/components/page-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Pencil,
  Plus,
  CheckCircle2,
  Building2,
  Users,
  Database,
  CreditCard,
} from "lucide-react";
import { getAdminUsers, getEmbeddingStats, getMasterAdminSchools } from "@/api/masterAdmin";
import type { EmbeddingStatsApi, SchoolSummary, ApiUser } from "@/api/types";

export interface PlatformTierPlan {
  id: string;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  schoolsLimit: number;
  usersLimit: number;
  aiUsageCredits: number;
  storageGb: number;
  supportLevel: string;
  features: string[];
  active: boolean;
}

const STORAGE_KEY = "master_admin_subscription_plans";

const DEFAULT_PLANS: PlatformTierPlan[] = [
  {
    id: "plan-starter",
    name: "Starter Campus",
    monthlyPrice: 299,
    yearlyPrice: 2990,
    schoolsLimit: 3,
    usersLimit: 500,
    aiUsageCredits: 50000,
    storageGb: 25,
    supportLevel: "Standard Email",
    features: ["Up to 3 Campuses", "500 Active Students", "Standard OCR Pipeline", "Basic Tutoring RAG"],
    active: true,
  },
  {
    id: "plan-growth",
    name: "Institutional Pro",
    monthlyPrice: 799,
    yearlyPrice: 7990,
    schoolsLimit: 15,
    usersLimit: 3500,
    aiUsageCredits: 250000,
    storageGb: 150,
    supportLevel: "Priority 24/7",
    features: [
      "Up to 15 Campuses",
      "3,500 Active Students",
      "Dedicated High-Speed Embedding Queue",
      "Custom Pedagogical Chunking",
      "Multi-Board Syllabi",
    ],
    active: true,
  },
  {
    id: "plan-enterprise",
    name: "Enterprise Multi-School",
    monthlyPrice: 1999,
    yearlyPrice: 19990,
    schoolsLimit: 100,
    usersLimit: 25000,
    aiUsageCredits: 2000000,
    storageGb: 1000,
    supportLevel: "Dedicated SLA & Account Manager",
    features: [
      "Unlimited / 100 Campuses",
      "25,000+ Enrolled Learners",
      "Private Vector Indexing",
      "Custom TTS Voice Cloning",
      "Complete White-Labeling",
    ],
    active: true,
  },
];

const editPlanSchema = z.object({
  plan_name: z.string().min(2, "Plan name is required"),
  price_monthly: z.coerce.number().min(0),
  price_yearly: z.coerce.number().min(0),
  max_schools: z.coerce.number().int().min(1),
  max_users: z.coerce.number().int().min(1),
  ai_credits: z.coerce.number().int().min(1),
  storage_gb: z.coerce.number().int().min(1),
  support_level: z.string().min(2),
  features_csv: z.string().min(2),
  active: z.boolean(),
});
type EditPlanValues = z.infer<typeof editPlanSchema>;

export default function MasterAdminSubscriptionsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);

  // Live usage from backend APIs
  const [schools, setSchools] = useState<SchoolSummary[]>([]);
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [embeddingStats, setEmbeddingStats] = useState<EmbeddingStatsApi | null>(null);

  // Persistent Plans
  const [plans, setPlans] = useState<PlatformTierPlan[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_PLANS;
  });

  const [editing, setEditing] = useState<PlatformTierPlan | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const form = useForm<EditPlanValues>({
    resolver: zodResolver(editPlanSchema),
    defaultValues: {
      plan_name: "",
      price_monthly: 0,
      price_yearly: 0,
      max_schools: 1,
      max_users: 100,
      ai_credits: 1000,
      storage_gb: 5,
      support_level: "Standard",
      features_csv: "",
      active: true,
    },
  });

  useEffect(() => {
    Promise.all([
      getMasterAdminSchools().catch(() => []),
      getAdminUsers().catch(() => []),
      getEmbeddingStats().catch(() => null),
    ])
      .then(([s, u, st]) => {
        setSchools(s);
        setUsers(u);
        setEmbeddingStats(st);
      })
      .finally(() => setLoading(false));
  }, []);

  const savePlansToStorage = (updated: PlatformTierPlan[]) => {
    setPlans(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  };

  const openEdit = (p: PlatformTierPlan) => {
    setIsCreating(false);
    form.reset({
      plan_name: p.name,
      price_monthly: p.monthlyPrice,
      price_yearly: p.yearlyPrice,
      max_schools: p.schoolsLimit,
      max_users: p.usersLimit,
      ai_credits: p.aiUsageCredits,
      storage_gb: p.storageGb,
      support_level: p.supportLevel,
      features_csv: p.features.join(", "),
      active: p.active,
    });
    setEditing(p);
  };

  const openCreate = () => {
    setIsCreating(true);
    form.reset({
      plan_name: "",
      price_monthly: 499,
      price_yearly: 4990,
      max_schools: 5,
      max_users: 1000,
      ai_credits: 100000,
      storage_gb: 50,
      support_level: "Standard Email",
      features_csv: "Multi-Campus Setup, Dedicated RAG Pipeline",
      active: true,
    });
    setEditing({
      id: `plan-${Date.now()}`,
      name: "",
      monthlyPrice: 499,
      yearlyPrice: 4990,
      schoolsLimit: 5,
      usersLimit: 1000,
      aiUsageCredits: 100000,
      storageGb: 50,
      supportLevel: "Standard",
      features: [],
      active: true,
    });
  };

  const handleSavePlan = (values: EditPlanValues) => {
    if (!editing) return;
    const feats = values.features_csv
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const updatedPlan: PlatformTierPlan = {
      id: editing.id,
      name: values.plan_name.trim(),
      monthlyPrice: values.price_monthly,
      yearlyPrice: values.price_yearly,
      schoolsLimit: values.max_schools,
      usersLimit: values.max_users,
      aiUsageCredits: values.ai_credits,
      storageGb: values.storage_gb,
      supportLevel: values.support_level.trim(),
      features: feats.length > 0 ? feats : ["General platform access"],
      active: values.active,
    };

    let nextPlans: PlatformTierPlan[];
    if (isCreating) {
      nextPlans = [...plans, updatedPlan];
      toast({ title: "Plan Created", description: `Added "${updatedPlan.name}" tier.` });
    } else {
      nextPlans = plans.map((p) => (p.id === editing.id ? updatedPlan : p));
      toast({ title: "Plan Updated", description: `Saved changes to "${updatedPlan.name}".` });
    }
    savePlansToStorage(nextPlans);
    setEditing(null);
  };

  // Real Platform Capacities
  const currentSchools = schools.length;
  const currentUsers = users.length;
  const currentChunks = embeddingStats?.total_chunks || 0;

  if (loading) {
    return (
      <PageShell>
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-96 w-full" />
          ))}
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Subscriptions & Capacity</h1>
          <p className="text-sm text-muted-foreground">
            Configure institutional tiers, campus quotas, and monitor platform-wide capacity usage.
          </p>
        </div>
        <Button size="sm" onClick={openCreate} className="h-9 gap-1.5 text-xs bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4" />
          Create New Plan
        </Button>
      </div>

      {/* Live Platform Utilization vs Quotas */}
      <Card className="shadow-sm border-primary/20 bg-gradient-to-r from-primary/5 via-card to-card">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                Live Platform Utilization
              </h3>
              <p className="text-xs text-muted-foreground">
                Actual resource consumption across all connected institutions.
              </p>
            </div>
            <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
              Capacity Status: Healthy
            </Badge>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="p-3 rounded-xl border bg-muted/20 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5" />
                  Onboarded Campuses
                </span>
                <span className="font-bold text-foreground">{currentSchools} Active</span>
              </div>
              <Progress value={Math.min(100, (currentSchools / 25) * 100)} className="h-2" />
            </div>

            <div className="p-3 rounded-xl border bg-muted/20 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  Total Registered Users
                </span>
                <span className="font-bold text-foreground">{currentUsers} Users</span>
              </div>
              <Progress value={Math.min(100, (currentUsers / 1000) * 100)} className="h-2" />
            </div>

            <div className="p-3 rounded-xl border bg-muted/20 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Database className="h-3.5 w-3.5" />
                  AI Vector Chunks
                </span>
                <span className="font-bold text-foreground">{currentChunks.toLocaleString()}</span>
              </div>
              <Progress value={Math.min(100, (currentChunks / 50000) * 100)} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subscription Tier Cards */}
      <div className="grid gap-4 lg:grid-cols-3">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            className={`shadow-sm overflow-hidden flex flex-col justify-between transition-all hover:shadow-md ${
              !plan.active ? "opacity-60 bg-muted/30" : "bg-card border-border/70"
            }`}
          >
            <div>
              <CardHeader className="pb-4 border-b">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base font-bold">{plan.name}</CardTitle>
                    <CardDescription className="text-xs">{plan.supportLevel} Support</CardDescription>
                  </div>
                  <Badge variant={plan.active ? "default" : "outline"} className="text-[10px]">
                    {plan.active ? "Active Tier" : "Archived"}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="pt-4 space-y-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-foreground tracking-tight">₹{plan.monthlyPrice.toLocaleString("en-IN")}</span>
                  <span className="text-xs text-muted-foreground">/ month</span>
                  <span className="text-[11px] text-muted-foreground ml-auto font-mono">
                    ₹{plan.yearlyPrice.toLocaleString("en-IN")} billed yearly
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div className="p-2 rounded-lg bg-muted/30 border">
                    <p className="text-muted-foreground text-[10px] uppercase font-semibold">Max Campuses</p>
                    <p className="font-bold text-sm text-foreground mt-0.5">{plan.schoolsLimit}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/30 border">
                    <p className="text-muted-foreground text-[10px] uppercase font-semibold">Max Users</p>
                    <p className="font-bold text-sm text-foreground mt-0.5">{plan.usersLimit.toLocaleString()}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/30 border">
                    <p className="text-muted-foreground text-[10px] uppercase font-semibold">AI Credits</p>
                    <p className="font-bold text-sm text-foreground mt-0.5">{plan.aiUsageCredits.toLocaleString()}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/30 border">
                    <p className="text-muted-foreground text-[10px] uppercase font-semibold">Storage</p>
                    <p className="font-bold text-sm text-foreground mt-0.5">{plan.storageGb} GB</p>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t">
                  <p className="text-xs font-semibold text-foreground uppercase tracking-wider text-[10px]">
                    Included Features
                  </p>
                  <ul className="space-y-1.5 text-xs text-muted-foreground">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </div>

            <div className="p-4 border-t bg-muted/20 flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs gap-1.5"
                onClick={() => openEdit(plan)}
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit Plan & Quotas
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* EDIT / CREATE PLAN DIALOG */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              {isCreating ? "Create Subscription Plan" : `Edit ${editing?.name}`}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure institutional pricing, capacity limits, and tier feature sets.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSavePlan)} className="space-y-3 pt-2">
              <FormField
                control={form.control}
                name="plan_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Plan Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Enterprise Tier" className="h-9 text-xs" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="price_monthly"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Monthly Price (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" className="h-9 text-xs" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="price_yearly"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Yearly Price (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" className="h-9 text-xs" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="max_schools"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Max Campuses</FormLabel>
                      <FormControl>
                        <Input type="number" className="h-9 text-xs" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="max_users"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Max Active Users</FormLabel>
                      <FormControl>
                        <Input type="number" className="h-9 text-xs" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="ai_credits"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Monthly AI Tokens</FormLabel>
                      <FormControl>
                        <Input type="number" className="h-9 text-xs" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="storage_gb"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Storage Limit (GB)</FormLabel>
                      <FormControl>
                        <Input type="number" className="h-9 text-xs" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="support_level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Support Level</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. 24/7 SLA Priority" className="h-9 text-xs" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="features_csv"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Features (comma separated)</FormLabel>
                    <FormControl>
                      <Input placeholder="Feature 1, Feature 2, Feature 3" className="h-9 text-xs" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="active"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <FormLabel className="text-xs font-semibold">Active Plan</FormLabel>
                      <p className="text-[11px] text-muted-foreground">Available for schools to select</p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button type="button" variant="outline" size="sm" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm">
                  {isCreating ? "Create Plan" : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
