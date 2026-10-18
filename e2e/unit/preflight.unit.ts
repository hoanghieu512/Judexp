import { test } from 'node:test';
import assert from 'node:assert/strict';
import { preflightErrors } from '../lib/preflight.ts';

const QA = { rootUri: 'content://x', path: '/sdcard/Download/judexp-gu', folderId: 'judexp-gu-qa', pin: false };
const ok = {
  env: { OPENROUTER_API_KEY: 'k' },
  devices: [{ serial: 's', model: 'UBS1', state: 'device' }],
  deviceName: 'UBS1',
  versionName: '0.1.0',
  kho: QA,
  notifications: true,
  plates: { unratedWasRated: false, nearWasMet: false },
};

test('a QA test phone with everything set passes', () => {
  assert.deepEqual(preflightErrors(ok), []);
});

test('never runs on a phone that is not a QA test phone', () => {
  const errors = preflightErrors({ ...ok, deviceName: 'SM-G780F', devices: [{ serial: 's', model: 'SM-G780F', state: 'device' }] });
  assert.equal(errors.length, 1);
  assert.match(errors[0], /không phải máy test/);
});

test('refuses dGen1, which the engine leaves with a black WebView', () => {
  const errors = preflightErrors({ ...ok, deviceName: 'k6789v1_64', devices: [{ serial: 's', model: 'k6789v1_64', state: 'device' }] });
  assert.equal(errors.length, 1);
  assert.match(errors[0], /màn đen/);
});

test('writes only into a kho whose Syncthing folder says QA, refusing an unset one', () => {
  assert.match(preflightErrors({ ...ok, kho: { ...QA, folderId: 'judexp-gu-prod' } }).join('\n'), /kho QA/);
  assert.match(preflightErrors({ ...ok, kho: { ...QA, folderId: null } }).join('\n'), /chưa đặt/);
  assert.match(preflightErrors({ ...ok, kho: { ...QA, path: '/sdcard/Judexp-Prod/gu' } }).join('\n'), /kho QA/);
});

test('says which constant to change when a test plate was rated or met by hand', () => {
  assert.match(preflightErrors({ ...ok, plates: { unratedWasRated: true, nearWasMet: false } }).join('\n'), /UNRATED/);
  assert.match(preflightErrors({ ...ok, plates: { unratedWasRated: false, nearWasMet: true } }).join('\n'), /NEAR/);
});

test('says why it cannot read the kho, a PIN, and notifications that are off', () => {
  assert.match(preflightErrors({ ...ok, kho: null }).join('\n'), /Không đọc được kho/);
  assert.match(preflightErrors({ ...ok, kho: { ...QA, pin: true } }).join('\n'), /PIN/);
  assert.match(preflightErrors({ ...ok, notifications: false }).join('\n'), /thông báo/);
});

test('a missing key, phone or app is reported before anything else is read', () => {
  assert.match(preflightErrors({ ...ok, env: {} }).join('\n'), /OPENROUTER_API_KEY/);
  assert.match(preflightErrors({ ...ok, devices: [] }).join('\n'), /Không thấy máy/);
  assert.match(preflightErrors({ ...ok, versionName: null }).join('\n'), /Chưa cài/);
});
