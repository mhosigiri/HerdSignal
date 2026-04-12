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
import { useEffect, useState } from "react";

import type { HabitatDatum } from "@/types/elephant";

export function HabitatCoverage({ data }: { data: HabitatDatum[] }) {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.getAttribute("data-theme") !== "light");
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  const gridColor = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)";
  const axisColor = isDark ? "rgba(255,255,255,0.32)" : "rgba(0,0,0,0.45)";
  const tooltipBg = isDark ? "#161616" : "#ffffff";
  const tooltipBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const tooltipColor = isDark ? "#fff" : "#1b1a16";
  const cursorFill = isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)";
  const barGreen = isDark ? "#5d8b63" : "#3a6642";
  const barGold = isDark ? "#d2a24f" : "#b8892f";

  return (
    <div>
      <p className="t-eyebrow" style={{ marginBottom: "0.5rem" }}>Habitat stability</p>
      <p className="t-h3" style={{ marginBottom: "2rem" }}>Protected vs fragmented area</p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} barGap={4}>
          <CartesianGrid stroke={gridColor} vertical={false} />
          <XAxis
            dataKey="year"
            tickLine={false}
            axisLine={false}
            tick={{ fill: axisColor, fontSize: 12 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fill: axisColor, fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{
              background: tooltipBg,
              border: `1px solid ${tooltipBorder}`,
              borderRadius: "0.75rem",
              color: tooltipColor,
              fontSize: "0.8125rem",
            }}
            cursor={{ fill: cursorFill }}
          />
          <Bar dataKey="protectedArea" fill={barGreen} radius={[4, 4, 0, 0]} />
          <Bar dataKey="fragmentedArea" fill={barGold} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
