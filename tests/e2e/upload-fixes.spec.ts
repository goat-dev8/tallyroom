// Regression guards for BUG-005..007 (audit/defects.md). Written first and run red against production.
import { test, expect } from '@playwright/test';

test.describe('upload errors and samples', () => {
  test('BUG-005: API errors show their message, not [object Object]', async ({ page }) => {
    await page.goto('/app?election=upload');
    await page.getByTestId('ballots-input').fill('5,Alice>Bob\nfoo,Bar');
    await page.getByTestId('run-count').click();
    await expect(page.getByTestId('error-message')).toHaveText('Line 2: count must be a positive integer');
    await page.getByTestId('ballots-input').fill('garbage line here');
    await page.getByTestId('run-count').click();
    await expect(page.getByTestId('error-message')).toHaveText('Line 1: expected "count,ranking"');
  });

  test('BUG-006: loading a sample clears the previous result and error', async ({ page }) => {
    await page.goto('/app?election=upload');
    await page.getByTestId('sample-irv').click();
    await page.getByTestId('run-count').click();
    await expect(page.getByTestId('result')).toBeVisible();
    await page.getByTestId('sample-stv').click();
    await expect(page.getByTestId('result')).toHaveCount(0);
    await page.getByTestId('ballots-input').fill('garbage line here');
    await page.getByTestId('run-count').click();
    await expect(page.getByTestId('error-state')).toBeVisible();
    await page.getByTestId('sample-irv').click();
    await expect(page.getByTestId('error-state')).toHaveCount(0);
  });

  test('guard: the sample CSV downloads as ballots.csv (manual-QA report, not reproduced in Chromium)', async ({ page }) => {
    await page.goto('/app?election=upload');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByTestId('sample-download').click()]);
    expect(dl.suggestedFilename()).toBe('ballots.csv');
  });
});

test('BUG-007: the 404 page has its own tab title', async ({ page }) => {
  await page.goto('/no-such-page');
  await expect(page.getByTestId('not-found')).toBeVisible();
  await expect(page).toHaveTitle(/not found/i);
});
