import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AI_INSIGHTS_GLASS_CARD_CLASS } from "@/modules/tutor/components/ai-insights/card-styles";
import { CardViewMoreButton, ViewMoreDialog } from "@/modules/tutor/components/view-more-dialog";
import type { WeakTopic } from "@/modules/tutor/types/ai-insights";

interface WeakTopicsCardProps {
  topics: WeakTopic[];
  allTopics: WeakTopic[];
}

function struggleBarColor(percent: number) {
  if (percent <= 20) return "bg-red-500";
  return "bg-amber-500";
}

function WeakTopicRow({ item }: { item: WeakTopic }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">{item.topic}</span>
        <span className="font-semibold text-blue-900 dark:text-blue-100">
          {item.strugglePercent}%
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted/60">
        <div
          className={`h-full rounded-full ${struggleBarColor(item.strugglePercent)}`}
          style={{ width: `${item.strugglePercent}%` }}
        />
      </div>
    </div>
  );
}

export function WeakTopicsCard({ topics, allTopics }: WeakTopicsCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Card className={AI_INSIGHTS_GLASS_CARD_CLASS}>
        <CardHeader className="shrink-0 space-y-1 pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base font-bold text-blue-900 dark:text-blue-100">
              Weak Topics Detected
            </CardTitle>
            <CardViewMoreButton onClick={() => setOpen(true)} />
          </div>
          <CardDescription>Topics where students are struggling the most</CardDescription>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col justify-evenly gap-3">
            {topics.map((item) => (
              <WeakTopicRow key={item.topic} item={item} />
            ))}
          </div>
        </CardContent>
      </Card>

      <ViewMoreDialog
        open={open}
        onOpenChange={setOpen}
        title="All Weak Topics"
        description="Topics where students are struggling the most"
      >
        {allTopics.map((item) => (
          <WeakTopicRow key={item.topic} item={item} />
        ))}
      </ViewMoreDialog>
    </>
  );
}
