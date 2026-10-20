import { describe, it, expect } from 'vitest';
import { handleElectionList } from '../src/elections/http.js';
import { ALASKA_2022_SPECIAL } from '../src/elections/alaska-2022-special.js';
import { MAINE_2018_CD2 } from '../src/elections/maine-2018-cd2.js';
import { NYC_2021_DEM_MAYOR } from '../src/elections/nyc-2021-dem-mayor.js';

describe('GET /api/elections', () => {
  const res = handleElectionList('GET');
  const elections = (res.body as { elections: Record<string, unknown>[] }).elections;

  it('lists the three bundled elections with the public metadata fields', () => {
    expect(res.status).toBe(200);
    expect(elections.map(e => e.id)).toEqual(['maine-2018-cd2', 'alaska-2022', 'nyc-2021']);
    for (const e of elections) {
      expect(Object.keys(e).sort()).toEqual([
        'ballotCount', 'candidates', 'certifiedWinner', 'id', 'jurisdiction', 'method', 'name', 'seats', 'source', 'year',
      ]);
      expect(e.method).toBe('IRV');
      expect(e.seats).toBe(1);
      expect(typeof e.source).toBe('string');
      expect(String(e.source)).toMatch(/^https:\/\//);
    }
  });

  it('matches certified candidate lists, ballot counts, and winners', () => {
    const [maine, alaska, nyc] = elections;
    expect(maine.name).toBe(MAINE_2018_CD2.title);
    expect(maine.jurisdiction).toBe('Maine');
    expect(maine.year).toBe(2018);
    expect(maine.candidates).toEqual(MAINE_2018_CD2.candidates);
    expect(maine.ballotCount).toBe(MAINE_2018_CD2.certified.totalBallots);
    expect(maine.certifiedWinner).toBe('DEM Golden, Jared F.');
    expect(maine.source).toBe('https://www.maine.gov/sos/cec/elec/results/2018/updated-summary-report-CD2.xls');

    expect(alaska.name).toBe(ALASKA_2022_SPECIAL.title);
    expect(alaska.jurisdiction).toBe('Alaska');
    expect(alaska.year).toBe(2022);
    expect(alaska.candidates).toEqual(ALASKA_2022_SPECIAL.candidates);
    expect(alaska.ballotCount).toBe(ALASKA_2022_SPECIAL.certified.totalBallots);
    expect(alaska.certifiedWinner).toBe('Peltola, Mary S.');
    expect(alaska.source).toBe('https://www.elections.alaska.gov/results/22SSPG/');

    expect(nyc.name).toBe(NYC_2021_DEM_MAYOR.title);
    expect(nyc.jurisdiction).toBe('New York City');
    expect(nyc.year).toBe(2021);
    expect(nyc.candidates).toEqual(NYC_2021_DEM_MAYOR.candidates);
    expect(nyc.ballotCount).toBe(947932);
    expect(nyc.certifiedWinner).toBe('Eric L. Adams');
    expect(nyc.source).toBe('https://vote.nyc/page/election-results-summary');
  });

  it('405 with Allow: GET on other methods', () => {
    const r = handleElectionList('POST');
    expect(r.status).toBe(405);
    expect(r.headers).toEqual({ Allow: 'GET' });
    expect(r.body).toEqual({ error: 'Method not allowed' });
  });
});
