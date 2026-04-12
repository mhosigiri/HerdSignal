"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

/* ─── Types ──────────────────────────────────────────────────────────────── */

export type AudioMode = "idle" | "listening" | "speaking";

/* ─── Constants ──────────────────────────────────────────────────────────── */

const POINTS_PER_RING = 96;
const BASE_RADII = [1.4, 2.1, 2.9];

const COLORS: Record<AudioMode, { inner: string; outer: string; core: string }> = {
  idle:      { inner: "#27452d", outer: "#5d8b63", core: "#d2a24f" },
  listening: { inner: "#d76848", outer: "#f0a882", core: "#ffffff" },
  speaking:  { inner: "#d2a24f", outer: "#f7efe1", core: "#ffffff" },
};

function getColors(mode: AudioMode) {
  return COLORS[mode] ?? COLORS.idle;
}

function seededUnit(seed: number) {
  const raw = Math.sin(seed * 12.9898) * 43758.5453;
  return raw - Math.floor(raw);
}

/* ─── Single ring of particles ───────────────────────────────────────────── */

function ParticleRing({
  radius,
  ringIndex,
  freqData,
  mode,
}: {
  radius: number;
  ringIndex: number;
  freqData: React.MutableRefObject<Uint8Array | null>;
  mode: AudioMode;
}) {
  const posRef = useRef<THREE.BufferAttribute | null>(null);
  const matRef = useRef<THREE.PointsMaterial | null>(null);
  const c = getColors(mode);

  /* Initial ring positions */
  const initialPositions = useMemo(() => {
    const arr = new Float32Array(POINTS_PER_RING * 3);
    for (let i = 0; i < POINTS_PER_RING; i++) {
      const a = (i / POINTS_PER_RING) * Math.PI * 2;
      arr[i * 3]     = Math.cos(a) * radius;
      arr[i * 3 + 1] = Math.sin(a) * radius;
      arr[i * 3 + 2] = 0;
    }
    return arr;
  }, [radius]);

  useFrame(({ clock }) => {
    const buf = posRef.current;
    if (!buf) return;

    const t = clock.getElapsedTime();
    const freq = freqData.current;
    const hasFreq = freq !== null && freq.length > 0;
    const binStep = hasFreq && freq ? Math.max(1, Math.floor(freq.length / POINTS_PER_RING)) : 1;

    for (let i = 0; i < POINTS_PER_RING; i++) {
      const angle = (i / POINTS_PER_RING) * Math.PI * 2;
      let displacement = 0;

      if (hasFreq && freq) {
        const binIdx = Math.min(i * binStep, freq.length - 1);
        const norm = freq[binIdx] / 255;
        displacement = norm * (0.55 + ringIndex * 0.28);
      } else {
        const speed = 1.1 + ringIndex * 0.35;
        const phase = (i / POINTS_PER_RING) * Math.PI * 4;
        const amp = mode === "idle" ? 0.06 : 0.18;
        displacement = Math.abs(Math.sin(t * speed + phase)) * amp;
      }

      const r = radius + displacement;
      buf.setXYZ(i, Math.cos(angle) * r, Math.sin(angle) * r, 0);
    }
    buf.needsUpdate = true;

    if (matRef.current) {
      const active = hasFreq && freq ? freq.reduce((s, v) => s + v, 0) / (freq.length * 255) : 0;
      const target = 0.032 + active * 0.055 + ringIndex * 0.012;
      matRef.current.size += (target - matRef.current.size) * 0.1;
    }
  });

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          args={[initialPositions, 3]}
          ref={posRef}
          attach="attributes-position"
        />
      </bufferGeometry>
      <pointsMaterial
        ref={matRef}
        size={0.035}
        color={ringIndex === 0 ? c.inner : c.outer}
        transparent
        opacity={0.75 - ringIndex * 0.14}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}

/* ─── Central glowing orb ─────────────────────────────────────────────────── */

function CoreOrb({ freqData, mode }: { freqData: React.MutableRefObject<Uint8Array | null>; mode: AudioMode }) {
  const meshRef = useRef<THREE.Mesh | null>(null);
  const matRef  = useRef<THREE.MeshStandardMaterial | null>(null);
  const c = getColors(mode);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const freq = freqData.current;
    let energy = 0;

    if (freq && freq.length) {
      const lowBins = Math.max(1, Math.floor(freq.length / 6));
      for (let i = 0; i < lowBins; i++) energy += freq[i];
      energy = energy / (lowBins * 255);
    }

    const pulse = energy > 0
      ? 0.2 + energy * 0.65
      : 0.2 + Math.abs(Math.sin(t * 1.3)) * 0.055;

    if (meshRef.current) meshRef.current.scale.setScalar(pulse);
    if (matRef.current)  matRef.current.emissiveIntensity = 0.55 + energy * 3;
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.55, 32, 32]} />
      <meshStandardMaterial
        ref={matRef}
        color={c.core}
        emissive={c.core}
        emissiveIntensity={0.6}
        transparent
        opacity={0.88}
      />
    </mesh>
  );
}

/* ─── Rotating spokes ─────────────────────────────────────────────────────── */

function Spokes({ mode }: { mode: AudioMode }) {
  const groupRef = useRef<THREE.Group | null>(null);
  const c = getColors(mode);
  const COUNT = 24;

  const geometries = useMemo(() =>
    Array.from({ length: COUNT }, (_, i) => {
      const angle = (i / COUNT) * Math.PI * 2;
      const pts = [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(Math.cos(angle) * 3.0, Math.sin(angle) * 3.0, 0),
      ];
      return new THREE.BufferGeometry().setFromPoints(pts);
    }),
  []);

  useFrame(({ clock }) => {
    if (groupRef.current) groupRef.current.rotation.z = clock.getElapsedTime() * 0.07;
  });

  return (
    <group ref={groupRef}>
      {geometries.map((geo, i) => (
        <line key={i}>
          <primitive object={geo} attach="geometry" />
          <lineBasicMaterial color={c.outer} transparent opacity={0.055} />
        </line>
      ))}
    </group>
  );
}

/* ─── Ambient dust particles ──────────────────────────────────────────────── */

function AmbientDust({ mode }: { mode: AudioMode }) {
  const COUNT = 160;
  const c = getColors(mode);
  const posRef = useRef<THREE.BufferAttribute | null>(null);

  const { initialPos, phases } = useMemo(() => {
    const initialPos = new Float32Array(COUNT * 3);
    const phases = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      const a = seededUnit(i + 1) * Math.PI * 2;
      const r = 3.3 + seededUnit(i + 101) * 1.6;
      initialPos[i * 3]     = Math.cos(a) * r;
      initialPos[i * 3 + 1] = Math.sin(a) * r;
      initialPos[i * 3 + 2] = (seededUnit(i + 1001) - 0.5) * 0.3;
      phases[i] = seededUnit(i + 2001) * Math.PI * 2;
    }
    return { initialPos, phases };
  }, []);

  useFrame(({ clock }) => {
    const buf = posRef.current;
    if (!buf) return;
    const t = clock.getElapsedTime();
    for (let i = 0; i < COUNT; i++) {
      const ox = initialPos[i * 3];
      const oy = initialPos[i * 3 + 1];
      const r = Math.sqrt(ox * ox + oy * oy);
      const baseAngle = Math.atan2(oy, ox);
      const drift = Math.sin(t * 0.25 + phases[i]) * 0.012;
      buf.setXYZ(i, Math.cos(baseAngle + drift) * r, Math.sin(baseAngle + drift) * r, initialPos[i * 3 + 2]);
    }
    buf.needsUpdate = true;
  });

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          args={[initialPos, 3]}
          ref={posRef}
          attach="attributes-position"
        />
      </bufferGeometry>
      <pointsMaterial size={0.02} color={c.inner} transparent opacity={0.3} depthWrite={false} sizeAttenuation />
    </points>
  );
}

/* ─── Full scene ──────────────────────────────────────────────────────────── */

function SpectrumScene({ freqData, mode }: { freqData: React.MutableRefObject<Uint8Array | null>; mode: AudioMode }) {
  const groupRef = useRef<THREE.Group | null>(null);
  useFrame(({ clock }) => {
    if (groupRef.current) groupRef.current.rotation.z = clock.getElapsedTime() * 0.035;
  });

  const safeMode: AudioMode = (["idle", "listening", "speaking"] as AudioMode[]).includes(mode)
    ? mode
    : "idle";

  return (
    <group ref={groupRef}>
      <Spokes mode={safeMode} />
      <AmbientDust mode={safeMode} />
      {BASE_RADII.map((r, i) => (
        <ParticleRing key={i} radius={r} ringIndex={i} freqData={freqData} mode={safeMode} />
      ))}
      <CoreOrb freqData={freqData} mode={safeMode} />
    </group>
  );
}

/* ─── Public export ───────────────────────────────────────────────────────── */

export function SoundWaveScene({
  freqData,
  mode,
}: {
  freqData: React.MutableRefObject<Uint8Array | null>;
  mode: AudioMode;
}) {
  const safeMode: AudioMode = (["idle", "listening", "speaking"] as AudioMode[]).includes(mode)
    ? mode
    : "idle";

  const bgColor =
    safeMode === "listening" ? "rgba(215,104,72,0.16)"
    : safeMode === "speaking" ? "rgba(210,162,79,0.16)"
    : "rgba(39,69,45,0.14)";

  return (
    <div
      style={{
        height: "26rem",
        position: "relative",
        overflow: "hidden",
        background: `radial-gradient(ellipse 70% 70% at 50% 50%, ${bgColor} 0%, transparent 72%)`,
        transition: "background 0.5s ease",
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 7.5], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.55} />
        <pointLight position={[0, 0, 4]} intensity={1.4} color="#d2a24f" />
        <SpectrumScene freqData={freqData} mode={safeMode} />
      </Canvas>

      <div
        style={{
          position: "absolute",
          bottom: "1rem",
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: "0.5625rem",
          fontFamily: "var(--font-mono), monospace",
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color:
            safeMode === "listening" ? "rgba(215,104,72,0.65)"
            : safeMode === "speaking" ? "rgba(210,162,79,0.65)"
            : "rgba(255,255,255,0.18)",
          pointerEvents: "none",
          transition: "color 0.4s ease",
          whiteSpace: "nowrap",
        }}
      >
        {safeMode === "listening" ? "● listening" : safeMode === "speaking" ? "● speaking" : "○ standby"}
      </div>
    </div>
  );
}
