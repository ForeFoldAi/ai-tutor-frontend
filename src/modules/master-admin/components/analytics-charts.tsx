 import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Area,
  CartesianGrid,
  Line,
  LineChart,
  Bar,
  XAxis,
  YAxis,
  BarChart,
  AreaChart,
} from "recharts";

export function UserGrowthTrendChart({
  data,
}: {
  data: Array<{ month: string; users: number }>;
}) {
  return (
    <ChartContainer
      id="user-growth"
      config={{
        users: { label: "Users", color: "hsl(var(--chart-1))" },
      }}
      className="h-[clamp(6rem,18vh,16rem)] w-full"
    >
      <LineChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
        <Line type="monotone" dataKey="users" strokeWidth={2} stroke="var(--color-users)" dot={false} />
      </LineChart>
    </ChartContainer>
  );
}

export function RevenueTrendChart({
  data,
}: {
  data: Array<{ month: string; revenue: number }>;
}) {
  return (
    <ChartContainer
      id="revenue-trend"
      config={{
        revenue: { label: "Revenue", color: "hsl(var(--chart-2))" },
      }}
      className="h-[clamp(6rem,18vh,16rem)] w-full"
    >
      <AreaChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
        <defs>
          <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.25} />
            <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
        <ChartTooltip
          content={<ChartTooltipContent hideLabel indicator="line" formatter={(value) => `$${Number(value).toFixed(0)}`} />}
        />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="var(--color-revenue)"
          fill="url(#revenueGradient)"
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  );
}

export function OrganizationGrowthChart({
  data,
}: {
  data: Array<{ month: string; orgs: number }>;
}) {
  return (
    <ChartContainer
      id="org-growth"
      config={{
        orgs: { label: "Organizations", color: "hsl(var(--chart-3))" },
      }}
      className="h-[clamp(6rem,18vh,16rem)] w-full"
    >
      <BarChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="orgs" fill="var(--color-orgs)" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}

export function AIUsageAnalyticsChart({
  data,
}: {
  data: Array<{ label: string; queries: number }>;
}) {
  return (
    <ChartContainer
      id="ai-usage"
      config={{
        queries: { label: "AI Queries", color: "hsl(var(--chart-4))" },
      }}
      className="h-[clamp(6rem,18vh,16rem)] w-full"
    >
      <BarChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => `${(Number(value) / 1000).toFixed(0)}k`}
            />
          }
        />
        <Bar dataKey="queries" fill="var(--color-queries)" radius={[8, 8, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}

