"use client";

import { useEffect, useState } from "react";

import type { CountryAudioRecord } from "@/lib/map/types";
import {
  fetchCountryAudioByIso,
  getCountryAudioUrl,
} from "@/lib/supabase/audioQueries";

export type UseCountryAudioResult = {
  audio: CountryAudioRecord | null;
  audioUrl: string | null;
  loading: boolean;
  error: string | null;
};

/**
 * Loads metadata and a playable Storage URL for the selected country's alpha-3 code.
 */
export function useCountryAudio(isoCode: string | null): UseCountryAudioResult {
  const [audio, setAudio] = useState<CountryAudioRecord | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (isoCode == null || isoCode.trim() === "") {
      setAudio(null);
      setAudioUrl(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    setAudio(null);
    setAudioUrl(null);

    const run = async () => {
      try {
        const meta = await fetchCountryAudioByIso(isoCode);
        if (cancelled) return;

        if (!meta) {
          setAudio(null);
          setAudioUrl(null);
          setLoading(false);
          return;
        }

        if (!meta.audioPath?.trim()) {
          setAudio(meta);
          setAudioUrl(null);
          setLoading(false);
          return;
        }

        const url = await getCountryAudioUrl(meta.audioPath, meta.storageBucket);
        if (cancelled) return;

        setAudio(meta);
        if (!url) {
          setAudioUrl(null);
          setError(null);
        } else {
          setAudioUrl(url);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setAudio(null);
          setAudioUrl(null);
          setError(e instanceof Error ? e.message : "Audio failed to load");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [isoCode]);

  return { audio, audioUrl, loading, error };
}
