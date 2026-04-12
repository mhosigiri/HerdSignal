export async function explainVoicePrompt(prompt: string) {
  return {
    transcript: prompt,
    response:
      "Voice mode is scaffolded. Connect this handler to Whisper, Supabase-backed facts, and TTS once those services are ready.",
  };
}

