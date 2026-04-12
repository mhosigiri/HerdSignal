import { NextRequest, NextResponse } from "next/server";

import OpenAI from "openai";

const apiKey = process.env.GROQ_API_KEY ?? "";

const groq = new OpenAI({
  baseURL: "https://api.groq.com/openai/v1",
  apiKey,
});

const SYSTEM_PROMPT =
  "You are an expert elephant conservation analyst. Keep responses concise, practical, and grounded in elephant habitats, threats, field acoustics, and conservation operations.";

export async function POST(req: NextRequest) {
  let prompt = "";

  try {
    const body = (await req.json()) as { prompt?: string };
    prompt = body.prompt?.trim() ?? "";
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!prompt) {
    return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
  }

  if (!apiKey) {
    return NextResponse.json(
      {
        transcript: prompt,
        response:
          "GROQ_API_KEY is not configured, so the voice assistant is currently returning a local fallback response. Configure the key to enable live model-backed answers.",
      },
      { status: 200 },
    );
  }

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      max_tokens: 320,
      temperature: 0.5,
    });

    return NextResponse.json({
      transcript: prompt,
      response:
        completion.choices[0]?.message?.content ?? "No response generated.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Voice request failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
