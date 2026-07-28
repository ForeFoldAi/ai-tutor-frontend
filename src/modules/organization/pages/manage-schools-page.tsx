import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus } from "lucide-react";
import {
  createOrganizationSchoolAdmin,
  deleteOrganizationSchool,
  getOrganizationSchools,
  patchOrganizationSchool,
  updateOrganizationUserStatus,
} from "@/api/organization";
import { SchoolSummaryCard } from "@/modules/organization/components/school-summary-card";
import { DataState } from "@/modules/shared/components/data-state";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { OrganizationSchoolSummary, PatchSchoolPayload, SchoolAdminBrief } from "@/api/types";

const schema = z.object({
  full_name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  school_name: z.string().min(2),
  branch: z.string().optional(),
  board: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const addAdminSchema = z.object({
  full_name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

type AddAdminFormValues = z.infer<typeof addAdminSchema>;

/** Same shape as onboard; admin fields optional unless you start filling any of them. */
const editSchoolFormSchema = z
  .object({
    school_name: z.string().min(2),
    branch: z.string().optional(),
    board: z.string().optional(),
    full_name: z.string().optional(),
    email: z.string().optional(),
    password: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    const fn = val.full_name?.trim() ?? "";
    const em = val.email?.trim() ?? "";
    const pw = val.password ?? "";
    const anyAdmin = fn.length > 0 || em.length > 0 || pw.length > 0;
    if (!anyAdmin) return;
    if (fn.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["full_name"],
        message: "Enter the school admin full name (min 2 characters) or leave all admin fields empty.",
      });
    }
    if (!z.string().email().safeParse(em).success) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["email"], message: "Enter a valid admin email." });
    }
    if (pw.length < 8) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["password"],
        message: "Password must be at least 8 characters.",
      });
    }
  });

type EditSchoolFormValues = z.infer<typeof editSchoolFormSchema>;

export default function OrganizationManageSchoolsPage() {
  const schoolsQuery = useQuery({ queryKey: ["organization", "schools"], queryFn: getOrganizationSchools });
  const qc = useQueryClient();
  const [onboardOpen, setOnboardOpen] = useState(false);
  const [addAdminSchool, setAddAdminSchool] = useState<OrganizationSchoolSummary | null>(null);
  const [editSchool, setEditSchool] = useState<OrganizationSchoolSummary | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OrganizationSchoolSummary | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { full_name: "", email: "", password: "", school_name: "", branch: "", board: "" },
  });

  const addAdminForm = useForm<AddAdminFormValues>({
    resolver: zodResolver(addAdminSchema),
    defaultValues: { full_name: "", email: "", password: "" },
  });

  const editForm = useForm<EditSchoolFormValues>({
    resolver: zodResolver(editSchoolFormSchema),
    defaultValues: {
      school_name: "",
      branch: "",
      board: "",
      full_name: "",
      email: "",
      password: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: (payload: FormValues) => createOrganizationSchoolAdmin(payload),
    onSuccess: () => {
      form.reset();
      setOnboardOpen(false);
      void qc.invalidateQueries({ queryKey: ["organization", "schools"] });
      void qc.invalidateQueries({ queryKey: ["organization", "school-admins"] });
      void qc.invalidateQueries({ queryKey: ["organization", "users"] });
    },
  });

  const addAdminMutation = useMutation({
    mutationFn: (args: AddAdminFormValues & { schoolId: number }) =>
      createOrganizationSchoolAdmin({
        full_name: args.full_name,
        email: args.email,
        password: args.password,
        school_id: args.schoolId,
      }),
    onSuccess: () => {
      addAdminForm.reset();
      setAddAdminSchool(null);
      void qc.invalidateQueries({ queryKey: ["organization", "schools"] });
      void qc.invalidateQueries({ queryKey: ["organization", "school-admins"] });
      void qc.invalidateQueries({ queryKey: ["organization", "users"] });
    },
  });

  const editSchoolMutation = useMutation({
    mutationFn: async (args: { schoolId: number; values: EditSchoolFormValues }) => {
      const { schoolId, values } = args;
      const body: PatchSchoolPayload = {
        name: values.school_name.trim(),
        branch: values.branch?.trim() || null,
        board: values.board?.trim() || null,
      };
      await patchOrganizationSchool(schoolId, body);
      const fn = values.full_name?.trim() ?? "";
      const em = values.email?.trim() ?? "";
      const pw = values.password ?? "";
      if (fn && em && pw.length >= 8) {
        await createOrganizationSchoolAdmin({
          school_id: schoolId,
          full_name: fn,
          email: em,
          password: pw,
        });
      }
    },
    onSuccess: () => {
      editForm.reset();
      setEditSchool(null);
      void qc.invalidateQueries({ queryKey: ["organization", "schools"] });
      void qc.invalidateQueries({ queryKey: ["organization", "school-admins"] });
      void qc.invalidateQueries({ queryKey: ["organization", "users"] });
    },
  });

  const deleteSchoolMutation = useMutation({
    mutationFn: deleteOrganizationSchool,
    onSuccess: () => {
      setDeleteTarget(null);
      void qc.invalidateQueries({ queryKey: ["organization", "schools"] });
      void qc.invalidateQueries({ queryKey: ["organization", "school-admins"] });
      void qc.invalidateQueries({ queryKey: ["organization", "users"] });
    },
  });

  const openEditSchool = (s: OrganizationSchoolSummary) => {
    editForm.reset({
      school_name: s.name,
      branch: s.branch ?? "",
      board: s.board ?? "",
      full_name: "",
      email: "",
      password: "",
    });
    setEditSchool(s);
  };

  const toggleAdmin = (admin: SchoolAdminBrief) => {
    void updateOrganizationUserStatus(admin.id, !admin.is_active).then(() => {
      void qc.invalidateQueries({ queryKey: ["organization", "schools"] });
      void qc.invalidateQueries({ queryKey: ["organization", "school-admins"] });
      void qc.invalidateQueries({ queryKey: ["organization", "users"] });
    });
  };

  const schools = schoolsQuery.data ?? [];

  return (
    <div className="p-6 space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Manage Schools & School Admins</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Onboard new schools, assign admins, and review tutors and students per campus.
          </p>
        </div>

        <Dialog open={onboardOpen} onOpenChange={setOnboardOpen}>
          <DialogTrigger asChild>
            <Button className="shrink-0 gap-2">
              <Plus className="h-4 w-4" />
              Onboard school
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Onboard a school</DialogTitle>
              <DialogDescription>
                Creates the school record and a school admin account. You can add tutors and students afterward from
                the other organization screens.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form
                className="grid gap-3 md:grid-cols-2 pt-2"
                onSubmit={form.handleSubmit((v) => createMutation.mutate(v))}
              >
                <FormField
                  control={form.control}
                  name="school_name"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>School name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Riverside High" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="branch"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Branch / campus (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. North Campus, Sector 12" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="board"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Board / curriculum (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. CBSE, IB, State" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>School admin full name</FormLabel>
                      <FormControl>
                        <Input {...field} />
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
                      <FormLabel>Admin email</FormLabel>
                      <FormControl>
                        <Input type="email" autoComplete="off" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Initial password</FormLabel>
                      <FormControl>
                        <Input type="password" autoComplete="new-password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {createMutation.error ? (
                  <p className="md:col-span-2 text-sm text-destructive">{String(createMutation.error)}</p>
                ) : null}
                <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setOnboardOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Creating…" : "Create school & admin"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <Dialog
          open={addAdminSchool !== null}
          onOpenChange={(open) => {
            if (!open) {
              setAddAdminSchool(null);
              addAdminForm.reset();
            }
          }}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add school admin</DialogTitle>
              <DialogDescription>
                {addAdminSchool ? (
                  <>
                    Invite another administrator for <span className="font-medium text-foreground">{addAdminSchool.name}</span>
                    {addAdminSchool.branch ? ` (${addAdminSchool.branch})` : ""}. They will have the same school scope as
                    existing admins.
                  </>
                ) : null}
              </DialogDescription>
            </DialogHeader>
            <Form {...addAdminForm}>
              <form
                className="grid gap-3 pt-2"
                onSubmit={addAdminForm.handleSubmit((v) => {
                  if (!addAdminSchool) return;
                  addAdminMutation.mutate({ ...v, schoolId: addAdminSchool.id });
                })}
              >
                <FormField
                  control={addAdminForm.control}
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
                  control={addAdminForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" autoComplete="off" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addAdminForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Initial password</FormLabel>
                      <FormControl>
                        <Input type="password" autoComplete="new-password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {addAdminMutation.error ? (
                  <p className="text-sm text-destructive">{String(addAdminMutation.error)}</p>
                ) : null}
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setAddAdminSchool(null);
                      addAdminForm.reset();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={addAdminMutation.isPending}>
                    {addAdminMutation.isPending ? "Adding…" : "Add admin"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <Dialog
          open={editSchool !== null}
          onOpenChange={(open) => {
            if (!open) {
              setEditSchool(null);
              editForm.reset();
            }
          }}
        >
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit school</DialogTitle>
              <DialogDescription>
                Same details as onboarding. Update the school below; optionally add another school admin (leave admin
                fields empty if you only want to save school changes). Empty branch/board clears those values.
              </DialogDescription>
            </DialogHeader>
            <Form {...editForm}>
              <form
                className="grid gap-3 md:grid-cols-2 pt-2"
                onSubmit={editForm.handleSubmit((v) => {
                  if (!editSchool) return;
                  editSchoolMutation.mutate({ schoolId: editSchool.id, values: v });
                })}
              >
                <FormField
                  control={editForm.control}
                  name="school_name"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>School name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Riverside High" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="branch"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Branch / campus (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. North Campus, Sector 12" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="board"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Board / curriculum (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. CBSE, IB, State" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>School admin full name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Admin email</FormLabel>
                      <FormControl>
                        <Input type="email" autoComplete="off" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Initial password</FormLabel>
                      <FormControl>
                        <Input type="password" autoComplete="new-password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {editSchoolMutation.error ? (
                  <p className="md:col-span-2 text-sm text-destructive">{String(editSchoolMutation.error)}</p>
                ) : null}
                <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditSchool(null);
                      editForm.reset();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={editSchoolMutation.isPending}>
                    {editSchoolMutation.isPending ? "Saving…" : "Save changes"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

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
                    <span className="font-medium text-foreground">{deleteTarget.name}</span> will be removed. Staff and
                    students assigned to this school will have their school link cleared (they remain in the organization).
                    This cannot be undone.
                  </>
                ) : null}
              </AlertDialogDescription>
              {deleteSchoolMutation.error ? (
                <p className="text-sm text-destructive">{String(deleteSchoolMutation.error)}</p>
              ) : null}
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleteSchoolMutation.isPending}>Cancel</AlertDialogCancel>
              <Button
                variant="destructive"
                disabled={deleteSchoolMutation.isPending}
                onClick={() => {
                  if (deleteTarget) deleteSchoolMutation.mutate(deleteTarget.id);
                }}
              >
                {deleteSchoolMutation.isPending ? "Deleting…" : "Delete school"}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <DataState
        loading={schoolsQuery.isLoading}
        error={schoolsQuery.error ? String(schoolsQuery.error) : null}
        empty={schools.length === 0}
        emptyText="No schools yet. Use “Onboard school” to add your first campus."
        onRetry={() => void schoolsQuery.refetch()}
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {schools.map((school) => (
            <SchoolSummaryCard
              key={school.id}
              school={school}
              onToggleAdmin={toggleAdmin}
              onEditSchool={openEditSchool}
              onDeleteSchool={setDeleteTarget}
              onAddSchoolAdmin={(s) => {
                addAdminForm.reset({ full_name: "", email: "", password: "" });
                setAddAdminSchool(s);
              }}
            />
          ))}
        </div>
      </DataState>
    </div>
  );
}
