import type { GenerateLessonPlanPayload, LessonArtifactType } from "@/api/lesson-planner";
import type { AiPrepareOption, LessonPlanFormValues } from "@/modules/tutor/types/lesson-planner";

const ARTIFACT_BY_OPTION: Partial<Record<AiPrepareOption, LessonArtifactType>> = {
  "complete-lesson-plan": "lesson_plan",
  "teaching-notes": "teaching_notes",
  "step-by-step": "teaching_notes",
  "real-life-examples": "examples",
  "practice-worksheet": "worksheet",
  "quiz-questions": "quiz",
  homework: "homework",
  "ppt-outline": "ppt_outline",
};

const MAX_TOPICS = 8;

/** Merge checkbox topics + custom comma/newline list (deduped, capped). */
export function resolveSelectedTopics(values: LessonPlanFormValues): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of [...values.topics, ...values.customTopics.split(/[\n,;]+/)]) {
    const title = raw.trim();
    if (!title) continue;
    const key = title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(title);
    if (out.length >= MAX_TOPICS) break;
  }
  return out;
}

export function formValuesToGeneratePayload(values: LessonPlanFormValues): GenerateLessonPlanPayload {
  const requested = new Set<LessonArtifactType>();
  for (const [option, enabled] of Object.entries(values.prepareOptions)) {
    if (!enabled) continue;
    const artifact = ARTIFACT_BY_OPTION[option as AiPrepareOption];
    if (artifact) requested.add(artifact);
  }
  if (!requested.size) {
    requested.add("lesson_plan");
  }

  const duration = Number.parseInt(values.duration, 10);
  const topics = resolveSelectedTopics(values);
  const topicSuffix = topics.length ? ` — ${topics.join(", ")}` : "";
  const sections = values.sections.map((s) => s.trim()).filter(Boolean);

  return {
    grade: values.grade.startsWith("CLASS_") ? values.grade : `CLASS_${values.grade}`,
    subject: values.subject,
    chapter_id: values.chapterId ?? null,
    chapter_name: values.chapter,
    duration_minutes: Number.isFinite(duration) ? duration : 45,
    learning_objectives: values.learningObjectives,
    topics,
    sections,
    ppt_template: values.prepareOptions["ppt-outline"]
      ? values.pptTemplate || "clean_academic"
      : undefined,
    ppt_slide_count: values.prepareOptions["ppt-outline"]
      ? Number.parseInt(values.pptSlideCount || "12", 10)
      : undefined,
    board: values.board ?? "CBSE",
    title: values.chapter
      ? `${values.subject} — ${values.chapter}${topicSuffix}`
      : undefined,
    requested_artifacts: [...requested],
  };
}

export function uiArtifactsToSavePayload(
  artifacts: Record<string, Record<string, unknown>>,
): Record<string, Record<string, unknown>> {
  return artifacts;
}
