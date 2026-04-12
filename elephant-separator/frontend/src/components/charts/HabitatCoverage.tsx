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
    <div className="h-72 rounded-[2rem] border border-stone-200/80 bg-[#102017] p-5 text-stone-100 shadow-[0_24px_80px_rgba(8,18,14,0.35)]">
      <div className="mb-4">
        <p className="text-xs uppercase tracking-[0.28em] text-stone-400">Habitat stability</p>
        <h2 className="mt-2 text-xl font-semibold">Protected vs fragmented area</h2>
      </div>
      <div className="min-h-[200px] min-w-0">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data}>
            <CartesianGrid stroke="#2c4032" vertical={false} />
            <XAxis dataKey="year" tickLine={false} axisLine={false} tick={{ fill: "#cfc2ad" }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fill: "#cfc2ad" }} />
            <Tooltip />
            <Bar dataKey="protectedArea" fill="#7aa969" radius={[10, 10, 0, 0]} />
            <Bar dataKey="fragmentedArea" fill="#d29d48" radius={[10, 10, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
