'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Pause, Play, RotateCcw, StepBack, StepForward, ShieldCheck } from 'lucide-react';
import type { IrvResult } from '../src/types';
import { CATALOG, fmt } from '../lib/catalog';
import { countBundled } from '../lib/engine';
import { setDemoRound } from '../lib/demo-bus';
import { RoundBars, shortName } from './round-bars';
import { RoundRail } from './round-rail';
import { Button } from './ui';
const MAINE = CATALOG[0];
const HOLD = 2800;
/** Live mini dashboard: the real engine counts Maine 2018 CD2 in a Web Worker and replays the rounds. */
export function HeroDemo() {
  const reduce = useReducedMotion();
  const [res, setRes] = useState<IrvResult | null>(null); const [err, setErr] = useState('');
  const [round, setRound] = useState(0); const [playing, setPlaying] = useState(false); const [ms, setMs] = useState(0);
  const [visible, setVisible] = useState(true); const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const t = performance.now();
    countBundled(MAINE).then(r => { setMs(Math.round(performance.now() - t)); setRes(r); setPlaying(!matchMedia('(prefers-reduced-motion: reduce)').matches); }, e => setErr(String(e.message ?? e)));
  }, []);
  useEffect(() => { const el = box.current; if (!el) return; const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.15 }); io.observe(el); return () => io.disconnect(); }, []);
  const n = res?.rounds.length ?? 0;
  useEffect(() => { if (n) setDemoRound(round, n); }, [round, n]);
  useEffect(() => {
    // The replay plays once and then holds on the certified final round (it used to loop back to round 1,
    // so a visitor or a slow test could keep landing on round 1). Restart (R) replays it.
    if (!res || !playing || !visible || round >= n - 1) return;
    const id = setTimeout(() => setRound(r => Math.min(r + 1, n - 1)), HOLD);
    return () => clearTimeout(id);
  }, [res, playing, visible, round, n]);
  const step = useCallback((d: number) => { setPlaying(false); setRound(x => (x + d + n) % n); }, [n]);
  const restart = useCallback(() => { setRound(0); setPlaying(true); }, []);
  const onKey = (e: React.KeyboardEvent) => {
    if (!res) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); step(1); } else if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    else if (e.key === ' ' && (e.target as HTMLElement).tagName !== 'BUTTON') { e.preventDefault(); setPlaying(p => !p); }
    else if (e.key.toLowerCase() === 'r') restart();
  };
  const r = res?.rounds[round]; const final = !!res && round === n - 1;
  return (
    <div ref={box} onKeyDown={onKey} tabIndex={-1} className="demo-frame relative overflow-hidden rounded-2xl p-0 outline-none" data-testid="hero-demo" data-state={playing ? 'playing' : 'paused'} data-round={round + 1}
      aria-label="Live demo: Maine 2018 District 2 counted in your browser. Arrow keys step rounds, space plays or pauses, R restarts.">
      <div className="flex items-center gap-3 border-b border-line px-4 py-2.5 font-mono text-[11px] text-mute">
        <span className="flex gap-1.5" aria-hidden><i className="h-2.5 w-2.5 rounded-full bg-white/10" /><i className="h-2.5 w-2.5 rounded-full bg-white/10" /><i className="h-2.5 w-2.5 rounded-full bg-white/10" /></span>
        <span className="truncate">tallyroom.app / count / {MAINE.slug}</span>
        <span className="ml-auto hidden items-center gap-1.5 sm:flex"><span className={`h-1.5 w-1.5 rounded-full ${playing ? 'animate-pulse bg-win' : 'bg-mute'}`} />{playing ? 'live replay' : 'paused'}</span>
      </div>
      <div className="grid md:grid-cols-[1fr_15rem]">
        <div className="min-w-0 p-5 pt-4">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <p className="truncate text-sm font-medium">{MAINE.title}</p>
            <span className="relative shrink-0 overflow-hidden" data-testid="demo-round" aria-live="polite"><span className="sr-only">Round {round + 1} of {n || 2}</span><AnimatePresence mode="popLayout" initial={false}><motion.span aria-hidden key={round} initial={reduce ? false : { y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -8, opacity: 0 }} className="block font-mono text-[11px] text-mute tnum">Round {round + 1} / {n || '–'}</motion.span></AnimatePresence></span>
          </div>
          <div className="mb-6"><RoundRail rounds={n || 2} round={round} onPick={i => { setPlaying(false); setRound(i); }} testid="demo-rail" /></div>
          <div className="min-h-[15.5rem]">
            {res ? <RoundBars result={res} round={round} compact />
              : <div className="space-y-4" aria-busy data-testid="demo-loading">{err ? <p role="alert" className="text-sm text-red-300">{err}</p> : [0, 1, 2, 3].map(i => <div key={i} className="space-y-1.5"><div className="skeleton h-3 w-40 rounded" /><div className="skeleton h-6 rounded-md" /></div>)}</div>}
          </div>
        </div>
        <aside className="flex flex-col gap-4 border-t border-line bg-white/[.012] p-5 md:border-t-0 md:border-l">
          <Stat k="Ballots cast" v={res ? fmt(res.totalBallots) : '…'} />
          <Stat k="Majority needed" v={r ? fmt(r.threshold) : '…'} />
          <Stat k={final ? 'Winner' : 'Eliminated this round'} v={!r ? '…' : final ? shortName(res!.winner) : r.eliminated.map(x => shortName(x).split(',')[0]).join(', ') || '—'} accent={final} testid="demo-outcome" />
          <Stat k="Counted" v={res ? `in ${ms} ms, in your browser` : 'counting…'} />
          {final && <p className="flex items-center gap-1.5 text-[11px] text-win" data-testid="demo-certified"><ShieldCheck className="h-3.5 w-3.5" /> Matches the certified result</p>}
          <div className="mt-auto flex gap-1.5 pt-1">
            <Button size="icon" variant="outline" aria-label="Previous round" data-testid="demo-back" onClick={() => step(-1)} disabled={!res}><StepBack className="h-3.5 w-3.5" /></Button>
            <Button size="icon" variant="outline" aria-label={playing ? 'Pause' : 'Play'} aria-pressed={playing} data-testid="demo-play" onClick={() => setPlaying(p => !p)} disabled={!res}>{playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}</Button>
            <Button size="icon" variant="outline" aria-label="Next round" data-testid="demo-step" onClick={() => step(1)} disabled={!res}><StepForward className="h-3.5 w-3.5" /></Button>
            <Button size="icon" variant="outline" aria-label="Restart" data-testid="demo-restart" onClick={restart} disabled={!res}><RotateCcw className="h-3.5 w-3.5" /></Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
function Stat({ k, v, accent, testid }: { k: string; v: string; accent?: boolean; testid?: string }) {
  return <div><div className="font-mono text-[10px] uppercase tracking-[.14em] text-mute">{k}</div><div className={`mt-1 truncate text-sm tnum ${accent ? 'text-win' : 'text-fg'}`} data-testid={testid}>{v}</div></div>;
}
