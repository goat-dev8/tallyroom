import { describe, it, expect } from 'vitest';
import { openApiDocument } from '../src/openapi.js';
import { handleReport } from '../src/report-api.js';
import { handleMcpHttp } from '../src/mcp.js';
import { handleTabulate } from '../src/api.js';

// BUG-020: statuses the handlers really return for documented operations must be listed in the spec.
const documented = (path: string, method: string) => Object.keys((openApiDocument() as any).paths[path][method].responses);
const big = 'a'.repeat(4 * 1024 * 1024 + 1);

describe('BUG-020: OpenAPI lists every status a documented operation returns', () => {
  const cases: [string, string, () => { status: number }][] = [
    ['/api/report', 'post', () => handleReport('POST', { rawBody: big, contentType: 'text/plain' })],
    ['/api/report', 'post', () => handleReport('POST', { rawBody: '{', contentType: 'application/json' })],
    ['/api/mcp', 'post', () => handleMcpHttp('POST', '{')],
    ['/api/mcp', 'post', () => handleMcpHttp('POST', '{"jsonrpc":"2.0","method":"notifications/initialized"}')],
    ['/api/tabulate', 'post', () => handleTabulate('POST', big, { contentType: 'text/plain' })],
    ['/api/tabulate', 'post', () => handleTabulate('GET', '', {})],
  ];
  for (const [path, method, call] of cases) {
    it(`${method.toUpperCase()} ${path} -> ${call().status} is documented`, () => {
      expect(documented(path, method)).toContain(String(call().status));
    });
  }
});
