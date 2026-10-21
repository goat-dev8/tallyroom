import { describe, it, expect } from 'vitest';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import { openApiDocument, TABULATE_EXAMPLES, handleOpenApi } from '../src/openapi.js';
import { handleTabulate } from '../src/api.js';
import { handleElectionList } from '../src/elections/http.js';
import { handleElectionRounds } from '../src/rounds-api.js';
import { handleReport } from '../src/report-api.js';

const doc = openApiDocument() as any;
const ajv = new (Ajv2020 as any)({ strict: false, allErrors: true });
ajv.addSchema({ $id: 'tallyroom', components: doc.components });
const check = (name: string, value: unknown) => {
  const v = ajv.getSchema(`tallyroom#/components/schemas/${name}`)!;
  const okay = v(value);
  if (!okay) throw new Error(`${name}: ${ajv.errorsText(v.errors)}`);
  return okay;
};
const post = (b: unknown) => handleTabulate('POST', JSON.stringify(b), { contentType: 'application/json' });

function routeFiles(dir: string, prefix = '/api'): string[] {
  return readdirSync(dir).flatMap(n => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) return routeFiles(p, `${prefix}/${n.replace(/^\[(.+)\]$/, '{$1}')}`);
    return n === 'route.ts' ? [prefix] : [];
  });
}

describe('OpenAPI document matches the running API', () => {
  it('is OpenAPI 3.1 and served at GET /api/openapi', () => {
    const r = handleOpenApi('GET');
    expect(r.status).toBe(200);
    expect((r.body as any).openapi).toBe('3.1.0');
    expect(handleOpenApi('DELETE').status).toBe(405);
  });
  it('documents exactly the route files under app/api', () => {
    expect(Object.keys(doc.paths).sort()).toEqual(routeFiles(join(__dirname, '../app/api')).sort());
  });
  it.each(Object.entries(TABULATE_EXAMPLES))('example "%s" returns 200 and fits the documented result schema', (name, ex) => {
    const r = post(ex); expect(r.status).toBe(200);
    check((ex as any).seats > 1 ? 'StvResult' : 'IrvResult', r.body);
    expect(Object.keys(doc.paths['/api/tabulate'].post.requestBody.content['application/json'].examples)).toContain(name);
  });
  it('the IRV example has a hand-checked answer: Cy out, Bo wins 6 to 5', () => {
    const b = post(TABULATE_EXAMPLES.irv).body as any;
    expect(b.rounds.map((r: any) => r.tallies)).toEqual([{ Ada: 5, Bo: 4, Cy: 2 }, { Ada: 5, Bo: 6 }]);
    expect(b.rounds[0].eliminated).toEqual(['Cy']);
    expect(b.winner).toBe('Bo');
  });
  it('error responses use the documented Error schema and documented status codes', () => {
    const cases: [unknown, string][] = [
      [{ ballots: '1,Zed', candidates: ['Ada'] }, '422'], [{ ballots: '1,A', rules: { overvote: 'nope' } }, '422'],
      [{ ballots: '1,A', rules: { colour: 1 } }, '400'], [{ ballots: '1,A', rules: 'nowhere-1999' }, '400'],
      [{ ballots: '1,A>B', seats: 5 }, '400'],
    ];
    for (const [body, status] of cases) {
      const r = post(body);
      expect(String(r.status)).toBe(status);
      expect(doc.paths['/api/tabulate'].post.responses).toHaveProperty(status);
      check('Error', r.body);
    }
  });
  it('elections, rounds and reports fit their schemas; every documented election id resolves', () => {
    const list = handleElectionList('GET').body as any;
    for (const e of list.elections) check('ElectionMetadata', e);
    const ids = doc.paths['/api/elections/{id}/rounds'].get.parameters[0].schema.enum as string[];
    for (const id of ids) expect(handleElectionRounds('GET', id).status).toBe(200);
    check('Report', handleReport('GET', { election: 'maine-2018-cd2' }).body);
  });
  it('rule enums are the values the validator accepts, and nothing else', () => {
    const ov = doc.components.schemas.Rules.properties.overvote.enum as string[];
    for (const o of ov) expect(post({ ballots: '1,A', rules: { overvote: o } }).status).toBe(200);
    expect(ov).toEqual(['exhaust', 'skip', 'continuing']);
  });
});
