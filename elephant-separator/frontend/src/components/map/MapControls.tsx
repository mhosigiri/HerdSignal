"use client";

import { useMapStore } from "@/store/mapStore";

const threatOptions = ["Poaching", "Habitat loss", "Conflict", "Drought"];

export function MapControls() {
  const {
    activeLayers,
    selectedSpecies,
    selectedYear,
    threatFilter,
    setSelectedSpecies,
    setSelectedYear,
    toggleLayer,
    toggleThreatFilter,
  } = useMapStore();

  return (
    <div className="rounded-[2rem] border border-stone-200/80 bg-[#f7f1e6] p-5 shadow-[0_18px_60px_rgba(56,44,29,0.1)]">
      <div className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-stone-500">Map filters</p>
          <h2 className="mt-2 text-xl font-semibold text-stone-900">Active layers</h2>
        </div>

        <div className="grid gap-2">
          {Object.entries(activeLayers).map(([key, value]) => (
            <button
              key={key}
              type="button"
              onClick={() => toggleLayer(key as keyof typeof activeLayers)}
              className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                value
                  ? "border-[#27452d] bg-[#27452d] text-stone-50"
                  : "border-stone-300 bg-white text-stone-700"
              }`}
            >
              {key}
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-2 text-sm text-stone-700">
            <span className="font-medium">Species</span>
            <select
              value={selectedSpecies}
              onChange={(event) =>
                setSelectedSpecies(event.target.value as typeof selectedSpecies)
              }
              className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3"
            >
              <option value="african-savanna">African Savanna</option>
              <option value="african-forest">African Forest</option>
              <option value="asian">Asian</option>
            </select>
          </label>

          <label className="space-y-2 text-sm text-stone-700">
            <span className="font-medium">Year</span>
            <input
              type="range"
              min={2018}
              max={2024}
              step={1}
              value={selectedYear}
              onChange={(event) => setSelectedYear(Number(event.target.value))}
              className="w-full"
            />
            <span className="text-xs text-stone-500">{selectedYear}</span>
          </label>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-stone-700">Threat filters</p>
          <div className="flex flex-wrap gap-2">
            {threatOptions.map((threat) => {
              const active = threatFilter.includes(threat);
              return (
                <button
                  key={threat}
                  type="button"
                  onClick={() => toggleThreatFilter(threat)}
                  className={`rounded-full px-4 py-2 text-xs uppercase tracking-[0.18em] ${
                    active ? "bg-[#d29d48] text-stone-950" : "bg-stone-200 text-stone-700"
                  }`}
                >
                  {threat}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

