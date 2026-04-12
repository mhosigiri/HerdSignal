/**
 * Country audio metadata from `public.audio_recordings` + Storage URL resolution.
 * Files follow `[PascalCaseEnglishName].mp3` (e.g. SouthSudan.mp3), matching `filename`.
 */
import {
  getName,
  registerLocale,
  type LocaleData,
} from "i18n-iso-countries";
import en from "i18n-iso-countries/langs/en.json";

import type { CountryAudioRecord } from "@/lib/map/types";

import { getSupabaseBrowserClient } from "./client";

registerLocale(en as unknown as LocaleData);

const DEFAULT_BUCKET = "countries-audio";

type AudioRecordingRow = {
  id: string;
  filename: string;
  storage_bucket: string | null;
  storage_path: string | null;
  created_at: string;
};

/** When i18n English name → your `filename` stem differs, map alpha-3 → exact filename. */
const FILENAME_OVERRIDE_BY_ALPHA3: Partial<Record<string, string>> = {};

/**
 * "South Sudan" / "Benin" → SouthSudan.mp3 / Benin.mp3 (words merged, PascalCase).
 */
export function expectedFilenameFromEnglishCountryName(name: string): string {
  const normalized = name.normalize("NFD").replace(/\p{M}/gu, "");
  const parts = normalized.match(/[A-Za-z]+/g);
  if (!parts?.length) return "";
  const stem = parts
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join("");
  return `${stem}.mp3`;
}

function normalizeRow(
  row: AudioRecordingRow,
  iso: string,
  displayCountry: string,
): CountryAudioRecord {
  const path =
    row.storage_path?.trim() || row.filename.trim();
  return {
    id: row.id,
    country: displayCountry,
    isoCode: iso,
    title: row.filename.replace(/\.mp3$/i, "") || row.filename,
    audioPath: path,
    storageBucket: row.storage_bucket,
    description: null,
    isActive: true,
    createdAt: row.created_at,
  };
}

/**
 * Resolves `audio_recordings` by ISO 3166-1 alpha-3: English name → expected filename.
 */
export async function fetchCountryAudioByIso(
  isoCode: string | null | undefined,
): Promise<CountryAudioRecord | null> {
  if (isoCode == null || typeof isoCode !== "string") return null;
  const iso = isoCode.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(iso)) return null;

  const override = FILENAME_OVERRIDE_BY_ALPHA3[iso];
  const enName = getName(iso, "en");
  const filename =
    override ??
    (enName ? expectedFilenameFromEnglishCountryName(enName) : "");
  if (!filename) return null;

  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("audio_recordings")
    .select("id, filename, storage_bucket, storage_path, created_at")
    .eq("filename", filename)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[fetchCountryAudioByIso]", error);
    return null;
  }
  if (!data) return null;

  return normalizeRow(data as AudioRecordingRow, iso, enName ?? iso);
}

/**
 * Resolves a bucket-relative path to a playable URL (signed when possible, else public).
 */
export async function getCountryAudioUrl(
  audioPath: string | null | undefined,
  storageBucket?: string | null,
): Promise<string | null> {
  if (audioPath == null || typeof audioPath !== "string") return null;
  const path = audioPath.trim();
  if (!path) return null;

  const bucket = (storageBucket?.trim() || DEFAULT_BUCKET) || DEFAULT_BUCKET;
  const supabase = getSupabaseBrowserClient();

  const { data: signed, error: signErr } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 3600);

  if (!signErr && signed?.signedUrl) {
    return signed.signedUrl;
  }

  const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
  const url = pub?.publicUrl;
  return url && url.length > 0 ? url : null;
}
