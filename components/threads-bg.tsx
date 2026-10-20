'use client';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { hasFastWebGL } from '../lib/gpu';
const Threads = dynamic(() => import('./reactbits/Threads'), { ssr: false });
/** Hero background: transfer "threads" in brand amber/iris. Loads after idle, never for reduced motion or without WebGL2. */
export function ThreadsBg() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || !hasFastWebGL()) return;
    const t = setTimeout(() => { const ric = (window as any).requestIdleCallback ?? ((f: () => void) => setTimeout(f, 100)); ric(() => setOn(true), { timeout: 2000 }); }, 600);
    return () => clearTimeout(t);
  }, []);
  return (
    <div aria-hidden className="threads-mask pointer-events-auto absolute inset-0" data-testid="threads-bg" data-on={on}>
      {on && <Threads className="fade-in" color="#7c8cff" accentColor="#f5b83d" amplitude={1.1} distance={0.25} lineCount={46} thickness={1} softness={0.6} speed={0.35} waves={2} split={0.35} fray={0.25} angle={-8} brightness={0.85} fade={0.6} opacity={0.55} enableMouseInteraction />}
    </div>
  );
}
