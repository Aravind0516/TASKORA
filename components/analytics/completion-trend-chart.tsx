"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import { CHART_INK, SEQUENTIAL_BLUE } from "@/lib/chart-colors";

interface TrendPoint {
  week: string;
  completed: number;
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: TrendPoint }[] }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-lg bg-foreground px-3 py-1.5 text-xs text-background shadow-md">
      <span className="font-semibold">{point.completed}</span>{" "}
      <span className="opacity-80">completed · {point.week}</span>
    </div>
  );
}

export function CompletionTrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
        <CartesianGrid vertical={false} stroke={CHART_INK.gridline} />
        <XAxis
          dataKey="week"
          tickLine={false}
          axisLine={false}
          tick={{ fill: CHART_INK.muted, fontSize: 11 }}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: CHART_INK.gridline }} />
        <Area
          type="monotone"
          dataKey="completed"
          stroke={SEQUENTIAL_BLUE[500]}
          strokeWidth={2}
          fill={SEQUENTIAL_BLUE[500]}
          fillOpacity={0.1}
          dot={{ r: 4, fill: SEQUENTIAL_BLUE[500], stroke: "#fcfcfb", strokeWidth: 2 }}
          activeDot={{ r: 5 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
