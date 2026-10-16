/**
 * Profile settings.
 *
 * This is called a profile, never a login: there is no server to
 * authenticate against. Choosing a profile means choosing which kho folder
 * to read, and the PIN only stops someone holding the unlocked phone. The
 * event files themselves are not encrypted, and the UI says so.
 */

import { Preferences } from '@capacitor/preferences';

export interface PrefsStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

/** The real store. Tests pass a fake instead of mocking the plugin. */
export const capacitorStore: PrefsStore = {
  async get(key) {
    return (await Preferences.get({ key })).value;
  },
  async set(key, value) {
    await Preferences.set({ key, value });
  },
  async remove(key) {
    await Preferences.remove({ key });
  },
};

const KEY_KHO = 'judexp.kho';
const KEY_DEVICE = 'judexp.device';
const KEY_PIN = 'judexp.pin';

export interface KhoChoice {
  /** SAF tree uri of the kho root, the folder Syncthing replicates. */
  rootUri: string;
  /** What to call it on screen, for example "QA" or "Prod huynh". */
  label: string;
}

export async function getKho(store: PrefsStore = capacitorStore): Promise<KhoChoice | null> {
  const raw = await store.get(KEY_KHO);
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<KhoChoice>;
    if (typeof value.rootUri !== 'string' || typeof value.label !== 'string') return null;
    return { rootUri: value.rootUri, label: value.label };
  } catch {
    return null;
  }
}

export async function setKho(choice: KhoChoice, store: PrefsStore = capacitorStore): Promise<void> {
  await store.set(KEY_KHO, JSON.stringify(choice));
}

/** Keep only what is safe inside an event file name. */
function sanitizeDeviceId(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * The device id goes into every event file name, so it is both an identity
 * and something a person reads. It starts as a random token and huynh can
 * replace it with a name like `zflip4` in Settings.
 */
export async function getDeviceId(store: PrefsStore = capacitorStore): Promise<string> {
  const existing = await store.get(KEY_DEVICE);
  if (existing) return existing;
  const generated = crypto.randomUUID().replace(/-/g, '').slice(0, 6);
  await store.set(KEY_DEVICE, generated);
  return generated;
}

export async function setDeviceId(name: string, store: PrefsStore = capacitorStore): Promise<void> {
  const clean = sanitizeDeviceId(name);
  if (clean === '') return;
  await store.set(KEY_DEVICE, clean);
}

export async function getPin(store: PrefsStore = capacitorStore): Promise<string | null> {
  return store.get(KEY_PIN);
}

export async function setPin(pin: string | null, store: PrefsStore = capacitorStore): Promise<void> {
  if (pin === null) await store.remove(KEY_PIN);
  else await store.set(KEY_PIN, pin);
}
