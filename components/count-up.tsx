'use client';
import { animate, useReducedMotion } from 'motion/react';
import { useEffect, useRef } from 'react';
const f = (n: number) => n.toLocaleString('en-US');
/** Counts from the previous value to the exact new one; always lands on the exact integer. Width is fixed by tabular numerals. */
export function CountUp({ value, className, duration = 0.9 }: { value: number; className?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null); const prev = useRef<number | null>(null); const reduce = useReducedMotion();
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const from = prev.current; prev.current = value;
    if (reduce || from === null || from === value) { el.textContent = f(value); return; }
    const c = animate(from, value, { duration, ease: [0.22, 1, 0.36, 1], onUpdate: v => { el.textContent = f(Math.round(v)); }, onComplete: () => { el.textContent = f(value); } });
    return () => { c.stop(); el.textContent = f(value); };
  }, [value, reduce, duration]);
  return <span ref={ref} className={`tnum ${className ?? ''}`} data-value={value}>{f(value)}</span>;
}
