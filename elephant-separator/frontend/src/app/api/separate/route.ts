import { NextRequest, NextResponse } from "next/server";

import { archiveSeparationOutputs } from "@/lib/separator/archive";
import {
  getSupabaseServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import type { GeneratedAnnotation } from "@/types/audio";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const separatorBase =
    process.env.SEPARATOR_API_URL ??
    process.env.NEXT_PUBLIC_SEPARATOR_API_URL ??
    "http://localhost:8000";

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const uploadedFile = formData.get("file");
  if (!(uploadedFile instanceof File)) {
    return NextResponse.json({ error: "Audio file is required." }, { status: 400 });
  }

  const selectedNoiseType =
    typeof formData.get("noise_type") === "string"
      ? String(formData.get("noise_type") ?? "").trim() || "vehicle"
      : "vehicle";

  const startedAt = new Date().toISOString();
  const sourceBytes = Buffer.from(await uploadedFile.arrayBuffer());
  const upstreamForm = new FormData();
  upstreamForm.append(
    "file",
    new File([sourceBytes], uploadedFile.name, {
      type: uploadedFile.type || "application/octet-stream",
    }),
  );
  upstreamForm.append("noise_type", selectedNoiseType);

  try {
    const upstream = await fetch(`${separatorBase}/separate`, {
      method: "POST",
      body: upstreamForm,
      signal: AbortSignal.timeout(300_000),
    });

    const payload = (await upstream.json().catch(async () => {
      const text = await upstream.text().catch(() => upstream.statusText);
      return { error: text };
    })) as Record<string, unknown> & {
      error?: string;
      audio_base64?: string;
      audio_mime_type?: string;
      original_spectrogram_base64?: string;
      processed_spectrogram_base64?: string;
      annotations?: unknown[];
      annotation_csv?: string;
      model?: string;
      device?: string;
      note?: string;
      info?: Record<string, unknown>;
      file_name?: string;
      sample_rate?: number;
      duration_seconds?: number;
      noise_type?: string;
    };

    if (!upstream.ok) {
      return NextResponse.json(
        { error: payload.error ?? `Separator service error (${upstream.status})` },
        { status: upstream.status },
      );
    }

    const audioBase64 = typeof payload.audio_base64 === "string" ? payload.audio_base64 : null;
    const audioMimeType =
      typeof payload.audio_mime_type === "string" ? payload.audio_mime_type : "audio/wav";
    const originalSpectrogramBase64 =
      typeof payload.original_spectrogram_base64 === "string"
        ? payload.original_spectrogram_base64
        : null;
    const processedSpectrogramBase64 =
      typeof payload.processed_spectrogram_base64 === "string"
        ? payload.processed_spectrogram_base64
        : null;
    const annotationCsv =
      typeof payload.annotation_csv === "string" ? payload.annotation_csv : null;
    const annotations = Array.isArray(payload.annotations) ? payload.annotations : [];

    let separationRunId: string | null = null;
    let downloadToken: string | null = null;
    let archiveFileName: string | null = null;
    let archiveError: string | null = null;

    if (
      audioBase64 &&
      originalSpectrogramBase64 &&
      processedSpectrogramBase64 &&
      annotationCsv &&
      isSupabaseServerConfigured()
    ) {
      try {
        const archive = await archiveSeparationOutputs({
          supabase: getSupabaseServerClient(),
          sourceFileName: uploadedFile.name,
          sourceMimeType: uploadedFile.type || null,
          sourceBytes,
          selectedNoiseType,
          payload: {
            file_name: typeof payload.file_name === "string" ? payload.file_name : uploadedFile.name,
            sample_rate:
              typeof payload.sample_rate === "number" ? payload.sample_rate : 44_100,
            duration_seconds:
              typeof payload.duration_seconds === "number" ? payload.duration_seconds : 0,
            noise_type:
              typeof payload.noise_type === "string" ? payload.noise_type : selectedNoiseType,
            model: typeof payload.model === "string" ? payload.model : "NMFSeparator",
            device: typeof payload.device === "string" ? payload.device : "cpu",
            audio_base64: audioBase64,
            audio_mime_type:
              typeof payload.audio_mime_type === "string" ? payload.audio_mime_type : "audio/wav",
            original_spectrogram_base64: originalSpectrogramBase64,
            processed_spectrogram_base64: processedSpectrogramBase64,
            annotations: annotations as GeneratedAnnotation[],
            annotation_csv: annotationCsv,
            info: payload.info,
          },
          startedAt,
        });
        separationRunId = archive.runId;
        downloadToken = archive.downloadToken;
        archiveFileName = archive.archiveFileName;
      } catch (error) {
        console.error("[separator archive]", error);
        archiveError =
          error instanceof Error ? error.message : "Archiving separator outputs failed.";
      }
    } else if (!isSupabaseServerConfigured()) {
      archiveError =
        "Supabase server credentials are missing, so archived output downloads are unavailable.";
    }

    return NextResponse.json({
      audioDataUrl: audioBase64 ? `data:${audioMimeType};base64,${audioBase64}` : null,
      originalSpectrogramDataUrl: originalSpectrogramBase64
        ? `data:image/png;base64,${originalSpectrogramBase64}`
        : null,
      processedSpectrogramDataUrl: processedSpectrogramBase64
        ? `data:image/png;base64,${processedSpectrogramBase64}`
        : null,
      annotations,
      annotationCsv,
      model: typeof payload.model === "string" ? payload.model : null,
      device: typeof payload.device === "string" ? payload.device : null,
      separationRunId,
      downloadToken,
      archiveFileName,
      archiveReady: Boolean(separationRunId && downloadToken),
      archiveError,
      note:
        archiveError
          ? `Separation complete, but archived output storage is unavailable: ${archiveError}`
          : typeof payload.device === "string"
            ? `Separation complete using ${String(payload.model ?? "NMFSeparator")} on ${payload.device}. Archived outputs are ready for Download output files.`
            : "Separation complete. Archived outputs are ready for Download output files.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        error:
          message.includes("ECONNREFUSED") || message.includes("fetch failed")
            ? "Separator service is unreachable. For local dev, start `uvicorn api_server:app --port 8000` from `elephant-separator/`. For deployment, set `SEPARATOR_API_URL` or `NEXT_PUBLIC_SEPARATOR_API_URL` to the Cloud Run backend URL."
            : message,
      },
      { status: 503 },
    );
  }
}
