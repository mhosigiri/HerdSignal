"use client";

import { ChangeEvent, useEffect, useRef } from "react";

import { useAudioStore } from "@/store/audioStore";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { PageHeader } from "@/components/ui/PageHeader";
import { Body, Caption, Mono, Overline } from "@/components/ui/Typography";
import { StatusDot } from "@/components/ui/StatusDot";

import { AudioPlayer } from "./AudioPlayer";
import { SeparationProgress } from "./SeparationProgress";
import { SpectrogramView } from "./SpectrogramView";

const NOISE_TYPES = ["vehicle", "airplane", "generator"] as const;
type NoiseType = (typeof NOISE_TYPES)[number];

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
    device,
    model,
    progress,
    reset,
    setComplete,
    setError,
    setProcessing,
    setUpload,
    status,
  } = useAudioStore();

  const processedRef = useRef<string | null>(null);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const noiseTypeRef = useRef<NoiseType>("vehicle");

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUpload({ fileName: file.name, originalUrl: URL.createObjectURL(file) });
  };

  const startSeparation = async () => {
    if (!originalUrl || !fileName) {
      setError("Upload a WAV recording before starting the separator.");
      return;
    }
    try {
      setProcessing(10);
      const fileBlob = await fetch(originalUrl).then((r) => r.blob());
      const formData = new FormData();
      formData.append("file", fileBlob, fileName);
      formData.append("noise_type", noiseTypeRef.current);
      setProcessing(30);

      const response = await fetch("/api/separate", { method: "POST", body: formData });
      setProcessing(80);

      if (!response.ok) {
        const body = await response
          .json()
          .catch(() => ({ error: response.statusText })) as { error?: string };
        throw new Error(body.error ?? "Separation failed");
      }

      const payload = await response.json() as {
        audioDataUrl?: string;
        originalSpectrogramDataUrl?: string;
        processedSpectrogramDataUrl?: string;
        annotations?: Array<{
          annotation_id: string;
          start_time: number;
          end_time: number;
          duration_seconds: number;
          peak_amplitude: number;
          confidence: number;
        }>;
        annotationCsv?: string;
        model?: string;
        device?: string;
        note?: string;
      };
      setProcessing(98);

      if (
        processedRef.current &&
        processedRef.current !== originalUrl &&
        processedRef.current.startsWith("blob:")
      ) {
        URL.revokeObjectURL(processedRef.current);
      }
      const processedDataUrl = payload.audioDataUrl ?? null;
      if (!processedDataUrl) {
        throw new Error("Separator response did not include processed audio.");
      }

      processedRef.current = processedDataUrl;
      setComplete({
        processedUrl: processedDataUrl,
        originalSpectrogramUrl: payload.originalSpectrogramDataUrl ?? null,
        processedSpectrogramUrl: payload.processedSpectrogramDataUrl ?? null,
        annotations: payload.annotations ?? [],
        annotationCsv: payload.annotationCsv ?? null,
        model: payload.model ?? null,
        device: payload.device ?? null,
        note:
          payload.note ??
          "Separation complete — elephant calls isolated, spectrogram generated, and call timings annotated.",
      });
    } catch (err) {
      setError(`Separation failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  const isProcessing = status === "processing";

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      {/* ── Left panel ──────────────────────────────────────────────── */}
      <Card variant="raised" shadow className="space-y-6 p-6">
        <PageHeader
          overline="Acoustic separator"
          title="Upload and separation panel"
          description="Upload a field recording and isolate elephant calls from vehicle noise, aircraft, or generator interference using the local deep-learning separator."
        />

        {/* File upload */}
        <Card variant="bordered" shadow={false} className="p-5">
          <label className="flex cursor-pointer flex-col gap-3">
            <Label>Upload field recording</Label>
            <input
              type="file"
              accept=".wav,.mp3,.flac,audio/*"
              onChange={onFileChange}
              className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm"
            />
          </label>
        </Card>

        {/* Noise type selector */}
        <div>
          <Label className="mb-2 block">Background noise type</Label>
          <div className="flex flex-wrap gap-2">
            {NOISE_TYPES.map((type) => (
              <Button
                key={type}
                variant="secondary"
                size="sm"
                onClick={() => { noiseTypeRef.current = type; }}
                className="capitalize"
              >
                {type}
              </Button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <Button
            variant="primary"
            size="md"
            onClick={startSeparation}
            disabled={isProcessing || !originalUrl}
          >
            {isProcessing ? "Separating…" : "Start separation"}
          </Button>
          <Button variant="secondary" size="md" onClick={reset}>
            Reset
          </Button>
        </div>

        {/* Status card */}
        <Card variant="default" shadow={false} className="p-5">
          <div className="flex items-center gap-2">
            <StatusDot
              tone={
                status === "complete"
                  ? "positive"
                  : status === "error"
                  ? "critical"
                  : status === "processing"
                  ? "warning"
                  : "neutral"
              }
              pulse={isProcessing}
            />
            <Label>Current state</Label>
          </div>
          <Body size="sm" muted className="mt-2">{note}</Body>
          <div className="mt-4">
            <SeparationProgress progress={progress} />
          </div>
          <div className="mt-4">
            <Overline>Status: {status}</Overline>
          </div>
          {(model || device) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {model ? <Mono>{model}</Mono> : null}
              {device ? <Mono>{device}</Mono> : null}
            </div>
          )}
        </Card>

        <Card variant="default" shadow={false} className="p-5">
          <div className="flex items-center justify-between gap-3">
            <Label>Generated annotations</Label>
            {annotationCsv ? (
              <a
                href={`data:text/csv;charset=utf-8,${encodeURIComponent(annotationCsv)}`}
                download={`${fileName ?? "annotations"}.csv`}
                className="text-xs font-medium text-[var(--color-primary)] underline-offset-2 hover:underline"
              >
                Download CSV
              </a>
            ) : null}
          </div>
          {annotations.length > 0 ? (
            <div className="mt-4 space-y-3">
              {annotations.map((annotation) => (
                <div
                  key={annotation.annotation_id}
                  className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-inset)] p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <Label className="text-xs">{annotation.annotation_id}</Label>
                    <Caption>confidence {annotation.confidence.toFixed(2)}</Caption>
                  </div>
                  <Body size="sm" className="mt-1">
                    {annotation.start_time.toFixed(2)}s to {annotation.end_time.toFixed(2)}s
                  </Body>
                  <Caption>
                    duration {annotation.duration_seconds.toFixed(2)}s, peak {annotation.peak_amplitude.toFixed(3)}
                  </Caption>
                </div>
              ))}
            </div>
          ) : (
            <Caption className="mt-3">No call annotations generated yet.</Caption>
          )}
        </Card>
      </Card>

      {/* ── Right panel ─────────────────────────────────────────────── */}
      <div className="space-y-6">
        <SpectrogramView
          label="Input field mix"
          intensity={0.55}
          imageUrl={originalSpectrogramUrl}
        />
        <SpectrogramView
          label="Estimated elephant stem"
          intensity={status === "complete" ? 0.9 : 0.34}
          imageUrl={processedSpectrogramUrl}
        />
        <AudioPlayer title="Original recording" src={originalUrl} />
        <AudioPlayer title="Processed output" src={processedUrl} />
      </div>
    </div>
  );
}
