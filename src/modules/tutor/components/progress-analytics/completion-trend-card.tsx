import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PROGRESS_ANALYTICS_CARD_CLASS } from "@/modules/tutor/components/progress-analytics/card-styles";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import type { CompletionTrendPoint } from "@/modules/tutor/types/progress-analytics";

interface CompletionTrendCardProps {
  data: CompletionTrendPoint[];
}

export function CompletionTrendCard({ data }: CompletionTrendCardProps) {
  return (
    <Card className={PROGRESS_ANALYTICS_CARD_CLASS}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-bold text-blue-900 dark:text-blue-100">
          Completion Trend
        </CardTitle>
        <CardDescription>Average completion over time</CardDescription>
      </CardHeader>
      <CardContent className="pb-4">
        <ChartContainer
          id="completion-trend"
          config={{
            completion: { label: "Completion", color: "hsl(243 75% 59%)" },
          }}
          className="h-[220px] w-full"
        >
          <LineChart data={data} margin={{ left: -8, right: 12, top: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fontSize: 11 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={4}
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tickFormatter={(value) => `${value}%`}
              tick={{ fontSize: 11 }}
              width={36}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  hideLabel
                  formatter={(value) => `${value}%`}
                />
              }
            />
            <Line
              type="monotone"
              dataKey="completion"
              stroke="var(--color-completion)"
              strokeWidth={2.5}
              dot={{ r: 4, fill: "var(--color-completion)", strokeWidth: 0 }}
              activeDot={{ r: 5, fill: "var(--color-completion)", strokeWidth: 0 }}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
