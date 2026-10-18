import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  khoFromPrefs,
  looksLikeProd,
  notificationsGranted,
  parseAdbDevices,
  parsePending,
  parseRow,
  pathFromTreeUri,
  nearestToTitle,
} from '../lib/parse.ts';

test('adb devices: serial, state and model', () => {
  const out = 'List of devices attached\nUBS1240902002011       device usb:20-2 product:Universal_Phone_1 model:UBS1 transport_id:26\nXYZ unauthorized usb:1\n';
  assert.deepEqual(parseAdbDevices(out), [
    { serial: 'UBS1240902002011', model: 'UBS1', state: 'device' },
    { serial: 'XYZ', model: '', state: 'unauthorized' },
  ]);
});

test('notification permission read from dumpsys package', () => {
  assert.equal(notificationsGranted('  android.permission.POST_NOTIFICATIONS: granted=true, flags=[ USER_SET ]'), true);
  assert.equal(notificationsGranted('  android.permission.POST_NOTIFICATIONS: granted=false'), false);
});

const prefs = (entries: string) => `<?xml version='1.0' encoding='utf-8' standalone='yes' ?>\n<map>\n${entries}\n</map>`;
const KHO =
  '<string name="judexp.kho">{&quot;rootUri&quot;:&quot;content://com.android.externalstorage.documents/tree/primary%3ADownload%2Fjudexp-gu&quot;,&quot;label&quot;:&quot;judexp-gu&quot;}</string>';

test('the kho the app has open, its path, Syncthing folder and PIN', () => {
  const xml = prefs(`${KHO}\n<string name="judexp.syncthing">{&quot;folderId&quot;:&quot;judexp-gu-qa&quot;}</string>`);
  assert.deepEqual(khoFromPrefs(xml), {
    rootUri: 'content://com.android.externalstorage.documents/tree/primary%3ADownload%2Fjudexp-gu',
    path: '/sdcard/Download/judexp-gu',
    folderId: 'judexp-gu-qa',
    pin: false,
  });
  assert.equal(khoFromPrefs(prefs(`${KHO}\n<string name="judexp.pin">1234</string>`))?.pin, true);
  assert.equal(khoFromPrefs(prefs('<string name="judexp.device">guqa</string>')), null);
});

test('tree uri to a path adb can reach', () => {
  assert.equal(pathFromTreeUri('content://com.android.externalstorage.documents/tree/primary%3ADownload%2Fjudexp-gu'), '/sdcard/Download/judexp-gu');
  assert.equal(pathFromTreeUri('content://com.android.externalstorage.documents/tree/1234-ABCD%3AJudexp'), '/storage/1234-ABCD/Judexp');
  assert.equal(pathFromTreeUri('content://com.android.providers.downloads.documents/tree/raw%3A%2Fx'), null);
});

test('a Prod kho is recognised by its path or its Syncthing folder', () => {
  const qa = { rootUri: '', path: '/sdcard/Download/judexp-gu', folderId: 'judexp-gu-qa', pin: false };
  assert.equal(looksLikeProd(qa), false);
  assert.equal(looksLikeProd({ ...qa, folderId: 'judexp-gu-prod' }), true);
  assert.equal(looksLikeProd({ ...qa, path: '/sdcard/Judexp-Prod/gu', folderId: null }), true);
});

test('pending reminders, and nothing for an unreadable file', () => {
  const json = '{"version":1,"reminders":[{"id":"driver:00E000003","notificationId":7,"kind":"driver","key":"00E000003","label":"00E000003"}]}';
  assert.deepEqual(parsePending(json).map((r) => r.id), ['driver:00E000003']);
  assert.deepEqual(parsePending('{'), []);
});

// Boxes as UBS1 (Android 14, 720x1600) lays out an expanded reminder above another notification.
const TITLE = { x: 136, y: 532, width: 520, height: 43 };

test('the button of the notification under that title, not of the one below', () => {
  const tot = [
    { x: 112, y: 639, width: 96, height: 96 },   // this reminder's "Tốt"
    { x: 112, y: 1100, width: 96, height: 96 },  // another reminder's, further down
  ];
  assert.equal(nearestToTitle(TITLE, tot), 0);
  assert.equal(nearestToTitle(TITLE, [tot[1]]), -1);
});

test('the expand button in the header of that notification', () => {
  const expand = [
    { x: 576, y: 432, width: 112, height: 112 },  // this notification's header
    { x: 547, y: 751, width: 141, height: 112 },  // the next notification's
    null,                                          // one off screen
  ];
  assert.equal(nearestToTitle(TITLE, expand), 0);
});

test('a result row label read back into colour and meetings', () => {
  assert.deepEqual(parseRow('Mở 00E000002, xấu, 3 lần gặp, hôm nay'), { name: '00E000002', colour: 'xấu', meetings: 3 });
  assert.deepEqual(parseRow('Mở 00E000001, chưa chấm, 1 lần gặp'), { name: '00E000001', colour: 'chưa chấm', meetings: 1 });
  assert.equal(parseRow('Chấm xấu'), null);
});
