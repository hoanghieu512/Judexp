// Registered before the app imports its plugins, so registerPlugin returns these web fakes.
import { registerPlugin } from '@capacitor/core';

type Node = { name: string; dir: boolean; children?: Map<string, Node>; content?: string; mtime: number };
const root: Node = { name: 'kho', dir: true, children: new Map(), mtime: Date.now() };
const byUri = new Map<string, Node>([['mem://kho', root]]);

export function seedFile(dirName: string, name: string, content: string) {
  let dir = root.children!.get(dirName);
  if (!dir) {
    dir = { name: dirName, dir: true, children: new Map(), mtime: Date.now() };
    root.children!.set(dirName, dir);
    byUri.set(`mem://kho/${dirName}`, dir);
  }
  const node = { name, dir: false, content, mtime: Date.now() };
  dir.children!.set(name, node);
  byUri.set(`mem://kho/${dirName}/${name}`, node);
}
export function seedRootFile(name: string, content: string) {
  const node = { name, dir: false, content, mtime: Date.now() };
  root.children!.set(name, node);
  byUri.set(`mem://kho/${name}`, node);
}

registerPlugin('Saf', {
  web: {
    async pickFolder() { return { uri: 'mem://kho' }; },
    async ensureDir({ parentUri, name }: { parentUri: string; name: string }) {
      const parent = byUri.get(parentUri)!;
      let child = parent.children!.get(name);
      const uri = `${parentUri}/${name}`;
      if (!child) {
        child = { name, dir: true, children: new Map(), mtime: Date.now() };
        parent.children!.set(name, child);
        byUri.set(uri, child);
      }
      return { uri };
    },
    async listFolder({ uri }: { uri: string }) {
      const node = byUri.get(uri);
      if (!node?.children) return { entries: [] };
      return {
        entries: [...node.children.values()].map((c) => ({
          name: c.name, isDirectory: c.dir, uri: `${uri}/${c.name}`, size: c.content?.length ?? 0, lastModified: c.mtime,
        })),
      };
    },
    async readFile({ uri }: { uri: string }) {
      const node = byUri.get(uri);
      if (!node || node.dir) throw new Error('not found');
      return { data: node.content! };
    },
    async writeFile({ dirUri, name, content }: { dirUri: string; name: string; content: string }) {
      const dir = byUri.get(dirUri)!;
      const node = { name, dir: false, content, mtime: Date.now() };
      dir.children!.set(name, node);
      byUri.set(`${dirUri}/${name}`, node);
      return { uri: `${dirUri}/${name}` };
    },
  },
});

const syncMode = new URLSearchParams(location.search).get('sync') ?? 'synced';
registerPlugin('Syncthing', {
  web: {
    async request({ url }: { url: string }) {
      if (syncMode === 'offline' && url.includes('connections')) return { status: 200, data: JSON.stringify({ connections: {} }) };
      if (url.includes('connections')) {
        return { status: 200, data: JSON.stringify({ connections: { [ATOMMAN]: { connected: true } } }) };
      }
      return { status: 200, data: JSON.stringify({ completion: syncMode === 'pending' ? 80 : 100 }) };
    },
  },
});

export const ATOMMAN = 'ABCDEFG-HIJKLMN-OPQRSTU-VWXYZ23-4567ABC-DEFGHIJ-KLMNOPQ-RSTUVWX';

registerPlugin('Reminder', {
  web: {
    async permission() { return { granted: true }; },
    async requestPermission() { return { granted: true }; },
    async schedule(o: unknown) { console.log('[harness] schedule', o); },
    async cancel() {},
  },
});
