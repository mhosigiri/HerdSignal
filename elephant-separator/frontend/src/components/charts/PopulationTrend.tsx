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
import { useEffect, useState } from "react";

import type { PopulationPoint } from "@/types/elephant";

export function PopulationTrend({ data }: { data: PopulationPoint[] }) {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const check = () => {
      setIsDark(document.documentElement.getAttribute("data-theme") !== "light");
    };
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
  const strokeColor = isDark ? "#5d8b63" : "#3a6642";
  const fillColor1 = isDark ? "rgba(93,139,99,0.4)" : "rgba(58,102,66,0.25)";
  const fillColor2 = isDark ? "rgba(93,139,99,0)" : "rgba(58,102,66,0)";

  return (
    <div>
      <p className="t-eyebrow" style={{ marginBottom: "0.5rem" }}>Population trend</p>
      <p className="t-h3" style={{ marginBottom: "2rem" }}>Regional estimate recovery</p>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="popFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={fillColor1} />
              <stop offset="100%" stopColor={fillColor2} />
            </linearGradient>
          </defs>
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
            width={72}
          />
          <Tooltip
            contentStyle={{
              background: tooltipBg,
              border: `1px solid ${tooltipBorder}`,
              borderRadius: "0.75rem",
              color: tooltipColor,
              fontSize: "0.8125rem",
            }}
            cursor={{ stroke: gridColor }}
          />
          <Area
            type="monotone"
            dataKey="estimate"
            stroke={strokeColor}
            strokeWidth={2}
            fill="url(#popFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
