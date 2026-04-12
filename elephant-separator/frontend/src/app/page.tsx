import { HabitatCoverage } from "@/components/charts/HabitatCoverage";
import MapClientShell from "@/components/map/MapClientShell";
import { PopulationTrend } from "@/components/charts/PopulationTrend";
import { ThreatDistribution } from "@/components/charts/ThreatDistribution";
import { SeparatorPanel } from "@/components/separator/SeparatorPanel";
import { VoiceMode } from "@/components/voice/VoiceMode";
import { getOverviewData } from "@/lib/api/overview";

function toneMeta(tone: string): { dot: string; label: string } {
  switch (tone) {
    case "positive": return { dot: "#5d8b63", label: "positive" };
    case "warning":  return { dot: "#d2a24f", label: "caution" };
    case "critical": return { dot: "#d76848", label: "critical" };
    default:         return { dot: "#666",    label: "neutral" };
  }
}

export default async function HomePage() {
  const data = await getOverviewData();

  return (
    <>
      {/* ══════════════════════════════════════════
          HERO
      ══════════════════════════════════════════ */}
      <section
        id="overview"
        style={{
          minHeight: "100svh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: "0 0 6rem",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background glow */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(39,69,45,0.35) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />
        <div
          aria-hidden
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "40%",
            background: "linear-gradient(to bottom, transparent, #000)",
            pointerEvents: "none",
          }}
        />

        <div className="section-inner" style={{ position: "relative" }}>
          <p className="t-eyebrow" style={{ marginBottom: "1.5rem" }}>
            Elephant · Field Intelligence
          </p>
          <h1 className="t-hero" style={{ maxWidth: "14ch", marginBottom: "2rem" }}>
            Movement,{" "}
            <span style={{ color: "var(--c-gold)" }}>acoustics</span>,{" "}
            and field stories.
          </h1>
          <p className="t-body" style={{ maxWidth: "50ch", marginBottom: "3rem" }}>
            One scrollable surface for map intelligence, acoustic noise separation, and
            voice-first conservation exploration — powered by a local Python separator and
            Supabase data layer.
          </p>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <a href="#separator" className="btn btn-primary">
              Open separator
            </a>
            <a href="#voice" className="btn btn-ghost">
              Voice mode
            </a>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          METRICS
      ══════════════════════════════════════════ */}
      <section style={{ padding: "5rem 0" }}>
        <div className="section-inner">
          <div className="section-rule" style={{ marginBottom: "4rem" }} />
          <p className="t-eyebrow" style={{ marginBottom: "3rem" }}>Conservation command</p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "0 3rem",
            }}
          >
            {data.summaryMetrics.map((metric) => {
              const meta = toneMeta(metric.tone);
              return (
                <div key={metric.label} className="metric-tile">
                  <p className="t-eyebrow" style={{ marginBottom: "0.75rem" }}>
                    {metric.label}
                  </p>
                  <p
                    style={{
                      fontSize: "clamp(2rem, 5vw, 3.25rem)",
                      fontWeight: 700,
                      letterSpacing: "-0.03em",
                      color: "var(--c-white)",
                      lineHeight: 1,
                      marginBottom: "0.75rem",
                    }}
                  >
                    {metric.value}
                  </p>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.4rem",
                      fontSize: "0.75rem",
                      color: meta.dot,
                      fontWeight: 500,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                    }}
                  >
                    <span
                      style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        background: meta.dot,
                        flexShrink: 0,
                      }}
                    />
                    {metric.change}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          CHARTS
      ══════════════════════════════════════════ */}
      <section style={{ padding: "5rem 0" }}>
        <div className="section-inner">
          <div className="section-rule" style={{ marginBottom: "5rem" }} />
          <div className="chart-grid">
            <div>
              <PopulationTrend data={data.populationTrend} />
            </div>
            <div>
              <ThreatDistribution data={data.threatBreakdown} />
            </div>
            <div className="chart-grid-full" style={{ gridColumn: "1 / -1" }}>
              <HabitatCoverage data={data.habitatCoverage} />
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          AUDIO WATCHLIST
      ══════════════════════════════════════════ */}
      <section style={{ padding: "5rem 0" }}>
        <div className="section-inner">
          <div className="section-rule" style={{ marginBottom: "4rem" }} />
          <p className="t-eyebrow" style={{ marginBottom: "0.75rem" }}>Audio watchlist</p>
          <h2 className="t-h2" style={{ marginBottom: "1rem", maxWidth: "20ch" }}>
            Field recordings queued for review
          </h2>
          <p className="t-body" style={{ maxWidth: "48ch", marginBottom: "3rem" }}>
            Recordings staged for acoustic separation. Run them through the separator below to
            isolate elephant calls from vehicle and ambient noise.
          </p>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {data.audioAssets.map((asset, i) => {
              const isPositive = asset.status === "isolated";
              return (
                <div
                  key={asset.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "2rem",
                    padding: "1.5rem 0",
                    borderTop: i === 0 ? "1px solid var(--c-600)" : "none",
                    borderBottom: "1px solid var(--c-600)",
                  }}
                >
                  <div>
                    <p style={{ color: "var(--c-white)", fontWeight: 500, fontSize: "0.9375rem", marginBottom: "0.3rem" }}>
                      {asset.title}
                    </p>
                    <p className="t-mono">
                      {asset.location} · {asset.durationSeconds}s
                    </p>
                  </div>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.4rem",
                      fontSize: "0.6875rem",
                      fontWeight: 600,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: isPositive ? "var(--c-green-bright)" : "var(--c-400)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <span
                      style={{
                        width: "5px",
                        height: "5px",
                        borderRadius: "50%",
                        background: isPositive ? "var(--c-green-bright)" : "var(--c-400)",
                        flexShrink: 0,
                      }}
                    />
                    {asset.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          SEPARATOR
      ══════════════════════════════════════════ */}
      <section id="separator" style={{ padding: "7rem 0" }}>
        <div className="section-inner">
          <div className="section-rule" style={{ marginBottom: "5rem" }} />
          <SeparatorPanel />
        </div>
      </section>

      {/* ══════════════════════════════════════════
          VOICE
      ══════════════════════════════════════════ */}
      <section id="voice" style={{ padding: "7rem 0" }}>
        <div className="section-inner">
          <div className="section-rule" style={{ marginBottom: "5rem" }} />
          <VoiceMode />
        </div>
      </section>

      {/* ══════════════════════════════════════════
          MAP SECTION
      ══════════════════════════════════════════ */}
      <section id="map" style={{ padding: "7rem 0 0" }}>
        {/* Header lives in the centred column */}
        <div className="section-inner" style={{ marginBottom: "2.5rem" }}>
          <div className="section-rule" style={{ marginBottom: "5rem" }} />
          <p className="t-eyebrow" style={{ marginBottom: "0.75rem" }}>Geographic intelligence</p>
          <h2 className="t-h2" style={{ marginBottom: "1rem" }}>Range and habitat map</h2>
          <p className="t-body" style={{ maxWidth: "52ch" }}>
            Population density, habitat fragmentation, and incident hotspots rendered on an
            interactive basemap. Click any country to explore regional metrics and country audio.
          </p>
        </div>

        {/* Full-bleed map — no inner container so it can breathe edge to edge */}
        <div
          style={{
            width: "100%",
            height: "680px",
            position: "relative",
            /* subtle top/bottom fade so map bleeds into page bg */
            maskImage:
              "linear-gradient(to bottom, transparent 0%, black 3%, black 97%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(to bottom, transparent 0%, black 3%, black 97%, transparent 100%)",
          }}
        >
          <MapClientShell />
        </div>
      </section>

      {/* ══════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════ */}
      <footer style={{ padding: "4rem 0", borderTop: "1px solid var(--c-600)", marginTop: "5rem" }}>
        <div className="section-inner">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <p className="t-small" style={{ color: "var(--c-gold)", fontWeight: 600, marginBottom: "0.25rem" }}>
                Elephant Conservation
              </p>
              <p className="t-mono">Field Intelligence Platform</p>
            </div>
            <nav style={{ display: "flex", gap: "1.5rem" }}>
              {["#overview", "#separator", "#voice", "#map"].map((href) => (
                <a
                  key={href}
                  href={href}
                  className="t-small"
                  style={{ textTransform: "capitalize" }}
                >
                  {href.replace("#", "")}
                </a>
              ))}
            </nav>
          </div>
        </div>
      </footer>
    </>
  );
}
