import { useState } from "react";
import { Plus } from "lucide-react";
import { AddClassDialog, type AddClassesFormValues } from "@/modules/organization/components/classes/add-class-dialog";
import { ClassesOverviewTable } from "@/modules/organization/components/classes/classes-overview-table";
import {
  MapClassSubjectsDialog,
} from "@/modules/organization/components/classes/map-class-subjects-dialog";
import { classSubjectMappingKey } from "@/modules/organization/utils/classes-subject-helpers";
import { SubjectsAdminTable } from "@/modules/organization/components/classes/subjects-admin-table";
import { AddSubjectsDialog, type AddSubjectsFormValues } from "@/modules/organization/components/classes/add-subjects-dialog";
import { TextbookUploadsPanel } from "@/modules/organization/components/classes/textbook-uploads-panel";
import { classOptionLabel, TYPES_WITH_CHAPTER, type UploadTextbookFormValues } from "@/modules/organization/components/classes/upload-textbook-dialog";
import {
  DEMO_CLASS_OVERVIEW,
  DEMO_SUBJECTS,
  DEMO_TEXTBOOK_UPLOADS,
} from "@/modules/organization/data/demo-classes-admin";
import type { ClassOverviewItem, SubjectItem, TextbookUploadRow } from "@/modules/organization/types/classes-admin";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ICON_COLORS = [
  "bg-emerald-100 text-emerald-600",
  "bg-violet-100 text-violet-600",
  "bg-sky-100 text-sky-600",
  "bg-amber-100 text-amber-600",
  "bg-rose-100 text-rose-600",
];

function classIdFromRow(grade: string, section: string, curriculum: string) {
  return `${grade}-${section.toLowerCase()}-${curriculum.toLowerCase().replace(/\s+/g, "-")}`;
}

export default function OrganizationManageClassesPage() {
  const { toast } = useToast();
  const [classes, setClasses] = useState<ClassOverviewItem[]>(DEMO_CLASS_OVERVIEW);
  const [addClassOpen, setAddClassOpen] = useState(false);
  const [mapSubjectsOpen, setMapSubjectsOpen] = useState(false);
  const [mappingClass, setMappingClass] = useState<ClassOverviewItem | null>(null);
  const [subjectMappings, setSubjectMappings] = useState<Record<string, Record<string, boolean>>>({});
  const [subjects, setSubjects] = useState<SubjectItem[]>(DEMO_SUBJECTS);
  const [addSubjectsOpen, setAddSubjectsOpen] = useState(false);
  const [textbookUploads, setTextbookUploads] = useState<TextbookUploadRow[]>(DEMO_TEXTBOOK_UPLOADS);

  const handleAddClasses = (values: AddClassesFormValues) => {
    const existingIds = new Set(classes.map((c) => c.id));
    const seen = new Set<string>();
    const toAdd = values.classes.filter((row) => {
      const id = classIdFromRow(row.grade, row.section, row.curriculum);
      if (existingIds.has(id) || seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    if (toAdd.length === 0) {
      toast({
        title: "No classes added",
        description: "All rows were duplicates or already exist in the list.",
        variant: "destructive",
      });
      return;
    }

    setClasses((prev) => [
      ...prev,
      ...toAdd.map((row, index) => ({
        id: classIdFromRow(row.grade, row.section, row.curriculum),
        grade: row.grade,
        section: row.section,
        students: 0,
        teachers: 0,
        curriculums: [row.curriculum],
        iconClassName: ICON_COLORS[(prev.length + index) % ICON_COLORS.length],
      })),
    ]);
    setAddClassOpen(false);

    const skipped = values.classes.length - toAdd.length;
    toast({
      title: toAdd.length === 1 ? "Class created" : "Classes created",
      description:
        toAdd.length === 1
          ? `Grade ${toAdd[0].grade} · Section ${toAdd[0].section} · ${toAdd[0].curriculum} added.`
          : `${toAdd.length} classes added.${skipped > 0 ? ` ${skipped} duplicate row(s) skipped.` : ""}`,
    });
  };

  const handleAddSubjects = (values: AddSubjectsFormValues) => {
    const existingCodes = new Set(subjects.map((s) => s.code.toUpperCase()));
    const duplicates = values.subjects.filter((row) => existingCodes.has(row.code.toUpperCase()));
    if (duplicates.length > 0) {
      toast({
        title: "Duplicate subject code",
        description: `Code "${duplicates[0].code}" already exists.`,
        variant: "destructive",
      });
      return;
    }
    const batchCodes = new Set<string>();
    for (const row of values.subjects) {
      const code = row.code.toUpperCase();
      if (batchCodes.has(code)) {
        toast({
          title: "Duplicate in form",
          description: `Code "${code}" appears more than once.`,
          variant: "destructive",
        });
        return;
      }
      batchCodes.add(code);
    }
    const baseId = Date.now();
    setSubjects((prev) => [
      ...prev,
      ...values.subjects.map((row, i) => ({
        id: `subject-${baseId}-${i}`,
        name: row.name,
        code: row.code.toUpperCase(),
        curriculums: [] as string[],
        gradeRange: "—",
        active: true,
      })),
    ]);
    setAddSubjectsOpen(false);
    toast({
      title: "Subjects added",
      description: `${values.subjects.length} subject(s) added.`,
    });
  };

  const handleTextbookUpload = (values: UploadTextbookFormValues) => {
    const typeLabel = (contentType: string) =>
      contentType === "CHAPTER"
        ? "Chapter"
        : contentType === "POEM"
          ? "Poem"
          : contentType === "UNIT"
            ? "Unit"
            : contentType === "LESSON"
              ? "Lesson"
              : "Master";

    const newRows: TextbookUploadRow[] = values.uploads.flatMap((row, i) => {
      const cls = classes.find((c) => c.id === row.classId);
      if (!cls) return [];
      const subject = subjects.find((s) => s.id === row.subjectId);
      return [
        {
          id: `tb-${Date.now()}-${i}`,
          fileName: row.file.name,
          classLabel: classOptionLabel(cls),
          subjectName: subject?.name ?? "—",
          curriculum: cls.curriculums[0] ?? "—",
          grade: cls.grade,
          section: cls.section,
          contentType: typeLabel(row.contentType),
          chapter: TYPES_WITH_CHAPTER.has(row.contentType) ? (row.chapter ?? null) : null,
          chapterName: TYPES_WITH_CHAPTER.has(row.contentType) ? (row.chapterName?.trim() ?? null) : null,
          uploadedAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          status: "Processing" as const,
        },
      ];
    });
    if (newRows.length === 0) return;

    setTextbookUploads((prev) => [...newRows, ...prev]);
    toast({
      title: "Textbook uploaded",
      description:
        newRows.length === 1
          ? `${newRows[0].fileName} is queued for processing.`
          : `${newRows.length} files are queued for processing.`,
    });
  };

  const TABS = ["Classes", "Subjects", "Textbook Uploads"] as const;

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

        <TabsContent value="classes" className="mt-0 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-bold text-blue-900 dark:text-blue-100">Classes Overview</h2>
            <Button className="h-10 shrink-0 gap-2 bg-primary px-4" onClick={() => setAddClassOpen(true)}>
              <Plus className="h-4 w-4" />
              Add Class
            </Button>
          </div>
          <ClassesOverviewTable
            classes={classes}
            onMapSubjects={(item) => {
              setMappingClass(item);
              setMapSubjectsOpen(true);
            }}
          />
        </TabsContent>

        <TabsContent value="subjects" className="mt-0 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-bold text-blue-900 dark:text-blue-100">Subjects</h2>
            <Button className="h-10 shrink-0 gap-2 bg-primary px-4" onClick={() => setAddSubjectsOpen(true)}>
              <Plus className="h-4 w-4" />
              Add Subject
            </Button>
          </div>
          <SubjectsAdminTable subjects={subjects} classes={classes} subjectMappings={subjectMappings} />
        </TabsContent>

        <TabsContent value="textbook-uploads" className="mt-0">
          <TextbookUploadsPanel
            uploads={textbookUploads}
            classes={classes}
            subjects={subjects}
            subjectMappings={subjectMappings}
            onUpload={handleTextbookUpload}
          />
        </TabsContent>
      </Tabs>

      <AddClassDialog open={addClassOpen} onOpenChange={setAddClassOpen} onSubmit={handleAddClasses} />

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
          const key = classSubjectMappingKey(classId, curriculum);
          setSubjectMappings((prev) => ({ ...prev, [key]: mapped }));
          const count = Object.values(mapped).filter(Boolean).length;
          const cls = classes.find((c) => c.id === classId);
          toast({
            title: "Subjects mapped",
            description: `${count} subject(s) saved for Grade ${cls?.grade} · Section ${cls?.section} (${curriculum}).`,
          });
        }}
      />

      <AddSubjectsDialog
        open={addSubjectsOpen}
        onOpenChange={setAddSubjectsOpen}
        onSubmit={handleAddSubjects}
      />
    </div>
  );
}
