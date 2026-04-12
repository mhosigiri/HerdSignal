"use client";

import { useState } from "react";

import { explainVoicePrompt } from "@/lib/api/voice";
import { useVoiceStore } from "@/store/voiceStore";

import { SoundWaveScene } from "./SoundWaveScene";

export function VoiceMode() {
  const { isListening, response, setListening, setResponse, setTranscript, transcript } =
    useVoiceStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitPrompt = async () => {
    setIsSubmitting(true);
    const result = await explainVoicePrompt(transcript);
    setResponse(result.response);
    setIsSubmitting(false);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
      <div className="space-y-6 rounded-[2rem] border border-stone-200/80 bg-[#f7f1e6] p-6 shadow-[0_20px_80px_rgba(56,44,29,0.08)]">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-stone-500">Voice mode</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900">
            Conversational conservation layer
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
            This interface is ready for Whisper transcription, Supabase-backed facts, and TTS response streaming. For now it uses a local mock explanation path.
          </p>
        </div>

        <div className="rounded-[1.75rem] bg-white p-5">
          <label className="block text-sm font-medium text-stone-800">
            Prompt or transcript
            <textarea
              value={transcript}
              onChange={(event) => setTranscript(event.target.value)}
              rows={5}
              className="mt-3 w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm text-stone-800 outline-none transition focus:border-[#27452d]"
            />
          </label>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setListening(!isListening)}
              className={`rounded-full px-5 py-3 text-sm font-medium ${
                isListening
                  ? "bg-[#d76848] text-white"
                  : "bg-[#27452d] text-stone-50"
              }`}
            >
              {isListening ? "Stop listening" : "Simulate listening"}
            </button>
            <button
              type="button"
              onClick={submitPrompt}
              disabled={isSubmitting}
              className="rounded-full border border-stone-300 px-5 py-3 text-sm font-medium text-stone-700 disabled:opacity-50"
            >
              {isSubmitting ? "Generating" : "Generate response"}
            </button>
          </div>
        </div>

        <div className="rounded-[1.75rem] bg-[#112217] p-5 text-stone-100">
          <p className="text-xs uppercase tracking-[0.28em] text-stone-400">Narration draft</p>
          <p className="mt-3 text-sm leading-7 text-stone-200">{response}</p>
        </div>
      </div>

      <div className="space-y-6">
        <SoundWaveScene activity={isListening ? 0.9 : 0.35} />
        <div className="rounded-[2rem] border border-white/10 bg-[#102017] p-6 text-stone-100 shadow-[0_24px_80px_rgba(8,18,14,0.35)]">
          <p className="text-xs uppercase tracking-[0.28em] text-stone-400">Next service hooks</p>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-stone-300">
            <li>Whisper or Realtime input for speech capture.</li>
            <li>Supabase queries for habitat, incidents, and audio metadata.</li>
            <li>TTS or narrated summaries after factual retrieval.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

