import { AlertTriangle, CalendarDays, TrendingDown, TrendingUp, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { CredentialMetrics } from "@/modules/organization/types/credentials";

interface CredentialsSummaryCardsProps {
  metrics: CredentialMetrics;
}

export function CredentialsSummaryCards({ metrics }: CredentialsSummaryCardsProps) {
  const cards = [
    {
      label: "Credentials Generated",
      value: metrics.generated.toLocaleString(),
      subtext: `↑ ${metrics.generatedTrend}`,
      trendUp: true,
      icon: CalendarDays,
      labelClassName: "text-blue-700",
      iconClassName: "bg-blue-50 text-blue-600",
    },
    {
      label: "Teachers Pending First Login",
      value: metrics.teachersPendingLogin,
      subtext: `↑ ${metrics.teachersPendingTrend}`,
      trendUp: true,
      icon: Users,
      labelClassName: "text-blue-700",
      iconClassName: "bg-blue-50 text-blue-600",
    },
    {
      label: "Students Pending First Login",
      value: metrics.studentsPendingLogin,
      subtext: `↑ ${metrics.studentsPendingTrend}`,
      trendUp: true,
      icon: Users,
      labelClassName: "text-blue-700",
      iconClassName: "bg-blue-50 text-blue-600",
    },
    {
      label: "Credentials Not Shared",
      value: metrics.notShared,
      subtext: `${metrics.notSharedTrendUp ? "↑" : "↓"} ${metrics.notSharedTrend}`,
      trendUp: metrics.notSharedTrendUp,
      icon: AlertTriangle,
      labelClassName: "text-amber-700",
      iconClassName: "bg-amber-50 text-amber-600",
    },
  ];

  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const TrendIcon = card.trendUp ? TrendingUp : TrendingDown;
        return (
          <Card key={card.label} className="border-border/70 shadow-sm">
            <CardContent className="space-y-1.5 p-3.5">
              <div className="flex items-center gap-2">
                <div className={`rounded-md p-1.5 ${card.iconClassName}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <p className={`text-sm font-medium leading-snug ${card.labelClassName}`}>{card.label}</p>
              </div>
              <p className="text-2xl font-bold tracking-tight text-blue-900 dark:text-blue-100">
                {card.value}
              </p>
              <p
                className={`flex items-center gap-1 text-xs font-medium ${
                  card.trendUp ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                <TrendIcon className="h-3 w-3" />
                {card.subtext.replace(/^[↑↓]\s*/, "")}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
