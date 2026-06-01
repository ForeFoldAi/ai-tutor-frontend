import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFieldArray, useForm, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { LayoutGrid, Plus, Table2 } from "lucide-react";
import {
  deleteOrganizationTutor,
  getOrganizationSchools,
  onboardOrganizationTutor,
  updateOrganizationTutor,
  updateOrganizationUserStatus,
} from "@/api/organization";
import { useOrganizationData } from "@/modules/organization/hooks/use-organization-data";
import {
  ClassSectionsBlock,
  classPlacementRowsSchema,
  classesFromApiUser,
  refineClassPlacementRows,
  schoolDisplayName,
  type ClassRowsFormPart,
} from "@/modules/organization/components/class-placement-form";
import {
  TutorActionsMenu,
  TutorSummaryCard,
  TutorTeachingScopeRows,
  tutorTeachingScopeLabel,
} from "@/modules/organization/components/tutor-summary-card";
import { DataState } from "@/modules/shared/components/data-state";
import { useAuthStore } from "@/lib/auth-store";
import { UserRole } from "@/types/schema";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { ApiUser } from "@/api/types";

const onboardTutorSchema = z
  .object({
    full_name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(8),
    school_id: z.string().min(1, "Select a school"),
    teaching_board: z.string().optional(),
    classes: classPlacementRowsSchema,
  })
  .superRefine(refineClassPlacementRows);

const editTutorSchema = z
  .object({
    full_name: z.string().min(2),
    email: z.string().email(),
    password: z.string().optional(),
    school_id: z.string().min(1, "Select a school"),
    teaching_board: z.string().optional(),
    classes: classPlacementRowsSchema,
  })
  .superRefine(refineClassPlacementRows)
  .superRefine((data, ctx) => {
    const p = data.password?.trim();
    if (p && p.length < 8) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least 8 characters.",
        path: ["password"],
      });
    }
  });

type OnboardTutorFormValues = z.infer<typeof onboardTutorSchema>;
type EditTutorFormValues = z.infer<typeof editTutorSchema>;

type TutorsViewMode = "card" | "table";

const classRowsControl = (c: Control<OnboardTutorFormValues> | Control<EditTutorFormValues>) =>
  c as unknown as Control<ClassRowsFormPart>;

export default function OrganizationManageTutorsPage() {
  const user = useAuthStore((s) => s.user);
  const isSchoolAdmin = user?.role === UserRole.SCHOOL_ADMIN;
  const fixedSchoolId = isSchoolAdmin ? (user?.schoolId ?? "") : "";
  const { tutorsQuery } = useOrganizationData();
  const schoolsQuery = useQuery({
    queryKey: ["organization", "schools"],
    queryFn: getOrganizationSchools,
  });
  const qc = useQueryClient();
  const [onboardOpen, setOnboardOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingTutor, setEditingTutor] = useState<ApiUser | null>(null);
  const [tutorToDelete, setTutorToDelete] = useState<ApiUser | null>(null);
  const [tutorsView, setTutorsView] = useState<TutorsViewMode>("card");

  const form = useForm<OnboardTutorFormValues>({
    resolver: zodResolver(onboardTutorSchema),
    defaultValues: {
      full_name: "",
      email: "",
      password: "",
      school_id: fixedSchoolId,
      teaching_board: "",
      classes: [{ grade: "", sections: [{ value: "" }] }],
    },
  });

  const editForm = useForm<EditTutorFormValues>({
    resolver: zodResolver(editTutorSchema),
    defaultValues: {
      full_name: "",
      email: "",
      password: "",
      school_id: fixedSchoolId,
      teaching_board: "",
      classes: [{ grade: "", sections: [{ value: "" }] }],
    },
  });

  const { fields: classFields, append: appendClass, remove: removeClass } = useFieldArray({
    control: form.control,
    name: "classes",
  });

  const {
    fields: editClassFields,
    append: appendEditClass,
    remove: removeEditClass,
  } = useFieldArray({
    control: editForm.control,
    name: "classes",
  });

  const createMutation = useMutation({
    mutationFn: (values: OnboardTutorFormValues) => {
      const teaching_classes = values.classes.map((c) => ({
        grade: c.grade.trim(),
        sections: c.sections.map((s) => s.value.trim()).filter(Boolean),
      }));
      return onboardOrganizationTutor({
        full_name: values.full_name.trim(),
        email: values.email.trim(),
        password: values.password,
        school_id: isSchoolAdmin ? fixedSchoolId : values.school_id,
        teaching_board: values.teaching_board?.trim() || undefined,
        teaching_classes,
      });
    },
    onSuccess: () => {
      form.reset({
        full_name: "",
        email: "",
        password: "",
        school_id: isSchoolAdmin ? fixedSchoolId : "",
        teaching_board: "",
        classes: [{ grade: "", sections: [{ value: "" }] }],
      });
      setOnboardOpen(false);
      void qc.invalidateQueries({ queryKey: ["organization", "tutors"] });
      void qc.invalidateQueries({ queryKey: ["organization", "users"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ tutorId, values }: { tutorId: string; values: EditTutorFormValues }) => {
      const teaching_classes = values.classes.map((c) => ({
        grade: c.grade.trim(),
        sections: c.sections.map((s) => s.value.trim()).filter(Boolean),
      }));
      const pw = values.password?.trim();
      return updateOrganizationTutor(tutorId, {
        full_name: values.full_name.trim(),
        email: values.email.trim(),
        school_id: isSchoolAdmin ? fixedSchoolId : values.school_id,
        teaching_board: values.teaching_board?.trim() || undefined,
        teaching_classes,
        ...(pw ? { new_password: pw } : {}),
      });
    },
    onSuccess: () => {
      editForm.reset({
        full_name: "",
        email: "",
        password: "",
        school_id: isSchoolAdmin ? fixedSchoolId : "",
        teaching_board: "",
        classes: [{ grade: "", sections: [{ value: "" }] }],
      });
      setEditingTutor(null);
      setEditOpen(false);
      void qc.invalidateQueries({ queryKey: ["organization", "tutors"] });
      void qc.invalidateQueries({ queryKey: ["organization", "users"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (tutorId: string) => deleteOrganizationTutor(tutorId),
    onSuccess: () => {
      setTutorToDelete(null);
      void qc.invalidateQueries({ queryKey: ["organization", "tutors"] });
      void qc.invalidateQueries({ queryKey: ["organization", "users"] });
    },
  });

  const schoolById = new Map((schoolsQuery.data ?? []).map((s) => [s.id, s]));

  const toggleTutor = (tutor: ApiUser) => {
    void updateOrganizationUserStatus(tutor.id, !tutor.is_active).then(() => {
      void qc.invalidateQueries({ queryKey: ["organization", "tutors"] });
      void qc.invalidateQueries({ queryKey: ["organization", "users"] });
    });
  };

  const openEditTutor = (tutor: ApiUser) => {
    setEditingTutor(tutor);
    editForm.reset({
      full_name: tutor.full_name,
      email: tutor.email,
      password: "",
      school_id: tutor.school_id ?? fixedSchoolId,
      teaching_board: tutor.teaching_board ?? "",
      classes: classesFromApiUser(tutor),
    });
    setEditOpen(true);
  };

  const tutors = tutorsQuery.data ?? [];
  const schools = schoolsQuery.data ?? [];
  const canSubmit = isSchoolAdmin ? Boolean(fixedSchoolId) : schools.length > 0;

  const tutorMenuProps = {
    onEdit: openEditTutor,
    onToggleStatus: toggleTutor,
    onDelete: (t: ApiUser) => setTutorToDelete(t),
  };

  return (
    <div className="p-6 space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Manage Tutors</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Onboard tutors with {isSchoolAdmin ? "your school," : "school,"} teaching board, and class sections (grades with A/B, etc.). Switch between
            card and table layout; use the menu on each row for actions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <ToggleGroup
            type="single"
            value={tutorsView}
            onValueChange={(v) => {
              if (v === "card" || v === "table") setTutorsView(v);
            }}
            variant="outline"
            size="sm"
            className="justify-end"
            aria-label="Tutor list layout"
          >
            <ToggleGroupItem value="card" aria-label="Card view" className="gap-1.5 px-3">
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline">Cards</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="table" aria-label="Table view" className="gap-1.5 px-3">
              <Table2 className="h-4 w-4" />
              <span className="hidden sm:inline">Table</span>
            </ToggleGroupItem>
          </ToggleGroup>

          <Dialog open={onboardOpen} onOpenChange={setOnboardOpen}>
            <DialogTrigger asChild>
              <Button className="shrink-0 gap-2">
                <Plus className="h-4 w-4" />
                Onboard tutor
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Onboard a tutor</DialogTitle>
                <DialogDescription>
                  Assign a school and board. For each class, enter the grade in the first column and section letters in a
                  row (e.g. grade 9, sections A, D, E).
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form
                  className="grid gap-3 md:grid-cols-2 pt-2"
                  onSubmit={form.handleSubmit((v) => createMutation.mutate(v))}
                >
                  {isSchoolAdmin ? null : (
                    <FormField
                      control={form.control}
                      name="school_id"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>School</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue
                                  placeholder={schools.length ? "Select school" : "No schools — add one first"}
                                />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {schools.map((s) => (
                                <SelectItem key={s.id} value={s.id}>
                                  {schoolDisplayName(s)}
                                  {s.board ? ` · ${s.board}` : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  <FormField
                    control={form.control}
                    name="teaching_board"
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
                  <div className="md:col-span-2 space-y-3 rounded-lg border border-border/80 bg-muted/15 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <FormLabel className="m-0">Classes & sections</FormLabel>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1 text-xs"
                        onClick={() => appendClass({ grade: "", sections: [{ value: "" }] })}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add class
                      </Button>
                    </div>
                    <div className="grid grid-cols-[3.5rem_minmax(0,1fr)_auto] gap-x-3 border-b border-border/60 pb-2">
                      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Grade</span>
                      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        Sections
                      </span>
                      <span className="w-9" aria-hidden />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Each row is one grade. Use <span className="font-medium text-foreground/80">+ Section</span> to add
                      more letters on the same line.
                    </p>
                    <div className="space-y-4">
                      {classFields.map((cf, classIndex) => (
                        <ClassSectionsBlock
                          key={cf.id}
                          nestIndex={classIndex}
                          control={classRowsControl(form.control)}
                          canRemoveClass={classFields.length > 1}
                          onRemoveClass={() => removeClass(classIndex)}
                        />
                      ))}
                    </div>
                  </div>
                  <FormField
                    control={form.control}
                    name="full_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tutor full name</FormLabel>
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
                        <FormLabel>Email</FormLabel>
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
                    <Button type="submit" disabled={createMutation.isPending || !canSubmit}>
                      {createMutation.isPending ? "Creating…" : "Create tutor"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) setEditingTutor(null);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit tutor</DialogTitle>
            <DialogDescription>
              Update profile, school, and the grade / sections grid. Leave password empty to keep the current one.
            </DialogDescription>
          </DialogHeader>
          {editingTutor ? (
            <Form {...editForm}>
              <form
                className="grid gap-3 md:grid-cols-2 pt-2"
                onSubmit={editForm.handleSubmit((v) =>
                  updateMutation.mutate({ tutorId: editingTutor.id, values: v }),
                )}
              >
                {isSchoolAdmin ? null : (
                  <FormField
                    control={editForm.control}
                    name="school_id"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>School</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select school" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {schools.map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                {schoolDisplayName(s)}
                                {s.board ? ` · ${s.board}` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <FormField
                  control={editForm.control}
                  name="teaching_board"
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
                <div className="md:col-span-2 space-y-3 rounded-lg border border-border/80 bg-muted/15 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <FormLabel className="m-0">Classes & sections</FormLabel>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1 text-xs"
                      onClick={() => appendEditClass({ grade: "", sections: [{ value: "" }] })}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add class
                    </Button>
                  </div>
                  <div className="grid grid-cols-[3.5rem_minmax(0,1fr)_auto] gap-x-3 border-b border-border/60 pb-2">
                    <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Grade</span>
                    <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      Sections
                    </span>
                    <span className="w-9" aria-hidden />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Each row is one grade. Use <span className="font-medium text-foreground/80">+ Section</span> to add
                    more letters on the same line.
                  </p>
                  <div className="space-y-4">
                    {editClassFields.map((cf, classIndex) => (
                      <ClassSectionsBlock
                        key={cf.id}
                        nestIndex={classIndex}
                        control={classRowsControl(editForm.control)}
                        canRemoveClass={editClassFields.length > 1}
                        onRemoveClass={() => removeEditClass(classIndex)}
                      />
                    ))}
                  </div>
                </div>
                <FormField
                  control={editForm.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tutor full name</FormLabel>
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
                      <FormLabel>Email</FormLabel>
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
                      <FormLabel>New password (optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          autoComplete="new-password"
                          placeholder="Leave blank to keep current"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {updateMutation.error ? (
                  <p className="md:col-span-2 text-sm text-destructive">{String(updateMutation.error)}</p>
                ) : null}
                <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditOpen(false);
                      setEditingTutor(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateMutation.isPending || !canSubmit}>
                    {updateMutation.isPending ? "Saving…" : "Save changes"}
                  </Button>
                </div>
              </form>
            </Form>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!tutorToDelete} onOpenChange={(open) => !open && setTutorToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete tutor?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes{" "}
              <span className="font-medium text-foreground">{tutorToDelete?.full_name}</span> ({tutorToDelete?.email}).
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (tutorToDelete) deleteMutation.mutate(tutorToDelete.id);
              }}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DataState
        loading={tutorsQuery.isLoading}
        error={tutorsQuery.error ? String(tutorsQuery.error) : null}
        empty={tutors.length === 0}
        emptyText={isSchoolAdmin ? "No tutors yet. Use “Onboard tutor” to add tutors for your school." : "No tutors yet. Use “Onboard tutor” after you have at least one school."}
        onRetry={() => void tutorsQuery.refetch()}
      >
        {tutorsView === "card" ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {tutors.map((tutor) => {
              const sch = tutor.school_id ? schoolById.get(tutor.school_id) : undefined;
              const schoolLabel = sch ? schoolDisplayName(sch) : null;
              return (
                <TutorSummaryCard
                  key={tutor.id}
                  tutor={tutor}
                  schoolLabel={schoolLabel}
                  onToggleStatus={tutorMenuProps.onToggleStatus}
                  onEditTutor={tutorMenuProps.onEdit}
                  onDeleteTutor={tutorMenuProps.onDelete}
                />
              );
            })}
          </div>
        ) : (
          <div className="rounded-md border border-border/80 bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>School</TableHead>
                  <TableHead>Board</TableHead>
                  <TableHead className="min-w-[14rem]">Classes & sections</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[52px] text-right pr-3">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tutors.map((tutor) => {
                  const sch = tutor.school_id ? schoolById.get(tutor.school_id) : undefined;
                  const schoolLabel = sch ? schoolDisplayName(sch) : null;
                  const boardRaw = tutor.teaching_board?.trim();
                  return (
                    <TableRow key={tutor.id}>
                      <TableCell className="font-medium">{tutor.full_name}</TableCell>
                      <TableCell className="text-muted-foreground max-w-[14rem] truncate" title={tutor.email}>
                        {tutor.email}
                      </TableCell>
                      <TableCell className="max-w-[12rem] truncate" title={schoolLabel ?? undefined}>
                        {schoolLabel ?? "—"}
                      </TableCell>
                      <TableCell className={boardRaw ? "" : "text-muted-foreground"}>{boardRaw ?? "—"}</TableCell>
                      <TableCell className="max-w-[22rem] align-top">
                        <div title={tutorTeachingScopeLabel(tutor)}>
                          <TutorTeachingScopeRows tutor={tutor} compact emptyMessage="—" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            tutor.is_active ? "text-foreground text-xs font-medium" : "text-muted-foreground text-xs"
                          }
                        >
                          {tutor.is_active ? "Active" : "Inactive"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right pr-2">
                        <TutorActionsMenu tutor={tutor} {...tutorMenuProps} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </DataState>
    </div>
  );
}
