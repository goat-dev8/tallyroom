import { parsePatternTsv } from '../src/parse';
import { tabulateIrv } from '../src/irv';
import type { CatalogEntry } from './catalog';
/** Main-thread fallback for browsers without Web Workers. */
export const countInline = (text: string, e: CatalogEntry) => tabulateIrv(parsePatternTsv(text), e.candidates, e.rules);
