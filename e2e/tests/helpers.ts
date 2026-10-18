// Shared steps for the smoke tests. Rule (from Gu Library): typing, tapping and every check go
// through exact labels; nothing here asks the model.
import { expect } from 'e2e';
import type { Locator, Screen } from 'e2e';
import { Phone } from '../lib/adb.ts';
import { nearestToTitle, parseRow } from '../lib/parse.ts';
import type { Box, Row } from '../lib/parse.ts';

const esc = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const centreOf = (b: Box) => ({ x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height / 2) });

/** Exact, anchored match for a label (locator name matching is otherwise loose). */
export const exact = (s: string): RegExp => new RegExp(`^${esc(s)}$`);

// The plates kept for e2e. Province 00 does not exist, so they never meet a real plate and read
// as test data in the QA kho. They gather history run after run, so checks hold whatever a run
// before left behind: a colour that one rating decides, a count that grows by one.
/** Seeded by preflight, never rated by any test. */
export const UNRATED = '00E000001';
/** Seeded rated; the rating test adds a bad rating each run. */
export const RATED = '00E000002';
/** Rated "Tốt" through a notification each run. */
export const REMINDED = '00E000003';
/** One character off the plates above, met by no one. */
export const NEAR = '00E000009';
/** Any of the plates above, which a lookup of NEAR lists as near plates. */
export const KNOWN = /^Mở 00E00000[1-8], /;

/** A whole plate never met, drawn fresh so no run inherits another's lookup. */
export const neverMet = (): string => `00E9${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}`;

/** The search box of Tra cứu (the only text box on that screen). */
const searchBox = (screen: Screen): Locator => screen.getByRole('textbox').first();

export async function toLookup(screen: Screen): Promise<void> {
  await screen.getByRole('button', { name: exact('Tra cứu') }).tap();
}

/**
 * Type into Tra cứu's box, replacing what was there, then put the keyboard away: rows it covers
 * drop out of the accessibility tree (seen: the third near plate under Gboard on UBS1).
 */
export async function lookup(screen: Screen, text: string): Promise<void> {
  await toLookup(screen);
  await searchBox(screen).fill(text);
  await Phone.of().hideKeyboard();
}

/**
 * A verdict button of Chấm nhanh. It carries aria-pressed, which the Android WebView turns into a
 * switch named by its text ("Xấu"), not by its aria-label ("Chấm xấu"); both are accepted.
 */
export const verdictToggle = (screen: Screen, verdict: 'Tốt' | 'Ổn' | 'Xấu'): Locator =>
  screen.getByRole('switch', { name: new RegExp(`^(Chấm )?${verdict}$`, 'iu') });

/** A result row by its plate ("Mở 00E000002, xấu, 3 lần gặp, hôm nay"). */
export const row = (screen: Screen, plate: string): Locator =>
  screen.getByRole('button', { name: new RegExp(`^Mở ${esc(plate)}, `) }).first();

/** A result row whose label says this colour and this many meetings. */
export const rowWith = (screen: Screen, plate: string, colour: string, meetings?: number): Locator =>
  screen.getByRole('button', { name: new RegExp(`^Mở ${esc(plate)}, ${colour}, ${meetings ?? '\\d+'} lần gặp`) }).first();

export async function readRow(screen: Screen, plate: string): Promise<Row> {
  const r = row(screen, plate);
  await expect(r).toBeVisible();
  const label = (await r.textContent()) ?? '';
  const parsed = parseRow(label);
  if (!parsed) throw new Error(`nhãn dòng kết quả lạ: "${label}"`);
  return parsed;
}

/**
 * Tap `button` on the notification titled `title`, through the engine's own screen: it sees the
 * shade's windows (a uiautomator dump cannot run beside it), and the button is told apart from
 * other notifications' by its place under the title. A collapsed notification is expanded first.
 */
export async function tapNotificationButton(screen: Screen, phone: Phone, title: string, button: string): Promise<void> {
  await phone.openShade();
  try {
    const heading = screen.getByText(exact(title));
    await expect(heading).toBeVisible();
    const titleBox = await heading.boundingBox();
    if (!titleBox) throw new Error(`không đọc được vị trí thông báo "${title}"`);
    for (let attempt = 0; attempt < 2; attempt++) {
      // Tapped by position: a locator tap refuses, the shade being drawn over the app's window.
      const buttons = await Promise.all((await screen.getByRole('button', { name: exact(button) }).all()).map((b) => b.boundingBox()));
      const i = nearestToTitle(titleBox, buttons);
      if (i >= 0) {
        await screen.tapAt(centreOf(buttons[i]!));
        return;
      }
      const expands = await Promise.all((await screen.getByRole('button', { name: /^(Expand|Mở rộng)$/ }).all()).map((b) => b.boundingBox()));
      const e = nearestToTitle(titleBox, expands);
      if (e < 0) break;
      await screen.tapAt(centreOf(expands[e]!));
      await sleep(600);
    }
    throw new Error(`không thấy nút "${button}" trên thông báo "${title}"`);
  } finally {
    await sleep(500);
    phone.closeShade();
  }
}

/**
 * Answer "Không đi" to every pending reminder on an e2e plate. A finished lookup always leaves
 * one, and left alone it would ring on the test phone 90 minutes later. "Không đi" writes nothing
 * to the kho. Chờ chấm only shows while the search box is empty.
 */
export async function skipE2eReminders(screen: Screen): Promise<void> {
  await toLookup(screen);
  await searchBox(screen).clear();
  for (let i = 0; i < 12; i++) {
    const skip = screen.getByRole('button', { name: /^Không đi 00E/ }).first();
    const shown = await skip.waitFor({ timeout: i === 0 ? 3000 : 1500 }).then(() => true, () => false);
    if (!shown) return;
    await skip.tap();
    await sleep(600);
  }
  throw new Error('vẫn còn nhắc 00E sau 12 lần bấm "Không đi"');
}
