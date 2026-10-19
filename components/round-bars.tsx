'use client';
import { motion, LayoutGroup } from 'motion/react';
import { Check, X } from 'lucide-react';
import type { IrvResult } from '../src/types';
import { colorFor, pct } from '../lib/catalog';
import { CountUp } from './count-up';
const short = (n: string) => n.replace(/^(REP|DEM)\s+/, '');
/** Bars for one round: continuing candidates sorted by votes, eliminated ones fade out, majority line drawn. */
export function RoundBars({ result, round, compact = false }: { result: IrvResult; round: number; compact?: boolean }) {
  const r = result.rounds[round]; const last = round === result.rounds.length - 1;
  const max = Math.max(...result.rounds.flatMap(x => Object.values(x.tallies)));
  const rows = Object.entries(r.tallies).sort((a, b) => b[1] - a[1]);
  const inactive = Object.values(r.inactive).reduce((s, x) => s + x, 0);
  const scale = compact ? 100 : 78; const th = (r.threshold / max) * scale; const off = compact ? '0rem' : '11.75rem';
  return (
    <LayoutGroup>
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 border-l border-dashed border-tally/50" style={{ left: `calc(${off} + (100% - ${off}) * ${th / 100})` }}>
          <span className="absolute -top-5 -translate-x-1/2 whitespace-nowrap text-[10px] uppercase tracking-wider text-tally/80">majority</span>
        </div>
        <ul className="space-y-2.5">
          {rows.map(([name, v]) => {
            const out = r.eliminated.includes(name); const won = last && name === result.winner;
            return (
              <motion.li layout key={name} transition={{ type: 'spring', stiffness: 380, damping: 34 }} className={compact ? 'space-y-1' : 'grid grid-cols-[11rem_1fr] items-center gap-3'}>
                <div className="flex items-center gap-2 text-sm">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: colorFor(result.candidates, name) }} />
                  <span className={`truncate ${out ? 'text-mute line-through decoration-1' : ''}`}>{short(name)}</span>
                  {won && <Check className="h-3.5 w-3.5 text-win" aria-label="winner" />}{out && <X className="h-3.5 w-3.5 text-mute" aria-label="eliminated" />}
                  {compact && <span className="ml-auto text-xs text-mute tnum"><CountUp value={v} /> · {pct(v, r.continuing)}</span>}
                </div>
                <div className="relative flex h-6 items-center">
                  <motion.div className="h-full rounded-md" initial={false} animate={{ width: `${(v / max) * scale}%`, opacity: out ? 0.35 : 1 }}
                    transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} style={{ background: `linear-gradient(90deg, ${colorFor(result.candidates, name)}cc, ${colorFor(result.candidates, name)})` }} />
                  {!compact && <span className="ml-3 whitespace-nowrap text-xs text-mute"><CountUp value={v} className="text-fg" /> · {pct(v, r.continuing)}</span>}
                </div>
              </motion.li>
            );
          })}
        </ul>
        <div className="mt-3 flex justify-between text-xs text-mute tnum"><span>Continuing <CountUp value={r.continuing} /></span><span>Inactive <CountUp value={inactive} /></span></div>
      </div>
    </LayoutGroup>
  );
}
