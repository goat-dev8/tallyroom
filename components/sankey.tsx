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
export function Sankey({ result, round }: { result: IrvResult; round: number }) {
  const W = 760, H = 360;
  const reduce = useReducedMotion();
  const [tip, setTip] = useState<{ x: number; y: number; from: string; to: string; value: number; share: string } | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const g = useMemo(() => {
    const f = buildFlow(result, round); if (!f) return null;
    const s = sankey<N, L>().nodeId(d => d.id).nodeAlign(sankeyJustify).nodeWidth(10).nodePadding(14).extent([[1, 8], [W - 1, H - 8]]);
    return s({ nodes: f.nodes.map(d => ({ ...d })), links: f.links.map(d => ({ ...d })) } as never);
  }, [result, round]);
  if (!g) return <div className="grid place-items-center py-16 text-center" data-testid="sankey-final"><p className="text-sm text-mute">Final round. No further transfers: the winner holds a majority of continuing ballots.</p></div>;
  const path = sankeyLinkHorizontal();
  const clean = (x: string) => x.replace(/^(REP|DEM) /, '');
  const show = (l: any, el: Element) => {
    const b = box.current!.getBoundingClientRect(), r = el.getBoundingClientRect();
    const src = l.source.value as number;
    setTip({ x: r.left - b.left + box.current!.scrollLeft + r.width / 2, y: r.top - b.top + r.height / 2, from: clean(l.source.label), to: clean(l.target.label), value: l.value, share: src ? (100 * l.value / src).toFixed(1) + '%' : '' });
  };
  return (
    <div ref={box} className="relative -mx-5 overflow-x-auto px-5 sm:mx-0 sm:overflow-visible sm:px-0" onMouseLeave={() => setTip(null)} data-testid="sankey-scroll">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full min-w-[620px] sm:min-w-0" role="img" aria-label={`Vote transfers from round ${round + 1} to round ${round + 2}`} data-testid="sankey">
        <g fill="none">{g.links.map((l: any, i: number) => (
          <motion.path key={`${round}-${i}`} d={path(l) ?? ''} stroke={l.color} strokeWidth={Math.max(1, l.width)} tabIndex={0} role="button" data-testid="sankey-link"
            aria-label={`${clean(l.source.label)} to ${clean(l.target.label)}: ${fmt(l.value)} ballots`}
            className="cursor-pointer outline-none transition-[stroke-opacity] duration-150" strokeOpacity={tip && tip.from === clean(l.source.label) && tip.to === clean(l.target.label) ? 0.7 : 0.32}
            initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, delay: i * 0.03, ease: [0.22, 1, 0.36, 1] }}
            onMouseEnter={e => show(l, e.currentTarget)} onClick={e => show(l, e.currentTarget)} onFocus={e => show(l, e.currentTarget)} onBlur={() => setTip(null)} />))}</g>
        {g.nodes.map((n: any) => {
          const left = n.x0 < W / 2;
          return <g key={n.id}><rect x={n.x0} y={n.y0} width={n.x1 - n.x0} height={Math.max(1, n.y1 - n.y0)} rx={2} fill={n.color} />
            <text x={left ? n.x1 + 6 : n.x0 - 6} y={(n.y0 + n.y1) / 2} dy="0.35em" textAnchor={left ? 'start' : 'end'} className="pointer-events-none fill-[#c9ccd2] text-[11px]">{clean(n.label)} · {fmt(n.value)}</text></g>;
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
        <div role="tooltip" data-testid="sankey-tooltip" className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+10px)] rounded-lg border border-line bg-panel/95 px-3 py-2 text-xs shadow-xl backdrop-blur" style={{ left: tip.x, top: tip.y }}>
          <div className="text-mute">{tip.from} <span className="text-fg">→</span> {tip.to}</div>
          <div className="mt-0.5 font-mono text-sm text-fg tnum">{fmt(tip.value)} ballots{tip.share && <span className="ml-1.5 text-mute">({tip.share} of source)</span>}</div>
        </div>
      )}
    </div>
  );
}
