import { describe, it, expect } from 'vitest';
import { ENGINE_VERSION } from '../src/api.js';
import { healthBody } from '../src/health.js';
import { GET } from '../app/api/health/route.js';

describe('GET /api/health', () => {
  it('keeps ok and engineVersion and adds status, version, and election ids', async () => {
    const body = healthBody();
    expect(body).toEqual({
      ok: true,
      engineVersion: ENGINE_VERSION,
      status: 'ok',
      version: ENGINE_VERSION,
      elections: ['maine-2018-cd2', 'alaska-2022', 'nyc-2021', 'burlington-2009'],
    });
    expect(body.version).toBe('0.1.0');
    expect(body.version).toBe(body.engineVersion);

    const res = GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(body);
  });
});
