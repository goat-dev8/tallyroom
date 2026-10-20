'use client';
import { motion, useReducedMotion } from 'motion/react';
import { useId } from 'react';
import { cn } from './ui';
/** Brand motif: numbered rounds on a rail. Counted rounds carry an amber underline; the active pill glides between rounds. */
export function RoundRail({ rounds, round, onPick, testid = 'round-rail' }: { rounds: number; round: number; onPick?: (i: number) => void; testid?: string }) {
  const reduce = useReducedMotion(); const id = useId();
  return (
    <div className="relative flex items-center gap-1 rounded-lg bg-white/[.025] p-1 ring-1 ring-inset ring-white/[.05]" role="tablist" aria-label="Rounds" data-testid={testid}>
      <motion.span aria-hidden className="pointer-events-none absolute bottom-0 left-1 h-px bg-gradient-to-r from-tally/0 via-tally/60 to-tally" initial={false}
        animate={{ width: `calc(${rounds > 1 ? (round / (rounds - 1)) * 100 : 0}% - ${rounds > 1 ? (round / (rounds - 1)) * 8 : 0}px)` }} transition={reduce ? { duration: 0 } : { duration: 0.9, ease: [0.22, 1, 0.36, 1] }} />
      {Array.from({ length: rounds }, (_, i) => (
        <button key={i} type="button" role="tab" aria-selected={i === round} data-testid={`${testid}-r${i + 1}`} onClick={() => onPick?.(i)}
          className={cn('relative flex h-7 min-w-0 flex-1 items-center justify-center rounded-md font-mono text-[11px] tracking-wider transition-colors duration-300 ease-[cubic-bezier(.22,1,.36,1)] focus-visible:outline-2 focus-visible:outline-tally',
            i === round ? 'text-ink' : i < round ? 'text-tally hover:bg-white/5' : 'text-[#b4b9c2] hover:bg-white/5 hover:text-fg')}>
          {i === round && <motion.span layoutId={reduce ? undefined : `rail-${id}`} transition={{ type: 'spring', stiffness: 420, damping: 38 }} className="absolute inset-0 rounded-md bg-[linear-gradient(180deg,#ffd27a,var(--color-tally))] shadow-[0_0_24px_-4px_rgba(245,184,61,.65),inset_0_1px_0_#fff6]" />}
          {i !== round && <span className={cn('pointer-events-none absolute inset-x-2 bottom-0.5 h-0.5 rounded-full', i < round ? 'bg-tally/70' : 'bg-white/10')} />}
          <span className="pointer-events-none relative">R<span className="sr-only">ound </span>{i + 1}</span>
        </button>
      ))}
    </div>
  );
}
