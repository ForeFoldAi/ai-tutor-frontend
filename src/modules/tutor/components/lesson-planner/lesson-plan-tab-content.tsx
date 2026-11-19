import { BookOpen, CheckCircle2, Circle, Clock, Lightbulb, ListChecks } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LessonPlanMarkdownView } from "@/modules/tutor/components/lesson-planner/lesson-plan-markdown-view";
import { PptDeckPreview } from "@/modules/tutor/components/lesson-planner/ppt-deck-preview";
import type {
  GeneratedLessonPlan,
  HomeworkTask,
  LessonExample,
  LessonPlanTab,
  PptSlide,
  QuizQuestion,
  TeachingNotesContent,
  WorksheetQuestion,
} from "@/modules/tutor/types/lesson-planner";
import { normalizeQuestionOptions } from "@/modules/tutor/utils/lesson-planner-mappers";

const EMPTY_MESSAGE =
  "Configure your lesson on the left and click Generate to see your AI lesson plan here.";

function EmptyState() {
  return <p className="text-sm leading-relaxed text-muted-foreground">{EMPTY_MESSAGE}</p>;
}

function SectionTitle({ icon: Icon, title }: { icon: typeof BookOpen; title: string }) {
  return (
    <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
      <Icon className="h-4 w-4 text-primary" />
      {title}
    </h3>
  );
}

export function TeachingNotesTab({
  markdown,
  content,
}: {
  markdown?: string;
  content?: TeachingNotesContent;
}) {
  if (markdown) return <LessonPlanMarkdownView markdown={markdown} />;
  if (!content) return <EmptyState />;

  return (
    <div className="space-y-4">
      <p className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5 text-sm leading-relaxed text-foreground">
        {content.overview}
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 rounded-lg border border-border/60 p-3">
          <SectionTitle icon={ListChecks} title="Key Points" />
          <ul className="space-y-1.5">
            {content.keyPoints.map((point) => (
              <li key={point} className="flex gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-2 rounded-lg border border-border/60 p-3">
          <SectionTitle icon={BookOpen} title="Materials Needed" />
          <ul className="flex flex-wrap gap-1.5">
            {content.materials.map((item) => (
              <Badge key={item} variant="outline" className="border-primary/20 bg-primary/5 text-foreground">
                {item}
              </Badge>
            ))}
          </ul>
        </div>
      </div>

      <div className="space-y-2 rounded-lg border border-amber-200/80 bg-amber-50/50 p-3 dark:border-amber-900/40 dark:bg-amber-950/20">
        <SectionTitle icon={Lightbulb} title="Teaching Tips" />
        <ul className="space-y-1.5">
          {content.tips.map((tip) => (
            <li key={tip} className="text-sm leading-relaxed text-muted-foreground">
              • {tip}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function ExamplesTab({
  markdown,
  examples,
}: {
  markdown?: string;
  examples?: LessonExample[];
}) {
  if (markdown) return <LessonPlanMarkdownView markdown={markdown} />;
  if (!examples?.length) return <EmptyState />;

  return (
    <div className="space-y-3">
      {examples.map((example, index) => (
        <div key={example.title} className="rounded-lg border border-border/60 p-3">
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {index + 1}
            </span>
            <h3 className="text-sm font-semibold text-foreground">{example.title}</h3>
          </div>
          <p className="mb-2 rounded-md bg-muted/30 px-3 py-2 text-sm italic text-foreground">
            {example.scenario}
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">{example.explanation}</p>
        </div>
      ))}
    </div>
  );
}

function QuestionCard({
  number,
  question,
  type,
  options,
}: WorksheetQuestion | QuizQuestion) {
  const optionLabels =
    type === "mcq" && options?.length ? normalizeQuestionOptions(options) ?? [] : [];

  return (
    <div className="rounded-lg border border-border/60 p-3">
      <p className="mb-2 text-sm font-medium text-foreground">
        {number}. {question}
      </p>
      {type === "mcq" && optionLabels.length ? (
        <div className="grid gap-1.5 sm:grid-cols-2">
          {optionLabels.map((option, index) => (
            <div
              key={`${number}-${index}-${option}`}
              className="flex items-center gap-2 rounded-md border border-border/50 bg-muted/20 px-2.5 py-1.5 text-sm text-muted-foreground"
            >
              <Circle className="h-3.5 w-3.5 shrink-0" />
              {option}
            </div>
          ))}
        </div>
      ) : (
        <div className="h-10 rounded-md border border-dashed border-border/70 bg-muted/10" />
      )}
    </div>
  );
}

export function WorksheetTab({
  markdown,
  questions,
}: {
  markdown?: string;
  questions?: WorksheetQuestion[];
}) {
  if (markdown) {
    return (
      <LessonPlanMarkdownView
        markdown={markdown}
        className="rounded-lg border border-border/60 bg-white p-4 dark:bg-card print:border-0 print:p-0"
      />
    );
  }
  if (!questions?.length) return <EmptyState />;

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Practice Worksheet · {questions.length} questions
      </p>
      {questions.map((q) => (
        <QuestionCard key={q.number} {...q} />
      ))}
    </div>
  );
}

export function QuizTab({
  markdown,
  questions,
}: {
  markdown?: string;
  questions?: QuizQuestion[];
}) {
  if (markdown) {
    return (
      <LessonPlanMarkdownView
        markdown={markdown}
        className="rounded-lg border border-border/60 bg-white p-4 dark:bg-card"
      />
    );
  }
  if (!questions?.length) return <EmptyState />;

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Quick Quiz · {questions.length} questions</p>
      {questions.map((q) => (
        <QuestionCard key={q.number} {...q} />
      ))}
    </div>
  );
}

export function HomeworkTab({
  markdown,
  tasks,
}: {
  markdown?: string;
  tasks?: HomeworkTask[];
}) {
  if (markdown) return <LessonPlanMarkdownView markdown={markdown} />;
  if (!tasks?.length) return <EmptyState />;

  return (
    <div className="space-y-3">
      {tasks.map((task, index) => (
        <div key={task.title} className="flex gap-3 rounded-lg border border-border/60 p-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {index + 1}
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">{task.title}</h3>
              {task.estimatedMinutes ? (
                <Badge variant="outline" className="gap-1 text-xs font-normal">
                  <Clock className="h-3 w-3" />
                  ~{task.estimatedMinutes} min
                </Badge>
              ) : null}
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">{task.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function PptOutlineTab({
  markdown,
  slides,
  templateId,
}: {
  markdown?: string;
  slides?: PptSlide[];
  templateId?: string;
}) {
  if (slides?.length) {
    return (
      <div className="space-y-4">
        <PptDeckPreview slides={slides} templateId={templateId} />
        {markdown ? (
          <details className="rounded-md border border-border/60 p-3">
            <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
              View outline markdown
            </summary>
            <div className="mt-3">
              <LessonPlanMarkdownView markdown={markdown} />
            </div>
          </details>
        ) : null}
      </div>
    );
  }
  if (markdown) return <LessonPlanMarkdownView markdown={markdown} />;
  return <EmptyState />;
}

export function LessonPlanTabContent({
  tab,
  plan,
}: {
  tab: Exclude<LessonPlanTab, "lesson-plan">;
  plan: GeneratedLessonPlan | null;
}) {
  if (!plan) return <EmptyState />;

  switch (tab) {
    case "teaching-notes":
      return <TeachingNotesTab markdown={plan.teachingNotesMarkdown} content={plan.teachingNotes} />;
    case "examples":
      return <ExamplesTab markdown={plan.examplesMarkdown} examples={plan.examples} />;
    case "worksheet":
      return <WorksheetTab markdown={plan.worksheetMarkdown} questions={plan.worksheet} />;
    case "quiz":
      return <QuizTab markdown={plan.quizMarkdown} questions={plan.quiz} />;
    case "homework":
      return <HomeworkTab markdown={plan.homeworkMarkdown} tasks={plan.homework} />;
    case "ppt-outline":
      return (
        <PptOutlineTab
          markdown={plan.pptOutlineMarkdown}
          slides={plan.pptOutline}
          templateId={plan.pptTemplateId}
        />
      );
    default:
      return <EmptyState />;
  }
}
