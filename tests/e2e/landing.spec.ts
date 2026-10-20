import { test, expect } from '@playwright/test';
import { watchErrors } from './helpers';

test.describe('landing hero live demo', () => {
  test('counts Maine 2018 CD2 with the real engine and auto-plays', async ({ page }) => {
    const w = watchErrors(page);
    await page.goto('/');
    const demo = page.getByTestId('hero-demo');
    await expect(demo.getByTestId('round-bars')).toBeVisible();
    await expect(demo).toHaveAttribute('data-state', 'playing');
    await expect(page.getByTestId('demo-round')).toContainText('Round 1 of 2');
    await expect(demo.locator('[data-candidate="REP Poliquin, Bruce"]')).toHaveAttribute('data-votes', '134184');
    await expect(demo.locator('[data-candidate="DEM Golden, Jared F."]')).toHaveAttribute('data-votes', '132013');
    // auto-advance to the final round (hold is 2.8 s)
    await expect(page.getByTestId('demo-round')).toContainText('Round 2 of 2', { timeout: 8000 });
    await expect(page.getByTestId('demo-outcome')).toHaveText('Golden, Jared F.');
    await expect(page.getByTestId('demo-certified')).toBeVisible();
    w.assertClean();
  });

  test('pause, step, back and restart controls', async ({ page }) => {
    await page.goto('/');
    const demo = page.getByTestId('hero-demo');
    await expect(demo.getByTestId('round-bars')).toBeVisible();
    await page.getByTestId('demo-play').click();
    await expect(demo).toHaveAttribute('data-state', 'paused');
    const r0 = await demo.getAttribute('data-round');
    await page.waitForTimeout(3500); // paused: must not advance
    await expect(demo).toHaveAttribute('data-round', r0!);
    await page.getByTestId('demo-step').click();
    await expect(demo).toHaveAttribute('data-round', r0 === '1' ? '2' : '1');
    await page.getByTestId('demo-back').click();
    await expect(demo).toHaveAttribute('data-round', r0!);
    await page.getByTestId('demo-rail-r2').click();
    await expect(page.getByTestId('demo-round')).toContainText('Round 2 of 2');
    await expect(demo.locator('[data-candidate="DEM Golden, Jared F."]')).toHaveAttribute('data-votes', '142440');
    await expect(demo.locator('[data-candidate="REP Poliquin, Bruce"]')).toHaveAttribute('data-votes', '138931');
    await page.getByTestId('demo-restart').click();
    await expect(demo).toHaveAttribute('data-round', '1');
    await expect(demo).toHaveAttribute('data-state', 'playing');
  });

  test('keyboard: arrows step, space toggles, R restarts', async ({ page }) => {
    await page.goto('/');
    const demo = page.getByTestId('hero-demo');
    await expect(demo.getByTestId('round-bars')).toBeVisible();
    await page.getByTestId('demo-step').focus();
    await page.keyboard.press('ArrowRight');
    await expect(demo).toHaveAttribute('data-state', 'paused');
    const r = await demo.getAttribute('data-round');
    await page.keyboard.press('ArrowLeft');
    await expect(demo).not.toHaveAttribute('data-round', r!);
    await demo.focus(); await page.keyboard.press(' ');
    await expect(demo).toHaveAttribute('data-state', 'playing');
    await page.keyboard.press('r');
    await expect(demo).toHaveAttribute('data-round', '1');
    await page.getByTestId('demo-play').focus(); await page.keyboard.press('Enter');
    await expect(demo).toHaveAttribute('data-state', 'paused');
  });

  test('majority line sits exactly at 50% of continuing ballots, and only the winner crosses it', async ({ page }) => {
    await page.goto('/');
    const demo = page.getByTestId('hero-demo');
    await expect(demo.getByTestId('round-bars')).toBeVisible();
    await page.getByTestId('demo-play').click();
    for (const round of ['1', '2']) {
      await page.getByTestId(`demo-rail-r${round}`).click();
      await page.waitForTimeout(1200); // let bars settle
      const m = await demo.evaluate(el => {
        const line = el.querySelector('[data-testid="majority-line"]')!; const track = line.parentElement!;
        const l = line.getBoundingClientRect(), t = track.getBoundingClientRect();
        const rows = [...el.querySelectorAll('[data-testid="candidate-row"]')].map(row => {
          const bar = row.querySelector('div.relative > div') as HTMLElement; const b = bar.getBoundingClientRect(); const tr = bar.parentElement!.getBoundingClientRect();
          return { name: row.getAttribute('data-candidate'), votes: Number(row.getAttribute('data-votes')), frac: (b.right - tr.left) / tr.width };
        });
        return { off: (l.left + l.width / 2 - t.left) / t.width, rows };
      });
      expect(Math.abs(m.off - 0.5)).toBeLessThan(0.004);
      const cont = round === '1' ? 289624 : 281371;
      for (const r of m.rows) expect(Math.abs(r.frac - r.votes / cont)).toBeLessThan(0.006);
      const crossing = m.rows.filter(r => r.frac > 0.5).map(r => r.name);
      expect(crossing).toEqual(round === '1' ? [] : ['DEM Golden, Jared F.']);
    }
  });

  test('parity ledger shows the certified figures and deep-links into the dashboard', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('parity-maine-2018-cd2')).toContainText('Golden 142,440');
    await expect(page.getByTestId('parity-alaska-2022-special')).toContainText('Peltola 91,266');
    await expect(page.getByTestId('parity-nyc-2021-dem-mayor')).toContainText('Adams 404,513');
    await expect(page.getByTestId('parity-nyc-2021-dem-mayor')).toContainText('Garcia 397,316');
    await expect(page.getByTestId('parity-open-alaska-2022-special')).toHaveAttribute('href', '/app?election=alaska-2022-special&round=2');
    await expect(page.getByTestId('rulebook')).toContainText('two in a row exhaust');
  });

  test('no horizontal overflow and nav works', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('hero-demo').getByTestId('round-bars')).toBeVisible();
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(over).toBeLessThanOrEqual(0);
    // nothing in the hero is clipped by the viewport edge
    const vw = page.viewportSize()!.width;
    for (const sel of ['h1', 'main section:first-of-type p', '[data-testid="hero-demo"]', '[data-testid="cta-count"]']) {
      const boxes = await page.locator(sel).evaluateAll(els => els.map(e => e.getBoundingClientRect().right));
      for (const r of boxes) expect(r).toBeLessThanOrEqual(vw + 0.5);
    }
    await page.getByTestId('nav-dashboard').click();
    await expect(page).toHaveURL(/\/app/);
    await expect(page.getByTestId('kpi-winner')).toHaveText('Golden, Jared F.');
  });
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('no autoplay, static visuals, everything readable', async ({ page }) => {
    const w = watchErrors(page);
    await page.goto('/');
    const demo = page.getByTestId('hero-demo');
    await expect(demo.getByTestId('round-bars')).toBeVisible();
    await page.waitForTimeout(3500);
    await expect(demo).toHaveAttribute('data-state', 'paused');
    await expect(demo).toHaveAttribute('data-round', '1');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('h1')).toHaveCSS('visibility', 'visible');
    await expect(page.getByTestId('threads-bg')).toHaveAttribute('data-on', 'false');
    const visual = page.getByTestId('hero-visual');
    if (await visual.isVisible()) await expect(visual).toHaveAttribute('data-mode', 'svg');
    // the count scene keeps its final static state (B wins)
    await expect(page.getByTestId('count-scene')).toContainText('49');
    await page.getByTestId('demo-step').click();
    await expect(demo).toHaveAttribute('data-round', '2');
    w.assertClean();
  });
});
