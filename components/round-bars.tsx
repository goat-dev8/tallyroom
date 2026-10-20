'use client';
import { motion, LayoutGroup, useReducedMotion } from 'motion/react';
import { Check, X } from 'lucide-react';
import type { IrvResult } from '../src/types';
import { colorFor, fmt, pct } from '../lib/catalog';
import { CountUp } from './count-up';
export const shortName = (n: string) => n.replace(/^(REP|DEM)\s+/, '');
const EASE = [0.22, 1, 0.36, 1] as const;
/**
 * One round of an IRV count. Every bar is drawn as a share of that round's continuing ballots, so the
 * majority line sits at exactly 50% of the track: a bar crosses it if and only if votes > continuing / 2
 * (votes >= threshold). Candidates reflow by layout as the order changes.
 */
export function RoundBars({ result, round, compact = false }: { result: IrvResult; round: number; compact?: boolean }) {
  const reduce = useReducedMotion();
  const r = result.rounds[round]; const last = round === result.rounds.length - 1;
  const rows = Object.entries(r.tallies).sort((a, b) => b[1] - a[1]);
  const inactive = Object.values(r.inactive).reduce((s, x) => s + x, 0);
  return (
    <LayoutGroup>
      <div className="relative" data-testid="round-bars" data-round={round + 1}>
        <div aria-hidden className={compact ? 'relative mb-2 h-4' : 'mb-2 grid h-4 gap-x-4 sm:grid-cols-[minmax(0,12rem)_1fr_8.5rem]'}>
          {!compact && <span className="hidden sm:block" />}
          <span className="relative block h-4"><span className="absolute top-0 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[10px] uppercase tracking-[.14em] text-tally" data-testid="majority-label">majority · {fmt(r.threshold)}</span></span>
        </div>
        <ul className="space-y-2.5">
          {rows.map(([name, v], i) => {
            const out = r.eliminated.includes(name); const won = last && name === result.winner;
            const share = r.continuing ? v / r.continuing : 0;
            return (
              <motion.li layout={!reduce} key={name} transition={{ type: 'spring', stiffness: 380, damping: 36 }} data-testid="candidate-row" data-candidate={name} data-votes={v}
                className={compact ? 'space-y-1.5' : 'grid items-center gap-x-4 gap-y-1.5 sm:grid-cols-[minmax(0,12rem)_1fr_8.5rem]'}>
                <div className="flex min-w-0 items-center gap-2 text-sm">
                  <span className="h-2 w-2 shrink-0 rounded-[2px]" style={{ background: colorFor(result.candidates, name) }} />
                  <span className={`truncate ${out ? 'text-mute line-through decoration-1' : ''}`}>{shortName(name)}</span>
                  {won && <Check className="h-3.5 w-3.5 shrink-0 text-win" aria-label="winner" data-testid="winner-mark" />}
                  {out && <X className="h-3.5 w-3.5 shrink-0 text-mute" aria-label="eliminated" />}
                  {compact && <span className="ml-auto shrink-0 font-mono text-[11px] text-mute tnum"><CountUp value={v} className="text-fg" /> · {pct(v, r.continuing)}</span>}
                </div>
                <div className="relative h-6 overflow-visible rounded-[5px] bg-white/[.035]">
                  <motion.div className="absolute inset-y-0 left-0 w-full origin-left rounded-[5px]" initial={false}
                    animate={{ scaleX: share, opacity: out ? 0.32 : 1 }} transition={reduce ? { duration: 0 } : { duration: 0.9, ease: EASE }}
                    style={{ background: `linear-gradient(90deg, ${colorFor(result.candidates, name)}b3, ${colorFor(result.candidates, name)})` }} />
                  <span aria-hidden className="absolute -inset-y-1 left-1/2 w-px bg-[repeating-linear-gradient(to_bottom,var(--color-tally)_0_3px,transparent_3px_6px)] opacity-80" data-testid={i === 0 ? 'majority-line' : undefined} />
                </div>
                {!compact && <span className="font-mono text-xs text-mute tnum sm:text-right"><CountUp value={v} className="text-fg" /> · {pct(v, r.continuing)}</span>}
              </motion.li>
            );
          })}
        </ul>
        <div className="mt-3 flex justify-between font-mono text-[11px] text-mute tnum"><span>Continuing <CountUp value={r.continuing} className="text-fg" /></span><span>Inactive <CountUp value={inactive} className="text-fg" /></span></div>
      </div>
    </LayoutGroup>
  );
}
