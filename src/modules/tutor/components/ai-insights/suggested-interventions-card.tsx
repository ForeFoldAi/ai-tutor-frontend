import { useState } from "react";
import { ClipboardList, FileText, Lightbulb, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AI_INSIGHTS_GLASS_CARD_CLASS } from "@/modules/tutor/components/ai-insights/card-styles";
import { CardViewMoreButton, ViewMoreDialog } from "@/modules/tutor/components/view-more-dialog";
import type { InterventionPriority, SuggestedIntervention } from "@/modules/tutor/types/ai-insights";

interface SuggestedInterventionsCardProps {
  interventions: SuggestedIntervention[];
  allInterventions: SuggestedIntervention[];
}

const PRIORITY_STYLES: Record<InterventionPriority, string> = {
  High: "border-red-200 bg-red-50 text-red-600",
  Medium: "border-amber-200 bg-amber-50 text-amber-700",
  Low: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

const ICON_MAP = {
  revision: Users,
  quiz: ClipboardList,
  worksheet: FileText,
  concept: Lightbulb,
};

function InterventionRow({ item }: { item: SuggestedIntervention }) {
  const Icon = ICON_MAP[item.icon];

  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-border/50 bg-muted/20 px-3 py-2.5">
      <div className="flex min-w-0 items-start gap-2.5">
        <div className="mt-0.5 rounded-md bg-primary/10 p-1.5 text-primary">
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">{item.title}</p>
          <p className="text-xs text-muted-foreground">{item.description}</p>
        </div>
      </div>
      <Badge variant="outline" className={`shrink-0 text-xs ${PRIORITY_STYLES[item.priority]}`}>
        {item.priority}
      </Badge>
    </div>
  );
}

export function SuggestedInterventionsCard({
  interventions,
  allInterventions,
}: SuggestedInterventionsCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Card className={AI_INSIGHTS_GLASS_CARD_CLASS}>
        <CardHeader className="shrink-0 space-y-1 pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base font-bold text-blue-900 dark:text-blue-100">
              AI Suggested Interventions
            </CardTitle>
            <CardViewMoreButton onClick={() => setOpen(true)} />
          </div>
          <CardDescription>Recommended actions based on student performance</CardDescription>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col justify-evenly gap-2">
            {interventions.map((item) => (
              <InterventionRow key={item.id} item={item} />
            ))}
          </div>
        </CardContent>
      </Card>

      <ViewMoreDialog
        open={open}
        onOpenChange={setOpen}
        title="All AI Suggested Interventions"
        description="Recommended actions based on student performance"
      >
        {allInterventions.map((item) => (
          <InterventionRow key={item.id} item={item} />
        ))}
      </ViewMoreDialog>
    </>
  );
}
