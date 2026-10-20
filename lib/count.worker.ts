/// <reference lib="webworker" />
// Counts a bundled election off the main thread: parse pattern TSV, then run the exact IRV engine.
import { parsePatternTsv } from '../src/parse';
import { tabulateIrv } from '../src/irv';
const ctx = self as unknown as DedicatedWorkerGlobalScope;
ctx.onmessage = (e: MessageEvent) => {
  const { id, text, candidates, rules } = e.data;
  try {
    ctx.postMessage({ id, phase: 'parse' });
    const ballots = parsePatternTsv(text);
    ctx.postMessage({ id, phase: 'count' });
    ctx.postMessage({ id, phase: 'done', result: tabulateIrv(ballots, candidates, rules) });
  } catch (err) { ctx.postMessage({ id, phase: 'error', message: String((err as Error)?.message ?? err) }); }
};
