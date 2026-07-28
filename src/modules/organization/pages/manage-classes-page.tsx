import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import {
  bulkCreateClasses,
  bulkCreateSubjects,
  deleteClass,
  deleteSubject,
  getClassOptions,
  getClassSubjectMappings,
  listClasses,
  listSubjects,
  saveClassSubjects,
  updateClass,
  updateSubject,
} from "@/api/classes";
import { AddClassDialog, type AddClassesFormValues } from "@/modules/organization/components/classes/add-class-dialog";
import { ClassesOverviewTable } from "@/modules/organization/components/classes/classes-overview-table";
import { EditClassDialog, type EditClassFormValues } from "@/modules/organization/components/classes/edit-class-dialog";
import { EditSubjectDialog, type EditSubjectFormValues } from "@/modules/organization/components/classes/edit-subject-dialog";
import { MapClassSubjectsDialog } from "@/modules/organization/components/classes/map-class-subjects-dialog";
import { SubjectsAdminTable } from "@/modules/organization/components/classes/subjects-admin-table";
import { AddSubjectsDialog, type AddSubjectsFormValues } from "@/modules/organization/components/classes/add-subjects-dialog";
import { TextbookUploadsPanel } from "@/modules/organization/components/classes/textbook-uploads-panel";
import type { ClassOverviewItem, SubjectItem } from "@/modules/organization/types/classes-admin";
import { mapClassToOverview, mapSubjectToItem } from "@/modules/organization/utils/classes-api-helpers";
import { classSubjectMappingKey } from "@/modules/organization/utils/classes-subject-helpers";
import { getMyProfile } from "@/api/profile";
import { useAuthStore } from "@/lib/auth-store";
import { isIndividualTutor } from "@/lib/app-nav-items";
import { invalidateManyAndBroadcast } from "@/lib/query-broadcast";
import { useToast } from "@/hooks/use-toast";
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
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataState } from "@/modules/shared/components/data-state";

const TABS = ["Classes", "Subjects", "Textbook Uploads"] as const;

export default function OrganizationManageClassesPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const individual = isIndividualTutor(user?.role, user?.schoolId);
  const [addClassOpen, setAddClassOpen] = useState(false);
  const [mapSubjectsOpen, setMapSubjectsOpen] = useState(false);
  const [mappingClass, setMappingClass] = useState<ClassOverviewItem | null>(null);
  const [addSubjectsOpen, setAddSubjectsOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassOverviewItem | null>(null);
  const [editingSubject, setEditingSubject] = useState<SubjectItem | null>(null);
  const [classToDelete, setClassToDelete] = useState<ClassOverviewItem | null>(null);
  const [subjectToDelete, setSubjectToDelete] = useState<SubjectItem | null>(null);

  const optionsQuery = useQuery({
    queryKey: ["classes", "options"],
    queryFn: getClassOptions,
  });

  const subjectsQuery = useQuery({
    queryKey: ["classes", "subjects"],
    queryFn: () => listSubjects(),
  });

  const classesQuery = useQuery({
    queryKey: ["classes", "list"],
    queryFn: () => listClasses(),
  });

  const mappingsQuery = useQuery({
    queryKey: ["classes", "mappings"],
    queryFn: getClassSubjectMappings,
  });

  const subjects = useMemo(
    () => (subjectsQuery.data?.items ?? []).map(mapSubjectToItem),
    [subjectsQuery.data?.items],
  );
  const classes = useMemo(
    () => (classesQuery.data?.items ?? []).map((item, index) => mapClassToOverview(item, index)),
    [classesQuery.data?.items],
  );
  const subjectMappings = mappingsQuery.data?.mappings ?? {};
  const curricula = optionsQuery.data?.curricula ?? [];

  const invalidateAll = async () => {
    await invalidateManyAndBroadcast(qc, ["classes", "dashboard"]);
    if (!individual) return;
    // Mirror owned classes onto auth profile for Sessions / Lesson Planner.
    try {
      const profile = await getMyProfile();
      updateUser({
        teachingBoard: profile.teaching_board ?? null,
        teachingClasses: profile.teaching_classes ?? null,
      });
    } catch {
      // ponytail: class save already succeeded; profile refresh can retry next load
    }
  };

  const bulkSubjectsMutation = useMutation({
    mutationFn: (rows: AddSubjectsFormValues["subjects"]) => bulkCreateSubjects(rows),
    onSuccess: async (result) => {
      if (result.created.length > 0) {
        await invalidateAll();
        setAddSubjectsOpen(false);
        toast({
          title: result.created.length === 1 ? "Subject added" : "Subjects added",
          description:
            result.errors.length > 0
              ? `${result.created.length} saved. ${result.errors.length} row(s) failed.`
              : `${result.created.length} subject(s) saved.`,
        });
        return;
      }
      if (result.errors.length > 0) {
        toast({
          title: "Could not add subjects",
          description: result.errors.map((e) => `Row ${e.row}: ${e.message}`).join(" "),
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Could not add subjects",
        description: "No subjects were saved. Check the form and try again.",
        variant: "destructive",
      });
    },
    onError: (err) => {
      toast({
        title: "Could not add subjects",
        description: err instanceof Error ? err.message : "Request failed.",
        variant: "destructive",
      });
    },
  });

  const bulkClassesMutation = useMutation({
    mutationFn: (rows: AddClassesFormValues["classes"]) => bulkCreateClasses(rows),
    onSuccess: async (result) => {
      if (result.created.length > 0) {
        await invalidateAll();
        setAddClassOpen(false);
        toast({
          title: result.created.length === 1 ? "Class created" : "Classes created",
          description:
            result.errors.length > 0
              ? `${result.created.length} saved. ${result.errors.length} row(s) failed.`
              : `${result.created.length} class(es) saved.`,
        });
        return;
      }
      if (result.errors.length > 0) {
        toast({
          title: "Could not add classes",
          description: result.errors.map((e) => `Row ${e.row}: ${e.message}`).join(" "),
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Could not add classes",
        description: "No classes were saved. Check the form and try again.",
        variant: "destructive",
      });
    },
    onError: (err) => {
      toast({
        title: "Could not add classes",
        description: err instanceof Error ? err.message : "Request failed.",
        variant: "destructive",
      });
    },
  });

  const mapSubjectsMutation = useMutation({
    mutationFn: ({
      classId,
      mapped,
    }: {
      classId: string;
      curriculum: string;
      mapped: Record<string, boolean>;
    }) =>
      saveClassSubjects(
        classId,
        Object.entries(mapped)
          .filter(([, checked]) => checked)
          .map(([id]) => Number(id)),
      ),
    onSuccess: (_result, variables) => {
      invalidateAll();
      const count = Object.values(variables.mapped).filter(Boolean).length;
      const cls = classes.find((c) => c.id === variables.classId);
      toast({
        title: "Subjects mapped",
        description: `${count} subject(s) saved for Grade ${cls?.grade} · Section ${cls?.section} (${variables.curriculum}).`,
      });
    },
    onError: (err) => {
      toast({
        title: "Could not save mapping",
        description: err instanceof Error ? err.message : "Request failed.",
        variant: "destructive",
      });
    },
  });

  const updateSubjectMutation = useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: string;
      values: EditSubjectFormValues;
    }) => {
      await updateSubject(id, { name: values.name, code: values.code });

      const updates: Promise<unknown>[] = [];
      for (const cls of classes) {
        const curriculum = cls.curriculums[0] ?? "";
        const key = classSubjectMappingKey(cls.id, curriculum);
        const wantTagged = values.taggedClasses[cls.id] ?? false;
        const currentMap = { ...(subjectMappings[key] ?? {}) };
        const hadTagged = !!currentMap[id];
        if (wantTagged === hadTagged) continue;

        const nextIds = Object.entries(currentMap)
          .filter(([subjectId, checked]) => checked && subjectId !== id)
          .map(([subjectId]) => Number(subjectId));
        if (wantTagged) nextIds.push(Number(id));
        updates.push(saveClassSubjects(cls.id, nextIds));
      }
      if (updates.length > 0) await Promise.all(updates);
    },
    onSuccess: () => {
      setEditingSubject(null);
      invalidateAll();
      toast({ title: "Subject updated" });
    },
    onError: (err) => {
      toast({
        title: "Could not update subject",
        description: err instanceof Error ? err.message : "Request failed.",
        variant: "destructive",
      });
    },
  });

  const updateClassMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: EditClassFormValues }) =>
      updateClass(id, values),
    onSuccess: () => {
      setEditingClass(null);
      invalidateAll();
      toast({ title: "Class updated" });
    },
    onError: (err) => {
      toast({
        title: "Could not update class",
        description: err instanceof Error ? err.message : "Request failed.",
        variant: "destructive",
      });
    },
  });

  const deleteSubjectMutation = useMutation({
    mutationFn: (id: string) => deleteSubject(id),
    onSuccess: () => {
      setSubjectToDelete(null);
      invalidateAll();
      toast({ title: "Subject deleted" });
    },
    onError: (err) => {
      toast({
        title: "Could not delete subject",
        description: err instanceof Error ? err.message : "Request failed.",
        variant: "destructive",
      });
    },
  });

  const deleteClassMutation = useMutation({
    mutationFn: (id: string) => deleteClass(id),
    onSuccess: () => {
      setClassToDelete(null);
      invalidateAll();
      toast({ title: "Class deleted" });
    },
    onError: (err) => {
      toast({
        title: "Could not delete class",
        description: err instanceof Error ? err.message : "Request failed.",
        variant: "destructive",
      });
    },
  });

  const handleAddSubjects = (values: AddSubjectsFormValues) => {
    bulkSubjectsMutation.mutate(values.subjects);
  };

  const handleAddClasses = (values: AddClassesFormValues) => {
    bulkClassesMutation.mutate(values.classes);
  };

  const subjectsLoading = subjectsQuery.isLoading;
  const classesLoading = classesQuery.isLoading;
  const subjectsError = subjectsQuery.error;
  const classesError = classesQuery.error ?? optionsQuery.error ?? null;

  return (
    <div className="dashboard-fit flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-5">
      <Tabs defaultValue="classes" className="flex flex-col gap-4">
        <TabsList className="h-auto w-fit gap-6 rounded-none border-b border-border/60 bg-transparent p-0">
          {TABS.map((tab) => (
            <TabsTrigger
              key={tab}
              value={tab.toLowerCase().replace(/\s+/g, "-")}
              className="rounded-none border-b-2 border-transparent px-1 pb-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
            >
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="subjects" className="mt-0 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="min-w-0 truncate text-lg font-bold text-blue-900 dark:text-blue-100 sm:text-xl">
              Subjects
            </h2>
            <Button
              className="h-9 shrink-0 gap-1.5 bg-primary px-3 text-sm sm:h-10 sm:gap-2 sm:px-4"
              onClick={() => setAddSubjectsOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Add Subject
            </Button>
          </div>
          {subjectsLoading && !subjectsQuery.data ? (
            <DataState loading error={null} empty={false} emptyText="">
              {null}
            </DataState>
          ) : subjectsError ? (
            <p className="py-8 text-center text-sm text-destructive">{String(subjectsError)}</p>
          ) : (
            <SubjectsAdminTable
              subjects={subjects}
              classes={classes}
              subjectMappings={subjectMappings}
              onEdit={setEditingSubject}
              onDelete={setSubjectToDelete}
            />
          )}
        </TabsContent>

        <TabsContent value="classes" className="mt-0 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="min-w-0 truncate text-lg font-bold text-blue-900 dark:text-blue-100 sm:text-xl">
              Classes Overview
            </h2>
            <Button
              className="h-9 shrink-0 gap-1.5 bg-primary px-3 text-sm sm:h-10 sm:gap-2 sm:px-4"
              onClick={() => setAddClassOpen(true)}
              disabled={curricula.length === 0}
            >
              <Plus className="h-4 w-4" />
              Add Class
            </Button>
          </div>
          {curricula.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {individual
                ? "No curriculum on your teaching profile. Set your board during signup or in settings, then add classes."
                : "No curricula on your school profile. Complete school signup or contact support to add boards."}
            </p>
          ) : null}
          {classesLoading && !classesQuery.data ? (
            <DataState loading error={null} empty={false} emptyText="">
              {null}
            </DataState>
          ) : classesError ? (
            <p className="py-8 text-center text-sm text-destructive">{String(classesError)}</p>
          ) : (
            <ClassesOverviewTable
              classes={classes}
              onMapSubjects={(item) => {
                setMappingClass(item);
                setMapSubjectsOpen(true);
              }}
              onEdit={setEditingClass}
              onDelete={setClassToDelete}
            />
          )}
        </TabsContent>

        <TabsContent value="textbook-uploads" className="mt-0">
          <TextbookUploadsPanel
            uploads={[]}
            classes={classes}
            subjects={subjects}
            subjectMappings={subjectMappings}
            onUpload={() => {
              toast({
                title: "Coming soon",
                description: "Textbook uploads will be available in a future update.",
              });
            }}
          />
        </TabsContent>
      </Tabs>

      <AddClassDialog
        open={addClassOpen}
        onOpenChange={setAddClassOpen}
        curricula={curricula}
        onSubmit={handleAddClasses}
        isSubmitting={bulkClassesMutation.isPending}
      />

      <MapClassSubjectsDialog
        open={mapSubjectsOpen}
        onOpenChange={(open) => {
          setMapSubjectsOpen(open);
          if (!open) setMappingClass(null);
        }}
        classItem={mappingClass}
        subjects={subjects}
        mappings={subjectMappings}
        onSave={(classId, curriculum, mapped) => {
          mapSubjectsMutation.mutate({ classId, curriculum, mapped });
          setMapSubjectsOpen(false);
          setMappingClass(null);
        }}
      />

      <AddSubjectsDialog
        open={addSubjectsOpen}
        onOpenChange={setAddSubjectsOpen}
        onSubmit={handleAddSubjects}
        isSubmitting={bulkSubjectsMutation.isPending}
      />

      <EditSubjectDialog
        open={!!editingSubject}
        onOpenChange={(open) => !open && setEditingSubject(null)}
        subject={editingSubject}
        classes={classes}
        mappings={subjectMappings}
        onSubmit={(values) => {
          if (editingSubject) updateSubjectMutation.mutate({ id: editingSubject.id, values });
        }}
        isSubmitting={updateSubjectMutation.isPending}
      />

      <EditClassDialog
        open={!!editingClass}
        onOpenChange={(open) => !open && setEditingClass(null)}
        classItem={editingClass}
        curricula={curricula}
        onSubmit={(values) => {
          if (editingClass) updateClassMutation.mutate({ id: editingClass.id, values });
        }}
        isSubmitting={updateClassMutation.isPending}
      />

      <AlertDialog open={!!subjectToDelete} onOpenChange={(open) => !open && setSubjectToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete subject?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes{" "}
              <span className="font-medium text-foreground">{subjectToDelete?.name}</span> (
              {subjectToDelete?.code}). Classes mapped to it will lose that subject link.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteSubjectMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (subjectToDelete) deleteSubjectMutation.mutate(subjectToDelete.id);
              }}
            >
              {deleteSubjectMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!classToDelete} onOpenChange={(open) => !open && setClassToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete class?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes Grade {classToDelete?.grade} · Section {classToDelete?.section}
              {classToDelete?.curriculums[0] ? ` (${classToDelete.curriculums[0]})` : ""}. This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteClassMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (classToDelete) deleteClassMutation.mutate(classToDelete.id);
              }}
            >
              {deleteClassMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
