"use client";

import { useEffect, useState } from "react";

const links = [
  { href: "#overview", label: "Overview" },
  { href: "#separator", label: "Separator" },
  { href: "#voice", label: "Voice" },
  { href: "#map", label: "Map" },
];

export function TopNav() {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState<string>("#overview");

  useEffect(() => {
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
        background: scrolled ? "rgba(8,8,8,0.88)" : "transparent",
        backdropFilter: scrolled ? "blur(20px) saturate(1.4)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(20px) saturate(1.4)" : "none",
        borderBottom: scrolled ? "1px solid rgba(255,255,255,0.06)" : "1px solid transparent",
      }}
    >
      <div
        className="flex items-center justify-between"
        style={{ maxWidth: "72rem", margin: "0 auto", padding: "0 2rem", height: "3.5rem" }}
      >
        {/* Wordmark */}
        <a href="#overview" className="flex items-center gap-2.5">
          <span
            className="text-xs font-semibold tracking-widest uppercase"
            style={{ color: "var(--c-gold)", letterSpacing: "0.22em" }}
          >
            Elephant
          </span>
          <span
            className="text-sm font-semibold tracking-tight"
            style={{ color: "var(--c-100)" }}
          >
            Field Intelligence
          </span>
        </a>

        {/* Nav links */}
        <nav className="hidden gap-1 sm:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-150"
              style={{
                color: active === link.href ? "var(--c-white)" : "var(--c-300)",
                background: active === link.href ? "var(--c-600)" : "transparent",
              }}
            >
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
