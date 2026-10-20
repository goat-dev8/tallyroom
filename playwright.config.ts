import { defineConfig, devices } from '@playwright/test';
// BASE_URL=https://<preview>.vercel.app npx playwright test   (defaults to a local `next start` on :3100)
export default defineConfig({
  testDir: 'tests/e2e', timeout: 60_000, expect: { timeout: 20_000 }, fullyParallel: true, workers: 4, retries: 0,
  reporter: [['list'], ['json', { outputFile: process.env.PW_JSON ?? 'test-results/results.json' }]],
  use: { baseURL: process.env.BASE_URL ?? 'http://localhost:3100', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'desktop-1440', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile-390', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } },
  ],
});
