"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

type Point = {
  ts: number;
  value: number;
};

const SIGNAL = "#E7FF00";
const CHARCOAL = "#3F4157";
const SLATE = "#6F7287";
const INK_2 = "#07080A";

function formatHour(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:00`;
}

export function MetricArea({
  data,
  unit,
}: {
  data: Point[];
  unit: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 4 }}>
        <defs>
          <linearGradient id="signal-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SIGNAL} stopOpacity={0.55} />
            <stop offset="100%" stopColor={SIGNAL} stopOpacity={0.04} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={CHARCOAL} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="ts"
          tickFormatter={formatHour}
          stroke={SLATE}
          fontSize={10}
          tickLine={false}
          axisLine={{ stroke: CHARCOAL }}
          minTickGap={48}
        />
        <YAxis
          stroke={SLATE}
          fontSize={10}
          tickLine={false}
          axisLine={{ stroke: CHARCOAL }}
          width={48}
        />
        <Tooltip
          contentStyle={{
            background: INK_2,
            border: `1px solid ${CHARCOAL}`,
            fontSize: 12,
            color: "#fff",
          }}
          labelFormatter={(v) => new Date(v).toLocaleString()}
          formatter={(value: number) => [`${value} ${unit}`, ""]}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={SIGNAL}
          strokeWidth={1.5}
          fill="url(#signal-fill)"
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
