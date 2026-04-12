"use client";

export function AudioPlayer({ title, src }: { title: string; src: string | null }) {
  return (
    <div style={{ paddingTop: "1.5rem" }}>
      <p className="t-eyebrow" style={{ marginBottom: "0.75rem" }}>
        {title}
      </p>
      {src ? (
        <audio controls className="w-full" style={{ height: "2.5rem" }}>
          <source src={src} />
        </audio>
      ) : (
        <p className="t-small" style={{ color: "var(--c-400)" }}>
          No audio loaded yet.
        </p>
      )}
    </div>
  );
}
