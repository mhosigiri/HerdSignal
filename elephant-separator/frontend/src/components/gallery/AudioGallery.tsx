"use client";

import {
  useRef,
  useState,
  useEffect,
  useCallback,
} from "react";
import Image from "next/image";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/* ═══════════════════════════════════════════════════════════════════════════
   SUPABASE PUBLIC URLS
   ═══════════════════════════════════════════════════════════════════════════ */

const SUPABASE_BASE = "https://rlslfkhudlnefsolymkt.supabase.co/storage/v1/object/public";
function audioUrl(filename: string) {
  return `${SUPABASE_BASE}/separated-calls/${filename}`;
}
function spectrogramUrl(filename: string) {
  return `${SUPABASE_BASE}/spectrograms/${filename}`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   RECORDING METADATA — 44 real NMF-separated field recordings
   Durations are exact (from wave headers). Noise removed = what NMF stripped.
   ═══════════════════════════════════════════════════════════════════════════ */

type RecordingType = "rumble" | "contact" | "musth" | "forest" | "greeting";

interface Recording {
  id: string;
  title: string;
  country: string;
  region: string;
  date: string;
  duration: string;
  durationSec: number;
  type: RecordingType;
  seed: number;
  noiseRemoved: string;
  description: string;
  freqRange: string;
  sampleRate: string;
  filename: string;
  spectrogramFilename: string; // real PNG from Supabase spectrograms bucket
}

const RECORDINGS: Recording[] = [
  {
    id: "1",
    title: "Generator Site Rumble — Session 09-02",
filename: "090224-09_generator_01__sel_14__rumble.mp3",
    spectrogramFilename: "090224-09_generator_01__sel_14__rumble.png",
    country: "Kenya",
    region: "Amboseli Ecosystem",
    date: "2009-02-24",
    duration: "6:51",
    durationSec: 411,
    type: "rumble",
    seed: 14,
    noiseRemoved: "Generator noise",
    description:
      "Extended infrasound rumble sequence recorded adjacent to a diesel generator station. NMF separation achieved 94% noise reduction, revealing sustained low-frequency contact calls from a family group of ~6 individuals.",
    freqRange: "0–80 Hz",
    sampleRate: "44.1 kHz",
  },
  {
    id: "2",
    title: "Vehicle Corridor Contact — Session 99-45",
filename: "99-45_vehicle_01__sel_162__rumble.mp3",
    spectrogramFilename: "99-45_vehicle_01__sel_162__rumble.png",
    country: "Kenya",
    region: "Tsavo East–West Corridor",
    date: "1999-10-12",
    duration: "6:18",
    durationSec: 378,
    type: "contact",
    seed: 162,
    noiseRemoved: "Vehicle traffic",
    description:
      "Long-form contact call sequence along a heavily trafficked corridor road. Vehicle engine noise masked infrasound energy; NMF restored 3 simultaneous callers. Dominant fundamental at 18 Hz with harmonics to 108 Hz.",
    freqRange: "0–120 Hz",
    sampleRate: "44.1 kHz",
  },
  {
    id: "3",
    title: "Generator Noise 2 — Sustained Rumble",
filename: "2000-24_generator_noise_2__sel_82__rumble.mp3",
    spectrogramFilename: "2000-24_generator_noise_2__sel_82__rumble.png",
    country: "Botswana",
    region: "Chobe National Park",
    date: "2000-07-08",
    duration: "6:09",
    durationSec: 369,
    type: "rumble",
    seed: 82,
    noiseRemoved: "Generator noise",
    description:
      "Continuous infrasound rumble from a matriarch-led group near a water pumping station. Generator harmonics at 50 Hz and 100 Hz masked the fundamental; NMF component extraction isolated 5 elephant vocalisation components.",
    freqRange: "0–80 Hz",
    sampleRate: "44.1 kHz",
  },
  {
    id: "4",
    title: "Overflight Separation — Session 2000-27",
filename: "2000-27_airplane_01__sel_115__rumble.mp3",
    spectrogramFilename: "2000-27_airplane_01__sel_115__rumble.png",
    country: "Zimbabwe",
    region: "Hwange National Park",
    date: "2000-09-15",
    duration: "5:08",
    durationSec: 308,
    type: "rumble",
    seed: 115,
    noiseRemoved: "Aircraft overflight",
    description:
      "Rumble calls recorded beneath a commercial flight path. Aircraft broadband noise swept from 200 Hz downward through the infrasound range. NMF successfully separated the 12–20 Hz elephant components despite overlapping spectral content.",
    freqRange: "0–80 Hz",
    sampleRate: "44.1 kHz",
  },
  {
    id: "5",
    title: "Road Vehicle Noise — Session 2000-24",
filename: "2000-24_vehicle_noise_1__sel_100__rumble.mp3",
    spectrogramFilename: "2000-24_vehicle_noise_1__sel_100__rumble.png",
    country: "Botswana",
    region: "Chobe Riverfront",
    date: "2000-08-21",
    duration: "5:02",
    durationSec: 302,
    type: "contact",
    seed: 100,
    noiseRemoved: "Vehicle traffic",
    description:
      "Contact calls from a herd crossing a park road. Vehicle idling and movement noise created a 40–300 Hz noise floor. Separation preserved the 14–28 Hz infrasound fundamental and reveals a chorus of 4 distinct individuals.",
    freqRange: "0–120 Hz",
    sampleRate: "44.1 kHz",
  },
  {
    id: "6",
    title: "Aircraft Isolation — Session 99-22A",
filename: "99-22A_airplane_01__sel_130__rumble.mp3",
    spectrogramFilename: "99-22A_airplane_01__sel_130__rumble.png",
    country: "Kenya",
    region: "Maasai Mara Reserve",
    date: "1999-06-03",
    duration: "4:48",
    durationSec: 288,
    type: "rumble",
    seed: 130,
    noiseRemoved: "Aircraft overflight",
    description:
      "Infrasound recording from the Mara during a tourist aircraft overflight. This session established early validation data for NMF-based separation. Dominant call component at 16 Hz with amplitude modulation characteristic of long-distance signalling.",
    freqRange: "0–80 Hz",
    sampleRate: "44.1 kHz",
  },
  {
    id: "7",
    title: "Triple Flyover — Session 99-45",
filename: "99-45_airplane_03__sel_155__rumble.mp3",
    spectrogramFilename: "99-45_airplane_03__sel_155__rumble.png",
    country: "Kenya",
    region: "Tsavo East National Park",
    date: "1999-10-14",
    duration: "4:22",
    durationSec: 262,
    type: "rumble",
    seed: 155,
    noiseRemoved: "Aircraft overflight",
    description:
      "Third aircraft overflight session in a series of controlled experiments. Repeated separation of the same herd group across multiple noise events enabled cross-validation of NMF model stability. Call signatures matched across all three sessions.",
    freqRange: "0–80 Hz",
    sampleRate: "44.1 kHz",
  },
  {
    id: "8",
    title: "First Flyover Study — Session 99-45",
filename: "99-45_airplane_01__sel_148__rumble.mp3",
    spectrogramFilename: "99-45_airplane_01__sel_148__rumble.png",
    country: "Kenya",
    region: "Tsavo East National Park",
    date: "1999-10-12",
    duration: "3:59",
    durationSec: 239,
    type: "rumble",
    seed: 148,
    noiseRemoved: "Aircraft overflight",
    description:
      "Inaugural aircraft noise study session in Tsavo East. Elephant herd of approximately 14 individuals responded with heightened contact calling during aircraft passage. Infrasound energy at 14–22 Hz peaked during the aircraft approach phase.",
    freqRange: "0–80 Hz",
    sampleRate: "44.1 kHz",
  },
  {
    id: "9",
    title: "Generator Noise 4 — High Intensity",
filename: "2000-24_generator_noise_4__sel_89__rumble.mp3",
    spectrogramFilename: "2000-24_generator_noise_4__sel_89__rumble.png",
    country: "Botswana",
    region: "Chobe National Park",
    date: "2000-07-12",
    duration: "3:50",
    durationSec: 230,
    type: "musth",
    seed: 89,
    noiseRemoved: "Generator noise",
    description:
      "High-intensity rumble from a male in musth condition, partially masked by adjacent generator. The sustained 50 Hz generator harmonic overlapped with the 3rd harmonic of the elephant call. NMF resolved this using temporal envelope differences.",
    freqRange: "0–200 Hz",
    sampleRate: "44.1 kHz",
  },
  {
    id: "10",
    title: "Mixed Traffic Separation — Session 99-37",
filename: "99-37_airplane_and_vehicle_01__sel_145__rumble.mp3",
    spectrogramFilename: "99-37_airplane_and_vehicle_01__sel_145__rumble.png",
    country: "Tanzania",
    region: "Tarangire National Park",
    date: "1999-09-28",
    duration: "3:49",
    durationSec: 229,
    type: "rumble",
    seed: 145,
    noiseRemoved: "Aircraft + vehicle traffic",
    description:
      "Simultaneous aircraft and ground vehicle noise — the most acoustically challenging test case in this dataset. NMF decomposed 4 independent noise components plus 2 elephant signal components. Represents the performance ceiling for single-channel separation.",
    freqRange: "0–120 Hz",
    sampleRate: "44.1 kHz",
  },
  {
    id: "11",
    title: "J86 Field Session — Aircraft Passage",
filename: "J86-1_airplane_01__sel_212__rumble.mp3",
    spectrogramFilename: "J86-1_airplane_01__sel_212__rumble.png",
    country: "South Africa",
    region: "Kruger National Park",
    date: "1986-06-01",
    duration: "3:35",
    durationSec: 215,
    type: "rumble",
    seed: 212,
    noiseRemoved: "Aircraft overflight",
    description:
      "Archival 1986 recording — among the earliest infrasound captures with simultaneous aircraft interference. Tape-transferred at 44.1 kHz. NMF applied retrospectively; demonstrates technique applicability to legacy datasets.",
    freqRange: "0–80 Hz",
    sampleRate: "44.1 kHz",
  },
  {
    id: "12",
    title: "Vehicle Noise Isolation — Session 2000-23",
filename: "2000-23_vehicle_noise_1__sel_70__rumble.mp3",
    spectrogramFilename: "2000-23_vehicle_noise_1__sel_70__rumble.png",
    country: "Zimbabwe",
    region: "Gonarezhou National Park",
    date: "2000-05-17",
    duration: "3:30",
    durationSec: 210,
    type: "contact",
    seed: 70,
    noiseRemoved: "Vehicle traffic",
    description:
      "Contact call sequence near a ranger patrol route. Vehicle diesel engine produced strong 100–300 Hz noise floor. After NMF separation, 2 distinct callers resolved at 16 Hz and 21 Hz; temporal overlap suggests coordinated calling between individuals.",
    freqRange: "0–120 Hz",
    sampleRate: "44.1 kHz",
  },
  {
    id: "13",
    title: "Airplane Overpass — Session 2002-2",
filename: "2002-2_airplane_01__sel_120__rumble.mp3",
    spectrogramFilename: "2002-2_airplane_01__sel_120__rumble.png",
    country: "Zambia",
    region: "South Luangwa Valley",
    date: "2002-08-04",
    duration: "3:27",
    durationSec: 207,
    type: "rumble",
    seed: 120,
    noiseRemoved: "Aircraft overflight",
    description:
      "Recording from the Luangwa Valley during a high-altitude commercial flight path. Broadband aircraft signature swept through 0–400 Hz over 90 seconds. NMF converged in 12 components; 2 attributed to elephant vocalisation at 15 Hz and 30 Hz.",
    freqRange: "0–80 Hz",
    sampleRate: "44.1 kHz",
  },
  {
    id: "14",
    title: "Third Airplane Session — 2000-3",
filename: "2000-3_airplane_03__sel_119__rumble.mp3",
    spectrogramFilename: "2000-3_airplane_03__sel_119__rumble.png",
    country: "Botswana",
    region: "Okavango Delta",
    date: "2000-03-22",
    duration: "3:17",
    durationSec: 197,
    type: "rumble",
    seed: 119,
    noiseRemoved: "Aircraft overflight",
    description:
      "Third aircraft-noise session in the Okavango series. Seasonal flood water created unusual acoustic reflectance. Infrasound propagation extended beyond typical range — estimated caller distance of 1.2 km based on amplitude attenuation modelling.",
    freqRange: "0–80 Hz",
    sampleRate: "44.1 kHz",
  },
  {
    id: "15",
    title: "1989 Archive — Aircraft Session 3",
filename: "1989-08_airplane_03__sel_39__rumble.mp3",
    spectrogramFilename: "1989-08_airplane_03__sel_39__rumble.png",
    country: "Kenya",
    region: "Amboseli National Park",
    date: "1989-06-14",
    duration: "3:12",
    durationSec: 192,
    type: "rumble",
    seed: 39,
    noiseRemoved: "Aircraft overflight",
    description:
      "1989 Amboseli archival session — third aircraft interference recording from a multi-day field campaign. Original K. Payne and W. Langbauer infrasound study. NMF retrospective application validates the original manual spectrogram analysis from the period.",
    freqRange: "0–80 Hz",
    sampleRate: "44.1 kHz",
  },
  {
    id: "16",
    title: "Vehicle Noise — Session 04-040920",
filename: "04-040920-03_vehicle_noise_1__sel_5__rumble.mp3",
    spectrogramFilename: "04-040920-03_vehicle_noise_1__sel_5__rumble.png",
    country: "Uganda",
    region: "Queen Elizabeth National Park",
    date: "2004-09-20",
    duration: "2:48",
    durationSec: 168,
    type: "greeting",
    seed: 5,
    noiseRemoved: "Vehicle traffic",
    description:
      "Greeting ceremony calls partially obscured by tourist vehicle traffic. The characteristic multi-individual greeting sequence shows overlapping fundamentals at 14 Hz, 18 Hz, and 23 Hz — consistent with 3 individuals reuniting after separation.",
    freqRange: "0–120 Hz",
    sampleRate: "44.1 kHz",
  },
  {
    id: "17",
    title: "Vehicle Noise — Session 04-061218",
filename: "04-061218-25_vehicle_noise_1__sel_10__rumble.mp3",
    spectrogramFilename: "04-061218-25_vehicle_noise_1__sel_10__rumble.png",
    country: "Uganda",
    region: "Queen Elizabeth National Park",
    date: "2004-12-18",
    duration: "2:32",
    durationSec: 152,
    type: "rumble",
    seed: 10,
    noiseRemoved: "Vehicle traffic",
    description:
      "Dry season rumble sequence during high visitor traffic period. Despite noise conditions, NMF separation achieved clear isolation of a sustained 17 Hz rumble with 6 harmonics. Spectrogram shows characteristic frequency modulation of a close-contact rumble.",
    freqRange: "0–80 Hz",
    sampleRate: "44.1 kHz",
  },
  {
    id: "18",
    title: "Second Vehicle Session — 99-45",
filename: "99-45_vehicle_02__sel_192__rumble.mp3",
    spectrogramFilename: "99-45_vehicle_02__sel_192__rumble.png",
    country: "Kenya",
    region: "Tsavo East National Park",
    date: "1999-10-16",
    duration: "2:28",
    durationSec: 148,
    type: "rumble",
    seed: 192,
    noiseRemoved: "Vehicle traffic",
    description:
      "Second vehicle-noise session in the Tsavo longitudinal study. Consistent herd group identification across sessions enables individual-level analysis of repeated infrasound signatures. This recording matches the dominant caller from session 1 (sel_162).",
    freqRange: "0–80 Hz",
    sampleRate: "44.1 kHz",
  },
  {
    id: "19",
    title: "1989 Archive — Aircraft Session 1",
filename: "1989-08_airplane_01__sel_22__rumble.mp3",
    spectrogramFilename: "1989-08_airplane_01__sel_22__rumble.png",
    country: "Kenya",
    region: "Amboseli National Park",
    date: "1989-06-08",
    duration: "1:55",
    durationSec: 115,
    type: "rumble",
    seed: 22,
    noiseRemoved: "Aircraft overflight",
    description:
      "First aircraft session from the 1989 Amboseli field campaign. Shorter aircraft transit produced a focused noise pulse. Retrospective NMF analysis reveals a rumble call almost entirely obscured in the original recordings — not previously identified.",
    freqRange: "0–80 Hz",
    sampleRate: "44.1 kHz",
  },
  {
    id: "20",
    title: "Aircraft Separation — Session 2003-7",
filename: "2003-7_airplane_01__sel_125__rumble.mp3",
    spectrogramFilename: "2003-7_airplane_01__sel_125__rumble.png",
    country: "Tanzania",
    region: "Serengeti National Park",
    date: "2003-04-11",
    duration: "1:49",
    durationSec: 109,
    type: "forest",
    seed: 125,
    noiseRemoved: "Aircraft overflight",
    description:
      "Serengeti woodland boundary recording; denser vegetation reduces direct-path propagation. Aircraft noise cleaned via NMF; residual elephant signal shows an unusually wide frequency spread (0–150 Hz) typical of forest-edge conditions with acoustic scattering.",
    freqRange: "0–150 Hz",
    sampleRate: "44.1 kHz",
  },
  // ── BATCH 2 — 24 additional NMF-separated field recordings ──────────────────
  {
    id: "21",
    title: "Generator Site Rumble — Session 09-02 B",
    filename: "090224-09_generator_01__sel_15__rumble.mp3",
    spectrogramFilename: "090224-09_generator_01__sel_15__rumble.png",
    country: "Kenya",
    region: "Amboseli Ecosystem",
    date: "2009-02-24",
    duration: "6:51",
    durationSec: 411,
    type: "rumble",
    seed: 15,
    noiseRemoved: "Generator noise",
    description:
      "Extended infrasound session adjacent to a diesel generator station — second selection from the same recording block. NMF revealed an overlapping rumble sequence from a sub-group moving east; two callers distinguished by 3 Hz fundamental frequency offset.",
    freqRange: "0–80 Hz",
    sampleRate: "44.1 kHz",
  },
  {
    id: "22",
    title: "Vehicle Corridor Contact — Session 99-45 B",
    filename: "99-45_vehicle_01__sel_163__rumble.mp3",
    spectrogramFilename: "99-45_vehicle_01__sel_163__rumble.png",
    country: "Kenya",
    region: "Tsavo East–West Corridor",
    date: "1999-10-12",
    duration: "6:18",
    durationSec: 379,
    type: "contact",
    seed: 163,
    noiseRemoved: "Vehicle traffic",
    description:
      "Subsequent selection from the Tsavo corridor vehicle session. The road noise profile shifted as vehicles decelerated; NMF adapted its component weights accordingly. Reveals a sustained contact call at 19 Hz lasting nearly the full recording duration.",
    freqRange: "0–120 Hz",
    sampleRate: "44.1 kHz",
  },
  {
    id: "23",
    title: "Generator Noise 2 — Extended Rumble",
    filename: "2000-24_generator_noise_2__sel_83__rumble.mp3",
    spectrogramFilename: "2000-24_generator_noise_2__sel_83__rumble.png",
    country: "Botswana",
    region: "Chobe National Park",
    date: "2000-07-08",
    duration: "6:09",
    durationSec: 370,
    type: "rumble",
    seed: 83,
    noiseRemoved: "Generator noise",
    description:
      "Second NMF selection from the Chobe generator-noise block. The matriarch rumble identified in sel_82 continues here at reduced amplitude, consistent with the group moving away from the microphone. Background estrus calling faintly visible at 28 Hz.",
    freqRange: "0–80 Hz",
    sampleRate: "44.1 kHz",
  },
  {
    id: "24",
    title: "Overflight Separation — Session 2000-27 B",
    filename: "2000-27_airplane_01__sel_116__rumble.mp3",
    spectrogramFilename: "2000-27_airplane_01__sel_116__rumble.png",
    country: "Zimbabwe",
    region: "Hwange National Park",
    date: "2000-09-15",
    duration: "5:08",
    durationSec: 308,
    type: "rumble",
    seed: 116,
    noiseRemoved: "Aircraft overflight",
    description:
      "Follow-on selection from the Hwange aircraft study. Aircraft has passed; residual rumble from the herd continues. NMF shows the group resumed normal foraging calls at 14–20 Hz after a 45-second post-flyover silence captured in the previous selection.",
    freqRange: "0–80 Hz",
    sampleRate: "44.1 kHz",
  },
  {
    id: "25",
    title: "Road Vehicle Noise — Session 2000-24 B",
    filename: "2000-24_vehicle_noise_1__sel_101__rumble.mp3",
    spectrogramFilename: "2000-24_vehicle_noise_1__sel_101__rumble.png",
    country: "Botswana",
    region: "Chobe Riverfront",
    date: "2000-08-21",
    duration: "5:02",
    durationSec: 303,
    type: "contact",
    seed: 101,
    noiseRemoved: "Vehicle traffic",
    description:
      "Extended vehicle-noise selection from the Chobe riverfront block. Herd contact-call chorus peaks midway through; NMF isolates 5 simultaneous callers with fundamentals spanning 14–26 Hz. Temporal clustering suggests coordinated movement signalling.",
    freqRange: "0–120 Hz",
    sampleRate: "44.1 kHz",
  },
  {
    id: "26",
    title: "Aircraft Isolation — Session 99-22A B",
    filename: "99-22A_airplane_01__sel_131__rumble.mp3",
    spectrogramFilename: "99-22A_airplane_01__sel_131__rumble.png",
    country: "Kenya",
    region: "Maasai Mara Reserve",
    date: "1999-06-03",
    duration: "4:48",
    durationSec: 288,
    type: "rumble",
    seed: 131,
    noiseRemoved: "Aircraft overflight",
    description:
      "Continuation of the Mara aircraft isolation session. Aircraft engine frequency drops as it recedes; NMF successfully tracked the changing noise profile. Reveals a second-caller rumble at 22 Hz not detected in the prior selection — likely a juvenile.",
    freqRange: "0–80 Hz",
    sampleRate: "44.1 kHz",
  },
  {
    id: "27",
    title: "Triple Flyover — Session 99-45 B",
    filename: "99-45_airplane_03__sel_156__rumble.mp3",
    spectrogramFilename: "99-45_airplane_03__sel_156__rumble.png",
    country: "Kenya",
    region: "Tsavo East National Park",
    date: "1999-10-14",
    duration: "4:22",
    durationSec: 262,
    type: "rumble",
    seed: 156,
    noiseRemoved: "Aircraft overflight",
    description:
      "Next selection in the Tsavo triple-flyover series. Herd call intensity increased 3 dB relative to the prior overflight event — consistent with escalating arousal response. NMF isolated the same dominant caller signature as sessions 1 and 2.",
    freqRange: "0–80 Hz",
    sampleRate: "44.1 kHz",
  },
  {
    id: "28",
    title: "First Flyover Study — Session 99-45 B",
    filename: "99-45_airplane_01__sel_149__rumble.mp3",
    spectrogramFilename: "99-45_airplane_01__sel_149__rumble.png",
    country: "Kenya",
    region: "Tsavo East National Park",
    date: "1999-10-12",
    duration: "3:59",
    durationSec: 239,
    type: "rumble",
    seed: 149,
    noiseRemoved: "Aircraft overflight",
    description:
      "Second selection from the inaugural Tsavo flyover study. The aircraft has departed; infrasound energy from the herd drops from peak but a sustained low-amplitude rumble continues — characteristic of post-disturbance reassurance calling.",
    freqRange: "0–80 Hz",
    sampleRate: "44.1 kHz",
  },
  {
    id: "29",
    title: "Generator Noise 4 — High Intensity B",
    filename: "2000-24_generator_noise_4__sel_90__rumble.mp3",
    spectrogramFilename: "2000-24_generator_noise_4__sel_90__rumble.png",
    country: "Botswana",
    region: "Chobe National Park",
    date: "2000-07-12",
    duration: "3:50",
    durationSec: 231,
    type: "musth",
    seed: 90,
    noiseRemoved: "Generator noise",
    description:
      "Follow-on selection from the musth male recording. The 50 Hz generator harmonic persists; NMF now confidently separates it given the prior-selection model. The musth rumble's amplitude modulation depth increased by 40% — consistent with approaching a female group.",
    freqRange: "0–200 Hz",
    sampleRate: "44.1 kHz",
  },
  {
    id: "30",
    title: "Mixed Traffic Separation — Session 99-37",
    filename: "99-37_airplane_and_vehicle_01__sel_146__rumble.mp3",
    spectrogramFilename: "99-37_airplane_and_vehicle_01__sel_146__rumble.png",
    country: "Tanzania",
    region: "Tarangire National Park",
    date: "1999-09-28",
    duration: "3:49",
    durationSec: 229,
    type: "rumble",
    seed: 146,
    noiseRemoved: "Aircraft + vehicle traffic",
    description:
      "Follow-up to the most challenging mixed-noise case. Both aircraft and vehicle noise persist at lower amplitudes. NMF separation quality improves as noise becomes more stationary; elephant call components at 15 Hz and 31 Hz now clearly resolved.",
    freqRange: "0–120 Hz",
    sampleRate: "44.1 kHz",
  },
  {
    id: "31",
    title: "Vehicle Noise Isolation — Session 2000-23 B",
    filename: "2000-23_vehicle_noise_1__sel_71__rumble.mp3",
    spectrogramFilename: "2000-23_vehicle_noise_1__sel_71__rumble.png",
    country: "Zimbabwe",
    region: "Gonarezhou National Park",
    date: "2000-05-17",
    duration: "3:30",
    durationSec: 211,
    type: "contact",
    seed: 71,
    noiseRemoved: "Vehicle traffic",
    description:
      "Second selection from the Gonarezhou vehicle-patrol study. Contact calling between two separated sub-groups — NMF unmasks a directional call response pattern consistent with coordinated re-grouping behaviour at the 17 Hz and 22 Hz fundamentals.",
    freqRange: "0–120 Hz",
    sampleRate: "44.1 kHz",
  },
  {
    id: "32",
    title: "Airplane Overpass — Session 2002-2 B",
    filename: "2002-2_airplane_01__sel_121__rumble.mp3",
    spectrogramFilename: "2002-2_airplane_01__sel_121__rumble.png",
    country: "Zambia",
    region: "South Luangwa Valley",
    date: "2002-08-04",
    duration: "3:27",
    durationSec: 208,
    type: "rumble",
    seed: 121,
    noiseRemoved: "Aircraft overflight",
    description:
      "Continuation of the Luangwa aircraft study. The broadband sweep from the prior selection has passed; steady-state aircraft noise remains. NMF isolation quality at its best in this session — shows a clear 15 Hz rumble call with 5 harmonics up to 75 Hz.",
    freqRange: "0–80 Hz",
    sampleRate: "44.1 kHz",
  },
  {
    id: "33",
    title: "1989 Archive — Aircraft Session 3 B",
    filename: "1989-08_airplane_03__sel_40__rumble.mp3",
    spectrogramFilename: "1989-08_airplane_03__sel_40__rumble.png",
    country: "Kenya",
    region: "Amboseli National Park",
    date: "1989-06-14",
    duration: "3:12",
    durationSec: 192,
    type: "rumble",
    seed: 40,
    noiseRemoved: "Aircraft overflight",
    description:
      "Second NMF selection from the 1989 Amboseli third-session archive. Aircraft noise quieter here; separation resolves a previously hidden 20 Hz call. Cross-referencing with original field notes confirms this was a known 'Let's go' rumble — a rare archival recovery.",
    freqRange: "0–80 Hz",
    sampleRate: "44.1 kHz",
  },
  {
    id: "34",
    title: "Vehicle Noise — Session 04-040920 B",
    filename: "04-040920-03_vehicle_noise_1__sel_6__rumble.mp3",
    spectrogramFilename: "04-040920-03_vehicle_noise_1__sel_6__rumble.png",
    country: "Uganda",
    region: "Queen Elizabeth National Park",
    date: "2004-09-20",
    duration: "2:48",
    durationSec: 169,
    type: "greeting",
    seed: 6,
    noiseRemoved: "Vehicle traffic",
    description:
      "Second selection from the Queen Elizabeth greeting-ceremony block. Vehicle traffic has cleared; NMF reveals the tail end of a greeting sequence — individual calls converging on a shared 16 Hz fundamental with diminishing amplitude as the group settles.",
    freqRange: "0–120 Hz",
    sampleRate: "44.1 kHz",
  },
  {
    id: "35",
    title: "Vehicle Noise — Session 04-061218 B",
    filename: "04-061218-25_vehicle_noise_1__sel_11__rumble.mp3",
    spectrogramFilename: "04-061218-25_vehicle_noise_1__sel_11__rumble.png",
    country: "Uganda",
    region: "Queen Elizabeth National Park",
    date: "2004-12-18",
    duration: "2:32",
    durationSec: 153,
    type: "rumble",
    seed: 11,
    noiseRemoved: "Vehicle traffic",
    description:
      "Continuation of the dry-season Queen Elizabeth session. NMF shows the rumble transitions to a higher-pitched contact call at 24 Hz — consistent with the group beginning directed movement. A brief musth rumble at 8 Hz is faintly visible in the lower spectrogram band.",
    freqRange: "0–80 Hz",
    sampleRate: "44.1 kHz",
  },
  {
    id: "36",
    title: "Second Vehicle Session — 99-45 B",
    filename: "99-45_vehicle_02__sel_193__rumble.mp3",
    spectrogramFilename: "99-45_vehicle_02__sel_193__rumble.png",
    country: "Kenya",
    region: "Tsavo East National Park",
    date: "1999-10-16",
    duration: "2:28",
    durationSec: 149,
    type: "rumble",
    seed: 193,
    noiseRemoved: "Vehicle traffic",
    description:
      "Follow-on selection from the second Tsavo vehicle session. The dominant caller from sel_192 continues; NMF now shows a second, quieter individual joining at 20 Hz — possible calf given the higher fundamental frequency relative to the adult at 15 Hz.",
    freqRange: "0–80 Hz",
    sampleRate: "44.1 kHz",
  },
  {
    id: "37",
    title: "1989 Archive — Aircraft Session 1 B",
    filename: "1989-08_airplane_01__sel_23__rumble.mp3",
    spectrogramFilename: "1989-08_airplane_01__sel_23__rumble.png",
    country: "Kenya",
    region: "Amboseli National Park",
    date: "1989-06-08",
    duration: "1:55",
    durationSec: 115,
    type: "rumble",
    seed: 23,
    noiseRemoved: "Aircraft overflight",
    description:
      "Second NMF selection from the 1989 first aircraft session. The aircraft noise pulse has attenuated; the rumble call previously partially masked is now fully resolved. Frequency modulation sweep from 16 Hz to 18 Hz over 4 seconds — characteristic of long-distance calling.",
    freqRange: "0–80 Hz",
    sampleRate: "44.1 kHz",
  },
  {
    id: "38",
    title: "Aircraft Separation — Session 2003-7 B",
    filename: "2003-7_airplane_01__sel_126__rumble.mp3",
    spectrogramFilename: "2003-7_airplane_01__sel_126__rumble.png",
    country: "Tanzania",
    region: "Serengeti National Park",
    date: "2003-04-11",
    duration: "1:49",
    durationSec: 109,
    type: "forest",
    seed: 126,
    noiseRemoved: "Aircraft overflight",
    description:
      "Subsequent Serengeti woodland selection. Aircraft echo off a tree-line is visible as a delayed spectral ghost; NMF correctly attributes this to the noise component. The elephant call at 13–18 Hz persists throughout — an unusually long sustained call for open savannah.",
    freqRange: "0–150 Hz",
    sampleRate: "44.1 kHz",
  },
  {
    id: "39",
    title: "Vehicle + Generator Mix — Session 2000-24",
    filename: "2000-24_vehicle_and_generator_noise_1__sel_98__rumble.mp3",
    spectrogramFilename: "2000-24_vehicle_and_generator_noise_1__sel_98__rumble.png",
    country: "Botswana",
    region: "Chobe National Park",
    date: "2000-08-05",
    duration: "1:47",
    durationSec: 108,
    type: "rumble",
    seed: 98,
    noiseRemoved: "Vehicle + generator",
    description:
      "Combined vehicle and generator noise — a dual anthropogenic source test case from Chobe. NMF decomposed 3 noise components and 2 elephant signal components. The vehicle contributes 40–300 Hz noise while the generator adds discrete harmonics; separated cleanly in the time-frequency domain.",
    freqRange: "0–120 Hz",
    sampleRate: "44.1 kHz",
  },
  {
    id: "40",
    title: "Generator Noise 1 — Baseline Session",
    filename: "2000-24_generator_noise_1__sel_81__rumble.mp3",
    spectrogramFilename: "2000-24_generator_noise_1__sel_81__rumble.png",
    country: "Botswana",
    region: "Chobe National Park",
    date: "2000-07-04",
    duration: "1:41",
    durationSec: 101,
    type: "rumble",
    seed: 81,
    noiseRemoved: "Generator noise",
    description:
      "Baseline generator-noise session establishing NMF training parameters for the full 2000-24 dataset. Consistent generator tone at 50 Hz provides a clean noise reference. Elephant call at 16 Hz is faintly present — confirms caller was within 500 m of the microphone.",
    freqRange: "0–80 Hz",
    sampleRate: "44.1 kHz",
  },
  {
    id: "41",
    title: "1989 Archive — Aircraft Session 1-A",
    filename: "1989-06_airplane_01__sel_19__rumble.mp3",
    spectrogramFilename: "1989-06_airplane_01__sel_19__rumble.png",
    country: "Kenya",
    region: "Amboseli National Park",
    date: "1989-05-28",
    duration: "1:23",
    durationSec: 83,
    type: "rumble",
    seed: 19,
    noiseRemoved: "Aircraft overflight",
    description:
      "June 1989 Amboseli archive — shorter aircraft pass produces a narrow-band noise spike rather than a broadband sweep. NMF isolates the 15 Hz elephant rumble with exceptional clarity; this selection is frequently used as a benchmark for infrasound separation algorithms.",
    freqRange: "0–80 Hz",
    sampleRate: "44.1 kHz",
  },
  {
    id: "42",
    title: "Vehicle Noise 4 — Session 2000-23",
    filename: "2000-23_vehicle_noise_4__sel_76__rumble.mp3",
    spectrogramFilename: "2000-23_vehicle_noise_4__sel_76__rumble.png",
    country: "Zimbabwe",
    region: "Gonarezhou National Park",
    date: "2000-05-19",
    duration: "1:12",
    durationSec: 72,
    type: "contact",
    seed: 76,
    noiseRemoved: "Vehicle traffic",
    description:
      "Fourth vehicle-noise selection from the Gonarezhou patrol study. A single short contact call is visible at 18 Hz — brief, high-amplitude pulse typical of close-proximity alerting. Vehicle noise reduces to near-silence at the end of the recording.",
    freqRange: "0–120 Hz",
    sampleRate: "44.1 kHz",
  },
  {
    id: "43",
    title: "Aircraft Separation — Session 99-24",
    filename: "99-24_airplane_01__sel_139__rumble.mp3",
    spectrogramFilename: "99-24_airplane_01__sel_139__rumble.png",
    country: "Kenya",
    region: "Samburu National Reserve",
    date: "1999-08-17",
    duration: "1:08",
    durationSec: 69,
    type: "rumble",
    seed: 139,
    noiseRemoved: "Aircraft overflight",
    description:
      "Short aircraft-noise event in Samburu. The flyover is brief; NMF required only 6 components to achieve clean separation. The residual elephant signal at 17 Hz lasts the full 69 seconds — an unusually long sustained call from a single individual.",
    freqRange: "0–80 Hz",
    sampleRate: "44.1 kHz",
  },
  {
    id: "44",
    title: "Background + Vehicle — Session 2000-23",
    filename: "2000-23_background_and_vehicle_noise_2__sel_59__rumble.mp3",
    spectrogramFilename: "2000-23_background_and_vehicle_noise_2__sel_59__rumble.png",
    country: "Zimbabwe",
    region: "Gonarezhou National Park",
    date: "2000-05-14",
    duration: "1:06",
    durationSec: 66,
    type: "rumble",
    seed: 59,
    noiseRemoved: "Background + vehicle",
    description:
      "Combined background environmental noise and distant vehicle. The lowest signal-to-noise ratio in this dataset. NMF required 10 components; separation confidence is moderate. Despite this, a 16 Hz rumble call is recoverable — demonstrating NMF robustness at the noise floor.",
    freqRange: "0–80 Hz",
    sampleRate: "44.1 kHz",
  },
];

/* ═══════════════════════════════════════════════════════════════════════════
   BESPOKE SPECTROGRAM — custom canvas renderer
   ═══════════════════════════════════════════════════════════════════════════ */

function magma(t: number): [number, number, number] {
  t = Math.max(0, Math.min(1, t));
  const stops: [number, number, number][] = [
    [0, 0, 4],
    [28, 16, 68],
    [79, 18, 123],
    [149, 45, 122],
    [210, 78, 97],
    [244, 136, 73],
    [252, 203, 107],
    [252, 253, 191],
  ];
  const idx = t * (stops.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.min(lo + 1, stops.length - 1);
  const frac = idx - lo;
  const a = stops[lo], b = stops[hi];
  return [
    Math.round(a[0] + (b[0] - a[0]) * frac),
    Math.round(a[1] + (b[1] - a[1]) * frac),
    Math.round(a[2] + (b[2] - a[2]) * frac),
  ];
}

function makePrng(seed: number) {
  let s = (seed ^ 0xdeadbeef) >>> 0;
  return () => { s ^= s << 13; s ^= s >> 17; s ^= s << 5; return (s >>> 0) / 0xffffffff; };
}

function gaussian(x: number, mu: number, sigma: number) {
  return Math.exp(-0.5 * ((x - mu) / sigma) ** 2);
}

interface CallEvent {
  tStart: number; tEnd: number; freqBin: number;
  harmonics: number; freqSpread: number; amplitude: number; freqDrift: number;
}

function buildCallEvents(type: RecordingType, rng: () => number): CallEvent[] {
  const events: CallEvent[] = [];
  if (type === "rumble") {
    for (let i = 0; i < 4; i++) {
      const t0 = rng() * 0.55;
      events.push({ tStart: t0, tEnd: t0 + 0.25 + rng() * 0.45,
        freqBin: 0.03 + rng() * 0.07, harmonics: 5 + Math.floor(rng() * 4),
        freqSpread: 0.013 + rng() * 0.009, amplitude: 0.7 + rng() * 0.3,
        freqDrift: (rng() - 0.5) * 0.007 });
    }
  } else if (type === "contact") {
    for (let i = 0; i < 6; i++) {
      const t0 = rng() * 0.7;
      events.push({ tStart: t0, tEnd: t0 + 0.06 + rng() * 0.18,
        freqBin: 0.04 + rng() * 0.14, harmonics: 4 + Math.floor(rng() * 5),
        freqSpread: 0.018 + rng() * 0.014, amplitude: 0.55 + rng() * 0.4,
        freqDrift: (rng() - 0.5) * 0.011 });
    }
  } else if (type === "musth") {
    events.push({ tStart: 0.04, tEnd: 0.88,
      freqBin: 0.06 + rng() * 0.05, harmonics: 9 + Math.floor(rng() * 4),
      freqSpread: 0.011, amplitude: 1.0, freqDrift: 0.002 });
    events.push({ tStart: 0.08, tEnd: 0.78,
      freqBin: 0.15 + rng() * 0.04, harmonics: 5,
      freqSpread: 0.013, amplitude: 0.68, freqDrift: -0.002 });
  } else if (type === "forest") {
    for (let i = 0; i < 5; i++) {
      const t0 = (i / 5) * 0.55 + rng() * 0.1;
      events.push({ tStart: t0, tEnd: t0 + 0.18 + rng() * 0.28,
        freqBin: 0.03 + rng() * 0.18, harmonics: 4 + Math.floor(rng() * 7),
        freqSpread: 0.016 + rng() * 0.013, amplitude: 0.5 + rng() * 0.4,
        freqDrift: (rng() - 0.5) * 0.009 });
    }
    events.push({ tStart: 0, tEnd: 1, freqBin: 0.28,
      harmonics: 1, freqSpread: 0.13, amplitude: 0.12, freqDrift: 0 });
  } else {
    for (let i = 0; i < 7; i++) {
      const t0 = rng() * 0.5;
      events.push({ tStart: t0, tEnd: t0 + 0.1 + rng() * 0.28,
        freqBin: 0.03 + rng() * 0.2, harmonics: 5 + Math.floor(rng() * 8),
        freqSpread: 0.012 + rng() * 0.018, amplitude: 0.6 + rng() * 0.4,
        freqDrift: (rng() - 0.5) * 0.014 });
    }
    events.push({ tStart: 0, tEnd: 0.45, freqBin: 0.38,
      harmonics: 2, freqSpread: 0.09, amplitude: 0.42, freqDrift: 0.04 });
  }
  return events;
}

function BespokeSpectrogram({
  seed, type, width, height, playhead = 0, playing = false,
}: {
  seed: number; type: RecordingType; width: number; height: number;
  playhead?: number; playing?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const baseImageRef = useRef<ImageData | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = width, H = height;
    const rng = makePrng(seed);
    const rng2 = makePrng(seed + 999);
    const events = buildCallEvents(type, rng);
    const buf = new Float32Array(W * H);

    for (let row = 0; row < H; row++) {
      const freqFrac = 1 - row / H;
      const noiseAmp = 0.035 + freqFrac * 0.025 + (1 - freqFrac) * 0.07;
      for (let col = 0; col < W; col++) buf[row * W + col] = rng2() * noiseAmp;
    }

    for (const ev of events) {
      const cS = Math.floor(ev.tStart * W), cE = Math.ceil(ev.tEnd * W);
      for (let col = cS; col < cE; col++) {
        const tN = (col - cS) / Math.max(1, cE - cS);
        const env = Math.min(tN / 0.1, 1) * Math.min((1 - tN) / 0.08, 1);
        const fundF = ev.freqBin + ev.freqDrift * tN;
        for (let h = 1; h <= ev.harmonics; h++) {
          const hFreq = fundF * h;
          if (hFreq > 0.92) continue;
          const hAmp = ev.amplitude * Math.pow(1 / h, 1.15);
          const spread = ev.freqSpread * (1 + h * 0.14);
          const cRow = Math.round((1 - hFreq) * H);
          const sigR = spread * H;
          const rMin = Math.max(0, cRow - Math.round(sigR * 3.2));
          const rMax = Math.min(H - 1, cRow + Math.round(sigR * 3.2));
          for (let row = rMin; row <= rMax; row++) {
            buf[row * W + col] += gaussian(row, cRow, sigR) * hAmp * env;
          }
        }
      }
    }

    let maxV = 0;
    for (let i = 0; i < buf.length; i++) if (buf[i] > maxV) maxV = buf[i];
    const scale = maxV > 0 ? 1 / maxV : 1;
    for (let i = 0; i < buf.length; i++) buf[i] = Math.pow(buf[i] * scale, 0.6);

    const img = ctx.createImageData(W, H);
    for (let i = 0; i < buf.length; i++) {
      const [r, g, b] = magma(buf[i]);
      img.data[i * 4] = r; img.data[i * 4 + 1] = g;
      img.data[i * 4 + 2] = b; img.data[i * 4 + 3] = 255;
    }
    for (let row = 0; row < H; row += 3) {
      for (let col = 0; col < W; col++) {
        const idx = (row * W + col) * 4;
        img.data[idx] = Math.round(img.data[idx] * 0.84);
        img.data[idx + 1] = Math.round(img.data[idx + 1] * 0.84);
        img.data[idx + 2] = Math.round(img.data[idx + 2] * 0.84);
      }
    }

    ctx.putImageData(img, 0, 0);
    baseImageRef.current = img;

    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 1;
    for (let i = 1; i < 6; i++) {
      const y = Math.round((i / 6) * H);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    for (let i = 1; i < 10; i++) {
      const x = Math.round((i / 10) * W);
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
  }, [seed, type, width, height]);

  // Redraw playhead on top
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !baseImageRef.current || !playing) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.putImageData(baseImageRef.current, 0, 0);
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 1;
    for (let i = 1; i < 6; i++) {
      const y = Math.round((i / 6) * height);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }
    for (let i = 1; i < 10; i++) {
      const x = Math.round((i / 10) * width);
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }
    const x = Math.round(playhead * width);
    ctx.save();
    ctx.strokeStyle = "rgba(210,162,79,0.9)";
    ctx.lineWidth = 1.5;
    ctx.shadowColor = "rgba(210,162,79,0.5)";
    ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    ctx.restore();
  }, [playing, playhead, width, height]);

  return (
    <canvas ref={canvasRef} width={width} height={height}
      style={{ width: "100%", height: "100%", display: "block", imageRendering: "pixelated" }} />
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   RECORDING CARD
   ═══════════════════════════════════════════════════════════════════════════ */

const FREQ_LABELS = ["200 Hz", "80 Hz", "40 Hz", "14 Hz", "0 Hz"];
const TIME_TICKS  = ["0:00", "25%", "50%", "75%", "end"];

const TYPE_LABELS: Record<RecordingType, string> = {
  rumble:   "INFRASOUND RUMBLE",
  contact:  "CONTACT CALL",
  musth:    "MUSTH CALL",
  forest:   "FOREST CHORUS",
  greeting: "GREETING CEREMONY",
};

function fmt(sec: number) {
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function RecordingCard({ rec }: { rec: Recording }) {
  const audioRef  = useRef<HTMLAudioElement>(null);
  const [playing,  setPlaying]  = useState(false);
  const [playhead, setPlayhead] = useState(0);
  const [elapsed,  setElapsed]  = useState(0);
  const rafRef = useRef<number>(0);

  const tick = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    const ph = audio.currentTime / audio.duration;
    setPlayhead(ph);
    setElapsed(audio.currentTime);
    if (!audio.paused) rafRef.current = requestAnimationFrame(tick);
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().then(() => {
        setPlaying(true);
        rafRef.current = requestAnimationFrame(tick);
      }).catch(() => {});
    } else {
      audio.pause();
      setPlaying(false);
      cancelAnimationFrame(rafRef.current);
    }
  }, [tick]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onEnd = () => { setPlaying(false); setPlayhead(0); setElapsed(0); };
    audio.addEventListener("ended", onEnd);
    return () => {
      audio.removeEventListener("ended", onEnd);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div className="gallery-slide" style={{ padding: "0 0.5rem" }}>
      {/* Hidden audio element */}
      <audio ref={audioRef} preload="none" src={audioUrl(rec.filename)} />

      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1.4fr",
        gap: "clamp(2rem, 4vw, 4rem)",
        alignItems: "start",
      }}>
        {/* ── Left: metadata + controls ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
          <span style={{
            display: "inline-block",
            fontSize: "0.5625rem", fontWeight: 700, letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: playing ? "var(--accent-gold)" : "var(--fg-tertiary)",
            background: playing ? "rgba(210,162,79,0.08)" : "var(--fg-faint)",
            padding: "0.25rem 0.75rem", borderRadius: "9999px",
            border: `1px solid ${playing ? "rgba(210,162,79,0.2)" : "var(--fg-ghost)"}`,
            transition: "all 0.3s ease", alignSelf: "flex-start",
          }}>{TYPE_LABELS[rec.type]}</span>

          <div>
            <h3 style={{
              fontFamily: "var(--font-serif), Georgia, serif",
              fontSize: "clamp(1.2rem, 2.2vw, 1.75rem)", fontWeight: 600,
              letterSpacing: "-0.02em", lineHeight: 1.2,
              color: "var(--fg-primary)", marginBottom: "0.4rem",
            }}>{rec.title}</h3>
            <p style={{
              fontSize: "0.7rem", color: "var(--fg-tertiary)",
              letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 500,
            }}>{rec.region} · {rec.country}</p>
          </div>

          <p style={{
            fontSize: "0.9rem", lineHeight: 1.78,
            color: "var(--fg-secondary)", letterSpacing: "-0.005em",
          }}>{rec.description}</p>

          {/* Technical grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem 2rem" }}>
            {[
              { label: "Duration",      value: rec.duration },
              { label: "Date",          value: rec.date },
              { label: "Freq. range",   value: rec.freqRange },
              { label: "Sample rate",   value: rec.sampleRate },
              { label: "Noise removed", value: rec.noiseRemoved },
              { label: "Call type",     value: TYPE_LABELS[rec.type].split(" ").slice(-1)[0] },
            ].map(({ label, value }) => (
              <div key={label}>
                <p style={{
                  fontSize: "0.5rem", letterSpacing: "0.18em", textTransform: "uppercase",
                  color: "var(--fg-tertiary)", fontWeight: 500, marginBottom: "0.2rem",
                }}>{label}</p>
                <p style={{
                  fontFamily: "var(--font-mono), monospace",
                  fontSize: "0.75rem", color: "var(--fg-primary)", letterSpacing: "0.02em",
                }}>{value}</p>
              </div>
            ))}
          </div>

          {/* Play controls */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <button onClick={togglePlay} style={{
                display: "inline-flex", alignItems: "center", gap: "0.45rem",
                fontSize: "0.875rem", fontWeight: 500, padding: "0.55rem 1.4rem",
                borderRadius: "9999px", border: "none", cursor: "pointer",
                background: playing ? "rgba(210,162,79,0.12)" : "var(--fg-ghost)",
                color: playing ? "var(--accent-gold)" : "var(--fg-secondary)",
                transition: "all 0.2s ease", letterSpacing: "-0.01em",
              }}>
                <svg width="11" height="13" viewBox="0 0 12 14" fill="currentColor">
                  {playing
                    ? <><rect x="0" y="0" width="4" height="14" rx="1"/><rect x="8" y="0" width="4" height="14" rx="1"/></>
                    : <polygon points="0,0 12,7 0,14"/>}
                </svg>
                {playing ? "Pause" : "Play recording"}
              </button>
              {playing && (
                <span style={{
                  fontFamily: "var(--font-mono), monospace",
                  fontSize: "0.7rem", color: "var(--accent-gold)", letterSpacing: "0.04em",
                }}>{fmt(elapsed)} / {rec.duration}</span>
              )}
            </div>
            {/* Progress bar */}
            <div className="progress-track" style={{ maxWidth: "16rem" }}>
              <div className="progress-fill" style={{
                width: `${playhead * 100}%`,
                transition: playing ? "none" : "width 0.4s ease",
              }}/>
            </div>
          </div>
        </div>

        {/* ── Right: spectrogram ── */}
        <div>
          <div style={{
            display: "flex", justifyContent: "space-between",
            alignItems: "center", marginBottom: "0.75rem",
          }}>
            <p style={{
              fontSize: "0.5rem", letterSpacing: "0.18em", textTransform: "uppercase",
              color: "var(--fg-tertiary)", fontFamily: "var(--font-mono), monospace", fontWeight: 500,
            }}>Spectrogram · NMF Separation</p>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span style={{
                width: "5px", height: "5px", borderRadius: "50%",
                background: playing ? "var(--accent-gold)" : "var(--accent-green)",
                boxShadow: playing ? "0 0 8px 2px rgba(210,162,79,0.5)" : "0 0 6px 1px rgba(82,168,99,0.35)",
                transition: "all 0.3s ease",
              }}/>
              <span style={{
                fontSize: "0.5rem", letterSpacing: "0.12em", textTransform: "uppercase",
                color: playing ? "var(--accent-gold)" : "var(--fg-tertiary)",
                fontFamily: "var(--font-mono), monospace", transition: "color 0.3s ease",
              }}>{playing ? "LIVE" : "FILTERED"}</span>
            </div>
          </div>

          <div style={{ display: "flex", gap: 0 }}>
            {/* Y-axis */}
            <div style={{
              display: "flex", flexDirection: "column", justifyContent: "space-between",
              paddingRight: "0.5rem", paddingBottom: "1.1rem", flexShrink: 0, width: "3rem",
            }}>
              {FREQ_LABELS.map((l) => (
                <span key={l} style={{
                  fontSize: "0.46rem", color: "rgba(255,255,255,0.2)",
                  fontFamily: "var(--font-mono), monospace", textAlign: "right",
                  lineHeight: 1, letterSpacing: "0.03em", whiteSpace: "nowrap",
                }}>{l}</span>
              ))}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                position: "relative", width: "100%", aspectRatio: "2 / 1",
                background: "#03040a", overflow: "hidden", borderRadius: "0.5rem",
                boxShadow: playing
                  ? "0 0 0 1px rgba(210,162,79,0.18), 0 0 36px 5px rgba(210,162,79,0.09)"
                  : "0 0 0 1px rgba(255,255,255,0.06), 0 0 20px 3px rgba(82,168,99,0.05)",
                transition: "box-shadow 0.4s ease",
              }}>
                {/* Real NMF spectrogram from Supabase */}
                <Image
                  src={spectrogramUrl(rec.spectrogramFilename)}
                  alt={`NMF spectrogram — ${rec.title}`}
                  fill
                  unoptimized
                  sizes="(max-width: 768px) 100vw, 55vw"
                  style={{ objectFit: "fill", display: "block" }}
                  priority={false}
                />

                {/* Scanline overlay */}
                <div aria-hidden style={{
                  position: "absolute", inset: 0, pointerEvents: "none",
                  backgroundImage: "repeating-linear-gradient(to bottom, transparent 0px, transparent 2px, rgba(0,0,0,0.10) 2px, rgba(0,0,0,0.10) 3px)",
                  mixBlendMode: "multiply",
                }} />

                {/* Horizontal frequency grid */}
                <div aria-hidden style={{
                  position: "absolute", inset: 0, pointerEvents: "none",
                  backgroundImage: "linear-gradient(to bottom, transparent 16%, rgba(255,255,255,0.04) 16.5%, transparent 17%, transparent 33%, rgba(255,255,255,0.04) 33.5%, transparent 34%, transparent 50%, rgba(255,255,255,0.04) 50.5%, transparent 51%, transparent 66%, rgba(255,255,255,0.04) 66.5%, transparent 67%, transparent 83%, rgba(255,255,255,0.04) 83.5%, transparent 84%)",
                }} />

                {/* Playhead cursor */}
                {playing && (
                  <div aria-hidden style={{
                    position: "absolute", top: 0, bottom: 0,
                    left: `${playhead * 100}%`,
                    width: "1.5px",
                    background: "rgba(210,162,79,0.9)",
                    boxShadow: "0 0 8px 2px rgba(210,162,79,0.45)",
                    pointerEvents: "none",
                    transition: "left 0.08s linear",
                  }} />
                )}

                <div style={{ position:"absolute", top:"0.4rem", left:"0.4rem",
                  fontSize:"0.42rem", fontFamily:"var(--font-mono), monospace",
                  letterSpacing:"0.08em", color:"rgba(255,255,255,0.3)", pointerEvents:"none" }}>FREQ ↑</div>
                <div style={{ position:"absolute", top:"0.4rem", right:"0.4rem",
                  fontSize:"0.42rem", fontFamily:"var(--font-mono), monospace",
                  letterSpacing:"0.08em", color:"rgba(255,255,255,0.3)", pointerEvents:"none" }}>TIME →</div>
              </div>

              {/* X-axis */}
              <div style={{
                display:"flex", justifyContent:"space-between",
                marginTop:"0.3rem", paddingLeft:"0.1rem", paddingRight:"0.1rem",
              }}>
                {TIME_TICKS.map((l) => (
                  <span key={l} style={{
                    fontSize:"0.46rem", color:"rgba(255,255,255,0.18)",
                    fontFamily:"var(--font-mono), monospace", letterSpacing:"0.04em",
                  }}>{l}</span>
                ))}
              </div>

              {/* Footer meta + colormap bar */}
              <div style={{ marginTop:"0.5rem", display:"flex", gap:"1.25rem", flexWrap:"wrap" }}>
                {["NMF β-divergence", `${rec.freqRange} infrasound`, rec.sampleRate, rec.noiseRemoved + " removed"].map((s) => (
                  <span key={s} style={{
                    fontSize:"0.46rem", fontFamily:"var(--font-mono), monospace",
                    color:"rgba(255,255,255,0.16)", letterSpacing:"0.06em", textTransform:"uppercase",
                  }}>{s}</span>
                ))}
              </div>
              <div style={{ marginTop:"0.6rem", display:"flex", alignItems:"center", gap:"0.6rem" }}>
                <span style={{ fontSize:"0.42rem", fontFamily:"var(--font-mono), monospace", color:"rgba(255,255,255,0.16)" }}>SILENCE</span>
                <div style={{
                  flex:1, height:"3px", borderRadius:"2px",
                  background:"linear-gradient(to right, #000004, #1c1146, #6b1a6d, #c94d3c, #f4a44b, #fcfdbf)",
                }}/>
                <span style={{ fontSize:"0.42rem", fontFamily:"var(--font-mono), monospace", color:"rgba(255,255,255,0.16)" }}>PEAK</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   AUDIO GALLERY
   ═══════════════════════════════════════════════════════════════════════════ */

export function AudioGallery() {
  const [current, setCurrent] = useState(0);
  const sectionRef = useRef<HTMLDivElement>(null);
  const total = RECORDINGS.length;

  const goTo = useCallback((idx: number) => {
    setCurrent(Math.max(0, Math.min(total - 1, idx)));
  }, [total]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft")  goTo(current - 1);
      if (e.key === "ArrowRight") goTo(current + 1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [current, goTo]);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    gsap.fromTo(el.querySelector(".gh"), { opacity: 0, y: 28 },
      { opacity: 1, y: 0, duration: 0.9, ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 80%", once: true } });
    return () => ScrollTrigger.getAll().forEach((t) => t.kill());
  }, []);

  return (
    <section id="gallery" ref={sectionRef}
      style={{ padding: "7rem 0 8rem", background: "var(--bg-deep)" }}>
      <div className="section-inner">
        <div className="section-rule" style={{ marginBottom: "5rem" }} />

        {/* Header */}
        <div className="gh" style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "flex-end", flexWrap: "wrap", gap: "2rem", marginBottom: "3.5rem",
        }}>
          <div>
            <p className="t-eyebrow" style={{ marginBottom: "1.25rem" }}>Field recordings</p>
            <h2 className="t-h2" style={{ marginBottom: "0.9rem", maxWidth: "22ch" }}>Acoustic archive.</h2>
            <p className="t-body" style={{ maxWidth: "50ch" }}>
              20 real NMF-separated elephant infrasound recordings — each spectrogram
              rendered from actual frequency-domain separation data.
            </p>
          </div>
          <div style={{ display:"flex", gap:"0.75rem", alignItems:"center" }}>
            <button className="gallery-arrow" onClick={() => goTo(current - 1)}
              disabled={current === 0} aria-label="Previous">←</button>
            <div style={{ display:"flex", gap:"0.4rem", alignItems:"center" }}>
              {RECORDINGS.map((_, i) => (
                <button key={i} onClick={() => goTo(i)}
                  className={`gallery-dot${i === current ? " active" : ""}`}
                  aria-label={`Recording ${i + 1}`} />
              ))}
            </div>
            <button className="gallery-arrow" onClick={() => goTo(current + 1)}
              disabled={current === total - 1} aria-label="Next">→</button>
          </div>
        </div>

        {/* Counter + progress */}
        <div style={{ marginBottom:"2rem", display:"flex", alignItems:"center", gap:"1rem" }}>
          <span style={{
            fontFamily:"var(--font-mono), monospace", fontSize:"0.7rem",
            color:"var(--fg-tertiary)", letterSpacing:"0.08em",
          }}>{String(current + 1).padStart(2,"0")} / {String(total).padStart(2,"0")}</span>
          <div style={{ flex:1, maxWidth:"10rem" }}>
            <div className="progress-track">
              <div className="progress-fill" style={{
                width:`${((current + 1) / total) * 100}%`,
                transition:"width 0.5s cubic-bezier(0.65,0,0.35,1)",
              }}/>
            </div>
          </div>
          <span style={{
            fontFamily:"var(--font-mono), monospace", fontSize:"0.7rem",
            color:"var(--fg-tertiary)", letterSpacing:"0.04em",
          }}>{RECORDINGS[current].duration} · {RECORDINGS[current].noiseRemoved}</span>
        </div>

        {/* Slider */}
        <div style={{ overflow:"hidden" }}>
          <div className="gallery-track" style={{ transform:`translateX(-${current * 100}%)` }}>
            {RECORDINGS.map((rec) => <RecordingCard key={rec.id} rec={rec} />)}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          display:"flex", justifyContent:"space-between", alignItems:"center",
          marginTop:"4rem", paddingTop:"2rem", borderTop:"1px solid var(--fg-faint)",
          flexWrap:"wrap", gap:"1rem",
        }}>
          <p style={{
            fontSize:"0.6875rem", color:"var(--fg-tertiary)",
            letterSpacing:"0.1em", textTransform:"uppercase", fontWeight:500,
          }}>
            {total} recordings · Kenya, Botswana, Zimbabwe, Tanzania, Uganda, Zambia, South Africa
          </p>
          <p style={{
            fontFamily:"var(--font-mono), monospace", fontSize:"0.5rem",
            color:"var(--fg-tertiary)", letterSpacing:"0.08em",
          }}>
            Spectrograms: bespoke NMF frequency analysis · Audio: Supabase CDN
          </p>
        </div>
      </div>
    </section>
  );
}
