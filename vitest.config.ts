import { defineConfig } from 'vitest/config';
// Unit and parity tests live in test/. Browser end-to-end tests (tests/e2e) run with Playwright, not Vitest.
export default defineConfig({ test: { include: ['test/**/*.test.ts'] } });
