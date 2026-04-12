"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

const RING_COUNT = 5;
const PTS_PER_RING = 128;

const ringVert = `
  uniform float uTime;
  uniform float uFreq;
  uniform float uAmp;
  attribute float aAngle;
  varying float vDist;
  void main(){
    vDist = sin(aAngle * uFreq + uTime * 2.0) * uAmp;
    vec3 p = position + normal * vDist;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p,1.0);
    gl_PointSize = 2.0 + vDist * 5.0;
  }
`;

const ringFrag = `
  uniform vec3 uColor;
  uniform float uAlpha;
  varying float vDist;
  void main(){
    float d = length(gl_PointCoord - vec2(0.5));
    if(d > 0.5) discard;
    float a = smoothstep(0.5, 0.08, d) * uAlpha;
    gl_FragColor = vec4(uColor + vDist * 0.25, a);
  }
`;

function Ring({ radius, freq, amp, color, opacity, speed }: {
  radius: number; freq: number; amp: number; color: string; opacity: number; speed: number;
}) {
  const ref = useRef<THREE.Points>(null);
  const { positions, normals, angles } = useMemo(() => {
    const p = new Float32Array(PTS_PER_RING * 3);
    const n = new Float32Array(PTS_PER_RING * 3);
    const a = new Float32Array(PTS_PER_RING);
    for (let i = 0; i < PTS_PER_RING; i++) {
      const angle = (i / PTS_PER_RING) * Math.PI * 2;
      p[i*3]=Math.cos(angle)*radius; p[i*3+1]=Math.sin(angle)*radius; p[i*3+2]=0;
      n[i*3]=Math.cos(angle); n[i*3+1]=Math.sin(angle); n[i*3+2]=0;
      a[i]=angle;
    }
    return { positions: p, normals: n, angles: a };
  }, [radius]);

  const uniforms = useMemo(() => ({
    uTime:  { value: 0 },
    uFreq:  { value: freq },
    uAmp:   { value: amp },
    uColor: { value: new THREE.Color(color) },
    uAlpha: { value: opacity },
  }), [freq, amp, color, opacity]);

  useFrame(({ clock }) => {
    uniforms.uTime.value = clock.getElapsedTime() * speed;
    if (ref.current) ref.current.rotation.z += 0.001 * speed;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} count={PTS_PER_RING} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-normal"   args={[normals, 3]}   count={PTS_PER_RING} array={normals}   itemSize={3} />
        <bufferAttribute attach="attributes-aAngle"   args={[angles, 1]}   count={PTS_PER_RING} array={angles}    itemSize={1} />
      </bufferGeometry>
      <shaderMaterial vertexShader={ringVert} fragmentShader={ringFrag} uniforms={uniforms}
        transparent depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

function Core() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const s = 1 + Math.sin(clock.getElapsedTime() * 1.5) * 0.08;
    ref.current.scale.set(s, s, s);
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.45, 32, 32]} />
      <meshStandardMaterial color="#d2a24f" emissive="#d2a24f" emissiveIntensity={0.6} transparent opacity={0.9} />
    </mesh>
  );
}

function Glow() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const s = 2.2 + Math.sin(clock.getElapsedTime() * 0.8) * 0.3;
    ref.current.scale.set(s, s, s);
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshBasicMaterial color="#d2a24f" transparent opacity={0.05} side={THREE.BackSide} />
    </mesh>
  );
}

function OrbScene() {
  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[0, 0, 4]} intensity={2} color="#d2a24f" />
      <Glow />
      <Ring radius={1.0} freq={6}  amp={0.08} color="#d2a24f" opacity={0.7}  speed={1.0} />
      <Ring radius={1.3} freq={8}  amp={0.12} color="#f7efe1" opacity={0.5}  speed={0.8} />
      <Ring radius={1.6} freq={10} amp={0.06} color="#5d8b63" opacity={0.35} speed={1.2} />
      <Ring radius={1.9} freq={5}  amp={0.10} color="#d2a24f" opacity={0.25} speed={0.6} />
      <Ring radius={2.2} freq={12} amp={0.04} color="#f7efe1" opacity={0.15} speed={1.4} />
      <Core />
    </>
  );
}

export function AcousticOrb() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0">
      <Canvas
        camera={{ position: [0, 0, 5.5], fov: 45 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <OrbScene />
      </Canvas>
    </div>
  );
}
