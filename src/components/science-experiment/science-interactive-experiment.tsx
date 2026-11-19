import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import type { ExperimentSpec, ExperimentViewMode } from "@/types/science-experiment";
import { EXPERIMENT_VIEW_LABELS, canonicalizeExperimentType } from "@/types/science-experiment";
import { buildVariableMap, evaluateFormula, formatCalcValue } from "@/components/math-lesson/formula-utils";
import { PALETTES, SIGNATURE } from "@/components/math-lesson/design-tokens";
import { subjectAccent } from "./science-tokens";
import { LabChrome } from "./lab-chrome";
import { SCIENCE_LAB_RENDERERS } from "./labs/science-labs";
import {
  computeMotion,
  defaultSliderValues,
  deriveObservation,
  diseaseTransmissionMode,
  formatMotionValue,
} from "./experiment-utils";

const CANVAS = PALETTES["technical-9to10"];
const DISEASE_MODE_LABELS = ["Air / cough", "Touch", "Insect bite"] as const;

/** ponytail: hide developer-ish view blurbs that don't help students */
function studentViewBlurb(text?: string): string | undefined {
  if (!text?.trim()) return undefined;
  if (/node diagram|conceptual pathways|non-graphic|illustrative/i.test(text)) return undefined;
  return text;
}

function isPlayAction(action?: string) {
  return /^(animate|play|start|run)$/i.test((action ?? "").trim());
}

function isResetAction(action?: string) {
  return /^(reset|stop|clear)$/i.test((action ?? "").trim());
}

interface Props {
  spec: ExperimentSpec;
}

export function ScienceInteractiveExperiment({ spec }: Props) {
  const [values, setValues] = useState<Record<string, number>>(() => defaultSliderValues(spec));
  const [view, setView] = useState<ExperimentViewMode>("realWorld");
  const [animating, setAnimating] = useState(false);
  const [observation, setObservation] = useState("");
  const animTimer = useRef<number | null>(null);

  const canonType = canonicalizeExperimentType(spec.experimentType);
  const motion = useMemo(() => computeMotion(spec.experimentType, values), [spec.experimentType, values]);
  const accent = subjectAccent(spec.subject);

  // Remounting a chat lab can reuse this component — resync when type/sliders change (not every render).
  const sliderKey = useMemo(
    () => JSON.stringify((spec.sliders ?? []).map((s) => [s.id, s.default, s.min, s.max, s.step])),
    [spec.sliders],
  );
  useEffect(() => {
    setValues(defaultSliderValues(spec));
    setAnimating(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when type/slider shape changes
  }, [spec.experimentType, sliderKey]);

  const onChange = useCallback((id: string, v: number) => {
    setValues((prev) => ({ ...prev, [id]: v }));
  }, []);

  const onReset = useCallback(() => {
    if (animTimer.current != null) window.clearTimeout(animTimer.current);
    setValues(defaultSliderValues(spec));
    setAnimating(false);
  }, [spec]);

  const onAnimate = useCallback(() => {
    setView("realWorld");
    setAnimating(false);
    // Force a fresh SMIL/CSS cycle on the next paint
    window.requestAnimationFrame(() => {
      setAnimating(true);
      if (animTimer.current != null) window.clearTimeout(animTimer.current);
      animTimer.current = window.setTimeout(() => setAnimating(false), 4000);
    });
  }, []);

  useEffect(() => () => {
    if (animTimer.current != null) window.clearTimeout(animTimer.current);
  }, []);

  const derivedObs = useMemo(
    () => deriveObservation(spec.experimentType, view, values, spec),
    [spec, view, values],
  );

  useEffect(() => {
    setObservation(derivedObs);
  }, [derivedObs]);

  const viewSpec = spec.threeViews?.[view];
  const vars = { ...buildVariableMap(values, {}), ...motion.values };
  const calcs = spec.liveCalculations ?? [];
  const Lab = SCIENCE_LAB_RENDERERS[canonType] ?? SCIENCE_LAB_RENDERERS["concept-explorer"];

  const whyText = view === "scientific" ? studentViewBlurb(viewSpec?.description ?? viewSpec?.narration ?? spec.explanation) : undefined;
  const equation = view === "scientific" ? viewSpec?.equation ?? spec.threeViews?.scientific?.equation : undefined;
  const viewTitle = studentViewBlurb(viewSpec?.title);
  const viewDesc = studentViewBlurb(viewSpec?.description ?? viewSpec?.narration);

  const motionEntries = Object.entries(motion.values).filter(
    ([k]) => !/^(r0|infection_rate|mode|chance_of_spread)$/i.test(k),
  );

  const isDisease = canonType === "disease-transmission-simulator";
  const modeSliderId =
    (spec.sliders ?? []).find((s) => /mode|transmission|exposure/i.test(s.id))?.id ?? "mode";
  const diseaseMode = isDisease ? diseaseTransmissionMode(values) : 0;
  const diseaseChance = Math.round(motion.values.chance_of_spread ?? 0);

  return (
    <div className="space-y-3" data-testid="science-interactive-experiment">
      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(EXPERIMENT_VIEW_LABELS) as ExperimentViewMode[]).map((mode) => (
          <Button
            key={mode}
            type="button"
            size="sm"
            variant={view === mode ? "default" : "ghost"}
            className={cn("h-8 text-xs", view === mode && "text-white")}
            style={view === mode ? { background: accent, borderColor: accent } : undefined}
            onClick={() => setView(mode)}
          >
            {EXPERIMENT_VIEW_LABELS[mode]}
          </Button>
        ))}
      </div>

      <LabChrome
        title={spec.title}
        learningObjective={spec.aim ?? spec.description}
        observation={observation}
        why={whyText}
        equation={equation}
        subject={spec.subject}
      >
        <Lab
          experimentType={canonType}
          view={view}
          values={values}
          animating={animating}
          colorHint={motion.colorHint}
          onObservation={setObservation}
        />
      </LabChrome>

      {isDisease ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <p style={{ color: CANVAS.text }}>
            Chance of spread{" "}
            <span className="font-semibold tabular-nums" style={{ color: accent }}>
              {diseaseChance}%
            </span>
          </p>
          <p style={{ color: CANVAS.muted }}>Stop it with clean hands or a vaccine</p>
        </div>
      ) : null}

      {(viewTitle || viewDesc) ? (
        <p className="text-sm leading-relaxed" style={{ color: CANVAS.muted }}>
          {viewTitle ? <span className="font-medium" style={{ color: CANVAS.text }}>{viewTitle}. </span> : null}
          {viewDesc}
        </p>
      ) : null}

      {isDisease ? (
        <div className="space-y-2">
          <p className="text-xs font-medium" style={{ color: CANVAS.text }}>
            How they spread
          </p>
          <div className="grid grid-cols-3 gap-2">
            {DISEASE_MODE_LABELS.map((label, i) => (
              <Button
                key={label}
                type="button"
                size="sm"
                variant={diseaseMode === i ? "default" : "outline"}
                className={cn("h-9 text-xs", diseaseMode === i && "text-white")}
                style={
                  diseaseMode === i
                    ? { background: accent, borderColor: accent }
                    : { borderColor: CANVAS.gridLine }
                }
                onClick={() => onChange(modeSliderId, i)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      ) : (spec.sliders ?? []).length > 0 ? (
        <div className="space-y-3">
          {spec.sliders!.map((s) => {
            const raw = Number(values[s.id] ?? s.default ?? s.min ?? 0);
            const min = Number(s.min ?? 0);
            const max = Number(s.max ?? 100);
            const step = Number(s.step ?? 1) || 1;
            return (
              <div key={s.id} className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium" style={{ color: CANVAS.text }}>
                  <span>{s.label}</span>
                  <span className="tabular-nums font-semibold" style={{ color: accent }}>
                    {raw}
                    {s.unit ? ` ${s.unit}` : ""}
                  </span>
                </div>
                <Slider
                  value={[Number.isFinite(raw) ? raw : min]}
                  min={Number.isFinite(min) ? min : 0}
                  max={Number.isFinite(max) && max > min ? max : min + 100}
                  step={step}
                  onValueChange={([v]) => onChange(s.id, v)}
                  className="cursor-pointer py-3 touch-manipulation"
                />
              </div>
            );
          })}
        </div>
      ) : null}

      {calcs.length > 0 ? (
        <div className="flex flex-wrap gap-3 text-sm">
          {calcs.map((c) => (
            <span key={c.id} style={{ color: CANVAS.text }}>
              <span style={{ color: CANVAS.muted }}>{c.label}: </span>
              <span className="font-semibold tabular-nums">{formatCalcValue(evaluateFormula(c.formula, vars), c.unit)}</span>
            </span>
          ))}
        </div>
      ) : motionEntries.length > 0 ? (
        <div className="flex flex-wrap gap-3 text-sm">
          {motionEntries.map(([k, val]) => (
            <span key={k} style={{ color: CANVAS.text }}>
              <span className="capitalize" style={{ color: CANVAS.muted }}>{k.replace(/_/g, " ")}: </span>
              <span className="font-semibold tabular-nums">{formatMotionValue(val)}</span>
            </span>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {(spec.buttons ?? [
          { id: "play", label: "Play", action: "animate" },
          { id: "reset", label: "Reset", action: "reset" },
        ]).map((b) => {
          const play = isPlayAction(b.action) || (!b.action && /play|animate/i.test(b.label ?? b.id));
          const reset = isResetAction(b.action) || (!play && /reset/i.test(b.label ?? b.id));
          return (
            <Button
              key={b.id}
              type="button"
              size="sm"
              variant={play ? "default" : "outline"}
              className={cn("h-8 gap-1.5", play && "text-white")}
              style={play ? { background: SIGNATURE.orange, borderColor: SIGNATURE.orange } : undefined}
              onClick={() => {
                if (play) onAnimate();
                else if (reset) onReset();
              }}
            >
              {play ? <Play className="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />}
              {b.label}
            </Button>
          );
        })}
      </div>

      {spec.hypothesisPrompt ? (
        <p className="text-sm" style={{ color: CANVAS.muted }}>
          Try this: {spec.hypothesisPrompt}
        </p>
      ) : null}
    </div>
  );
}
