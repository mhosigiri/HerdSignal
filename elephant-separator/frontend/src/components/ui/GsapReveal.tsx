"use client";

import { useRef, useEffect, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

interface GsapRevealProps {
  children: ReactNode;
  direction?: "up" | "left" | "right";
  delay?: number;
  /** stagger children */
  stagger?: boolean;
  className?: string;
}

/**
 * Wraps children in a div that animates into view on scroll via GSAP ScrollTrigger.
 */
export function GsapReveal({
  children,
  direction = "up",
  delay = 0,
  stagger = false,
  className,
}: GsapRevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const fromVars: gsap.TweenVars = {
      opacity: 0,
      y: direction === "up" ? 36 : 0,
      x: direction === "left" ? -40 : direction === "right" ? 40 : 0,
    };

    const toVars: gsap.TweenVars = {
      opacity: 1,
      y: 0,
      x: 0,
      duration: 0.85,
      ease: "power3.out",
      delay,
      scrollTrigger: {
        trigger: el,
        start: "top 82%",
        once: true,
      },
    };

    if (stagger) {
      gsap.fromTo(el.children, fromVars, {
        ...toVars,
        stagger: 0.12,
      });
    } else {
      gsap.fromTo(el, fromVars, toVars);
    }

    return () => {
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, [direction, delay, stagger]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
