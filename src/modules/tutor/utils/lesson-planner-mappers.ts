import type { LessonArtifactApi, LessonPlanApi, LessonPlanSummaryApi } from "@/api/lesson-planner";
import type {
  GeneratedLessonPlan,
  HomeworkTask,
  LessonExample,
  LessonPhase,
  PptSlide,
  QuizQuestion,
  SavedLessonPlan,
  TeachingNotesContent,
  WorksheetQuestion,
} from "@/modules/tutor/types/lesson-planner";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** API/LLM may return options as strings or match-pair objects — normalize for UI. */
export function normalizeQuestionOptions(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw) || !raw.length) return undefined;
  return raw.map((opt) => {
    if (typeof opt === "string") return opt;
    if (opt && typeof opt === "object") {
      const o = opt as Record<string, unknown>;
      if ("left" in o && "right" in o) return `${String(o.left)} → ${String(o.right)}`;
      const parts = Object.values(o).filter((v) => v != null && String(v).trim()).map(String);
      return parts.length ? parts.join(" · ") : JSON.stringify(o);
    }
    return String(opt);
  });
}

function extractArtifactMarkdown(content: Record<string, unknown>): string | undefined {
  if (content.format === "markdown" && typeof content.markdown === "string" && content.markdown.trim()) {
    return content.markdown;
  }
  return undefined;
}

function mapLessonPlan(content: Record<string, unknown>): LessonPhase[] {
  const activities = (content.activities as Array<Record<string, unknown>>) || [];
  if (activities.length) {
    return activities.map((act) => ({
      title: String(act.title ?? "Activity"),
      duration: `${act.duration_minutes ?? "?"} min`,
      description: String(act.description ?? ""),
    }));
  }
  return [
    {
      title: String(content.title ?? "Lesson Plan"),
      duration: `${content.duration ?? 45} min`,
      description: (content.objectives as string[])?.join("; ") ?? "",
    },
  ];
}

function mapTeachingNotes(content: Record<string, unknown>): TeachingNotesContent {
  return {
    overview: String(content.introduction_script || content.teacher_explanation || ""),
    keyPoints: (content.questions_to_ask as string[]) || (content.blackboard_flow as string[]) || [],
    materials: (content.real_life_connections as string[]) || [],
    tips: (content.common_mistakes as string[]) || [],
  };
}

function mapExamples(content: Record<string, unknown>): LessonExample[] {
  const buckets = ["easy", "medium", "hard", "real_world", "visual_examples"] as const;
  const out: LessonExample[] = [];
  for (const bucket of buckets) {
    for (const item of (content[bucket] as Array<Record<string, unknown>>) || []) {
      out.push({
        title: String(item.title ?? bucket),
        scenario: String(item.scenario ?? item.description ?? ""),
        explanation: String(item.explanation ?? ""),
      });
    }
  }
  return out;
}

function flattenQuestions(
  content: Record<string, unknown>,
  sections: string[],
): Array<{ question: string; type?: string; options?: string[] }> {
  const out: Array<{ question: string; type?: string; options?: string[] }> = [];
  for (const section of sections) {
    for (const item of (content[section] as Array<Record<string, unknown>>) || []) {
      if (section === "match_following" && (item.left != null || item.right != null)) {
        out.push({
          question: `Match: ${String(item.left ?? "?")} → ${String(item.right ?? "?")}`,
          type: "short",
        });
        continue;
      }
      const options = normalizeQuestionOptions(item.options);
      out.push({
        question: String(item.question ?? item.statement ?? ""),
        type: options?.length ? "mcq" : "short",
        options,
      });
    }
  }
  return out;
}

function mapWorksheet(content: Record<string, unknown>): WorksheetQuestion[] {
  return flattenQuestions(content, [
    "fill_blanks",
    "true_false",
    "match_following",
    "short_answer",
    "long_answer",
    "application_questions",
  ]).map((q, i) => ({
    number: i + 1,
    question: q.question,
    type: q.type === "mcq" ? "mcq" : "short",
    options: q.options,
  }));
}

function mapQuiz(content: Record<string, unknown>): QuizQuestion[] {
  const mcq = ((content.mcq as Array<Record<string, unknown>>) || []).map((q, i) => ({
    number: i + 1,
    question: String(q.question ?? ""),
    type: "mcq" as const,
    options: normalizeQuestionOptions(q.options) ?? [],
  }));
  const short = ((content.short_answer as Array<Record<string, unknown>>) || []).map((q, i) => ({
    number: mcq.length + i + 1,
    question: String(q.question ?? ""),
    type: "short" as const,
  }));
  return [...mcq, ...short];
}

function mapHomework(content: Record<string, unknown>): HomeworkTask[] {
  const sections = [
    "practice_questions",
    "observation_tasks",
    "project_work",
    "reading_assignment",
    "revision_tasks",
  ] as const;
  const out: HomeworkTask[] = [];
  for (const section of sections) {
    for (const item of (content[section] as Array<Record<string, unknown>>) || []) {
      out.push({
        title: String(item.title ?? item.task ?? section.replace("_", " ")),
        description: String(item.description ?? item.text ?? item.question ?? ""),
        estimatedMinutes: item.estimated_minutes as number | undefined,
      });
    }
  }
  return out;
}

function mapPpt(content: Record<string, unknown>): PptSlide[] {
  return ((content.slides as Array<Record<string, unknown>>) || []).map((slide, i) => ({
    number: Number(slide.number ?? i + 1),
    title: String(slide.title ?? `Slide ${i + 1}`),
    bullets: (slide.bullets as string[]) || [],
    layout: slide.layout ? String(slide.layout) : undefined,
    sideHeading: slide.side_heading ? String(slide.side_heading) : undefined,
    icon: slide.icon ? String(slide.icon) : undefined,
    callout: slide.callout ? String(slide.callout) : undefined,
    rightBullets: Array.isArray(slide.right_bullets)
      ? (slide.right_bullets as string[])
      : undefined,
  }));
}

export function mapApiPlanToGenerated(plan: LessonPlanApi): GeneratedLessonPlan {
  const byType = Object.fromEntries(
    (plan.artifacts || []).map((a) => [a.artifact_type, a.content]),
  ) as Record<string, Record<string, unknown> | null>;

  const lesson = asRecord(byType.lesson_plan);
  const lessonMarkdown = lesson ? extractArtifactMarkdown(lesson) : undefined;
  const notes = asRecord(byType.teaching_notes);
  const notesMarkdown = notes ? extractArtifactMarkdown(notes) : undefined;
  const examples = asRecord(byType.examples);
  const examplesMarkdown = examples ? extractArtifactMarkdown(examples) : undefined;
  const worksheet = asRecord(byType.worksheet);
  const worksheetMarkdown = worksheet ? extractArtifactMarkdown(worksheet) : undefined;
  const quiz = asRecord(byType.quiz);
  const quizMarkdown = quiz ? extractArtifactMarkdown(quiz) : undefined;
  const homework = asRecord(byType.homework);
  const homeworkMarkdown = homework ? extractArtifactMarkdown(homework) : undefined;
  const ppt = asRecord(byType.ppt_outline);
  const pptMarkdown = ppt ? extractArtifactMarkdown(ppt) : undefined;

  return {
    lessonPlanMarkdown: lessonMarkdown,
    teachingNotesMarkdown: notesMarkdown,
    phases: lesson && !lessonMarkdown ? mapLessonPlan(lesson) : [],
    teachingNotes: notes && !notesMarkdown ? mapTeachingNotes(notes) : undefined,
    examplesMarkdown,
    examples: examples && !examplesMarkdown ? mapExamples(examples) : undefined,
    worksheetMarkdown,
    worksheet: worksheet && !worksheetMarkdown ? mapWorksheet(worksheet) : undefined,
    quizMarkdown,
    quiz: quiz && !quizMarkdown ? mapQuiz(quiz) : undefined,
    homeworkMarkdown,
    homework: homework && !homeworkMarkdown ? mapHomework(homework) : undefined,
    pptOutlineMarkdown: pptMarkdown,
    pptOutline: ppt ? mapPpt(ppt) : undefined,
    pptTemplateId: ppt?.template_id ? String(ppt.template_id) : undefined,
  };
}

export function mapWsOutputsToGenerated(
  outputs: Record<string, Record<string, unknown>>,
  base?: GeneratedLessonPlan | null,
): GeneratedLessonPlan {
  const fakePlan: LessonPlanApi = {
    id: "ws",
    title: "",
    grade: "",
    subject: "",
    board: null,
    chapter_id: null,
    chapter_name: "",
    duration_minutes: 45,
    learning_objectives: "",
    status: "generating",
    plan_metadata: null,
    artifacts: Object.entries(outputs).map(([artifact_type, content]) => ({
      id: artifact_type,
      artifact_type: artifact_type as LessonArtifactApi["artifact_type"],
      content,
      status: "completed",
      version_number: 1,
      updated_at: new Date().toISOString(),
    })),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const mapped = mapApiPlanToGenerated(fakePlan);
  return {
    lessonPlanMarkdown: mapped.lessonPlanMarkdown ?? base?.lessonPlanMarkdown,
    teachingNotesMarkdown: mapped.teachingNotesMarkdown ?? base?.teachingNotesMarkdown,
    examplesMarkdown: mapped.examplesMarkdown ?? base?.examplesMarkdown,
    worksheetMarkdown: mapped.worksheetMarkdown ?? base?.worksheetMarkdown,
    quizMarkdown: mapped.quizMarkdown ?? base?.quizMarkdown,
    homeworkMarkdown: mapped.homeworkMarkdown ?? base?.homeworkMarkdown,
    pptOutlineMarkdown: mapped.pptOutlineMarkdown ?? base?.pptOutlineMarkdown,
    pptTemplateId: mapped.pptTemplateId ?? base?.pptTemplateId,
    phases: mapped.phases.length ? mapped.phases : base?.phases ?? [],
    teachingNotes: mapped.teachingNotes ?? base?.teachingNotes,
    examples: mapped.examples ?? base?.examples,
    worksheet: mapped.worksheet ?? base?.worksheet,
    quiz: mapped.quiz ?? base?.quiz,
    homework: mapped.homework ?? base?.homework,
    pptOutline: mapped.pptOutline ?? base?.pptOutline,
  };
}

export function mapSummaryToSaved(plan: LessonPlanSummaryApi): SavedLessonPlan {
  return {
    id: String(plan.id),
    title: plan.title,
    subject: plan.subject,
    grade: plan.grade.replace(/^CLASS_/, "Grade "),
    chapter: plan.chapter_name,
    lastUpdated: new Date(plan.updated_at).toLocaleString(),
  };
}

export function planApiToSaveArtifacts(plan: LessonPlanApi): Record<string, Record<string, unknown>> {
  return Object.fromEntries(
    (plan.artifacts || [])
      .filter((a) => a.content)
      .map((a) => [a.artifact_type, a.content as Record<string, unknown>]),
  );
}

// ponytail: runnable check — fails if match-pair options regress
if (import.meta.env?.DEV) {
  const pairs = normalizeQuestionOptions([{ left: "A", right: "1" }]);
  console.assert(pairs?.[0] === "A → 1", "normalizeQuestionOptions match pairs");
}
