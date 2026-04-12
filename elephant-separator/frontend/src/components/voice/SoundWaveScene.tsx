"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group, Mesh } from "three";

function WaveBars({ activity }: { activity: number }) {
  const groupRef = useRef<Group | null>(null);
  const barRefs = useRef<Mesh[]>([]);

  useFrame((state) => {
    const elapsed = state.clock.getElapsedTime();
    barRefs.current.forEach((mesh, index) => {
      if (!mesh) {
        return;
      }
      const scale = 0.9 + Math.sin(elapsed * 2.6 + index * 0.42) * activity;
      mesh.scale.y = Math.max(0.2, scale + index * 0.03);
      mesh.position.y = mesh.scale.y / 2;
    });

    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(elapsed * 0.25) * 0.25;
    }
  });

  return (
    <group ref={groupRef}>
      {Array.from({ length: 12 }, (_, index) => (
        <mesh
          key={index}
          ref={(mesh) => {
            if (mesh) {
              barRefs.current[index] = mesh;
            }
          }}
          position={[index * 0.32 - 1.76, 0.5, 0]}
        >
          <boxGeometry args={[0.18, 1, 0.18]} />
          <meshStandardMaterial color={index % 3 === 0 ? "#d2a24f" : "#5d8b63"} />
        </mesh>
      ))}
    </group>
  );
}

export function SoundWaveScene({ activity }: { activity: number }) {
  return (
    <div className="h-80 overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top,#27452d_0%,#102017_70%)]">
      <Canvas camera={{ position: [0, 2.2, 5.5], fov: 48 }}>
        <ambientLight intensity={1.2} />
        <directionalLight position={[4, 6, 4]} intensity={1.8} />
        <WaveBars activity={activity} />
      </Canvas>
    </div>
  );
}

