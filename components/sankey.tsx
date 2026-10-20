'use client';
import { useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { sankey, sankeyLinkHorizontal, sankeyJustify } from 'd3-sankey';
import type { IrvResult } from '../src/types';
import { colorFor, fmt } from '../lib/catalog';
type N = { id: string; label: string; color: string }; type L = { source: string; target: string; value: number; color: string };
/** Exact vote flow from round i to round i+1. Batch eliminations are grouped into one source so every flow is a certified number. */
export function buildFlow(res: IrvResult, i: number) {
  const a = res.rounds[i], b = res.rounds[i + 1]; if (!b) return null;
  const nodes: N[] = []; const links: L[] = [];
  const inA = Object.values(a.inactive).reduce((s, x) => s + x, 0);
  const inB = Object.values(b.inactive).reduce((s, x) => s + x, 0);
  const out = a.eliminated; const outLabel = out.length === 1 ? out[0] : `${out.length} eliminated`;
  for (const [c, v] of Object.entries(a.tallies)) if (!out.includes(c) && v > 0) nodes.push({ id: 'a:' + c, label: c, color: colorFor(res.candidates, c) });
  if (out.length) nodes.push({ id: 'a:out', label: outLabel, color: out.length === 1 ? colorFor(res.candidates, out[0]) : '#64748b' });
  if (inA) nodes.push({ id: 'a:inactive', label: 'Inactive', color: '#3b3f47' });
  for (const c of Object.keys(b.tallies)) nodes.push({ id: 'b:' + c, label: c, color: colorFor(res.candidates, c) });
  nodes.push({ id: 'b:inactive', label: 'Inactive', color: '#3b3f47' });
  let moved = 0;
  for (const [c, v] of Object.entries(b.tallies)) {
    const before = a.tallies[c] ?? 0; const gain = v - before; moved += gain;
    if (before) links.push({ source: 'a:' + c, target: 'b:' + c, value: before, color: colorFor(res.candidates, c) });
    if (gain > 0 && out.length) links.push({ source: 'a:out', target: 'b:' + c, value: gain, color: colorFor(res.candidates, c) });
  }
  const outTotal = out.reduce((s, c) => s + (a.tallies[c] ?? 0), 0);
  if (outTotal - moved > 0) links.push({ source: 'a:out', target: 'b:inactive', value: outTotal - moved, color: '#64748b' });
  if (inA) links.push({ source: 'a:inactive', target: 'b:inactive', value: inA, color: '#3b3f47' });
  return { nodes: nodes.filter(n => links.some(l => l.source === n.id || l.target === n.id)), links, check: inB };
}
const rank = (n: any) => (n.id.endsWith(':inactive') ? 2 : n.id === 'a:out' ? 1 : 0);
export function Sankey({ result, round }: { result: IrvResult; round: number }) {
  const W = 760;
  const reduce = useReducedMotion();
  const [tip, setTip] = useState<{ x: number; y: number; from: string; to: string; value: number; share: string } | null>(null);
  const [hot, setHot] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const flow = useMemo(() => buildFlow(result, round), [result, round]);
  const H = flow ? Math.min(420, Math.max(190, 28 * Math.max(flow.nodes.filter(n => n.id.startsWith('b:')).length, 3) + 40)) : 0;
  const g = useMemo(() => {
    if (!flow || !flow.links.some(l => l.value > 0)) return null;
    const s = sankey<N, L>().nodeId(d => d.id).nodeAlign(sankeyJustify).nodeWidth(8).nodePadding(12).extent([[1, 6], [W - 1, H - 6]])
      .nodeSort(((x: any, y: any) => rank(x) - rank(y) || (y.value ?? 0) - (x.value ?? 0)) as never);
    return s({ nodes: flow.nodes.map(d => ({ ...d })), links: flow.links.map(d => ({ ...d })) } as never);
  }, [flow, H]);
  if (!g) return <div className="grid place-items-center rounded-xl border border-dashed border-line py-12 text-center" data-testid="sankey-final"><p className="max-w-sm text-sm text-mute">Final round. No further transfers: the winner holds a majority of continuing ballots.</p></div>;
  const path = sankeyLinkHorizontal();
  const clean = (x: string) => x.replace(/^(REP|DEM) /, '');
  const data = (l: any) => ({ from: clean(l.source.label), to: clean(l.target.label), value: l.value as number, share: l.source.value ? (100 * l.value / l.source.value).toFixed(1) + '%' : '' });
  const at = (cx: number, cy: number) => { const b = box.current!.getBoundingClientRect(); return { x: cx - b.left + box.current!.scrollLeft, y: cy - b.top }; };
  const onPtr = (l: any, i: number, e: React.PointerEvent) => { setHot(i); setTip({ ...at(e.clientX, e.clientY), ...data(l) }); };
  const onEl = (l: any, i: number, el: Element) => { const r = el.getBoundingClientRect(); setHot(i); setTip({ ...at(r.left + r.width / 2, r.top + r.height / 2), ...data(l) }); };
  const off = () => { setHot(null); setTip(null); };
  const uid = `sk${round}`;
  return (
    <div ref={box} className="relative -mx-5 overflow-x-auto px-5 sm:mx-0 sm:overflow-visible sm:px-0" onPointerLeave={off} onMouseLeave={off} data-testid="sankey-scroll">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full min-w-[620px] sm:min-w-0" role="img" aria-label={`Vote transfers from round ${round + 1} to round ${round + 2}`} data-testid="sankey" data-height={H}>
        <defs>{g.links.map((l: any, i: number) => (
          <linearGradient key={i} id={`${uid}-${i}`} gradientUnits="userSpaceOnUse" x1={l.source.x1} x2={l.target.x0}>
            <stop offset="0%" stopColor={l.source.color} /><stop offset="100%" stopColor={l.target.color} />
          </linearGradient>))}</defs>
        <g fill="none">{g.links.map((l: any, i: number) => {
          const d = data(l); const dim = hot !== null && hot !== i;
          return <motion.path key={`${round}-${i}`} d={path(l) ?? ''} stroke={`url(#${uid}-${i})`} strokeWidth={Math.max(1.5, l.width)} tabIndex={0} role="button" data-testid="sankey-link"
            aria-label={`${d.from} to ${d.to}: ${fmt(l.value)} ballots`}
            className="sankey-link cursor-pointer outline-none [mix-blend-mode:screen]" style={{ transition: 'stroke-opacity 180ms cubic-bezier(.22,1,.36,1)' }}
            strokeOpacity={hot === i ? 0.85 : dim ? 0.07 : 0.34}
            initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
            onPointerEnter={e => onPtr(l, i, e)} onPointerMove={e => onPtr(l, i, e)} onClick={e => onEl(l, i, e.currentTarget)} onFocus={e => onEl(l, i, e.currentTarget)} onPointerLeave={off} onBlur={off} />;
        })}</g>
        {g.nodes.map((n: any) => {
          const left = n.x0 < W / 2; const lit = hot === null || g.links[hot] && ((g.links[hot] as any).source === n || (g.links[hot] as any).target === n);
          return <g key={n.id} style={{ opacity: lit ? 1 : 0.35, transition: 'opacity 180ms' }} data-testid="sankey-node" data-node={n.id}>
            <rect x={n.x0} y={n.y0} width={n.x1 - n.x0} height={Math.max(2, n.y1 - n.y0)} rx={3} fill={n.color} style={{ filter: `drop-shadow(0 0 6px ${n.color}88)` }} />
            <text x={left ? n.x1 + 8 : n.x0 - 8} y={(n.y0 + n.y1) / 2} dy="0.35em" textAnchor={left ? 'start' : 'end'} className="pointer-events-none fill-[#e3e5e9] text-[11px] font-medium">{clean(n.label)}<tspan className="fill-[#8a8f98] font-mono text-[10px]" dx="6">{fmt(n.value)}</tspan></text></g>;
        })}
      </svg>
      <details className="mt-3 text-xs text-mute" data-testid="transfer-details">
        <summary className="cursor-pointer select-none hover:text-fg" data-testid="transfer-toggle">Show transfers as a list</summary>
        <ul className="mt-2 space-y-1 font-mono tnum" data-testid="transfer-list" aria-label="Ballot transfers">
          {g.links.filter((l: any) => l.source.id === 'a:out').map((l: any) => (
            <li key={l.target.id} data-testid="transfer-item" className="text-fg">{clean(l.source.label)} → {clean(l.target.label)}: {fmt(l.value)} ballots{l.source.value ? <span className="text-mute"> ({(100 * l.value / l.source.value).toFixed(1)}% of source)</span> : null}</li>
          ))}
        </ul>
      </details>
      {tip && (
        <div role="tooltip" data-testid="sankey-tooltip" className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+14px)] rounded-xl border border-white/10 bg-[#0e1013]/90 px-3 py-2 text-xs shadow-[0_12px_40px_-8px_rgba(0,0,0,.8)] backdrop-blur-md" style={{ left: tip.x, top: tip.y }}>
          <div className="text-mute">{tip.from} <span className="text-iris">→</span> {tip.to}</div>
          <div className="mt-0.5 font-mono text-sm text-fg tnum">{fmt(tip.value)} ballots{tip.share && <span className="ml-1.5 text-mute">({tip.share} of source)</span>}</div>
        </div>
      )}
    </div>
  );
}
