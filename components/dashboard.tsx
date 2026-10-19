'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { BadgeCheck, ChevronLeft, ChevronRight, Database, Download, Loader2, Upload, Vote } from 'lucide-react';
import type { IrvResult } from '../src/types';
import { CATALOG, colorFor, fmt, pct } from '../lib/catalog';
import { countBundled } from '../lib/engine';
import { Logo } from './logo';
import { RoundBars } from './round-bars';
import { Sankey } from './sankey';
import { Badge, Button, cn } from './ui';
type Source = { kind: 'bundled'; slug: string } | { kind: 'upload' };
type Stv = { method: 'stv'; quota: string; winners: string[]; rounds: { round: number; tallies: Record<string, string>; exhausted: string; elected: string[]; eliminated: string[] }[] };
const SAMPLE = '# count,first>second>third\n5,Alice>Bob>Cara\n4,Bob>Cara\n3,Cara>Bob\n2,Dev>Alice\n';
export function Dashboard() {
  const [src, setSrc] = useState<Source>({ kind: 'bundled', slug: CATALOG[0].slug });
  const [res, setRes] = useState<IrvResult | null>(null); const [stv, setStv] = useState<Stv | null>(null);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [round, setRound] = useState(0);
  const [text, setText] = useState(SAMPLE); const [seats, setSeats] = useState(1);
  const entry = src.kind === 'bundled' ? CATALOG.find(c => c.slug === src.slug)! : null;
  useEffect(() => {
    if (!entry) return; setBusy(true); setErr(''); setStv(null);
    countBundled(entry).then(r => { setRes(r); setRound(0); }, e => setErr(String(e.message ?? e))).finally(() => setBusy(false));
  }, [entry?.slug]);
  async function runUpload() {
    setBusy(true); setErr(''); setRes(null); setStv(null);
    try {
      const r = await fetch('/api/tabulate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ballots: text, ...(seats > 1 ? { seats } : {}) }) });
      const j = await r.json(); if (!r.ok) throw new Error(j.error ?? `HTTP ${r.status}`);
      if (j.method === 'stv') setStv(j); else { setRes(j); setRound(0); }
    } catch (e: any) { setErr(e.message ?? String(e)); } finally { setBusy(false); }
  }
  function download() {
    const blob = new Blob([JSON.stringify(stv ?? res, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${entry?.slug ?? 'tallyroom-result'}.json`; a.click(); URL.revokeObjectURL(a.href);
  }
  const r = res?.rounds[round];
  const matches = !!(entry && res && res.winner === entry.certifiedWinner);
  return (
    <div className="grid min-h-dvh md:grid-cols-[15rem_1fr]">
      <aside className="border-b border-line bg-panel/60 p-4 md:border-r md:border-b-0">
        <Link href="/" aria-label="Tallyroom home"><Logo /></Link>
        <p className="mt-6 mb-2 px-2 text-[11px] uppercase tracking-wider text-mute">Certified elections</p>
        <nav className="flex gap-1 overflow-x-auto md:flex-col">
          {CATALOG.map(c => (
            <button key={c.slug} data-testid={`election-${c.slug}`} onClick={() => setSrc({ kind: 'bundled', slug: c.slug })}
              className={cn('flex shrink-0 items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-white/5', src.kind === 'bundled' && src.slug === c.slug && 'bg-white/[.07] text-fg')}>
              <Database className="h-3.5 w-3.5 text-mute" /><span>{c.short} <span className="text-mute">{c.year}</span></span>
            </button>
          ))}
          <p className="mt-4 mb-2 hidden px-2 text-[11px] uppercase tracking-wider text-mute md:block">Your data</p>
          <button data-testid="source-upload" onClick={() => { setSrc({ kind: 'upload' }); setRes(null); setStv(null); setErr(''); }}
            className={cn('flex shrink-0 items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-white/5', src.kind === 'upload' && 'bg-white/[.07]')}>
            <Upload className="h-3.5 w-3.5 text-mute" /> Upload ballots
          </button>
        </nav>
      </aside>
      <main className="min-w-0 p-5 md:p-8">
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-0"><h1 className="text-xl font-semibold tracking-tight">{entry ? entry.title : 'Upload ballots'}</h1>
            <p className="mt-1 text-sm text-mute">{entry ? entry.source : 'Paste count,ranking lines or open a .csv / .txt file. Counting runs on the Tallyroom API.'}</p></div>
          <div className="ml-auto flex items-center gap-2">
            {matches && <Badge className="text-win" data-testid="parity-badge"><BadgeCheck className="h-3 w-3" /> Matches certified winner</Badge>}
            {(res || stv) && <Button variant="outline" size="sm" onClick={download}><Download className="h-3.5 w-3.5" /> JSON</Button>}
          </div>
        </div>
        {src.kind === 'upload' && (
          <div className="card mt-6 p-4">
            <textarea aria-label="Ballots" value={text} onChange={e => setText(e.target.value)} spellCheck={false} rows={7} className="w-full resize-y rounded-lg border border-line bg-ink p-3 font-mono text-sm outline-none focus:border-tally/60" />
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
              <label className="cursor-pointer text-mute hover:text-fg"><input type="file" accept=".csv,.txt,text/plain" className="sr-only" onChange={async e => { const f = e.target.files?.[0]; if (f) setText(await f.text()); }} /> <Upload className="mr-1 inline h-3.5 w-3.5" />Open file</label>
              <label className="flex items-center gap-2 text-mute">Seats <input type="number" min={1} max={50} value={seats} onChange={e => setSeats(Math.max(1, Number(e.target.value) || 1))} className="w-16 rounded-md border border-line bg-ink px-2 py-1 text-fg" /></label>
              <Button className="ml-auto" variant="tally" onClick={runUpload} disabled={busy} data-testid="run-count">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Vote className="h-4 w-4" />} Count</Button>
            </div>
          </div>
        )}
        {err && <p role="alert" className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{err}</p>}
        {busy && !res && src.kind === 'bundled' && <p className="mt-10 flex items-center gap-2 text-sm text-mute"><Loader2 className="h-4 w-4 animate-spin" /> Counting ballots in your browser…</p>}
        {res && r && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-6 space-y-6">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Kpi k="Ballots" v={fmt(res.totalBallots)} /><Kpi k="Rounds" v={String(res.rounds.length)} />
              <Kpi k="Winner" v={res.winner.replace(/^(DEM|REP) /, '')} accent /><Kpi k="Final share" v={pct(res.rounds.at(-1)!.tallies[res.winner], res.rounds.at(-1)!.continuing)} />
            </div>
            <div className="card p-5">
              <div className="mb-5 flex items-center gap-2">
                <h2 className="font-medium">Round {round + 1}</h2><span className="text-sm text-mute">of {res.rounds.length}</span>
                <div className="ml-auto flex gap-1">
                  <Button size="icon" variant="outline" aria-label="Previous round" disabled={round === 0} onClick={() => setRound(round - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                  <Button size="icon" variant="outline" aria-label="Next round" disabled={round === res.rounds.length - 1} onClick={() => setRound(round + 1)}><ChevronRight className="h-4 w-4" /></Button>
                </div>
              </div>
              <div className="mb-6 flex gap-1" role="tablist">{res.rounds.map((_, i) => <button key={i} role="tab" aria-selected={i === round} aria-label={`Round ${i + 1}`} onClick={() => setRound(i)} className={cn('h-1.5 flex-1 rounded-full transition-colors', i <= round ? 'bg-tally' : 'bg-white/10')} />)}</div>
              <RoundBars result={res} round={round} />
              {r.eliminated.length > 0 && <p className="mt-4 text-sm text-mute">Eliminated after this round: <span className="text-fg">{r.eliminated.join(', ')}</span>{r.tieNote && ` (tie broken by ${r.tieNote})`}</p>}
            </div>
            <div className="card p-5"><h2 className="mb-4 font-medium">Transfers to round {Math.min(round + 2, res.rounds.length)}</h2><Sankey result={res} round={round} /></div>
            <div className="card overflow-x-auto p-0">
              <table className="w-full text-sm tnum"><thead className="text-left text-xs text-mute"><tr className="border-b border-line"><th className="p-3 font-normal">Candidate</th>{res.rounds.map(x => <th key={x.round} className="p-3 text-right font-normal">R{x.round}</th>)}</tr></thead>
                <tbody>{res.candidates.map(c => <tr key={c} className="border-b border-line/60 last:border-0"><td className="p-3"><span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ background: colorFor(res.candidates, c) }} />{c}</td>{res.rounds.map(x => <td key={x.round} className="p-3 text-right">{x.tallies[c] !== undefined ? fmt(x.tallies[c]) : <span className="text-mute">—</span>}</td>)}</tr>)}
                  <tr className="text-mute"><td className="p-3">Inactive</td>{res.rounds.map(x => <td key={x.round} className="p-3 text-right">{fmt(Object.values(x.inactive).reduce((s, v) => s + v, 0))}</td>)}</tr></tbody></table>
            </div>
          </motion.div>
        )}
        {stv && (
          <div className="card mt-6 p-5"><h2 className="font-medium">STV result</h2><p className="mt-1 text-sm text-mute">Quota {stv.quota} · Elected: <span className="text-win">{stv.winners.join(', ')}</span></p>
            <ol className="mt-4 space-y-2 text-sm">{stv.rounds.map(x => <li key={x.round} className="rounded-lg border border-line p-3"><span className="text-mute">Round {x.round}</span> {x.elected.length > 0 && <>· elected {x.elected.join(', ')}</>} {x.eliminated.length > 0 && <>· eliminated {x.eliminated.join(', ')}</>}<div className="mt-1 font-mono text-xs text-mute">{Object.entries(x.tallies).map(([k, v]) => `${k}: ${v}`).join('   ')}</div></li>)}</ol></div>
        )}
      </main>
    </div>
  );
}
function Kpi({ k, v, accent }: { k: string; v: string; accent?: boolean }) {
  return <div className="card p-4"><div className="text-xs text-mute">{k}</div><div className={cn('mt-1 truncate text-lg font-medium tnum', accent && 'text-win')}>{v}</div></div>;
}
