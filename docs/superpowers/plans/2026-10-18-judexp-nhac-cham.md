# Judexp Plan 4: Nhắc chấm 90 phút

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mỗi lần tra cứu đã rõ đối tượng sinh một nhắc 90 phút sau. Thông báo có bốn nút Tốt, Ổn, Xấu, Không đi, chạm là xong mà không mở app. Lần mở app sau, câu trả lời thành event `encounter` trong kho. Hộp Chờ chấm ở màn Tra cứu là đường lùi cho mọi nhắc bị bỏ qua và mọi lần gặp chưa chấm.

**Architecture:** Phần native lo những gì phải chạy khi app vắng mặt: hẹn giờ bằng AlarmManager, hiện thông báo, nhận nút bấm bằng BroadcastReceiver, và ghi mỗi câu trả lời thành một file trong vùng dữ liệu riêng của app. Phần JS lo mọi thứ dính tới event: quyết định khi nào sinh nhắc, giữ `pending.json`, và khi app mở thì biến câu trả lời thành event bằng chính `newEncounter`, nên schema event chỉ nằm ở một chỗ. Hai phía chỉ chia nhau hai hợp đồng file JSON ghi ở Global Constraints.

**Tech Stack:** Capacitor 8, plugin Java cùng ba BroadcastReceiver, `@capacitor/filesystem` (đã có từ bản sửa M13), vitest, JUnit 4.13.2.

**Spec:** `docs/superpowers/specs/2026-10-16-judexp-design.md` (§9.1, §9.3, §11, §15, §16 S5, §17 M4).

**Phủ mốc:** M4. Hai quyết định huynh chốt ngày 2026-10-18:

1. **S5 đi đường "xếp hàng, mở app thì ghi".** Plugin chuẩn `@capacitor/local-notifications` gắn nút bằng `PendingIntent.getActivity` nên bấm là mở app; vì vậy plan này tự viết phần native. Receiver chỉ ghi câu trả lời vào hàng chờ, không ghi kho, không dựng event.
2. **Nhắc sinh tự động khi tra cứu đã rõ đối tượng:** ô tìm đứng yên đủ lâu hoặc huynh mở một kết quả, và kết quả trỏ đúng một thực thể, hoặc không khớp gì nhưng đã gõ đủ một biển số. Tra lại cùng thực thể thì dời nhắc cũ.

## Global Constraints

- Code, comment, tên biến, commit message: tiếng Anh. Chuỗi trên màn hình và trên thông báo: tiếng Việt. Không dùng em dash.
- Không bao giờ sửa hay xóa file trong `events/`. `domain` và `search` không import Capacitor hay bất cứ thứ gì chạm file.
- Nhắc chờ hẹn **90 phút** sau lần tra, tự bỏ khi quá **48 giờ** tính từ lần tra (§9.3, §15): `REMIND_AFTER_MS = 90 * 60_000`, `GIVE_UP_AFTER_MS = 48 * 60 * 60_000`.
- Nhắc và câu trả lời nằm trong `Directory.Data` (Android `getFilesDir()`), **không nằm trong kho, không sync** (§9.3).
- Hợp đồng `pending.json` (ở gốc `Directory.Data`): `{ "version": 1, "reminders": Reminder[] }`, mỗi `Reminder` là `{ id, notificationId, kind, key, label, lookedUpAt, dueAt, expiresAt }`. `id` là `` `${kind}:${key}` ``. Mọi mốc giờ là ISO-8601 UTC.
- Hợp đồng câu trả lời: mỗi lần bấm là một file `reminder-answers/<answerId>.json` = `{ answerId, reminderId, kind, key, label, lookedUpAt, expiresAt, answer, answeredAt }`. `answer` thuộc `good | ok | bad | skip`. `answerId` là UUID v4 do native sinh lúc bấm. `answeredAt` định dạng `yyyy-MM-dd'T'HH:mm:ss.SSS'Z'` theo UTC, dựng bằng `SimpleDateFormat` vì `minSdk` là 24, chưa có `java.time`.
- Nhãn bốn nút đúng như §9.3 và trùng `VERDICTS` của `QuickRateSheet`: **Tốt, Ổn, Xấu, Không đi**.
- Event dựng từ một câu trả lời: `type: 'encounter'`, `eventId = answerId`, `createdAt = answeredAt`, `context.happenedAt = lookedUpAt`, `entityRef = { kind, key, label }`, `verdict`, `tags: []`, `source: { kind: 'reminder' }`. **Không đi thì không ghi gì vào kho.**
- Hẹn giờ bằng `AlarmManager.setAndAllowWhileIdle(RTC_WAKEUP, …)`, không chính xác tới phút. Không xin `SCHEDULE_EXACT_ALARM`.
- Quyền: `POST_NOTIFICATIONS` (API 33 trở lên, xin lúc chạy), `RECEIVE_BOOT_COMPLETED`.
- Build bằng CLI, JDK 21, SDK 36. Trên dGen1 chỉ mở app bằng `adb shell monkey -p com.judexp.app -c android.intent.category.LAUNCHER 1`, không bao giờ `am force-stop`.

## Review Focus

Năm ca spec ngầm định mà luồng chính không tự chạm tới. Mỗi dòng đã có test gắn vào task sở hữu.

1. **Huynh từ chối quyền thông báo** (Android 13 trở lên). Nhắc vẫn được lưu và hiện trong hộp Chờ chấm, không có gì vỡ, Cài đặt nói rõ thông báo đang tắt. → Task 9.
2. **Bấm nút trong lúc kho không ghi được** (kho bị giấu, chưa chọn kho, máy hết chỗ). Câu trả lời ở lại hàng chờ và được ghi ở lần mở sau, không mất và không nhân đôi: `eventId = answerId`, và index đã gộp theo `eventId`. → Task 6.
3. **Gõ dở hoặc tra đi tra lại cùng một biển.** Gõ dở và nhiều kết quả thì không sinh nhắc; tra lại cùng thực thể thì chỉ dời một nhắc. → Task 3, Task 4, Task 7.
4. **Trả lời sau 48 giờ** (máy tắt mấy ngày, hoặc nhắc nằm quên trong khay). Thông báo tự biến mất lúc hết hạn, và câu trả lời đến muộn không thành event. → Task 1 (`setTimeoutAfter`), Task 6.
5. **Khởi động lại máy hoặc cập nhật app trong lúc nhắc đang chờ.** AlarmManager mất mọi hẹn giờ khi reboot; nhắc phải được hẹn lại từ `pending.json`. → Task 2.

---

### Task 1: Spike S5, plugin nhắc và hàng chờ câu trả lời

Spike đứng đầu vì nó quyết định cả plan. **Nếu trên một trong hai máy bốn nút không hiện, hoặc bấm nút vẫn mở app, thì dừng ở cuối task này và hỏi huynh** trước khi đi tiếp. Phương án lùi của spec §16: chạm thông báo mở thẳng hộp Chờ chấm.

**Files:**
- Create: `android/app/src/main/java/com/judexp/app/ReminderAlarm.java` (giá trị thuần, không dùng kiểu Android)
- Create: `android/app/src/main/java/com/judexp/app/ReminderAnswer.java` (dựng JSON câu trả lời, thuần)
- Create: `android/app/src/main/java/com/judexp/app/ReminderPlugin.java`
- Create: `android/app/src/main/java/com/judexp/app/ReminderAlarmReceiver.java`
- Create: `android/app/src/main/java/com/judexp/app/ReminderActionReceiver.java`
- Create: `android/app/src/test/java/com/judexp/app/ReminderAnswerTest.java`
- Create: `src/plugins/reminders.ts`
- Modify: `android/app/src/main/java/com/judexp/app/MainActivity.java` (`registerPlugin(ReminderPlugin.class)`)
- Modify: `android/app/src/main/AndroidManifest.xml` (quyền `POST_NOTIFICATIONS`, hai receiver `exported="false"`)
- Modify: `android/app/build.gradle` (`testImplementation "org.json:json:20240303"`, vì `org.json` trong `android.jar` chỉ là stub khi chạy JUnit trên Mac)

**Interfaces:**
- Consumes: không
- Produces:

```ts
// src/plugins/reminders.ts
export interface ReminderSchedule {
  notificationId: number;
  reminderId: string;
  kind: string;
  key: string;
  label: string;
  lookedUpAt: string;
  expiresAt: string;
  /** Epoch milliseconds. */
  at: number;
}
export interface ReminderNativePlugin {
  permission(): Promise<{ granted: boolean }>;
  requestPermission(): Promise<{ granted: boolean }>;
  /** Replaces any alarm and any shown notification with the same notificationId. */
  schedule(options: ReminderSchedule): Promise<void>;
  cancel(options: { notificationId: number }): Promise<void>;
}
export const ReminderNative = registerPlugin<ReminderNativePlugin>('Reminder');
```

```java
// ReminderAlarm: final fields notificationId, reminderId, kind, key, label, lookedUpAt, expiresAt, atMs.
// ReminderAlarmReceiver.schedule(Context, ReminderAlarm) is the one place that sets an alarm (Task 2 reuses it).
// ReminderAnswer.toJson(String answerId, ReminderAlarm alarm, String answer, long answeredAtMs) -> String
// ReminderAnswer.DIR = "reminder-answers"
```

- [ ] **Step 1: Viết JUnit đỏ cho `ReminderAnswer`**

`ReminderAnswerTest`:
- `toJsonCarriesEveryFieldInUtc`: với `answeredAtMs = 1792145633374L` thì `answeredAt` là `"2026-10-16T10:13:53.374Z"`, và `answerId`, `reminderId`, `kind`, `key`, `label`, `lookedUpAt`, `expiresAt`, `answer` khớp đầu vào.
- `labelWithQuotesAndDiacriticsRoundTrips`: nhãn `Quán "Ngon" Đà Lạt` đọc lại qua `new JSONObject(...)` ra đúng chuỗi đó.
- `rejectsAnAnswerOutsideTheFour`: `answer = "maybe"` ném `IllegalArgumentException`.

- [ ] **Step 2: Chạy và xác nhận đỏ**

Run: `cd android && ./gradlew testDebugUnitTest --tests com.judexp.app.ReminderAnswerTest`
Expected: FAIL vì `ReminderAnswer` chưa có.

- [ ] **Step 3: Viết `ReminderAlarm`, `ReminderAnswer`**

`toJson` dùng `JSONObject`. Định dạng giờ bằng `SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)` với múi `UTC`.

- [ ] **Step 4: Chạy JUnit, xác nhận xanh**

Run: `cd android && ./gradlew testDebugUnitTest --tests com.judexp.app.ReminderAnswerTest`
Expected: PASS, 3 test.

- [ ] **Step 5: Viết plugin và hai receiver**

- `ReminderPlugin`: `@CapacitorPlugin(name = "Reminder", permissions = @Permission(alias = "notifications", strings = { Manifest.permission.POST_NOTIFICATIONS }))`. Dưới API 33 thì `permission()` trả `granted: true`. `schedule` hủy thông báo đang hiện cùng `notificationId` rồi gọi `ReminderAlarmReceiver.schedule`. `cancel` hủy cả alarm lẫn thông báo.
- `ReminderAlarmReceiver.schedule`: `PendingIntent.getBroadcast(ctx, notificationId, intent, FLAG_UPDATE_CURRENT | FLAG_IMMUTABLE)`, mọi trường của `ReminderAlarm` đi bằng extras, rồi `setAndAllowWhileIdle(RTC_WAKEUP, atMs, pi)`.
- `ReminderAlarmReceiver.onReceive`: tạo channel `reminders` (tên "Nhắc chấm", `IMPORTANCE_HIGH`). Thông báo có tiêu đề `Chấm chuyến <label>?` và nội dung `Tra lúc <HH:mm>. Chạm một nút là xong.`. Gắn bốn action theo thứ tự Tốt, Ổn, Xấu, Không đi, mỗi action là một `PendingIntent.getBroadcast` tới `ReminderActionReceiver`, với request code `notificationId * 4 + i` để bốn nút không đè nhau. `setTimeoutAfter(expiresAt - now)`. Chạm vào thân thông báo thì mở `MainActivity`. `setAutoCancel(true)`.
- `ReminderActionReceiver.onReceive`: sinh `UUID.randomUUID()`, ghi `ReminderAnswer.toJson(...)` vào `getFilesDir()/reminder-answers/<answerId>.json` (ghi ra file `.tmp` rồi `renameTo` để JS không bao giờ đọc phải nửa file), rồi hủy thông báo. Không mở activity nào.

- [ ] **Step 6: Build, cài lên dGen1 và UBS1, nghiệm thu S5**

Run: `npm run build && npx cap sync android && cd android && ./gradlew assembleDebug` rồi `adb -s <máy> install -r app/build/outputs/apk/debug/app-debug.apk`.

Trên từng máy, gọi plugin qua WebView debug (CDP, như cách nghiệm thu S2): `requestPermission()` (huynh bấm Cho phép trên hộp thoại hệ thống), rồi `schedule({ notificationId: 4242, reminderId: 'driver:59H123456', kind: 'driver', key: '59H123456', label: '59H1-234.56', lookedUpAt, expiresAt, at: Date.now() + 30_000 })`. Chuyển app ra nền.

Expected, đủ cả năm điều thì S5 đạt:
1. Khoảng 30 giây sau có thông báo với đúng bốn nút Tốt, Ổn, Xấu, Không đi.
2. Bấm Xấu thì thông báo biến mất.
3. `adb shell dumpsys activity activities | grep topResumedActivity` không phải `com.judexp.app` (app không bị mở lên).
4. `adb shell run-as com.judexp.app ls files/reminder-answers` có đúng một file, nội dung `"answer":"bad"`.
5. Không còn file `.tmp` nào.

Ghi kết quả từng máy vào ledger. Máy nào trượt điều 1 hoặc 3 thì dừng và hỏi huynh.

- [ ] **Step 7: Commit**

```bash
git add android src/plugins/reminders.ts
git commit -m "feat: reminder notifications whose buttons answer without opening the app"
```

---

### Task 2: Hẹn lại nhắc sau khi khởi động lại máy

**Files:**
- Create: `android/app/src/main/java/com/judexp/app/ReminderReschedule.java` (thuần)
- Create: `android/app/src/main/java/com/judexp/app/ReminderBootReceiver.java`
- Create: `android/app/src/test/java/com/judexp/app/ReminderRescheduleTest.java`
- Modify: `android/app/src/main/AndroidManifest.xml` (quyền `RECEIVE_BOOT_COMPLETED`; receiver `exported="true"` nghe `BOOT_COMPLETED` và `MY_PACKAGE_REPLACED`)

**Interfaces:**
- Consumes: `ReminderAlarm`, `ReminderAlarmReceiver.schedule(Context, ReminderAlarm)` (Task 1); hợp đồng `pending.json` (Global Constraints)
- Produces: `static List<ReminderAlarm> ReminderReschedule.afterBoot(String pendingJson, long nowMs)`

- [ ] **Step 1: Viết JUnit đỏ**

`ReminderRescheduleTest`, dùng chuỗi `pending.json` viết tay:
- `keepsAFutureDueTime`: `dueAt` sau `now` thì `atMs` bằng đúng `dueAt`.
- `firesSoonWhenTheDueTimePassedWhileOff`: `dueAt` trước `now`, `expiresAt` sau `now` thì `atMs = now + 60_000`.
- `dropsExpiredReminders`: `expiresAt <= now` thì không có alarm nào.
- `ignoresMalformedJson`: chuỗi `"{oops"` cho danh sách rỗng, không ném lỗi.
- `ignoresAnUnknownVersion`: `"version": 2` cho danh sách rỗng.

- [ ] **Step 2: Chạy và xác nhận đỏ**

Run: `cd android && ./gradlew testDebugUnitTest --tests com.judexp.app.ReminderRescheduleTest`
Expected: FAIL vì `ReminderReschedule` chưa có.

- [ ] **Step 3: Viết `ReminderReschedule.afterBoot` và `ReminderBootReceiver`**

Parse mốc ISO bằng `SimpleDateFormat` UTC, chấp nhận cả có lẫn không có phần mili giây. Receiver đọc `getFilesDir()/pending.json`, không có file thì thôi, rồi gọi `ReminderAlarmReceiver.schedule` cho từng alarm.

- [ ] **Step 4: Chạy JUnit, xác nhận xanh**

Run: `cd android && ./gradlew testDebugUnitTest`
Expected: PASS, cả `ReminderAnswerTest` lẫn `ReminderRescheduleTest`.

- [ ] **Step 5: Commit**

```bash
git add android
git commit -m "feat: restore pending reminders after a reboot or an app update"
```

Nghiệm thu trên máy để ở Task 10, vì cần `pending.json` thật do Task 9 ghi.

---

### Task 3: Luật hẹn nhắc (domain)

**Files:**
- Create: `src/domain/reminders.ts`
- Test: `src/domain/reminders.test.ts`

**Interfaces:**
- Consumes: `EntityKind` từ `src/domain/events.ts`
- Produces:

```ts
export interface LookupTarget { kind: EntityKind; key: string; label: string }
export interface Reminder {
  id: string; notificationId: number; kind: EntityKind; key: string; label: string;
  lookedUpAt: string; dueAt: string; expiresAt: string;
}
export const REMIND_AFTER_MS: number;   // 90 * 60_000
export const GIVE_UP_AFTER_MS: number;  // 48 * 60 * 60_000
export function reminderFor(target: LookupTarget, now: Date): Reminder;
/** Drops expired ones, then replaces any reminder with the same id. */
export function remember(list: Reminder[], target: LookupTarget, now: Date): Reminder[];
export function stillPending(list: Reminder[], now: Date): Reminder[];
/** Stable for an id, in 1..2147483647. */
export function notificationIdFor(id: string): number;
```

- [ ] **Step 1: Viết test đỏ**

- `reminds 90 minutes after the lookup and gives up 48 hours after it`: `reminderFor({ kind: 'driver', key: '59H123456', label: '59H1-234.56' }, new Date('2026-10-18T11:40:00Z'))` có `id === 'driver:59H123456'`, `dueAt === '2026-10-18T13:10:00.000Z'`, `expiresAt === '2026-10-20T11:40:00.000Z'`, `lookedUpAt === '2026-10-18T11:40:00.000Z'`.
- `moves the reminder of an entity looked up again instead of adding one`: tra lúc 11:40 rồi 12:00 thì còn đúng một nhắc, `dueAt === '2026-10-18T13:30:00.000Z'`.
- `keeps reminders for different entities apart`: hai biển khác nhau cho hai nhắc.
- `drops a reminder once 48 hours have passed`: `stillPending` đúng tại `expiresAt` thì đã bỏ, một mili giây trước đó thì còn.
- `gives each id a stable positive notification id`: gọi hai lần cùng `id` ra cùng số; số nằm trong `1..2147483647`; `'driver:59H123456'` khác `'driver:59H123457'`.

- [ ] **Step 2: Chạy và xác nhận đỏ**

Run: `npx vitest run src/domain/reminders.test.ts`
Expected: FAIL vì module chưa có.

- [ ] **Step 3: Viết `src/domain/reminders.ts`**

`notificationIdFor` dùng băm chuỗi 32 bit kiểu Java `hashCode`, rồi `(h & 0x7fffffff) || 1`.

- [ ] **Step 4: Chạy và xác nhận xanh**

Run: `npx vitest run src/domain/reminders.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/reminders.ts src/domain/reminders.test.ts
git commit -m "feat: reminder schedule rules, 90 minutes after a lookup, gone after 48 hours"
```

---

### Task 4: Một lần tra trỏ vào ai

**Files:**
- Modify: `src/domain/keys.ts` (thêm `looksLikeFullPlate`)
- Create: `src/search/lookupTarget.ts`
- Test: `src/domain/keys.test.ts`, `src/search/lookupTarget.test.ts`

**Interfaces:**
- Consumes: `LookupTarget` (Task 3), `Entity` từ `src/domain/reduce.ts`, `normalizePlate`
- Produces:

```ts
// keys.ts: a complete Vietnamese plate after normalizePlate: /^\d{2}[A-Z]{1,2}\d{4,6}$/
export function looksLikeFullPlate(raw: string): boolean;
// lookupTarget.ts
export function lookupTarget(query: string, results: Entity[]): LookupTarget | null;
```

- [ ] **Step 1: Viết test đỏ**

`keys.test.ts`, `describe('looksLikeFullPlate')`: đúng với `'59H1-234.56'`, `'51A-123.45'`, `'29LD-123.45'`, `'51A1234'`; sai với `'59h1'`, `'23456'`, `'Bún bò Huế 14'`, `''`.

`lookupTarget.test.ts`:
- `points at the one entity the search found`: một kết quả là thực thể driver `59H123456` có nhãn `['59H1-234.56']` thì trả `{ kind: 'driver', key: '59H123456', label: '59H1-234.56' }`.
- `points at a new driver when a full plate finds nothing`: `lookupTarget(' 51a-999.99 ', [])` trả `{ kind: 'driver', key: '51A99999', label: '51a-999.99' }`.
- `points at nobody while the plate is still being typed`: `lookupTarget('59h1', [])` là `null`.
- `points at nobody when several entities match`: hai kết quả thì `null`.
- `points at nobody for an empty query`: `null`.

- [ ] **Step 2: Chạy và xác nhận đỏ**

Run: `npx vitest run src/domain/keys.test.ts src/search/lookupTarget.test.ts`
Expected: FAIL.

- [ ] **Step 3: Viết `looksLikeFullPlate` và `lookupTarget`**

Nhãn của thực thể có sẵn là nhãn mới nhất (`labels.at(-1)`), không có thì dùng `key`. Nhãn của biển mới là chuỗi huynh gõ, đã `trim`.

- [ ] **Step 4: Chạy và xác nhận xanh**

Run: `npx vitest run src/domain/keys.test.ts src/search/lookupTarget.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/keys.ts src/domain/keys.test.ts src/search/lookupTarget.ts src/search/lookupTarget.test.ts
git commit -m "feat: decide which entity a finished lookup is about"
```

---

### Task 5: Kho nhắc và hàng chờ câu trả lời trên file

**Files:**
- Create: `src/reminders/reminderStore.ts`
- Test: `src/reminders/reminderStore.test.ts`

**Interfaces:**
- Consumes: `Reminder` (Task 3); hai hợp đồng file (Global Constraints)
- Produces:

```ts
export type Answer = 'good' | 'ok' | 'bad' | 'skip';
export interface ReminderAnswer {
  answerId: string; reminderId: string; kind: EntityKind; key: string; label: string;
  lookedUpAt: string; expiresAt: string; answer: Answer; answeredAt: string;
}
export interface ReminderStore {
  load(): Promise<Reminder[]>;
  save(list: Reminder[]): Promise<void>;
  /** Oldest answeredAt first. Unreadable or malformed files are skipped. */
  answers(): Promise<ReminderAnswer[]>;
  clearAnswer(answerId: string): Promise<void>;
}
export type ReminderFs = Pick<FilesystemPlugin, 'readFile' | 'writeFile' | 'readdir' | 'deleteFile'>;
export function fileReminderStore(fs: ReminderFs): ReminderStore;
```

- [ ] **Step 1: Viết test đỏ**

Theo cách `src/index/snapshotStore.test.ts` dựng một filesystem giả trong bộ nhớ:
- `has no reminders before the first lookup`: không có `pending.json` thì `load()` trả `[]`.
- `saves and loads reminders in the version 1 wrapper`: sau `save([r])`, file `pending.json` parse ra `{ version: 1, reminders: [r] }`, và `load()` trả `[r]`.
- `reads every answer, oldest first`: hai file trong `reminder-answers/` có `answeredAt` đảo thứ tự thì `answers()` trả theo `answeredAt` tăng dần.
- `skips an answer file it cannot use`: file JSON hỏng và file có `answer: 'maybe'` bị bỏ qua, file tốt vẫn được trả.
- `has no answers when the folder does not exist yet`: `readdir` ném lỗi thì `answers()` trả `[]`.
- `clears one answer by deleting its file`: `clearAnswer('a1')` xóa đúng `reminder-answers/a1.json`.
- Mọi lần đọc ghi đều dùng `Directory.Data` và `Encoding.UTF8`.

- [ ] **Step 2: Chạy và xác nhận đỏ**

Run: `npx vitest run src/reminders/reminderStore.test.ts`
Expected: FAIL.

- [ ] **Step 3: Viết `fileReminderStore`**

`load()` trả `[]` khi file không có, hỏng, hoặc `version` khác 1: đây là dữ liệu của chính app, mất thì chỉ mất nhắc chứ không mất event.

- [ ] **Step 4: Chạy và xác nhận xanh**

Run: `npx vitest run src/reminders/reminderStore.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/reminders
git commit -m "feat: keep pending reminders and tapped answers in app-private files"
```

---

### Task 6: Biến câu trả lời thành event

**Files:**
- Create: `src/reminders/settle.ts`
- Modify: `src/domain/events.ts` (`SourceKind` thêm `'reminder'`)
- Test: `src/reminders/settle.test.ts`

**Interfaces:**
- Consumes: `ReminderStore`, `ReminderAnswer` (Task 5), `stillPending` (Task 3), `newEncounter`
- Produces:

```ts
export interface Identity { author: string; device: string }
/** null for "Không đi" and for an answer given after the reminder expired. */
export function eventFromAnswer(answer: ReminderAnswer, who: Identity): JudexpEvent | null;
/** Writes each usable answer, then clears it and its reminder. Keeps an answer whose write failed. */
export function settleAnswers(
  store: ReminderStore,
  write: (event: JudexpEvent) => Promise<void>,
  who: Identity,
): Promise<{ written: number; kept: number }>;
```

- [ ] **Step 1: Viết test đỏ**

- `turns a tapped verdict into an encounter dated when it was tapped`: câu trả lời `bad` cho ra event có `type: 'encounter'`, `eventId === answerId`, `createdAt === answeredAt`, `context.happenedAt === lookedUpAt`, `entityRef` đúng `{ kind, key, label }`, `verdict: 'bad'`, `tags: []`, `source: { kind: 'reminder' }`, `author` và `device` lấy từ `who`.
- `writes nothing for Không đi but still clears it and its reminder`: `skip` thì không gọi `write`, `clearAnswer` được gọi, nhắc biến khỏi `pending.json`.
- `writes nothing for an answer given after 48 hours`: `answeredAt >= expiresAt` thì không gọi `write`, câu trả lời vẫn bị dọn.
- `keeps the answer for next time when the kho cannot be written`: `write` ném lỗi thì `clearAnswer` không được gọi, nhắc vẫn còn, kết quả `{ written: 0, kept: 1 }`.
- `does not clear a newer reminder for the same entity`: `pending.json` có nhắc cùng `id` nhưng `lookedUpAt` mới hơn câu trả lời thì nhắc đó vẫn còn.
- `gives the same event id when an answer is settled twice`: settle cùng một câu trả lời hai lần (giả lập máy tắt giữa lúc ghi xong và lúc dọn) thì hai event có cùng `eventId`.

- [ ] **Step 2: Chạy và xác nhận đỏ**

Run: `npx vitest run src/reminders/settle.test.ts`
Expected: FAIL.

- [ ] **Step 3: Viết `settle.ts`, thêm `'reminder'` vào `SourceKind`**

Dựng event bằng `newEncounter({ ..., now: new Date(answeredAt), eventId: answerId })`. Nhắc chỉ bị gỡ khi nhắc trong `pending.json` có cùng `id` **và** cùng `lookedUpAt` với câu trả lời.

- [ ] **Step 4: Chạy toàn bộ suite, xác nhận xanh**

Run: `npx vitest run`
Expected: PASS, không test cũ nào đỏ.

- [ ] **Step 5: Commit**

```bash
git add src/reminders/settle.ts src/reminders/settle.test.ts src/domain/events.ts
git commit -m "feat: turn tapped reminder answers into encounters when the app opens"
```

---

### Task 7: Màn Tra cứu báo một lần tra đã xong

**Files:**
- Modify: `src/ui/LookupPage.tsx`
- Test: `src/ui/LookupPage.test.tsx`

**Interfaces:**
- Consumes: `lookupTarget` (Task 4), `LookupTarget` (Task 3)
- Produces: prop mới `onLookup?: (target: LookupTarget) => void` trên `LookupPage`; hằng `SETTLE_MS = 2500`

- [ ] **Step 1: Viết test đỏ (dùng `vi.useFakeTimers`)**

- `reports a lookup once the box has been still for 2.5 seconds`: gõ `'59H1-234.56'` khi state có thực thể đó; tới 2499 ms chưa gọi, tới 2500 ms thì `onLookup` được gọi đúng một lần với `{ kind: 'driver', key: '59H123456', label: '59H1-234.56' }`.
- `reports a new full plate that finds nothing`: gõ `'51A99999'` vào state rỗng rồi chờ 2500 ms thì nhận được target driver `51A99999`.
- `does not report while several entities match or the plate is half typed`: `'59h1'` với hai thực thể khớp thì không gọi.
- `does not report the same settled query twice`: render lại với state mới (giả lập index refresh) mà query không đổi thì không gọi thêm.
- `reports at once when a result is opened`: gõ `'23456'`, bấm vào dòng kết quả thì `onLookup` được gọi ngay với thực thể đó, trước `onOpen`.
- `does not report opening a row from Gặp gần đây`: query rỗng, bấm một dòng trong danh sách gặp gần đây thì không gọi.

- [ ] **Step 2: Chạy và xác nhận đỏ**

Run: `npx vitest run src/ui/LookupPage.test.tsx`
Expected: FAIL ở các test mới.

- [ ] **Step 3: Viết phần đếm giờ và báo trong `LookupPage`**

Một `setTimeout` đặt lại mỗi khi query đổi. Nhớ query đã báo gần nhất để không báo lặp.

- [ ] **Step 4: Chạy và xác nhận xanh**

Run: `npx vitest run src/ui/LookupPage.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/LookupPage.tsx src/ui/LookupPage.test.tsx
git commit -m "feat: the lookup screen reports a finished lookup"
```

---

### Task 8: Hộp Chờ chấm

**Files:**
- Create: `src/ui/PendingBox.tsx`
- Modify: `src/ui/LookupPage.tsx` (hiện hộp khi query rỗng, trên "Gặp gần đây"), `src/ui/QuickRateSheet.tsx` (export `VERDICTS`)
- Test: `src/ui/PendingBox.test.tsx`, `src/ui/LookupPage.test.tsx`

**Interfaces:**
- Consumes: `Reminder` (Task 3), `Answer` (Task 5), `VERDICTS`, `relativeTime`, `EntityRow`
- Produces:

```ts
export default function PendingBox(props: {
  reminders: Reminder[];
  /** Entities with at least one unrated encounter, most recent first, at most 10. */
  unrated: Entity[];
  now: Date;
  onAnswer: (reminder: Reminder, answer: Answer) => void;
  onOpen: (key: string) => void;
}): JSX.Element | null;
```

`LookupPage` có thêm props `reminders: Reminder[]` và `onAnswer: (reminder: Reminder, answer: Answer) => void`, và tự tính `unrated` từ `state`: thực thể chưa bị gộp, có ít nhất một lần gặp `verdict === null`, xếp theo `instant(lastSeen)` giảm dần, lấy tối đa 10.

- [ ] **Step 1: Viết test đỏ**

`PendingBox.test.tsx`:
- `lists each pending reminder with the four answers`: một nhắc cho `59H1-234.56` hiện nhãn đó trong class `jx-plate`, hiện `tra hôm nay`, và có đúng bốn nút tên `Tốt`, `Ổn`, `Xấu`, `Không đi`.
- `answers a reminder with the tapped button`: bấm `Xấu` thì `onAnswer` được gọi với `(reminder, 'bad')`; bấm `Không đi` thì với `'skip'`.
- `lists entities met but never rated`: một thực thể có lần gặp chưa chấm hiện thành `EntityRow`, bấm vào thì gọi `onOpen(key)`.
- `shows nothing when nothing waits`: hai danh sách rỗng thì component trả `null` (không có tiêu đề `Chờ chấm`).

`LookupPage.test.tsx`:
- `shows Chờ chấm above Gặp gần đây when the box is empty`: có một nhắc thì tiêu đề `Chờ chấm` đứng trước `Gặp gần đây` trong DOM.

- [ ] **Step 2: Chạy và xác nhận đỏ**

Run: `npx vitest run src/ui/PendingBox.test.tsx src/ui/LookupPage.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Viết `PendingBox` và nối vào `LookupPage`**

Tiêu đề dùng `jx-section-title` như "Gặp gần đây". Nút trả lời dùng `jx-row` hoặc class nút sẵn có của `QuickRateSheet`, cao tối thiểu 56px theo token chạm.

- [ ] **Step 4: Chạy và xác nhận xanh**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui
git commit -m "feat: Chờ chấm box for pending reminders and unrated meetings"
```

---

### Task 9: Nối nhắc vào app và Cài đặt

**Files:**
- Modify: `src/AppShell.tsx`, `src/App.tsx`, `src/ui/SettingsPage.tsx`
- Test: `src/AppShell.test.tsx`, `src/ui/SettingsPage.test.tsx`

**Interfaces:**
- Consumes: `ReminderNativePlugin`, `ReminderNative` (Task 1), `remember`, `stillPending` (Task 3), `ReminderStore`, `fileReminderStore` (Task 5), `settleAnswers`, `eventFromAnswer` (Task 6), `onLookup` (Task 7), `PendingBox` qua `LookupPage` (Task 8)
- Produces:
  - `AppShell` có thêm prop bắt buộc `reminders: { native: ReminderNativePlugin; store: ReminderStore }`. `App.tsx` truyền `{ native: ReminderNative, store: fileReminderStore(Filesystem) }`, khai báo ở module scope như `snapshots`.
  - `SettingsPage` có thêm props `notifications: 'on' | 'off' | 'unknown'` và `onAskNotifications: () => void`.

Hành vi:
- **Xin quyền:** một lần, ngay sau khi kho mở xong, nếu `permission()` trả `granted: false` và Preferences chưa có khóa `judexp.notificationsAsked`; xin xong thì ghi khóa đó. Không bao giờ xin giữa lúc tra cứu: lúc đó huynh đang đứng ngoài đường với tài xế chờ, hộp thoại hệ thống sẽ che mất thẻ quyết định. Nút "Bật thông báo" trong Cài đặt xin lại bất cứ lúc nào.
- **Tra xong:** `remember(...)` với `clock()`, lưu, cập nhật state. Có quyền thì `native.schedule({ ...reminder, reminderId: reminder.id, at: Date.parse(reminder.dueAt) })`. Không có quyền thì vẫn lưu, nhắc chỉ hiện trong hộp Chờ chấm.
- **Settle:** chạy `settleAnswers` sau lượt `refresh` đầu tiên và mỗi khi `now` của `useNow` đổi (tức là khi app quay lại foreground và mỗi phút), chỉ khi kho đã mở. Nếu `written > 0` thì `refresh(dirs)`. Sau đó nạp lại nhắc từ store.
- **Trả lời trong hộp Chờ chấm:** dựng `ReminderAnswer` với `answerId = crypto.randomUUID()` và `answeredAt = clock().toISOString()`, ghi qua `eventFromAnswer` cộng `writeEvent` (bỏ qua bước này với `skip`). Ghi lỗi thì báo bằng banner "Chưa ghi được lần chấm này" như `save`, và giữ nguyên nhắc. Ghi xong hoặc `skip` thì gỡ nhắc khỏi store và gọi `native.cancel({ notificationId })`.

- [ ] **Step 1: Viết test đỏ**

`AppShell.test.tsx`, dùng native giả (ghi lại mọi lời gọi, `permission` trả theo cấu hình) và store trong bộ nhớ:
- `a finished lookup saves a reminder and schedules it 90 minutes later`: gõ `'51A99999'`, chờ 2500 ms (fake timers), thì store có một nhắc và `schedule` được gọi với `at === NOW + 90 * 60_000`.
- `asks for notifications once when the kho opens, never during a lookup`: lần mở đầu `requestPermission` được gọi đúng một lần trước khi gõ gì; gõ và tra xong không gọi thêm; mở lại app (render lại với cùng Preferences) cũng không gọi thêm.
- `keeps the reminder for Chờ chấm when notifications are refused`: `permission` trả `granted: false` thì `schedule` không được gọi, nhưng hộp Chờ chấm hiện nhắc đó.
- `turns an answer tapped on the notification into an event when the app opens`: store có sẵn một câu trả lời `good` thì sau khi mở app, kho có đúng một file event với `verdict: 'good'` và `eventId` bằng `answerId`, câu trả lời đã bị dọn.
- `answering in Chờ chấm writes one event and cancels the notification`: bấm `Xấu` trong hộp thì kho có một event `bad`, nhắc biến mất, `cancel` được gọi với đúng `notificationId`.
- `Không đi in Chờ chấm writes nothing`: bấm `Không đi` thì kho không có file nào, nhắc biến mất.

`SettingsPage.test.tsx`:
- `says when reminder notifications are off and asks again on tap`: `notifications: 'off'` thì hiện `Thông báo nhắc chấm đang tắt, chỉ còn hộp Chờ chấm` và nút `Bật thông báo`; bấm nút thì gọi `onAskNotifications`.

- [ ] **Step 2: Chạy và xác nhận đỏ**

Run: `npx vitest run src/AppShell.test.tsx src/ui/SettingsPage.test.tsx`
Expected: FAIL ở các test mới. Mọi `render(<AppShell …>)` cũ phải truyền thêm `reminders` giả.

- [ ] **Step 3: Viết phần nối trong `AppShell`, `App` và `SettingsPage`**

- [ ] **Step 4: Chạy toàn bộ, xác nhận xanh**

Run: `npx vitest run && npx tsc -b && npm run build`
Expected: test PASS, typecheck sạch, build sạch.

- [ ] **Step 5: Commit**

```bash
git add src
git commit -m "feat: schedule a reminder after each lookup and settle the answers"
```

---

### Task 10: Nghiệm thu M4 trên hai máy, cập nhật spec

**Files:**
- Modify: `docs/superpowers/specs/2026-10-16-judexp-design.md` (§8 thêm `reminder` vào danh sách `source.kind`; §16 ghi kết quả S5)

- [ ] **Step 1: Build và cài lên dGen1 và UBS1**

Run: `npm run build && npx cap sync android && cd android && ./gradlew assembleDebug`, rồi `adb -s <máy> install -r …`. Kiểm `adb shell date` trên UBS1 trước, vì đồng hồ máy đó từng tụt về năm 2024.

- [ ] **Step 2: Nghiệm thu đường thật, không chờ đủ 90 phút**

Trên dGen1:
1. Gõ một biển số có trong kho và đứng yên 3 giây. Expected: `run-as com.judexp.app cat files/pending.json` có một nhắc với `dueAt` đúng bằng `lookedUpAt` cộng 90 phút, và `adb shell dumpsys alarm | grep judexp` có một alarm.
2. Lối tắt có chủ đích, vì phép tính 90 phút đã có unit test: qua CDP gọi `ReminderNative.schedule` cho **đúng nhắc đó** với `at: Date.now() + 30_000`. Chuyển app ra nền, chờ thông báo, bấm **Tốt**. Expected: app không bật lên, và trong `files/reminder-answers/` có một file.
3. Mở app bằng `monkey`. Expected: kho có một file event mới với `verdict: "good"`, `source.kind: "reminder"`, `context.happenedAt` bằng `lookedUpAt`; hàng chờ đã trống; nhắc biến khỏi hộp Chờ chấm; thực thể đổi sang màu xanh; đèn Syncthing về "Đã đẩy hết sang Atomman".
4. Tra một biển khác, đứng yên, rồi bấm **Không đi** trong hộp Chờ chấm. Expected: không có file event mới.

Trên UBS1: lặp lại ý 2 và 3, rồi kiểm phần khởi động lại máy. Tra một biển, xin huynh đồng ý trước rồi mới `adb reboot`. Sau khi boot, `dumpsys alarm | grep judexp` vẫn có alarm.

- [ ] **Step 3: Tùy huynh, chờ đủ 90 phút thật một lần**

Tra một biển trên dGen1, để máy yên, 90 phút sau (có thể lệch vài phút vì alarm không chính xác) phải có thông báo.

- [ ] **Step 4: Cập nhật spec và ledger, commit**

```bash
git add docs/superpowers/specs/2026-10-16-judexp-design.md
git commit -m "docs: record reminder answers as a source kind and close spike S5"
```
