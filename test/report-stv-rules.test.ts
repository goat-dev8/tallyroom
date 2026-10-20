import { describe, it, expect } from 'vitest';
import { handleReport } from '../src/report-api.js';

// BUG-027: once STV applied the ballot and tie rules (BUG-014, BUG-019), the sealed STV report still said rules: null,
// so two reports with different results claimed the same (no) rules and could not be reproduced from the report alone.
const report = (rules: unknown) => handleReport('POST', { rawBody: JSON.stringify({ ballots: '3,_>_>A\n2,B\n2,C', seats: 2, rules }), contentType: 'application/json' }) as { status: number; body: any };

describe('BUG-027: STV report records the rules it was counted with', () => {
  it('rules appear in the report and differ when the result differs', () => {
    const a = report({}); const b = report({ skips: 'two-exhaust' });
    expect(a.body.winners).toEqual(['A', 'B']); expect(b.body.winners).toEqual(['B', 'C']);
    expect(a.body.rules).toMatchObject({ overvote: 'exhaust', skips: 'continue', tiebreak: 'previous-round' });
    expect(b.body.rules).toMatchObject({ skips: 'two-exhaust' });
  });
  it('lotOrder is recorded too', () => {
    expect(report({ tiebreak: 'lot', lotOrder: ['C', 'B', 'A'] }).body.rules).toMatchObject({ tiebreak: 'lot', lotOrder: ['C', 'B', 'A'] });
  });
});
