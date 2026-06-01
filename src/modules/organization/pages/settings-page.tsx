import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Building2, UserCircle } from "lucide-react";
import { getOrganizationDetail, updateOrganization } from "@/api/organization";
import { updateMyProfile } from "@/api/profile";
import { useAuthStore } from "@/lib/auth-store";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataState } from "@/modules/shared/components/data-state";

function messageFromApiError(err: unknown): string {
  if (!(err instanceof Error)) return "Something went wrong.";
  const t = err.message;
  try {
    const j = JSON.parse(t) as { detail?: unknown };
    if (typeof j.detail === "string") return j.detail;
    if (Array.isArray(j.detail) && j.detail[0] && typeof j.detail[0] === "object" && "msg" in j.detail[0]) {
      return String((j.detail[0] as { msg: string }).msg);
    }
  } catch {
    /* use raw message */
  }
  return t || "Request failed.";
}

const orgSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  phone: z.string().optional(),
  address: z.string().optional(),
});

const profileSchema = z
  .object({
    full_name: z.string().min(2, "Name must be at least 2 characters."),
    email: z.string().email("Enter a valid email."),
    current_password: z.string().optional(),
    new_password: z.string().optional(),
    confirm_password: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const np = data.new_password?.trim();
    const cur = data.current_password?.trim();
    if (np) {
      if (np.length < 8) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "New password must be at least 8 characters.",
          path: ["new_password"],
        });
      }
      if (!cur) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Enter your current password to set a new one.",
          path: ["current_password"],
        });
      }
    }
    if (np && data.confirm_password?.trim() !== np) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Passwords do not match.",
        path: ["confirm_password"],
      });
    }
  });

type OrgFormValues = z.infer<typeof orgSchema>;
type ProfileFormValues = z.infer<typeof profileSchema>;

export default function OrganizationSettingsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);

  const orgQuery = useQuery({
    queryKey: ["organization", "organization-profile"],
    queryFn: getOrganizationDetail,
  });

  const orgForm = useForm<OrgFormValues>({
    resolver: zodResolver(orgSchema),
    defaultValues: { name: "", phone: "", address: "" },
  });

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: "",
      email: "",
      current_password: "",
      new_password: "",
      confirm_password: "",
    },
  });

  useEffect(() => {
    const d = orgQuery.data;
    if (d) {
      orgForm.reset({
        name: d.name,
        phone: d.phone ?? "",
        address: d.address ?? "",
      });
    }
  }, [orgQuery.data, orgForm]);

  useEffect(() => {
    if (user) {
      profileForm.reset({
        full_name: user.fullName,
        email: user.email,
        current_password: "",
        new_password: "",
        confirm_password: "",
      });
    }
  }, [user, profileForm]);

  const orgMutation = useMutation({
    mutationFn: (values: OrgFormValues) =>
      updateOrganization({
        name: values.name,
        phone: values.phone?.trim() || null,
        address: values.address?.trim() || null,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["organization", "organization-profile"] });
      void qc.invalidateQueries({ queryKey: ["organization", "schools"] });
      toast({ title: "Organization updated", description: "Your organization details were saved." });
    },
    onError: (e) => {
      toast({
        title: "Could not save organization",
        description: messageFromApiError(e),
        variant: "destructive",
      });
    },
  });

  const profileMutation = useMutation({
    mutationFn: (values: ProfileFormValues) => {
      const np = values.new_password?.trim();
      return updateMyProfile({
        full_name: values.full_name,
        email: values.email,
        ...(values.current_password?.trim() ? { current_password: values.current_password.trim() } : {}),
        ...(np ? { new_password: np } : {}),
      });
    },
    onSuccess: (me) => {
      updateUser({
        fullName: me.full_name,
        email: me.email,
        username: me.email.split("@", 1)[0] || me.email,
      });
      profileForm.reset({
        full_name: me.full_name,
        email: me.email,
        current_password: "",
        new_password: "",
        confirm_password: "",
      });
      toast({ title: "Profile updated", description: "Your account details were saved." });
    },
    onError: (e) => {
      toast({
        title: "Could not save profile",
        description: messageFromApiError(e),
        variant: "destructive",
      });
    },
  });

  return (
    <div className="p-6 space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Organization settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your organization profile and your administrator account. Changes apply immediately for new sessions;
          updating your password signs out other devices.
        </p>
      </div>

      <Tabs defaultValue="organization" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 h-10">
          <TabsTrigger value="organization" className="gap-2">
            <Building2 className="h-4 w-4" />
            Organization
          </TabsTrigger>
          <TabsTrigger value="account" className="gap-2">
            <UserCircle className="h-4 w-4" />
            Your account
          </TabsTrigger>
        </TabsList>

        <TabsContent value="organization" className="mt-6">
          <DataState
            loading={orgQuery.isLoading}
            error={orgQuery.error ? messageFromApiError(orgQuery.error) : null}
            empty={!orgQuery.data}
            emptyText="No organization data."
            onRetry={() => void orgQuery.refetch()}
          >
            <Card className="border-border/80">
              <CardHeader>
                <CardTitle>Organization profile</CardTitle>
                <CardDescription>
                  Legal or display name, contact phone, and address shown internally. Schools under this organization
                  keep their own campus details.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...orgForm}>
                  <form onSubmit={orgForm.handleSubmit((v) => orgMutation.mutate(v))} className="space-y-4">
                    <FormField
                      control={orgForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Organization name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Riverside Learning Trust" autoComplete="organization" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={orgForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="Optional" type="tel" autoComplete="tel" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={orgForm.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Optional — headquarters or mailing address"
                              className="min-h-[88px] resize-y"
                              autoComplete="street-address"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end pt-2">
                      <Button type="submit" disabled={orgMutation.isPending}>
                        {orgMutation.isPending ? "Saving…" : "Save organization"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </DataState>
        </TabsContent>

        <TabsContent value="account" className="mt-6">
          <Card className="border-border/80">
            <CardHeader>
              <CardTitle>Administrator account</CardTitle>
              <CardDescription>
                Your name and email are used to sign in and receive notifications. Leave password fields blank to keep
                your current password.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...profileForm}>
                <form
                  onSubmit={profileForm.handleSubmit((v) => profileMutation.mutate(v))}
                  className="space-y-4"
                >
                  <FormField
                    control={profileForm.control}
                    name="full_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full name</FormLabel>
                        <FormControl>
                          <Input autoComplete="name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={profileForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" autoComplete="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-4">
                    <p className="text-sm font-medium text-foreground">Change password</p>
                    <FormField
                      control={profileForm.control}
                      name="current_password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current password</FormLabel>
                          <FormControl>
                            <Input type="password" autoComplete="current-password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="new_password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New password</FormLabel>
                          <FormControl>
                            <Input type="password" autoComplete="new-password" placeholder="At least 8 characters" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="confirm_password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm new password</FormLabel>
                          <FormControl>
                            <Input type="password" autoComplete="new-password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="flex justify-end pt-2">
                    <Button type="submit" disabled={profileMutation.isPending || !user}>
                      {profileMutation.isPending ? "Saving…" : "Save account"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
