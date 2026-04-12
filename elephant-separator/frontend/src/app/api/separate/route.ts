import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const separatorBase =
    process.env.NEXT_PUBLIC_SEPARATOR_API_URL ?? "http://localhost:8000";

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  try {
    const upstream = await fetch(`${separatorBase}/separate`, {
      method: "POST",
      body: formData,
      signal: AbortSignal.timeout(300_000),
    });

    const payload = (await upstream.json().catch(async () => {
      const text = await upstream.text().catch(() => upstream.statusText);
      return { error: text };
    })) as Record<string, unknown> & { error?: string };

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

    return NextResponse.json({
      audioDataUrl: audioBase64 ? `data:${audioMimeType};base64,${audioBase64}` : null,
      originalSpectrogramDataUrl: originalSpectrogramBase64
        ? `data:image/png;base64,${originalSpectrogramBase64}`
        : null,
      processedSpectrogramDataUrl: processedSpectrogramBase64
        ? `data:image/png;base64,${processedSpectrogramBase64}`
        : null,
      annotations: Array.isArray(payload.annotations) ? payload.annotations : [],
      annotationCsv:
        typeof payload.annotation_csv === "string" ? payload.annotation_csv : null,
      model: typeof payload.model === "string" ? payload.model : null,
      device: typeof payload.device === "string" ? payload.device : null,
      note:
        typeof payload.device === "string"
          ? `Separation complete using ${String(payload.model ?? "NMFSeparator")} on ${payload.device}.`
          : "Separation complete.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        error:
          message.includes("ECONNREFUSED") || message.includes("fetch failed")
            ? "Python separator service is not running. Start it with `uvicorn api_server:app --port 8000` from the project root."
            : message,
      },
      { status: 503 },
    );
  }
}
