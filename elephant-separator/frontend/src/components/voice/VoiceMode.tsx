"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { explainVoicePrompt } from "@/lib/api/voice";
import { useVoiceStore } from "@/store/voiceStore";

import { SoundWaveScene, type AudioMode } from "./SoundWaveScene";

type SpeechRecognitionResultLike = {
  0?: {
    transcript?: string;
  };
};

type SpeechRecognitionEventLike = {
  results: SpeechRecognitionResultLike[];
};

type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

/* ─── Audio engine ─────────────────────────────────────────────────────────
   All audio runs through a single shared AudioContext + AnalyserNode.
   • Mic  → MediaStreamSource → Analyser
   • TTS  → AudioBufferSource → Analyser + destination (speakers)
   This gives us real frequency data for both sources.
─────────────────────────────────────────────────────────────────────────── */

export function VoiceMode() {
  const { response, setResponse, setTranscript, transcript } = useVoiceStore();

  const [mode, setMode]             = useState<AudioMode>("idle");
  const [isSubmitting, setSubmit]   = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [ttsDataUrl, setTtsDataUrl] = useState<string | null>(null);
  const [isPlaying, setPlaying]     = useState(false);

  /* Shared audio nodes */
  const ctxRef      = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const freqRef     = useRef<Uint8Array<ArrayBuffer> | null>(null);

  /* Active source nodes (so we can stop them) */
  const micSrcRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const ttsSrcRef = useRef<AudioBufferSourceNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);

  /* RAF loop */
  const rafRef = useRef<number>(0);
  const ttsBufferRef = useRef<AudioBuffer | null>(null);

  /* ── Boot AudioContext once (must be triggered by user gesture) ────────── */
  const ensureCtx = useCallback((): AudioContext => {
    if (!ctxRef.current || ctxRef.current.state === "closed") {
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      ctxRef.current = ctx;
      analyserRef.current = analyser;
      freqRef.current = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
    }
    if (ctxRef.current.state === "suspended") void ctxRef.current.resume();
    return ctxRef.current;
  }, []);

  /* ── RAF: pull frequency data every frame ─────────────────────────────── */
  const startFreqLoop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    const tick = () => {
      if (analyserRef.current && freqRef.current) {
        analyserRef.current.getByteFrequencyData(freqRef.current);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const stopFreqLoop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    freqRef.current?.fill(0);
  }, []);

  /* ── Stop TTS playback ─────────────────────────────────────────────────── */
  const stopTts = useCallback(() => {
    try { ttsSrcRef.current?.stop(); } catch { /* already stopped */ }
    ttsSrcRef.current = null;
    setPlaying(false);
    setMode("idle");
    stopFreqLoop();
  }, [stopFreqLoop]);

  /* ── Play a pre-decoded AudioBuffer through the analyser ──────────────── */
  const playAudioBuffer = useCallback((buffer: AudioBuffer) => {
    const ctx = ensureCtx();
    const analyser = analyserRef.current!;

    /* Stop any current TTS */
    try { ttsSrcRef.current?.stop(); } catch { /* ok */ }

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(analyser);
    src.connect(ctx.destination);
    ttsSrcRef.current = src;

    src.onended = () => {
      ttsSrcRef.current = null;
      setPlaying(false);
      setMode("idle");
      stopFreqLoop();
    };

    src.start();
    setMode("speaking");
    setPlaying(true);
    startFreqLoop();
  }, [ensureCtx, startFreqLoop, stopFreqLoop]);

  /* ── Decode a data-URL WAV and cache it, then play ────────────────────── */
  const playDataUrl = useCallback(async (dataUrl: string) => {
    try {
      const ctx = ensureCtx();
      /* Strip the data URL prefix to get raw base64 */
      const base64 = dataUrl.split(",")[1];
      if (!base64) throw new Error("Invalid audio data URL");
      const binary = atob(base64);
      const bytes  = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const audioBuffer = await ctx.decodeAudioData(bytes.buffer);
      ttsBufferRef.current = audioBuffer;
      playAudioBuffer(audioBuffer);
    } catch (e) {
      console.error("[TTS playback]", e);
      setError("Audio playback failed. Try clicking again.");
      setMode("idle");
    }
  }, [ensureCtx, playAudioBuffer]);

  /* ── Mic ──────────────────────────────────────────────────────────────── */
  const stopMic = useCallback(() => {
    micSrcRef.current?.disconnect();
    micSrcRef.current = null;
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
    stopFreqLoop();
    setMode("idle");
  }, [stopFreqLoop]);

  const startMic = useCallback(async () => {
    try {
      const ctx = ensureCtx();
      const analyser = analyserRef.current!;

      /* Stop any TTS first */
      stopTts();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      micStreamRef.current = stream;

      const src = ctx.createMediaStreamSource(stream);
      src.connect(analyser);
      micSrcRef.current = src;

      setMode("listening");
      startFreqLoop();

      /* Web Speech API for transcription */
      const speechWindow = window as typeof window & {
        SpeechRecognition?: SpeechRecognitionCtor;
        webkitSpeechRecognition?: SpeechRecognitionCtor;
      };
      const SpeechRecog =
        speechWindow.SpeechRecognition ??
        speechWindow.webkitSpeechRecognition;

      if (SpeechRecog) {
        const recog = new SpeechRecog();
        recog.continuous = false;
        recog.interimResults = false;
        recog.lang = "en-US";
        recog.onresult = (ev: SpeechRecognitionEventLike) => {
          const spoken = ev.results[0]?.[0]?.transcript ?? "";
          if (spoken.trim()) setTranscript(spoken.trim());
        };
        recog.onend  = stopMic;
        recog.onerror = stopMic;
        recog.start();
      }
    } catch {
      setError("Microphone access denied. Type your prompt instead.");
      setMode("idle");
    }
  }, [ensureCtx, startFreqLoop, stopMic, stopTts, setTranscript]);

  const toggleMic = useCallback(() => {
    if (mode === "listening") stopMic();
    else void startMic();
  }, [mode, startMic, stopMic]);

  /* ── Submit ────────────────────────────────────────────────────────────── */
  const submitPrompt = useCallback(async () => {
    if (!transcript.trim()) return;
    stopMic();
    stopTts();
    setSubmit(true);
    setError(null);
    setTtsDataUrl(null);
    ttsBufferRef.current = null;

    try {
      const result = await explainVoicePrompt(transcript);
      setTranscript(result.transcript);
      setResponse(result.response);

      if (result.audioDataUrl) {
        setTtsDataUrl(result.audioDataUrl);
        await playDataUrl(result.audioDataUrl);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Voice request failed.");
    } finally {
      setSubmit(false);
    }
  }, [transcript, stopMic, stopTts, setTranscript, setResponse, playDataUrl]);

  /* ── Cleanup ───────────────────────────────────────────────────────────── */
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      try { ttsSrcRef.current?.stop(); } catch { /* ok */ }
      micSrcRef.current?.disconnect();
      micStreamRef.current?.getTracks().forEach((t) => t.stop());
      void ctxRef.current?.close();
    };
  }, []);

  /* ─── Render ──────────────────────────────────────────────────────────── */
  return (
    <div>
      <p className="t-eyebrow" style={{ marginBottom: "0.75rem" }}>Voice mode</p>
      <h2 className="t-h2" style={{ marginBottom: "1rem" }}>
        Conversational conservation layer
      </h2>
      <p className="t-body" style={{ maxWidth: "52ch", marginBottom: "3rem" }}>
        Speak or type a conservation question. The assistant replies and reads the answer aloud
        via Orpheus TTS — the spectrum reacts to both your voice and the model&apos;s speech.
      </p>

      {/* Circular particle spectrum */}
      <div style={{ marginBottom: "2.5rem" }}>
        <SoundWaveScene freqData={freqRef} mode={mode} />
      </div>

      {/* Prompt input */}
      <div style={{ marginBottom: "2rem" }}>
        <p className="t-small" style={{ color: "var(--c-200)", fontWeight: 500, marginBottom: "0.75rem" }}>
          Prompt or transcript
        </p>
        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void submitPrompt();
            }
          }}
          rows={4}
          placeholder="Ask a conservation or elephant-audio question… (⌘↵ to send)"
          className="field"
          style={{ resize: "vertical" }}
        />
        {error && (
          <p className="t-small" style={{ color: "var(--c-ember)", marginTop: "0.5rem" }}>
            {error}
          </p>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "3rem" }}>
        <button
          type="button"
          onClick={toggleMic}
          disabled={isSubmitting}
          className="btn"
          style={{
            background: mode === "listening" ? "var(--c-ember)" : "rgba(255,255,255,0.08)",
            color: mode === "listening" ? "#fff" : "rgba(255,255,255,0.75)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "9999px",
            gap: "0.45rem",
          }}
        >
          {mode === "listening" ? "⏹ Stop mic" : "🎤 Speak"}
        </button>

        <button
          type="button"
          onClick={() => void submitPrompt()}
          disabled={isSubmitting || !transcript.trim()}
          className="btn btn-primary"
        >
          {isSubmitting ? "Generating…" : "Send"}
        </button>

        {ttsDataUrl && (
          <button
            type="button"
            onClick={() => {
              if (isPlaying) {
                stopTts();
              } else if (ttsBufferRef.current) {
                playAudioBuffer(ttsBufferRef.current);
              } else {
                void playDataUrl(ttsDataUrl);
              }
            }}
            className="btn btn-ghost"
          >
            {isPlaying ? "⏸ Stop" : "▶ Replay"}
          </button>
        )}
      </div>

      {/* Response */}
      {response && (
        <div style={{ borderTop: "1px solid var(--c-600)", paddingTop: "2rem" }}>
          <p className="t-eyebrow" style={{ marginBottom: "1rem" }}>
            {isPlaying ? "● Speaking…" : "Narration"}
          </p>
          <p className="t-body" style={{ maxWidth: "65ch", lineHeight: 1.85 }}>
            {response}
          </p>
        </div>
      )}
    </div>
  );
}
