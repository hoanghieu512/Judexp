import { test, expect, afterEach } from 'e2e';
import { Phone } from '../lib/adb.ts';
import { REMINDED, cleanUp, lookup, rowWith, skipE2eReminders, tapNotificationButton } from './helpers.ts';

afterEach(async ({ app, screen }) => cleanUp(app, screen));

test('a reminder answered on its notification, with the app away, becomes a rating when it opens', async ({ app, screen }) => {
  const phone = Phone.of();
  const kho = phone.kho();
  if (!kho) throw new Error('không đọc được kho app đang mở');

  await app.open();
  await skipE2eReminders(screen);
  const before = phone.eventFiles(kho, REMINDED);

  // A whole plate left still in the box for 2.5 s is a finished lookup: it saves a reminder and
  // schedules its alarm.
  await lookup(screen, REMINDED);
  const reminder = await phone.reminderFor(REMINDED);

  // The app goes away, as it does when huynh switches back to the ride app. Its alarm has a
  // ten-minute window; the debug-only receiver fires the very alarm schedule() set, now, and
  // fails when schedule() set none.
  phone.pressHome();
  await phone.fireReminderNow(reminder.notificationId);
  await tapNotificationButton(screen, phone, `Chấm chuyến ${reminder.label}?`, 'Tốt');

  // The button answered without opening the app: the answer waits in the queue, for this lookup
  // and this kho, until the app opens.
  expect(phone.appInForeground()).toBe(false);
  const answer = await phone.answerFor(reminder);
  expect(answer.answer).toBe('good');
  expect(answer.khoUri).toBe(reminder.khoUri);

  await app.open();
  const added = await phone.newEventFiles(kho, REMINDED, before);
  expect(added.length).toBe(1);
  const written = phone.readEvent(added[0]);
  expect(written.verdict).toBe('good');
  expect(written.source?.kind).toBe('reminder');
  expect(phone.answers().some((a) => a.reminderId === reminder.id && a.lookedUpAt === reminder.lookedUpAt)).toBe(false);

  await lookup(screen, REMINDED);
  await expect(rowWith(screen, REMINDED, 'tốt')).toBeVisible();
});
