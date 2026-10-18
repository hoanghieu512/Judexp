// Everything the smoke tests ask of the phone outside the app's screen: its Preferences and
// pending reminders (run-as, debug builds only), the kho folder on storage, the debug-only
// "show this reminder now" receiver, and pulling the notification shade down.
import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { khoFromPrefs, parseAdbDevices, parsePending } from './parse.ts';
import type { KhoSetup, PendingReminder } from './parse.ts';

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

  /** Push every fixture event the kho does not hold yet; returns how many were pushed. */
  seed(kho: KhoSetup): number {
    const events = `${kho.path}/events`;
    const there = new Set(this.shell(`ls ${events}`).split('\n').map((s) => s.trim()));
    let pushed = 0;
    for (const file of readdirSync(FIXTURES).filter((f) => f.endsWith('.json'))) {
      if (there.has(file)) continue;
      adb(['-s', this.serial, 'push', join(FIXTURES, file), `${events}/${file}`]);
      pushed++;
    }
    return pushed;
  }

  /** How many event files in the kho name this entity key. */
  eventsFor(kho: KhoSetup, key: string): number {
    const out = this.shell(`grep -l '"key":"${key}"' ${kho.path}/events/*.json 2>/dev/null | wc -l`);
    return Number(out.trim()) || 0;
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

  /** Show a pending reminder's notification now, through the debug-only receiver. */
  showReminderNow(reminderId: string): void {
    const out = this.shell(`am broadcast -n ${APP_ID}/.ReminderShowNowReceiver --es reminderId '${reminderId}'`);
    if (!/result=0/.test(out)) throw new Error(`receiver debug không nhận lệnh (cài APK debug chưa?): ${out.trim()}`);
  }

  /** Pull the notification shade down; the engine's screen then sees its notifications. */
  async openShade(): Promise<void> {
    this.shell('cmd statusbar expand-notifications');
    await sleep(800);
  }

  closeShade(): void {
    this.shell('cmd statusbar collapse');
  }

  /**
   * The newest event file for `key`, parsed. File names start with the time they were written,
   * so the last one by name is the newest.
   */
  latestEventFor(kho: KhoSetup, key: string): { verdict?: string | null; source?: { kind?: string } } | null {
    const files = this.shell(`grep -l '"key":"${key}"' ${kho.path}/events/*.json 2>/dev/null`)
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.endsWith('.json'))
      .sort();
    const newest = files.at(-1);
    return newest ? JSON.parse(this.shell(`cat '${newest}'`)) : null;
  }

  /** Wait until the kho holds `count` event files for `key`; returns the last count read. */
  async eventsReach(kho: KhoSetup, key: string, count: number, timeoutMs = 20000): Promise<number> {
    const end = Date.now() + timeoutMs;
    for (;;) {
      const n = this.eventsFor(kho, key);
      if (n >= count || Date.now() > end) return n;
      await sleep(700);
    }
  }
}
