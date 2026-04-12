"use client";

import { useRef, useState } from "react";

import { useVoiceStore } from "@/store/voiceStore";

import { SoundWaveScene } from "./SoundWaveScene";

type RecordingState = "idle" | "recording" | "transcribing";

export function VoiceMode() {
  const { isListening, response, setListening, setResponse, setTranscript, transcript } =
    useVoiceStore();

  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // ── microphone recording ────────────────────────────────────────────────

  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Prefer webm/opus; fall back to browser default
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "";
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.start(200); // collect chunks every 200 ms
      setRecordingState("recording");
      setListening(true);
    } catch {
      setError("Microphone access denied — type your question in the text box instead.");
    }
  };

  const stopRecordingAndTranscribe = async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;

    recorder.stop();
    recorder.stream.getTracks().forEach((t) => t.stop());
    setRecordingState("transcribing");
    setListening(false);

    // Wait for the onstop event to fire so all chunks are available
    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
    });

    const mimeType = recorder.mimeType || "audio/webm";
    const blob = new Blob(audioChunksRef.current, { type: mimeType });
    const ext = mimeType.includes("webm") ? "webm" : "ogg";

    const formData = new FormData();
    formData.append("audio", blob, `recording.${ext}`);

    try {
      const res = await fetch("/api/voice", { method: "POST", body: formData });
      const data = (await res.json()) as { transcript?: string; response?: string; error?: string };
      if (data.error) setError(data.error);
      if (data.transcript) setTranscript(data.transcript);
      if (data.response) setResponse(data.response);
    } catch {
      setError("Transcription request failed — check your network connection.");
    } finally {
      setRecordingState("idle");
    }
  };

  const handleMicButton = () => {
    if (recordingState === "recording") {
      stopRecordingAndTranscribe();
    } else if (recordingState === "idle") {
      startRecording();
    }
  };

  // ── text-prompt submit ──────────────────────────────────────────────────

  const submitTextPrompt = async () => {
    if (!transcript.trim()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: transcript }),
      });
      const data = (await res.json()) as { response?: string; error?: string };
      if (data.error) setError(data.error);
      if (data.response) setResponse(data.response);
    } catch {
      setError("Request failed — check your network connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── derived UI state ────────────────────────────────────────────────────

  const isWorking = isSubmitting || recordingState === "transcribing";
  const micLabel =
    recordingState === "recording"
      ? "Stop & transcribe"
      : recordingState === "transcribing"
        ? "Transcribing…"
        : "Start listening";

  return (
    <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
      {/* ── Left panel ─────────────────────────────────────────────────── */}
      <div className="space-y-6 rounded-[2rem] border border-stone-200/80 bg-[#f7f1e6] p-6 shadow-[0_20px_80px_rgba(56,44,29,0.08)]">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-stone-500">Voice mode</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900">
            Conversational conservation layer
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
            Speak or type a conservation question. Groq Whisper transcribes your voice; Llama&nbsp;3.3 provides the analysis.
          </p>
        </div>

        {/* Transcript input */}
        <div className="rounded-[1.75rem] bg-white p-5">
          <label className="block text-sm font-medium text-stone-800">
            Prompt or transcript
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={5}
              placeholder="e.g. Where are habitat pressures rising fastest this year?"
              className="mt-3 w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm text-stone-800 outline-none transition focus:border-[#27452d]"
            />
          </label>

          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleMicButton}
              disabled={recordingState === "transcribing"}
              className={`rounded-full px-5 py-3 text-sm font-medium transition disabled:opacity-50 ${
                recordingState === "recording"
                  ? "animate-pulse bg-[#d76848] text-white"
                  : "bg-[#27452d] text-stone-50 hover:bg-[#1c3522]"
              }`}
            >
              {micLabel}
            </button>

            <button
              type="button"
              onClick={submitTextPrompt}
              disabled={isWorking || !transcript.trim()}
              className="rounded-full border border-stone-300 px-5 py-3 text-sm font-medium text-stone-700 transition hover:bg-stone-100 disabled:opacity-50"
            >
              {isSubmitting ? "Generating…" : "Generate response"}
            </button>
          </div>
        </div>

        {/* Response */}
        <div className="rounded-[1.75rem] bg-[#112217] p-5 text-stone-100">
          <p className="text-xs uppercase tracking-[0.28em] text-stone-400">Narration</p>
          <p className="mt-3 min-h-[4rem] text-sm leading-7 text-stone-200">
            {response || "Ask a question to receive a conservation insight."}
          </p>
        </div>
      </div>

      {/* ── Right panel ────────────────────────────────────────────────── */}
      <div className="space-y-6">
        <SoundWaveScene
          activity={
            recordingState === "recording" ? 0.9 : isWorking ? 0.6 : isListening ? 0.55 : 0.3
          }
        />

        <div className="rounded-[2rem] border border-white/10 bg-[#102017] p-6 text-stone-100 shadow-[0_24px_80px_rgba(8,18,14,0.35)]">
          <p className="text-xs uppercase tracking-[0.28em] text-stone-400">Powered by</p>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-stone-300">
            <li>
              <span className="text-stone-100">Groq Whisper large-v3-turbo</span> — low-latency speech
              transcription.
            </li>
            <li>
              <span className="text-stone-100">Llama 3.3 70B</span> — conservation analysis and
              field insights.
            </li>
            <li>
              <span className="text-stone-100">Supabase</span> — habitat, incident, and audio
              metadata backing.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
