import { BookOpen, CheckCircle2, Circle, Clock, Lightbulb, ListChecks, Presentation } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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

export function TeachingNotesTab({ content }: { content?: TeachingNotesContent }) {
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

export function ExamplesTab({ examples }: { examples?: LessonExample[] }) {
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
  return (
    <div className="rounded-lg border border-border/60 p-3">
      <p className="mb-2 text-sm font-medium text-foreground">
        {number}. {question}
      </p>
      {type === "mcq" && options ? (
        <div className="grid gap-1.5 sm:grid-cols-2">
          {options.map((option) => (
            <div
              key={option}
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

export function WorksheetTab({ questions }: { questions?: WorksheetQuestion[] }) {
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

export function QuizTab({ questions }: { questions?: QuizQuestion[] }) {
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

export function HomeworkTab({ tasks }: { tasks?: HomeworkTask[] }) {
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

export function PptOutlineTab({ slides }: { slides?: PptSlide[] }) {
  if (!slides?.length) return <EmptyState />;

  return (
    <div className="space-y-0">
      {slides.map((slide, index) => (
        <div key={slide.number} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
              {slide.number}
            </div>
            {index < slides.length - 1 ? <div className="my-1 w-px flex-1 bg-border/70" /> : null}
          </div>
          <div className="mb-4 min-w-0 flex-1 rounded-lg border border-border/60 p-3">
            <div className="mb-2 flex items-center gap-2">
              <Presentation className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">{slide.title}</h3>
            </div>
            <ul className="space-y-1">
              {slide.bullets.map((bullet) => (
                <li key={bullet} className="text-sm text-muted-foreground">
                  • {bullet}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ))}
    </div>
  );
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
      return <TeachingNotesTab content={plan.teachingNotes} />;
    case "examples":
      return <ExamplesTab examples={plan.examples} />;
    case "worksheet":
      return <WorksheetTab questions={plan.worksheet} />;
    case "quiz":
      return <QuizTab questions={plan.quiz} />;
    case "homework":
      return <HomeworkTab tasks={plan.homework} />;
    case "ppt-outline":
      return <PptOutlineTab slides={plan.pptOutline} />;
    default:
      return <EmptyState />;
  }
}
