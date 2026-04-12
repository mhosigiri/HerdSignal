"use client";

import { useQuery } from "@tanstack/react-query";

import { mapDataset } from "@/lib/api/mock-data";

export function useMapQuery() {
  return useQuery({
    queryKey: ["map-dataset"],
    queryFn: async () => mapDataset,
    staleTime: 60_000,
  });
}

