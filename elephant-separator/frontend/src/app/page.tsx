import { HabitatCoverage } from "@/components/charts/HabitatCoverage";
import { PopulationTrend } from "@/components/charts/PopulationTrend";
import { ThreatDistribution } from "@/components/charts/ThreatDistribution";
import { getOverviewData } from "@/lib/api/overview";

function metricToneClass(tone: string) {
  switch (tone) {
    case "positive":
      return "bg-[#e2f0de] text-[#28482e]";
    case "warning":
      return "bg-[#f4e4c3] text-[#7c5c20]";
    case "critical":
      return "bg-[#f4d7cf] text-[#8f3f2c]";
    default:
      return "bg-[#ece7df] text-[#5f574b]";
  }
}

export default async function HomePage() {
  const data = await getOverviewData();

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2.5rem] border border-white/50 bg-[linear-gradient(135deg,rgba(20,37,26,0.98),rgba(46,68,46,0.95)_55%,rgba(210,162,79,0.95))] px-6 py-10 text-stone-50 shadow-[0_28px_100px_rgba(20,37,26,0.28)] sm:px-8">
        <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-5">
            <p className="text-xs uppercase tracking-[0.4em] text-amber-100/70">
              Conservation command surface
            </p>
            <div className="max-w-3xl space-y-4">
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
                Build one place for movement intelligence, acoustic cleanup, and field storytelling.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-stone-200">
                The frontend is now scaffolded around the product described in the new guides: map-centered analysis, a separation workstation, and voice-first exploration with Supabase integration points.
              </p>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-black/15 p-5 backdrop-blur">
            <p className="text-xs uppercase tracking-[0.3em] text-stone-300">What is live now</p>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-stone-100">
              <li>Next.js App Router frontend scaffolded under `frontend/`.</li>
              <li>Dashboard, map, separator, and voice routes implemented.</li>
              <li>React Query, Zustand, Supabase client stubs, and mock API layer in place.</li>
              <li>UI tolerates missing credentials while backend services are still being wired.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        {data.summaryMetrics.map((metric) => (
          <article
            key={metric.label}
            className="rounded-[2rem] border border-stone-200/80 bg-white/80 p-5 shadow-[0_16px_50px_rgba(56,44,29,0.08)] backdrop-blur"
          >
            <p className="text-xs uppercase tracking-[0.24em] text-stone-500">{metric.label}</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-stone-900">
              {metric.value}
            </p>
            <span
              className={`mt-4 inline-flex rounded-full px-3 py-1 text-xs uppercase tracking-[0.18em] ${metricToneClass(metric.tone)}`}
            >
              {metric.change}
            </span>
          </article>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <PopulationTrend data={data.populationTrend} />
        <ThreatDistribution data={data.threatBreakdown} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <HabitatCoverage data={data.habitatCoverage} />
        <div className="rounded-[2rem] border border-stone-200/80 bg-[#f7f1e6] p-6 shadow-[0_20px_80px_rgba(56,44,29,0.08)]">
          <p className="text-xs uppercase tracking-[0.28em] text-stone-500">Audio watchlist</p>
          <h2 className="mt-2 text-2xl font-semibold text-stone-900">
            Field recordings queued for separator review
          </h2>
          <div className="mt-6 space-y-4">
            {data.audioAssets.map((asset) => (
              <div
                key={asset.id}
                className="flex flex-col justify-between gap-3 rounded-[1.5rem] border border-stone-200 bg-white p-4 sm:flex-row sm:items-center"
              >
                <div>
                  <p className="text-sm font-medium text-stone-900">{asset.title}</p>
                  <p className="mt-1 text-sm text-stone-600">
                    {asset.location} · {asset.durationSeconds}s
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.18em] ${
                    asset.status === "isolated"
                      ? "bg-[#e2f0de] text-[#28482e]"
                      : "bg-[#ece7df] text-[#5f574b]"
                  }`}
                >
                  {asset.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

