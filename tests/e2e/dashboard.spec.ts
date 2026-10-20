import { test, expect } from '@playwright/test';
import { votes, watchErrors } from './helpers';

const ELECTIONS = [
  { slug: 'maine-2018-cd2', winner: 'Golden, Jared F.', rounds: 2, ballots: '296,077', final: { 'DEM Golden, Jared F.': 142440, 'REP Poliquin, Bruce': 138931 } },
  { slug: 'alaska-2022-special', winner: 'Peltola, Mary S.', rounds: 2, ballots: '192,289', final: { 'Peltola, Mary S.': 91266, 'Palin, Sarah': 86026 } },
  { slug: 'nyc-2021-dem-mayor', winner: 'Eric L. Adams', rounds: 8, ballots: '947,932', final: { 'Eric L. Adams': 404513, 'Kathryn A. Garcia': 397316 } },
];

for (const e of ELECTIONS) {
  test(`${e.slug}: certified winner, round count and final-round totals`, async ({ page }) => {
    const w = watchErrors(page);
    await page.goto('/app');
    await page.getByTestId(`election-${e.slug}`).click();
    await expect(page.getByTestId('kpi-winner')).toHaveText(e.winner, { timeout: 45_000 });
    await expect(page.getByTestId('kpi-rounds')).toHaveText(String(e.rounds));
    await expect(page.getByTestId('kpi-ballots')).toHaveText(e.ballots);
    await expect(page.getByTestId('parity-badge')).toBeVisible();
    await expect(page.getByTestId('dash-rail').getByRole('tab')).toHaveCount(e.rounds);
    await page.getByTestId(`dash-rail-r${e.rounds}`).click();
    await expect(page.getByTestId('round-title')).toHaveText(`Round ${e.rounds}`);
    for (const [name, v] of Object.entries(e.final)) await expect(votes(page, name)).toHaveAttribute('data-votes', String(v));
    await expect(page.getByTestId('winner-mark')).toHaveCount(1);
    await expect(page).toHaveURL(new RegExp(`election=${e.slug}&round=${e.rounds}`));
    w.assertClean();
  });
}

test('NYC is counted in a Web Worker', async ({ page }) => {
  const workers: string[] = []; page.on('worker', wk => workers.push(wk.url()));
  await page.goto('/app?election=nyc-2021-dem-mayor');
  await expect(page.getByTestId('kpi-winner')).toHaveText('Eric L. Adams', { timeout: 45_000 });
  expect(workers.length).toBeGreaterThan(0);
});

test('deep links: election + round, clamping, unknown election, URL sync', async ({ page }) => {
  await page.goto('/app?election=alaska-2022-special&round=1');
  await expect(page.getByTestId('dash-title')).toContainText('Alaska 2022');
  await expect(page.getByTestId('round-title')).toHaveText('Round 1');
  await expect(votes(page, 'Peltola, Mary S.')).toHaveAttribute('data-votes', '75799');
  await expect(page.getByTestId('eliminated')).toContainText('Begich');
  await page.getByTestId('round-next').click();
  await expect(page).toHaveURL(/election=alaska-2022-special&round=2/);
  await page.goto('/app?election=maine-2018-cd2&round=99');
  await expect(page.getByTestId('round-title')).toHaveText('Round 2');
  await page.goto('/app?election=atlantis-2099');
  await expect(page.getByTestId('dash-note')).toContainText('No election called');
  await expect(page.getByTestId('kpi-winner')).toHaveText('Golden, Jared F.');
  await page.goto('/app?election=upload');
  await expect(page.getByTestId('upload-panel')).toBeVisible();
  await expect(page.getByTestId('empty-state')).toBeVisible();
});

test('keyboard arrows step rounds on the dashboard', async ({ page }) => {
  await page.goto('/app?election=nyc-2021-dem-mayor&round=1');
  await expect(page.getByTestId('round-title')).toHaveText('Round 1', { timeout: 45_000 });
  await page.getByTestId('round-next').focus();
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
  await expect(page.getByTestId('round-title')).toHaveText('Round 3');
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByTestId('round-title')).toHaveText('Round 2');
});

test('Sankey tooltip shows an exact transfer count', async ({ page }) => {
  await page.goto('/app?election=maine-2018-cd2&round=1');
  const link = page.getByTestId('sankey-link').first();
  await expect(link).toBeAttached();
  await page.waitForTimeout(1200); // flows finish drawing
  await link.hover({ force: true });
  await expect(page.getByTestId('sankey-tooltip')).toBeVisible();
  await expect(page.getByTestId('sankey-tooltip')).toContainText(/\d[\d,]* ballots/);
  await link.focus();
  await expect(page.getByTestId('sankey-tooltip')).toBeVisible();
});

test.describe('upload', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/app'); await page.getByTestId('source-upload').click(); await expect(page.getByTestId('empty-state')).toBeVisible(); });

  test('valid IRV sample counts on the API', async ({ page }) => {
    await page.getByTestId('sample-irv').click();
    await page.getByTestId('run-count').click();
    await expect(page.getByTestId('kpi-winner')).toHaveText('Bob');
    await expect(page.getByTestId('kpi-rounds')).toHaveText('3');
    await expect(page.getByTestId('parity-badge')).toHaveCount(0);
  });

  test('valid CSV file via the file picker', async ({ page }) => {
    await page.getByTestId('file-input').setInputFiles({ name: 'ballots.csv', mimeType: 'text/csv', buffer: Buffer.from('3,X>Y\n2,Y>X\n2,Z>Y\n') });
    await expect(page.getByTestId('ballots-input')).toHaveValue('3,X>Y\n2,Y>X\n2,Z>Y\n');
    await page.getByTestId('run-count').click();
    await expect(page.getByTestId('kpi-winner')).toHaveText('Y');
  });

  test('invalid ballots show the API line error', async ({ page }) => {
    await page.getByTestId('ballots-input').fill('5,Alice>Bob\nnot a ballot\n');
    await page.getByTestId('run-count').click();
    await expect(page.getByTestId('error-state')).toBeVisible();
    await expect(page.getByTestId('error-message')).toHaveText('Line 2: expected "count,ranking"');
    await page.getByTestId('ballots-input').fill('0,Alice\n');
    await page.getByTestId('run-count').click();
    await expect(page.getByTestId('error-message')).toContainText('positive integer');
  });

  test('empty input and bad files are rejected before counting', async ({ page }) => {
    await page.getByTestId('ballots-input').fill('# only a comment\n\n');
    let calls = 0; page.on('request', r => { if (r.url().includes('/api/tabulate')) calls++; });
    await page.getByTestId('run-count').click();
    await expect(page.getByTestId('error-message')).toContainText('Add at least one ballot line');
    await page.getByTestId('file-input').setInputFiles({ name: 'empty.csv', mimeType: 'text/csv', buffer: Buffer.from('') });
    await expect(page.getByTestId('error-message')).toContainText('is empty');
    await page.getByTestId('file-input').setInputFiles({ name: 'photo.png', mimeType: 'image/png', buffer: Buffer.from([137, 80, 78, 71]) });
    await expect(page.getByTestId('error-message')).toContainText('not a text ballot file');
    expect(calls).toBe(0);
  });

  test('STV with 2 seats', async ({ page }) => {
    await page.getByTestId('sample-stv').click();
    await expect(page.getByTestId('seats-input')).toHaveValue('2');
    await page.getByTestId('run-count').click();
    await expect(page.getByTestId('stv-result')).toBeVisible();
    await expect(page.getByTestId('stv-winners')).toContainText('Alice');
    await expect(page.getByTestId('stv-winners')).toContainText('Bob');
    await expect(page.getByTestId('stv-seats')).toHaveText('2');
  });
});

test('arrow keys step rounds even when focus is on the page body', async ({ page }) => {
  await page.goto('/app?election=maine-2018-cd2');
  await expect(page.getByTestId('result')).toBeVisible({ timeout: 60000 });
  await page.locator('body').press('ArrowRight');
  await expect(page.getByTestId('round-title')).toHaveText('Round 2');
  await expect(page).toHaveURL(/round=2/);
  await page.locator('body').press('ArrowLeft');
  await expect(page.getByTestId('round-title')).toHaveText('Round 1');
  const golden = page.locator('[data-testid=table-row][data-candidate="DEM Golden, Jared F."]');
  await expect(golden.getByTestId('cell-r1')).toHaveText('132,013');
  await expect(golden.getByTestId('cell-r2')).toHaveText('142,440');
});
