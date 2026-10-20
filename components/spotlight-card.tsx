'use client';
import { useRef } from 'react';
import { cn } from './ui';
/** Card with a pointer-following spotlight and lit border (own implementation of the common spotlight-card pattern). CSS-variable driven, no re-renders. */
export function SpotlightCard({ className, color = 'rgba(124,140,255,.16)', children, ...p }: React.HTMLAttributes<HTMLDivElement> & { color?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const move = (e: React.PointerEvent) => { const el = ref.current; if (!el) return; const r = el.getBoundingClientRect(); el.style.setProperty('--mx', `${e.clientX - r.left}px`); el.style.setProperty('--my', `${e.clientY - r.top}px`); };
  return (
    <div ref={ref} onPointerMove={move} className={cn('spot card group relative overflow-hidden', className)} style={{ ['--spot' as string]: color }} {...p}>
      <span aria-hidden className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ background: 'radial-gradient(260px circle at var(--mx,50%) var(--my,0%), var(--spot), transparent 70%)' }} />
      <div className="relative">{children}</div>
    </div>
  );
}
