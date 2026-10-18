import { describe, it, expect } from 'vitest';
import { Directory, Encoding, type FileInfo } from '@capacitor/filesystem';
import { fileReminderStore, type ReminderAnswer, type ReminderFs } from './reminderStore';
import type { Reminder } from '../domain/reminders';

/** App-private storage in memory, recording how every call was made. */
function fakeFs(seed: Record<string, string> = {}) {
  const files = new Map(Object.entries(seed));
  const calls: { op: string; path: string; directory?: Directory; encoding?: Encoding }[] = [];
  const fs: ReminderFs = {
    async readFile({ path, directory, encoding }) {
      calls.push({ op: 'read', path, directory, encoding });
      const data = files.get(path);
      if (data === undefined) throw new Error('File does not exist.');
      return { data };
    },
    async writeFile({ path, data, directory, encoding }) {
      calls.push({ op: 'write', path, directory, encoding });
      files.set(path, data as string);
      return { uri: `file:///data/${path}` };
    },
    async readdir({ path, directory }) {
      calls.push({ op: 'readdir', path, directory });
      const prefix = `${path}/`;
      const names = [...files.keys()].filter((p) => p.startsWith(prefix)).map((p) => p.slice(prefix.length));
      if (names.length === 0) throw new Error('Folder does not exist.');
      return { files: names.map((name) => ({ name, type: 'file', size: 1, ctime: 0, mtime: 0, uri: '' }) as FileInfo) };
    },
    async deleteFile({ path, directory }) {
      calls.push({ op: 'delete', path, directory });
      files.delete(path);
    },
  };
  return { fs, files, calls };
}

const reminder: Reminder = {
  id: 'driver:59H123456',
  notificationId: 4242,
  kind: 'driver',
  key: '59H123456',
  label: '59H1-234.56',
  lookedUpAt: '2026-10-18T11:40:00.000Z',
  dueAt: '2026-10-18T13:10:00.000Z',
  expiresAt: '2026-10-20T11:40:00.000Z',
  khoUri: 'content://kho',
};

function answer(over: Partial<ReminderAnswer> = {}): ReminderAnswer {
  return {
    answerId: 'a1',
    reminderId: 'driver:59H123456',
    kind: 'driver',
    key: '59H123456',
    label: '59H1-234.56',
    lookedUpAt: '2026-10-18T11:40:00.000Z',
    expiresAt: '2026-10-20T11:40:00.000Z',
    answer: 'bad',
    answeredAt: '2026-10-18T13:15:00.000Z',
    khoUri: 'content://kho',
    ...over,
  };
}

describe('fileReminderStore', () => {
  it('has no reminders before the first lookup', async () => {
    expect(await fileReminderStore(fakeFs().fs).load()).toEqual([]);
  });

  it('saves and loads reminders in the version 1 wrapper', async () => {
    const { fs, files } = fakeFs();
    const store = fileReminderStore(fs);
    await store.save([reminder]);
    expect(JSON.parse(files.get('pending.json')!)).toEqual({ version: 1, reminders: [reminder] });
    expect(await store.load()).toEqual([reminder]);
  });

  it('treats a broken or unknown pending.json as no reminders', async () => {
    expect(await fileReminderStore(fakeFs({ 'pending.json': '{oops' }).fs).load()).toEqual([]);
    const v2 = JSON.stringify({ version: 2, reminders: [reminder] });
    expect(await fileReminderStore(fakeFs({ 'pending.json': v2 }).fs).load()).toEqual([]);
  });

  it('reads every answer, oldest first', async () => {
    const { fs } = fakeFs({
      'reminder-answers/late.json': JSON.stringify(answer({ answerId: 'late', answeredAt: '2026-10-18T14:00:00.000Z' })),
      'reminder-answers/early.json': JSON.stringify(answer({ answerId: 'early', answeredAt: '2026-10-18T13:00:00.000Z' })),
    });
    expect((await fileReminderStore(fs).answers()).map((a) => a.answerId)).toEqual(['early', 'late']);
  });

  it('skips an answer file it cannot use, including one still being written', async () => {
    const { fs } = fakeFs({
      'reminder-answers/good.json': JSON.stringify(answer({ answerId: 'good' })),
      'reminder-answers/broken.json': '{oops',
      'reminder-answers/maybe.json': JSON.stringify(answer({ answerId: 'maybe', answer: 'maybe' as ReminderAnswer['answer'] })),
      'reminder-answers/half.json.tmp': JSON.stringify(answer({ answerId: 'half' })),
    });
    expect((await fileReminderStore(fs).answers()).map((a) => a.answerId)).toEqual(['good']);
  });

  it('has no answers when the folder does not exist yet', async () => {
    expect(await fileReminderStore(fakeFs().fs).answers()).toEqual([]);
  });

  it('clears one answer by deleting its file', async () => {
    const { fs, files } = fakeFs({ 'reminder-answers/a1.json': JSON.stringify(answer()) });
    await fileReminderStore(fs).clearAnswer('a1');
    expect(files.has('reminder-answers/a1.json')).toBe(false);
  });

  it("keeps everything in the app's own storage as text", async () => {
    const { fs, calls } = fakeFs({ 'reminder-answers/a1.json': JSON.stringify(answer()) });
    const store = fileReminderStore(fs);
    await store.save([reminder]);
    await store.load();
    await store.answers();
    await store.clearAnswer('a1');
    expect(calls.every((c) => c.directory === Directory.Data)).toBe(true);
    expect(calls.filter((c) => c.op === 'read' || c.op === 'write').every((c) => c.encoding === Encoding.UTF8)).toBe(true);
  });
});
