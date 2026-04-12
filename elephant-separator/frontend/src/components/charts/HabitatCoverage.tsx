"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { HabitatDatum } from "@/types/elephant";

export function HabitatCoverage({ data }: { data: HabitatDatum[] }) {
  return (
    <div>
      <p className="t-eyebrow" style={{ marginBottom: "0.5rem" }}>Habitat stability</p>
      <p className="t-h3" style={{ marginBottom: "2rem" }}>Protected vs fragmented area</p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} barGap={4}>
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
          />
          <Tooltip
            contentStyle={{
              background: "#161616",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "0.75rem",
              color: "#fff",
              fontSize: "0.8125rem",
            }}
            cursor={{ fill: "rgba(255,255,255,0.03)" }}
          />
          <Bar dataKey="protectedArea" fill="#5d8b63" radius={[4, 4, 0, 0]} />
          <Bar dataKey="fragmentedArea" fill="#d2a24f" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
