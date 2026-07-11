import {
  CalendarPlus,
  ClipboardList,
  FileText,
  Lightbulb,
  Send,
} from "lucide-react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AiAssistantMascot } from "@/modules/tutor/components/ai-insights/ai-assistant-mascot";
import { AI_INSIGHTS_GLASS_CARD_CLASS } from "@/modules/tutor/components/ai-insights/card-styles";
import type { QuickAction } from "@/modules/tutor/types/ai-insights";

interface QuickActionsCardProps {
  actions: QuickAction[];
}

const ICON_MAP = {
  lesson: Lightbulb,
  quiz: ClipboardList,
  worksheet: FileText,
  session: CalendarPlus,
  questions: Send,
};

export function QuickActionsCard({ actions }: QuickActionsCardProps) {
  return (
    <Card className={AI_INSIGHTS_GLASS_CARD_CLASS}>
      <CardHeader className="shrink-0 pb-3">
        <CardTitle className="text-base font-bold text-blue-900 dark:text-blue-100">
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 gap-3 pb-4">
        <div className="flex min-h-0 flex-1 flex-col justify-evenly gap-2">
          {actions.map((action) => {
            const Icon = ICON_MAP[action.icon];
            const content = (
              <>
                <div className="rounded-md bg-primary/10 p-1.5 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 text-left">
                  <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                    {action.title}
                  </p>
                  <p className="text-xs text-muted-foreground">{action.description}</p>
                </div>
              </>
            );

            if (action.href) {
              return (
                <Button
                  key={action.id}
                  asChild
                  variant="outline"
                  className="h-auto w-full justify-start gap-3 border-border/70 px-3 py-2.5 hover:bg-muted/30"
                >
                  <Link href={action.href}>{content}</Link>
                </Button>
              );
            }

            return (
              <Button
                key={action.id}
                variant="outline"
                className="h-auto w-full justify-start gap-3 border-border/70 px-3 py-2.5 hover:bg-muted/30"
              >
                {content}
              </Button>
            );
          })}
        </div>
        <AiAssistantMascot />
      </CardContent>
    </Card>
  );
}
