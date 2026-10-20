import { describe, it, expect } from 'vitest';
import { handleTabulate } from '../src/api.js';
import { handleOptions } from '../src/options.js';
import { ALASKA_2022_SPECIAL as E } from '../src/elections/alaska-2022-special.js';
import { BallotGroup, Mark } from '../src/types.js';

function rankToken(m: Mark): string {
  if (m.kind === 'candidate') return m.name;
  return m.kind === 'overvote' ? 'overvote' : 'undervote';
}

function bodyFor(groups: BallotGroup[], candidates?: string[]) {
  return JSON.stringify({
    ballots: groups.map(g => ({ count: g.count, ranks: g.marks.map(rankToken) })),
    rules: E.rules,
    ...(candidates ? { candidates } : {}),
  });
}

describe('POST /api/tabulate Alaska 2022', () => {
  const groups = E.load();

  it('declared continuing candidates allow Write-in and match the certified two-round count', () => {
    const r = handleTabulate('POST', bodyFor(groups, E.candidates)) as any;
    expect(r.status).toBe(200);
    expect(r.body.totalBallots).toBe(192289);
    expect(r.body.rounds).toHaveLength(2);
    expect(r.body.rounds[0].tallies).toEqual(E.certified.rounds[0].tallies);
    expect(r.body.rounds[1].tallies).toEqual({ 'Palin, Sarah': 86026, 'Peltola, Mary S.': 91266 });
    expect(r.body.winner).toBe('Peltola, Mary S.');
    expect(r.body.candidates).toEqual(E.candidates);
  });

  it('without a candidate list, Write-in is passed over and the certified count still holds', () => {
    const r = handleTabulate('POST', bodyFor(groups)) as any;
    expect(r.status).toBe(200);
    expect(r.body.rounds).toHaveLength(2);
    expect(r.body.rounds[0].tallies).toEqual(E.certified.rounds[0].tallies);
    expect(r.body.rounds[1].tallies).toEqual(E.certified.rounds[1].tallies);
    expect(r.body.winner).toBe('Peltola, Mary S.');
    expect(r.body.candidates).not.toContain('Write-in');
  });

  it('listing Write-in makes it a continuing candidate', () => {
    const r = handleTabulate('POST', JSON.stringify({
      ballots: [{ count: 3, ranks: ['Write-in'] }, { count: 2, ranks: ['A'] }],
      candidates: ['Write-in', 'A'],
    })) as any;
    expect(r.status).toBe(200);
    expect(r.body.rounds[0].tallies).toEqual({ 'Write-in': 3, A: 2 });
    expect(r.body.winner).toBe('Write-in');
  });

  it('documents the Write-in convention on GET /api/options', () => {
    const body = handleOptions('GET').body as { writeIn: { name: string; description: string } };
    expect(body.writeIn.name).toBe('Write-in');
    expect(body.writeIn.description).toContain('Alaska');
    expect(body.writeIn.description).toContain('passed over');
  });
});
