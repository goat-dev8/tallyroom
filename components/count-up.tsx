'use client';
import { animate, useReducedMotion } from 'motion/react';
import { useEffect, useRef } from 'react';
export function CountUp({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null); const prev = useRef(0); const reduce = useReducedMotion();
  useEffect(() => {
    const el = ref.current; if (!el) return;
    if (reduce) { el.textContent = value.toLocaleString('en-US'); prev.current = value; return; }
    const c = animate(prev.current, value, { duration: 0.9, ease: [0.22, 1, 0.36, 1], onUpdate: v => { el.textContent = Math.round(v).toLocaleString('en-US'); } });
    prev.current = value; return () => c.stop();
  }, [value, reduce]);
  return <span ref={ref} className={`tnum ${className ?? ''}`}>{value.toLocaleString('en-US')}</span>;
}
