// BUG-008 (audit/defects.md): the hero replay looped back to round 1, so it was often seen "stuck on round 1"
// and TestSprite ui:hero-autoplay failed (V3 eef98f7b). It now plays once and holds the certified result.
import { test, expect } from '@playwright/test';
test('BUG-008: hero replay holds on the certified final round', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('hero-demo').scrollIntoViewIfNeeded();
  await expect(page.getByTestId('demo-play')).toBeEnabled({ timeout: 30000 });
  await expect(page.getByTestId('hero-demo')).toHaveAttribute('data-round', '2', { timeout: 15000 });
  const seen: string[] = [];
  for (let i = 0; i < 24; i++) { seen.push((await page.getByTestId('hero-demo').getAttribute('data-round')) ?? '?'); await page.waitForTimeout(500); }
  expect(seen.join(''), 'data-round sampled every 0.5 s for 12 s after reaching round 2').toBe('2'.repeat(24));
  await expect(page.getByTestId('demo-outcome')).toHaveText('Golden, Jared F.');
});
