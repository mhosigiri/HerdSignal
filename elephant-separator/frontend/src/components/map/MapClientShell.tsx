"use client";

import dynamic from "next/dynamic";

const ElephantMap = dynamic(() => import("@/components/map/ElephantMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full min-h-0 items-center justify-center bg-neutral-950 text-sm text-neutral-400">
      Loading map...
    </div>
  ),
});

export default function MapClientShell() {
  return <ElephantMap />;
}
