import { describe, it, expect } from 'vitest';
import { handleElectionTabulate } from '../src/elections/tabulate.js';
import { POST } from '../app/api/elections/[id]/tabulate/route.js';
import { ALASKA_2022_SPECIAL as AK } from '../src/elections/alaska-2022-special.js';
import { MAINE_2018_CD2 as ME } from '../src/elections/maine-2018-cd2.js';
import { NYC_2021_DEM_MAYOR as NYC } from '../src/elections/nyc-2021-dem-mayor.js';

describe('POST /api/elections/[id]/tabulate', () => {
  it('counts Maine from the bundled fixture', () => {
    const r = handleElectionTabulate('POST', 'maine-2018-cd2') as any;
    expect(r.status).toBe(200);
    expect(r.body.id).toBe('maine-2018-cd2');
    expect(r.body.method).toBe('irv');
    expect(r.body.totalBallots).toBe(296077);
    expect(r.body.rounds).toHaveLength(2);
    expect(r.body.rounds[0].tallies).toEqual(ME.certified.round1);
    expect(r.body.rounds[1].tallies).toEqual(ME.certified.final);
    expect(r.body.winner).toBe('DEM Golden, Jared F.');
    expect(r.body.certifiedWinner).toBe(r.body.winner);
  });

  it('counts Alaska, including the alias', () => {
    const r = handleElectionTabulate('POST', 'alaska-2022-special') as any;
    expect(r.status).toBe(200);
    expect(r.body.id).toBe('alaska-2022');
    expect(r.body.totalBallots).toBe(192289);
    expect(r.body.rounds).toHaveLength(2);
    expect(r.body.rounds[0].tallies).toEqual(AK.certified.rounds[0].tallies);
    expect(r.body.rounds[1].tallies).toEqual({ 'Palin, Sarah': 86026, 'Peltola, Mary S.': 91266 });
    expect(r.body.winner).toBe('Peltola, Mary S.');
  });

  it('counts New York City without a request body', () => {
    const r = handleElectionTabulate('POST', 'nyc-2021') as any;
    expect(r.status).toBe(200);
    expect(r.body.totalBallots).toBe(947932);
    expect(r.body.rounds).toHaveLength(8);
    NYC.certified.rounds.forEach((cr: { tallies: Record<string, number>; eliminated: string[] }, i: number) => {
      expect(r.body.rounds[i].tallies).toEqual(cr.tallies);
      expect([...r.body.rounds[i].eliminated].sort()).toEqual([...cr.eliminated].sort());
    });
    expect(r.body.winner).toBe('Eric L. Adams');
    expect(r.body.rounds[7].tallies).toEqual({ 'Eric L. Adams': 404513, 'Kathryn A. Garcia': 397316 });
  });

  it('404 for an unknown id and 405 for GET', () => {
    expect(handleElectionTabulate('POST', 'nope').status).toBe(404);
    expect(handleElectionTabulate('POST', 'nope').body).toEqual({ error: { code: 'UNKNOWN_ELECTION', message: 'Unknown election "nope"', details: { id: 'nope' } } });
    const got = handleElectionTabulate('GET', 'maine-2018-cd2');
    expect(got.status).toBe(405);
    expect(got.headers).toEqual({ Allow: 'POST' });
  });

  it('route handler counts Alaska', async () => {
    const res = await POST(new Request('http://localhost/api/elections/alaska-2022/tabulate', { method: 'POST' }), {
      params: Promise.resolve({ id: 'alaska-2022' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.winner).toBe('Peltola, Mary S.');
    expect(body.totalBallots).toBe(192289);
  });
});
