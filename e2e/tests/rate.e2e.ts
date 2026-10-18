import { test, expect } from 'e2e';
import { Phone } from '../lib/adb.ts';
import { RATED, exact, lookup, readRow, rowWith, skipE2eReminders, verdictToggle } from './helpers.ts';

test('a quick rating writes one event to the kho and the plate turns bad', async ({ app, screen }) => {
  const phone = Phone.of();
  const kho = phone.kho();
  if (!kho) throw new Error('không đọc được kho app đang mở');

  await app.open();
  await skipE2eReminders(screen);
  const before = phone.eventsFor(kho, RATED);
  await lookup(screen, RATED);
  const { meetings } = await readRow(screen, RATED);

  await screen.getByRole('button', { name: exact('Chấm nhanh') }).tap();
  await screen.getByRole('textbox').first().fill(RATED);
  await phone.hideKeyboard();
  await verdictToggle(screen, 'Xấu').tap();
  await screen.getByRole('button', { name: exact('Lưu') }).tap();

  // The colour alone cannot tell a wrong verdict: earlier runs' bad ratings keep the plate bad
  // (two bad in the last five), so a save that wrote "ok" still showed red. Check the event.
  expect(await phone.eventsReach(kho, RATED, before + 1)).toBe(before + 1);
  const written = phone.latestEventFor(kho, RATED);
  expect(written?.verdict).toBe('bad');
  expect(written?.source?.kind).toBe('manual');

  await lookup(screen, RATED);
  await expect(rowWith(screen, RATED, 'xấu', meetings + 1)).toBeVisible();

  await skipE2eReminders(screen);
});
