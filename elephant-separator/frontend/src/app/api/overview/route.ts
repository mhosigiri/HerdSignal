import { NextResponse } from "next/server";

import { getOverviewData } from "@/lib/api/overview";

export async function GET() {
  const data = await getOverviewData();
  return NextResponse.json(data);
}
