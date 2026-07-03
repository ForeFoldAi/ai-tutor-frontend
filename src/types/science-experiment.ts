/** Interactive science experiment types — three synchronized views model. */

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

export interface LiveCalculationSpec {
  id: string;
  label: string;
  formula: string;
  unit?: string;
}

export interface ExperimentViewSpec {
  title?: string;
  description?: string;
  narration?: string;
  equation?: string;
  labels?: string[];
}

export interface ThreeViewSpec {
  realWorld?: ExperimentViewSpec;
  microscopic?: ExperimentViewSpec;
  scientific?: ExperimentViewSpec;
}

export interface ExperimentSpec {
  experimentType: string;
  title: string;
  description?: string;
  gradeTier?: string;
  threeViews?: ThreeViewSpec;
  sliders?: SliderSpec[];
  buttons?: ButtonSpec[];
  liveCalculations?: LiveCalculationSpec[];
  colors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
    background?: string;
    text?: string;
  };
  safetyNotes?: string[];
  procedure?: string[];
  hypothesisPrompt?: string;
}

export interface ScienceExperiment {
  conceptName: string;
  classLevel?: string;
  learningObjective?: string;
  conceptExplanation?: string;
  experiment: ExperimentSpec;
  guidedExploration?: string[];
}

const SCIENCE_EXPERIMENT_FENCE_RE =
  /```(?:science-experiment|json:science-experiment|science_experiment)\s*\n([\s\S]*?)```/i;

const INCOMPLETE_SCIENCE_EXPERIMENT_RE =
  /\n?```(?:science-experiment|json:science-experiment|science_experiment)\s*\n[\s\S]*$/i;

export function cleanTutorDisplayContent(content: string): string {
  let text = content ?? "";
  text = text.replace(/```markdown\s*\n([\s\S]*?)```/gi, "$1");
  text = text.replace(INCOMPLETE_SCIENCE_EXPERIMENT_RE, "");
  return text.replace(/\n{3,}/g, "\n\n").trim();
}

export function stripScienceExperimentBlock(content: string): {
  cleanContent: string;
  experiment: ScienceExperiment | null;
} {
  const match = content.match(SCIENCE_EXPERIMENT_FENCE_RE);
  if (!match) {
    return { cleanContent: cleanTutorDisplayContent(content), experiment: null };
  }
  try {
    const experiment = JSON.parse(match[1].trim()) as ScienceExperiment;
    const cleanContent = cleanTutorDisplayContent(
      (content.slice(0, match.index) + content.slice(match.index! + match[0].length)).trim(),
    );
    return { cleanContent, experiment };
  } catch {
    return { cleanContent: cleanTutorDisplayContent(content), experiment: null };
  }
}

export type ExperimentViewMode = "realWorld" | "microscopic" | "scientific";

export const EXPERIMENT_VIEW_LABELS: Record<ExperimentViewMode, string> = {
  realWorld: "Real World",
  microscopic: "Microscopic",
  scientific: "Scientific",
};

export const GRADE_TIER_LABELS: Record<string, string> = {
  elementary: "Classes 1–3",
  primary: "Classes 4–5",
  middle: "Classes 6–8",
  advanced: "Classes 9–10",
};
