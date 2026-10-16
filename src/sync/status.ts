/**
 * The three-state sync light.
 *
 * The app never syncs anything itself; Syncthing does. All this does is
 * read Syncthing's own REST API on this phone and answer one question the
 * person actually has: is what I just wrote already on Atomman?
 *
 * Saying nothing would be worse than saying "chưa thấy Atomman", because a
 * silent app looks broken when the real problem is that the mini PC is off.
 */

/**
 * Four faults, four words. Lumping them together made the app blame Atomman
 * for a request that never left this phone.
 */
export type SyncState = 'synced' | 'pending' | 'atomman-offline' | 'no-syncthing' | 'unconfigured';

export interface SyncConfig {
  /**
   * Local Syncthing GUI. https, not http: from targetSdk 28 up Android blocks
   * cleartext even to 127.0.0.1, and the native plugin trusts the localhost
   * certificate for exactly this.
   */
  baseUrl: string;
  /** API key of THIS device's Syncthing, not Atomman's. */
  apiKey: string;
  folderId: string;
  atommanDeviceId: string;
}

export interface SyncDeps {
  request: (options: { url: string; apiKey: string }) => Promise<{ status: number; data: string }>;
}

async function getJson(deps: SyncDeps, url: string, apiKey: string): Promise<unknown | null> {
  try {
    const { status, data } = await deps.request({ url, apiKey });
    if (status !== 200) return null;
    return JSON.parse(data);
  } catch {
    return null;
  }
}

/**
 * A Syncthing device id is eight groups of seven characters. One group pasted
 * by mistake looks like a filled-in field, so it is treated as unconfigured
 * rather than reported as Atomman being away.
 */
export function isLikelyDeviceId(id: string): boolean {
  return id.replace(/-/g, '').length >= 50;
}

export async function syncStatus(deps: SyncDeps, cfg: SyncConfig): Promise<SyncState> {
  // A light that can never turn green is a lie. Say which of the two it is.
  if (cfg.apiKey === '' || cfg.atommanDeviceId === '' || cfg.folderId === '') return 'unconfigured';
  if (!isLikelyDeviceId(cfg.atommanDeviceId)) return 'unconfigured';

  const connections = (await getJson(deps, `${cfg.baseUrl}/rest/system/connections`, cfg.apiKey)) as
    | { connections?: Record<string, { connected?: boolean }> }
    | null;
  if (!connections?.connections) return 'no-syncthing';

  const atomman = connections.connections[cfg.atommanDeviceId];
  if (!atomman?.connected) return 'atomman-offline';

  const url = `${cfg.baseUrl}/rest/db/completion?folder=${encodeURIComponent(cfg.folderId)}&device=${encodeURIComponent(cfg.atommanDeviceId)}`;
  const completion = (await getJson(deps, url, cfg.apiKey)) as { completion?: number } | null;
  if (typeof completion?.completion !== 'number') return 'no-syncthing';

  return completion.completion >= 100 ? 'synced' : 'pending';
}
