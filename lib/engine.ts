'use client';
import { parsePatternTsv } from '../src/parse';
import { tabulateIrv } from '../src/irv';
import type { IrvResult } from '../src/types';
import type { CatalogEntry } from './catalog';
const cache = new Map<string, Promise<IrvResult>>();
/** Runs the real counting engine in the browser on the verified fixture bytes. */
export function countBundled(e: CatalogEntry): Promise<IrvResult> {
  if (!cache.has(e.slug)) cache.set(e.slug, fetch(e.file).then(r => { if (!r.ok) throw new Error(`Could not load ${e.file}`); return r.text(); })
    .then(t => new Promise<IrvResult>(res => setTimeout(() => res(tabulateIrv(parsePatternTsv(t), e.candidates, e.rules)), 0))));
  const p = cache.get(e.slug)!; p.catch(() => cache.delete(e.slug)); return p;
}
