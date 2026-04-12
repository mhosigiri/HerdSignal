import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// Groq is OpenAI-API compatible — reuse the openai npm package
const groq = new OpenAI({
  baseURL: "https://api.groq.com/openai/v1",
  apiKey: process.env.GROQ_API_KEY ?? "",
});

const SYSTEM_PROMPT = `You are an expert elephant conservation analyst with deep knowledge of African and Asian elephant populations, habitats, threats, and conservation strategies. Provide concise, accurate, and insightful responses grounded in conservation science. Focus on actionable insights relevant to rangers, researchers, and policymakers. Keep responses under 160 words.`;

export async function POST(req: NextRequest) {
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json(
      { error: "GROQ_API_KEY not configured on the server." },
      { status: 500 }
    );
  }

  try {
    const contentType = req.headers.get("content-type") ?? "";
    let transcript = "";

    if (contentType.includes("multipart/form-data")) {
      // Audio upload path → transcribe with Groq Whisper
      const formData = await req.formData();
      const audio = formData.get("audio") as File | null;
      const textPrompt = formData.get("prompt") as string | null;

      if (audio && audio.size > 0) {
        const transcription = await groq.audio.transcriptions.create({
          file: audio,
          model: "whisper-large-v3-turbo",
          language: "en",
          response_format: "text",
        });
        transcript =
          typeof transcription === "string"
            ? transcription
            : (transcription as { text?: string }).text ?? "";
      } else if (textPrompt) {
        transcript = textPrompt;
      }
    } else {
      // JSON path → text-only prompt
      const body = (await req.json()) as { prompt?: string };
      transcript = body.prompt ?? "";
    }

    if (!transcript.trim()) {
      return NextResponse.json({ error: "No prompt or audio provided." }, { status: 400 });
    }

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: transcript },
      ],
      max_tokens: 320,
      temperature: 0.65,
    });

    const response =
      completion.choices[0]?.message?.content ?? "No response generated.";

    return NextResponse.json({ transcript, response });
  } catch (err) {
    console.error("[/api/voice]", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
