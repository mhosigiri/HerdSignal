"use client";

import { useEffect, useState } from "react";

import { fetchHeatmapData } from "@/lib/supabase/queries";
import type { MapCountryMetric } from "@/lib/map/types";

export type UseHeatmapDataResult = {
  data: MapCountryMetric[];
  loading: boolean;
  error: Error | null;
};

export function useHeatmapData(): UseHeatmapDataResult {
  const [data, setData] = useState<MapCountryMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchHeatmapData()
      .then((rows) => {
        if (process.env.NODE_ENV !== "production") {
          console.log("[useHeatmapData] data.length:", rows.length);
          if (rows[0]) {
            console.log("[useHeatmapData] first row:", rows[0]);
          }
        }
        if (!cancelled) {
          setData(rows);
          setError(null);
        }
      })
      .catch((e: unknown) => {
        if (process.env.NODE_ENV !== "production") {
          console.error("[useHeatmapData] fetch error:", e);
        }
        if (!cancelled) {
          setData([]);
          setError(e instanceof Error ? e : new Error(String(e)));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading, error };
}
