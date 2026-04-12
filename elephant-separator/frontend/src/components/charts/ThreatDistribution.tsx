"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import type { ThreatDatum } from "@/types/elephant";

export function ThreatDistribution({ data }: { data: ThreatDatum[] }) {
  return (
    <div className="h-72 rounded-[2rem] border border-stone-200/80 bg-[#f6f0e5] p-5 shadow-[0_24px_80px_rgba(56,44,29,0.08)]">
      <div className="mb-4">
        <p className="text-xs uppercase tracking-[0.28em] text-stone-500">Threat mix</p>
        <h2 className="mt-2 text-xl font-semibold text-stone-900">Pressure by incident class</h2>
      </div>
      <div className="h-[200px] min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="incidents" nameKey="name" innerRadius={55} outerRadius={95}>
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
