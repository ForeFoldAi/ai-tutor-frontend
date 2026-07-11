import { CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { OnboardingProgressItem } from "@/modules/organization/types/dashboard";

interface OnboardingProgressCardProps {
  items: OnboardingProgressItem[];
}

export function OnboardingProgressCard({ items }: OnboardingProgressCardProps) {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-bold text-blue-900 dark:text-blue-100">
          Onboarding Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 pb-6">
        {items.map((item) => (
          <div key={item.id} className="space-y-2">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-blue-900 dark:text-blue-100">{item.label}</p>
                  <span className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                    {item.percent}%
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {item.completed.toLocaleString()} / {item.total.toLocaleString()} completed
                </p>
              </div>
            </div>
            <Progress value={item.percent} className="h-2" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
