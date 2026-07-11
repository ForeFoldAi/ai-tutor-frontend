import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PROGRESS_ANALYTICS_CARD_CLASS } from "@/modules/tutor/components/progress-analytics/card-styles";
import { CardViewMoreButton, ViewMoreDialog } from "@/modules/tutor/components/view-more-dialog";
import type { TopicMasteryItem } from "@/modules/tutor/types/progress-analytics";

interface TopicMasteryCardProps {
  topics: TopicMasteryItem[];
  allTopics: TopicMasteryItem[];
}

function masteryBarColor(mastery: number) {
  if (mastery >= 60) return "bg-emerald-500";
  return "bg-amber-500";
}

function TopicMasteryRow({ item }: { item: TopicMasteryItem }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">{item.topic}</span>
        <span className="font-semibold text-blue-900 dark:text-blue-100">{item.mastery}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted/60">
        <div
          className={`h-full rounded-full transition-all ${masteryBarColor(item.mastery)}`}
          style={{ width: `${item.mastery}%` }}
        />
      </div>
    </div>
  );
}

export function TopicMasteryCard({ topics, allTopics }: TopicMasteryCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Card className={PROGRESS_ANALYTICS_CARD_CLASS}>
        <CardHeader className="space-y-1 pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base font-bold text-blue-900 dark:text-blue-100">
              Topic Mastery
            </CardTitle>
            <CardViewMoreButton onClick={() => setOpen(true)} />
          </div>
          <CardDescription>Average mastery by topic</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3.5 pb-5">
          {topics.map((item) => (
            <TopicMasteryRow key={item.topic} item={item} />
          ))}
        </CardContent>
      </Card>

      <ViewMoreDialog
        open={open}
        onOpenChange={setOpen}
        title="All Topic Mastery"
        description="Average mastery across all tracked topics"
      >
        {allTopics.map((item) => (
          <TopicMasteryRow key={item.topic} item={item} />
        ))}
      </ViewMoreDialog>
    </>
  );
}
