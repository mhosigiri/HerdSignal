export async function explainVoicePrompt(prompt: string) {
  const response = await fetch("/api/voice", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });

  const payload = (await response.json()) as {
    transcript?: string;
    response?: string;
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? "Voice request failed.");
  }

  return {
    transcript: payload.transcript ?? prompt,
    response: payload.response ?? "No response generated.",
  };
}
