'use client';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { AlertTriangle, BadgeCheck, ChevronLeft, ChevronRight, Database, Download, FileUp, Inbox, Link2, Loader2, Upload, Vote } from 'lucide-react';
import type { IrvResult } from '../src/types';
import { CATALOG, CERTIFIED, colorFor, fmt, pct, type CatalogEntry } from '../lib/catalog';
import { countBundled, unsubscribe, type Progress } from '../lib/engine';
import { Logo } from './logo';
import { RoundBars, shortName } from './round-bars';
import { RoundRail } from './round-rail';
import { Sankey } from './sankey';
import { Badge, Button, cn } from './ui';
type Source = { kind: 'bundled'; slug: string } | { kind: 'upload' };
type Stv = { method: 'stv'; quota: string; winners: string[]; rounds: { round: number; tallies: Record<string, string>; exhausted: string; elected: string[]; eliminated: string[] }[] };
const SAMPLE = '# count,first>second>third\n8,Alice>Bob\n6,Bob>Cara\n5,Cara>Bob\n2,Dev>Alice\n';
const STV_SAMPLE = '# 2 seats: set Seats to 2\n12,Alice>Bob>Cara\n6,Bob>Alice\n5,Cara>Dev\n4,Dev>Cara\n3,Bob>Cara\n';
const MAX_BYTES = 10 * 1024 * 1024;
const PHASE: Record<Progress['phase'], string> = { download: 'Downloading cast vote record', parse: 'Reading ballot patterns', count: 'Counting rounds', done: 'Done' };

function readUrl(): { src: Source; round: number | null; note: string } {
  const p = new URLSearchParams(window.location.search); const e = p.get('election'); const r = Number(p.get('round'));
  const round = Number.isInteger(r) && r > 0 ? r - 1 : null;
  if (e === 'upload') return { src: { kind: 'upload' }, round: null, note: '' };
  if (e && !CATALOG.some(c => c.slug === e)) return { src: { kind: 'bundled', slug: CATALOG[0].slug }, round: null, note: `No election called “${e}”. Showing ${CATALOG[0].short} ${CATALOG[0].year}.` };
  return { src: { kind: 'bundled', slug: e ?? CATALOG[0].slug }, round, note: '' };
}

export function Dashboard() {
  const reduce = useReducedMotion();
  const [ready, setReady] = useState(false);
  const [src, setSrc] = useState<Source>({ kind: 'bundled', slug: CATALOG[0].slug });
  const [res, setRes] = useState<IrvResult | null>(null); const [stv, setStv] = useState<Stv | null>(null);
  const [busy, setBusy] = useState(true); const [err, setErr] = useState(''); const [note, setNote] = useState('');
  const [round, setRound] = useState(0); const [progress, setProgress] = useState<Progress | null>(null);
  const [text, setText] = useState(SAMPLE); const [seats, setSeats] = useState(1); const [fileName, setFileName] = useState(''); const [drag, setDrag] = useState(false);
  const wantRound = useRef<number | null>(null);
  const entry: CatalogEntry | null = src.kind === 'bundled' ? CATALOG.find(c => c.slug === src.slug) ?? null : null;

  useEffect(() => { const u = readUrl(); setSrc(u.src); wantRound.current = u.round; setNote(u.note); if (u.src.kind === 'upload') setBusy(false); setReady(true); }, []);
  // Count a bundled election in the worker, with progress.
  useEffect(() => {
    if (!ready || !entry) return;
    let live = true; setBusy(true); setErr(''); setStv(null); setRes(null); setProgress(null);
    const on = (p: Progress) => live && setProgress(p);
    countBundled(entry, on).then(r => { if (!live) return; setRes(r); const w = wantRound.current; wantRound.current = null; setRound(w === null ? 0 : Math.min(w, r.rounds.length - 1)); },
      e => live && setErr(String(e.message ?? e))).finally(() => live && setBusy(false));
    return () => { live = false; unsubscribe(entry.slug, on); };
  }, [ready, entry?.slug]);
  // Keep the URL shareable.
  useEffect(() => {
    if (!ready) return; const p = new URLSearchParams();
    if (src.kind === 'upload') p.set('election', 'upload'); else { p.set('election', src.slug); if (res) p.set('round', String(round + 1)); }
    window.history.replaceState(null, '', `${window.location.pathname}?${p}`);
  }, [ready, src, round, res]);

  const pick = (s: Source) => { if (s.kind === src.kind && (s.kind === 'upload' || (src.kind === 'bundled' && src.slug === s.slug))) return; if (s.kind === 'upload') setBusy(false); setNote(''); setErr(''); setStv(null); setRes(null); setRound(0); setSrc(s); };
  async function runUpload() {
    setErr(''); setRes(null); setStv(null);
    if (!text.split(/\r?\n/).some(l => l.trim() && !l.trim().startsWith('#'))) { setErr('Add at least one ballot line, for example 5,Alice>Bob>Cara'); return; }
    setBusy(true);
    try {
      const r = await fetch('/api/tabulate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ballots: text, ...(seats > 1 ? { seats } : {}) }) });
      const j = await r.json().catch(() => ({ error: `The server answered HTTP ${r.status}` })); if (!r.ok) throw new Error(j.error ?? `HTTP ${r.status}`);
      if (j.method === 'stv') setStv(j); else { setRes(j); setRound(0); }
    } catch (e: any) { setErr(e.message ?? String(e)); } finally { setBusy(false); }
  }
  const loadFile = useCallback(async (f: File | undefined) => {
    if (!f) return; setErr('');
    if (f.size === 0) { setErr(`“${f.name}” is empty.`); return; }
    if (f.size > MAX_BYTES) { setErr(`“${f.name}” is ${(f.size / 1048576).toFixed(1)} MB. The limit is 10 MB.`); return; }
    if (!/\.(csv|txt|tsv)$/i.test(f.name) && !f.type.startsWith('text/')) { setErr(`“${f.name}” is not a text ballot file. Use .csv or .txt with count,ranking lines.`); return; }
    setText(await f.text()); setFileName(f.name);
  }, []);
  function download() {
    const blob = new Blob([JSON.stringify(stv ?? res, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${entry?.slug ?? 'tallyroom-result'}.json`; a.click(); URL.revokeObjectURL(a.href);
  }
  async function copyLink() { try { await navigator.clipboard.writeText(window.location.href); setNote('Link copied.'); } catch { setNote(window.location.href); } }
  const r = res?.rounds[round]; const n = res?.rounds.length ?? 0;
  const matches = !!(entry && res && res.winner === entry.certifiedWinner && n === CERTIFIED[entry.slug].rounds);
  const onKey = (e: React.KeyboardEvent) => { if (!res || (e.target as HTMLElement).matches('textarea,input')) return; if (e.key === 'ArrowRight' && round < n - 1) setRound(round + 1); if (e.key === 'ArrowLeft' && round > 0) setRound(round - 1); };

  return (
    <div className="grid min-h-dvh md:grid-cols-[15.5rem_1fr]" onKeyDown={onKey}>
      <aside className="border-b border-line bg-panel/60 p-4 md:sticky md:top-0 md:h-dvh md:border-r md:border-b-0">
        <div className="flex items-center justify-between"><Link href="/" aria-label="Tallyroom home" data-testid="dash-home"><Logo /></Link></div>
        <p className="mt-6 mb-2 hidden px-2 font-mono text-[10px] uppercase tracking-[.14em] text-mute md:block">Certified elections</p>
        <nav className="mt-4 grid grid-cols-2 gap-1 md:mt-0 md:flex md:flex-col" aria-label="Elections">
          {CATALOG.map(c => {
            const on = src.kind === 'bundled' && src.slug === c.slug;
            return (
              <button key={c.slug} data-testid={`election-${c.slug}`} aria-pressed={on} data-active={on} onClick={() => pick({ kind: 'bundled', slug: c.slug })}
                className={cn('flex min-w-0 items-center gap-2.5 rounded-lg border border-line px-2.5 py-2 text-left text-sm transition-colors hover:bg-white/5 md:border-transparent', on && 'border-tally/30 bg-white/[.07] text-fg')}>
                <Database className={cn('h-3.5 w-3.5', on ? 'text-tally' : 'text-mute')} /><span className="truncate">{c.short} <span className="text-mute">{c.year}</span></span>
              </button>
            );
          })}
          <p className="mt-5 mb-2 hidden px-2 font-mono text-[10px] uppercase tracking-[.14em] text-mute md:block">Your data</p>
          <button data-testid="source-upload" aria-pressed={src.kind === 'upload'} data-active={src.kind === 'upload'} onClick={() => pick({ kind: 'upload' })}
            className={cn('flex min-w-0 items-center gap-2.5 rounded-lg border border-line px-2.5 py-2 text-left text-sm transition-colors hover:bg-white/5 md:border-transparent', src.kind === 'upload' && 'border-tally/30 bg-white/[.07]')}>
            <Upload className={cn('h-3.5 w-3.5', src.kind === 'upload' ? 'text-tally' : 'text-mute')} /> <span className="whitespace-nowrap">Upload ballots</span>
          </button>
        </nav>
        <p className="mt-8 hidden px-2 text-[11px] leading-relaxed text-mute md:block">Counting runs in your browser on the same verified files the parity tests use. Use ← → to step rounds.</p>
      </aside>

      <main className="min-w-0 p-5 md:p-8" data-testid="dashboard">
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold tracking-tight" data-testid="dash-title">{entry ? entry.title : 'Count your own ballots'}</h1>
            <p className="mt-1 text-sm text-mute">{entry ? entry.source : 'Paste count,ranking lines or drop a .csv / .txt file. Seats above 1 runs multi-seat STV.'}</p>
          </div>
          <div className="flex min-h-8 w-full items-center gap-2 sm:w-auto">
            {matches && <Badge className="border-win/30 text-win" data-testid="parity-badge"><BadgeCheck className="h-3 w-3" /> Matches certified result</Badge>}
            {res && entry && <Button variant="outline" size="sm" onClick={copyLink} data-testid="copy-link" aria-label="Copy link to this round"><Link2 className="h-3.5 w-3.5" /></Button>}
            {(res || stv) && <Button variant="outline" size="sm" onClick={download} data-testid="download-json"><Download className="h-3.5 w-3.5" /> JSON</Button>}
          </div>
        </div>
        {note && <p className="mt-4 rounded-lg border border-line bg-white/[.03] px-3 py-2 text-sm text-mute" data-testid="dash-note" role="status">{note}</p>}

        {src.kind === 'upload' && (
          <div className={cn('card mt-6 p-4 transition-colors', drag && 'border-tally/60 bg-tally/[.04]')} data-testid="upload-panel"
            onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={e => { e.preventDefault(); setDrag(false); loadFile(e.dataTransfer.files[0]); }}>
            <textarea aria-label="Ballots" data-testid="ballots-input" value={text} onChange={e => { setText(e.target.value); setFileName(''); }} spellCheck={false} rows={8}
              className="w-full resize-y rounded-lg border border-line bg-ink p-3 font-mono text-sm outline-none focus:border-tally/60" />
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-mute hover:text-fg focus-within:outline-2 focus-within:outline-tally">
                <input type="file" accept=".csv,.txt,.tsv,text/plain,text/csv" className="sr-only" data-testid="file-input" onChange={e => { loadFile(e.target.files?.[0]); e.target.value = ''; }} /><FileUp className="h-3.5 w-3.5" /> {fileName || 'Open file'}
              </label>
              <span className="hidden text-xs text-mute sm:inline">or drop it here</span>
              <button type="button" className="text-xs text-mute underline-offset-2 hover:text-fg hover:underline" data-testid="sample-irv" onClick={() => { setText(SAMPLE); setSeats(1); setFileName(''); }}>IRV sample</button>
              <button type="button" className="text-xs text-mute underline-offset-2 hover:text-fg hover:underline" data-testid="sample-stv" onClick={() => { setText(STV_SAMPLE); setSeats(2); setFileName(''); }}>STV sample</button>
              <a href="/samples/ballots.csv" download className="text-xs text-mute underline-offset-2 hover:text-fg hover:underline" data-testid="sample-download">Sample CSV</a>
              <label className="ml-auto flex items-center gap-2 text-mute">Seats <input type="number" min={1} max={50} value={seats} data-testid="seats-input" onChange={e => setSeats(Math.min(50, Math.max(1, Number(e.target.value) || 1)))} className="w-16 rounded-md border border-line bg-ink px-2 py-1 text-fg" /></label>
              <Button variant="tally" onClick={runUpload} disabled={busy} data-testid="run-count">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Vote className="h-4 w-4" />} Count</Button>
            </div>
          </div>
        )}

        {err && (
          <motion.div initial={reduce ? false : { x: -6 }} animate={{ x: [6, -4, 0] }} transition={{ duration: 0.35 }} role="alert" data-testid="error-state"
            className="mt-6 flex gap-3 rounded-xl border border-red-500/30 bg-red-500/[.08] p-4 text-sm text-red-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" /><div><p className="font-medium text-red-100">{src.kind === 'upload' ? 'These ballots could not be counted' : 'This election could not be loaded'}</p><p className="mt-1 text-red-200/90" data-testid="error-message">{err}</p></div>
          </motion.div>
        )}

        {busy && !res && !err && src.kind === 'bundled' && <LoadingState progress={progress} />}
        {src.kind === 'upload' && !res && !stv && !busy && !err && (
          <div className="mt-6 grid place-items-center rounded-xl border border-dashed border-line px-6 py-14 text-center" data-testid="empty-state">
            <Inbox className="h-6 w-6 text-mute" /><p className="mt-3 font-medium">No count yet</p><p className="mt-1 max-w-sm text-sm text-mute" data-testid="format-help">Edit the sample above or open your own file, then press Count. Each line is a ballot count and a ranking, like <code className="font-mono text-fg">5,Alice&gt;Bob</code>.</p>
          </div>
        )}

        {res && r && (
          <motion.div initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }} className="mt-6 space-y-5" data-testid="result">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Kpi k="Ballots" v={fmt(res.totalBallots)} testid="kpi-ballots" /><Kpi k="Rounds" v={String(n)} testid="kpi-rounds" />
              <Kpi k="Winner" v={shortName(res.winner)} accent testid="kpi-winner" /><Kpi k="Final share of continuing" v={pct(res.rounds.at(-1)!.tallies[res.winner], res.rounds.at(-1)!.continuing)} testid="kpi-share" />
            </div>
            <section className="card p-5" aria-label="Round results">
              <div className="mb-4 flex items-center gap-2">
                <h2 className="font-medium" data-testid="round-title">Round {round + 1}</h2><span className="text-sm text-mute">of {n}</span>
                <div className="ml-auto flex gap-1">
                  <Button size="icon" variant="outline" aria-label="Previous round" data-testid="round-prev" disabled={round === 0} onClick={() => setRound(round - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                  <Button size="icon" variant="outline" aria-label="Next round" data-testid="round-next" disabled={round === n - 1} onClick={() => setRound(round + 1)}><ChevronRight className="h-4 w-4" /></Button>
                </div>
              </div>
              <div className="mb-8"><RoundRail rounds={n} round={round} onPick={setRound} testid="dash-rail" /></div>
              <RoundBars result={res} round={round} />
              {r.eliminated.length > 0 && <p className="mt-4 text-sm text-mute" data-testid="eliminated">Eliminated after round {round + 1}: <span className="text-fg">{r.eliminated.map(shortName).join(', ')}</span>{r.tieNote && ` (tie broken by ${r.tieNote})`}</p>}
            </section>
            <section className="card p-5" aria-label="Transfers"><h2 className="mb-1 font-medium" data-testid="sankey-title">{n > 1 ? `Transfers from round ${Math.min(round, n - 2) + 1} into round ${Math.min(round, n - 2) + 2}` : 'Transfers'}</h2><p className="mb-4 text-xs text-mute">Hover or focus a flow for the exact ballot count.</p><Sankey result={res} round={n > 1 ? Math.min(round, n - 2) : 0} /></section>
            <section className="card overflow-x-auto p-0" aria-label="All rounds">
              <table className="w-full text-sm tnum" data-testid="rounds-table"><thead className="text-left font-mono text-[11px] text-mute"><tr className="border-b border-line"><th className="p-3 font-normal">Candidate</th>{res.rounds.map(x => <th key={x.round} className={cn('p-3 text-right font-normal', x.round === round + 1 && 'text-tally')}>R{x.round}</th>)}</tr></thead>
                <tbody>{res.candidates.map(c => <tr key={c} className="border-b border-line/60 last:border-0" data-testid="table-row" data-candidate={c}><td className="p-3 whitespace-nowrap"><span className="mr-2 inline-block h-2 w-2 rounded-[2px]" style={{ background: colorFor(res.candidates, c) }} />{c}</td>{res.rounds.map(x => <td key={x.round} className={cn('p-3 text-right', x.round === round + 1 && 'bg-white/[.02]')}>{x.tallies[c] !== undefined ? fmt(x.tallies[c]) : <span className="text-mute" title="Eliminated" data-testid="cell-out">—</span>}</td>)}</tr>)}
                  <tr className="text-mute" data-testid="table-inactive"><td className="p-3">Inactive</td>{res.rounds.map(x => <td key={x.round} className="p-3 text-right">{fmt(Object.values(x.inactive).reduce((s, v) => s + v, 0))}</td>)}</tr></tbody></table>
            </section>
          </motion.div>
        )}

        {stv && (
          <motion.section initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-6 space-y-5" data-testid="stv-result">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><Kpi k="Method" v="STV (Gregory)" testid="stv-method" /><Kpi k="Seats" v={String(stv.winners.length)} testid="stv-seats" /><Kpi k="Quota" v={stv.quota} testid="stv-quota" /><Kpi k="Rounds" v={String(stv.rounds.length)} testid="stv-rounds" /></div>
            <div className="card p-5"><h2 className="font-medium">Elected</h2><div className="mt-3 flex flex-wrap gap-2" data-testid="stv-winners">{stv.winners.map((w, i) => <Badge key={w} className="border-win/30 py-1 text-sm text-win"><span className="font-mono text-[11px] text-mute">{i + 1}</span> {w}</Badge>)}</div></div>
            <div className="card overflow-x-auto p-0"><table className="w-full text-sm tnum"><thead className="text-left font-mono text-[11px] text-mute"><tr className="border-b border-line"><th className="p-3 font-normal">Round</th><th className="p-3 font-normal">Tallies (exact)</th><th className="p-3 font-normal">Exhausted</th><th className="p-3 font-normal">Outcome</th></tr></thead>
              <tbody>{stv.rounds.map(x => <tr key={x.round} className="border-b border-line/60 last:border-0 align-top" data-testid="stv-round" data-round={x.round}><td className="p-3 font-mono">R{x.round}</td><td className="p-3 font-mono text-xs">{Object.entries(x.tallies).map(([k, v]) => <div key={k}>{k}: {v}</div>)}</td><td className="p-3 font-mono text-xs">{x.exhausted}</td>
                <td className="p-3 text-xs">{x.elected.length > 0 && <div className="text-win">Elected {x.elected.join(', ')}</div>}{x.eliminated.length > 0 && <div className="text-mute">Eliminated {x.eliminated.join(', ')}</div>}</td></tr>)}</tbody></table></div>
          </motion.section>
        )}
      </main>
    </div>
  );
}
function LoadingState({ progress }: { progress: Progress | null }) {
  const p = progress; const frac = !p ? 0 : p.phase === 'download' ? 0.7 * (p.total ? p.loaded / p.total : 0) : p.phase === 'parse' ? 0.78 : p.phase === 'count' ? 0.9 : 1;
  return (
    <div className="mt-6 space-y-5" aria-busy data-testid="loading-state">
      <div className="card p-4">
        <div className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin text-tally" /><span data-testid="progress-phase">{p ? PHASE[p.phase] : 'Preparing'}</span>
          <span className="ml-auto font-mono text-xs text-mute tnum">{p?.phase === 'download' ? `${(p.loaded / 1048576).toFixed(1)} / ${(p.total / 1048576).toFixed(1)} MB` : ''}</span></div>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/[.06]" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(frac * 100)} data-testid="progress-bar">
          <div className="h-full origin-left rounded-full bg-tally transition-transform duration-300" style={{ transform: `scaleX(${frac})` }} />
        </div>
        <p className="mt-2 text-xs text-mute">Counting runs in a background worker, so the page stays responsive.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map(i => <div key={i} className="card space-y-2 p-4"><div className="skeleton h-3 w-16 rounded" /><div className="skeleton h-5 w-24 rounded" /></div>)}</div>
      <div className="card space-y-4 p-5">{[0, 1, 2, 3].map(i => <div key={i} className="grid gap-3 sm:grid-cols-[12rem_1fr]"><div className="skeleton h-4 rounded" /><div className="skeleton h-6 rounded-md" style={{ width: `${80 - i * 15}%` }} /></div>)}</div>
    </div>
  );
}
function Kpi({ k, v, accent, testid }: { k: string; v: string; accent?: boolean; testid?: string }) {
  return <div className="card p-4"><div className="font-mono text-[10px] uppercase tracking-[.12em] text-mute">{k}</div><div className={cn('mt-1.5 truncate text-lg font-medium tnum', accent && 'text-win')} data-testid={testid}>{v}</div></div>;
}
