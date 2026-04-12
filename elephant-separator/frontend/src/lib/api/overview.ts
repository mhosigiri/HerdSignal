import {
  audioAssets,
  habitatCoverage,
  populationTrend,
  summaryMetrics,
  threatBreakdown,
} from "@/lib/api/mock-data";

export async function getOverviewData() {
  return {
    summaryMetrics,
    populationTrend,
    threatBreakdown,
    habitatCoverage,
    audioAssets,
  };
}

