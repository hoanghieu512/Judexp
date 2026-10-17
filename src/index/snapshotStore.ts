/**
 * Where the index snapshot lives between launches.
 *
 * Not in Preferences: on Android those are one SharedPreferences XML file,
 * loaded whole into memory and rewritten whole on every change to any key.
 * A year of events is around a megabyte, and it would be rewritten each time
 * the PIN or the Syncthing settings change, as well as on every rating.
 * A file in the app's own storage keeps derived data apart from settings.
 */

import { Directory, Encoding, type FilesystemPlugin } from '@capacitor/filesystem';

export interface SnapshotStore {
  /** The stored snapshot text, or null if none was ever written. */
  read(): Promise<string | null>;
  write(json: string): Promise<void>;
}

export type SnapshotFs = Pick<FilesystemPlugin, 'readFile' | 'writeFile'>;

const FILE = 'index-snapshot.json';

export function fileSnapshotStore(fs: SnapshotFs): SnapshotStore {
  return {
    async read() {
      try {
        const { data } = await fs.readFile({ path: FILE, directory: Directory.Data, encoding: Encoding.UTF8 });
        return typeof data === 'string' ? data : null;
      } catch {
        // No file yet is the normal first launch. A snapshot is derived data,
        // so anything unreadable means "rebuild", never "refuse to open".
        return null;
      }
    },
    async write(json) {
      await fs.writeFile({ path: FILE, data: json, directory: Directory.Data, encoding: Encoding.UTF8 });
    },
  };
}
