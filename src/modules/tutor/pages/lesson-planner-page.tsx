import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AssignArtifactsDialog } from "@/modules/tutor/components/lesson-planner/assign-artifacts-dialog";
import { GeneratedLessonPanel } from "@/modules/tutor/components/lesson-planner/generated-lesson-panel";
import {
  artifactDownloadFilename,
  LessonPlanDownloadDialog,
} from "@/modules/tutor/components/lesson-planner/lesson-plan-download-dialog";
import { LessonPlanForm } from "@/modules/tutor/components/lesson-planner/lesson-plan-form";
import { SavedLessonPlansTable } from "@/modules/tutor/components/lesson-planner/saved-lesson-plans-table";
import { DEFAULT_LESSON_FORM } from "@/modules/tutor/data/demo-lesson-plans";
import { useLessonGeneration } from "@/modules/tutor/hooks/use-lesson-generation";
import { useLessonPlannerProfile } from "@/modules/tutor/hooks/use-lesson-planner-profile";
import { useLessonPlannerMutations } from "@/modules/tutor/hooks/use-lesson-planner-mutations";
import { useLessonPlans } from "@/modules/tutor/hooks/use-lesson-planner";
import type { LessonPlanFormValues, SavedLessonPlan } from "@/modules/tutor/types/lesson-planner";
import { getLessonPlan, type ExportFormat, type LessonArtifactType } from "@/api/lesson-planner";
import {
  listTutorAssignments,
  type AssignableArtifactType,
} from "@/api/assignments";
import { mapApiPlanToGenerated, planApiToSaveArtifacts } from "@/modules/tutor/utils/lesson-planner-mappers";
import { isIndividualTutor } from "@/lib/app-nav-items";
import { useAuthStore } from "@/lib/auth-store";
import type { User } from "@/types/schema";

const EMPTY_TEACHING_CLASSES: NonNullable<User["teachingClasses"]> = [];

const ASSIGNABLE = new Set<AssignableArtifactType>(["quiz", "worksheet", "homework"]);

export default function TutorLessonPlannerPage() {
  const user = useAuthStore((s) => s.user);
  const teachingClasses = user?.teachingClasses ?? EMPTY_TEACHING_CLASSES;
  const individual = isIndividualTutor(user?.role, user?.schoolId);
  const [formValues, setFormValues] = useState<LessonPlanFormValues>(DEFAULT_LESSON_FORM);
  const [isSaved, setIsSaved] = useState(false);
  const [fromSavedLibrary, setFromSavedLibrary] = useState(false);
  const [activeTab, setActiveTab] = useState("plan");
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignTypes, setAssignTypes] = useState<AssignableArtifactType[] | undefined>();
  const [exportingKey, setExportingKey] = useState<string | null>(null);

  const { data: savedPlans = [], isLoading: loadingSaved } = useLessonPlans();
  const {
    generatedPlan,
    setGeneratedPlan,
    lessonPlanId,
    setLessonPlanId,
    jobId,
    progress,
    isGenerating,
    generate,
    resume,
    closeWs,
  } = useLessonGeneration();
  const { save, exportPlan, cancel } = useLessonPlannerMutations();
  const { needsProfileSetup } = useLessonPlannerProfile(formValues, setFormValues);

  const { data: assignmentsData } = useQuery({
    queryKey: ["tutor", "assignments"],
    queryFn: listTutorAssignments,
    enabled: Boolean(lessonPlanId),
  });

  const assignedArtifacts = useMemo(() => {
    if (!lessonPlanId) return [] as AssignableArtifactType[];
    const pid = Number(lessonPlanId);
    const types = new Set<AssignableArtifactType>();
    for (const a of assignmentsData?.items ?? []) {
      if (a.lesson_plan_id !== pid || a.status !== "active") continue;
      if (ASSIGNABLE.has(a.artifact_type as AssignableArtifactType)) {
        types.add(a.artifact_type as AssignableArtifactType);
      }
    }
    return [...types];
  }, [assignmentsData, lessonPlanId]);


  const handleGenerate = () => {
    setIsSaved(false);
    setFromSavedLibrary(false);
    generate(formValues);
  };

  const openAssign = (types?: AssignableArtifactType[]) => {
    setAssignTypes(types);
    setAssignOpen(true);
  };

  const handleSave = async () => {
    if (!lessonPlanId) return;
    const plan = await getLessonPlan(lessonPlanId);
    save.mutate(
      {
        lesson_plan_id: lessonPlanId,
        title: plan.title,
        artifacts: planApiToSaveArtifacts(plan),
        change_summary: "Saved from lesson planner UI",
      },
      {
        onSuccess: () => {
          setIsSaved(true);
          setFromSavedLibrary(true);
        },
      },
    );
  };

  const handleArtifactDownload = (artifact: LessonArtifactType, format: ExportFormat) => {
    if (!lessonPlanId) return;
    const rowKey = `${artifact}-${format}`;
    setExportingKey(rowKey);
    exportPlan.mutate(
      {
        lessonPlanId,
        format,
        artifactTypes: [artifact],
        filename: artifactDownloadFilename(artifact, format),
      },
      {
        onSettled: () => setExportingKey(null),
      },
    );
  };

  const handleOpenSaved = async (plan: SavedLessonPlan) => {
    const id = String(plan.id);
    setActiveTab("plan");
    setLessonPlanId(id);
    setIsSaved(true);
    setFromSavedLibrary(true);
    closeWs();
    const api = await getLessonPlan(id);
    setLessonPlanId(String(api.id));
    setIsSaved(true);
    setFromSavedLibrary(true);
    setGeneratedPlan(mapApiPlanToGenerated(api));
    const grade = api.grade.replace(/^CLASS_/, "");
    const matched = teachingClasses.find((c) => c.grade === api.grade || c.grade.replace(/^CLASS_/, "") === grade);
    setFormValues((prev) => ({
      ...prev,
      grade: grade || prev.grade,
      sections:
        Array.isArray(api.plan_metadata?.sections) && (api.plan_metadata.sections as string[]).length
          ? (api.plan_metadata.sections as string[])
          : matched?.sections?.[0]
            ? [matched.sections[0]]
            : prev.sections,
      subject: api.subject,
      chapter: api.chapter_name,
      chapterId: api.chapter_id ?? undefined,
      board: api.board ?? matched?.curriculum ?? prev.board,
      topics: Array.isArray(api.plan_metadata?.topics)
        ? (api.plan_metadata.topics as string[])
        : [],
      customTopics: "",
      pptTemplate:
        typeof api.plan_metadata?.ppt_template === "string"
          ? (api.plan_metadata.ppt_template as string)
          : prev.pptTemplate || "clean_academic",
      pptSlideCount: (["8", "12", "16"].includes(String(api.plan_metadata?.ppt_slide_count))
        ? String(api.plan_metadata?.ppt_slide_count)
        : prev.pptSlideCount || "12") as "8" | "12" | "16",
      duration: String(api.duration_minutes),
      learningObjectives: api.learning_objectives,
    }));
  };

  const handleDuplicate = (plan: SavedLessonPlan) => {
    void handleOpenSaved(plan).then(() => {
      setLessonPlanId(null);
      setIsSaved(false);
      setFromSavedLibrary(false);
    });
  };

  const handleCancel = () => {
    if (jobId) cancel.mutate(jobId);
  };

  const handleResume = () => {
    if (jobId) resume(jobId);
  };

  const secondaryActions = (
    <>
      {isGenerating ? (
        <Button size="sm" variant="outline" onClick={handleCancel} disabled={cancel.isPending}>
          Cancel
        </Button>
      ) : null}
      {progress.error && jobId ? (
        <Button size="sm" variant="outline" onClick={handleResume}>
          Resume
        </Button>
      ) : null}
      <Button
        size="sm"
        variant="outline"
        className="gap-1.5 border-primary/30 text-primary"
        disabled={!generatedPlan || !lessonPlanId || exportPlan.isPending}
        onClick={() => setDownloadOpen(true)}
      >
        {exportPlan.isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Download className="h-3.5 w-3.5" />
        )}
        Download
      </Button>
    </>
  );

  return (
    <div className="dashboard-fit flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3 md:p-4 lg:overflow-hidden">
      <div className="flex shrink-0 flex-col gap-2">
        <div className="flex min-w-0 items-start justify-between gap-2 lg:items-center lg:gap-4">
          <div className="min-w-0 flex-1 space-y-0.5">
            <h1 className="text-xl font-bold leading-tight text-blue-900 dark:text-blue-100 sm:text-2xl">
              Lesson Planner
            </h1>
            <p className="text-sm text-muted-foreground">
              Plan lessons, worksheets, and revision topics for your classes.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            {secondaryActions}
            <Button
              size="sm"
              className="gap-1.5 bg-primary"
              disabled={!generatedPlan || !lessonPlanId || save.isPending}
              onClick={() => void handleSave()}
            >
              {save.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Save Lesson
            </Button>
          </div>
        </div>
        <LessonPlanDownloadDialog
          open={downloadOpen}
          onOpenChange={setDownloadOpen}
          plan={generatedPlan}
          exportingKey={exportingKey}
          onDownload={handleArtifactDownload}
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex min-h-0 flex-1 flex-col gap-3">
        <TabsList className="h-auto w-fit shrink-0 gap-6 rounded-none border-b border-border/60 bg-transparent p-0">
          <TabsTrigger
            value="plan"
            className="rounded-none border-b-2 border-transparent px-1 pb-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
          >
            Plan Lesson
          </TabsTrigger>
          <TabsTrigger
            value="saved"
            className="rounded-none border-b-2 border-transparent px-1 pb-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
          >
            Saved Lessons
          </TabsTrigger>
        </TabsList>

        <TabsContent value="plan" className="mt-0 min-h-0 flex-1 overflow-y-auto lg:overflow-hidden">
          <div className="grid min-h-0 gap-4 lg:h-full lg:grid-cols-[30%_minmax(0,1fr)] lg:overflow-hidden">
            <div className="min-h-0 lg:overflow-hidden">
              {needsProfileSetup ? (
                <p className="mb-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
                  {individual
                    ? "No classes yet on your profile. Open Classes, add your board/curriculum and teaching classes, then return here to plan lessons."
                    : "No class or curriculum is assigned to your tutor profile. Ask your school admin to set board and teaching classes — the student AI tutor works because that profile already has them."}
                </p>
              ) : null}
              <LessonPlanForm
                values={formValues}
                onChange={setFormValues}
                onGenerate={handleGenerate}
                isGenerating={isGenerating}
              />
            </div>

            <div className="min-h-0 overflow-hidden">
              <GeneratedLessonPanel
                plan={generatedPlan}
                isSaved={isSaved || fromSavedLibrary}
                isGenerating={isGenerating}
                progress={progress.progress}
                progressMessage={progress.message}
                completedArtifacts={progress.completedArtifacts}
                error={progress.error}
                canAssign={Boolean(lessonPlanId) && (isSaved || fromSavedLibrary)}
                assignedArtifacts={assignedArtifacts}
                onAssignArtifact={(type) => openAssign([type])}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="saved" className="mt-0 min-h-0 flex-1 overflow-hidden">
          <SavedLessonPlansTable
            plans={loadingSaved ? [] : savedPlans}
            onOpen={(plan) => void handleOpenSaved(plan)}
            onDuplicate={handleDuplicate}
          />
        </TabsContent>
      </Tabs>

      <AssignArtifactsDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        lessonPlanId={lessonPlanId}
        plan={generatedPlan}
        grade={formValues.grade}
        sections={formValues.sections}
        curriculum={formValues.board || ""}
        subject={formValues.subject}
        initialTypes={assignTypes}
        assignedArtifacts={assignedArtifacts}
      />
    </div>
  );
}
