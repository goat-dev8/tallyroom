import { createHash } from 'node:crypto';
import { describe, it, expect } from 'vitest';
import { canonicalJson } from '../src/report.js';
import { contentHash, handleReport, ShareableReport } from '../src/report-api.js';
import { GET, POST } from '../app/api/report/route.js';
import { MAINE_2018_CD2 } from '../src/elections/maine-2018-cd2.js';

const asReport = (body: unknown) => body as ShareableReport;

describe('GET and POST /api/report', () => {
  it('returns a stable report for a bundled election, with a content hash of the other fields', () => {
    const a = handleReport('GET', { election: 'maine-2018-cd2' });
    const b = handleReport('GET', { election: 'maine-2018-cd2' });
    expect(a.status).toBe(200);
    expect(a.body).toEqual(b.body);
    const report = asReport(a.body);
    expect(report.election).toBe('maine-2018-cd2');
    expect(report.winner).toBe('DEM Golden, Jared F.');
    expect(report.certifiedWinner).toBe('DEM Golden, Jared F.');
    expect(report.ballotCount).toBe(MAINE_2018_CD2.certified.totalBallots);
    expect(report.method).toBe('IRV');
    expect(report.seats).toBe(1);
    expect(report.rules).toMatchObject({ overvote: 'exhaust', skips: 'two-exhaust', batch: true, tiebreak: 'lot' });
    expect(report.source).toMatch(/^https:\/\/www\.maine\.gov\//);
    expect(report.rounds).toHaveLength(2);
    expect(report.rounds[1]).toMatchObject({ tallies: MAINE_2018_CD2.certified.final });
    const { contentHash: hash, ...rest } = report;
    expect(hash).toBe(contentHash(rest));
    expect(hash).toBe(`sha256:${createHash('sha256').update(canonicalJson(rest)).digest('hex')}`);
    expect(hash).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it('POST { election } matches GET, including aliases', () => {
    const viaGet = handleReport('GET', { election: 'alaska-2022-special' });
    const viaPost = handleReport('POST', { rawBody: JSON.stringify({ election: 'alaska-2022' }) });
    expect(viaGet.status).toBe(200);
    expect(viaPost.body).toEqual(viaGet.body);
    const report = asReport(viaGet.body);
    expect(report.election).toBe('alaska-2022');
    expect(report.winner).toBe('Peltola, Mary S.');
    expect(report.rules).toMatchObject({ duplicates: 'skip', skips: 'two-exhaust' });
    const edges = (report.rounds[1] as { transfers: { to: string; count: number }[] }).transfers;
    expect(edges).toEqual([
      { from: 'Begich, Nick', to: 'Palin, Sarah', count: 27053 },
      { from: 'Begich, Nick', to: 'Peltola, Mary S.', count: 15467 },
      { from: 'Begich, Nick', to: 'exhausted', count: 11290 },
    ]);
  });

  it('hashes an uploaded count, and a different tie-break changes the hash', () => {
    const ballots = '5,A\n3,B>C\n3,C>B';
    const first = handleReport('POST', { rawBody: JSON.stringify({ ballots, rules: { lotOrder: ['A', 'B', 'C'] } }) });
    const again = handleReport('POST', { rawBody: JSON.stringify({ ballots, rules: { lotOrder: ['A', 'B', 'C'] } }) });
    const flipped = handleReport('POST', { rawBody: JSON.stringify({ ballots, rules: { lotOrder: ['A', 'C', 'B'] } }) });
    expect(first.status).toBe(200);
    expect(again.body).toEqual(first.body);
    const report = asReport(first.body);
    expect(report.election).toBeNull();
    expect(report.name).toBe('Uploaded ballots');
    expect(report.winner).toBe('B');
    expect(asReport(flipped.body).winner).toBe('C');
    expect(asReport(flipped.body).contentHash).not.toBe(report.contentHash);
    const incoming = (report.rounds[1] as { transfers: { from: string; to: string; count: number }[] }).transfers;
    expect(incoming).toEqual([{ from: 'C', to: 'B', count: 3 }]);
  });

  it('POST CSV and STV uploads return a hashed report', () => {
    const csv = handleReport('POST', { rawBody: 'count,rank1,rank2\n8,A,D\n6,B,C\n4,C,B\n3,D,C\n', contentType: 'text/csv' });
    expect(csv.status).toBe(200);
    expect(asReport(csv.body).winner).toBe('C');
    expect(asReport(csv.body).contentHash).toMatch(/^sha256:[a-f0-9]{64}$/);
    const stv = handleReport('POST', { rawBody: JSON.stringify({ ballots: '3,A>B\n3,A>C\n2,B\n1,C\n4,D', seats: 2 }) });
    expect(stv.status).toBe(200);
    const body = asReport(stv.body);
    expect(body.method).toBe('STV');
    expect(body.seats).toBe(2);
    expect(body.quota).toBe('5.0000');
    expect(body.winner).toBeNull();
    expect([...body.winners].sort()).toEqual(['A', 'D']);
  });

  it('rejects missing, unknown, and ambiguous election requests', () => {
    expect(handleReport('GET', {}).status).toBe(400);
    expect(handleReport('GET', {}).body).toEqual({ error: 'Query parameter "election" is required' });
    expect(handleReport('GET', { election: 'nope' }).status).toBe(404);
    expect(handleReport('POST', { rawBody: JSON.stringify({ election: 'nope' }) }).body).toEqual({ error: 'Unknown election "nope"' });
    expect(handleReport('POST', { rawBody: '{}' }).body).toEqual({ error: 'Field "election" or "ballots" is required' });
    expect(handleReport('POST', { rawBody: '{x' }).body).toEqual({ error: 'Invalid JSON body' });
    expect(handleReport('POST', { rawBody: JSON.stringify({ election: 'maine-2018-cd2', ballots: '1,A' }) }).status).toBe(400);
    expect(handleReport('PUT', {}).status).toBe(405);
    expect(handleReport('PUT', {}).headers).toEqual({ Allow: 'GET, POST' });
  });

  it('413 above 10 MB and the route serves canonical JSON', async () => {
    expect(handleReport('POST', { rawBody: 'x'.repeat(10 * 1024 * 1024 + 1) }).status).toBe(413);
    const res = await GET(new Request('http://localhost/api/report?election=nyc-2021'));
    expect(res.status).toBe(200);
    const text = await res.text();
    const parsed = JSON.parse(text) as ShareableReport;
    expect(text).toBe(canonicalJson(parsed));
    expect(parsed.winner).toBe('Eric L. Adams');
    expect(parsed.ballotCount).toBe(947932);
    expect(parsed.rounds).toHaveLength(8);
    const posted = await POST(new Request('http://localhost/api/report', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ election: 'nyc-2021' }),
    }));
    expect(await posted.text()).toBe(text);
  });
});
