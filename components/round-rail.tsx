'use client';
import { cn } from './ui';
/** Brand motif: numbered rounds on a rail; rounds already counted carry an amber underline, the current round is filled. */
export function RoundRail({ rounds, round, onPick, testid = 'round-rail' }: { rounds: number; round: number; onPick?: (i: number) => void; testid?: string }) {
  return (
    <div className="relative flex items-center gap-1" role="tablist" aria-label="Rounds" data-testid={testid}>
      {Array.from({ length: rounds }, (_, i) => (
        <button key={i} type="button" role="tab" aria-selected={i === round} data-testid={`${testid}-r${i + 1}`} onClick={() => onPick?.(i)}
          className={cn('relative flex h-6 min-w-0 flex-1 items-center justify-center rounded-md font-mono text-[10px] tracking-wider transition-[background-color,color,box-shadow] duration-300 ease-[cubic-bezier(.22,1,.36,1)] focus-visible:outline-2 focus-visible:outline-tally',
            i === round ? 'bg-tally text-ink shadow-[0_0_24px_-4px_rgba(245,184,61,.6)]' : i < round ? 'text-tally hover:bg-white/5' : 'text-mute hover:bg-white/5 hover:text-fg')}>
          <span className={cn('pointer-events-none absolute inset-x-0 bottom-0 h-0.5 rounded-full', i < round ? 'bg-tally/70' : i > round ? 'bg-white/10' : 'bg-transparent')} />
          <span className="pointer-events-none relative">R<span className="sr-only">ound </span>{i + 1}</span>
        </button>
      ))}
    </div>
  );
}
