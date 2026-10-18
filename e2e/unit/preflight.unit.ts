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

test('never writes into a Prod kho', () => {
  const errors = preflightErrors({ ...ok, kho: { ...QA, folderId: 'judexp-gu-prod' } });
  assert.match(errors.join('\n'), /kho Prod/);
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
