import { Check, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PROGRESS_ANALYTICS_CARD_CLASS } from "@/modules/tutor/components/progress-analytics/card-styles";
import type { ClassHealthMetrics } from "@/modules/tutor/types/progress-analytics";

interface ClassHealthScoreCardProps {
  metrics: ClassHealthMetrics;
}

function CircularGauge({ value }: { value: number }) {
  const size = 140;
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-muted/40"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="text-emerald-500 transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-blue-900 dark:text-blue-100">{value}%</span>
      </div>
    </div>
  );
}

const STATUS_STYLES = {
  Good: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Fair: "border-amber-200 bg-amber-50 text-amber-700",
  "Needs Attention": "border-red-200 bg-red-50 text-red-700",
};

export function ClassHealthScoreCard({ metrics }: ClassHealthScoreCardProps) {
  const TrendIcon = metrics.trendUp ? TrendingUp : TrendingDown;

  return (
    <Card className={PROGRESS_ANALYTICS_CARD_CLASS}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-bold text-blue-900 dark:text-blue-100">
          Class Health Score
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-3 pb-5">
        <CircularGauge value={metrics.score} />
        <Badge variant="outline" className={`gap-1 px-3 py-1 ${STATUS_STYLES[metrics.status]}`}>
          {metrics.status === "Good" && <Check className="h-3.5 w-3.5" />}
          {metrics.status}
        </Badge>
        <p
          className={`flex items-center gap-1 text-xs ${
            metrics.trendUp ? "text-emerald-600" : "text-red-600"
          }`}
        >
          <TrendIcon className="h-3.5 w-3.5" />
          {metrics.trendPercent}% from last week
        </p>
      </CardContent>
    </Card>
  );
}
