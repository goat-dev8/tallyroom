'use client';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { hasFastWebGL } from '../lib/gpu';
const Hero3D = dynamic(() => import('./hero-3d'), { ssr: false, loading: () => <BallotSvg /> });
/** Static SVG on small screens, reduced motion, no WebGL, or until the page is idle; the WebGL ballot box loads afterwards. */
export function HeroVisual() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const ok = matchMedia('(min-width: 1024px)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches && hasFastWebGL();
    if (!ok) return;
    let id: number | undefined; const t = setTimeout(() => { const ric = (window as any).requestIdleCallback ?? ((f: () => void) => setTimeout(f, 200)); id = ric(() => setOn(true), { timeout: 2500 }); }, 1200);
    return () => { clearTimeout(t); if (id) (window as any).cancelIdleCallback?.(id); };
  }, []);
  return <div className="h-full w-full" data-testid="hero-visual" data-mode={on ? '3d' : 'svg'}>{on ? <Hero3D /> : <BallotSvg />}</div>;
}
/** Hand-built fallback: the same glass box, slot and ballot stack, in SVG. */
export function BallotSvg() {
  return (
    <svg viewBox="0 0 240 240" className="mx-auto h-full max-h-[22rem] w-full" aria-hidden data-testid="ballot-svg">
      <defs>
        <linearGradient id="bx-face" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor="#dfe4ff" stopOpacity=".28" /><stop offset="1" stopColor="#7c8cff" stopOpacity=".06" /></linearGradient>
        <linearGradient id="bx-top" x1="0" x2="1"><stop offset="0" stopColor="#fff" stopOpacity=".22" /><stop offset="1" stopColor="#fff" stopOpacity=".05" /></linearGradient>
      </defs>
      <ellipse cx="120" cy="206" rx="78" ry="9" fill="#000" opacity=".45" />
      <g transform="translate(120 128)">
        {['#f5b83d', '#7c8cff', '#3ddc97'].map((c, i) => <path key={c} d={`M-50 ${52 - i * 7} L0 ${76 - i * 7} L50 ${52 - i * 7} L0 ${28 - i * 7} Z`} fill={c} opacity=".85" />)}
        <path d="M-66 -34 L0 -66 L66 -34 L66 40 L0 72 L-66 40 Z" fill="url(#bx-face)" stroke="#ffffff38" />
        <path d="M-66 -34 L0 -2 L66 -34 L0 -66 Z" fill="url(#bx-top)" />
        <path d="M-66 -34 L0 -2 L66 -34 M0 -2 V72" stroke="#ffffff26" fill="none" />
        <path d="M-18 -40 L18 -24" stroke="#07080a" strokeWidth="5" strokeLinecap="round" />
        <path d="M-66 -12 L0 20" stroke="#f5b83d" strokeWidth="2" opacity=".9" />
        <rect x="-22" y="-104" width="44" height="30" rx="3" fill="#ff6b6b" transform="rotate(-24)" opacity=".95" />
      </g>
    </svg>
  );
}
