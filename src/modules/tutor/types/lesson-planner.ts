export type LessonPlanTab =
  | "lesson-plan"
  | "teaching-notes"
  | "examples"
  | "worksheet"
  | "quiz"
  | "homework"
  | "ppt-outline";

export type AiPrepareOption =
  | "complete-lesson-plan"
  | "teaching-notes"
  | "step-by-step"
  | "real-life-examples"
  | "practice-worksheet"
  | "quiz-questions"
  | "homework"
  | "ppt-outline"
  | "student-doubt-questions"
  | "remedial-plan";

export interface LessonPlanFormValues {
  subject: string;
  grade: string;
  /** Selected sections for the same grade only (e.g. A + B of Class 9). */
  sections: string[];
  chapter: string;
  chapterId?: string;
  board?: string;
  /** Selected chapter topics for this lesson (1+); empty = whole chapter. */
  topics: string[];
  /** Free-text topics when headings are missing or teacher adds extras. */
  customTopics: string;
  /** PPT visual theme when PPT Outline is selected. */
  pptTemplate: string;
  /** Target slide count when PPT Outline is selected (8 / 12 / 16). */
  pptSlideCount: "8" | "12" | "16";
  duration: string;
  learningObjectives: string;
  prepareOptions: Record<AiPrepareOption, boolean>;
}

export interface LessonPhase {
  title: string;
  duration: string;
  description: string;
}

export interface TeachingNotesContent {
  overview: string;
  keyPoints: string[];
  materials: string[];
  tips: string[];
}

export interface LessonExample {
  title: string;
  scenario: string;
  explanation: string;
}

export interface WorksheetQuestion {
  number: number;
  question: string;
  type: "short" | "mcq";
  options?: string[];
}

export interface QuizQuestion {
  number: number;
  question: string;
  type: "mcq" | "short";
  options?: string[];
}

export interface HomeworkTask {
  title: string;
  description: string;
  estimatedMinutes?: number;
}

export interface PptSlide {
  number: number;
  title: string;
  bullets: string[];
  layout?: string;
  sideHeading?: string;
  icon?: string;
  callout?: string;
  rightBullets?: string[];
}

export interface SavedLessonPlan {
  id: string;
  title: string;
  subject: string;
  grade: string;
  chapter: string;
  lastUpdated: string;
}

export interface GeneratedLessonPlan {
  lessonPlanMarkdown?: string;
  teachingNotesMarkdown?: string;
  examplesMarkdown?: string;
  worksheetMarkdown?: string;
  quizMarkdown?: string;
  homeworkMarkdown?: string;
  pptOutlineMarkdown?: string;
  pptTemplateId?: string;
  phases: LessonPhase[];
  teachingNotes?: TeachingNotesContent;
  examples?: LessonExample[];
  worksheet?: WorksheetQuestion[];
  quiz?: QuizQuestion[];
  homework?: HomeworkTask[];
  pptOutline?: PptSlide[];
}
