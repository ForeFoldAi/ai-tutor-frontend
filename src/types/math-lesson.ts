export interface SliderSpec {
  id: string;
  label: string;
  min?: number;
  max?: number;
  step?: number;
  default?: number;
  unit?: string;
}

export interface ButtonSpec {
  id: string;
  label: string;
  action?: string;
}

export interface DraggableObjectSpec {
  id: string;
  label: string;
  type?: string;
  initialX?: number;
  initialY?: number;
  color?: string;
}

export interface InteractiveObjectSpec {
  id: string;
  label: string;
  type?: string;
  properties?: Record<string, unknown>;
}

export interface AnimationSpec {
  id: string;
  trigger?: string;
  description?: string;
  duration?: number;
}

export interface LiveCalculationSpec {
  id: string;
  label: string;
  formula: string;
  unit?: string;
}

export interface LabelSpec {
  id: string;
  text: string;
  x?: number;
  y?: number;
}

export interface ColorSpec {
  primary?: string;
  secondary?: string;
  accent?: string;
  background?: string;
  text?: string;
}

export interface StudentInteractionSpec {
  id: string;
  type: string;
  description: string;
  expectedObservation?: string;
}

export interface VisualizationSpec {
  visualizationType: string;
  title: string;
  description?: string;
  interactiveObjects?: InteractiveObjectSpec[];
  draggableObjects?: DraggableObjectSpec[];
  sliders?: SliderSpec[];
  buttons?: ButtonSpec[];
  animations?: AnimationSpec[];
  liveCalculations?: LiveCalculationSpec[];
  labels?: LabelSpec[];
  colors?: ColorSpec;
  studentInteractions?: StudentInteractionSpec[];
}

export interface PracticeModeSpec {
  easy?: string;
  medium?: string;
  hard?: string;
  challenge?: string;
}

export interface AssessmentQuestion {
  question: string;
  type?: string;
}

export interface MathLesson {
  conceptName: string;
  classLevel?: string;
  learningObjective?: string;
  conceptExplanation?: string;
  visualization: VisualizationSpec;
  guidedExploration?: string[];
  practiceMode?: PracticeModeSpec;
  commonMistakes?: string[];
  aiHints?: string[][];
  assessment?: AssessmentQuestion[];
}

const MATH_LESSON_FENCE_RE =
  /```(?:math-lesson|json:math-lesson|math_lesson)\s*\n([\s\S]*?)```/i;

const INCOMPLETE_MATH_LESSON_RE =
  /\n?```(?:math-lesson|json:math-lesson|math_lesson)\s*\n[\s\S]*$/i;

const MARKDOWN_FENCE_RE = /```markdown\s*\n([\s\S]*?)```/gi;

/** Strip markdown fences and incomplete math-lesson blocks from displayed tutor text. */
export function cleanTutorDisplayContent(content: string): string {
  let text = content ?? "";
  text = text.replace(MARKDOWN_FENCE_RE, "$1");
  text = text.replace(INCOMPLETE_MATH_LESSON_RE, "");
  return text.replace(/\n{3,}/g, "\n\n").trim();
}

export function stripMathLessonBlock(content: string): {
  cleanContent: string;
  lesson: MathLesson | null;
} {
  const match = content.match(MATH_LESSON_FENCE_RE);
  if (!match) {
    return { cleanContent: cleanTutorDisplayContent(content), lesson: null };
  }
  try {
    const lesson = JSON.parse(match[1].trim()) as MathLesson;
    const stripped =
      content.slice(0, match.index) + content.slice(match.index! + match[0].length);
    return { cleanContent: cleanTutorDisplayContent(stripped), lesson };
  } catch {
    const stripped =
      content.slice(0, match.index) + content.slice(match.index! + match[0].length);
    return { cleanContent: cleanTutorDisplayContent(stripped), lesson: null };
  }
}
