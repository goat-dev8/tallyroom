'use client';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Pause, Play, RotateCcw, StepForward, ShieldCheck } from 'lucide-react';
import type { IrvResult } from '../src/types';
import { CATALOG, fmt } from '../lib/catalog';
import { countBundled } from '../lib/engine';
import { RoundBars } from './round-bars';
import { Button } from './ui';
const MAINE = CATALOG[0];
/** Live mini dashboard: the real engine counts Maine 2018 CD2 in the browser and replays the rounds. */
export function HeroDemo() {
  const [res, setRes] = useState<IrvResult | null>(null); const [err, setErr] = useState('');
  const [round, setRound] = useState(0); const [playing, setPlaying] = useState(true); const [ms, setMs] = useState(0);
  useEffect(() => { const t = performance.now(); countBundled(MAINE).then(r => { setMs(Math.round(performance.now() - t)); setRes(r); }, e => setErr(String(e.message ?? e))); }, []);
  useEffect(() => {
    if (!res || !playing) return;
    const id = setTimeout(() => setRound(r => (r + 1) % res.rounds.length), round === res.rounds.length - 1 ? 3800 : 2600);
    return () => clearTimeout(id);
  }, [res, playing, round]);
  const n = res?.rounds.length ?? 0; const r = res?.rounds[round];
  return (
    <div className="card relative overflow-hidden p-0 shadow-[0_30px_120px_-30px_rgba(124,140,255,.35)]" data-testid="hero-demo">
      <div className="flex items-center gap-2 border-b border-line px-4 py-2.5 text-xs text-mute">
        <span className="flex gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-white/10" /><i className="h-2.5 w-2.5 rounded-full bg-white/10" /><i className="h-2.5 w-2.5 rounded-full bg-white/10" /></span>
        <span className="ml-2 truncate">tallyroom / {MAINE.slug}</span>
        <span className="ml-auto hidden items-center gap-1 text-win sm:flex"><ShieldCheck className="h-3.5 w-3.5" /> matches certified result</span>
      </div>
      <div className="grid gap-5 p-5 md:grid-cols-[1fr_12rem]">
        <div className="min-h-[13.5rem]">
          <div className="mb-4 flex items-baseline justify-between">
            <h3 className="text-sm font-medium">{MAINE.title}</h3>
            <AnimatePresence mode="popLayout"><motion.span key={round} initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -8, opacity: 0 }} className="text-xs text-mute tnum">Round {round + 1} / {n || '–'}</motion.span></AnimatePresence>
          </div>
          {res ? <RoundBars result={res} round={round} compact /> : <div className="space-y-3" aria-busy>{err ? <p className="text-sm text-red-400">{err}</p> : [0, 1, 2, 3].map(i => <div key={i} className="h-9 animate-pulse rounded-md bg-white/5" />)}</div>}
        </div>
        <aside className="flex flex-col gap-3 border-line text-xs md:border-l md:pl-5">
          <Stat k="Ballots" v={res ? fmt(res.totalBallots) : '…'} />
          <Stat k="Eliminated" v={r?.eliminated.length ? r.eliminated.map(x => x.split(',')[0]).join(', ') : '—'} />
          <Stat k="Winner" v={res && round === n - 1 ? res.winner.replace(/^(DEM|REP) /, '') : '…'} accent={!!res && round === n - 1} />
          <Stat k="Counted in" v={res ? `${ms} ms, in your browser` : '…'} />
          <div className="mt-auto flex gap-1.5">
            <Button size="icon" variant="outline" aria-label={playing ? 'Pause' : 'Play'} onClick={() => setPlaying(p => !p)} disabled={!res}>{playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}</Button>
            <Button size="icon" variant="outline" aria-label="Step" onClick={() => { setPlaying(false); setRound(x => (x + 1) % (n || 1)); }} disabled={!res}><StepForward className="h-3.5 w-3.5" /></Button>
            <Button size="icon" variant="outline" aria-label="Restart" onClick={() => { setRound(0); setPlaying(true); }} disabled={!res}><RotateCcw className="h-3.5 w-3.5" /></Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
function Stat({ k, v, accent }: { k: string; v: string; accent?: boolean }) {
  return <div><div className="uppercase tracking-wider text-[10px] text-mute">{k}</div><div className={`mt-0.5 truncate text-sm tnum ${accent ? 'text-win' : 'text-fg'}`}>{v}</div></div>;
}
