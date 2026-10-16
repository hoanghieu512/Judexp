import { describe, it, expect } from 'vitest';
import {
  getAuthor,
  khoLabelFromUri,
  getSyncConfig,
  setSyncConfig,
  getDeviceId,
  getKho,
  getPin,
  setAuthor,
  setDeviceId,
  setKho,
  setPin,
  type PrefsStore,
} from './settings';

function fakeStore(seed: Record<string, string> = {}): PrefsStore {
  const data = new Map(Object.entries(seed));
  return {
    async get(key) {
      return data.get(key) ?? null;
    },
    async set(key, value) {
      data.set(key, value);
    },
    async remove(key) {
      data.delete(key);
    },
  };
}

describe('kho choice', () => {
  it('returns null before any kho is chosen', async () => {
    expect(await getKho(fakeStore())).toBeNull();
  });

  it('round-trips the chosen kho', async () => {
    const store = fakeStore();
    await setKho({ rootUri: 'content://kho/huynh', label: 'Prod huynh' }, store);
    expect(await getKho(store)).toEqual({ rootUri: 'content://kho/huynh', label: 'Prod huynh' });
  });

  it('returns null when the stored value is not readable', async () => {
    expect(await getKho(fakeStore({ 'judexp.kho': '{broken' }))).toBeNull();
  });
});

describe('device id', () => {
  it('generates one on first use and keeps it', async () => {
    const store = fakeStore();
    const first = await getDeviceId(store);
    expect(first).toMatch(/^[a-z0-9]{6}$/);
    expect(await getDeviceId(store)).toBe(first);
  });

  it('accepts a name huynh typed, so event file names stay readable', async () => {
    const store = fakeStore();
    await setDeviceId('zflip4', store);
    expect(await getDeviceId(store)).toBe('zflip4');
  });

  it('strips characters that would break an event file name', async () => {
    const store = fakeStore();
    await setDeviceId('Z Flip 4 / huynh', store);
    expect(await getDeviceId(store)).toBe('zflip4huynh');
  });
});

describe('pin', () => {
  it('has no pin by default', async () => {
    expect(await getPin(fakeStore())).toBeNull();
  });

  it('round-trips a pin and clears it with null', async () => {
    const store = fakeStore();
    await setPin('1234', store);
    expect(await getPin(store)).toBe('1234');
    await setPin(null, store);
    expect(await getPin(store)).toBeNull();
  });
});

describe('author', () => {
  it('falls back to the kho label so the first event is not written by nobody', async () => {
    const store = fakeStore();
    await setKho({ rootUri: 'content://kho/Hieu', label: 'Hieu' }, store);
    expect(await getAuthor(store)).toBe('hieu');
  });

  it('is empty when no kho has been chosen yet', async () => {
    expect(await getAuthor(fakeStore())).toBe('');
  });

  it('keeps an author huynh set explicitly, even if the kho label differs', async () => {
    const store = fakeStore();
    await setKho({ rootUri: 'content://kho/Hieu', label: 'Hieu' }, store);
    await setAuthor('gu', store);
    expect(await getAuthor(store)).toBe('gu');
  });
});

describe('khoLabelFromUri', () => {
  it('reads the profile folder out of a SAF tree uri', () => {
    const uri = 'content://com.android.externalstorage.documents/tree/primary%3AJudexp%2FHieu%2Fkho';
    expect(khoLabelFromUri(uri)).toBe('Hieu');
  });

  it('uses the last segment when the folder is not called kho', () => {
    const uri = 'content://com.android.externalstorage.documents/tree/primary%3AJudexp%2FGu';
    expect(khoLabelFromUri(uri)).toBe('Gu');
  });

  it('never returns an empty label, whatever the uri looks like', () => {
    expect(khoLabelFromUri('content://whatever')).toBe('whatever');
    expect(khoLabelFromUri('')).toBe('kho');
  });
});

describe('syncthing config', () => {
  it('starts empty, with the local Syncthing address already filled in', async () => {
    const cfg = await getSyncConfig(fakeStore());
    // https, because cleartext to localhost is blocked from targetSdk 28 up,
    // and the lifted SyncthingPlugin already trusts the localhost certificate.
    expect(cfg.baseUrl).toBe('https://127.0.0.1:8384');
    expect(cfg.apiKey).toBe('');
    expect(cfg.atommanDeviceId).toBe('');
  });

  it('round-trips what huynh typed', async () => {
    const store = fakeStore();
    await setSyncConfig(
      { baseUrl: 'https://127.0.0.1:8384', apiKey: 'k', folderId: 'judexp-hieu-qa', atommanDeviceId: 'ATOM' },
      store,
    );
    expect((await getSyncConfig(store)).folderId).toBe('judexp-hieu-qa');
  });
});
