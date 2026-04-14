import { NextRequest, NextResponse } from "next/server";

import { buildSeparationDownloadBundle } from "@/lib/separator/archive";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  let body: { runId?: string; downloadToken?: string };

  try {
    body = (await req.json()) as { runId?: string; downloadToken?: string };
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const runId = body.runId?.trim() ?? "";
  const downloadToken = body.downloadToken?.trim() ?? "";

  if (!runId || !downloadToken) {
    return NextResponse.json(
      { error: "runId and downloadToken are required." },
      { status: 400 },
    );
  }

  try {
    const { archiveFileName, zipBuffer } = await buildSeparationDownloadBundle({
      supabase: getSupabaseServerClient(),
      runId,
      downloadToken,
    });

    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${archiveFileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to build output archive.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
