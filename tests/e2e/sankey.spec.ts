import { test, expect } from '@playwright/test';
test('sankey is compact, ordered by votes, and the tooltip follows the pointer', async ({ page }, info) => {
  await page.goto('/app?election=alaska-2022-special&round=1');
  const svg = page.getByTestId('sankey'); await expect(svg).toBeVisible({ timeout: 60_000 });
  expect(Number(await svg.getAttribute('data-height'))).toBeLessThanOrEqual(300);
  const ids = await page.getByTestId('sankey-node').evaluateAll(n => n.map(x => ({ id: x.getAttribute('data-node')!, y: (x.querySelector('rect') as SVGRectElement).getBBox().y })));
  const y = (id: string) => ids.find(n => n.id === id)!.y;
  expect(y('b:Peltola, Mary S.')).toBeLessThan(y('b:Palin, Sarah'));
  test.skip(info.project.name.includes('390'), 'pointer hover is desktop-only');
  await page.waitForTimeout(1200);
  const link = page.getByTestId('sankey-link').first();
  await link.hover({ force: true }); const b = (await link.boundingBox())!; const px = b.x + b.width / 2 - 2, py = b.y + b.height / 2;
  await page.mouse.move(px + 2, py);
  await expect(page.getByTestId('sankey-tooltip')).toBeVisible();
  const t = (await page.getByTestId('sankey-tooltip').boundingBox())!;
  expect(Math.abs(t.x + t.width / 2 - (px + 2))).toBeLessThan(4);
  expect(py - (t.y + t.height)).toBeGreaterThan(4); expect(py - (t.y + t.height)).toBeLessThan(30);
  await page.mouse.move(5, 5); await expect(page.getByTestId('sankey-tooltip')).toHaveCount(0);
});
