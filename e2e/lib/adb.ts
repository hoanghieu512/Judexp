// Everything the smoke tests ask of the phone outside the app's screen: its Preferences, pending
// reminders and queued answers (run-as, debug builds only), the kho folder on storage, the
// debug-only receiver that fires a scheduled reminder now, the keyboard, and the shade.
import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { broadcastResult, khoFromPrefs, parseAdbDevices, parseAnswer, parsePending, shellQuote as q, topResumedPackage } from './parse.ts';
import type { KhoSetup, PendingReminder, QueuedAnswer } from './parse.ts';

export const APP_ID = 'com.judexp.app';
export const FIXTURES = join(import.meta.dirname, '..', 'fixtures', 'events');

const ADB = process.env.ANDROID_HOME ? join(process.env.ANDROID_HOME, 'platform-tools', 'adb') : 'adb';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Run adb; throws with adb's own message on failure. */
export function adb(args: string[]): string {
  return execFileSync(ADB, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

/** The serial of the device whose adb model is `model`, or null. */
export function serialOf(model: string): string | null {
  return parseAdbDevices(adb(['devices', '-l'])).find((d) => d.model === model && d.state === 'device')?.serial ?? null;
}

/** What ReminderShowNowReceiver answers (android/app/src/debug). */
const SHOWN = 1;
const NOTHING_SCHEDULED = 2;

export class Phone {
  // A plain field: Node runs these files by stripping types, which has no parameter properties.
  readonly serial: string;

  constructor(serial: string) {
    this.serial = serial;
  }

  static of(model = process.env.E2E_DEVICE ?? 'UBS1'): Phone {
    const serial = serialOf(model);
    if (!serial) throw new Error(`không thấy máy "${model}" trong adb devices`);
    return new Phone(serial);
  }

  /** A device shell command. Every value put into it goes through `q`. */
  shell(command: string): string {
    return adb(['-s', this.serial, 'shell', command]);
  }

  /**
   * Put the keyboard away. Gboard covers the lower half, and what it covers drops out of the
   * accessibility tree (the rating buttons under the plate field, seen on UBS1). Back while the
   * keyboard is up only closes the keyboard: the keyboard takes the key, the app never sees it.
   */
  async hideKeyboard(): Promise<void> {
    if (!/mInputShown=true/.test(this.shell('dumpsys input_method'))) return;
    this.shell('input keyevent 4');
    await sleep(600);
  }

  /** A raw touch at a screen point, outside the engine (which refuses taps that leave the app). */
  tap(point: { x: number; y: number }): void {
    this.shell(`input tap ${Math.round(point.x)} ${Math.round(point.y)}`);
  }

  pressHome(): void {
    this.shell('input keyevent 3');
  }

  /** Whether the app is the activity on top, resumed. */
  appInForeground(): boolean {
    return topResumedPackage(this.shell('dumpsys activity activities')) === APP_ID;
  }

  /** A file in the app's private storage (run-as works on debug builds only), or null. */
  appFile(path: string): string | null {
    try {
      return adb(['-s', this.serial, 'shell', 'run-as', APP_ID, 'cat', path]);
    } catch {
      return null;
    }
  }

  kho(): KhoSetup | null {
    const xml = this.appFile('shared_prefs/CapacitorStorage.xml');
    return xml ? khoFromPrefs(xml) : null;
  }

  pending(): PendingReminder[] {
    return parsePending(this.appFile('files/pending.json') ?? '');
  }

  /** The answers a notification button queued and the app has not settled yet. */
  answers(): QueuedAnswer[] {
    let listed = '';
    try {
      listed = adb(['-s', this.serial, 'shell', 'run-as', APP_ID, 'ls', 'files/reminder-answers']);
    } catch {
      return []; // no folder yet: nothing answered
    }
    return listed
      .split('\n')
      .map((s) => s.trim())
      .filter((f) => f.endsWith('.json'))
      .map((f) => parseAnswer(this.appFile(`files/reminder-answers/${f}`) ?? ''))
      .filter((a): a is QueuedAnswer => a !== null);
  }

  /** Push every fixture event the kho does not hold yet; returns how many were pushed. */
  seed(kho: KhoSetup): number {
    const events = `${kho.path}/events`;
    const there = new Set(this.shell(`ls ${q(events)}`).split('\n').map((s) => s.trim()));
    let pushed = 0;
    for (const file of readdirSync(FIXTURES).filter((f) => f.endsWith('.json'))) {
      if (there.has(file)) continue;
      adb(['-s', this.serial, 'push', join(FIXTURES, file), `${events}/${file}`]);
      pushed++;
    }
    return pushed;
  }

  /** The kho's event files that name this entity key, as full paths. */
  eventFiles(kho: KhoSetup, key: string): string[] {
    const out = this.shell(`cd ${q(`${kho.path}/events`)} && grep -l ${q(`"key":"${key}"`)} -- *.json 2>/dev/null; true`);
    return out
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.endsWith('.json'))
      .map((f) => `${kho.path}/events/${f}`);
  }

  readEvent(path: string): { verdict?: string | null; type?: string; source?: { kind?: string } } {
    return JSON.parse(this.shell(`cat ${q(path)}`));
  }

  /**
   * Event files for `key` that were not in `before`, once at least one has appeared (or the time
   * is up). Compared by name set, not by sorting: a phone clock gone back to 2024 writes names
   * that sort before the old ones.
   */
  async newEventFiles(kho: KhoSetup, key: string, before: string[], timeoutMs = 20000): Promise<string[]> {
    const known = new Set(before);
    const end = Date.now() + timeoutMs;
    for (;;) {
      const added = this.eventFiles(kho, key).filter((f) => !known.has(f));
      if (added.length > 0 || Date.now() > end) return added;
      await sleep(700);
    }
  }

  /** Wait until a reminder for `key` is pending (a finished lookup saves one), and return it. */
  async reminderFor(key: string, timeoutMs = 15000): Promise<PendingReminder> {
    const end = Date.now() + timeoutMs;
    for (;;) {
      const r = this.pending().find((p) => p.key === key);
      if (r) return r;
      if (Date.now() > end) throw new Error(`không thấy nhắc nào cho ${key} trong pending.json`);
      await sleep(500);
    }
  }

  /**
   * Wait for the answer a notification button queued for this lookup. Matched on the lookup time
   * too: the reminder id is the same for every lookup of a plate, and an answer the app could not
   * settle (one for another kho) stays queued.
   */
  async answerFor(reminder: PendingReminder, timeoutMs = 10000): Promise<QueuedAnswer> {
    const end = Date.now() + timeoutMs;
    for (;;) {
      const a = this.answers().find((x) => x.reminderId === reminder.id && x.lookedUpAt === reminder.lookedUpAt);
      if (a) return a;
      if (Date.now() > end) throw new Error(`nút trên thông báo không ghi câu trả lời nào cho lần tra ${reminder.id} lúc ${reminder.lookedUpAt}`);
      await sleep(500);
    }
  }

  /**
   * Fire the alarm the app scheduled for this reminder now, through the debug-only receiver. The
   * app saves pending.json before it schedules, so "nothing scheduled" is retried for a moment;
   * after that it means schedule() never set the alarm.
   */
  async fireReminderNow(notificationId: number, timeoutMs = 10000): Promise<void> {
    const end = Date.now() + timeoutMs;
    for (;;) {
      const out = this.shell(`am broadcast -n ${q(`${APP_ID}/.ReminderShowNowReceiver`)} --ei notificationId ${notificationId}`);
      const code = broadcastResult(out);
      if (code === SHOWN) return;
      if (code !== NOTHING_SCHEDULED) throw new Error(`receiver debug không trả lời (APK không phải bản debug mới?): ${out.trim()}`);
      if (Date.now() > end) throw new Error(`app không hẹn alarm nào cho nhắc ${notificationId}: schedule() không chạy?`);
      await sleep(500);
    }
  }

  /** Pull the notification shade down; the engine's screen then sees its notifications. */
  async openShade(): Promise<void> {
    this.shell('cmd statusbar expand-notifications');
    await sleep(800);
  }

  closeShade(): void {
    this.shell('cmd statusbar collapse');
  }
}
