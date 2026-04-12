"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const links = [
  { href: "/", label: "Dashboard", icon: "◼" },
  { href: "/map", label: "Map", icon: "◉" },
  { href: "/separator", label: "Separator", icon: "◈" },
  { href: "/voice", label: "Voice mode", icon: "◎" },
];

export function Sidebar() {
  const pathname = usePathname();
  const hasSupabase = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  return (
    <aside
      className="flex h-full flex-col justify-between px-5 py-7"
      style={{
        background: "linear-gradient(180deg, var(--color-forest-deeper) 0%, var(--color-forest-dark) 100%)",
        borderRight: "1px solid var(--color-white-24)",
      }}
    >
      <div className="space-y-9">
        {/* Brand mark */}
        <div className="space-y-2 px-1">
          <p className="text-caption" style={{ color: "var(--color-gold)", letterSpacing: "0.28em" }}>
            Elephant Conservation
          </p>
          <h1
            className="text-heading-4 leading-tight"
            style={{ color: "var(--sem-fg-on-dark)" }}
          >
            Field Intelligence
          </h1>
          <p
            className="text-small leading-relaxed"
            style={{ color: "var(--sem-fg-on-dark-dim)", maxWidth: "13rem" }}
          >
            Maps, acoustic separation, and voice-guided exploration.
          </p>
        </div>

        {/* Navigation */}
        <nav className="space-y-1.5">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={clsx(
                  "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-150",
                  isActive
                    ? "shadow-[0_8px_24px_rgba(210,162,79,0.22)]"
                    : "hover:bg-[var(--color-white-24)]",
                )}
                style={
                  isActive
                    ? {
                        background: "var(--color-gold)",
                        color: "var(--color-forest-deeper)",
                      }
                    : {
                        color: "var(--sem-fg-on-dark-dim)",
                        background: "var(--color-white-24)",
                      }
                }
              >
                <span
                  className="text-xs"
                  style={{ opacity: isActive ? 1 : 0.7 }}
                >
                  {link.icon}
                </span>
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Status card */}
      <div
        className="rounded-3xl p-4 space-y-3"
        style={{
          background: "var(--color-white-24)",
          border: "1px solid var(--color-white-24)",
        }}
      >
        <p className="text-caption" style={{ color: "var(--sem-fg-tertiary)", letterSpacing: "0.22em" }}>
          Integration status
        </p>
        <div
          className="flex items-center justify-between text-small"
          style={{ color: "var(--sem-fg-on-dark-dim)" }}
        >
          <span>Leaflet tiles</span>
          <span style={{ color: "#34d399" }}>Ready</span>
        </div>
        <div
          className="flex items-center justify-between text-small"
          style={{ color: "var(--sem-fg-on-dark-dim)" }}
        >
          <span>Supabase</span>
          <span style={{ color: hasSupabase ? "#34d399" : "var(--color-gold)" }}>
            {hasSupabase ? "Configured" : "Pending"}
          </span>
        </div>
        <p className="text-small leading-relaxed" style={{ color: "var(--sem-fg-tertiary)" }}>
          Map runs without credentials. Supabase data unlocks when env vars are added.
        </p>
      </div>
    </aside>
  );
}
