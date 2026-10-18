// Pure checks behind scripts/preflight.ts: stop before the e2e run when it could only fail for
// setup reasons, or would write where it must not, and say how to fix it.
import type { AdbDevice, KhoSetup } from './parse.ts';
import { isQaKho } from './parse.ts';
import { NEAR, UNRATED } from './plates.ts';

/** OpenRouter id used when E2E_MODEL is unset: pinned, never a "-latest" alias. */
export const DEFAULT_MODEL = 'anthropic/claude-haiku-5.5';

/**
 * Phones the smoke tests may write on. The tests write into the kho the app has open, and the
 * kho is append-only and synced, so only the QA test phones qualify (huynh, 2026-10-18).
 */
export const TEST_PHONES = ['UBS1', 'k6789v1_64'];

/**
 * QA phones the engine cannot drive, and why. dGen1 is a QA phone, but the engine force-stops the
 * app before every test, and one force-stop there leaves the WebView black until a reboot
 * (Gu Library's e2e, 2026-10-08, retried from a fresh boot). Check dGen1 by hand.
 */
export const ENGINE_BREAKS: Record<string, string> = {
  k6789v1_64: 'dGen1: engine force-stop app ở mỗi test làm WebView ra màn đen, chỉ reboot mới hết. Kiểm dGen1 bằng tay.',
};

export function preflightErrors(i: {
  env: Record<string, string | undefined>;
  /** null when adb itself could not be run. */
  devices: AdbDevice[] | null;
  deviceName: string;
  versionName: string | null;
  /** null when the app's Preferences could not be read or name no kho. */
  kho: KhoSetup | null;
  notifications: boolean;
  /** What the kho already says about the plates the lookup test relies on staying untouched. */
  plates: { unratedWasRated: boolean; nearWasMet: boolean };
}): string[] {
  const errors: string[] = [];
  if (!i.env.OPENROUTER_API_KEY) {
    errors.push('Thiếu OPENROUTER_API_KEY: thêm `export OPENROUTER_API_KEY=…` vào ~/.bash_profile rồi mở shell mới (e2e không đọc .env).');
  }
  if (!TEST_PHONES.includes(i.deviceName)) {
    errors.push(`"${i.deviceName}" không phải máy test (${TEST_PHONES.join(', ')}): e2e ghi vào kho đang mở, chỉ chạy trên máy QA.`);
    return errors;
  }
  if (ENGINE_BREAKS[i.deviceName]) {
    errors.push(ENGINE_BREAKS[i.deviceName]);
    return errors;
  }
  if (!i.devices) {
    errors.push('Không chạy được adb: cài Android platform-tools, hoặc đặt ANDROID_HOME trỏ tới Android SDK.');
    return errors;
  }
  const device = i.devices.find((d) => d.model === i.deviceName);
  if (!device) {
    errors.push(`Không thấy máy "${i.deviceName}" trong adb devices: cắm cáp, mở khoá máy, hoặc đặt E2E_DEVICE đúng tên (model).`);
    return errors;
  }
  if (device.state !== 'device') {
    errors.push(`Máy "${i.deviceName}" đang ở trạng thái ${device.state}: bấm "Cho phép" gỡ lỗi USB trên máy.`);
    return errors;
  }
  if (!i.versionName) {
    errors.push(`Chưa cài com.judexp.app trên "${i.deviceName}": cài APK debug cần kiểm trước khi chạy.`);
    return errors;
  }
  if (!i.kho) {
    errors.push('Không đọc được kho app đang mở (chưa chọn kho, hoặc APK không phải bản debug nên run-as bị từ chối).');
    return errors;
  }
  if (!isQaKho(i.kho)) {
    errors.push(
      `Không chắc kho đang mở là kho QA (${i.kho.path}, folder Syncthing ${i.kho.folderId ?? 'chưa đặt'}): ` +
        'e2e ghi vĩnh viễn, chỉ chạy khi folder Syncthing trong Cài đặt có đuôi -qa.',
    );
  }
  if (i.plates.unratedWasRated) {
    errors.push(`${UNRATED} đã bị chấm trong kho (kho chỉ-thêm, không gỡ được): đổi hằng UNRATED trong e2e/lib/plates.ts và event mẫu của nó sang biển 00E khác chưa dùng.`);
  }
  if (i.plates.nearWasMet) {
    errors.push(`${NEAR} đã có event trong kho, không còn là biển chưa gặp: đổi hằng NEAR trong e2e/lib/plates.ts sang biển 00E khác lệch 1 ký tự với các biển mẫu.`);
  }
  if (i.kho.pin) errors.push('App đang đặt PIN: e2e không nhập PIN, tắt PIN trong Cài đặt của máy test.');
  if (!i.notifications) errors.push('App chưa được bật thông báo: bật trong Cài đặt Android, test nhắc chấm cần nó.');
  return errors;
}
