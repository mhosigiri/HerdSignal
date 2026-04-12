"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";

/** Reusable fluffy cloud shape — pure SVG, no external assets needed */
function CloudSVG({ width }: { width: number }) {
  return (
    <svg
      viewBox="0 0 320 110"
      width={width}
      fill="white"
      aria-hidden
      style={{ display: "block", overflow: "visible" }}
    >
      {/* Base body */}
      <ellipse cx="160" cy="85" rx="148" ry="30" />
      {/* Left bump */}
      <ellipse cx="90"  cy="65" rx="62"  ry="48" />
      {/* Centre-left bump */}
      <ellipse cx="155" cy="50" rx="75"  ry="58" />
      {/* Centre-right bump */}
      <ellipse cx="230" cy="60" rx="65"  ry="48" />
      {/* Right small bump */}
      <ellipse cx="285" cy="74" rx="42"  ry="32" />
    </svg>
  );
}

/**
 * ParallaxHero
 *
 * Full-viewport hero with 6 layered parallax elements:
 *   C1 cloud (left)       — drifts left on scroll + gentle float
 *   C2 cloud (right)      — drifts right on scroll + gentle float
 *   L1 trees.png          — wide treeline, slowest (far back)
 *   L2 collection-of-trees— grove behind elephant
 *   L3 elephant.png       — dominant subject (~4× original size)
 *   L4 leaves-left-screen — foreground palm, slides off-left on scroll
 *
 * Text block: right-aligned, vertically centered.
 */
export function ParallaxHero() {
  const sectionRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  /* ── Cloud parallax: spread outward as hero scrolls away ── */
  const cloud1X = useTransform(scrollYProgress, [0, 1], [0, -360]);
  const cloud1Y = useTransform(scrollYProgress, [0, 1], [0, -80]);
  const cloud2X = useTransform(scrollYProgress, [0, 1], [0,  360]);
  const cloud2Y = useTransform(scrollYProgress, [0, 1], [0, -60]);

  /* ── Scene parallax ── */
  const treesY      = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const collectionY = useTransform(scrollYProgress, [0, 1], [0, 130]);
  const elephantY   = useTransform(scrollYProgress, [0, 1], [0,  70]);
  const leavesX     = useTransform(scrollYProgress, [0, 1], [0, -500]);

  /* ── Text ── */
  const textY       = useTransform(scrollYProgress, [0, 1], [0, -100]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.38], [1, 0]);

  return (
    <section
      ref={sectionRef}
      id="overview"
      style={{
        position: "relative",
        height: "100svh",
        minHeight: "640px",
        overflow: "hidden",
        background:
          "linear-gradient(180deg, var(--hero-bg-from) 0%, var(--hero-bg-via) 55%, var(--hero-bg-to) 100%)",
      }}
    >
      {/* ══════════════════════════════════════════════════════════
          CLOUD 1 — left side, drifts left on scroll
          Outer div: scroll-driven parallax (x, y)
          Inner div: continuous ambient float (y oscillation)
      ══════════════════════════════════════════════════════════ */}
      <motion.div
        aria-hidden
        className="cloud-layer"
        style={{
          position: "absolute",
          top: "12%",
          left: "2%",
          x: cloud1X,
          y: cloud1Y,
          zIndex: 1,
          willChange: "transform",
        }}
      >
        <motion.div
          animate={{ y: [0, -14, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        >
          <CloudSVG width={280} />
        </motion.div>
      </motion.div>

      {/* ══════════════════════════════════════════════════════════
          CLOUD 2 — right side, drifts right on scroll
      ══════════════════════════════════════════════════════════ */}
      <motion.div
        aria-hidden
        className="cloud-layer"
        style={{
          position: "absolute",
          top: "7%",
          right: "3%",
          x: cloud2X,
          y: cloud2Y,
          zIndex: 1,
          willChange: "transform",
        }}
      >
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
        >
          <CloudSVG width={210} />
        </motion.div>
      </motion.div>

      {/* ── L1: Wide treeline — back, slowest ── */}
      <motion.div
        aria-hidden
        style={{
          position: "absolute",
          bottom: "-4%",
          left: "-8%",
          width: "118%",
          y: treesY,
          zIndex: 2,
          willChange: "transform",
          pointerEvents: "none",
        }}
      >
        <Image
          src="/images/trees.png"
          alt=""
          width={1800}
          height={560}
          priority
          style={{ width: "100%", height: "auto", display: "block" }}
        />
      </motion.div>

      {/* ── L2: Collection of trees — mid-ground ── */}
      <motion.div
        aria-hidden
        style={{
          position: "absolute",
          bottom: "0%",
          left: "50%",
          x: "-50%",
          width: "clamp(280px, 42%, 680px)",
          y: collectionY,
          zIndex: 3,
          willChange: "transform",
          pointerEvents: "none",
        }}
      >
        <Image
          src="/images/collection-of-trees.png"
          alt=""
          width={700}
          height={820}
          priority
          style={{ width: "100%", height: "auto", display: "block" }}
        />
      </motion.div>

      {/* ── L3: Elephant — dominant hero subject ── */}
      <motion.div
        style={{
          position: "absolute",
          bottom: "-6%",
          left: "50%",
          x: "-50%",
          width: "clamp(420px, 58%, 820px)",
          y: elephantY,
          zIndex: 4,
          willChange: "transform",
          pointerEvents: "none",
        }}
      >
        <Image
          src="/images/elephant.png"
          alt="African elephant"
          width={820}
          height={1060}
          priority
          style={{ width: "100%", height: "auto", display: "block" }}
        />
      </motion.div>

      {/* ── L4: Palm leaves — foreground, slides off-screen left on scroll ── */}
      <motion.div
        aria-hidden
        style={{
          position: "absolute",
          top: "-10%",
          left: 0,
          height: "90%",
          x: leavesX,
          zIndex: 5,
          willChange: "transform",
          pointerEvents: "none",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/leaves-left-screen-side.png"
          alt=""
          style={{ height: "100%", width: "auto", display: "block" }}
        />
      </motion.div>

      {/* ── Text block — right-aligned, vertically centered ── */}
      <motion.div
        style={{
          position: "absolute",
          top: "50%",
          translateY: "-50%",
          right: "clamp(1.5rem, 8vw, 6rem)",
          y: textY,
          opacity: textOpacity,
          zIndex: 10,
          width: "min(480px, 42%)",
          textAlign: "right",
          pointerEvents: "auto",
        }}
      >
        <p
          style={{
            fontSize: "0.6875rem",
            fontWeight: 500,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "var(--hero-text-secondary)",
            marginBottom: "1rem",
          }}
        >
          Elephant · Herd Signal
        </p>

        <h1
          style={{
            fontSize: "clamp(2.2rem, 4.5vw, 4.5rem)",
            fontWeight: 700,
            letterSpacing: "-0.03em",
            lineHeight: 1.04,
            color: "var(--hero-text-primary)",
            marginBottom: "1.25rem",
          }}
        >
          Protecting elephants
          <br />
          with{" "}
          <span style={{ color: "var(--accent-green)" }}>sound</span>.
        </h1>

        <p
          style={{
            fontSize: "1rem",
            lineHeight: 1.65,
            letterSpacing: "-0.01em",
            color: "var(--hero-text-secondary)",
            marginBottom: "2.25rem",
          }}
        >
          Map intelligence, acoustic noise separation, and voice-first
          conservation exploration — all in one platform.
        </p>

        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            flexWrap: "wrap",
            justifyContent: "flex-end",
          }}
        >
          <a href="#separator" className="btn btn-primary">
            Open separator
          </a>
          <a href="#voice" className="btn btn-ghost">
            Voice mode
          </a>
        </div>
      </motion.div>

      {/* ── Bottom fade — blends into page ── */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "28%",
          background: "linear-gradient(to bottom, transparent, var(--bg-deep))",
          zIndex: 6,
          pointerEvents: "none",
        }}
      />
    </section>
  );
}
