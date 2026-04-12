"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

const COUNT = 600;

const DUST_COLORS = [
  new THREE.Color("#d2a24f"),
  new THREE.Color("#f7efe1"),
  new THREE.Color("#efe5d1"),
  new THREE.Color("#c4903d"),
];

function Cloud() {
  const ref = useRef<THREE.Points>(null);

  const { positions, colors, velocities } = useMemo(() => {
    const pos = new Float32Array(COUNT * 3);
    const col = new Float32Array(COUNT * 3);
    const vel = new Float32Array(COUNT * 3);

    for (let i = 0; i < COUNT; i++) {
      const i3 = i * 3;
      pos[i3]     = (Math.random() - 0.5) * 28;
      pos[i3 + 1] = (Math.random() - 0.5) * 14;
      pos[i3 + 2] = (Math.random() - 0.5) * 12;

      const c = DUST_COLORS[Math.floor(Math.random() * DUST_COLORS.length)];
      col[i3] = c.r;
      col[i3 + 1] = c.g;
      col[i3 + 2] = c.b;

      vel[i3]     = (Math.random() - 0.5) * 0.002;
      vel[i3 + 1] = Math.random() * 0.0015 + 0.0005;
      vel[i3 + 2] = (Math.random() - 0.5) * 0.0008;
    }
    return { positions: pos, colors: col, velocities: vel };
  }, []);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const arr = ref.current.geometry.attributes.position.array as Float32Array;
    const t = clock.getElapsedTime();

    for (let i = 0; i < COUNT; i++) {
      const i3 = i * 3;
      arr[i3]     += velocities[i3]     + Math.sin(t * 0.3 + i * 0.1) * 0.0006;
      arr[i3 + 1] += velocities[i3 + 1] + Math.cos(t * 0.2 + i * 0.05) * 0.0003;
      arr[i3 + 2] += velocities[i3 + 2];

      if (arr[i3 + 1] > 7) {
        arr[i3 + 1] = -7;
        arr[i3] = (Math.random() - 0.5) * 28;
      }
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} count={COUNT} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-color"    args={[colors, 3]}    count={COUNT} array={colors}    itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        size={0.04}
        vertexColors
        transparent
        opacity={0.5}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

export function SavannaParticles() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0">
      <Canvas
        camera={{ position: [0, 0, 10], fov: 55 }}
        dpr={[1, 1.5]}
        gl={{ antialias: false, alpha: true }}
        style={{ background: "transparent" }}
      >
        <Cloud />
      </Canvas>
    </div>
  );
}
