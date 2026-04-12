import { NextRequest, NextResponse } from "next/server";

const GROQ_TTS_URL = "https://api.groq.com/openai/v1/audio/speech";
const DEFAULT_VOICE = "daniel";

/* Orpheus max 200 chars per request — split on sentence boundaries */
function chunkText(text: string, maxLen = 195): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+\s?|[^.!?]+$/g) ?? [text];
  const chunks: string[] = [];
  let current = "";
  for (const s of sentences) {
    if ((current + s).length > maxLen) {
      if (current.trim()) chunks.push(current.trim());
      current = s;
    } else {
      current += s;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.length ? chunks : [text.slice(0, maxLen)];
}

function extractWavParts(wav: Buffer) {
  if (wav.toString("ascii", 0, 4) !== "RIFF" || wav.toString("ascii", 8, 12) !== "WAVE") {
    throw new Error("Groq TTS returned an invalid WAV container.");
  }

  let fmtChunk: Buffer | null = null;
  const dataParts: Buffer[] = [];
  let offset = 12;

  while (offset + 8 <= wav.length) {
    const chunkId = wav.toString("ascii", offset, offset + 4);
    const chunkSize = wav.readUInt32LE(offset + 4);
    const chunkStart = offset + 8;
    let chunkEnd = chunkStart + chunkSize;

    if (chunkId === "data" && chunkEnd > wav.length) {
      chunkEnd = wav.length;
    }

    if (chunkEnd > wav.length) {
      throw new Error("Groq TTS returned a truncated WAV chunk.");
    }

    const chunkData = wav.slice(chunkStart, chunkEnd);
    if (chunkId === "fmt ") {
      fmtChunk = Buffer.from(chunkData);
    } else if (chunkId === "data") {
      dataParts.push(Buffer.from(chunkData));
    }

    offset = chunkEnd + (chunkSize % 2);
  }

  if (!fmtChunk) {
    throw new Error("Groq TTS WAV is missing the fmt chunk.");
  }

  if (!dataParts.length) {
    throw new Error("Groq TTS WAV is missing the data chunk.");
  }

  return {
    fmtChunk,
    data: Buffer.concat(dataParts),
  };
}

function buildMergedWav(wavBuffers: Buffer[]) {
  const firstParts = extractWavParts(wavBuffers[0]);
  const fmtChunk = firstParts.fmtChunk;
  const dataParts = [firstParts.data];

  for (const wav of wavBuffers.slice(1)) {
    const parts = extractWavParts(wav);
    if (!parts.fmtChunk.equals(fmtChunk)) {
      throw new Error("Groq TTS returned incompatible audio formats across chunks.");
    }
    dataParts.push(parts.data);
  }

  const mergedData = Buffer.concat(dataParts);
  const fmtPadding = fmtChunk.length % 2;
  const riffSize = 4 + (8 + fmtChunk.length + fmtPadding) + (8 + mergedData.length);

  const header = Buffer.alloc(12);
  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(riffSize, 4);
  header.write("WAVE", 8, "ascii");

  const fmtHeader = Buffer.alloc(8);
  fmtHeader.write("fmt ", 0, "ascii");
  fmtHeader.writeUInt32LE(fmtChunk.length, 4);

  const dataHeader = Buffer.alloc(8);
  dataHeader.write("data", 0, "ascii");
  dataHeader.writeUInt32LE(mergedData.length, 4);

  const parts = [header, fmtHeader, fmtChunk];
  if (fmtPadding) {
    parts.push(Buffer.alloc(1));
  }
  parts.push(dataHeader, mergedData);

  return Buffer.concat(parts);
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY ?? "";
  const voice = (process.env.GROQ_TTS_VOICE ?? DEFAULT_VOICE).trim() || DEFAULT_VOICE;
  if (!apiKey) {
    return NextResponse.json({ error: "GROQ_API_KEY not configured." }, { status: 500 });
  }

  let text = "";
  try {
    const body = (await req.json()) as { text?: string };
    text = body.text?.trim() ?? "";
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!text) {
    return NextResponse.json({ error: "text is required." }, { status: 400 });
  }

  try {
    const chunks = chunkText(text);

    /* Hit the Groq REST endpoint directly — no SDK wrapping */
    const wavBuffers: Buffer[] = await Promise.all(
      chunks.map(async (chunk) => {
        const res = await fetch(GROQ_TTS_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "canopylabs/orpheus-v1-english",
            voice,
            input: chunk,
            response_format: "wav",
          }),
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => res.statusText);
          throw new Error(`Groq TTS error ${res.status}: ${errText}`);
        }

        const ab = await res.arrayBuffer();
        return Buffer.from(ab);
      }),
    );

    const merged = buildMergedWav(wavBuffers);

    return NextResponse.json({
      audio: `data:audio/wav;base64,${merged.toString("base64")}`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "TTS request failed.";
    console.error("[TTS]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
