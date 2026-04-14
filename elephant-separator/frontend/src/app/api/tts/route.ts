import { NextRequest, NextResponse } from "next/server";

const GROQ_TTS_URL = "https://api.groq.com/openai/v1/audio/speech";
const DEFAULT_VOICE = "daniel";
const RIFF_HEADER = "RIFF";
const WAVE_HEADER = "WAVE";
const FMT_CHUNK = "fmt ";
const DATA_CHUNK = "data";
const asciiDecoder = new TextDecoder("ascii");

export const runtime = "edge";

/* Orpheus max 200 chars per request — split on sentence boundaries */
function chunkText(text: string, maxLen = 195): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+\s?|[^.!?]+$/g) ?? [text];
  const chunks: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    if ((current + sentence).length > maxLen) {
      if (current.trim()) chunks.push(current.trim());
      current = sentence;
    } else {
      current += sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.length ? chunks : [text.slice(0, maxLen)];
}

function readAscii(bytes: Uint8Array, start: number, end: number): string {
  return asciiDecoder.decode(bytes.subarray(start, end));
}

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return false;
  }
  return true;
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
  const merged = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of parts) {
    merged.set(part, offset);
    offset += part.length;
  }
  return merged;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function extractWavParts(wav: Uint8Array) {
  if (readAscii(wav, 0, 4) !== RIFF_HEADER || readAscii(wav, 8, 12) !== WAVE_HEADER) {
    throw new Error("Groq TTS returned an invalid WAV container.");
  }

  const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
  let fmtChunk: Uint8Array | null = null;
  const dataParts: Uint8Array[] = [];
  let offset = 12;

  while (offset + 8 <= wav.length) {
    const chunkId = readAscii(wav, offset, offset + 4);
    const chunkSize = view.getUint32(offset + 4, true);
    const chunkStart = offset + 8;
    let chunkEnd = chunkStart + chunkSize;

    if (chunkId === DATA_CHUNK && chunkEnd > wav.length) {
      chunkEnd = wav.length;
    }

    if (chunkEnd > wav.length) {
      throw new Error("Groq TTS returned a truncated WAV chunk.");
    }

    const chunkData = wav.slice(chunkStart, chunkEnd);
    if (chunkId === FMT_CHUNK) {
      fmtChunk = chunkData.slice();
    } else if (chunkId === DATA_CHUNK) {
      dataParts.push(chunkData.slice());
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
    data: concatBytes(dataParts),
  };
}

function buildMergedWav(wavBuffers: Uint8Array[]): Uint8Array {
  const firstParts = extractWavParts(wavBuffers[0]);
  const fmtChunk = firstParts.fmtChunk;
  const dataParts = [firstParts.data];

  for (const wav of wavBuffers.slice(1)) {
    const parts = extractWavParts(wav);
    if (!equalBytes(parts.fmtChunk, fmtChunk)) {
      throw new Error("Groq TTS returned incompatible audio formats across chunks.");
    }
    dataParts.push(parts.data);
  }

  const mergedData = concatBytes(dataParts);
  const fmtPadding = fmtChunk.length % 2;
  const riffSize = 4 + (8 + fmtChunk.length + fmtPadding) + (8 + mergedData.length);

  const header = new Uint8Array(12);
  header.set([82, 73, 70, 70], 0);
  new DataView(header.buffer).setUint32(4, riffSize, true);
  header.set([87, 65, 86, 69], 8);

  const fmtHeader = new Uint8Array(8);
  fmtHeader.set([102, 109, 116, 32], 0);
  new DataView(fmtHeader.buffer).setUint32(4, fmtChunk.length, true);

  const dataHeader = new Uint8Array(8);
  dataHeader.set([100, 97, 116, 97], 0);
  new DataView(dataHeader.buffer).setUint32(4, mergedData.length, true);

  const parts: Uint8Array[] = [header, fmtHeader, fmtChunk];
  if (fmtPadding) {
    parts.push(new Uint8Array(1));
  }
  parts.push(dataHeader, mergedData);

  return concatBytes(parts);
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
    const wavBuffers = await Promise.all(
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

        return new Uint8Array(await res.arrayBuffer());
      }),
    );

    const merged = buildMergedWav(wavBuffers);

    return NextResponse.json({
      audio: `data:audio/wav;base64,${bytesToBase64(merged)}`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "TTS request failed.";
    console.error("[TTS]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
