import { describe, it, expect } from 'vitest';
import { handleTabulate } from '../src/api.js';
import { handleOptions } from '../src/options.js';
import { MAINE_2018_CD2 as ME } from '../src/elections/maine-2018-cd2.js';
import { ALASKA_2022_SPECIAL as AK } from '../src/elections/alaska-2022-special.js';
import { NYC_2021_DEM_MAYOR as NYC } from '../src/elections/nyc-2021-dem-mayor.js';
import { BallotGroup, Mark } from '../src/types.js';
import { RULE_PRESETS } from '../src/presets.js';

function payload(groups: BallotGroup[], rules: unknown, candidates: string[]) {
  const token = (m: Mark) => (m.kind === 'candidate' ? m.name : m.kind === 'overvote' ? 'overvote' : 'undervote');
  return JSON.stringify({
    ballots: groups.map(g => ({ count: g.count, ranks: g.marks.map(token) })),
    candidates,
    rules,
  });
}

describe('named rule presets', () => {
  it('documents defaults and the three preset ids', () => {
    const body = handleOptions('GET').body as any;
    expect(body.defaults.rules).toEqual({ overvote: 'exhaust', skips: 'continue', duplicates: 'ignore', batch: false, tiebreak: 'previous-round' });
    expect(body.defaults.description).toContain('142,558');
    expect(body.defaults.description).toContain('139,113');
    expect(body.defaults.description).toContain('not the certified');
    expect(body.presets.ids).toEqual(['maine-2018', 'alaska-2022', 'nyc-2021']);
    expect(body.presets.sets['maine-2018']).toEqual(ME.rules);
    expect(body.presets.sets['alaska-2022']).toEqual(AK.rules);
    expect(body.presets.sets['nyc-2021']).toEqual(NYC.rules);
    expect(RULE_PRESETS['nyc-2021']).toEqual(NYC.rules);
  });

  it('maine-2018 matches the certified final; omitted rules do not', () => {
    const groups = ME.load();
    const certified = handleTabulate('POST', payload(groups, 'maine-2018', ME.candidates)) as any;
    expect(certified.status).toBe(200);
    expect(certified.body.rounds).toHaveLength(2);
    expect(certified.body.rounds[1].tallies).toEqual({ 'DEM Golden, Jared F.': 142440, 'REP Poliquin, Bruce': 138931 });
    expect(certified.body.winner).toBe('DEM Golden, Jared F.');
    expect(certified.body.rules).toMatchObject({ skips: 'two-exhaust', batch: true, tiebreak: 'lot' });

    const defaults = handleTabulate('POST', payload(groups, undefined, ME.candidates)) as any;
    expect(defaults.status).toBe(200);
    expect(defaults.body.rounds.at(-1).tallies).toEqual({ 'DEM Golden, Jared F.': 142558, 'REP Poliquin, Bruce': 139113 });
  });

  it('alaska-2022 preset matches the certified two-round count', () => {
    const r = handleTabulate('POST', payload(AK.load(), 'alaska-2022', AK.candidates)) as any;
    expect(r.status).toBe(200);
    expect(r.body.rounds).toHaveLength(2);
    expect(r.body.rounds[1].tallies).toEqual({ 'Palin, Sarah': 86026, 'Peltola, Mary S.': 91266 });
    expect(r.body.rules.duplicates).toBe('skip');
  });

  it('rejects an unknown preset id', () => {
    const r = handleTabulate('POST', JSON.stringify({ ballots: '1,A', rules: 'not-a-preset' }));
    expect(r.status).toBe(400);
    expect(r.body).toEqual({ error: 'Unknown rules preset "not-a-preset". Expected maine-2018, alaska-2022, nyc-2021' });
  });
});
