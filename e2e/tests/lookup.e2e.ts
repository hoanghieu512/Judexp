import { test, expect } from 'e2e';
import { KNOWN, NEAR, RATED, UNRATED, lookup, neverMet, readRow, skipE2eReminders } from './helpers.ts';

const NEVER_MET = /^Chưa gặp người này\./;

test('the decision card tells rated, never rated, never met, and keeps a near plate apart', async ({ app, screen }) => {
  await app.open();
  await skipE2eReminders(screen);

  await lookup(screen, UNRATED);
  expect((await readRow(screen, UNRATED)).colour).toBe('chưa chấm');

  await lookup(screen, RATED);
  const rated = (await readRow(screen, RATED)).colour;
  expect(rated === 'tốt' || rated === 'tạm' || rated === 'xấu').toBe(true);

  await lookup(screen, neverMet());
  await expect(screen.getByText(NEVER_MET)).toBeVisible();
  expect(await screen.getByRole('button', { name: /^Mở 00E9/ }).count()).toBe(0);

  // One character off a known plate is another vehicle: the answer is "never met", and the
  // known plate shows under its own heading, below it.
  await lookup(screen, NEAR);
  await expect(screen.getByText(NEVER_MET)).toBeVisible();
  // The WebView hands the CSS upper-casing of section titles to the accessibility tree too.
  const heading = screen.getByRole('heading', { name: /^biển gần giống, có thể là xe khác$/iu });
  await expect(heading).toBeVisible();
  // Which known plates show first depends on what earlier runs rated; any of them will do.
  const near = screen.getByRole('button', { name: KNOWN }).first();
  await expect(near).toBeVisible();
  const [h, r] = [await heading.boundingBox(), await near.boundingBox()];
  expect(h !== null && r !== null && r.y > h.y).toBe(true);

  await skipE2eReminders(screen);
});
