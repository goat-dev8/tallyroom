'use client';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshTransmissionMaterial, RoundedBox, Environment } from '@react-three/drei';
import { useRef } from 'react';
import type { Group } from 'three';
const CARDS = ['#f5b83d', '#7c8cff', '#3ddc97', '#ff6b6b'];
function BallotBox() {
  const g = useRef<Group>(null);
  useFrame((s, d) => { if (g.current) { g.current.rotation.y += d * 0.18; g.current.rotation.x = Math.sin(s.clock.elapsedTime * 0.3) * 0.08; } });
  return (
    <group ref={g} rotation={[0.35, -0.6, 0]}>
      <RoundedBox args={[2.2, 2.2, 2.2]} radius={0.22} smoothness={6}>
        <MeshTransmissionMaterial thickness={0.6} roughness={0.08} transmission={1} ior={1.35} chromaticAberration={0.06} anisotropy={0.2} backside samples={6} resolution={512} color="#cfd6ff" />
      </RoundedBox>
      <mesh position={[0, 1.105, 0]}><boxGeometry args={[1.1, 0.02, 0.16]} /><meshBasicMaterial color="#07080a" /></mesh>
      {CARDS.map((c, i) => (
        <Float key={c} speed={1.4 + i * 0.2} floatIntensity={0.6} rotationIntensity={0.4}>
          <mesh position={[-0.55 + i * 0.36, -0.55 + i * 0.32, 0]} rotation={[0, 0, 0.12 * (i - 1.5)]}><boxGeometry args={[1.2, 0.04, 0.8]} /><meshStandardMaterial color={c} emissive={c} emissiveIntensity={0.35} roughness={0.4} /></mesh>
        </Float>
      ))}
    </group>
  );
}
export default function Hero3D() {
  return (
    <Canvas dpr={[1, 1.75]} camera={{ position: [0, 0, 6.2], fov: 38 }} gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }} aria-hidden>
      <ambientLight intensity={0.5} /><directionalLight position={[3, 4, 5]} intensity={1.4} />
      <Environment preset="city" />
      <BallotBox />
    </Canvas>
  );
}
