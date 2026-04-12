import { mapDataset } from "@/lib/api/mock-data";

export async function getMigrationRoutes() {
  return mapDataset.migration;
}

