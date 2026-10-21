// Manual QA follow-up (fix/ui-polish). See audit/ui-polish/README.md.
import { test, expect } from '@playwright/test';
const desktop = (n: string) => !n.includes('390');

test('a copy-link toast overlays without layout shift and fades by itself', async ({ page, context }, info) => {
  test.skip(!desktop(info.project.name), 'desktop');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/app?election=maine-2018-cd2&round=2'); await expect(page.getByTestId('round-bars')).toBeVisible({ timeout: 90_000 });
  await page.waitForTimeout(1500); // KPI entrance animation
  const y0 = (await page.getByTestId('kpi-ballots').boundingBox())!.y;
  await page.getByTestId('copy-link').click();
  const toast = page.getByTestId('toast'); await expect(toast).toBeVisible(); await expect(toast).toHaveText(/Link copied/);
  expect((await page.getByTestId('kpi-ballots').boundingBox())!.y).toBe(y0);
  await expect(toast).toHaveCount(0, { timeout: 4000 });
});

test('b eliminated names are not cut off by the marker, and carry the full name', async ({ page }, info) => {
  test.skip(!desktop(info.project.name), 'desktop layout');
  await page.goto('/app?election=nyc-2021-dem-mayor&round=3'); await expect(page.getByTestId('round-bars')).toBeVisible({ timeout: 90_000 });
  const names = page.getByTestId('candidate-name');
  await expect(names.first()).toBeVisible();
  const cut = await names.evaluateAll(es => es.filter(e => e.scrollWidth > e.clientWidth + 1).map(e => e.textContent));
  expect(cut).toEqual([]);
  const row = page.locator('[data-testid="candidate-row"][data-candidate="Paperboy Love Prince"]');
  await expect(row.getByTestId('candidate-name')).toHaveAttribute('title', 'Paperboy Love Prince');
});

test('d switching elections keeps the layout height while counting', async ({ page }) => {
  await page.goto('/app?election=alaska-2022-special'); await expect(page.getByTestId('round-bars')).toBeVisible({ timeout: 90_000 });
  const h = () => page.evaluate(() => document.querySelector('main')!.getBoundingClientRect().height);
  const before = await h();
  await page.getByText('NYC mayor').first().click();
  const seen: number[] = []; for (let i = 0; i < 12; i++) { seen.push(await h()); await page.waitForTimeout(100); }
  expect(Math.min(...seen), JSON.stringify(seen)).toBeGreaterThanOrEqual(before * 0.95);
});

test('e seats field: clearing and typing works, no zoom-triggering font on mobile', async ({ page }, info) => {
  await page.goto('/app?election=upload'); const s = page.getByTestId('seats-input'); await expect(s).toBeVisible();
  await s.click(); await s.press('Control+a'); await s.press('Backspace'); expect(await s.inputValue()).toBe('');
  await s.pressSequentially('3'); expect(await s.inputValue()).toBe('3');
  await s.press('Backspace'); await s.pressSequentially('-'); expect(await s.inputValue()).not.toContain('-');
  await s.blur(); expect(await s.inputValue()).toBe('1');
  if (!desktop(info.project.name)) expect(parseFloat(await s.evaluate(e => getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(16);
});

test('g mobile has a menu that reaches every section link', async ({ page }, info) => {
  test.skip(desktop(info.project.name), 'mobile');
  await page.goto('/');
  const btn = page.getByTestId('nav-menu'); await expect(btn).toBeVisible(); await expect(btn).toHaveAttribute('aria-expanded', 'false');
  await btn.click(); await expect(btn).toHaveAttribute('aria-expanded', 'true');
  for (const id of ['parity', 'how', 'rules', 'api']) await expect(page.getByTestId(`mnav-${id}`)).toBeVisible();
  await page.getByTestId('mnav-rules').click(); await expect(page.getByTestId('nav-menu-panel')).toHaveCount(0);
  await expect(page).toHaveURL(/#rules$/);
});

test('i upload errors list every bad line, not only the first', async ({ page }) => {
  await page.goto('/app?election=upload'); await page.getByTestId('ballots-input').fill('3,A\nx,B\n2,C\n0,D');
  await page.getByTestId('run-count').click();
  const m = page.getByTestId('error-message'); await expect(m).toBeVisible();
  await expect(m).toContainText('Line 2'); await expect(m).toContainText('Line 4');
});

test('guard: /app at 400px has no horizontal scroll; footer links show a focus ring', async ({ page }) => {
  await page.setViewportSize({ width: 400, height: 860 });
  await page.goto('/app?election=nyc-2021-dem-mayor&round=3'); await expect(page.getByTestId('round-bars')).toBeVisible({ timeout: 90_000 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(400);
  await page.goto('/'); const f = page.locator('footer a').first(); await f.focus();
  expect(await f.evaluate(e => getComputedStyle(e).outlineStyle)).not.toBe('none');
});
