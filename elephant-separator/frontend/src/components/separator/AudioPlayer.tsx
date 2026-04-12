"use client";

export function AudioPlayer({
  title,
  src,
}: {
  title: string;
  src: string | null;
}) {
  return (
    <div className="rounded-[1.5rem] border border-stone-200 bg-white p-4 shadow-[0_12px_30px_rgba(56,44,29,0.06)]">
      <p className="mb-3 text-sm font-medium text-stone-800">{title}</p>
      {src ? (
        <audio controls className="w-full">
          <source src={src} />
        </audio>
      ) : (
        <p className="text-sm text-stone-500">No audio loaded yet.</p>
      )}
    </div>
  );
}

