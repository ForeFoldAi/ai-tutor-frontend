import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { PALETTES, MOTION } from "@/components/math-lesson/design-tokens";
import { subjectAccent } from "./science-tokens";

const CANVAS = PALETTES["technical-9to10"];

interface LabChromeProps {
  title: string;
  learningObjective?: string;
  observation?: string;
  why?: string;
  equation?: string;
  subject?: string;
  children: React.ReactNode;
  className?: string;
}

export function LabChrome({
  title,
  learningObjective,
  observation,
  why,
  equation,
  subject,
  children,
  className,
}: LabChromeProps) {
  const accent = subjectAccent(subject);

  return (
    <div className={cn("overflow-hidden", className)}>
      <div className="space-y-1 mb-3">
        <h4 className="font-semibold text-[15px]" style={{ color: CANVAS.text }}>
          {title}
        </h4>
        {learningObjective ? (
          <p className="text-sm leading-relaxed" style={{ color: CANVAS.muted }}>
            {learningObjective}
          </p>
        ) : null}
        {observation ? (
          <AnimatePresence mode="wait">
            <motion.p
              key={observation}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={MOTION.dragSettle}
              className="text-sm leading-snug"
              style={{ color: accent }}
            >
              {observation}
            </motion.p>
          </AnimatePresence>
        ) : null}
      </div>

      <div
        className="rounded-xl min-h-[220px] relative overflow-hidden bg-white"
        style={{ border: `1px solid ${CANVAS.gridLine}` }}
      >
        {children}
      </div>

      {(why || equation) && (
        <div className="mt-3 space-y-1">
          {equation ? (
            <p className="text-sm font-medium" style={{ color: CANVAS.text }}>
              {equation}
            </p>
          ) : null}
          {why ? (
            <p className="text-sm leading-relaxed" style={{ color: CANVAS.muted }}>
              {why}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
