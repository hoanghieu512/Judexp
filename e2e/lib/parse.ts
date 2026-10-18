// Pure readers for what adb hands back: device lists, the app's Preferences, pending.json, a
// uiautomator dump of the notification shade, and the labels the app gives its rows. Kept free of
// adb so `npm run unit` checks them without a phone.

export interface AdbDevice { serial: string; model: string; state: string }

/** `adb devices -l` → devices with their model (agent-device names a device by its model). */
export function parseAdbDevices(out: string): AdbDevice[] {
  const devices: AdbDevice[] = [];
  for (const line of out.split('\n')) {
    const m = /^(\S+)\s+(device|unauthorized|offline)\b(.*)$/.exec(line.trim());
    if (!m) continue;
    const model = /\bmodel:(\S+)/.exec(m[3])?.[1] ?? '';
    devices.push({ serial: m[1], model, state: m[2] });
  }
  return devices;
}

/** `dumpsys package <app>` → versionName, or null when the app is not installed. */
export function parseVersionName(dumpsys: string): string | null {
  return /versionName=(\S+)/.exec(dumpsys)?.[1] ?? null;
}

/** `dumpsys package <app>` → whether POST_NOTIFICATIONS is granted. */
export function notificationsGranted(dumpsys: string): boolean {
  return /android\.permission\.POST_NOTIFICATIONS: granted=true/.test(dumpsys);
}

const unescapeXml = (s: string): string =>
  s.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

/** One `<string name="…">` of a SharedPreferences XML (Capacitor Preferences), or null. */
export function prefString(xml: string, name: string): string | null {
  const m = new RegExp(`<string name="${name.replace(/\./g, '\\.')}">([^<]*)</string>`).exec(xml);
  return m ? unescapeXml(m[1]) : null;
}

export interface KhoSetup {
  /** SAF tree uri of the kho the app has open. */
  rootUri: string;
  /** Where that kho sits on the phone's storage, for adb. */
  path: string;
  /** The Syncthing folder id typed in Settings, when there is one. */
  folderId: string | null;
  /** Whether the app asks for a PIN when it opens. */
  pin: boolean;
}

/**
 * The kho the app has open, read from its Preferences file
 * (`shared_prefs/CapacitorStorage.xml`). Null when no kho was chosen yet.
 */
export function khoFromPrefs(xml: string): KhoSetup | null {
  const raw = prefString(xml, 'judexp.kho');
  if (!raw) return null;
  let rootUri: unknown;
  try {
    rootUri = (JSON.parse(raw) as { rootUri?: unknown }).rootUri;
  } catch {
    return null;
  }
  if (typeof rootUri !== 'string') return null;
  const path = pathFromTreeUri(rootUri);
  if (!path) return null;
  let folderId: string | null = null;
  const sync = prefString(xml, 'judexp.syncthing');
  if (sync) {
    try {
      const id = (JSON.parse(sync) as { folderId?: unknown }).folderId;
      if (typeof id === 'string' && id !== '') folderId = id;
    } catch {
      // A broken Syncthing setting says nothing about the kho.
    }
  }
  return { rootUri, path, folderId, pin: (prefString(xml, 'judexp.pin') ?? '') !== '' };
}

/**
 * `content://com.android.externalstorage.documents/tree/primary%3ADownload%2Fjudexp-gu` →
 * `/sdcard/Download/judexp-gu`. A removable volume (`1234-ABCD:…`) maps to `/storage/1234-ABCD/…`.
 */
export function pathFromTreeUri(uri: string): string | null {
  const m = /^content:\/\/com\.android\.externalstorage\.documents\/tree\/([^/]+)/.exec(uri);
  if (!m) return null;
  const doc = decodeURIComponent(m[1]);
  const colon = doc.indexOf(':');
  if (colon < 0) return null;
  const volume = doc.slice(0, colon);
  const rest = doc.slice(colon + 1);
  const base = volume === 'primary' ? '/sdcard' : `/storage/${volume}`;
  return rest === '' ? base : `${base}/${rest}`;
}

/** A kho that belongs to the Prod environment: e2e writes for good, so it never runs there. */
export function looksLikeProd(kho: KhoSetup): boolean {
  return /prod/i.test(kho.path) || /prod/i.test(kho.folderId ?? '');
}

export interface PendingReminder { id: string; key: string; label: string; notificationId: number }

/** The app's `files/pending.json` → its reminders; anything unreadable reads as none. */
export function parsePending(json: string): PendingReminder[] {
  try {
    const root = JSON.parse(json) as { reminders?: unknown };
    if (!Array.isArray(root.reminders)) return [];
    return root.reminders.filter(
      (r): r is PendingReminder =>
        typeof r === 'object' && r !== null && typeof (r as PendingReminder).id === 'string' && typeof (r as PendingReminder).key === 'string',
    );
  } catch {
    return [];
  }
}

export interface Box { x: number; y: number; width: number; height: number }

/**
 * Which of `boxes` belongs to the notification whose title sits at `title`: the nearest one that
 * starts no higher than the title's header and no lower than `reach` below the title. The shade
 * lists several notifications with the same buttons ("Expand", or a reminder's "Tốt"), and only
 * position tells them apart. Returns an index into `boxes`, or -1.
 */
export function nearestToTitle(title: Box, boxes: (Box | null)[], reach = 250): number {
  const header = title.y - 120;
  let best = -1;
  let bestGap = Infinity;
  boxes.forEach((b, i) => {
    if (!b || b.y < header || b.y > title.y + title.height + reach) return;
    const gap = Math.abs(b.y - title.y);
    if (gap < bestGap) {
      best = i;
      bestGap = gap;
    }
  });
  return best;
}

export type Colour = 'tốt' | 'tạm' | 'xấu' | 'chưa chấm';

export interface Row { name: string; colour: Colour; meetings: number }

/** A result row's label, "Mở 59H123456, xấu, 2 lần gặp, 2 ngày trước" → its parts. */
export function parseRow(label: string): Row | null {
  const m = /^Mở (.+?), (tốt|tạm|xấu|chưa chấm), (\d+) lần gặp(?:, .+)?$/.exec(label.trim());
  return m ? { name: m[1], colour: m[2] as Colour, meetings: Number(m[3]) } : null;
}
