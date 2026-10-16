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

export type SyncState = 'synced' | 'pending' | 'unreachable';

export interface SyncConfig {
  /** Local Syncthing GUI, normally http://127.0.0.1:8384 */
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

export async function syncStatus(deps: SyncDeps, cfg: SyncConfig): Promise<SyncState> {
  const connections = (await getJson(deps, `${cfg.baseUrl}/rest/system/connections`, cfg.apiKey)) as
    | { connections?: Record<string, { connected?: boolean }> }
    | null;
  if (!connections?.connections) return 'unreachable';

  const atomman = connections.connections[cfg.atommanDeviceId];
  if (!atomman?.connected) return 'unreachable';

  const url = `${cfg.baseUrl}/rest/db/completion?folder=${encodeURIComponent(cfg.folderId)}&device=${encodeURIComponent(cfg.atommanDeviceId)}`;
  const completion = (await getJson(deps, url, cfg.apiKey)) as { completion?: number } | null;
  if (typeof completion?.completion !== 'number') return 'unreachable';

  return completion.completion >= 100 ? 'synced' : 'pending';
}
