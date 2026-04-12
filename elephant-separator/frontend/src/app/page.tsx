import { HabitatCoverage } from "@/components/charts/HabitatCoverage";
import { PopulationTrend } from "@/components/charts/PopulationTrend";
import { ThreatDistribution } from "@/components/charts/ThreatDistribution";
import { MetricCard } from "@/components/ui/MetricCard";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Heading, Overline, Body } from "@/components/ui/Typography";
import { getOverviewData } from "@/lib/api/overview";
import type { StatusTone } from "@/lib/tokens";

function toTone(tone: string): StatusTone {
  if (tone === "positive" || tone === "warning" || tone === "critical") return tone;
  return "neutral";
}

export default async function HomePage() {
  const data = await getOverviewData();

  return (
    <div className="space-y-6">
      {/* Hero banner */}
      <section className="overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--color-border-subtle)] bg-[linear-gradient(135deg,var(--alias-forest-deep-98),var(--alias-forest-95)_55%,var(--alias-amber-95))] px-6 py-10 text-stone-50 shadow-[var(--shadow-hero)] sm:px-8">
        <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-5">
            <Overline className="text-amber-100/70">Conservation command surface</Overline>
            <div className="max-w-3xl space-y-4">
              <Heading
                level={1}
                className="text-stone-50 sm:text-5xl"
              >
                Build one place for movement intelligence, acoustic cleanup, and field storytelling.
              </Heading>
              <Body className="max-w-2xl text-stone-200">
                The frontend is now scaffolded around the product described in the new guides: map-centered analysis, a separation workstation, and voice-first exploration with Supabase integration points.
              </Body>
            </div>
          </div>

          <div className="rounded-[var(--radius-xl)] border border-[var(--color-border-subtle)] bg-[var(--alias-black-15)] p-5 backdrop-blur">
            <Overline className="text-stone-300">What is live now</Overline>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-stone-100">
              <li>Dashboard charts wired to Supabase — population estimates and threat incidents.</li>
              <li>Google Maps with cloud styling, real threat markers and population bubbles.</li>
              <li>Separator calls Python NMF backend; processed audio plays back immediately.</li>
              <li>Voice mode transcribes via Groq Whisper and responds with Llama 3.3.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Summary metrics */}
      <section className="grid gap-4 lg:grid-cols-4">
        {data.summaryMetrics.map((metric) => (
          <MetricCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            change={metric.change}
            tone={toTone(metric.tone)}
          />
        ))}
      </section>

      {/* Charts row */}
      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <PopulationTrend data={data.populationTrend} />
        <ThreatDistribution data={data.threatBreakdown} />
      </section>

      {/* Habitat + audio watchlist */}
      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <HabitatCoverage data={data.habitatCoverage} />

        <Card variant="raised" shadow className="p-6">
          <Overline>Audio watchlist</Overline>
          <Heading level={2} className="mt-2">
            Field recordings queued for separator review
          </Heading>
          <div className="mt-6 space-y-4">
            {data.audioAssets.map((asset) => (
              <div
                key={asset.id}
                className="flex flex-col justify-between gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:flex-row sm:items-center"
              >
                <div>
                  <p className="text-sm font-medium text-[var(--color-fg)]">{asset.title}</p>
                  <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
                    {asset.location} · {asset.durationSeconds}s
                  </p>
                </div>
                <Badge tone={asset.status === "isolated" ? "positive" : "neutral"}>
                  {asset.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}
