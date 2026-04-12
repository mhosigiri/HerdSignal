"use client";

import { Card } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { Caption } from "@/components/ui/Typography";

export function AudioPlayer({ title, src }: { title: string; src: string | null }) {
  return (
    <Card variant="default" shadow className="p-4">
      <Label className="mb-3 block">{title}</Label>
      {src ? (
        <audio controls className="w-full">
          <source src={src} />
        </audio>
      ) : (
        <Caption>No audio loaded yet.</Caption>
      )}
    </Card>
  );
}
