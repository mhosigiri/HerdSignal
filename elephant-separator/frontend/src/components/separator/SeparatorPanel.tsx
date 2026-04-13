"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";

import { useAudioStore } from "@/store/audioStore";

import { AudioPlayer } from "./AudioPlayer";
import { SeparationProgress } from "./SeparationProgress";
import { SpectrogramView } from "./SpectrogramView";

const NOISE_TYPES = ["vehicle", "airplane", "generator"] as const;
type NoiseType = (typeof NOISE_TYPES)[number];

const NOISE_KEYWORDS: Record<NoiseType, string[]> = {
  vehicle: ["vehicle", "car", "cars", "truck", "trucks", "traffic"],
  airplane: ["airplane", "plane", "aircraft", "jet"],
  generator: ["generator", "gen", "genset"],
};

function detectNoiseTypeFromFileName(fileName: string): NoiseType | null {
  const normalized = fileName.toLowerCase();
  for (const type of NOISE_TYPES) {
    if (NOISE_KEYWORDS[type].some((keyword) => normalized.includes(keyword))) {
      return type;
    }
  }
  return null;
}

type SeparationResponse = {
  audioDataUrl?: string;
  originalSpectrogramDataUrl?: string | null;
  processedSpectrogramDataUrl?: string | null;
  annotations?: Array<{
    annotation_id: string;
    start_time: number;
    end_time: number;
    duration_seconds: number;
    peak_amplitude: number;
    confidence: number;
  }>;
  annotationCsv?: string | null;
  model?: string | null;
  device?: string | null;
  note?: string | null;
  error?: string;
};

export function SeparatorPanel() {
  const {
    fileName,
    note,
    originalUrl,
    processedUrl,
    originalSpectrogramUrl,
    processedSpectrogramUrl,
    annotations,
    annotationCsv,
    model,
    device,
    progress,
    reset,
    setComplete,
    setError,
    setProcessing,
    setUpload,
    status,
  } = useAudioStore();

  const processedRef = useRef<string | null>(null);
  const [selectedNoiseType, setSelectedNoiseType] = useState<NoiseType>("vehicle");
  const [autoDetectedNoiseType, setAutoDetectedNoiseType] = useState<NoiseType | null>(null);

  useEffect(() => {
    processedRef.current = processedUrl;
  }, [processedUrl]);

  useEffect(() => {
    return () => {
      if (originalUrl?.startsWith("blob:")) URL.revokeObjectURL(originalUrl);
      if (
        processedRef.current &&
        processedRef.current !== originalUrl &&
        processedRef.current.startsWith("blob:")
      ) {
        URL.revokeObjectURL(processedRef.current);
      }
    };
  }, [originalUrl]);

  const handleReset = () => {
    setSelectedNoiseType("vehicle");
    setAutoDetectedNoiseType(null);
    reset();
  };

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const detectedNoiseType = detectNoiseTypeFromFileName(file.name);
    setSelectedNoiseType(detectedNoiseType ?? "vehicle");
    setAutoDetectedNoiseType(detectedNoiseType);
    setUpload({ fileName: file.name, originalUrl: URL.createObjectURL(file) });
  };

  const startSeparation = async () => {
    if (!originalUrl || !fileName) {
      setError("Upload an audio recording before starting the separator.");
      return;
    }
    try {
      setProcessing(10);
      const blob = await fetch(originalUrl).then((r) => r.blob());
      const form = new FormData();
      form.append("file", blob, fileName);
      form.append("noise_type", selectedNoiseType);
      setProcessing(35);
      const res = await fetch("/api/separate", { method: "POST", body: form });
      setProcessing(75);
      const payload = (await res.json()) as SeparationResponse;
      if (!res.ok) throw new Error(payload.error ?? "Separation failed.");
      if (
        processedRef.current &&
        processedRef.current !== originalUrl &&
        processedRef.current.startsWith("blob:")
      ) {
        URL.revokeObjectURL(processedRef.current);
      }
      if (!payload.audioDataUrl) throw new Error("No processed audio returned.");
      processedRef.current = payload.audioDataUrl;
      setComplete({
        processedUrl: payload.audioDataUrl,
        originalSpectrogramUrl: payload.originalSpectrogramDataUrl ?? null,
        processedSpectrogramUrl: payload.processedSpectrogramDataUrl ?? null,
        annotations: payload.annotations ?? [],
        annotationCsv: payload.annotationCsv ?? null,
        model: payload.model ?? null,
        device: payload.device ?? null,
        note:
          payload.note ??
          "Separation complete. Processed audio, spectrograms, and annotations are ready.",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown separation error.");
    }
  };

  const isProcessing = status === "processing";

  return (
    <div>
      {/* ── Intro ── */}
      <p className="t-eyebrow" style={{ marginBottom: "0.75rem" }}>Acoustic separator</p>
      <h2 className="t-h2" style={{ marginBottom: "1rem" }}>
        Upload and isolate elephant calls
      </h2>
      <p className="t-body" style={{ maxWidth: "52ch", marginBottom: "3rem" }}>
        Sends the recording to the separator API, runs the tuned NMF baseline, and
        returns processed audio, spectrograms, and call annotations.
      </p>

      {/* ── Upload ── */}
      <div style={{ marginBottom: "2.5rem" }}>
        <p className="t-small" style={{ color: "var(--c-200)", fontWeight: 500, marginBottom: "0.75rem" }}>
          Field recording
        </p>
        <input
          type="file"
          accept=".wav,.mp3,.flac,.ogg,.m4a,audio/*"
          onChange={onFileChange}
          className="field"
          style={{ maxWidth: "480px" }}
        />
        {fileName && (
          <p className="t-mono" style={{ marginTop: "0.5rem", color: "var(--c-green-bright)" }}>
            ✓ {fileName}
          </p>
        )}
      </div>

      {/* ── Noise type ── */}
      <div style={{ marginBottom: "2.5rem" }}>
        <p className="t-small" style={{ color: "var(--c-200)", fontWeight: 500, marginBottom: "0.75rem" }}>
          Background noise type
        </p>
        <p className="t-small" style={{ color: "var(--c-300)", marginBottom: "0.9rem" }}>
          Auto-analyze checks the file name and highlights the matching noise source. You can still override it.
        </p>
        <div style={{ display: "flex", gap: "0.625rem", flexWrap: "wrap" }}>
          {NOISE_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => { setSelectedNoiseType(type); }}
              className="btn btn-ghost"
              aria-pressed={selectedNoiseType === type}
              style={{
                padding: "0.5rem 1.1rem",
                fontSize: "0.875rem",
                textTransform: "capitalize",
                borderColor: selectedNoiseType === type ? "rgba(210,162,79,0.65)" : "rgba(255,255,255,0.12)",
                background: selectedNoiseType === type ? "rgba(210,162,79,0.16)" : "rgba(255,255,255,0.04)",
                color: selectedNoiseType === type ? "var(--c-gold)" : "rgba(255,255,255,0.76)",
                boxShadow: selectedNoiseType === type ? "0 0 0 1px rgba(210,162,79,0.2) inset" : "none",
              }}
            >
              {type}
              {autoDetectedNoiseType === type ? " · auto" : ""}
            </button>
          ))}
        </div>
        {autoDetectedNoiseType && (
          <p className="t-mono" style={{ marginTop: "0.75rem", color: "var(--c-gold)" }}>
            Auto-analyze matched `{autoDetectedNoiseType}` from the uploaded file name.
          </p>
        )}
      </div>

      {/* ── Actions ── */}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "3rem" }}>
        <button
          type="button"
          onClick={startSeparation}
          disabled={isProcessing || !originalUrl}
          className="btn btn-primary"
        >
          {isProcessing ? "Separating…" : "Start separation"}
        </button>
        <button type="button" onClick={handleReset} className="btn btn-ghost">
          Reset
        </button>
      </div>

      {/* ── Status ── */}
      {note && (
        <div style={{ marginBottom: "2rem" }}>
          <p className="t-eyebrow" style={{ marginBottom: "0.5rem" }}>Status</p>
          <p className="t-body">{note}</p>
          <div style={{ marginTop: "1rem" }}>
            <SeparationProgress progress={progress} />
          </div>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "1rem" }}>
            {model && (
              <span className="t-mono" style={{
                background: "var(--c-raise)",
                borderRadius: "9999px",
                padding: "0.25rem 0.75rem",
              }}>
                {model}
              </span>
            )}
            {device && (
              <span className="t-mono" style={{
                background: "var(--c-raise)",
                borderRadius: "9999px",
                padding: "0.25rem 0.75rem",
              }}>
                {device}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Spectrograms ── */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "3rem",
          marginBottom: "3rem",
          borderTop: "1px solid var(--c-600)",
          paddingTop: "2.5rem",
        }}
      >
        <SpectrogramView
          label="Input field mix"
          intensity={0.55}
          imageUrl={originalSpectrogramUrl}
          active={false}
        />
        <AudioPlayer title="Original recording" src={originalUrl} />
        <SpectrogramView
          label="Estimated elephant stem"
          intensity={status === "complete" ? 0.9 : 0.34}
          imageUrl={processedSpectrogramUrl}
          active={status === "complete"}
        />
      </div>

      {/* ── Audio players ── */}
      <div
        style={{ marginBottom: "2.5rem", borderTop: "1px solid var(--c-600)" }}
      >
        <AudioPlayer title="Processed output" src={processedUrl} />
      </div>

      {/* ── Annotations ── */}
      {(annotations.length > 0 || annotationCsv) && (
        <div style={{ borderTop: "1px solid var(--c-600)", paddingTop: "2rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
            <p className="t-eyebrow">Generated annotations</p>
            {annotationCsv && (
              <a
                href={`data:text/csv;charset=utf-8,${encodeURIComponent(annotationCsv)}`}
                download={`${fileName ?? "annotations"}.csv`}
                className="t-small"
                style={{ color: "var(--c-gold)", textDecoration: "underline", textUnderlineOffset: "3px" }}
              >
                Download CSV
              </a>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
            {annotations.map((ann) => (
              <div
                key={ann.annotation_id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0.875rem 0",
                  borderBottom: "1px solid var(--c-700)",
                }}
              >
                <div>
                  <p className="t-small" style={{ color: "var(--c-100)", fontWeight: 600, marginBottom: "0.2rem" }}>
                    {ann.annotation_id}
                  </p>
                  <p className="t-mono">
                    {ann.start_time.toFixed(2)}s — {ann.end_time.toFixed(2)}s ·{" "}
                    {ann.duration_seconds.toFixed(2)}s · peak {ann.peak_amplitude.toFixed(3)}
                  </p>
                </div>
                <span className="t-mono" style={{ color: "var(--c-gold)" }}>
                  {ann.confidence.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
