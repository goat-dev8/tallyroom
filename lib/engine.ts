'use client';
import type { IrvResult } from '../src/types';
import type { CatalogEntry } from './catalog';
/** download 0–1 → parse → count → done. */
export type Progress = { phase: 'download' | 'parse' | 'count' | 'done'; loaded: number; total: number };
type Listener = (p: Progress) => void;
const cache = new Map<string, Promise<IrvResult>>();
const listeners = new Map<string, Set<Listener>>();
const last = new Map<string, Progress>();
let worker: Worker | null = null; let seq = 0;
const pending = new Map<number, { slug: string; res: (r: IrvResult) => void; rej: (e: Error) => void }>();
function emit(slug: string, p: Progress) { last.set(slug, p); listeners.get(slug)?.forEach(l => l(p)); }
function getWorker(): Worker | null {
  if (worker || typeof Worker === 'undefined') return worker;
  worker = new Worker(new URL('./count.worker.ts', import.meta.url), { type: 'module' });
  worker.onmessage = (e: MessageEvent) => {
    const m = e.data; const job = pending.get(m.id); if (!job) return;
    if (m.phase === 'done') { pending.delete(m.id); job.res(m.result); }
    else if (m.phase === 'error') { pending.delete(m.id); job.rej(new Error(m.message)); }
    else emit(job.slug, { phase: m.phase, loaded: 1, total: 1 });
  };
  return worker;
}
async function download(e: CatalogEntry): Promise<string> {
  const r = await fetch(e.file); if (!r.ok || !r.body) throw new Error(`Could not load the ${e.short} ballots (HTTP ${r.status}).`);
  const reader = r.body.getReader(); const chunks: Uint8Array[] = []; let loaded = 0;
  for (;;) { const { done, value } = await reader.read(); if (done) break; chunks.push(value); loaded += value.length; emit(e.slug, { phase: 'download', loaded: Math.min(loaded, e.bytes), total: e.bytes }); }
  const all = new Uint8Array(loaded); let o = 0; for (const c of chunks) { all.set(c, o); o += c.length; }
  return new TextDecoder().decode(all);
}
async function run(e: CatalogEntry): Promise<IrvResult> {
  emit(e.slug, { phase: 'download', loaded: 0, total: e.bytes });
  const text = await download(e);
  const w = getWorker();
  const result = w
    ? await new Promise<IrvResult>((res, rej) => { const id = ++seq; pending.set(id, { slug: e.slug, res, rej }); w.postMessage({ id, text, candidates: e.candidates, rules: e.rules }); })
    : await import('./count-inline').then(m => m.countInline(text, e));
  emit(e.slug, { phase: 'done', loaded: 1, total: 1 });
  return result;
}
/** Runs the real counting engine in a Web Worker on the verified fixture bytes. Results are cached per election. */
export function countBundled(e: CatalogEntry, onProgress?: Listener): Promise<IrvResult> {
  if (onProgress) { if (!listeners.has(e.slug)) listeners.set(e.slug, new Set()); listeners.get(e.slug)!.add(onProgress); const l = last.get(e.slug); if (l) onProgress(l); }
  if (!cache.has(e.slug)) { const p = run(e); cache.set(e.slug, p); p.catch(() => { cache.delete(e.slug); last.delete(e.slug); }); }
  return cache.get(e.slug)!;
}
export function unsubscribe(slug: string, l: Listener) { listeners.get(slug)?.delete(l); }
