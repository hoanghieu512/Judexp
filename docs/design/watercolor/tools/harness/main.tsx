import { ATOMMAN, seedFile, seedRootFile } from './mocks';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { IonApp, setupIonicReact } from '@ionic/react';
import AppShell from '@app/AppShell';
import { eventFileName, type JudexpEvent, type EntityKind, type Verdict } from '@app/domain/events';
import { dishKey, normalizePlate, restaurantKey } from '@app/domain/keys';
import { reminderFor } from '@app/domain/reminders';
import type { Reminder } from '@app/domain/reminders';
import type { PrefsStore } from '@app/profile/settings';

import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/inter/vietnamese-400.css';
import '@fontsource/inter/vietnamese-600.css';
import '@fontsource/roboto-mono/500.css';
import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import './directions.css';

setupIonicReact();
const params = new URLSearchParams(location.search);
if (params.get('dir')) document.documentElement.dataset.dir = params.get('dir')!;
if (params.get('theme') === 'light') document.documentElement.dataset.theme = 'light';

const NOW = Date.now();
const H = 3600_000;
const D = 24 * H;
let n = 0;
function ev(kind: EntityKind, key: string, label: string, ago: number, verdict: Verdict | null, tags: string[] = [], note?: string, geo?: { lat: number; lng: number; accuracy?: number }): JudexpEvent {
  n += 1;
  return {
    schemaVersion: 1,
    eventId: `${n.toString(16).padStart(8, '0')}-0000-4000-8000-000000000000`,
    type: 'encounter',
    author: 'hieu',
    device: 'ubs1',
    createdAt: new Date(NOW - ago).toISOString(),
    visibility: 'private',
    entityRef: { kind, key, label },
    verdict,
    tags,
    note,
    context: geo ? { geo } : undefined,
    source: { kind: 'manual' },
  };
}
const drv = (plate: string, name: string, ago: number, v: Verdict | null, tags: string[] = [], note?: string) => ev('driver', normalizePlate(plate), name, ago, v, tags, note);
const res = (name: string, ago: number, v: Verdict | null, tags: string[] = [], note?: string, geo?: { lat: number; lng: number; accuracy?: number }) => ev('restaurant', restaurantKey(name), name, ago, v, tags, note, geo);

const events: JudexpEvent[] = [];
if (params.get('empty') !== '1') {
  events.push(
    drv('59H1-234.56', 'Nguyễn Văn Tâm', 20 * D, 'good', ['chạy êm']),
    drv('59H1-234.56', 'Nguyễn Văn Tâm', 9 * D, 'good', ['chạy êm', 'đúng đường']),
    drv('59H1-234.56', 'Nguyễn Văn Tâm', 2 * D, 'good', ['xe sạch', 'chạy êm']),
    drv('51G-888.12', 'Trần Minh Hải', 30 * D, 'good', ['đúng giờ']),
    drv('51G-888.12', 'Trần Minh Hải', 5 * D, 'bad', ['chạy ẩu', 'đòi thêm tiền'], 'Vượt đèn đỏ 2 lần, đòi thêm 20k'),
    drv('30A-567.89', 'Lê Quốc Bảo', 40 * D, 'ok', ['nói nhiều']),
    drv('30A-567.89', 'Lê Quốc Bảo', 12 * D, 'good', ['đúng đường']),
    drv('30A-567.89', 'Lê Quốc Bảo', 3 * D, 'ok', ['bắt chờ lâu']),
    drv('59X3-456.78', 'Phạm Đức', 6 * H, null),
    res('Bún bò Huế O Xuân', 15 * D, 'good', ['ngon', 'giá hợp'], undefined, { lat: 10.7769, lng: 106.7009, accuracy: 20 }),
    res('Bún bò Huế O Xuân', 1 * D, 'good', ['ngon', 'phục vụ dễ thương']),
    res('Quán Cơm Tấm Ba Ghi', 25 * D, 'ok', ['nhanh'], undefined, { lat: 10.7300, lng: 106.7210, accuracy: 15 }),
    res('Quán Cơm Tấm Ba Ghi', 4 * D, 'bad', ['mặn', 'ship lâu']),
    res('Cơm tấm Ba Ghi Q7', 8 * D, 'ok', [], undefined, { lat: 10.7305, lng: 106.7212, accuracy: 12 }),
    res('Phở Hòa Pasteur', 18 * D, 'good', ['ngon']),
    res('Phở Hòa Pasteur', 7 * D, 'ok', ['đắt']),
    res('Lẩu Dê 404', 10 * H, null),
    ev('dish', dishKey('Bún bò Huế O Xuân', 'Bún bò đặc biệt'), 'Bún bò đặc biệt', 1 * D, 'good', ['gọi lại', 'đáng tiền']),
    ev('place', 'place-7f3a1c9e2b4d4e6fa1b2c3d4e5f60718', 'Cà phê Okkio', 6 * D, 'good', ['yên tĩnh', 'wifi tốt']),
  );
}
for (const e of events) seedFile('events', eventFileName(e), JSON.stringify(e));
seedRootFile('_worker.log', '2026-10-22 23:10:04 worker idle, inbox empty\n2026-10-23 06:00:01 worker idle, inbox empty\n');

const mem = new Map<string, string>();
if (params.get('nokho') !== '1') mem.set('judexp.kho', JSON.stringify({ rootUri: 'mem://kho', label: 'Hieu' }));
mem.set('judexp.author', 'hieu');
mem.set('judexp.device', 'ubs1');
mem.set('judexp.notificationsAsked', '1');
if (params.get('pin')) mem.set('judexp.pin', params.get('pin')!);
if (params.get('sync') !== 'none') {
  mem.set('judexp.syncthing', JSON.stringify({ baseUrl: 'https://127.0.0.1:8384', apiKey: 'k3yAbCdEf0123456789xyz', folderId: 'judexp-hieu-qa', atommanDeviceId: ATOMMAN }));
}
const prefs: PrefsStore = {
  async get(k) { return mem.get(k) ?? null; },
  async set(k, v) { mem.set(k, v); },
  async remove(k) { mem.delete(k); },
};

let snapshot: string | null = null;
const snapshots = { async read() { return snapshot; }, async write(j: string) { snapshot = j; } };

let pending: Reminder[] = params.get('noremind') === '1' ? [] : [
  reminderFor({ kind: 'driver', key: '51F99001', label: '51F-990.01' }, new Date(NOW - 25 * 60_000), 'mem://kho'),
];
const reminders = {
  native: {
    async permission() { return { granted: true }; },
    async requestPermission() { return { granted: true }; },
    async schedule(o: unknown) { console.log('[harness] schedule', o); },
    async cancel() {},
  },
  store: {
    async load() { return pending; },
    async save(list: Reminder[]) { pending = list; },
    async answers() { return []; },
    async clearAnswer() {},
  },
};

const deps = { saf: (await import('@app/plugins/saf')).Saf, log: (m: string) => console.warn('[judexp]', m) };

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <IonApp>
      <AppShell deps={deps} prefs={prefs} snapshots={snapshots} reminders={reminders} />
    </IonApp>
  </React.StrictMode>,
);
