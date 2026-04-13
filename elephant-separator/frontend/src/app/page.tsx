import { HabitatCoverage } from "@/components/charts/HabitatCoverage";
import MapClientShell from "@/components/map/MapClientShell";
import { PopulationTrend } from "@/components/charts/PopulationTrend";
import { ThreatDistribution } from "@/components/charts/ThreatDistribution";
import { SeparatorPanel } from "@/components/separator/SeparatorPanel";
import { VoiceMode } from "@/components/voice/VoiceMode";
import { getOverviewData } from "@/lib/api/overview";
import { ParallaxHero } from "@/components/hero/ParallaxHero";
import { AudioGallery } from "@/components/gallery/AudioGallery";
import { GsapReveal } from "@/components/ui/GsapReveal";

function toneMeta(tone: string): { color: string } {
  switch (tone) {
    case "positive": return { color: "var(--accent-green)" };
    case "warning":  return { color: "var(--accent-gold)"  };
    case "critical": return { color: "var(--accent-ember)" };
    default:         return { color: "var(--fg-tertiary)"  };
  }
}

export default async function HomePage() {
  const data = await getOverviewData();

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════════
          HERO
      ═══════════════════════════════════════════════════════════════════ */}
      <ParallaxHero />

      {/* ═══════════════════════════════════════════════════════════════════
          CONSERVATION METRICS
          Open numbers — no boxes, no borders between cells
      ═══════════════════════════════════════════════════════════════════ */}
      <section style={{ background: "var(--bg-deep)", padding: "7rem 0" }}>
        <div className="section-inner">
          <div className="section-rule" style={{ marginBottom: "5rem" }} />

          <GsapReveal>
            <p className="t-eyebrow" style={{ marginBottom: "3.5rem" }}>
              Conservation command
            </p>
          </GsapReveal>

          <GsapReveal stagger delay={0.1}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "4rem 7rem",
            }}
          >
            {data.summaryMetrics.map((metric) => {
              const { color } = toneMeta(metric.tone);
              return (
                <div key={metric.label}>
                  <p
                    className="t-eyebrow"
                    style={{ marginBottom: "0.6rem" }}
                  >
                    {metric.label}
                  </p>
                  <p
                    style={{
                      fontSize: "clamp(2.4rem, 5vw, 3.5rem)",
                      fontWeight: 700,
                      letterSpacing: "-0.04em",
                      color: "var(--fg-primary)",
                      lineHeight: 1,
                      marginBottom: "0.6rem",
                    }}
                  >
                    {metric.value}
                  </p>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.35rem",
                      fontSize: "0.6875rem",
                      fontWeight: 600,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color,
                    }}
                  >
                    <span
                      style={{
                        width: "5px",
                        height: "5px",
                        borderRadius: "50%",
                        background: color,
                        flexShrink: 0,
                      }}
                    />
                    {metric.change}
                  </span>
                </div>
              );
            })}
          </div>
          </GsapReveal>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          CONSERVATION DATA — Charts, stacked vertically
      ═══════════════════════════════════════════════════════════════════ */}
      <section style={{ padding: "7rem 0", background: "var(--bg-deep)" }}>
        <div className="section-inner">
          <div className="section-rule" style={{ marginBottom: "5rem" }} />

          <GsapReveal>
            <p className="t-eyebrow" style={{ marginBottom: "1.25rem" }}>
              Conservation data
            </p>
            <h2
              className="t-h2"
              style={{ marginBottom: "5rem", maxWidth: "24ch" }}
            >
              Field intelligence at a glance.
            </h2>
          </GsapReveal>

          {/* Vertical stack — no grid, no boxes */}
          <div className="chart-grid">
            <PopulationTrend data={data.populationTrend} />
            <ThreatDistribution data={data.threatBreakdown} />
            <HabitatCoverage data={data.habitatCoverage} />
          </div>
        </div>
      </section>

      {/* ── Fade ── */}
      <div
        className="section-fade"
        style={{
          background: "linear-gradient(to bottom, var(--bg-deep), var(--bg-surface))",
        }}
      />

      {/* ═══════════════════════════════════════════════════════════════════
          SEPARATOR — functional panel, seamless
      ═══════════════════════════════════════════════════════════════════ */}
      <section
        id="separator"
        style={{ padding: "7rem 0", background: "var(--bg-surface)" }}
      >
        <div className="section-inner">
          <div className="section-rule" style={{ marginBottom: "5rem" }} />
          <SeparatorPanel />
        </div>
      </section>

      {/* ── Fade ── */}
      <div
        className="section-fade"
        style={{
          background: "linear-gradient(to bottom, var(--bg-surface), var(--bg-deep))",
        }}
      />

      {/* ═══════════════════════════════════════════════════════════════════
          VOICE — functional panel, seamless
      ═══════════════════════════════════════════════════════════════════ */}
      <section
        id="voice"
        style={{ padding: "7rem 0", background: "var(--bg-deep)" }}
      >
        <div className="section-inner">
          <div className="section-rule" style={{ marginBottom: "5rem" }} />
          <VoiceMode />
        </div>
      </section>

      {/* ── Fade ── */}
      <div
        className="section-fade"
        style={{
          height: "100px",
          background: "linear-gradient(to bottom, var(--bg-deep), var(--bg-surface))",
        }}
      />

      {/* ═══════════════════════════════════════════════════════════════════
          MAP — full-width, seamless
      ═══════════════════════════════════════════════════════════════════ */}
      <section
        id="map"
        style={{ padding: "7rem 0 0", background: "var(--bg-surface)" }}
      >
        <div className="section-inner" style={{ marginBottom: "3rem" }}>
          <div className="section-rule" style={{ marginBottom: "5rem" }} />
          <p className="t-eyebrow" style={{ marginBottom: "1.25rem" }}>
            Geographic intelligence
          </p>
          <h2 className="t-h2" style={{ marginBottom: "1.25rem" }}>
            Range and habitat map.
          </h2>
          <p className="t-body" style={{ maxWidth: "52ch" }}>
            Population density, habitat fragmentation, and incident hotspots
            on an interactive basemap. Click any country for regional metrics
            and country audio.
          </p>
        </div>

        <div
          style={{
            width: "100%",
            height: "680px",
            position: "relative",
            maskImage:
              "linear-gradient(to bottom, transparent 0%, black 3%, black 97%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(to bottom, transparent 0%, black 3%, black 97%, transparent 100%)",
          }}
        >
          <MapClientShell />
        </div>
      </section>

      {/* ── Fade ── */}
      <div
        className="section-fade"
        style={{
          height: "100px",
          background: "linear-gradient(to bottom, var(--bg-surface), var(--bg-deep))",
        }}
      />

      {/* ═══════════════════════════════════════════════════════════════════
          AUDIO GALLERY — bespoke spectrogram showcase
      ═══════════════════════════════════════════════════════════════════ */}
      <AudioGallery />

      {/* ═══════════════════════════════════════════════════════════════════
          FOOTER — minimal, seamless
      ═══════════════════════════════════════════════════════════════════ */}
      <footer
        style={{
          padding: "5rem 0",
          borderTop: "1px solid var(--fg-faint)",
          marginTop: "5rem",
          background: "var(--bg-surface)",
        }}
      >
        <div className="section-inner">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              flexWrap: "wrap",
              gap: "2rem",
            }}
          >
            <div>
              <p
                className="t-eyebrow"
                style={{
                  color: "var(--accent-green)",
                  marginBottom: "0.5rem",
                }}
              >
                Elephant Conservation
              </p>
              <p className="t-mono">Herd Signal Platform</p>
            </div>

            <nav
              style={{
                display: "flex",
                gap: "2.5rem",
                flexWrap: "wrap",
              }}
            >
              {[
                { href: "#overview",   label: "Overview"   },
                { href: "#separator",  label: "Separator"  },
                { href: "#voice",      label: "Voice"      },
                { href: "#map",        label: "Map"        },
                { href: "#gallery",    label: "Gallery"    },
              ].map(({ href, label }) => (
                <a
                  key={href}
                  href={href}
                  style={{
                    fontSize: "0.875rem",
                    color: "var(--fg-secondary)",
                    transition: "color 0.15s ease",
                  }}
                >
                  {label}
                </a>
              ))}
            </nav>
          </div>
        </div>
      </footer>
    </>
  );
}
