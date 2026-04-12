"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";

const SavannaParticles = dynamic(
  () => import("./SavannaParticles").then((m) => ({ default: m.SavannaParticles })),
  { ssr: false },
);

const AcousticOrb = dynamic(
  () => import("./AcousticOrb").then((m) => ({ default: m.AcousticOrb })),
  { ssr: false },
);

function CanvasFallback() {
  return (
    <div className="absolute inset-0 z-0"
      style={{ background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(39,69,45,0.35) 0%, transparent 70%)" }}
    />
  );
}

export function HeroScene() {
  return (
    <Suspense fallback={<CanvasFallback />}>
      <SavannaParticles />
      {/* Orb sits in the right half of the hero */}
      <div className="absolute right-0 top-0 z-0 h-full w-1/2">
        <AcousticOrb />
      </div>
    </Suspense>
  );
}
