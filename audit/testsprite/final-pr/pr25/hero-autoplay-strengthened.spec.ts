import { test, expect } from '@playwright/test';
// Mirrors the strengthened ui:hero-autoplay plan.
test('ui:hero-autoplay (strengthened)', async ({ page }) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(process.env.U!);
  const demo = page.getByTestId('hero-demo');
  await demo.scrollIntoViewIfNeeded();
  await expect(page.getByTestId('demo-play')).toBeEnabled({ timeout: 30000 });
  await expect(demo).toContainText('Maine 2018, U.S. House District 2');
  await expect(page.getByTestId('demo-round')).toHaveText(/Round 2 \/ 2/, { timeout: 15000 });
  const seen: string[] = [];
  for (let i = 0; i < 6; i++) { await page.waitForTimeout(2000); seen.push((await page.getByTestId('demo-round').innerText()).replace(/\s+/g, ' ')); }
  console.log('samples:', seen.join(' | '));
  expect(seen.filter(s => /Round 1 \//.test(s)), 'never back on round 1 over 12 s').toEqual([]);
  await expect(page.getByTestId('demo-outcome')).toHaveText('Golden, Jared F.');
  await expect(page.getByTestId('demo-certified')).toContainText('Matches the certified result');
});
