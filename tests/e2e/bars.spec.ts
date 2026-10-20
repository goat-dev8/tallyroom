import { test, expect } from '@playwright/test';
test('transfer segment equals the exact votes gained this round (NYC R8)', async ({ page }) => {
  await page.goto('/app?election=nyc-2021-dem-mayor&round=8');
  await expect(page.getByTestId('round-bars')).toHaveAttribute('data-round', '8', { timeout: 60_000 });
  const rows = page.getByTestId('candidate-row');
  await expect(rows.first()).toHaveAttribute('data-votes', '404513');
  await expect(rows.nth(1)).toHaveAttribute('data-votes', '397316');
  await expect(page.getByTestId('bar-gain').first()).toBeVisible();
  const gains = await page.getByTestId('bar-gain').allInnerTexts();
  expect(gains.every(g => /^\+[\d,]+$/.test(g))).toBe(true);
  await expect(page.getByTestId('winner-mark')).toHaveCount(1);
});
