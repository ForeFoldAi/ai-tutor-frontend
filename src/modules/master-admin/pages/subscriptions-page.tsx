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
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { demoSubscriptionPlans, type SubscriptionPlan } from "../data/demo-master-admin";
import { Copy, Pencil, Archive, Plus } from "lucide-react";

const editPlanSchema = z.object({
  plan_name: z.string().min(2),
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
  const [plans, setPlans] = useState<SubscriptionPlan[]>(demoSubscriptionPlans);
  const [editing, setEditing] = useState<SubscriptionPlan | null>(null);

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
    const t = window.setTimeout(() => setLoading(false), 470);
    return () => window.clearTimeout(t);
  }, []);

  const openEdit = (p: SubscriptionPlan) => {
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

  if (loading) {
    return (
      <PageShell>
        <Skeleton className="h-7 w-[220px]" />
        <div className="grid gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-80 w-full" />
          ))}
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Subscriptions</h1>
          <p className="text-sm text-muted-foreground">Manage pricing plans and capacity controls.</p>
        </div>
        <Button onClick={() => {
          toast({ title: "Create plan", description: "Open create-plan flow (demo)." });
        }}>
          <Plus className="mr-2 h-4 w-4" />
          Create New Plan
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {plans.map((plan) => (
          <Card key={plan.id} className="overflow-hidden">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>{plan.supportLevel} support</CardDescription>
                </div>
                <Badge variant={plan.active ? "default" : "outline"}>{plan.active ? "Active" : "Archived"}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-3xl font-bold">${plan.monthlyPrice}</p>
                <p className="text-xs text-muted-foreground">${plan.yearlyPrice}/year</p>
              </div>

              <div className="space-y-2 text-sm">
                <p>Schools limit: <span className="font-medium">{plan.schoolsLimit}</span></p>
                <p>Users limit: <span className="font-medium">{plan.usersLimit}</span></p>
                <p>AI usage credits: <span className="font-medium">{plan.aiUsageCredits.toLocaleString()}</span></p>
                <p>Storage: <span className="font-medium">{plan.storageGb} GB</span></p>
              </div>

              <div className="space-y-2">
                {plan.features.map((f) => (
                  <div key={f} className="text-xs text-muted-foreground">• {f}</div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => openEdit(plan)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit Plan
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPlans((prev) => [
                      ...prev,
                      { ...plan, id: `${plan.id}_copy_${Date.now()}`, name: `${plan.name}` },
                    ]);
                    toast({ title: "Plan duplicated", description: `${plan.name} duplicated (demo).` });
                  }}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Duplicate
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="col-span-2"
                  onClick={() => {
                    setPlans((prev) => prev.map((p) => (p.id === plan.id ? { ...p, active: !p.active } : p)));
                    toast({ title: plan.active ? "Plan archived" : "Plan activated", description: `${plan.name} updated.` });
                  }}
                >
                  <Archive className="mr-2 h-4 w-4" />
                  {plan.active ? "Archive" : "Activate"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={editing !== null} onOpenChange={(open) => { if (!open) setEditing(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Plan Edit Form</DialogTitle>
            <DialogDescription>Update pricing, limits, and features.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              className="grid gap-3 md:grid-cols-2 pt-2"
              onSubmit={form.handleSubmit((v) => {
                if (!editing) return;
                setPlans((prev) =>
                  prev.map((p) =>
                    p.id === editing.id
                      ? {
                          ...p,
                          name: v.plan_name as SubscriptionPlan["name"],
                          monthlyPrice: v.price_monthly,
                          yearlyPrice: v.price_yearly,
                          schoolsLimit: v.max_schools,
                          usersLimit: v.max_users,
                          aiUsageCredits: v.ai_credits,
                          storageGb: v.storage_gb,
                          supportLevel: v.support_level as SubscriptionPlan["supportLevel"],
                          features: v.features_csv.split(",").map((x) => x.trim()).filter(Boolean),
                          active: v.active,
                        }
                      : p,
                  ),
                );
                toast({ title: "Plan updated", description: `${v.plan_name} saved.` });
                setEditing(null);
              })}
            >
              <FormField control={form.control} name="plan_name" render={({ field }) => (
                <FormItem className="md:col-span-2"><FormLabel>Plan Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="price_monthly" render={({ field }) => (
                <FormItem><FormLabel>Price Monthly</FormLabel><FormControl><Input type="number" min={0} {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="price_yearly" render={({ field }) => (
                <FormItem><FormLabel>Price Yearly</FormLabel><FormControl><Input type="number" min={0} {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="max_schools" render={({ field }) => (
                <FormItem><FormLabel>Max Schools</FormLabel><FormControl><Input type="number" min={1} {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="max_users" render={({ field }) => (
                <FormItem><FormLabel>Max Users</FormLabel><FormControl><Input type="number" min={1} {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="ai_credits" render={({ field }) => (
                <FormItem><FormLabel>AI Credits</FormLabel><FormControl><Input type="number" min={1} {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="storage_gb" render={({ field }) => (
                <FormItem><FormLabel>Storage GB</FormLabel><FormControl><Input type="number" min={1} {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="support_level" render={({ field }) => (
                <FormItem className="md:col-span-2"><FormLabel>Support Level</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="features_csv" render={({ field }) => (
                <FormItem className="md:col-span-2"><FormLabel>Features List (comma-separated)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="active" render={({ field }) => (
                <FormItem className="md:col-span-2 flex items-center justify-between rounded-lg border p-3">
                  <div><FormLabel>Active Toggle</FormLabel></div>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )} />
              <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
                <Button type="submit">Save Plan</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

