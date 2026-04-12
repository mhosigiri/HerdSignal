export async function explainVoicePrompt(prompt: string): Promise<{
  transcript: string;
  response: string;
  audioDataUrl: string | null;
}> {
  /* 1. Get the LLM text response */
  const textRes = await fetch("/api/voice", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });

  const textPayload = (await textRes.json()) as {
    transcript?: string;
    response?: string;
    error?: string;
  };

  if (!textRes.ok) {
    throw new Error(textPayload.error ?? "Voice request failed.");
  }

  const responseText = textPayload.response ?? "No response generated.";

  /* 2. Convert response text to speech via Orpheus */
  let audioDataUrl: string | null = null;
  try {
    const ttsRes = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: responseText }),
    });
    if (ttsRes.ok) {
      const ttsPayload = (await ttsRes.json()) as { audio?: string; error?: string };
      audioDataUrl = ttsPayload.audio ?? null;
    }
  } catch {
    /* TTS failure is non-fatal — text response still shows */
  }

  return {
    transcript: textPayload.transcript ?? prompt,
    response: responseText,
    audioDataUrl,
  };
}
