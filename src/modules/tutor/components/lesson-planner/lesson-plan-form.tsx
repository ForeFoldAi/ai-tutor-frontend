import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { AiPrepareOption, LessonPlanFormValues } from "@/modules/tutor/types/lesson-planner";

const fieldBorderClass =
  "border-2 border-gray-300 bg-background shadow-none dark:border-gray-600";

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

export function LessonPlanForm({ values, onChange, onGenerate, isGenerating }: LessonPlanFormProps) {
  const toggleOption = (id: AiPrepareOption, checked: boolean) => {
    onChange({
      ...values,
      prepareOptions: { ...values.prepareOptions, [id]: checked },
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border/70 bg-card p-3 shadow-sm">
      <h2 className="shrink-0 pb-2 text-base font-bold text-blue-900 dark:text-blue-100">
        Plan Your Lesson with AI
      </h2>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
        <div className="grid shrink-0 grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Grade / Class</Label>
            <Select
              value={values.grade || undefined}
              onValueChange={(grade) => onChange({ ...values, grade })}
            >
              <SelectTrigger className={cn("h-9 text-sm", fieldBorderClass)}>
                <SelectValue placeholder="Select grade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6">Grade 6</SelectItem>
                <SelectItem value="7">Grade 7</SelectItem>
                <SelectItem value="8">Grade 8</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Subject</Label>
            <Select
              value={values.subject || undefined}
              onValueChange={(subject) => onChange({ ...values, subject })}
            >
              <SelectTrigger className={cn("h-9 text-sm", fieldBorderClass)}>
                <SelectValue placeholder="Select subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Mathematics">Mathematics</SelectItem>
                <SelectItem value="Science">Science</SelectItem>
                <SelectItem value="English">English</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Chapter / Topic</Label>
            <Select
              value={values.chapter || undefined}
              onValueChange={(chapter) => onChange({ ...values, chapter })}
            >
              <SelectTrigger className={cn("h-9 text-sm", fieldBorderClass)}>
                <SelectValue placeholder="Select chapter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Fractions">Fractions</SelectItem>
                <SelectItem value="Decimals">Decimals</SelectItem>
                <SelectItem value="Algebra">Algebra</SelectItem>
                <SelectItem value="Geometry">Geometry</SelectItem>
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
          <Label className="text-xs text-muted-foreground">Learning Objectives</Label>
          <Textarea
            value={values.learningObjectives}
            onChange={(event) =>
              onChange({ ...values, learningObjectives: event.target.value })
            }
            rows={4}
            placeholder="Enter learning objectives..."
            className={cn("min-h-[96px] resize-none py-2 text-sm leading-snug", fieldBorderClass)}
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
