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

export interface ProcedureStepSpec {
  id: string;
  instruction: string;
  safetyNote?: string;
}

export interface ExperimentSpec {
  experimentType: string;
  title: string;
  description?: string;
  gradeTier?: string;
  subject?: "physics" | "chemistry" | "biology" | "evs" | string;
  kind?: "concept" | "experiment" | string;
  aim?: string;
  apparatus?: string[];
  safetyLevel?: string;
  procedureSteps?: ProcedureStepSpec[];
  expectedObservation?: string;
  explanation?: string;
  relatedVisualizationType?: string;
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
  practice?: Record<string, string>;
  hints?: string[][];
  assessment?: { question: string; answer?: string }[];
}

export interface ScienceExperiment {
  conceptName: string;
  classLevel?: string;
  learningObjective?: string;
  conceptExplanation?: string;
  subject?: string;
  experiment: ExperimentSpec;
  guidedExploration?: string[];
}

const TYPE_ALIASES: Record<string, string> = {
  "electricity-circuit-lab": "circuit-builder",
  "titration-lab": "acid-base-indicator-lab",
};

export const LEGACY_TO_CANONICAL: Record<string, string> = {
  photosynthesis: "plant-anatomy-lab",
  "plant-growth": "plant-anatomy-lab",
  "seed-germination": "life-cycle-animator",
  respiration: "human-body-system-3d",
  digestion: "human-body-system-3d",
  "blood-circulation": "human-body-system-3d",
  "human-organs": "human-body-system-3d",
  magnetism: "magnet-field-visualizer",
  electricity: "circuit-builder",
  "light-reflection": "light-optics-bench",
  refraction: "light-optics-bench",
  "acids-bases": "acid-base-indicator-lab",
  "chemical-reaction": "reaction-simulator",
  "states-of-matter": "states-of-matter-lab",
  "heat-transfer": "states-of-matter-lab",
  "water-cycle": "water-cycle-animator",
  sound: "sound-wave-lab",
  "force-motion": "force-pressure-lab",
  "solar-system": "solar-system-3d",
};

export function canonicalizeExperimentType(etype: string): string {
  const t = (etype || "").trim().toLowerCase();
  const aliased = TYPE_ALIASES[t] ?? t;
  return LEGACY_TO_CANONICAL[aliased] ?? aliased;
}

const SCIENCE_EXPERIMENT_FENCE_RE =
  /```(?:science-experiment|science-lesson|json:science-experiment|science_experiment)\s*\n([\s\S]*?)```/i;

const INCOMPLETE_SCIENCE_EXPERIMENT_RE =
  /\n?```(?:science-experiment|science-lesson|json:science-experiment|science_experiment)\s*\n[\s\S]*$/i;

export function cleanTutorDisplayContent(content: string): string {
  let text = content ?? "";
  text = text.replace(/```markdown\s*\n([\s\S]*?)```/gi, "$1");
  text = text.replace(INCOMPLETE_SCIENCE_EXPERIMENT_RE, "");
  text = text.replace(/```[\s\S]*$/, "");
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
  realWorld: "What you see",
  microscopic: "What's inside",
  scientific: "Why it happens",
};

export const GRADE_TIER_LABELS: Record<string, string> = {
  elementary: "Classes 1–3",
  primary: "Classes 4–5",
  middle: "Classes 6–8",
  advanced: "Classes 9–10",
};

export const SUBJECT_LABELS: Record<string, string> = {
  physics: "Physics",
  chemistry: "Chemistry",
  biology: "Biology",
  evs: "EVS",
};
