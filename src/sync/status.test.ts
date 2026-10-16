import { describe, it, expect } from 'vitest';
import { looksLikeDeviceId, syncStatus, type SyncConfig, type SyncDeps } from './status';

/** Shaped like a real one: eight groups of seven characters. */
const ATOMMAN = 'P56IOI7-MZJNU2Y-IQGDREY-DM2MGTI-MGL3BXN-PQ6W5BM-TBBZ4TJ-XZWICQ2';

const cfg: SyncConfig = {
  baseUrl: 'https://127.0.0.1:8384',
  apiKey: 'key',
  folderId: 'judexp-huynh-prod',
  atommanDeviceId: ATOMMAN,
};

function deps(responses: Record<string, { status: number; data: string }>, fail = false): SyncDeps {
  return {
    async request({ url }) {
      if (fail) throw new Error('connection refused');
      const key = Object.keys(responses).find((k) => url.includes(k));
      if (!key) return { status: 404, data: '' };
      return responses[key];
    },
  };
}

const connected = (value: boolean) => ({
  status: 200,
  data: JSON.stringify({ connections: { [ATOMMAN]: { connected: value } } }),
});
const completion = (value: number) => ({ status: 200, data: JSON.stringify({ completion: value }) });

describe('syncStatus', () => {
  it('is unconfigured before the Syncthing api key and Atomman id are filled in', async () => {
    const empty = { ...cfg, apiKey: '', atommanDeviceId: '' };
    expect(await syncStatus(deps({}), empty)).toBe('unconfigured');
  });

  it('is unconfigured when only part of the config is filled in', async () => {
    expect(await syncStatus(deps({}), { ...cfg, atommanDeviceId: '' })).toBe('unconfigured');
  });

  // Two different faults used to share one label, so the app blamed Atomman
  // for a problem sitting on this phone.
  it('blames the local Syncthing when it does not answer at all', async () => {
    expect(await syncStatus(deps({}, true), cfg)).toBe('no-syncthing');
  });

  it('blames the local Syncthing when it answers with an error status', async () => {
    expect(await syncStatus(deps({ connections: { status: 403, data: 'nope' } }), cfg)).toBe('no-syncthing');
  });

  it('says Atomman is offline when Syncthing answers but the device is not connected', async () => {
    const d = deps({ connections: connected(false), completion: completion(100) });
    expect(await syncStatus(d, cfg)).toBe('atomman-offline');
  });

  it('says Atomman is offline when it is absent from the connection list', async () => {
    const d = deps({
      connections: { status: 200, data: JSON.stringify({ connections: {} }) },
      completion: completion(100),
    });
    expect(await syncStatus(d, cfg)).toBe('atomman-offline');
  });

  it('is pending while completion is below 100', async () => {
    const d = deps({ connections: connected(true), completion: completion(42) });
    expect(await syncStatus(d, cfg)).toBe('pending');
  });

  it('is synced when Atomman is connected and completion is 100', async () => {
    const d = deps({ connections: connected(true), completion: completion(100) });
    expect(await syncStatus(d, cfg)).toBe('synced');
  });

  it('blames the local Syncthing when the answer is not the json it expects', async () => {
    const d = deps({ connections: { status: 200, data: 'not json' } });
    expect(await syncStatus(d, cfg)).toBe('no-syncthing');
  });
});

describe('syncStatus, a device id that is only part of one', () => {
  // A Syncthing device id is eight groups of seven characters. Pasting one
  // group looks filled in, and the light would then blame Atomman forever.
  it('counts a truncated Atomman id as not configured yet', async () => {
    const d = deps({ connections: connected(true), completion: completion(100) });
    expect(await syncStatus(d, { ...cfg, atommanDeviceId: 'KTW2JAW' })).toBe('unconfigured');
  });

  it('accepts a full device id, dashes or not', async () => {
    const full = 'P56IOI7-MZJNU2Y-IQGDREY-DM2MGTI-MGL3BXN-PQ6W5BM-TBBZ4TJ-XZWICQ2';
    const d = deps({
      connections: { status: 200, data: JSON.stringify({ connections: { [full]: { connected: true } } }) },
      completion: completion(100),
    });
    expect(await syncStatus(d, { ...cfg, atommanDeviceId: full })).toBe('synced');
  });
});

describe('telling a device id apart from an api key', () => {
  it('recognises the grouped shape of a device id', () => {
    expect(looksLikeDeviceId('N2YBQN5-3SSVHJD-55UCV6F-QEKAOBD')).toBe(true);
    expect(looksLikeDeviceId(ATOMMAN)).toBe(true);
  });

  it('does not mistake an api key for one', () => {
    expect(looksLikeDeviceId('tP3mXq8ZfLb2Rw9KdNc5VhJy7Gs4Au6E')).toBe(false);
    expect(looksLikeDeviceId('')).toBe(false);
  });
});
