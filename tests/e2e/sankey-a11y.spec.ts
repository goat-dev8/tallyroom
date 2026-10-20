// Manual QA on /app (NYC 2021, round 1 -> 2), items 1-10. See audit/sankey-a11y/README.md.
import { test, expect, type Page, type Locator } from '@playwright/test';
const URL = '/app?election=nyc-2021-dem-mayor&round=1';
test.skip(({ viewport }) => (viewport?.width ?? 0) < 500, 'pointer and keyboard checks run on desktop');

async function open(page: Page) {
  await page.goto(URL);
  await expect(page.getByTestId('sankey')).toBeVisible({ timeout: 90_000 });
  await page.waitForTimeout(2000); // link draw-in animation
}
const links = (page: Page) => page.getByTestId('sankey-link');
/** Screen point at fraction t along a link's path. */
const pointAt = (l: Locator, t: number) => l.evaluate((p: SVGPathElement, t) => {
  const len = p.getTotalLength(); const q = p.getPointAtLength(len * t); const m = p.getScreenCTM()!;
  return { x: m.a * q.x + m.c * q.y + m.e, y: m.b * q.x + m.d * q.y + m.f };
}, t);
const active = (page: Page) => page.evaluate(() => document.activeElement?.getAttribute('data-testid') ?? document.activeElement?.tagName);
async function tabToFirstLink(page: Page) {
  await page.getByTestId('round-next').focus();
  for (let i = 0; i < 40 && (await active(page)) !== 'sankey-link'; i++) await page.keyboard.press('Tab');
  expect(await active(page)).toBe('sankey-link');
}
const lum = (rgb: string) => { const [r, g, b] = rgb.match(/\d+/g)!.slice(0, 3).map(Number).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };

test('1 focus ring follows the curve, not a bounding box', async ({ page }) => {
  await open(page); await tabToFirstLink(page);
  const outline = await page.evaluate(() => getComputedStyle(document.activeElement!).outlineStyle);
  expect(outline).toBe('none');
  const ring = page.getByTestId('sankey-focus'); await expect(ring).toHaveCount(1);
  expect(await ring.getAttribute('d')).toBe(await page.evaluate(() => document.activeElement!.getAttribute('d')));
});

test('2 arrow keys move between flows and each focused flow is scrolled into view', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 520 });
  await open(page); await tabToFirstLink(page);
  const n = await links(page).count(); const seen = new Set<string>();
  for (let i = 0; i < n; i++) {
    const label = await page.evaluate(() => document.activeElement!.getAttribute('aria-label')!); seen.add(label);
    const el = page.locator('[data-testid="sankey-link"]:focus');
    for (const t of [0.15, 0.85]) { const p = await pointAt(el, t); expect(p.y, label).toBeGreaterThanOrEqual(0); expect(p.y, label).toBeLessThanOrEqual(520); }
    await page.keyboard.press('ArrowDown');
  }
  expect(seen.size).toBe(n);
});

test('3 one Tab leaves the diagram; the list toggle and the table follow; Shift+Tab comes back', async ({ page }) => {
  await open(page); await tabToFirstLink(page);
  await page.keyboard.press('Tab'); expect(await active(page)).toBe('transfer-toggle');
  await page.keyboard.press('Tab'); expect(await active(page)).toBe('rounds-table-region');
  await page.keyboard.press('Shift+Tab'); expect(await active(page)).toBe('transfer-toggle');
  await page.keyboard.press('Shift+Tab'); expect(await active(page)).toBe('sankey-link');
  await page.keyboard.press('Shift+Tab'); expect(await active(page)).not.toBe('sankey-link');
});

test('4 round bars show a tooltip on hover', async ({ page }) => {
  await open(page);
  const row = page.locator('[data-testid="candidate-row"][data-candidate="Eric L. Adams"]');
  await row.getByTestId('bar-track').hover();
  const tip = row.getByTestId('bar-tooltip'); await expect(tip).toBeVisible(); await expect(tip).toContainText('289,403');
});

test('5 sankey nodes show a tooltip on hover', async ({ page }) => {
  await open(page);
  await page.locator('[data-testid="sankey-node"][data-node="b:Eric L. Adams"] rect').first().hover({ force: true });
  const tip = page.getByTestId('sankey-tooltip'); await expect(tip).toBeVisible(); await expect(tip).toContainText('Eric L. Adams'); await expect(tip).toContainText('289,603');
});

test('6 one pointer move onto a flow shows its tooltip', async ({ page }) => {
  await open(page);
  const l = links(page).first(); await page.getByTestId('sankey').scrollIntoViewIfNeeded(); const p = await pointAt(l, 0.5);
  await page.mouse.move(5, 5); await page.mouse.move(p.x, p.y, { steps: 1 });
  await expect(page.getByTestId('sankey-tooltip')).toBeVisible({ timeout: 1000 });
});

test('7 keyboard tooltip sits at the flow, next to its destination', async ({ page }) => {
  await open(page); await tabToFirstLink(page);
  for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowDown');
  const el = page.locator('[data-testid="sankey-link"]:focus'); const end = await pointAt(el, 0.92);
  const tip = (await page.getByTestId('sankey-tooltip').boundingBox())!;
  expect(Math.abs(tip.x + tip.width / 2 - end.x)).toBeLessThan(60);
  expect(end.y - (tip.y + tip.height)).toBeGreaterThan(0); expect(end.y - (tip.y + tip.height)).toBeLessThan(40);
});

test('8 node labels do not overlap and have a halo over flows', async ({ page }) => {
  await open(page);
  const boxes = await page.locator('[data-testid="sankey-node"] text').evaluateAll(ts => ts.map(t => { const b = t.getBoundingClientRect(); return { l: b.left < innerWidth / 2, y0: b.top, y1: b.bottom, halo: getComputedStyle(t).paintOrder.startsWith('stroke') && getComputedStyle(t).strokeWidth !== '0px', name: t.textContent }; }));
  for (const side of [true, false]) {
    const col = boxes.filter(b => b.l === side).sort((a, b) => a.y0 - b.y0);
    for (let i = 1; i < col.length; i++) expect(col[i].y0, `${col[i - 1].name} / ${col[i].name}`).toBeGreaterThanOrEqual(col[i - 1].y1 - 1);
  }
  expect(boxes.every(b => b.halo)).toBe(true);
});

test('9 thin flows have a wide invisible hit path', async ({ page }) => {
  await open(page);
  const widths = await links(page).evaluateAll(ls => ls.map(l => Number(getComputedStyle(l).strokeWidth.replace('px', '')) / 1));
  expect(Math.min(...widths)).toBeGreaterThanOrEqual(10);
  const thin = links(page).last(); await page.getByTestId('sankey').evaluate(e => e.scrollIntoView({ block: 'end' })); const p = await pointAt(thin, 0.5);
  await page.mouse.move(p.x, p.y + 4);
  await expect(page.getByTestId('sankey-tooltip')).toBeVisible({ timeout: 1000 });
});

test('10 round tabs R2-R8 meet 7:1 contrast at 10-11px', async ({ page }) => {
  await open(page);
  for (const r of [2, 5, 8]) {
    const c = await page.getByTestId(`dash-rail-r${r}`).evaluate(e => getComputedStyle(e).color);
    const ratio = (lum(c) + 0.05) / (lum('rgb(14,16,19)') + 0.05);
    expect(ratio, `R${r} ${c}`).toBeGreaterThanOrEqual(7);
  }
});
