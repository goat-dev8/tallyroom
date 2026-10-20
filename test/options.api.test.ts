import { describe, it, expect } from 'vitest';
import { handleTabulate } from '../src/api.js';
import { handleReport } from '../src/report-api.js';
import { handleOptions } from '../src/options.js';
import { GET } from '../app/api/options/route.js';

const food = '4,Oranges\n2,Pears>Oranges\n8,Chocolate>Strawberries\n4,Chocolate>Hamburgers\n1,Strawberries\n1,Hamburgers';

describe('tie-break and STV options', () => {
  it('GET /api/options lists tie-break and multi-seat choices', () => {
    const r = handleOptions('GET') as any;
    expect(r.status).toBe(200);
    expect(r.body.tiebreak.default).toBe('previous-round');
    expect(r.body.tiebreak.options.map((o: { id: string }) => o.id)).toEqual(['previous-round', 'lot']);
    expect(r.body.tiebreak.lotOrder.field).toBe('rules.lotOrder');
    expect(r.body.stv.seats.field).toBe('seats');
    expect(r.body.stv.seats.minimum).toBe(1);
    expect(r.body.stv.quota.default).toBe('droop');
    expect(r.body.stv.quota.options.map((o: { id: string }) => o.id)).toEqual(['droop', 'hare']);
    expect(r.body.stv.quota.options[0].description).toContain('floor(ballots / (seats + 1)) + 1');
    expect(r.body.rules.overvote.options).toEqual(['exhaust', 'skip']);
    expect(r.body.rules.skips.options).toEqual(['continue', 'two-exhaust']);
    expect(r.body.rules.duplicates.options).toEqual(['ignore', 'skip']);
    expect(r.body.rules.batch.default).toBe(false);
    for (const opt of r.body.tiebreak.options) expect(opt.description.length).toBeGreaterThan(20);
  });

  it('405 on POST /api/options', () => {
    const r = handleOptions('POST');
    expect(r.status).toBe(405);
    expect(r.headers).toEqual({ Allow: 'GET' });
  });

  it('lot order is accepted and changes who is eliminated', () => {
    const body = JSON.stringify({ ballots: '5,A\n3,B>C\n3,C>B', rules: { tiebreak: 'lot', lotOrder: ['A', 'C', 'B'] } });
    const r = handleTabulate('POST', body) as any;
    expect(r.status).toBe(200);
    expect(r.body.rules.tiebreak).toBe('lot');
    expect(r.body.rounds[0].eliminated).toEqual(['B']);
    expect(r.body.winner).toBe('C');
  });

  it('422 on invalid tie-break, quota, seats type, and lot order', () => {
    const ballots = '1,A\n1,B';
    expect(handleTabulate('POST', JSON.stringify({ ballots, rules: { tiebreak: 'coin' } }))).toMatchObject({
      status: 422, body: { error: 'rules.tiebreak must be one of: previous-round, lot' },
    });
    expect(handleTabulate('POST', JSON.stringify({ ballots, rules: { overvote: 'maybe' } })).status).toBe(422);
    expect(handleTabulate('POST', JSON.stringify({ ballots, rules: { skips: 'never' } })).status).toBe(422);
    expect(handleTabulate('POST', JSON.stringify({ ballots, rules: { duplicates: 'drop' } })).status).toBe(422);
    expect(handleTabulate('POST', JSON.stringify({ ballots, rules: { batch: 'yes' } }))).toMatchObject({
      status: 422, body: { error: 'rules.batch must be a boolean' },
    });
    expect(handleTabulate('POST', JSON.stringify({ ballots, rules: { lotOrder: 'A,B' } }))).toMatchObject({
      status: 422, body: { error: 'rules.lotOrder must be an array of candidate names' },
    });
    expect(handleTabulate('POST', JSON.stringify({ ballots, rules: { lotOrder: ['A'] } }))).toMatchObject({
      status: 422, body: { error: 'rules.lotOrder is missing candidate "B"' },
    });
    expect(handleTabulate('POST', JSON.stringify({ ballots, rules: { lotOrder: ['A', 'A', 'B'] } }))).toMatchObject({
      status: 422, body: { error: 'rules.lotOrder contains a duplicate "A"' },
    });
    expect(handleTabulate('POST', JSON.stringify({ ballots, seats: 1.5 }))).toMatchObject({
      status: 422, body: { error: 'seats must be an integer from 1 to the number of candidates' },
    });
    expect(handleTabulate('POST', JSON.stringify({ ballots, seats: '2' })).status).toBe(422);
    expect(handleTabulate('POST', JSON.stringify({ ballots, quota: 'meek' }))).toMatchObject({
      status: 422, body: { error: 'quota must be one of: droop, hare' },
    });
    expect(handleTabulate('POST', JSON.stringify({ ballots, rules: { foo: 1 } })).status).toBe(400);
  });

  it('keeps integer seats that are out of range on the existing error', () => {
    const r = handleTabulate('POST', JSON.stringify({ ballots: '1,A\n1,B', seats: 3 }));
    expect(r.status).toBe(400);
    expect(r.body).toEqual({ error: 'Seats must be between 1 and 2' });
    expect(handleTabulate('POST', JSON.stringify({ ballots: '1,A\n1,B', seats: 0 })).body).toEqual({ error: 'Seats must be between 1 and 2' });
  });

  it('Hare quota is accepted for multi-seat STV and changes the quota', () => {
    const droop = handleTabulate('POST', JSON.stringify({ ballots: food, seats: 3 })) as any;
    const hare = handleTabulate('POST', JSON.stringify({ ballots: food, seats: 3, quota: 'hare' })) as any;
    expect(droop.status).toBe(200);
    expect(droop.body.method).toBe('stv');
    expect(droop.body.quota).toBe('6.0000');
    expect(hare.status).toBe(200);
    expect(hare.body.quota).toBe('6.6667');
    expect([...hare.body.winners].sort()).toEqual(['Chocolate', 'Oranges', 'Strawberries']);
  });

  it('report uploads use the same option checks', () => {
    const r = handleReport('POST', { rawBody: JSON.stringify({ ballots: '1,A\n1,B', rules: { tiebreak: 'coin' } }) });
    expect(r.status).toBe(422);
    expect(r.body).toEqual({ error: 'rules.tiebreak must be one of: previous-round, lot' });
  });

  it('route serves the options document', async () => {
    const res = await GET(new Request('http://localhost/api/options'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.tiebreak.options).toHaveLength(2);
    expect(body.stv.quota.options).toHaveLength(2);
  });
});
