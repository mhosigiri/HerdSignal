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
    <div className="h-72 rounded-[2rem] border border-stone-200/80 bg-[#f6f0e5] p-5 shadow-[0_24px_80px_rgba(56,44,29,0.08)]">
      <div className="mb-4">
        <p className="text-xs uppercase tracking-[0.28em] text-stone-500">Population trend</p>
        <h2 className="mt-2 text-xl font-semibold text-stone-900">Regional estimate recovery</h2>
      </div>
      <div className="min-h-[200px] min-w-0">
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="populationFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#34623f" stopOpacity={0.7} />
                <stop offset="100%" stopColor="#34623f" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#d8cdbd" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="year" tickLine={false} axisLine={false} tick={{ fill: "#5c5347" }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fill: "#5c5347" }} width={80} />
            <Tooltip />
            <Area
              type="monotone"
              dataKey="estimate"
              stroke="#27452d"
              strokeWidth={3}
              fill="url(#populationFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
