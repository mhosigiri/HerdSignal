import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const separatorBase =
    process.env.NEXT_PUBLIC_SEPARATOR_API_URL ?? "http://localhost:8000";

  let incomingForm: FormData;
  try {
    incomingForm = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  // Rebuild FormData so file metadata (name, type) is preserved across the proxy hop.
  const outgoingForm = new FormData();
  const file = incomingForm.get("file");
  const noiseType = incomingForm.get("noise_type") ?? "vehicle";

  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: "Missing 'file' field." }, { status: 400 });
  }

  // Preserve original filename — fallback to "upload.wav"
  const fileName =
    file instanceof File && file.name ? file.name : "upload.wav";
  outgoingForm.append("file", file, fileName);
  outgoingForm.append("noise_type", String(noiseType));

  try {
    const upstream = await fetch(`${separatorBase}/separate`, {
      method: "POST",
      body: outgoingForm,
      signal: AbortSignal.timeout(300_000), // 5 min for heavy separation jobs
    });

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => upstream.statusText);
      return NextResponse.json(
        { error: `Separator service error (${upstream.status}): ${text}` },
        { status: upstream.status },
      );
    }

    // The Python server returns JSON with base64-encoded assets.
    const payload = (await upstream.json()) as {
      audio_base64?: string;
      audio_mime_type?: string;
      original_spectrogram_base64?: string;
      processed_spectrogram_base64?: string;
      annotations?: unknown[];
      annotation_csv?: string;
      model?: string;
      device?: string;
      info?: Record<string, unknown>;
      noise_type?: string;
      duration_seconds?: number;
    };

    // Convert raw base64 blobs to browser-ready data-URLs.
    const audioDataUrl = payload.audio_base64
      ? `data:${payload.audio_mime_type ?? "audio/wav"};base64,${payload.audio_base64}`
      : null;
    const originalSpectrogramDataUrl = payload.original_spectrogram_base64
      ? `data:image/png;base64,${payload.original_spectrogram_base64}`
      : null;
    const processedSpectrogramDataUrl = payload.processed_spectrogram_base64
      ? `data:image/png;base64,${payload.processed_spectrogram_base64}`
      : null;

    return NextResponse.json({
      audioDataUrl,
      originalSpectrogramDataUrl,
      processedSpectrogramDataUrl,
      annotations: payload.annotations ?? [],
      annotationCsv: payload.annotation_csv ?? null,
      model: payload.model ?? "DeepLearningSeparator",
      device: payload.device ?? null,
      info: payload.info ?? {},
      note: `Separation complete using ${payload.model ?? "DeepLearningSeparator"} on ${payload.device ?? "local device"}.`,
      noiseType: payload.noise_type ?? null,
      durationSeconds: payload.duration_seconds ?? null,
    });
  } catch (err) {
    console.error("[/api/separate]", err);
    const message = err instanceof Error ? err.message : String(err);

    if (
      message.includes("ECONNREFUSED") ||
      message.includes("fetch failed") ||
      message.includes("TimeoutError") ||
      message.includes("timeout")
    ) {
      return NextResponse.json(
        {
          error:
            "Python separator service is not running. Start it with:\n" +
            "  cd elephant-separator && source .venv/bin/activate\n" +
            "  uvicorn api_server:app --port 8000",
        },
        { status: 503 },
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
