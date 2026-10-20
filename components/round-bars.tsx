'use client';
import { motion, LayoutGroup, AnimatePresence, useReducedMotion } from 'motion/react';
import { Check, X } from 'lucide-react';
import type { IrvResult } from '../src/types';
import { colorFor, fmt, pct } from '../lib/catalog';
import { CountUp } from './count-up';
export const shortName = (n: string) => n.replace(/^(REP|DEM)\s+/, '');
const EASE = [0.22, 1, 0.36, 1] as const;
const hex = (c: string, a: number) => c + Math.round(a * 255).toString(16).padStart(2, '0');

/**
 * One round of an IRV count. Every bar is a share of that round's continuing ballots, so the majority gate sits at exactly
 * 50% of the track: a bar crosses it if and only if votes > continuing / 2. Rows reflow by layout as the order changes.
 * The part of a bar gained by transfer since the previous round is drawn as a separate iris "thread" segment.
 */
export function RoundBars({ result, round, compact = false }: { result: IrvResult; round: number; compact?: boolean }) {
  const reduce = useReducedMotion();
  const r = result.rounds[round]; const prev = round > 0 ? result.rounds[round - 1] : null; const last = round === result.rounds.length - 1;
  const rows = Object.entries(r.tallies).sort((a, b) => b[1] - a[1]);
  const inactive = Object.values(r.inactive).reduce((s, x) => s + x, 0);
  const t = reduce ? { duration: 0 } : { duration: 0.9, ease: EASE };
  const cols = compact ? '' : 'sm:grid-cols-[minmax(0,13rem)_1fr_9.5rem]';
  return (
    <LayoutGroup>
      <div className="relative" data-testid="round-bars" data-round={round + 1}>
        <div aria-hidden className={compact ? 'relative mb-2 h-5' : `mb-2 grid h-5 gap-x-4 ${cols}`}>
          {!compact && <span className="hidden sm:block" />}
          <span className="relative block h-5">
            <span className="absolute top-0 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-tally/30 bg-tally/[.08] px-2 py-px font-mono text-[10px] uppercase tracking-[.14em] text-tally shadow-[0_0_18px_-6px_rgba(245,184,61,.7)]" data-testid="majority-label">majority · {fmt(r.threshold)}</span>
          </span>
        </div>
        <ul className="space-y-2">
          {rows.map(([name, v], i) => {
            const out = r.eliminated.includes(name); const won = last && name === result.winner;
            const share = r.continuing ? v / r.continuing : 0;
            const before = prev?.tallies[name] ?? v; const gain = Math.max(0, v - before);
            const base = r.continuing ? (v - gain) / r.continuing : 0;
            const c = colorFor(result.candidates, name);
            return (
              <motion.li layout={!reduce} key={name} transition={{ type: 'spring', stiffness: 320, damping: 34 }} data-testid="candidate-row" data-candidate={name} data-votes={v}
                className={`group relative rounded-xl px-2 py-1.5 transition-colors duration-200 hover:bg-white/[.025] ${compact ? 'space-y-1.5' : `grid items-center gap-x-4 gap-y-1.5 ${cols}`} ${won ? 'bg-win/[.04] ring-1 ring-win/25' : ''}`}>
                <div className="flex min-w-0 items-center gap-2.5 text-sm">
                  {!compact && <span className="w-4 shrink-0 text-right font-mono text-[10px] text-mute tnum">{i + 1}</span>}
                  <span className="relative grid h-2.5 w-2.5 shrink-0 place-items-center"><span className="absolute inset-0 rounded-full blur-[3px]" style={{ background: hex(c, out ? 0.2 : 0.7) }} /><span className="relative h-2 w-2 rounded-full" style={{ background: c, opacity: out ? 0.4 : 1 }} /></span>
                  <span className={`truncate ${out ? 'text-mute line-through decoration-1' : 'text-fg'}`}>{shortName(name)}</span>
                  {won && <motion.span initial={reduce ? false : { scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.5, duration: 0.42, ease: EASE }} className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-win/15"><Check className="h-3 w-3 text-win" aria-label="winner" data-testid="winner-mark" /></motion.span>}
                  {out && <X className="h-3.5 w-3.5 shrink-0 text-mute" aria-label="eliminated" />}
                  {compact && <span className="ml-auto shrink-0 font-mono text-[11px] text-mute tnum"><CountUp value={v} className="text-fg" /> · {pct(v, r.continuing)}</span>}
                </div>
                <div className={`relative overflow-hidden rounded-md bg-[linear-gradient(180deg,#ffffff06,#ffffff03)] ring-1 ring-inset ring-white/[.05] ${compact ? 'h-5' : 'h-7'}`} data-testid="bar-track">
                  {/* full share (first div: tests measure it) + gloss */}
                  <motion.div aria-hidden data-testid="bar-share" className="pointer-events-none absolute z-10 inset-y-0 left-0 w-full origin-left" initial={reduce ? false : { scaleX: 0 }} animate={{ scaleX: share }} transition={t}
                    style={{ background: 'linear-gradient(180deg,#ffffff1f,transparent 55%)' }} />
                  <span aria-hidden className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent_0_calc(10%-1px),#ffffff08_calc(10%-1px)_10%)]" />
                  {/* base votes */}
                  <motion.div className="absolute inset-y-0 left-0 w-full origin-left" initial={reduce ? false : { scaleX: 0 }} animate={{ scaleX: out ? share : base }} transition={t} data-testid="bar-fill"
                    style={{ background: out ? `repeating-linear-gradient(135deg, ${hex(c, .22)} 0 4px, ${hex(c, .08)} 4px 8px)` : `linear-gradient(90deg, ${hex(c, .14)}, ${hex(c, .55)} 70%, ${hex(c, .9)})` }} />
                  {/* gained by transfer this round */}
                  {!out && gain > 0 && <motion.div aria-hidden data-testid="bar-transfer" className="absolute inset-y-0" initial={reduce ? false : { left: `${base * 100}%`, width: '0%' }} animate={{ left: `${base * 100}%`, width: `${(share - base) * 100}%` }} transition={reduce ? { duration: 0 } : { duration: 0.9, delay: 0.3, ease: EASE }}
                    style={{ background: `linear-gradient(90deg, ${hex(c, .9)}, #7c8cffd9)` }} />}

                  {!out && <motion.span aria-hidden className="absolute inset-y-1 w-[2px] -translate-x-full rounded-full" initial={reduce ? false : { left: '0%' }} animate={{ left: `${share * 100}%` }} transition={t}
                    style={{ background: c, boxShadow: `0 0 10px 1px ${hex(c, .8)}` }} />}
                  {!reduce && !out && <motion.span key={round} aria-hidden className="pointer-events-none absolute inset-y-0 w-16 bg-[linear-gradient(90deg,transparent,#ffffff2e,transparent)]" initial={{ left: '-10%' }} animate={{ left: `${share * 100}%`, opacity: [0, 1, 0] }} transition={{ duration: 1.1, ease: EASE }} />}
                  <span aria-hidden className="absolute inset-y-0 left-1/2 w-px bg-[repeating-linear-gradient(to_bottom,var(--color-tally)_0_3px,transparent_3px_6px)] shadow-[0_0_8px_rgba(245,184,61,.6)]" data-testid={i === 0 ? 'majority-line' : undefined} />
                </div>
                {!compact && (
                  <span className="flex items-baseline gap-2 font-mono text-xs text-mute tnum sm:justify-end">
                    <AnimatePresence>{gain > 0 && <motion.span key={`${round}-g`} initial={reduce ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded bg-iris/10 px-1 text-[10px] text-iris" data-testid="bar-gain">+{fmt(gain)}</motion.span>}</AnimatePresence>
                    <CountUp value={v} className="text-fg" /> <span>{pct(v, r.continuing)}</span>
                  </span>
                )}
              </motion.li>
            );
          })}
        </ul>
        <div className="mt-3 flex justify-between px-2 font-mono text-[11px] text-mute tnum"><span>Continuing <CountUp value={r.continuing} className="text-fg" /></span>{prev && <span className="hidden items-center gap-1.5 sm:flex"><span className="h-1.5 w-3 rounded-sm bg-iris/80" /> gained by transfer</span>}<span>Inactive <CountUp value={inactive} className="text-fg" /></span></div>
      </div>
    </LayoutGroup>
  );
}
