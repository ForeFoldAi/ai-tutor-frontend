import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useFieldArray, useForm, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { LayoutGrid, Plus, Table2 } from "lucide-react";
import {
  assignClassesToTeachers,
  assignSubjectsToTeachers,
  bulkCreateTeachers,
  deleteTeacher,
  exportTeachersCsv,
  getTeacher,
  getTeacherOptions,
  listTeachers,
  unassignTeacherItems,
  updateTeacher,
} from "@/api/teachers";
import { listClasses, listSubjects } from "@/api/classes";
import type { TeacherRecord } from "@/api/types";
import { TeacherAssignmentsPanel, emptyTeacherUnassignSelection, hasUnassignItems, keptSelectionFromDetail, unassignDiffFromKept, type TeacherUnassignSelection } from "@/modules/organization/components/teachers/teacher-assignments-panel";
import { useOrganizationData } from "@/modules/organization/hooks/use-organization-data";
import {
  deleteOrganizationTutor,
  getOrganizationSchools,
  onboardOrganizationTutor,
  updateOrganizationTutor,
  updateOrganizationUserStatus,
} from "@/api/organization";
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
import { TeachersPagination } from "@/modules/organization/components/teachers/teachers-pagination";
import { TeachersSearchFilters } from "@/modules/organization/components/teachers/teachers-search-filters";
import { TeachersTable } from "@/modules/organization/components/teachers/teachers-table";
import { TeachersToolbar } from "@/modules/organization/components/teachers/teachers-toolbar";
import { AssignClassesDialog } from "@/modules/organization/components/teachers/assign-classes-dialog";
import { AssignSubjectsDialog } from "@/modules/organization/components/teachers/assign-subjects-dialog";
import { AddTeacherDialog, type AddTeacherRowValues, type AddTeachersFormValues } from "@/modules/organization/components/teachers/add-teacher-dialog";
import type { TeacherFilters, TeacherRow } from "@/modules/organization/types/teacher-profile";
import {
  mapTeacherToRow,
  teacherFiltersToApi,
} from "@/modules/organization/utils/teacher-helpers";
import { mapClassToOverview, mapSubjectToItem } from "@/modules/organization/utils/classes-api-helpers";
import { DataState } from "@/modules/shared/components/data-state";
import { PageShell } from "@/components/page-shell";
import { useEntitySearch } from "@/modules/search";
import { invalidateManyAndBroadcast } from "@/lib/query-broadcast";
import { useAuthStore } from "@/lib/auth-store";
import { UserRole } from "@/types/schema";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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

const schoolTeacherEditSchema = z.object({
  full_name: z.string().min(2),
  phone: z.string().min(6),
  email: z.string().email(),
});

type SchoolTeacherEditValues = z.infer<typeof schoolTeacherEditSchema>;

type TutorsViewMode = "card" | "table";

const DEFAULT_TEACHER_FILTERS: TeacherFilters = {
  search: "",
  subject: "all",
  status: "all",
};

const classRowsControl = (c: Control<OnboardTutorFormValues> | Control<EditTutorFormValues>) =>
  c as unknown as Control<ClassRowsFormPart>;

export default function OrganizationManageTutorsPage() {
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const isSchoolAdmin = user?.role === UserRole.SCHOOL_ADMIN;
  const fixedSchoolId = isSchoolAdmin ? (user?.schoolId ?? "") : "";
  const [onboardOpen, setOnboardOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<TeacherRecord | null>(null);
  const [tutorToDelete, setTutorToDelete] = useState<ApiUser | null>(null);
  const [teacherToDelete, setTeacherToDelete] = useState<TeacherRecord | null>(null);
  const [tutorsView, setTutorsView] = useState<TutorsViewMode>("card");
  const [teacherFilters, setTeacherFilters] = useState<TeacherFilters>(DEFAULT_TEACHER_FILTERS);
  const [teacherPage, setTeacherPage] = useState(1);
  const [teacherPageSize, setTeacherPageSize] = useState(10);
  const [importOpen, setImportOpen] = useState(false);
  const [assignClassesOpen, setAssignClassesOpen] = useState(false);
  const [assignSubjectsOpen, setAssignSubjectsOpen] = useState(false);
  const [tutorDialogMode, setTutorDialogMode] = useState<"view" | "edit">("edit");
  const [editingTutor, setEditingTutor] = useState<ApiUser | null>(null);
  const [unassignSelection, setUnassignSelection] = useState<TeacherUnassignSelection>(() =>
    emptyTeacherUnassignSelection(),
  );
  const [pendingTeacherSave, setPendingTeacherSave] = useState<{
    values: SchoolTeacherEditValues;
    unassign: TeacherUnassignSelection;
  } | null>(null);

  const { tutorsQuery } = useOrganizationData();
  const teacherOptionsQuery = useQuery({
    queryKey: ["teachers", "options"],
    queryFn: getTeacherOptions,
    enabled: isSchoolAdmin,
  });
  const teacherSearch = useEntitySearch<TeacherRecord>(
    "teachers",
    teacherFilters.search,
    isSchoolAdmin,
  );
  const teachersListQuery = useQuery({
    queryKey: ["teachers", "list", teacherPage, teacherPageSize, teacherFilters],
    queryFn: () =>
      listTeachers({
        ...teacherFiltersToApi(teacherFilters),
        limit: teacherPageSize,
        offset: (teacherPage - 1) * teacherPageSize,
      }),
    enabled: isSchoolAdmin && !teacherSearch.searching,
    placeholderData: keepPreviousData,
  });
  const schoolClassesQuery = useQuery({
    queryKey: ["classes", "list"],
    queryFn: () => listClasses(),
    enabled: isSchoolAdmin,
  });
  const schoolSubjectsQuery = useQuery({
    queryKey: ["classes", "subjects"],
    queryFn: () => listSubjects(),
    enabled: isSchoolAdmin,
  });
  // Full active roster for assign dialogs (table page is paginated).
  const assignTeachersQuery = useQuery({
    queryKey: ["teachers", "assign-roster"],
    queryFn: () => listTeachers({ status: "active", limit: 100, offset: 0 }),
    enabled: isSchoolAdmin && (assignClassesOpen || assignSubjectsOpen),
  });
  const teacherDetailQuery = useQuery({
    queryKey: ["teachers", "detail", editingTeacher?.id],
    queryFn: () => getTeacher(editingTeacher!.id),
    enabled: isSchoolAdmin && !!editingTeacher && editOpen,
  });

  // Seed checked=assigned once per edit session (don't wipe user unchecks on refetch).
  const assignmentSeedKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!editOpen || tutorDialogMode !== "edit" || !editingTeacher) {
      assignmentSeedKeyRef.current = null;
      return;
    }
    const detail = teacherDetailQuery.data;
    if (!detail || detail.id !== editingTeacher.id) return;
    const key = `${editingTeacher.id}:edit`;
    if (assignmentSeedKeyRef.current === key) return;
    assignmentSeedKeyRef.current = key;
    setUnassignSelection(keptSelectionFromDetail(detail));
  }, [editOpen, tutorDialogMode, editingTeacher?.id, teacherDetailQuery.data]);

  const schoolsQuery = useQuery({
    queryKey: ["organization", "schools"],
    queryFn: getOrganizationSchools,
  });
  const qc = useQueryClient();

  useEffect(() => {
    const defaultLimit = teacherOptionsQuery.data?.default_limit;
    if (defaultLimit) setTeacherPageSize(defaultLimit);
  }, [teacherOptionsQuery.data?.default_limit]);

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

  const schoolEditForm = useForm<SchoolTeacherEditValues>({
    resolver: zodResolver(schoolTeacherEditSchema),
    defaultValues: { full_name: "", phone: "", email: "" },
  });

  useEffect(() => {
    if (!editingTeacher) return;
    schoolEditForm.reset({
      full_name: editingTeacher.full_name,
      phone: editingTeacher.phone ?? "",
      email: editingTeacher.email,
    });
  }, [editingTeacher, schoolEditForm]);

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

  const bulkCreateMutation = useMutation({
    mutationFn: (rows: AddTeacherRowValues[]) =>
      bulkCreateTeachers(
        rows.map((row) => ({
          full_name: row.full_name.trim(),
          phone: row.phone.trim(),
          email: row.email.trim(),
        })),
      ),
    onSuccess: (result) => {
      void invalidateManyAndBroadcast(qc, ["teachers", "dashboard"]);
      setOnboardOpen(false);
      if (result.created.length > 0) {
        toast({
          title: result.created.length === 1 ? "Teacher added" : "Teachers added",
          description:
            result.errors.length > 0
              ? `${result.created.length} saved. ${result.errors.length} row(s) failed.`
              : `${result.created.length} teacher(s) saved to your school.`,
        });
      }
      if (result.errors.length > 0 && result.created.length === 0) {
        toast({
          title: "Could not add teachers",
          description: result.errors.map((e) => `Row ${e.row}: ${e.message}`).join(" "),
          variant: "destructive",
        });
      }
    },
    onError: (err) => {
      toast({
        title: "Could not add teachers",
        description: err instanceof Error ? err.message : "Request failed.",
        variant: "destructive",
      });
    },
  });

  const assignClassesMutation = useMutation({
    mutationFn: ({ teacherIds, classIds }: { teacherIds: string[]; classIds: string[] }) =>
      assignClassesToTeachers({
        teacher_ids: teacherIds.map((id) => Number(id)),
        class_ids: classIds.map((id) => Number(id)),
      }),
    onSuccess: async (result) => {
      await invalidateManyAndBroadcast(qc, ["teachers", "dashboard"]);
      setAssignClassesOpen(false);
      toast({ title: "Classes assigned", description: result.message });
    },
    onError: (err) => {
      toast({
        title: "Could not assign classes",
        description: err instanceof Error ? err.message : "Request failed.",
        variant: "destructive",
      });
    },
  });

  const assignSubjectsMutation = useMutation({
    mutationFn: ({ teacherIds, subjectIds }: { teacherIds: string[]; subjectIds: string[] }) =>
      assignSubjectsToTeachers({
        teacher_ids: teacherIds.map((id) => Number(id)),
        subject_ids: subjectIds.map((id) => Number(id)),
      }),
    onSuccess: async (result) => {
      await invalidateManyAndBroadcast(qc, ["teachers", "dashboard"]);
      setAssignSubjectsOpen(false);
      toast({ title: "Subjects assigned", description: result.message });
    },
    onError: (err) => {
      toast({
        title: "Could not assign subjects",
        description: err instanceof Error ? err.message : "Request failed.",
        variant: "destructive",
      });
    },
  });

  const schoolUpdateMutation = useMutation({
    mutationFn: async ({
      id,
      values,
      unassign,
    }: {
      id: number;
      values: { full_name: string; phone: string; email: string };
      unassign: TeacherUnassignSelection;
    }) => {
      let detail = await updateTeacher(id, {
        full_name: values.full_name.trim(),
        phone: values.phone.trim(),
        email: values.email.trim(),
      });
      const hasUnassign =
        unassign.subjectIds.length > 0 ||
        unassign.classIds.length > 0 ||
        unassign.studentIds.length > 0;
      if (hasUnassign) {
        detail = await unassignTeacherItems(id, {
          subject_ids: unassign.subjectIds,
          class_ids: unassign.classIds,
          student_ids: unassign.studentIds,
        });
      }
      return detail;
    },
    onSuccess: (detail) => {
      qc.setQueryData(["teachers", "detail", detail.id], detail);
      setUnassignSelection(emptyTeacherUnassignSelection());
      setPendingTeacherSave(null);
      setEditOpen(false);
      setEditingTeacher(null);
      void invalidateManyAndBroadcast(qc, ["teachers", "dashboard"]);
      toast({ title: "Teacher updated" });
    },
    onError: (err) => {
      toast({
        title: "Could not update teacher",
        description: err instanceof Error ? err.message : "Request failed.",
        variant: "destructive",
      });
    },
  });

  const teacherStatusMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      updateTeacher(id, { is_active }),
    onSuccess: (detail) => {
      setEditingTeacher(detail);
      qc.setQueryData(["teachers", "detail", detail.id], detail);
      setUnassignSelection(keptSelectionFromDetail(detail));
      void invalidateManyAndBroadcast(qc, ["teachers", "dashboard"]);
      toast({
        title: detail.is_active ? "Teacher activated" : "Teacher deactivated",
        description: detail.is_active
          ? "Subjects, classes, and students restored."
          : "Subjects, classes, and students unassigned until reactivated.",
      });
    },
    onError: (err) => {
      toast({
        title: "Could not update status",
        description: err instanceof Error ? err.message : "Request failed.",
        variant: "destructive",
      });
    },
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
        school_id: Number(isSchoolAdmin ? fixedSchoolId : values.school_id),
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
      void invalidateManyAndBroadcast(qc, ["teachers", "users", "dashboard"]);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ tutorId, values }: { tutorId: number; values: EditTutorFormValues }) => {
      const teaching_classes = values.classes.map((c) => ({
        grade: c.grade.trim(),
        sections: c.sections.map((s) => s.value.trim()).filter(Boolean),
      }));
      const pw = values.password?.trim();
      return updateOrganizationTutor(tutorId, {
        full_name: values.full_name.trim(),
        email: values.email.trim(),
        school_id: Number(isSchoolAdmin ? fixedSchoolId : values.school_id),
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
      void invalidateManyAndBroadcast(qc, ["teachers", "users", "dashboard"]);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (tutorId: number) => deleteOrganizationTutor(tutorId),
    onSuccess: () => {
      setTutorToDelete(null);
      void invalidateManyAndBroadcast(qc, ["teachers", "users", "dashboard"]);
    },
  });

  const deleteTeacherMutation = useMutation({
    mutationFn: (teacherId: number) => deleteTeacher(teacherId),
    onSuccess: () => {
      setTeacherToDelete(null);
      setEditOpen(false);
      setEditingTeacher(null);
      void invalidateManyAndBroadcast(qc, ["teachers", "dashboard"]);
      toast({
        title: "Teacher deleted",
        description: "The teacher has been permanently removed.",
      });
    },
    onError: (err) => {
      toast({
        title: "Could not delete teacher",
        description: err instanceof Error ? err.message : "Request failed.",
        variant: "destructive",
      });
    },
  });

  const schoolById = new Map((schoolsQuery.data ?? []).map((s) => [s.id, s]));

  const toggleTutor = (tutor: ApiUser) => {
    void updateOrganizationUserStatus(tutor.id, !tutor.is_active).then(() => {
      void invalidateManyAndBroadcast(qc, ["teachers", "users", "dashboard"]);
    });
  };

  const openTutorDialog = (tutor: ApiUser, mode: "view" | "edit") => {
    setTutorDialogMode(mode);
    setEditingTutor(tutor);
    editForm.reset({
      full_name: tutor.full_name,
      email: tutor.email,
      password: "",
      school_id: tutor.school_id != null ? String(tutor.school_id) : fixedSchoolId,
      teaching_board: tutor.teaching_board ?? "",
      classes: classesFromApiUser(tutor),
    });
    setEditOpen(true);
  };

  const openEditTutor = (tutor: ApiUser) => openTutorDialog(tutor, "edit");

  const tutors = tutorsQuery.data ?? [];
  const schools = schoolsQuery.data ?? [];
  const canSubmit = isSchoolAdmin ? Boolean(fixedSchoolId) : schools.length > 0;

  const schoolTeachers = useMemo(() => {
    const raw = teacherSearch.searching
      ? teacherSearch.items
      : (teachersListQuery.data?.items ?? []);
    let rows = raw.map((teacher, index) => mapTeacherToRow(teacher, index));
    if (teacherSearch.searching) {
      if (teacherFilters.subject !== "all") {
        rows = rows.filter((r) =>
          r.subject.toLowerCase().includes(teacherFilters.subject.toLowerCase()),
        );
      }
      if (teacherFilters.status === "active") {
        rows = rows.filter((r) => r.status === "Active");
      } else if (teacherFilters.status === "inactive") {
        rows = rows.filter((r) => r.status === "Inactive");
      }
    }
    return rows;
  }, [
    teacherSearch.searching,
    teacherSearch.items,
    teachersListQuery.data?.items,
    teacherFilters.subject,
    teacherFilters.status,
  ]);
  const schoolTeachersTotal = teacherSearch.searching
    ? schoolTeachers.length
    : (teachersListQuery.data?.meta.total ?? 0);
  const teachersListLoading = teacherSearch.searching
    ? teacherSearch.isLoading
    : teachersListQuery.isLoading && !teachersListQuery.data;
  const teachersListError = teacherSearch.searching
    ? teacherSearch.error
    : teachersListQuery.error;
  const pageSizeOptions = teacherOptionsQuery.data?.page_size_options ?? [10, 20, 30, 40, 50, 100, 200, 500];
  const assignableSubjects = useMemo(
    () => (schoolSubjectsQuery.data?.items ?? []).map(mapSubjectToItem),
    [schoolSubjectsQuery.data?.items],
  );
  const subjectFilterOptions = useMemo(
    () => assignableSubjects.map((subject) => subject.name),
    [assignableSubjects],
  );
  const assignableClasses = useMemo(
    () =>
      (schoolClassesQuery.data?.items ?? []).map((item, index) => {
        const row = mapClassToOverview(item, index);
        return {
          id: row.id,
          grade: row.grade,
          section: row.section,
          students: row.students,
          teachers: row.teachers,
          curriculums: row.curriculums,
        };
      }),
    [schoolClassesQuery.data?.items],
  );
  const assignDialogTeachers = useMemo(
    () => (assignTeachersQuery.data?.items ?? []).map((teacher, index) => mapTeacherToRow(teacher, index)),
    [assignTeachersQuery.data?.items],
  );

  const handleAddTeachers = (values: AddTeachersFormValues) => {
    bulkCreateMutation.mutate(values.teachers);
  };

  const handleImportTeachers = (rows: AddTeacherRowValues[]) => {
    bulkCreateMutation.mutate(rows);
  };

  const handleExportTeachers = () => {
    void exportTeachersCsv(teacherFiltersToApi(teacherFilters)).catch((err) => {
      toast({
        title: "Export failed",
        description: err instanceof Error ? err.message : "Could not export teachers.",
        variant: "destructive",
      });
    });
  };

  const handleTeacherFilterChange = (patch: Partial<TeacherFilters>) => {
    setTeacherFilters((current) => ({ ...current, ...patch }));
    setTeacherPage(1);
  };

  const handleTeacherView = (teacher: TeacherRow) => {
    if (teacher.source) {
      setTutorDialogMode("view");
      setEditingTeacher(teacher.source);
      setEditOpen(true);
    }
  };

  const tutorMenuProps = {
    onEdit: openEditTutor,
    onToggleStatus: toggleTutor,
    onDelete: (t: ApiUser) => setTutorToDelete(t),
  };

  return (
    <PageShell>
      {isSchoolAdmin ? (
        <>
          <div className="flex shrink-0 flex-col gap-2">
            <TeachersToolbar
              title={
                <div className="space-y-0.5">
                  <h1 className="text-xl font-bold leading-tight text-blue-900 dark:text-blue-100 sm:text-2xl">
                    Teachers
                  </h1>
                  <p className="text-sm text-muted-foreground">Manage teacher accounts.</p>
                </div>
              }
              onAddTeacher={() => setOnboardOpen(true)}
              onAssignClasses={() => setAssignClassesOpen(true)}
              onAssignSubjects={() => setAssignSubjectsOpen(true)}
              onImportTeachers={handleImportTeachers}
              onExport={handleExportTeachers}
              importOpen={importOpen}
              onImportOpenChange={setImportOpen}
            />
          </div>

          <div className="shrink-0">
            <TeachersSearchFilters
              filters={teacherFilters}
              subjects={subjectFilterOptions}
              onChange={handleTeacherFilterChange}
              onClear={() => {
                setTeacherFilters(DEFAULT_TEACHER_FILTERS);
                setTeacherPage(1);
              }}
            />
          </div>

          <DataState
            loading={teachersListLoading}
            error={teachersListError ? String(teachersListError) : null}
            empty={schoolTeachers.length === 0}
            emptyText="No teachers match your search."
            onRetry={() =>
              void (teacherSearch.searching ? teacherSearch.refetch() : teachersListQuery.refetch())
            }
          >
            <div className="space-y-0">
              <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
                <TeachersTable
                  teachers={schoolTeachers}
                  onView={handleTeacherView}
                />
                <div className="border-t border-border/70 px-3 py-3">
                  {!teacherSearch.searching ? (
                    <TeachersPagination
                      page={teacherPage}
                      pageSize={teacherPageSize}
                      total={schoolTeachersTotal}
                      pageSizeOptions={pageSizeOptions}
                      onPageChange={setTeacherPage}
                      onPageSizeChange={(size) => {
                        setTeacherPageSize(size);
                        setTeacherPage(1);
                      }}
                    />
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Showing all {schoolTeachersTotal} search result
                      {schoolTeachersTotal === 1 ? "" : "s"}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </DataState>
        </>
      ) : (
        <>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Manage Tutors</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Onboard tutors with school, teaching board, and class sections (grades with A/B, etc.). Switch between
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

          <Button className="shrink-0 gap-2" onClick={() => setOnboardOpen(true)}>
            <Plus className="h-4 w-4" />
            Onboard tutor
          </Button>
        </div>
      </div>

      <DataState
        loading={tutorsQuery.isLoading}
        error={tutorsQuery.error ? String(tutorsQuery.error) : null}
        empty={tutors.length === 0}
        emptyText="No tutors yet. Use “Onboard tutor” after you have at least one school."
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
        </>
      )}

      <Dialog open={onboardOpen && !isSchoolAdmin} onOpenChange={setOnboardOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isSchoolAdmin ? "Add Teacher" : "Onboard a tutor"}</DialogTitle>
            <DialogDescription>
              {isSchoolAdmin
                ? "Create a teacher account with class and section assignments for your school."
                : "Assign a school and board. For each class, enter the grade in the first column and section letters in a row (e.g. grade 9, sections A, D, E)."}
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
                            <SelectItem key={s.id} value={String(s.id)}>
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
                    <FormLabel>{isSchoolAdmin ? "Teacher full name" : "Tutor full name"}</FormLabel>
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
                  {createMutation.isPending ? "Creating…" : isSchoolAdmin ? "Create teacher" : "Create tutor"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editOpen && isSchoolAdmin && !!editingTeacher}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) {
            setEditingTeacher(null);
            setTutorDialogMode("view");
            setUnassignSelection(emptyTeacherUnassignSelection());
          }
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader className="space-y-0 pr-6">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1.5">
                <DialogTitle>
                  {tutorDialogMode === "view" ? "View teacher" : "Edit teacher"}
                </DialogTitle>
                <DialogDescription>
                  {tutorDialogMode === "view"
                    ? "Teacher profile, grade & subjects, and students."
                    : "Update profile or uncheck grades/subjects/students to remove them, then Save."}
                </DialogDescription>
              </div>
              {editingTeacher && tutorDialogMode === "view" ? (
                <Button
                  type="button"
                  size="sm"
                  className="shrink-0"
                  onClick={() => setTutorDialogMode("edit")}
                >
                  Edit
                </Button>
              ) : null}
              {editingTeacher && tutorDialogMode === "edit" ? (
                <div className="flex shrink-0 flex-col items-end gap-1 rounded-md border border-slate-300 bg-background px-3 py-2 dark:border-slate-600">
                  <p className="text-xs font-medium text-muted-foreground">Status</p>
                  <Select
                    value={editingTeacher.is_active ? "active" : "inactive"}
                    disabled={teacherStatusMutation.isPending}
                    onValueChange={(value) => {
                      teacherStatusMutation.mutate({
                        id: editingTeacher.id,
                        is_active: value === "active",
                      });
                    }}
                  >
                    <SelectTrigger className="h-8 w-[120px] !border !border-slate-300 bg-background hover:!border-slate-400 dark:!border-slate-600 dark:hover:!border-slate-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="!border !border-slate-300 dark:!border-slate-600">
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </div>
          </DialogHeader>
          {editingTeacher ? (
            <Form {...schoolEditForm}>
              <form
                className="space-y-4 pt-2"
                onSubmit={schoolEditForm.handleSubmit((values) => {
                  if (tutorDialogMode === "view") return;
                  const detail = teacherDetailQuery.data;
                  const unassign = detail
                    ? unassignDiffFromKept(detail, unassignSelection)
                    : emptyTeacherUnassignSelection();
                  if (hasUnassignItems(unassign)) {
                    setPendingTeacherSave({ values, unassign });
                    return;
                  }
                  schoolUpdateMutation.mutate({
                    id: editingTeacher.id,
                    values,
                    unassign,
                  });
                })}
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-border/80 bg-muted/15 p-3 text-sm">
                    <p className="text-xs text-muted-foreground">User ID</p>
                    <p className="font-medium">{editingTeacher.user_id}</p>
                  </div>
                  <FormField
                    control={schoolEditForm.control}
                    name="full_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full name</FormLabel>
                        <FormControl>
                          <Input disabled={tutorDialogMode === "view"} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={schoolEditForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input disabled={tutorDialogMode === "view"} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={schoolEditForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" disabled={tutorDialogMode === "view"} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <TeacherAssignmentsPanel
                  detail={teacherDetailQuery.data ?? null}
                  loading={teacherDetailQuery.isLoading}
                  selectable={tutorDialogMode === "edit"}
                  selection={unassignSelection}
                  onSelectionChange={setUnassignSelection}
                  disabled={schoolUpdateMutation.isPending}
                />

                {schoolUpdateMutation.error ? (
                  <p className="text-sm text-destructive">{String(schoolUpdateMutation.error)}</p>
                ) : null}
                <div className="flex items-center justify-between gap-2 pt-2">
                  {tutorDialogMode === "edit" && !editingTeacher.is_active ? (
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={deleteTeacherMutation.isPending}
                      onClick={() => setTeacherToDelete(editingTeacher)}
                    >
                      Delete
                    </Button>
                  ) : (
                    <span />
                  )}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (tutorDialogMode === "edit") {
                          const detail = teacherDetailQuery.data;
                          setUnassignSelection(
                            detail ? keptSelectionFromDetail(detail) : emptyTeacherUnassignSelection(),
                          );
                          setTutorDialogMode("view");
                          return;
                        }
                        setEditOpen(false);
                        setEditingTeacher(null);
                      }}
                    >
                      {tutorDialogMode === "view" ? "Close" : "Cancel"}
                    </Button>
                    {tutorDialogMode === "edit" ? (
                      <Button type="submit" disabled={schoolUpdateMutation.isPending}>
                        {schoolUpdateMutation.isPending ? "Saving…" : "Save changes"}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </form>
            </Form>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={editOpen && !isSchoolAdmin && !!editingTutor}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) setEditingTutor(null);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isSchoolAdmin
                ? tutorDialogMode === "view"
                  ? "View teacher"
                  : "Edit teacher"
                : "Edit tutor"}
            </DialogTitle>
            <DialogDescription>
              {tutorDialogMode === "view"
                ? "Teacher profile and class assignments (read-only)."
                : isSchoolAdmin
                  ? "Update profile, board, and the grade / sections grid."
                  : "Update profile, school, and the grade / sections grid. Leave password empty to keep the current one."}
            </DialogDescription>
          </DialogHeader>
          {editingTutor ? (
            <Form {...editForm}>
              <form
                className="grid gap-3 md:grid-cols-2 pt-2"
                onSubmit={editForm.handleSubmit((v) => {
                  if (tutorDialogMode === "view") return;
                  updateMutation.mutate({ tutorId: editingTutor.id, values: v });
                })}
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
                              <SelectItem key={s.id} value={String(s.id)}>
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
                        <Input placeholder="e.g. CBSE, IB, State" disabled={tutorDialogMode === "view"} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {tutorDialogMode === "view" ? (
                  <div className="md:col-span-2 space-y-2 rounded-lg border border-border/80 bg-muted/15 p-3">
                    <FormLabel>Classes &amp; sections</FormLabel>
                    <div className="space-y-2 text-sm">
                      {editForm.getValues("classes").map((row, index) => (
                        <div key={index} className="flex flex-wrap gap-x-2 gap-y-1">
                          <span className="font-medium text-foreground">Grade {row.grade || "—"}</span>
                          <span className="text-muted-foreground">
                            Sections:{" "}
                            {row.sections
                              .map((s) => s.value.trim())
                              .filter(Boolean)
                              .join(", ") || "—"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
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
                )}
                <FormField
                  control={editForm.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{isSchoolAdmin ? "Teacher full name" : "Tutor full name"}</FormLabel>
                      <FormControl>
                        <Input disabled={tutorDialogMode === "view"} {...field} />
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
                        <Input type="email" autoComplete="off" disabled={tutorDialogMode === "view"} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {!isSchoolAdmin && tutorDialogMode === "edit" ? (
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
                ) : null}
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
                    {tutorDialogMode === "view" ? "Close" : "Cancel"}
                  </Button>
                  {tutorDialogMode === "edit" ? (
                  <Button type="submit" disabled={updateMutation.isPending || !canSubmit}>
                    {updateMutation.isPending ? "Saving…" : "Save changes"}
                  </Button>
                  ) : null}
                </div>
              </form>
            </Form>
          ) : null}
        </DialogContent>
      </Dialog>

      <AddTeacherDialog
        open={onboardOpen && isSchoolAdmin}
        onOpenChange={setOnboardOpen}
        onSubmit={handleAddTeachers}
        isSubmitting={bulkCreateMutation.isPending}
      />

      <AssignClassesDialog
        open={assignClassesOpen}
        onOpenChange={setAssignClassesOpen}
        teachers={assignDialogTeachers}
        classes={assignableClasses}
        onAssign={(teacherIds, classIds) =>
          assignClassesMutation.mutate({ teacherIds, classIds })
        }
        isSubmitting={assignClassesMutation.isPending}
      />

      <AssignSubjectsDialog
        open={assignSubjectsOpen}
        onOpenChange={setAssignSubjectsOpen}
        teachers={assignDialogTeachers}
        subjects={assignableSubjects}
        onAssign={(teacherIds, subjectIds) =>
          assignSubjectsMutation.mutate({ teacherIds, subjectIds })
        }
        isSubmitting={assignSubjectsMutation.isPending}
      />

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

      <AlertDialog open={!!teacherToDelete} onOpenChange={(open) => !open && setTeacherToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete teacher?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes{" "}
              <span className="font-medium text-foreground">{teacherToDelete?.full_name}</span>{" "}
              ({teacherToDelete?.email}). This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteTeacherMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (teacherToDelete) deleteTeacherMutation.mutate(teacherToDelete.id);
              }}
            >
              {deleteTeacherMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!pendingTeacherSave}
        onOpenChange={(open) => !open && setPendingTeacherSave(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unassign selected items?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  You unchecked assignments for{" "}
                  <span className="font-medium text-foreground">{editingTeacher?.full_name}</span>. Saving
                  will unassign:
                </p>
                <ul className="list-disc space-y-1 pl-5">
                  {pendingTeacherSave && pendingTeacherSave.unassign.subjectIds.length > 0 ? (
                    <li>{pendingTeacherSave.unassign.subjectIds.length} subject(s)</li>
                  ) : null}
                  {pendingTeacherSave && pendingTeacherSave.unassign.classIds.length > 0 ? (
                    <li>{pendingTeacherSave.unassign.classIds.length} class(es)</li>
                  ) : null}
                  {pendingTeacherSave && pendingTeacherSave.unassign.studentIds.length > 0 ? (
                    <li>{pendingTeacherSave.unassign.studentIds.length} student(s)</li>
                  ) : null}
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={schoolUpdateMutation.isPending || !editingTeacher || !pendingTeacherSave}
              onClick={(e) => {
                e.preventDefault();
                if (!editingTeacher || !pendingTeacherSave) return;
                schoolUpdateMutation.mutate({
                  id: editingTeacher.id,
                  values: pendingTeacherSave.values,
                  unassign: pendingTeacherSave.unassign,
                });
              }}
            >
              {schoolUpdateMutation.isPending ? "Saving…" : "Confirm & save"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}
