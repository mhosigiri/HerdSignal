"use client";

import dynamic from "next/dynamic";

import { MapControls } from "@/components/map/MapControls";

const ElephantMap = dynamic(
  () => import("@/components/map/ElephantMap").then((module) => module.ElephantMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[34rem] items-center justify-center rounded-[2rem] border border-white/10 bg-[#14251a] text-stone-200">
        Loading map…
      </div>
    ),
  },
);

export default function MapPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-[2.3rem] border border-white/50 bg-[linear-gradient(135deg,rgba(246,240,229,0.95),rgba(228,218,199,0.85))] px-6 py-8 shadow-[0_24px_80px_rgba(56,44,29,0.08)]">
        <p className="text-xs uppercase tracking-[0.32em] text-stone-500">Map intelligence</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-stone-900">
          Geospatial view of corridors, threats, and audio collection
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-600">
          Google Maps with cloud-based satellite styling. Population bubbles, threat incidents, migration corridors, habitat zones, and audio markers are pulled from Supabase in real time.
        </p>
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.72fr_1.28fr]">
        <MapControls />
        <ElephantMap />
      </div>
    </div>
  );
}
