"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { createClient } from "@supabase/supabase-js";

// ── Fallback facts shown if the DB table isn't populated yet ──────────────
const FALLBACK_FACTS = [
  "An elephant's trunk contains over 40,000 individual muscles — roughly 67 times more than the entire human body.",
  "Elephants can smell water up to 12 miles (19.2 km) away.",
  "Elephant herds are matriarchal — led by the oldest and wisest female.",
  "Elephants are one of the few animals that can pass the mirror self-recognition test.",
  "An elephant's heart beats only 28–30 times per minute — about half the human rate.",
  "Baby elephants sometimes suck their trunks for comfort, just as human babies suck their thumbs.",
  "Elephants can feel seismic vibrations through their feet up to 20 miles away.",
  "The elephant brain weighs 10–12 lbs — the largest of any land animal.",
  "Elephants spend up to 16 hours a day collecting and eating food.",
  "A woolly mammoth population survived on Wrangel Island until just 4,300 years ago — when Egyptian pyramids were already ancient.",
  "Elephants cannot jump — they are the only mammal that cannot.",
  "African elephant ears are shaped like the continent of Africa; Asian elephant ears are shaped like India.",
  "Elephants can distinguish between human languages and genders in their voices.",
  "Over 90% of African elephants have been killed in the last century.",
  "Elephants have been observed covering deceased elephants — and humans — with branches and leaves.",
  "An elephant's eyelashes can grow up to 5 inches (13 cm) long.",
  "Desert elephants in the Namib survive temperatures up to 122°F (50°C) with only 1–4 inches of annual rainfall.",
  "Elephants are terrified of bees and ants — some farmers use beehives as natural elephant fences.",
  "A female elephant's pregnancy lasts 22 months — nearly 3 times longer than a human's.",
  "90 different tree species rely on elephants for seed propagation through their dung.",
];

type Fact = { id: number; fact_number: number; category: string; content: string };

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function pickRandom<T>(arr: T[], exclude?: T): T {
  if (arr.length === 1) return arr[0];
  let pick: T;
  do {
    pick = arr[Math.floor(Math.random() * arr.length)];
  } while (pick === exclude);
  return pick;
}

export function ElephantFactTicker() {
  const [facts, setFacts] = useState<string[]>(FALLBACK_FACTS);
  const [current, setCurrent] = useState<string>(() => pickRandom(FALLBACK_FACTS));
  const [visible, setVisible] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const shineRef = useRef<HTMLSpanElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentRef = useRef(current);
  currentRef.current = current;

  // ── Load facts from Supabase ─────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("elephant_facts")
        .select("id, fact_number, category, content");
      if (!error && data && data.length > 0) {
        const contents = (data as Fact[]).map((f) => f.content);
        setFacts(contents);
        setCurrent(pickRandom(contents));
      }
    })();
  }, []);

  // ── GSAP shine animation on text ─────────────────────────────────────────
  const runShine = () => {
    if (!shineRef.current) return;
    gsap.fromTo(
      shineRef.current,
      { x: "-110%", opacity: 1 },
      {
        x: "110%",
        opacity: 1,
        duration: 1.4,
        ease: "power2.inOut",
        clearProps: "all",
      }
    );
  };

  // ── Rotate fact every 15 s ───────────────────────────────────────────────
  const rotateFact = (factList: string[]) => {
    const next = pickRandom(factList, currentRef.current);

    // Fade out
    gsap.to(textRef.current, {
      opacity: 0,
      y: -6,
      duration: 0.35,
      ease: "power2.in",
      onComplete: () => {
        setCurrent(next);
        // Fade in + shine
        gsap.fromTo(
          textRef.current,
          { opacity: 0, y: 6 },
          {
            opacity: 1,
            y: 0,
            duration: 0.45,
            ease: "power2.out",
            onComplete: runShine,
          }
        );
      },
    });
  };

  // ── Start / clear interval when facts list changes ───────────────────────
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    runShine(); // shine on mount too
    intervalRef.current = setInterval(() => rotateFact(facts), 15_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facts]);

  // ── Entrance animation ───────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    gsap.fromTo(
      containerRef.current,
      { opacity: 0, y: 8 },
      { opacity: 1, y: 0, duration: 0.6, ease: "power3.out", delay: 0.15 }
    );
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        marginTop: "1.25rem",
        padding: "0.75rem 1rem",
        background: "var(--c-raise)",
        border: "1px solid rgba(82,168,99,0.15)",
        borderRadius: "0.625rem",
        display: "flex",
        alignItems: "flex-start",
        gap: "0.625rem",
        opacity: 0, // starts invisible; GSAP fades in
      }}
    >
      {/* Left: animated dot + label */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.35rem", paddingTop: "0.1rem", flexShrink: 0 }}>
        <PulseDot />
        <span
          className="t-eyebrow"
          style={{
            fontSize: "0.55rem",
            letterSpacing: "0.1em",
            color: "var(--accent-green)",
            writingMode: "vertical-rl",
            textOrientation: "mixed",
            transform: "rotate(180deg)",
            lineHeight: 1,
            opacity: 0.7,
          }}
        >
          DID YOU KNOW
        </span>
      </div>

      {/* Right: fact text with shine overlay */}
      <div style={{ position: "relative", overflow: "hidden", flex: 1 }}>
        <span
          ref={textRef}
          className="t-small"
          style={{
            display: "block",
            color: "var(--fg-secondary)",
            lineHeight: 1.55,
            fontSize: "0.8rem",
          }}
        >
          {current}
        </span>

        {/* Shine sweep */}
        <span
          ref={shineRef}
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(105deg, transparent 25%, rgba(255,255,255,0.09) 50%, transparent 75%)",
            pointerEvents: "none",
            transform: "translateX(-110%)",
          }}
        />
      </div>
    </div>
  );
}

// ── Tiny pulsing dot (Claude-style status indicator) ─────────────────────
function PulseDot() {
  const dotRef = useRef<HTMLSpanElement>(null);
  const ringRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!dotRef.current || !ringRef.current) return;
    // Subtle breathing on the dot
    gsap.to(dotRef.current, {
      scale: 1.25,
      opacity: 0.7,
      duration: 1.1,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
    });
    // Ring pulse
    gsap.fromTo(
      ringRef.current,
      { scale: 1, opacity: 0.55 },
      {
        scale: 2.2,
        opacity: 0,
        duration: 1.6,
        repeat: -1,
        ease: "power2.out",
      }
    );
  }, []);

  return (
    <span style={{ position: "relative", width: 8, height: 8, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
      <span
        ref={ringRef}
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          background: "var(--accent-green)",
          opacity: 0.55,
        }}
      />
      <span
        ref={dotRef}
        style={{
          position: "relative",
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: "var(--accent-green)",
          display: "block",
        }}
      />
    </span>
  );
}
