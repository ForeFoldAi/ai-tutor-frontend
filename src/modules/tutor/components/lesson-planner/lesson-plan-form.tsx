import { ChevronDown, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchChapterTopics, fetchPptThemes } from "@/api/lesson-planner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/auth-store";
import { classOptionLabel, resolveClassCurriculum } from "@/lib/teaching-curriculum";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useLessonPlannerCatalog } from "@/modules/tutor/hooks/use-lesson-planner-catalog";
import type { AiPrepareOption, LessonPlanFormValues } from "@/modules/tutor/types/lesson-planner";

const fieldBorderClass =
  "border-2 border-gray-300 bg-background shadow-none dark:border-gray-600";

const EMPTY_CLASSES: { grade: string; sections: string[]; curriculum?: string | null }[] = [];

const MAX_TOPICS = 8;

const FALLBACK_PPT_THEMES = [
  {
    id: "clean_academic",
    label: "Clean Academic",
    description: "Navy and white — clear for Class 8–10",
    primary: "#1e40af",
    accent: "#0ea5e9",
    bg: "#f8fafc",
  },
  {
    id: "bright_classroom",
    label: "Bright Classroom",
    description: "Soft color cards — friendly for younger classes",
    primary: "#d97706",
    accent: "#ea580c",
    bg: "#fffbeb",
  },
  {
    id: "stem_focus",
    label: "STEM Focus",
    description: "Teal on dark — Math / Science emphasis",
    primary: "#2dd4bf",
    accent: "#38bdf8",
    bg: "#0f172a",
  },
  {
    id: "soft_story",
    label: "Soft Story",
    description: "Warm neutrals — Languages / Social Studies",
    primary: "#78350f",
    accent: "#b45309",
    bg: "#faf5f0",
  },
];

const PREPARE_OPTIONS: { id: AiPrepareOption; label: string }[] = [
  { id: "complete-lesson-plan", label: "Complete Lesson Plan" },
  { id: "teaching-notes", label: "Teaching Notes" },
  { id: "step-by-step", label: "Step-by-step Explanation" },
  { id: "real-life-examples", label: "Real-life Examples" },
  { id: "practice-worksheet", label: "Practice Worksheet" },
  { id: "quiz-questions", label: "Quiz Questions" },
  { id: "homework", label: "Homework" },
  { id: "ppt-outline", label: "PPT Outline" },
  { id: "student-doubt-questions", label: "Student Doubt Questions" },
  { id: "remedial-plan", label: "Remedial Plan" },
];

interface LessonPlanFormProps {
  values: LessonPlanFormValues;
  onChange: (values: LessonPlanFormValues) => void;
  onGenerate: () => void;
  isGenerating?: boolean;
}

function classKey(grade: string, section: string, curriculum?: string | null) {
  return `${grade}::${section}::${curriculum?.trim() || "none"}`;
}

function sameGrade(a: string, b: string) {
  return String(a).replace(/^CLASS_/i, "").trim().toLowerCase() ===
    String(b).replace(/^CLASS_/i, "").trim().toLowerCase();
}

function sameCurriculum(a?: string | null, b?: string | null) {
  return (a?.trim() || "") === (b?.trim() || "");
}

export function LessonPlanForm({ values, onChange, onGenerate, isGenerating }: LessonPlanFormProps) {
  const [classMenuOpen, setClassMenuOpen] = useState(false);
  const teachingClasses = useAuthStore((s) => s.user?.teachingClasses ?? EMPTY_CLASSES);
  const teachingBoard = useAuthStore((s) => s.user?.teachingBoard?.trim() ?? "");
  const { subjects, loadingSubjects } = useLessonPlannerCatalog(values.grade, values.board ?? "");

  const classOptions = useMemo(() => {
    const out: { key: string; grade: string; section: string; curriculum: string | null }[] = [];
    for (const row of teachingClasses) {
      const curriculum = resolveClassCurriculum(row, teachingBoard);
      for (const section of row.sections?.length ? row.sections : [""]) {
        if (!section.trim()) continue;
        out.push({
          key: classKey(row.grade, section, curriculum),
          grade: row.grade,
          section,
          curriculum,
        });
      }
    }
    return out;
  }, [teachingClasses, teachingBoard]);

  const curriculumValue = values.board ?? "";
  const hasClassSelection = Boolean(values.grade && values.sections.length);

  const selectedSubject = subjects.find((s) => s.subject_name === values.subject);
  const chapterOptions = (selectedSubject?.chapters ?? []).map((chapter) => ({
    ...chapter,
    id: String(chapter.id),
  }));

  const subjectSelectValue = useMemo(() => {
    if (values.subject && subjects.some((s) => s.subject_name === values.subject)) {
      return values.subject;
    }
    return undefined;
  }, [values.subject, subjects]);

  const chapterSelectValue = useMemo(() => {
    const id = values.chapterId != null ? String(values.chapterId) : "";
    if (id && chapterOptions.some((c) => c.id === id)) return id;
    return undefined;
  }, [values.chapterId, chapterOptions]);

  const topicsQuery = useQuery({
    queryKey: [
      "lesson-planner",
      "chapter-topics",
      values.chapterId,
      values.subject,
      values.board,
      values.grade,
    ] as const,
    queryFn: () =>
      fetchChapterTopics({
        chapterId: String(values.chapterId),
        subject: values.subject,
        board: values.board,
        classLevel: values.grade.startsWith("CLASS_") ? values.grade : `CLASS_${values.grade}`,
        chapterName: values.chapter,
      }),
    enabled: Boolean(values.chapterId && values.subject),
    staleTime: 5 * 60 * 1000,
  });

  const pptThemesQuery = useQuery({
    queryKey: ["lesson-planner", "ppt-themes"] as const,
    queryFn: fetchPptThemes,
    enabled: Boolean(values.prepareOptions["ppt-outline"]),
    staleTime: 30 * 60 * 1000,
  });

  const chapterTopics = topicsQuery.data?.topics ?? [];
  const selectedCount =
    values.topics.length +
    values.customTopics.split(/[\n,;]+/).filter((t) => t.trim()).length;

  const toggleOption = (id: AiPrepareOption, checked: boolean) => {
    onChange({
      ...values,
      prepareOptions: { ...values.prepareOptions, [id]: checked },
    });
  };

  const toggleTopic = (title: string, checked: boolean) => {
    if (checked) {
      if (values.topics.includes(title) || selectedCount >= MAX_TOPICS) return;
      onChange({ ...values, topics: [...values.topics, title] });
      return;
    }
    onChange({ ...values, topics: values.topics.filter((t) => t !== title) });
  };

  const isClassChecked = (option: (typeof classOptions)[number]) =>
    sameGrade(option.grade, values.grade) &&
    sameCurriculum(option.curriculum, values.board) &&
    values.sections.includes(option.section);

  const isClassEnabled = (option: (typeof classOptions)[number]) => {
    if (!hasClassSelection) return true;
    return sameGrade(option.grade, values.grade) && sameCurriculum(option.curriculum, values.board);
  };

  const toggleClass = (option: (typeof classOptions)[number], checked: boolean) => {
    if (checked) {
      const switching =
        hasClassSelection &&
        (!sameGrade(option.grade, values.grade) || !sameCurriculum(option.curriculum, values.board));

      if (switching) {
        // Same-grade only: picking another grade replaces the selection.
        onChange({
          ...values,
          grade: option.grade,
          sections: [option.section],
          board: option.curriculum ?? "",
          subject: "",
          chapter: "",
          chapterId: undefined,
          topics: [],
          customTopics: "",
        });
        return;
      }

      if (values.sections.includes(option.section)) return;
      onChange({
        ...values,
        grade: option.grade,
        board: option.curriculum ?? values.board,
        sections: [...values.sections, option.section],
      });
      return;
    }

    const nextSections = values.sections.filter((s) => s !== option.section);
    onChange({
      ...values,
      sections: nextSections,
      grade: nextSections.length ? values.grade : "",
      board: nextSections.length ? values.board : "",
      subject: nextSections.length ? values.subject : "",
      chapter: nextSections.length ? values.chapter : "",
      chapterId: nextSections.length ? values.chapterId : undefined,
      topics: nextSections.length ? values.topics : [],
      customTopics: nextSections.length ? values.customTopics : "",
    });
  };

  const classTriggerLabel = useMemo(() => {
    if (!hasClassSelection) return null;
    const gradeLabel = String(values.grade).replace(/^CLASS_/, "");
    const sections = values.sections.join(", ");
    return values.board?.trim()
      ? `Grade ${gradeLabel} · ${sections} · ${values.board.trim()}`
      : `Grade ${gradeLabel} · ${sections}`;
  }, [hasClassSelection, values.grade, values.sections, values.board]);

  const handleSubjectChange = (subject: string) => {
    onChange({
      ...values,
      subject,
      chapter: "",
      chapterId: undefined,
      topics: [],
      customTopics: "",
    });
  };

  const handleChapterChange = (chapterId: string) => {
    const chapter = chapterOptions.find((c) => c.id === chapterId);
    onChange({
      ...values,
      chapter: chapter?.chapter ?? chapter?.file_name ?? "",
      chapterId: chapter?.id,
      topics: [],
      customTopics: "",
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border/70 bg-card p-3 shadow-card">
      <h2 className="shrink-0 pb-2 text-base font-bold text-blue-900 dark:text-blue-100">
        Plan Your Lesson with AI
      </h2>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
        <div className="grid shrink-0 grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Grade / Class</Label>
            <Popover open={classMenuOpen} onOpenChange={setClassMenuOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  disabled={!classOptions.length}
                  title={classTriggerLabel ?? undefined}
                  className={cn(
                    "flex h-9 w-full items-center justify-between rounded-md px-3 text-sm",
                    fieldBorderClass,
                    !classTriggerLabel && "text-muted-foreground",
                    !classOptions.length && "cursor-not-allowed opacity-50",
                  )}
                >
                  <span className={cn("truncate", !classTriggerLabel && "text-muted-foreground")}>
                    {!classOptions.length
                      ? "No classes assigned"
                      : classTriggerLabel || "Select class"}
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                className="w-max min-w-[var(--radix-popover-trigger-width)] max-w-[min(28rem,calc(100vw-2rem))] p-1"
              >
                <p className="px-2 py-1.5 text-[11px] text-muted-foreground">
                  Select multiple sections of the same grade only
                </p>
                <div className="max-h-52 space-y-0.5 overflow-y-auto">
                  {classOptions.map((option) => {
                    const checked = isClassChecked(option);
                    const enabled = isClassEnabled(option);
                    const label = classOptionLabel(option.grade, option.section, option.curriculum);
                    return (
                      <label
                        key={option.key}
                        className={cn(
                          "flex cursor-pointer items-start gap-2 rounded-sm px-2 py-1.5 text-sm",
                          !enabled && !checked && "cursor-not-allowed opacity-45",
                          checked && "bg-accent",
                        )}
                        title={
                          !enabled && !checked
                            ? "Only sections of the same grade can be selected together"
                            : label
                        }
                      >
                        <Checkbox
                          className="mt-0.5 h-3.5 w-3.5 shrink-0"
                          checked={checked}
                          disabled={!enabled && !checked}
                          onCheckedChange={(c) => toggleClass(option, c === true)}
                        />
                        <span className="whitespace-normal break-words leading-snug">{label}</span>
                      </label>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Subject</Label>
            <Select
              value={subjectSelectValue}
              onValueChange={handleSubjectChange}
              disabled={!values.grade || !curriculumValue || loadingSubjects}
            >
              <SelectTrigger className={cn("h-9 text-sm", fieldBorderClass)}>
                <SelectValue
                  placeholder={
                    loadingSubjects
                      ? "Loading subjects..."
                      : !values.grade
                        ? "Select class first"
                        : subjects.length
                          ? "Select subject"
                          : "No tagged subjects"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((subject) => (
                  <SelectItem key={subject.id} value={subject.subject_name}>
                    {subject.subject_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Chapter</Label>
            <Select
              value={chapterSelectValue}
              onValueChange={handleChapterChange}
              disabled={!values.subject || !chapterOptions.length}
            >
              <SelectTrigger className={cn("h-9 text-sm", fieldBorderClass)}>
                <SelectValue placeholder={values.subject ? "Select chapter" : "Select subject first"} />
              </SelectTrigger>
              <SelectContent>
                {chapterOptions.map((chapter) => {
                  const label = chapter.chapter ?? chapter.file_name;
                  return (
                    <SelectItem key={chapter.id} value={chapter.id}>
                      {label}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Duration</Label>
            <Select
              value={values.duration || undefined}
              onValueChange={(duration) => onChange({ ...values, duration })}
            >
              <SelectTrigger className={cn("h-9 text-sm", fieldBorderClass)}>
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="45">45 minutes</SelectItem>
                <SelectItem value="60">60 minutes</SelectItem>
                <SelectItem value="90">90 minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="shrink-0 space-y-1">
          <Label className="text-xs text-muted-foreground">
            Topics for today{" "}
            <span className="font-normal">(select 1 or more — optional)</span>
          </Label>
          {!values.chapterId ? (
            <p className="rounded-md border border-dashed border-border/70 px-2 py-2 text-xs text-muted-foreground">
              Select a chapter to load topics from the textbook.
            </p>
          ) : topicsQuery.isLoading ? (
            <p className="rounded-md border border-border/60 px-2 py-2 text-xs text-muted-foreground">
              Loading topics…
            </p>
          ) : chapterTopics.length > 0 ? (
            <div className="max-h-28 space-y-1 overflow-y-auto rounded-md border border-border/60 bg-muted/10 p-2">
              {chapterTopics.map((topic) => {
                const checked = values.topics.includes(topic.title);
                const disabled = !checked && selectedCount >= MAX_TOPICS;
                return (
                  <label
                    key={topic.key}
                    className={cn(
                      "flex cursor-pointer items-start gap-1.5 rounded px-1 py-0.5 text-xs leading-snug",
                      disabled && "cursor-not-allowed opacity-50",
                    )}
                  >
                    <Checkbox
                      className="mt-0.5 h-3.5 w-3.5"
                      checked={checked}
                      disabled={disabled}
                      onCheckedChange={(c) => toggleTopic(topic.title, c === true)}
                    />
                    <span>{topic.title}</span>
                  </label>
                );
              })}
            </div>
          ) : (
            <p className="rounded-md border border-dashed border-border/70 px-2 py-2 text-xs text-muted-foreground">
              No topic headings found for this chapter. Add topics below, or leave empty to plan the
              whole chapter.
            </p>
          )}
          <Input
            value={values.customTopics}
            onChange={(event) => onChange({ ...values, customTopics: event.target.value })}
            placeholder="Or type topics (comma-separated)"
            className={cn("h-9 text-sm", fieldBorderClass)}
            disabled={!values.chapterId}
          />
        </div>

        <div className="shrink-0 space-y-1">
          <Label className="text-xs text-muted-foreground">Learning Objectives</Label>
          <Textarea
            value={values.learningObjectives}
            onChange={(event) =>
              onChange({ ...values, learningObjectives: event.target.value })
            }
            rows={3}
            placeholder="Enter learning objectives..."
            className={cn("min-h-[72px] resize-none py-2 text-sm leading-snug", fieldBorderClass)}
          />
        </div>

        <div className="shrink-0 space-y-1">
          <Label className="text-xs font-medium text-foreground">
            What do you want AI to prepare? (Select all that apply)
          </Label>
          <div className="grid shrink-0 grid-cols-2 gap-1.5">
            {PREPARE_OPTIONS.map((option) => (
              <label
                key={option.id}
                className="flex cursor-pointer items-center gap-1.5 rounded-md border border-border/60 bg-muted/20 px-2 py-1.5 text-xs leading-tight"
              >
                <Checkbox
                  className="h-3.5 w-3.5"
                  checked={values.prepareOptions[option.id]}
                  onCheckedChange={(checked) => toggleOption(option.id, checked === true)}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {values.prepareOptions["ppt-outline"] ? (
          <div className="shrink-0 space-y-2">
            <Label className="text-xs text-muted-foreground">PPT template</Label>
            <div className="grid grid-cols-2 gap-1.5">
              {(pptThemesQuery.data?.themes ?? FALLBACK_PPT_THEMES).map((theme) => {
                const selected = (values.pptTemplate || "clean_academic") === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => onChange({ ...values, pptTemplate: theme.id })}
                    className={cn(
                      "rounded-md border px-2 py-1.5 text-left transition-colors",
                      selected
                        ? "border-primary bg-primary/5 ring-1 ring-primary/40"
                        : "border-border/70 bg-muted/10 hover:border-border",
                    )}
                  >
                    <div className="mb-1 flex gap-1">
                      <span
                        className="h-2.5 w-2.5 rounded-sm"
                        style={{ background: theme.primary || "#1e40af" }}
                      />
                      <span
                        className="h-2.5 w-2.5 rounded-sm"
                        style={{ background: theme.accent || "#0ea5e9" }}
                      />
                      <span
                        className="h-2.5 w-4 rounded-sm border border-border/50"
                        style={{ background: theme.bg || "#f8fafc" }}
                      />
                    </div>
                    <div className="text-[11px] font-medium leading-tight text-foreground">
                      {theme.label}
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {(pptThemesQuery.data?.themes ?? FALLBACK_PPT_THEMES).find(
                (t) => t.id === (values.pptTemplate || "clean_academic"),
              )?.description ?? ""}
            </p>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Slide count</Label>
              <Select
                value={values.pptSlideCount || "12"}
                onValueChange={(pptSlideCount) =>
                  onChange({
                    ...values,
                    pptSlideCount: pptSlideCount as "8" | "12" | "16",
                  })
                }
              >
                <SelectTrigger className={cn("h-9 text-sm", fieldBorderClass)}>
                  <SelectValue placeholder="Select slide count" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="8">About 8 slides</SelectItem>
                  <SelectItem value="12">About 12 slides</SelectItem>
                  <SelectItem value="16">About 16 slides</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : null}

        <Button
          className="mt-1 h-9 shrink-0 gap-2 bg-primary"
          onClick={onGenerate}
          disabled={isGenerating}
        >
          <Sparkles className="h-4 w-4" />
          {isGenerating ? "Generating..." : "Generate Lesson Plan"}
        </Button>
      </div>
    </div>
  );
}
