"use client";

import { useQuery } from "@tanstack/react-query";

import type { MapDataset } from "@/types/map";

async function fetchMapDataset(): Promise<MapDataset> {
  const res = await fetch("/api/heatmap");
  if (!res.ok) throw new Error(`Heatmap fetch failed: ${res.status}`);
  return res.json() as Promise<MapDataset>;
}

export function useMapQuery() {
  return useQuery({
    queryKey: ["map-dataset"],
    queryFn: fetchMapDataset,
    staleTime: 60_000,
  });
}
