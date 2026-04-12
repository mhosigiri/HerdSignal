"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { useEffect, useState } from "react";

import type { ThreatDatum } from "@/types/elephant";

export function ThreatDistribution({ data }: { data: ThreatDatum[] }) {
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

  const tooltipBg = isDark ? "#161616" : "#ffffff";
  const tooltipBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const tooltipColor = isDark ? "#fff" : "#1b1a16";

  return (
    <div>
      <p className="t-eyebrow" style={{ marginBottom: "0.5rem" }}>Threat mix</p>
      <p className="t-h3" style={{ marginBottom: "2rem" }}>Pressure by incident class</p>
      <div className="flex items-center gap-8">
        <ResponsiveContainer width={180} height={180}>
          <PieChart>
            <Pie
              data={data}
              dataKey="incidents"
              nameKey="name"
              innerRadius={55}
              outerRadius={88}
              strokeWidth={0}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: tooltipBg,
                border: `1px solid ${tooltipBorder}`,
                borderRadius: "0.75rem",
                color: tooltipColor,
                fontSize: "0.8125rem",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {data.map((entry) => (
            <div key={entry.name} className="flex items-center gap-2.5">
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: entry.color,
                  flexShrink: 0,
                }}
              />
              <span className="t-small">{entry.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
