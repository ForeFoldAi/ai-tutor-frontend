import { FileText, Loader2, Presentation } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ExportFormat, LessonArtifactType } from "@/api/lesson-planner";
import type { GeneratedLessonPlan } from "@/modules/tutor/types/lesson-planner";

export const ARTIFACT_DOWNLOAD_ITEMS: {
  artifact: LessonArtifactType;
  label: string;
  format: ExportFormat;
}[] = [
  { artifact: "lesson_plan", label: "Lesson Plan", format: "pdf" },
  { artifact: "teaching_notes", label: "Teaching Notes", format: "pdf" },
  { artifact: "examples", label: "Examples", format: "pdf" },
  { artifact: "worksheet", label: "Worksheet", format: "pdf" },
  { artifact: "quiz", label: "Quiz", format: "pdf" },
  { artifact: "homework", label: "Homework", format: "pdf" },
  { artifact: "ppt_outline", label: "PPT Outline", format: "pptx" },
];

export function isArtifactAvailable(plan: GeneratedLessonPlan | null, artifact: LessonArtifactType): boolean {
  if (!plan) return false;
  switch (artifact) {
    case "lesson_plan":
      return !!(plan.lessonPlanMarkdown || plan.phases?.length);
    case "teaching_notes":
      return !!(plan.teachingNotesMarkdown || plan.teachingNotes);
    case "examples":
      return !!(plan.examplesMarkdown || plan.examples?.length);
    case "worksheet":
      return !!(plan.worksheetMarkdown || plan.worksheet?.length);
    case "quiz":
      return !!(plan.quizMarkdown || plan.quiz?.length);
    case "homework":
      return !!(plan.homeworkMarkdown || plan.homework?.length);
    case "ppt_outline":
      return !!(plan.pptOutlineMarkdown || plan.pptOutline?.length);
    default:
      return false;
  }
}

export function artifactDownloadFilename(artifact: LessonArtifactType, format: ExportFormat): string {
  const base = artifact.replace(/_/g, "-");
  return `${base}.${format}`;
}

interface LessonPlanDownloadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: GeneratedLessonPlan | null;
  exportingKey: string | null;
  onDownload: (artifact: LessonArtifactType, format: ExportFormat) => void;
}

export function LessonPlanDownloadDialog({
  open,
  onOpenChange,
  plan,
  exportingKey,
  onDownload,
}: LessonPlanDownloadDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Download lesson materials</DialogTitle>
          <DialogDescription>
            Choose an item to download. Each file is exported individually with clean formatting.
          </DialogDescription>
        </DialogHeader>
        <ul className="space-y-2">
          {ARTIFACT_DOWNLOAD_ITEMS.map((item) => {
            const available = isArtifactAvailable(plan, item.artifact);
            const rowKey = `${item.artifact}-${item.format}`;
            const loading = exportingKey === rowKey;
            const Icon = item.format === "pptx" ? Presentation : FileText;

            return (
              <li
                key={rowKey}
                className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2.5"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.format}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0"
                  disabled={!available || !!exportingKey}
                  onClick={() => onDownload(item.artifact, item.format)}
                >
                  {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Download"}
                </Button>
              </li>
            );
          })}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
