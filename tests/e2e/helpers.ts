import { expect, type Page } from '@playwright/test';
/** Collects console errors and uncaught exceptions; call assertClean() at the end of a test. */
export function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(e.message));
  return { assertClean: () => expect(errors, errors.join('\n')).toEqual([]) };
}
export const votes = (page: Page, name: string) => page.locator(`[data-testid="candidate-row"][data-candidate="${name}"]`).first();
