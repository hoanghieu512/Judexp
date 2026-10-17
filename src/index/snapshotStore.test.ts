import { describe, it, expect } from 'vitest';
import { Directory, Encoding } from '@capacitor/filesystem';
import { fileSnapshotStore, type SnapshotFs } from './snapshotStore';

/** An app-private folder that remembers what was written, and how. */
function fakeFs() {
  const files = new Map<string, string>();
  const writes: { path: string; directory?: Directory; encoding?: Encoding }[] = [];
  const fs: SnapshotFs = {
    async readFile({ path }) {
      const data = files.get(path);
      if (data === undefined) throw new Error('File does not exist.');
      return { data };
    },
    async writeFile({ path, data, directory, encoding }) {
      writes.push({ path, directory, encoding });
      files.set(path, data as string);
      return { uri: `file:///data/${path}` };
    },
  };
  return { fs, writes };
}

describe('fileSnapshotStore', () => {
  it('reads nothing before a snapshot was ever written', async () => {
    const { fs } = fakeFs();
    expect(await fileSnapshotStore(fs).read()).toBeNull();
  });

  it('reads back what it wrote', async () => {
    const { fs } = fakeFs();
    const store = fileSnapshotStore(fs);
    await store.write('{"schemaVersion":1}');
    expect(await store.read()).toBe('{"schemaVersion":1}');
  });

  it("writes into the app's own storage as text, never into the kho", async () => {
    const { fs, writes } = fakeFs();
    await fileSnapshotStore(fs).write('{}');
    expect(writes).toEqual([{ path: expect.any(String), directory: Directory.Data, encoding: Encoding.UTF8 }]);
  });
});
