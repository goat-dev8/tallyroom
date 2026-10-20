import { test, expect } from '@playwright/test';

// Independent review (cursor-round3-report N12-N14). Screenshots go to audit/bugs/review3/.
const shot = (name: string, info: { project: { name: string } }) => `audit/bugs/review3/${name}-${info.project.name}.png`;

test('BUG-038 (N12): the "Tallies (exact)" column shows exact fractions', async ({ page }, info) => {
  await page.goto('/app?election=upload');
  await page.getByTestId('ballots-input').fill('12,Alice>Bob>Cara\n6,Bob>Alice\n5,Cara>Dev\n4,Dev>Cara\n3,Bob>Cara\n2,Cara>Bob\n');
  await page.getByTestId('seats-input').fill('2');
  await page.getByTestId('run-count').click();
  const r2 = page.locator('[data-testid=stv-round][data-round="2"]'); await expect(r2).toBeVisible();
  // quota floor(32/3)+1 = 11; Alice's surplus 1 moves 12 × 1/12 to Bob: Bob 9 + 1 = 10, shown as the exact value 10/1 or 10.
  await expect(r2).toContainText('Bob: 10');
  await expect(r2.locator('td').nth(1)).not.toContainText('.0000');
  await page.screenshot({ path: shot('n12-stv-exact', info), fullPage: true });
});

for (const [id, slug, title] of [['alaska-2022', 'alaska-2022-special', 'Alaska'], ['nyc-2021', 'nyc-2021-dem-mayor', 'New York']] as const)
  test(`BUG-039 (N13): ?election=${id} (the API id) opens that election and keeps the round`, async ({ page }, info) => {
    await page.goto(`/app?election=${id}&round=2`);
    await expect(page.getByTestId('result')).toBeVisible({ timeout: 90_000 });
    await expect(page.getByTestId('round-title')).toHaveText('Round 2');
    await expect(page.locator('body')).toContainText(title);
    await expect(page).toHaveURL(new RegExp(`election=${slug}&round=2`));
    await page.screenshot({ path: shot(`n13-${id}`, info) });
  });

test('BUG-040 (N14): a winner with no votes is not said to hold a majority', async ({ page }, info) => {
  await page.goto('/app?election=upload');
  await page.getByTestId('ballots-input').fill('3,[Alice]\n');
  await page.getByTestId('run-count').click();
  const fin = page.getByTestId('sankey-final'); await expect(fin).toBeVisible();
  await expect(fin).not.toContainText('majority');
  await page.screenshot({ path: shot('n14-zero-vote-final', info) });
});
