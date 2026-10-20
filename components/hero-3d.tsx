'use client';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Lightformer, MeshTransmissionMaterial, RoundedBox, ContactShadows } from '@react-three/drei';
import { useRef } from 'react';
import { Color, MathUtils, type Group, type Mesh } from 'three';
const GLASS_BG = new Color('#1a1f36');
import { useDemoRound } from '../lib/demo-bus';
const CARD = ['#f5b83d', '#7c8cff', '#3ddc97', '#ff6b6b', '#4cc9f0', '#c77dff', '#ff9f68', '#a3e635'];
/** One ballot: starts above the slot, falls through it and settles on the stack inside the box. */
function Ballot({ i, color }: { i: number; color: string }) {
  const m = useRef<Mesh>(null);
  const restY = -0.86 + i * 0.075, spin = ((i * 47) % 11 - 5) * 0.05;
  useFrame((_, d) => {
    const o = m.current; if (!o) return;
    o.position.y = MathUtils.damp(o.position.y, restY, 3.2, d);
    o.rotation.y = MathUtils.damp(o.rotation.y, spin, 2.5, d);
    o.rotation.x = MathUtils.damp(o.rotation.x, 0, 2.5, d);
  });
  return (
    <mesh ref={m} position={[0, 2.6, 0]} rotation={[0.9, 0, 0]}>
      <boxGeometry args={[1.35, 0.035, 0.9]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.28} roughness={0.45} metalness={0.05} />
    </mesh>
  );
}
function BallotBox() {
  const g = useRef<Group>(null);
  const { round } = useDemoRound();
  const n = Math.min(round + 1, CARD.length);
  useFrame((s, d) => {
    const o = g.current; if (!o) return;
    // Subtle cursor parallax (±0.22 rad) plus a slow idle drift.
    o.rotation.y = MathUtils.damp(o.rotation.y, -0.62 + s.pointer.x * 0.22 + Math.sin(s.clock.elapsedTime * 0.25) * 0.06, 2.4, d);
    o.rotation.x = MathUtils.damp(o.rotation.x, 0.32 - s.pointer.y * 0.12, 2.4, d);
  });
  return (
    <group ref={g} rotation={[0.32, -0.62, 0]} position={[0, -0.15, 0]}>
      <RoundedBox args={[2.2, 2.0, 1.6]} radius={0.16} smoothness={5}>
        <MeshTransmissionMaterial thickness={0.25} roughness={0.12} transmission={1} ior={1.32} chromaticAberration={0.05} anisotropy={0.15} distortion={0.08} distortionScale={0.2} temporalDistortion={0}
          backside backsideThickness={0.2} samples={4} resolution={384} background={GLASS_BG} color="#eef1ff" attenuationColor="#9aa6ff" attenuationDistance={4} />
      </RoundedBox>
      {/* slot and lid band */}
      <mesh position={[0, 1.005, 0]}><boxGeometry args={[1.45, 0.012, 0.12]} /><meshBasicMaterial color="#07080a" /></mesh>
      <mesh position={[0, 0.62, 0.805]}><boxGeometry args={[2.0, 0.08, 0.004]} /><meshBasicMaterial color="#f5b83d" /></mesh>
      {Array.from({ length: n }, (_, i) => <Ballot key={i} i={i} color={CARD[i]} />)}
    </group>
  );
}
/** The glass ballot box. Lighting is generated in-scene with Lightformers: no environment file is fetched from anywhere. */
export default function Hero3D() {
  return (
    <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0.4, 6.4], fov: 36 }} gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }} aria-hidden data-testid="hero-3d">
      <ambientLight intensity={0.35} /><directionalLight position={[3, 5, 4]} intensity={1.2} />
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={3.2} color="#ffffff" position={[0, 4, -2]} scale={[8, 2, 1]} />
        <Lightformer form="rect" intensity={2.4} color="#7c8cff" position={[-5, 1, 1]} rotation-y={Math.PI / 2} scale={[6, 3, 1]} />
        <Lightformer form="rect" intensity={2} color="#f5b83d" position={[5, -1, 1]} rotation-y={-Math.PI / 2} scale={[6, 2, 1]} />
        <Lightformer form="ring" intensity={0.8} color="#ffffff" position={[0, 0, 6]} scale={3} />
      </Environment>
      <BallotBox />
      <ContactShadows position={[0, -1.45, 0]} opacity={0.45} scale={7} blur={2.6} far={2.5} frames={1} />
    </Canvas>
  );
}
