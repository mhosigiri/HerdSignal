"use client";

import { useState } from "react";

import { explainVoicePrompt } from "@/lib/api/voice";
import { useVoiceStore } from "@/store/voiceStore";

import { SoundWaveScene } from "./SoundWaveScene";

export function VoiceMode() {
  const { isListening, response, setListening, setResponse, setTranscript, transcript } =
    useVoiceStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitPrompt = async () => {
    if (!transcript.trim()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await explainVoicePrompt(transcript);
      setTranscript(result.transcript);
      setResponse(result.response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Voice request failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      {/* ── Intro ── */}
      <p className="t-eyebrow" style={{ marginBottom: "0.75rem" }}>Voice mode</p>
      <h2 className="t-h2" style={{ marginBottom: "1rem" }}>
        Conversational conservation layer
      </h2>
      <p className="t-body" style={{ maxWidth: "52ch", marginBottom: "3rem" }}>
        Text prompts route through the backend voice API so you can swap models or providers
        without touching the client.
      </p>

      {/* ── 3D wave ── */}
      <div style={{ marginBottom: "3rem" }}>
        <SoundWaveScene activity={isListening ? 0.9 : 0.35} />
      </div>

      {/* ── Input ── */}
      <div style={{ marginBottom: "2rem" }}>
        <p className="t-small" style={{ color: "var(--c-200)", fontWeight: 500, marginBottom: "0.75rem" }}>
          Prompt or transcript
        </p>
        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          rows={5}
          placeholder="Ask a conservation or elephant-audio question…"
          className="field"
          style={{ resize: "vertical" }}
        />
        {error && (
          <p className="t-small" style={{ color: "var(--c-ember)", marginTop: "0.5rem" }}>
            {error}
          </p>
        )}
      </div>

      {/* ── Actions ── */}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "3rem" }}>
        <button
          type="button"
          onClick={() => setListening(!isListening)}
          className="btn"
          style={{
            background: isListening ? "var(--c-ember)" : "var(--c-white)",
            color: isListening ? "var(--c-white)" : "var(--c-void)",
            borderRadius: "9999px",
          }}
        >
          {isListening ? "Stop listening" : "Simulate listening"}
        </button>
        <button
          type="button"
          onClick={submitPrompt}
          disabled={isSubmitting}
          className="btn btn-ghost"
        >
          {isSubmitting ? "Generating…" : "Generate response"}
        </button>
      </div>

      {/* ── Response ── */}
      {response && (
        <div style={{ borderTop: "1px solid var(--c-600)", paddingTop: "2rem" }}>
          <p className="t-eyebrow" style={{ marginBottom: "1rem" }}>Narration draft</p>
          <p className="t-body" style={{ maxWidth: "65ch", lineHeight: 1.85 }}>
            {response}
          </p>
        </div>
      )}

      {/* ── Coming soon ── */}
      <div style={{ marginTop: "3rem", borderTop: "1px solid var(--c-600)", paddingTop: "2rem" }}>
        <p className="t-eyebrow" style={{ marginBottom: "1.25rem" }}>Next service hooks</p>
        <ul style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
          {[
            "Whisper or Realtime input for speech capture.",
            "Supabase queries for habitat, incidents, and audio metadata.",
            "TTS or narrated summaries after factual retrieval.",
          ].map((item) => (
            <li key={item} style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
              <span style={{
                width: "5px",
                height: "5px",
                borderRadius: "50%",
                background: "var(--c-gold)",
                flexShrink: 0,
                marginTop: "0.55rem",
              }} />
              <span className="t-body">{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
