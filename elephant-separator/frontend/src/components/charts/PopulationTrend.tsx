"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { PopulationPoint } from "@/types/elephant";

export function PopulationTrend({ data }: { data: PopulationPoint[] }) {
  return (
    <div>
      <p className="t-eyebrow" style={{ marginBottom: "0.5rem" }}>Population trend</p>
      <p className="t-h3" style={{ marginBottom: "2rem" }}>Regional estimate recovery</p>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="popFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#5d8b63" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#5d8b63" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis
            dataKey="year"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "rgba(255,255,255,0.32)", fontSize: 12 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fill: "rgba(255,255,255,0.32)", fontSize: 12 }}
            width={72}
          />
          <Tooltip
            contentStyle={{
              background: "#161616",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "0.75rem",
              color: "#fff",
              fontSize: "0.8125rem",
            }}
            cursor={{ stroke: "rgba(255,255,255,0.1)" }}
          />
          <Area
            type="monotone"
            dataKey="estimate"
            stroke="#5d8b63"
            strokeWidth={2}
            fill="url(#popFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
