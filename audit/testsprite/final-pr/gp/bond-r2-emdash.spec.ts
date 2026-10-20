import { test, expect } from '@playwright/test';
test('Bond R2 shows a plain em dash with the Eliminated title', async ({ page }) => {
  test.setTimeout(90000);
  await page.goto('http://localhost:3141/app?election=maine-2018-cd2');
  await expect(page.getByTestId('result')).toBeVisible({ timeout: 60000 });
  const row = page.locator('[data-testid=rounds-table] [data-candidate*="Bond"]');
  const c2 = row.getByTestId('cell-r2');
  await expect(c2).toHaveText('—');
  await expect(c2).toHaveAttribute('title', 'Eliminated');
  await expect(c2.getByTestId('cell-out')).toHaveText('—');
  await expect(row.getByTestId('cell-r1')).toHaveText('16,552');
  console.log('cell:', await c2.evaluate(e => e.outerHTML));
});
