'use client';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
const Hero3D = dynamic(() => import('./hero-3d'), { ssr: false, loading: () => <BallotSvg /> });
/** Static SVG on small screens, reduced motion, or before idle; the WebGL ballot box loads afterwards. */
export function HeroVisual() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const ok = matchMedia('(min-width: 768px)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!ok) return; const ric = (window as any).requestIdleCallback ?? ((f: () => void) => setTimeout(f, 600));
    const id = ric(() => setOn(true)); return () => (window as any).cancelIdleCallback?.(id);
  }, []);
  return <div className="h-full w-full">{on ? <Hero3D /> : <BallotSvg />}</div>;
}
export function BallotSvg() {
  return (
    <svg viewBox="0 0 200 200" className="mx-auto h-full max-h-80 w-full" aria-hidden>
      <defs><linearGradient id="gl" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor="#cfd6ff" stopOpacity=".35" /><stop offset="1" stopColor="#7c8cff" stopOpacity=".08" /></linearGradient></defs>
      <g transform="translate(100 108)">
        <path d="M-56 -30 L0 -58 L56 -30 L56 34 L0 62 L-56 34 Z" fill="url(#gl)" stroke="#ffffff30" />
        <path d="M-56 -30 L0 -2 L56 -30 M0 -2 V62" stroke="#ffffff22" fill="none" />
        <path d="M-12 -36 L12 -24" stroke="#07080a" strokeWidth="4" strokeLinecap="round" />
        {['#f5b83d', '#7c8cff', '#3ddc97'].map((c, i) => <rect key={c} x={-30 + i * 14} y={-92 + i * 10} width="40" height="22" rx="3" fill={c} opacity=".9" transform={`rotate(${-18 + i * 9})`} />)}
      </g>
    </svg>
  );
}
