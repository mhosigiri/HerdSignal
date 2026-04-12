"use client";

import { ChangeEvent, useEffect } from "react";

import { useAudioStore } from "@/store/audioStore";

import { AudioPlayer } from "./AudioPlayer";
import { SeparationProgress } from "./SeparationProgress";
import { SpectrogramView } from "./SpectrogramView";

export function SeparatorPanel() {
  const {
    fileName,
    note,
    originalUrl,
    processedUrl,
    progress,
    reset,
    setComplete,
    setError,
    setProcessing,
    setUpload,
    status,
  } = useAudioStore();

  useEffect(() => {
    return () => {
      if (originalUrl) {
        URL.revokeObjectURL(originalUrl);
      }
      if (processedUrl && processedUrl !== originalUrl) {
        URL.revokeObjectURL(processedUrl);
      }
    };
  }, [originalUrl, processedUrl]);

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setUpload({ fileName: file.name, originalUrl: objectUrl });
  };

  const startSeparation = async () => {
    if (!originalUrl || !fileName) {
      setError("Upload a WAV recording before starting the separator.");
      return;
    }

    for (const nextProgress of [12, 29, 48, 67, 84, 100]) {
      setProcessing(nextProgress);
      await new Promise((resolve) => window.setTimeout(resolve, 220));
    }

    setComplete(
      originalUrl,
      "Frontend baseline complete. Hook this action to the Python separator API when the service is exposed.",
    );
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-6 rounded-[2rem] border border-stone-200/80 bg-[#f7f1e6] p-6 shadow-[0_20px_80px_rgba(56,44,29,0.08)]">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.28em] text-stone-500">Acoustic separator</p>
          <h1 className="text-3xl font-semibold tracking-tight text-stone-900">
            Baseline upload and analysis panel
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-stone-600">
            This first pass is wired for local previews, progress feedback, and spectrogram framing. The actual separation call can point at the Python service once its API contract is available.
          </p>
        </div>

        <div className="rounded-[1.75rem] border border-dashed border-stone-400 bg-white/60 p-5">
          <label className="flex cursor-pointer flex-col gap-3">
            <span className="text-sm font-medium text-stone-800">Upload field recording</span>
            <input
              type="file"
              accept=".wav,audio/wav"
              onChange={onFileChange}
              className="rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm"
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={startSeparation}
            className="rounded-full bg-[#27452d] px-5 py-3 text-sm font-medium text-stone-50 transition hover:bg-[#1c3522]"
          >
            Start baseline separation
          </button>
          <button
            type="button"
            onClick={reset}
            className="rounded-full border border-stone-300 px-5 py-3 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
          >
            Reset
          </button>
        </div>

        <div className="rounded-[1.75rem] bg-white p-5">
          <p className="text-sm font-medium text-stone-900">Current state</p>
          <p className="mt-2 text-sm leading-6 text-stone-600">{note}</p>
          <div className="mt-4">
            <SeparationProgress progress={progress} />
          </div>
          <div className="mt-4 text-xs uppercase tracking-[0.18em] text-stone-500">
            Status: {status}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <SpectrogramView label="Input field mix" intensity={0.55} />
        <SpectrogramView
          label="Estimated elephant stem"
          intensity={status === "complete" ? 0.9 : 0.34}
        />
        <AudioPlayer title="Original recording" src={originalUrl} />
        <AudioPlayer title="Processed output" src={processedUrl} />
      </div>
    </div>
  );
}

