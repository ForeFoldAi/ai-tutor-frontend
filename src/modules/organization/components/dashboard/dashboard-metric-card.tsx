import { TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

interface DashboardMetricCardProps {
  label: string;
  value: string | number;
  subtext: string;
  trendUp?: boolean;
  mutedSubtext?: boolean;
  icon: LucideIcon;
  labelClassName: string;
  iconClassName: string;
}

export function DashboardMetricCard({
  label,
  value,
  subtext,
  trendUp = true,
  mutedSubtext = false,
  icon: Icon,
  labelClassName,
  iconClassName,
}: DashboardMetricCardProps) {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardContent className="space-y-3 p-5">
        <div className="flex items-center gap-2">
          <div className={`rounded-lg p-2 ${iconClassName}`}>
            <Icon className="h-4 w-4" />
          </div>
          <p className={`text-sm font-medium ${labelClassName}`}>{label}</p>
        </div>
        <p className="text-3xl font-bold tracking-tight text-blue-900 dark:text-blue-100">{value}</p>
        <p
          className={`flex items-center gap-1 text-xs font-medium ${
            mutedSubtext
              ? "text-muted-foreground"
              : trendUp
                ? "text-emerald-600"
                : "text-rose-600"
          }`}
        >
          {!mutedSubtext && trendUp && <TrendingUp className="h-3.5 w-3.5" />}
          {subtext}
        </p>
      </CardContent>
    </Card>
  );
}
