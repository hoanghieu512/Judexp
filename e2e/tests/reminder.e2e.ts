import { test, expect } from 'e2e';
import { Phone } from '../lib/adb.ts';
import { REMINDED, lookup, rowWith, skipE2eReminders, tapNotificationButton } from './helpers.ts';

test('a reminder answered on its notification becomes a rating the next time the app opens', async ({ app, screen }) => {
  const phone = Phone.of();
  const kho = phone.kho();
  if (!kho) throw new Error('không đọc được kho app đang mở');

  await app.open();
  await skipE2eReminders(screen);
  const before = phone.eventsFor(kho, REMINDED);

  // A whole plate left still in the box for 2.5 s is a finished lookup: it saves a reminder.
  await lookup(screen, REMINDED);
  const reminder = await phone.reminderFor(REMINDED);

  // Its alarm has a ten-minute window; the debug-only receiver shows it now, through the code
  // the alarm runs. The button answers without opening the app.
  phone.showReminderNow(reminder.id);
  await tapNotificationButton(screen, phone, `Chấm chuyến ${reminder.label}?`, 'Tốt');

  await app.open();
  const after = await phone.eventsReach(kho, REMINDED, before + 1);
  if (after !== before + 1) throw new Error(`câu trả lời trên thông báo không thành event: ${before} → ${after} event cho ${REMINDED}`);
  const written = phone.latestEventFor(kho, REMINDED);
  expect(written?.verdict).toBe('good');
  expect(written?.source?.kind).toBe('reminder');

  await lookup(screen, REMINDED);
  await expect(rowWith(screen, REMINDED, 'tốt')).toBeVisible();

  await skipE2eReminders(screen);
});
