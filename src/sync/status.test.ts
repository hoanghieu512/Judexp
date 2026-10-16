import { describe, it, expect } from 'vitest';
import { syncStatus, type SyncConfig, type SyncDeps } from './status';

const cfg: SyncConfig = {
  baseUrl: 'http://127.0.0.1:8384',
  apiKey: 'key',
  folderId: 'judexp-huynh-prod',
  atommanDeviceId: 'ATOMMAN-DEVICE-ID',
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
  data: JSON.stringify({ connections: { 'ATOMMAN-DEVICE-ID': { connected: value } } }),
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

  it('is unreachable when the local Syncthing does not answer', async () => {
    expect(await syncStatus(deps({}, true), cfg)).toBe('unreachable');
  });

  it('is unreachable when Syncthing answers with an error status', async () => {
    expect(await syncStatus(deps({ connections: { status: 403, data: 'nope' } }), cfg)).toBe('unreachable');
  });

  it('is unreachable when Atomman is not connected', async () => {
    const d = deps({ connections: connected(false), completion: completion(100) });
    expect(await syncStatus(d, cfg)).toBe('unreachable');
  });

  it('is unreachable when Atomman is absent from the connection list', async () => {
    const d = deps({
      connections: { status: 200, data: JSON.stringify({ connections: {} }) },
      completion: completion(100),
    });
    expect(await syncStatus(d, cfg)).toBe('unreachable');
  });

  it('is pending while completion is below 100', async () => {
    const d = deps({ connections: connected(true), completion: completion(42) });
    expect(await syncStatus(d, cfg)).toBe('pending');
  });

  it('is synced when Atomman is connected and completion is 100', async () => {
    const d = deps({ connections: connected(true), completion: completion(100) });
    expect(await syncStatus(d, cfg)).toBe('synced');
  });

  it('is unreachable when the answer is not the json it expects', async () => {
    const d = deps({ connections: { status: 200, data: 'not json' } });
    expect(await syncStatus(d, cfg)).toBe('unreachable');
  });
});
