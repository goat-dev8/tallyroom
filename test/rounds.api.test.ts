import { describe, it, expect } from 'vitest';
import { parseBallots, tabulateIrv } from '../src/index.js';
import { eliminationTransfers } from '../src/transfers.js';
import { BUNDLED_ELECTIONS } from '../src/elections/registry.js';
import { buildRoundsPayload } from '../src/rounds-build.js';
import { handleElectionRounds } from '../src/rounds-api.js';
import { GET } from '../app/api/elections/[id]/rounds/route.js';
import { ALASKA_2022_SPECIAL } from '../src/elections/alaska-2022-special.js';
import { MAINE_2018_CD2 } from '../src/elections/maine-2018-cd2.js';
import { NYC_2021_DEM_MAYOR } from '../src/elections/nyc-2021-dem-mayor.js';

const sumTo = (edges: { to: string; count: number }[], to: string) => edges.filter(e => e.to === to).reduce((s, e) => s + e.count, 0);

describe('elimination transfers', () => {
  it('counts a single-candidate elimination onto the next choice', () => {
    const { ballots, candidates } = parseBallots('8,A>D\n6,B>C\n4,C>B\n3,D>C');
    const result = tabulateIrv(ballots, candidates);
    expect(eliminationTransfers(ballots, candidates, {}, result.rounds, 1)).toEqual([{ from: 'D', to: 'C', count: 3 }]);
    expect(eliminationTransfers(ballots, candidates, {}, result.rounds, 2)).toEqual([{ from: 'B', to: 'C', count: 6 }]);
    expect(eliminationTransfers(ballots, candidates, {}, result.rounds, 0)).toEqual([]);
  });

  it('sends ballots with no next choice to exhausted', () => {
    const { ballots, candidates } = parseBallots('7,A\n6,B\n4,C>A\n3,D');
    const result = tabulateIrv(ballots, candidates);
    expect(eliminationTransfers(ballots, candidates, {}, result.rounds, 1)).toEqual([{ from: 'D', to: 'exhausted', count: 3, exhausted: true }]);
  });
});

describe('GET /api/elections/[id]/rounds', () => {
  it('serves precomputed JSON that matches a fresh tabulation', () => {
    for (const e of BUNDLED_ELECTIONS) {
      const served = handleElectionRounds('GET', e.id);
      expect(served.status).toBe(200);
      expect(served.body).toEqual(buildRoundsPayload(e));
    }
  });

  it('maine-2018-cd2 matches the certified round tallies and transfer totals', () => {
    const body = handleElectionRounds('GET', 'maine-2018-cd2').body as ReturnType<typeof buildRoundsPayload>;
    expect(body.winner).toBe('DEM Golden, Jared F.');
    expect(body.totalBallots).toBe(296077);
    expect(body.rounds).toHaveLength(2);
    expect(body.rounds[0].tallies).toEqual(MAINE_2018_CD2.certified.round1);
    expect(body.rounds[0].transfers).toEqual([]);
    expect([...body.rounds[0].eliminated].sort()).toEqual(['Bond, Tiffany L.', 'Hoar, William R.S.']);
    expect(body.rounds[1].tallies).toEqual(MAINE_2018_CD2.certified.final);
    const edges = body.rounds[1].transfers;
    expect(sumTo(edges, 'REP Poliquin, Bruce')).toBe(4747);
    expect(sumTo(edges, 'DEM Golden, Jared F.')).toBe(10427);
    expect(sumTo(edges, 'exhausted')).toBe(8253);
    expect(edges.reduce((s, e) => s + e.count, 0)).toBe(16552 + 6875);
  });

  it('alaska-2022 matches the certified tallies and Begich transfer split', () => {
    const body = handleElectionRounds('GET', 'alaska-2022').body as ReturnType<typeof buildRoundsPayload>;
    expect(body.winner).toBe('Peltola, Mary S.');
    expect(body.totalBallots).toBe(192289);
    expect(body.rounds[0].tallies).toEqual(ALASKA_2022_SPECIAL.certified.rounds[0].tallies);
    expect(body.rounds[0].eliminated).toEqual(['Begich, Nick']);
    expect(body.rounds[1].tallies).toEqual(ALASKA_2022_SPECIAL.certified.rounds[1].tallies);
    // 11,290 = official exhausted 11,243 + overvotes 47. Both leave the continuing pile.
    expect(body.rounds[1].transfers).toEqual([
      { from: 'Begich, Nick', to: 'Palin, Sarah', count: 27053 },
      { from: 'Begich, Nick', to: 'Peltola, Mary S.', count: 15467 },
      { from: 'Begich, Nick', to: 'exhausted', count: 11290, exhausted: true },
    ]);
    expect(27053 + 15467 + 11290).toBe(53810);
  });

  it('nyc-2021 matches the certified recap tallies, eliminations, and finalists', () => {
    const body = handleElectionRounds('GET', 'nyc-2021').body as ReturnType<typeof buildRoundsPayload>;
    expect(body.winner).toBe('Eric L. Adams');
    expect(body.totalBallots).toBe(947932);
    expect(body.rounds).toHaveLength(8);
    NYC_2021_DEM_MAYOR.certified.rounds.forEach((cr, i) => {
      expect(body.rounds[i].tallies).toEqual(cr.tallies);
      expect([...body.rounds[i].eliminated].sort()).toEqual([...cr.eliminated].sort());
    });
    const writeIn = body.rounds[1].transfers.filter(t => t.from === 'Write-in');
    expect(writeIn.reduce((s, t) => s + t.count, 0)).toBe(1568);
    expect(writeIn.some(t => t.to === 'exhausted')).toBe(true);
  });

  it('accepts the fixture slugs as aliases and rejects unknown ids', () => {
    expect(handleElectionRounds('GET', 'alaska-2022-special').body).toEqual(handleElectionRounds('GET', 'alaska-2022').body);
    expect(handleElectionRounds('GET', 'nyc-2021-dem-mayor').body).toEqual(handleElectionRounds('GET', 'nyc-2021').body);
    expect(handleElectionRounds('GET', 'no-such').status).toBe(404);
    expect(handleElectionRounds('GET', 'no-such').body).toEqual({ error: { code: 'UNKNOWN_ELECTION', message: 'Unknown election "no-such"', details: { id: 'no-such' } } });
  });

  it('405 on POST', () => {
    const r = handleElectionRounds('POST', 'maine-2018-cd2');
    expect(r.status).toBe(405);
    expect(r.headers).toEqual({ Allow: 'GET' });
  });

  it('route handler returns the Maine payload', async () => {
    const res = await GET(new Request('http://localhost/api/elections/maine-2018-cd2/rounds'), {
      params: Promise.resolve({ id: 'maine-2018-cd2' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe('maine-2018-cd2');
    expect(body.winner).toBe('DEM Golden, Jared F.');
    expect(body.rounds[1].transfers.some((t: { to: string }) => t.to === 'exhausted')).toBe(true);
  });
});
