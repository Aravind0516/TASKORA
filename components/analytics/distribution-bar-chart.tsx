"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART_INK } from "@/lib/chart-colors";

interface DistributionItem {
  label: string;
  value: number;
  color: string;
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: DistributionItem }[] }) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="rounded-lg bg-foreground px-3 py-1.5 text-xs text-background shadow-md">
      <span className="font-semibold">{item.value}</span>{" "}
      <span className="opacity-80">{item.label}</span>
    </div>
  );
}

export function DistributionBarChart({ items }: { items: DistributionItem[] }) {
  return (
    <ResponsiveContainer width="100%" height={items.length * 44 + 16}>
      <BarChart data={items} layout="vertical" margin={{ top: 4, right: 28, bottom: 4, left: 4 }}>
        <CartesianGrid horizontal={false} stroke={CHART_INK.gridline} />
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="label"
          width={92}
          tickLine={false}
          axisLine={false}
          tick={{ fill: CHART_INK.secondary, fontSize: 12 }}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "transparent" }} />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
          {items.map((item) => (
            <Cell key={item.label} fill={item.color} />
          ))}
          <LabelList
            dataKey="value"
            position="right"
            style={{ fill: CHART_INK.primary, fontSize: 12, fontWeight: 600 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
