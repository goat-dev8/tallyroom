'use client';
import { useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { sankey, sankeyLinkHorizontal, sankeyJustify } from 'd3-sankey';
import type { IrvResult } from '../src/types';
import { colorFor, fmt } from '../lib/catalog';
type N = { id: string; label: string; color: string }; type L = { source: string; target: string; value: number; color: string };
// BUG-032: reserved nodes use a "r:" prefix. Candidate nodes are "a:"/"b:" + name, so no name can produce a reserved
// id (a candidate called "inactive" or "out" used to share an id with the pile and d3-sankey kept only one of them).
const OUT = 'r:out', IN_A = 'r:a-inactive', IN_B = 'r:b-inactive';
/** Exact vote flow from round i to round i+1. Batch eliminations are grouped into one source so every flow is a certified number. */
export function buildFlow(res: IrvResult, i: number) {
  const a = res.rounds[i], b = res.rounds[i + 1]; if (!b) return null;
  const nodes: N[] = []; const links: L[] = [];
  const inA = Object.values(a.inactive).reduce((s, x) => s + x, 0);
  const inB = Object.values(b.inactive).reduce((s, x) => s + x, 0);
  const out = a.eliminated; const outLabel = out.length === 1 ? out[0] : `${out.length} eliminated`;
  for (const [c, v] of Object.entries(a.tallies)) if (!out.includes(c) && v > 0) nodes.push({ id: 'a:' + c, label: c, color: colorFor(res.candidates, c) });
  if (out.length) nodes.push({ id: OUT, label: outLabel, color: out.length === 1 ? colorFor(res.candidates, out[0]) : '#64748b' });
  if (inA) nodes.push({ id: IN_A, label: 'Inactive', color: '#3b3f47' });
  for (const c of Object.keys(b.tallies)) nodes.push({ id: 'b:' + c, label: c, color: colorFor(res.candidates, c) });
  nodes.push({ id: IN_B, label: 'Inactive', color: '#3b3f47' });
  let moved = 0;
  for (const [c, v] of Object.entries(b.tallies)) {
    const before = a.tallies[c] ?? 0; const gain = v - before; moved += gain;
    if (before) links.push({ source: 'a:' + c, target: 'b:' + c, value: before, color: colorFor(res.candidates, c) });
    if (gain > 0 && out.length) links.push({ source: OUT, target: 'b:' + c, value: gain, color: colorFor(res.candidates, c) });
  }
  const outTotal = out.reduce((s, c) => s + (a.tallies[c] ?? 0), 0);
  if (outTotal - moved > 0) links.push({ source: OUT, target: IN_B, value: outTotal - moved, color: '#64748b' });
  if (inA) links.push({ source: IN_A, target: IN_B, value: inA, color: '#3b3f47' });
  return { nodes: nodes.filter(n => links.some(l => l.source === n.id || l.target === n.id)), links, check: inB };
}
const rank = (n: any) => (n.id === IN_A || n.id === IN_B ? 2 : n.id === OUT ? 1 : 0);
const LABEL_GAP = 15; // viewBox px between label baselines; an 11px label with descenders is ~14px tall
/** Spread label centres in one column so none overlap, keeping each as close to its node as possible. */
export function spreadLabels(ys: number[], top: number, bottom: number, gap = LABEL_GAP): number[] {
  const order = ys.map((y, i) => ({ y, i })).sort((a, b) => a.y - b.y); const out: number[] = Array.from({ length: ys.length }, () => 0);
  let prev = -Infinity;
  for (const o of order) { const y = Math.max(o.y, prev + gap, top); out[o.i] = y; prev = y; }
  let next = Infinity; // pull back up from the bottom edge
  for (const o of order.slice().reverse()) { const y = Math.min(out[o.i], next - gap, bottom); out[o.i] = y; next = y; }
  return out;
}
type Tip = { x: number; y: number; from: string; to?: string; value: number; share: string };
export function Sankey({ result, round }: { result: IrvResult; round: number }) {
  const W = 760;
  const reduce = useReducedMotion();
  const [tip, setTip] = useState<Tip | null>(null);
  const [hot, setHotState] = useState<number | null>(null); const hotRef = useRef<number | null>(null);
  const setHot = (v: number | null) => { hotRef.current = v; setHotState(v); };
  const [cur, setCur] = useState(0); // roving tab stop: one flow is tabbable, arrows move between flows
  const [ring, setRing] = useState<number | null>(null); // keyboard focus ring
  const box = useRef<HTMLDivElement>(null);
  const hits = useRef<(SVGPathElement | null)[]>([]);
  const flow = useMemo(() => buildFlow(result, round), [result, round]);
  const cols = flow ? Math.max(flow.nodes.filter(n => n.id.startsWith('b:') || n.id === IN_B).length, flow.nodes.filter(n => n.id.startsWith('a:') || n.id === OUT || n.id === IN_A).length, 3) : 0;
  const H = flow ? Math.min(640, Math.max(190, LABEL_GAP * 2 * cols + 40)) : 0;
  const g = useMemo(() => {
    if (!flow || !flow.links.some(l => l.value > 0)) return null;
    const s = sankey<N, L>().nodeId(d => d.id).nodeAlign(sankeyJustify).nodeWidth(8).nodePadding(Math.max(12, LABEL_GAP)).extent([[1, 6], [W - 1, H - 6]])
      .nodeSort(((x: any, y: any) => rank(x) - rank(y) || (y.value ?? 0) - (x.value ?? 0)) as never);
    return s({ nodes: flow.nodes.map(d => ({ ...d })), links: flow.links.map(d => ({ ...d })) } as never);
  }, [flow, H]);
  const labelY = useMemo(() => {
    const m = new Map<string, number>(); if (!g) return m;
    for (const left of [true, false]) {
      const ns = g.nodes.filter((n: any) => (n.x0 < W / 2) === left);
      spreadLabels(ns.map((n: any) => (n.y0 + n.y1) / 2), 10, H - 8).forEach((y, i) => m.set((ns[i] as any).id, y));
    }
    return m;
  }, [g, H]);
  if (!g) {
    // BUG-040: only claim a majority when the winner holds one (a sole remaining candidate can win with 0 votes).
    const last = result.rounds[result.rounds.length - 1]; const held = last?.tallies[result.winner] ?? 0;
    const why = held * 2 > (last?.continuing ?? 0) ? 'the winner holds a majority of continuing ballots.'
      : `${result.winner} is the last continuing candidate, with ${fmt(held)} ${held === 1 ? 'vote' : 'votes'} of ${fmt(last?.continuing ?? 0)} continuing.`;
    return <div className="grid place-items-center rounded-xl border border-dashed border-line py-12 text-center" data-testid="sankey-final"><p className="max-w-sm text-sm text-mute">Final round. No further transfers: {why}</p></div>;
  }
  const path = sankeyLinkHorizontal();
  const clean = (x: string) => x.replace(/^(REP|DEM) /, '');
  const data = (l: any) => ({ from: clean(l.source.label), to: clean(l.target.label), value: l.value as number, share: l.source.value ? (100 * l.value / l.source.value).toFixed(1) + '%' : '' });
  const at = (cx: number, cy: number) => { const b = box.current!.getBoundingClientRect(); return { x: cx - b.left + box.current!.scrollLeft, y: cy - b.top }; };
  const screen = (el: SVGPathElement, t: number) => { const q = el.getPointAtLength(el.getTotalLength() * t); const m = el.getScreenCTM()!; return { x: m.a * q.x + m.c * q.y + m.e, y: m.b * q.x + m.d * q.y + m.f }; };
  // Pointer: update on enter and move, and only clear when leaving the flow that is shown, so one move is enough.
  const onPtr = (l: any, i: number, e: React.PointerEvent) => { setHot(i); setTip({ ...at(e.clientX, e.clientY), ...data(l) }); };
  const offLink = (i: number) => { if (hotRef.current === i && ring === null) { setHot(null); setTip(null); } };
  const onNode = (n: any, e: React.PointerEvent) => { setHot(null); setTip({ ...at(e.clientX, e.clientY), from: clean(n.label), value: n.value, share: n.x0 < W / 2 ? `round ${round + 1}` : `round ${round + 2}` }); };
  // Keyboard: anchor near the destination end, where the flow meets the candidate it feeds; scroll both ends into view.
  const onFocus = (l: any, i: number, el: SVGPathElement) => {
    setCur(i); setHot(i); setRing(i);
    const a = screen(el, 0.15), b = screen(el, 0.85), top = Math.min(a.y, b.y), bot = Math.max(a.y, b.y), pad = 48;
    if (top < pad || bot > window.innerHeight - pad) window.scrollBy({ top: (top + bot) / 2 - window.innerHeight / 2, behavior: reduce ? 'auto' : 'instant' as ScrollBehavior });
    const sc = box.current!; const r = sc.getBoundingClientRect(); const e = screen(el, 0.92);
    if (e.x > r.right - 24 || e.x < r.left + 24) sc.scrollLeft += e.x - (r.left + r.width / 2);
    const p = screen(el, 0.92); setTip({ ...at(p.x, p.y), ...data(l) });
  };
  const off = () => { setHot(null); setTip(null); setRing(null); };
  const move = (i: number, e: React.KeyboardEvent) => {
    const n = g.links.length; let j: number | null = null;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') j = (i + 1) % n; else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') j = (i - 1 + n) % n;
    else if (e.key === 'Home') j = 0; else if (e.key === 'End') j = n - 1; else if (e.key === 'Escape') { off(); return; }
    if (j === null) return; e.preventDefault(); e.stopPropagation(); hits.current[j]?.focus();
  };
  const uid = `sk${round}`;
  // Thick flows first, so thin flows' hit paths sit on top and stay hoverable.
  const hitOrder = g.links.map((_: any, i: number) => i).sort((a: number, b: number) => (g.links[b] as any).width - (g.links[a] as any).width);
  return (
    <div ref={box} className="relative -mx-5 overflow-x-auto px-5 sm:mx-0 sm:overflow-visible sm:px-0" onPointerLeave={off} data-testid="sankey-scroll">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full min-w-[620px] sm:min-w-0" role="group" aria-label={`Vote transfers from round ${round + 1} to round ${round + 2}`} data-testid="sankey" data-height={H}>
        <defs>{g.links.map((l: any, i: number) => (
          <linearGradient key={i} id={`${uid}-${i}`} gradientUnits="userSpaceOnUse" x1={l.source.x1} x2={l.target.x0}>
            <stop offset="0%" stopColor={l.source.color} /><stop offset="100%" stopColor={l.target.color} />
          </linearGradient>))}</defs>
        <g fill="none" className="pointer-events-none">{g.links.map((l: any, i: number) => {
          const dim = hot !== null && hot !== i;
          return <motion.path key={`${round}-${i}`} d={path(l) ?? ''} stroke={`url(#${uid}-${i})`} strokeWidth={Math.max(1.5, l.width)} data-testid="sankey-flow"
            className="[mix-blend-mode:screen]" style={{ transition: 'stroke-opacity 180ms cubic-bezier(.22,1,.36,1)' }}
            strokeOpacity={hot === i ? 0.85 : dim ? 0.07 : 0.34}
            initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }} />;
        })}</g>
        {ring !== null && g.links[ring] && (() => { const l: any = g.links[ring]; const d = path(l) ?? ''; return <g fill="none" className="pointer-events-none">
          <path d={d} data-testid="sankey-focus" stroke="var(--color-tally)" strokeWidth={Math.max(1.5, l.width) + 5} strokeOpacity={0.9} />
          <path d={d} stroke={`url(#${uid}-${ring})`} strokeWidth={Math.max(1.5, l.width)} strokeOpacity={0.95} /></g>; })()}
        {g.nodes.map((n: any) => {
          const left = n.x0 < W / 2; const lit = hot === null || g.links[hot] && ((g.links[hot] as any).source === n || (g.links[hot] as any).target === n);
          const ly = labelY.get(n.id) ?? (n.y0 + n.y1) / 2; const cy = (n.y0 + n.y1) / 2;
          return <g key={n.id} style={{ opacity: lit ? 1 : 0.35, transition: 'opacity 180ms' }} data-testid="sankey-node" data-node={n.id}>
            <rect x={n.x0 - 3} y={n.y0 - 3} width={n.x1 - n.x0 + 6} height={Math.max(2, n.y1 - n.y0) + 6} fill="transparent" onPointerEnter={e => onNode(n, e)} onPointerMove={e => onNode(n, e)} onPointerLeave={() => setTip(null)} data-testid="sankey-node-hit" />
            <rect x={n.x0} y={n.y0} width={n.x1 - n.x0} height={Math.max(2, n.y1 - n.y0)} rx={3} fill={n.color} className="pointer-events-none" style={{ filter: `drop-shadow(0 0 6px ${n.color}88)` }} />
            {Math.abs(ly - cy) > 2 && <path d={`M${left ? n.x1 + 1 : n.x0 - 1},${cy} L${left ? n.x1 + 5 : n.x0 - 5},${ly}`} stroke={n.color} strokeOpacity={0.6} fill="none" className="pointer-events-none" />}
            <text x={left ? n.x1 + 8 : n.x0 - 8} y={ly} dy="0.35em" textAnchor={left ? 'start' : 'end'} className="pointer-events-none fill-[#e3e5e9] text-[11px] font-medium" style={{ paintOrder: 'stroke', stroke: '#0b0d10', strokeWidth: 4, strokeLinejoin: 'round' }}>{clean(n.label)}<tspan className="fill-[#8a8f98] font-mono text-[10px]" dx="6">{fmt(n.value)}</tspan></text></g>;
        })}
        <g fill="none">{hitOrder.map((i: number) => {
          const l: any = g.links[i]; const d = data(l);
          return <path key={`hit-${round}-${i}`} ref={el => { hits.current[i] = el; }} d={path(l) ?? ''} stroke="transparent" strokeWidth={Math.max(12, l.width)} pointerEvents="stroke"
            tabIndex={i === cur ? 0 : -1} role="button" data-testid="sankey-link" data-index={i} aria-label={`${d.from} to ${d.to}: ${fmt(l.value)} ballots`}
            className="sankey-link cursor-pointer outline-none focus:outline-none focus-visible:outline-none"
            onPointerEnter={e => onPtr(l, i, e)} onPointerMove={e => onPtr(l, i, e)} onPointerLeave={() => offLink(i)}
            onClick={e => onFocus(l, i, e.currentTarget)} onFocus={e => onFocus(l, i, e.currentTarget)} onBlur={off} onKeyDown={e => move(i, e)} />;
        })}</g>
      </svg>
      <details className="mt-3 text-xs text-mute" data-testid="transfer-details">
        <summary className="cursor-pointer select-none hover:text-fg" data-testid="transfer-toggle">Show transfers as a list</summary>
        <ul className="mt-2 space-y-1 font-mono tnum" data-testid="transfer-list" aria-label="Ballot transfers">
          {g.links.filter((l: any) => l.source.id === OUT).map((l: any) => (
            <li key={l.target.id} data-testid="transfer-item" className="text-fg">{clean(l.source.label)} → {clean(l.target.label)}: {fmt(l.value)} ballots{l.source.value ? <span className="text-mute"> ({(100 * l.value / l.source.value).toFixed(1)}% of source)</span> : null}</li>
          ))}
        </ul>
      </details>
      {tip && (
        <div role="tooltip" data-testid="sankey-tooltip" className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+14px)] rounded-xl border border-white/10 bg-[#0e1013]/90 px-3 py-2 text-xs shadow-[0_12px_40px_-8px_rgba(0,0,0,.8)] backdrop-blur-md" style={{ left: tip.x, top: tip.y }}>
          <div className="text-mute">{tip.from}{tip.to !== undefined && <> <span className="text-iris">→</span> {tip.to}</>}</div>
          <div className="mt-0.5 font-mono text-sm text-fg tnum">{fmt(tip.value)} ballots{tip.share && <span className="ml-1.5 text-mute">({tip.to !== undefined ? `${tip.share} of source` : tip.share})</span>}</div>
        </div>
      )}
    </div>
  );
}
