import { createHash, randomUUID } from "node:crypto";
import { extname } from "node:path";

import JSZip from "jszip";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { GeneratedAnnotation } from "@/types/audio";

const DEFAULT_INPUT_BUCKET = "separator-inputs";
const DEFAULT_OUTPUT_BUCKET = "separator-outputs";
const DEFAULT_SPECTROGRAM_BUCKET = "separator-spectrograms";
const DEFAULT_ANNOTATION_BUCKET = "separator-annotations";

const CACHE_CONTROL_SECONDS = "3600";
const ensuredBuckets = new Set<string>();

type SeparatorBackendPayload = {
  file_name: string;
  sample_rate: number;
  duration_seconds: number;
  noise_type: string;
  model: string;
  device: string;
  audio_base64: string;
  audio_mime_type: string;
  original_spectrogram_base64: string;
  processed_spectrogram_base64: string;
  annotations: GeneratedAnnotation[];
  annotation_csv: string;
  info?: Record<string, unknown>;
};

type ArchivedAssetRef = {
  bucket: string;
  path: string;
  fileName: string;
  contentType: string;
};

type SeparatorArchiveBuckets = {
  input: string;
  output: string;
  spectrogram: string;
  annotation: string;
};

type ArchiveResult = {
  runId: string;
  downloadToken: string;
  archiveFileName: string;
};

type SeparationRunRow = {
  id: string;
  recording_id: string;
  output_recording_id: string | null;
  model_name: string;
  metrics: Record<string, unknown> | null;
};

type AudioRecordingRow = {
  id: string;
  filename: string;
  storage_bucket: string | null;
  storage_path: string | null;
};

function getBucketNames(): SeparatorArchiveBuckets {
  return {
    input: process.env.SUPABASE_SEPARATOR_INPUT_BUCKET ?? DEFAULT_INPUT_BUCKET,
    output: process.env.SUPABASE_SEPARATOR_OUTPUT_BUCKET ?? DEFAULT_OUTPUT_BUCKET,
    spectrogram:
      process.env.SUPABASE_SEPARATOR_SPECTROGRAM_BUCKET ?? DEFAULT_SPECTROGRAM_BUCKET,
    annotation:
      process.env.SUPABASE_SEPARATOR_ANNOTATION_BUCKET ?? DEFAULT_ANNOTATION_BUCKET,
  };
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function stripExtension(fileName: string): string {
  const extension = extname(fileName);
  return extension ? fileName.slice(0, -extension.length) : fileName;
}

function sanitizeStem(fileName: string): string {
  const stem = stripExtension(fileName)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return stem || "recording";
}

function normalizeExtension(fileName: string, fallback = ".bin"): string {
  const extension = extname(fileName).trim().toLowerCase();
  return extension || fallback;
}

function confidenceBucket(score: number): "low" | "medium" | "high" {
  if (score >= 0.75) return "high";
  if (score >= 0.4) return "medium";
  return "low";
}

function decodeBase64(base64Value: string): Buffer {
  return Buffer.from(base64Value, "base64");
}

function archivePrefix(runId: string): string {
  return `${new Date().toISOString().slice(0, 10)}/${runId}`;
}

async function ensureBuckets(
  supabase: SupabaseClient,
  buckets: string[],
): Promise<void> {
  const missing = buckets.filter((bucket) => !ensuredBuckets.has(bucket));
  if (!missing.length) return;

  const { data, error } = await supabase.storage.listBuckets();
  if (error) {
    throw new Error(`Unable to list storage buckets: ${error.message}`);
  }

  const existing = new Set((data ?? []).map((bucket) => bucket.name));

  for (const bucket of missing) {
    if (!existing.has(bucket)) {
      const { error: createError } = await supabase.storage.createBucket(bucket, {
        public: false,
      });
      if (createError && !createError.message.toLowerCase().includes("already exists")) {
        throw new Error(`Unable to create bucket ${bucket}: ${createError.message}`);
      }
    }
    ensuredBuckets.add(bucket);
  }
}

async function uploadAsset(
  supabase: SupabaseClient,
  asset: ArchivedAssetRef,
  body: Buffer,
): Promise<void> {
  const { error } = await supabase.storage.from(asset.bucket).upload(asset.path, body, {
    contentType: asset.contentType,
    cacheControl: CACHE_CONTROL_SECONDS,
    upsert: false,
  });

  if (error) {
    throw new Error(`Upload failed for ${asset.path}: ${error.message}`);
  }
}

async function fetchAssetBuffer(
  supabase: SupabaseClient,
  bucket: string,
  path: string,
): Promise<Buffer> {
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error || !data) {
    throw new Error(`Download failed for ${bucket}/${path}: ${error?.message ?? "missing data"}`);
  }
  return Buffer.from(await data.arrayBuffer());
}

function buildAssetRefs(sourceFileName: string, runId: string): {
  archiveFileName: string;
  originalAudio: ArchivedAssetRef;
  processedAudio: ArchivedAssetRef;
  originalSpectrogram: ArchivedAssetRef;
  processedSpectrogram: ArchivedAssetRef;
  annotationCsv: ArchivedAssetRef;
} {
  const prefix = archivePrefix(runId);
  const stem = sanitizeStem(sourceFileName);
  const inputExtension = normalizeExtension(sourceFileName);
  const archiveFileName = `${stem}__output-files.zip`;
  const buckets = getBucketNames();

  const originalAudioFileName = `${runId}__${stem}${inputExtension}`;
  const processedAudioFileName = `${runId}__${stem}__separated.wav`;
  const originalSpectrogramFileName = `${runId}__${stem}__input-spectrogram.png`;
  const processedSpectrogramFileName = `${runId}__${stem}__separated-spectrogram.png`;
  const annotationFileName = `${runId}__${stem}__annotations.csv`;

  return {
    archiveFileName,
    originalAudio: {
      bucket: buckets.input,
      path: `${prefix}/audio/${originalAudioFileName}`,
      fileName: originalAudioFileName,
      contentType: "application/octet-stream",
    },
    processedAudio: {
      bucket: buckets.output,
      path: `${prefix}/audio/${processedAudioFileName}`,
      fileName: processedAudioFileName,
      contentType: "audio/wav",
    },
    originalSpectrogram: {
      bucket: buckets.spectrogram,
      path: `${prefix}/spectrograms/${originalSpectrogramFileName}`,
      fileName: originalSpectrogramFileName,
      contentType: "image/png",
    },
    processedSpectrogram: {
      bucket: buckets.spectrogram,
      path: `${prefix}/spectrograms/${processedSpectrogramFileName}`,
      fileName: processedSpectrogramFileName,
      contentType: "image/png",
    },
    annotationCsv: {
      bucket: buckets.annotation,
      path: `${prefix}/annotations/${annotationFileName}`,
      fileName: annotationFileName,
      contentType: "text/csv; charset=utf-8",
    },
  };
}

export async function archiveSeparationOutputs(params: {
  supabase: SupabaseClient;
  sourceFileName: string;
  sourceMimeType: string | null;
  sourceBytes: Buffer;
  selectedNoiseType: string;
  payload: SeparatorBackendPayload;
  startedAt: string;
}): Promise<ArchiveResult> {
  const {
    supabase,
    sourceFileName,
    sourceMimeType,
    sourceBytes,
    selectedNoiseType,
    payload,
    startedAt,
  } = params;

  const runId = randomUUID();
  const downloadToken = randomUUID();
  const finishedAt = new Date().toISOString();
  const assetRefs = buildAssetRefs(sourceFileName, runId);
  const buckets = Object.values(getBucketNames());

  await ensureBuckets(supabase, buckets);

  const originalAudioAsset = {
    ...assetRefs.originalAudio,
    contentType: sourceMimeType || assetRefs.originalAudio.contentType,
  };

  await uploadAsset(supabase, originalAudioAsset, sourceBytes);
  await uploadAsset(
    supabase,
    assetRefs.processedAudio,
    decodeBase64(payload.audio_base64),
  );
  await uploadAsset(
    supabase,
    assetRefs.originalSpectrogram,
    decodeBase64(payload.original_spectrogram_base64),
  );
  await uploadAsset(
    supabase,
    assetRefs.processedSpectrogram,
    decodeBase64(payload.processed_spectrogram_base64),
  );
  await uploadAsset(
    supabase,
    assetRefs.annotationCsv,
    Buffer.from(payload.annotation_csv, "utf-8"),
  );

  const originalMetadata = {
    origin: "user_upload",
    is_curated: false,
    original_filename: sourceFileName,
    content_type: sourceMimeType,
    archive_run_id: runId,
  };

  const { data: originalRecording, error: originalRecordingError } = await supabase
    .from("audio_recordings")
    .insert({
      filename: assetRefs.originalAudio.fileName,
      storage_bucket: originalAudioAsset.bucket,
      storage_path: originalAudioAsset.path,
      sample_rate_hz: payload.sample_rate,
      duration_seconds: payload.duration_seconds,
      channels: 1,
      call_type: "unknown",
      noise_type: selectedNoiseType,
      has_mechanical_noise: selectedNoiseType !== "unknown" && selectedNoiseType !== "none",
      source_name: sourceFileName,
      metadata: originalMetadata,
    })
    .select("id")
    .single();

  if (originalRecordingError || !originalRecording) {
    throw new Error(
      `Unable to insert source recording metadata: ${originalRecordingError?.message ?? "missing row"}`,
    );
  }

  const outputMetadata = {
    origin: "separator_output",
    is_curated: false,
    source_recording_id: originalRecording.id,
    source_filename: sourceFileName,
    archive_run_id: runId,
  };

  const { data: outputRecording, error: outputRecordingError } = await supabase
    .from("audio_recordings")
    .insert({
      filename: assetRefs.processedAudio.fileName,
      storage_bucket: assetRefs.processedAudio.bucket,
      storage_path: assetRefs.processedAudio.path,
      sample_rate_hz: payload.sample_rate,
      duration_seconds: payload.duration_seconds,
      channels: 1,
      call_type: "rumble",
      noise_type: selectedNoiseType,
      has_mechanical_noise: false,
      source_name: sourceFileName,
      metadata: outputMetadata,
    })
    .select("id")
    .single();

  if (outputRecordingError || !outputRecording) {
    throw new Error(
      `Unable to insert processed recording metadata: ${outputRecordingError?.message ?? "missing row"}`,
    );
  }

  const runMetrics = {
    separator_info: payload.info ?? {},
    asset_paths: {
      original_audio: originalAudioAsset,
      processed_audio: assetRefs.processedAudio,
      original_spectrogram: assetRefs.originalSpectrogram,
      processed_spectrogram: assetRefs.processedSpectrogram,
      annotation_csv: assetRefs.annotationCsv,
    },
    annotation_count: payload.annotations.length,
    archive_file_name: assetRefs.archiveFileName,
    download_token_hash: sha256(downloadToken),
  };

  const { data: separationRun, error: separationRunError } = await supabase
    .from("separation_runs")
    .insert({
      recording_id: originalRecording.id,
      output_recording_id: outputRecording.id,
      model_name: payload.model,
      status: "completed",
      started_at: startedAt,
      finished_at: finishedAt,
      output_storage_bucket: assetRefs.processedAudio.bucket,
      output_storage_path: assetRefs.processedAudio.path,
      metrics: runMetrics,
      parameters: {
        selected_noise_type: selectedNoiseType,
        response_noise_type: payload.noise_type,
        sample_rate: payload.sample_rate,
        duration_seconds: payload.duration_seconds,
        device: payload.device,
      },
    })
    .select("id")
    .single();

  if (separationRunError || !separationRun) {
    throw new Error(
      `Unable to insert separation run metadata: ${separationRunError?.message ?? "missing row"}`,
    );
  }

  if (payload.annotations.length > 0) {
    const annotationRows = payload.annotations.map((annotation) => ({
      recording_id: outputRecording.id,
      selection_label: annotation.annotation_id,
      start_seconds: annotation.start_time,
      end_seconds: annotation.end_time,
      call_type: "rumble",
      confidence: confidenceBucket(annotation.confidence),
      annotated_by: "separator_api",
      metadata: {
        peak_amplitude: annotation.peak_amplitude,
        duration_seconds: annotation.duration_seconds,
        confidence_score: annotation.confidence,
        archive_run_id: runId,
      },
    }));

    const { error: annotationError } = await supabase
      .from("audio_annotations")
      .insert(annotationRows);

    if (annotationError) {
      throw new Error(`Unable to insert generated annotations: ${annotationError.message}`);
    }
  }

  return {
    runId: separationRun.id,
    downloadToken,
    archiveFileName: assetRefs.archiveFileName,
  };
}

function assertAssetRef(
  value: unknown,
  label: string,
): ArchivedAssetRef {
  const candidate = value as Partial<ArchivedAssetRef> | undefined;
  if (
    !candidate ||
    typeof candidate.bucket !== "string" ||
    typeof candidate.path !== "string" ||
    typeof candidate.fileName !== "string"
  ) {
    throw new Error(`Missing archived asset metadata for ${label}.`);
  }
  return {
    bucket: candidate.bucket,
    path: candidate.path,
    fileName: candidate.fileName,
    contentType:
      typeof candidate.contentType === "string"
        ? candidate.contentType
        : "application/octet-stream",
  };
}

function extractAssetMap(metrics: Record<string, unknown> | null | undefined): {
  originalSpectrogram: ArchivedAssetRef;
  processedSpectrogram: ArchivedAssetRef;
  processedAudio: ArchivedAssetRef;
  annotationCsv: ArchivedAssetRef;
  archiveFileName: string;
  downloadTokenHash: string;
} {
  const assetPaths = (metrics?.asset_paths ?? null) as Record<string, unknown> | null;
  const archiveFileName =
    typeof metrics?.archive_file_name === "string"
      ? metrics.archive_file_name
      : "separator-output-files.zip";
  const downloadTokenHash =
    typeof metrics?.download_token_hash === "string" ? metrics.download_token_hash : "";

  if (!assetPaths) {
    throw new Error("Missing archived asset paths for separation run.");
  }

  return {
    originalSpectrogram: assertAssetRef(assetPaths.original_spectrogram, "original spectrogram"),
    processedSpectrogram: assertAssetRef(assetPaths.processed_spectrogram, "processed spectrogram"),
    processedAudio: assertAssetRef(assetPaths.processed_audio, "processed audio"),
    annotationCsv: assertAssetRef(assetPaths.annotation_csv, "annotation csv"),
    archiveFileName,
    downloadTokenHash,
  };
}

export async function buildSeparationDownloadBundle(params: {
  supabase: SupabaseClient;
  runId: string;
  downloadToken: string;
}): Promise<{ archiveFileName: string; zipBuffer: Buffer }> {
  const { supabase, runId, downloadToken } = params;

  const { data: separationRun, error: separationRunError } = await supabase
    .from("separation_runs")
    .select("id, recording_id, output_recording_id, model_name, metrics")
    .eq("id", runId)
    .single<SeparationRunRow>();

  if (separationRunError || !separationRun) {
    throw new Error(
      `Unable to find separation run ${runId}: ${separationRunError?.message ?? "missing row"}`,
    );
  }

  const assetMap = extractAssetMap(separationRun.metrics);
  if (assetMap.downloadTokenHash !== sha256(downloadToken)) {
    throw new Error("Invalid download token.");
  }

  const zip = new JSZip();
  const [processedAudio, originalSpectrogram, processedSpectrogram, annotationCsv] =
    await Promise.all([
      fetchAssetBuffer(
        supabase,
        assetMap.processedAudio.bucket,
        assetMap.processedAudio.path,
      ),
      fetchAssetBuffer(
        supabase,
        assetMap.originalSpectrogram.bucket,
        assetMap.originalSpectrogram.path,
      ),
      fetchAssetBuffer(
        supabase,
        assetMap.processedSpectrogram.bucket,
        assetMap.processedSpectrogram.path,
      ),
      fetchAssetBuffer(
        supabase,
        assetMap.annotationCsv.bucket,
        assetMap.annotationCsv.path,
      ),
    ]);

  zip.file(`calls/${assetMap.processedAudio.fileName}`, processedAudio);
  zip.file(`spectrograms/${assetMap.originalSpectrogram.fileName}`, originalSpectrogram);
  zip.file(`spectrograms/${assetMap.processedSpectrogram.fileName}`, processedSpectrogram);
  zip.file(`annotations/${assetMap.annotationCsv.fileName}`, annotationCsv);

  const zipBuffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  return {
    archiveFileName: assetMap.archiveFileName,
    zipBuffer,
  };
}
