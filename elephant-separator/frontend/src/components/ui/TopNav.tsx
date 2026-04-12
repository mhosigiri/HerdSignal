"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useThemeStore } from "@/store/themeStore";

const links = [
  { href: "#overview", label: "Overview" },
  { href: "#separator", label: "Separator" },
  { href: "#voice", label: "Voice" },
  { href: "#map", label: "Map" },
];

export function TopNav() {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState<string>("#overview");
  const { theme, toggle } = useThemeStore();

  useEffect(() => {
    // Restore theme from localStorage
    try {
      const saved = localStorage.getItem("elephant-theme");
      if (saved === "light") {
        document.documentElement.setAttribute("data-theme", "light");
        useThemeStore.setState({ theme: "light" });
      }
    } catch {}

    const onScroll = () => {
      setScrolled(window.scrollY > 32);
      const sections = ["overview", "separator", "voice", "map"];
      for (const id of [...sections].reverse()) {
        const el = document.getElementById(id);
        if (el && window.scrollY >= el.offsetTop - 120) {
          setActive(`#${id}`);
          break;
        }
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        background: scrolled ? "color-mix(in srgb, var(--bg-surface) 88%, transparent)" : "transparent",
        backdropFilter: scrolled ? "blur(24px) saturate(1.6)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(24px) saturate(1.6)" : "none",
        borderBottom: scrolled ? "1px solid var(--fg-faint)" : "1px solid transparent",
      }}
    >
      <div
        className="flex items-center justify-between"
        style={{ maxWidth: "72rem", margin: "0 auto", padding: "0 3rem", height: "4rem" }}
      >
        {/* Wordmark */}
        <a href="#overview" className="flex items-center gap-3">
          <Image
            src="/images/logo.png"
            alt="Elephant Conservation"
            width={84}
            height={84}
            style={{ borderRadius: "50%", flexShrink: 0 }}
          />
          <span
            className="text-sm font-semibold tracking-tight"
            style={{ color: "var(--fg-primary)" }}
          >
            Herd Signal
          </span>
        </a>

        {/* Right side: nav + theme toggle */}
        <div className="flex items-center gap-3">
          <nav className="hidden gap-2 sm:flex">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-full text-sm font-medium transition-all duration-150"
                style={{
                  padding: "0.45rem 1.25rem",
                  color: active === link.href ? "var(--fg-primary)" : "var(--fg-tertiary)",
                  background: active === link.href ? "var(--fg-faint)" : "transparent",
                  letterSpacing: "-0.01em",
                }}
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Theme toggle */}
          <button
            onClick={toggle}
            className="flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200"
            style={{
              background: "var(--fg-faint)",
              color: "var(--fg-secondary)",
            }}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
