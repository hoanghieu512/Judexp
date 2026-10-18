// Runs before every e2e run: fail fast, in Vietnamese, when the run could only fail for setup
// reasons or would write outside the QA kho; then put the fixture events into the kho.
import { APP_ID, adb, Phone } from '../lib/adb.ts';
import { notificationsGranted, parseAdbDevices, parseVersionName } from '../lib/parse.ts';
import { NEAR, UNRATED } from '../lib/plates.ts';
import { DEFAULT_MODEL, preflightErrors } from '../lib/preflight.ts';

const deviceName = process.env.E2E_DEVICE ?? 'UBS1';
let devices = null;
try {
  devices = parseAdbDevices(adb(['devices', '-l']));
} catch {
  // adb could not be run at all: preflightErrors says so.
}
const device = devices?.find((d) => d.model === deviceName && d.state === 'device');
const phone = device ? new Phone(device.serial) : null;
const dumpsys = phone ? phone.shell(`dumpsys package ${APP_ID}`) : '';
const versionName = parseVersionName(dumpsys);
const kho = phone && versionName ? phone.kho() : null;
const plates = {
  unratedWasRated: !!(phone && kho) && phone.eventFiles(kho, UNRATED).some((f) => {
    const e = phone.readEvent(f);
    return e.verdict !== undefined && e.verdict !== null;
  }),
  nearWasMet: !!(phone && kho) && phone.eventFiles(kho, NEAR).length > 0,
};

const errors = preflightErrors({
  env: process.env,
  devices,
  deviceName,
  versionName,
  kho,
  notifications: notificationsGranted(dumpsys),
  plates,
});
if (errors.length > 0 || !phone || !kho) {
  for (const e of errors) console.error(`✗ ${e}`);
  process.exit(1);
}

const pushed = phone.seed(kho);
console.log(
  `✓ app v${versionName} trên ${deviceName} · kho ${kho.path} (${kho.folderId ?? 'chưa đặt Syncthing'}) · ` +
    `${pushed > 0 ? `đã nạp ${pushed} event mẫu` : 'event mẫu có sẵn'} · model ${process.env.E2E_MODEL ?? DEFAULT_MODEL}`,
);
