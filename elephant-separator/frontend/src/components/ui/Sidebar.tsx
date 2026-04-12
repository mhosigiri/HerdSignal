"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/map", label: "Map" },
  { href: "/separator", label: "Separator" },
  { href: "/voice", label: "Voice mode" },
];

export function Sidebar() {
  const pathname = usePathname();
  const hasSupabase = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  return (
    <aside className="flex h-full flex-col justify-between border-r border-white/10 bg-[linear-gradient(180deg,rgba(19,37,27,0.98),rgba(10,18,14,0.98))] px-5 py-6 text-stone-100">
      <div className="space-y-8">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.35em] text-amber-200/70">
            Elephant Conservation
          </p>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Field Intelligence</h1>
            <p className="mt-2 max-w-xs text-sm leading-6 text-stone-300">
              A frontend shell for map intelligence, acoustic cleanup, and guided voice exploration.
            </p>
          </div>
        </div>

        <nav className="space-y-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={clsx(
                "block rounded-2xl px-4 py-3 text-sm transition",
                pathname === link.href
                  ? "bg-amber-200 text-stone-950 shadow-[0_12px_40px_rgba(210,157,72,0.25)]"
                  : "bg-white/5 text-stone-200 hover:bg-white/10",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="space-y-3 rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-stone-200">
        <p className="text-xs uppercase tracking-[0.3em] text-stone-400">Integration status</p>
        <div className="flex items-center justify-between">
          <span>Leaflet tiles</span>
          <span className="text-emerald-300">Ready</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Supabase</span>
          <span className={hasSupabase ? "text-emerald-300" : "text-amber-300"}>
            {hasSupabase ? "Configured" : "Pending"}
          </span>
        </div>
        <p className="text-xs leading-5 text-stone-400">
          The map runs without credentials now. Supabase-backed data hydration unlocks when your env vars are added.
        </p>
      </div>
    </aside>
  );
}
