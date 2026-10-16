# Judexp Plan 1: Nền tảng app

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Một APK Android cài được, chọn được kho Syncthing, ghi và tra cứu trải nghiệm cá nhân bằng tay, chạy đủ cả khi không mạng.

**Architecture:** App local-first không backend. Mọi thứ ghi ra là **file event chỉ-thêm** trong folder kho do Syncthing đồng bộ; app đọc kho qua Storage Access Framework. Trạng thái tra cứu là **dữ liệu phái sinh dựng ở local**: plan này dùng in-memory cộng một snapshot JSON trong vùng dữ liệu app, thay cho SQLite ở §7 của spec, vì đọc file qua SAF tốn 5 tới 20ms mỗi file nên snapshot là bắt buộc dù có SQLite hay không, mà đã có snapshot thì SQLite không thêm gì ở mức vài nghìn bản ghi. Hợp đồng query giữ nguyên để đổi về sau không ảnh hưởng tầng trên.

**Tech Stack:** Capacitor 7 + Ionic React + Vite + TypeScript, vitest cộng @testing-library/react, ba plugin native Java lift từ Gú's Library, build hoàn toàn bằng CLI.

**Spec:** `docs/superpowers/specs/2026-10-16-judexp-design.md`

**Phủ mốc:** M0, M0.5, M1. Không phủ: worker, parse ảnh, camera, nhắc chấm (plan 2 tới 4).

## Global Constraints

- **Code, comment, tên biến, commit message: tiếng Anh.** Tài liệu và chuỗi hiện trên màn hình: tiếng Việt.
- **Không bao giờ sửa hay xóa file trong `events/`.** Sửa là ghi event `amend`, xóa là ghi `tombstone`.
- **`src/domain/` và `src/search/` không được import Capacitor, SAF, hay bất cứ thứ gì chạm file.** Nhận dữ liệu thuần, trả dữ liệu thuần.
- **Index là dữ liệu phái sinh:** nằm trong vùng dữ liệu riêng của app, không nằm trong kho, không sync, hỏng thì dựng lại.
- Tên file event: `<ISO8601 compact>_<device>_<uuid7>.json`, ví dụ `20261016T190322Z_zflip4_a3f9c21.json`.
- **Mọi logic sắp xếp dùng `createdAt` trong nội dung, không dùng tên file.**
- Bỏ qua mọi file có `.sync-conflict` trong tên và ghi log.
- `appId` là `com.judexp.app`. `schemaVersion` của event là `1`.
- Build bằng CLI, **không mở Android Studio**. JDK 21, Android SDK 36.
- Không dùng em dash trong mọi văn bản.

## Review Focus

Năm ca spec ngầm định mà không task nào tự nhiên test tới. Mỗi dòng đã được gắn một test vào task sở hữu đoạn code đó.

1. **File JSON hỏng hoặc rỗng trong `events/`** (Syncthing đang đẩy dở, máy tắt giữa chừng). Index phải bỏ qua đúng file đó và tiếp tục, không được chết cả lượt dựng. → Task 8.
2. **File `.sync-conflict-*` lọt vào kho.** Bỏ qua và ghi log, không im lặng nuốt, cũng không coi là event thật. → Task 8.
3. **`lastModified` hoặc `size` trả về -1** vì DocumentsProvider không trả cột đó. Phải coi như "đã đổi" và đọc lại; coi hai file cùng -1 là bằng nhau sẽ làm mất event. → Task 8.
4. **Hai file chứa cùng một `eventId`** (nhân đôi do sync hoặc do người dùng chép tay). Dựng index phải idempotent theo `eventId`, không được tính hai lần. → Task 5.
5. **`createdAt` lệch hoặc ở tương lai** vì đồng hồ hai máy không khớp. Thứ tự apply theo `createdAt`, và một event tương lai không được làm hỏng trạng thái của thực thể. → Task 5.

---

### Task 1: Khung repo và toolchain

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `capacitor.config.ts`, `src/main.tsx`, `src/App.tsx`
- Test: `src/smoke.test.ts`

**Interfaces:**
- Consumes: không
- Produces: `npm test` chạy vitest, `npm run build` ra `dist/`, `npx cap sync android` chạy được

- [ ] **Step 1: Dựng khung Vite React TS**

Chạy trong repo rỗng hiện tại: `npm create vite@latest . -- --template react-ts`, rồi cài `@ionic/react @ionic/react-router ionicons react-router react-router-dom @capacitor/core @capacitor/preferences` và dev deps `@capacitor/cli @vitejs/plugin-react vitest jsdom @testing-library/react @testing-library/jest-dom typescript`.

- [ ] **Step 2: Thêm script test và cấu hình vitest**

`"test": "vitest run"` trong `package.json`, môi trường `jsdom` trong `vite.config.ts`.

- [ ] **Step 3: Viết test khói**

```ts
// src/smoke.test.ts
import { describe, it, expect } from 'vitest';
describe('toolchain', () => {
  it('runs vitest', () => { expect(1 + 1).toBe(2); });
});
```

- [ ] **Step 4: Chạy test**

Run: `npx vitest run`
Expected: PASS, 1 test.

- [ ] **Step 5: Cấu hình Capacitor**

`capacitor.config.ts` với `appId: 'com.judexp.app'`, `appName: 'Judexp'`, `webDir: 'dist'`. Rồi `npm run build && npx cap add android`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: scaffold Capacitor + Ionic React + vitest"
```

---

### Task 2: Lift ba plugin native và nghiệm thu ghi được vào kho thật

Đây là mốc M0 và nó đứng thứ hai vì nó là **rủi ro cao nhất**, không phải vì nó dễ. Spike S1 (SAF ghi vào folder con tự tạo) và S2 (nhận share ảnh) đóng ở đây. Không unit test được, nghiệm thu bằng máy thật.

**Files:**
- Create: `android/app/src/main/java/com/judexp/app/SafPlugin.java`, `ShareTargetPlugin.java`, `SyncthingPlugin.java` (chép từ `/Users/lavopavden/Dev/projects/Gu-Library/android/app/src/main/java/com/gulibrary/app/`, đổi `package` thành `com.judexp.app`)
- Create: `src/plugins/saf.ts`, `src/plugins/shareTarget.ts`, `src/plugins/syncthing.ts` (chép nguyên từ `Gu-Library/src/plugins/`)
- Modify: `android/app/src/main/java/com/judexp/app/MainActivity.java` để đăng ký ba plugin
- Create: `src/DebugKho.tsx` (màn tạm, xóa ở Task 12)

**Interfaces:**
- Produces:
  - `Saf.pickFolder(): Promise<{ uri: string }>`
  - `Saf.listFolder({ uri }): Promise<{ entries: SafEntry[] }>` với `SafEntry = { name, isDirectory, uri, size?, lastModified? }`
  - `Saf.readFile({ uri }): Promise<{ data: string }>` và `Saf.readFileBase64({ uri })`
  - `Saf.writeFile({ dirUri, name, content }): Promise<{ uri: string }>`
  - `Saf.ensureDir({ parentUri, name }): Promise<{ uri: string }>`
  - `Saf.deleteFile({ uri }): Promise<void>`
  - `ShareTarget.getSharedFiles(): Promise<{ files: { uri, name }[] }>`
  - `Syncthing.request({ url, apiKey }): Promise<{ status: number; data: string }>`

- [ ] **Step 1: Chép ba plugin Java và ba wrapper TS, đổi package name**

- [ ] **Step 2: Đăng ký plugin trong `MainActivity.java`**

Theo đúng cách `Gu-Library/android/app/src/main/java/com/gulibrary/app/MainActivity.java` đang đăng ký.

- [ ] **Step 3: Màn tạm `DebugKho.tsx` với ba nút**

Nút 1 gọi `Saf.pickFolder()` và hiện uri. Nút 2 gọi `Saf.ensureDir({ parentUri: uri, name: 'events' })` rồi `Saf.writeFile` một file `probe.json` nội dung `{"probe":true}`. Nút 3 gọi `Saf.listFolder` trên `events/` và hiện danh sách tên file.

- [ ] **Step 4: Build và cài lên máy thật**

Run: `npm run build && npx cap sync android && cd android && ./gradlew assembleDebug && adb install -r app/build/outputs/apk/debug/app-debug.apk`
Expected: cài xong, mở app không crash.

- [ ] **Step 5: Nghiệm thu S1 trên máy thật**

Chọn folder kho đã ghép Syncthing, bấm nút 2. Expected: trên Atomman xuất hiện `events\probe.json`, và trên **máy thứ hai** cũng thấy file đó. Đây là nghiệm thu M0.

- [ ] **Step 6: Nghiệm thu S2 trên máy thật**

Mở Grab, chụp màn hình, bấm Chia sẻ, chọn Judexp. Expected: `ShareTarget.getSharedFiles()` trả về một file có `uri` và `name`, đọc được bằng `Saf.readFileBase64`.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: lift SAF, ShareTarget and Syncthing native plugins"
```

---

### Task 3: Chuẩn hóa khóa thực thể

**Files:**
- Create: `src/domain/keys.ts`
- Test: `src/domain/keys.test.ts`

**Interfaces:**
- Produces: `normalizePlate(raw: string): string`, `normalizeName(raw: string): string`, `restaurantKey(name: string): string`, `dishKey(restaurantKey: string, dish: string): string`

- [ ] **Step 1: Viết test hỏng**

```ts
import { describe, it, expect } from 'vitest';
import { normalizePlate, normalizeName, dishKey } from './keys';

describe('normalizePlate', () => {
  it('strips separators and upper-cases', () => {
    expect(normalizePlate('59H1-234.56')).toBe('59H123456');
    expect(normalizePlate('59-H1 23456')).toBe('59H123456');
    expect(normalizePlate(' 59h1 234 56 ')).toBe('59H123456');
  });
});

describe('normalizeName', () => {
  it('strips diacritics, lower-cases, collapses spaces', () => {
    expect(normalizeName('  Bún   Bò Huế 14 ')).toBe('bun bo hue 14');
  });
  it('strips only leading generic prefixes', () => {
    expect(normalizeName('Quán Bún Bò')).toBe('bun bo');
    expect(normalizeName('Tiệm Cơm Tấm')).toBe('com tam');
    expect(normalizeName('Nhà Hàng Ngon')).toBe('ngon');
    expect(normalizeName('Cửa Hàng Tiện Lợi')).toBe('tien loi');
    expect(normalizeName('Phở Quán Mới')).toBe('pho quan moi');
  });
});

describe('dishKey', () => {
  it('scopes a dish under its restaurant', () => {
    expect(dishKey('bun bo hue 14', 'Bún Bò Đặc Biệt')).toBe('bun bo hue 14::bun bo dac biet');
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận hỏng**

Run: `npx vitest run src/domain/keys.test.ts`
Expected: FAIL, không import được module.

- [ ] **Step 3: Cài đặt `src/domain/keys.ts`**

Bỏ dấu bằng `normalize('NFD')` rồi xóa dải `̀-ͯ`, cộng xử lý riêng `đ` thành `d`. Danh sách tiền tố chỉ gồm `quán`, `tiệm`, `nhà hàng`, `cửa hàng` và **chỉ bỏ khi đứng đầu chuỗi**.

- [ ] **Step 4: Chạy test, xác nhận pass**

Run: `npx vitest run src/domain/keys.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/keys.ts src/domain/keys.test.ts
git commit -m "feat: normalize entity keys for plates, names and dishes"
```

---

### Task 4: Kiểu event và tên file

**Files:**
- Create: `src/domain/events.ts`
- Test: `src/domain/events.test.ts`

**Interfaces:**
- Produces:
  - Kiểu `EventType = 'encounter' | 'attach' | 'amend' | 'merge' | 'tombstone'`
  - Kiểu `Verdict = 'good' | 'ok' | 'bad'`
  - Kiểu `EntityKind = 'driver' | 'restaurant' | 'dish' | 'place'`
  - Kiểu `JudexpEvent` đúng §5 của spec, `verdict?: Verdict | null`
  - `eventFileName(e: JudexpEvent): string`
  - `parseEvent(raw: string): JudexpEvent | null` (trả `null` khi hỏng, không ném)
  - `newEncounter(input): JudexpEvent`

- [ ] **Step 1: Viết test hỏng**

```ts
describe('eventFileName', () => {
  it('encodes time, device and a short id', () => {
    const e = makeEvent({ createdAt: '2026-10-16T19:03:22+07:00', device: 'zflip4', eventId: 'a3f9c21d-...' });
    expect(eventFileName(e)).toBe('20261016T120322Z_zflip4_a3f9c21.json');
  });
});

describe('parseEvent', () => {
  it('returns null for malformed json', () => { expect(parseEvent('{oops')).toBeNull(); });
  it('returns null when schemaVersion is missing', () => { expect(parseEvent('{"type":"encounter"}')).toBeNull(); });
  it('accepts a null verdict as seen-but-unrated', () => {
    const e = parseEvent(JSON.stringify(makeEvent({ verdict: null })));
    expect(e?.verdict).toBeNull();
  });
});
```

Chú ý: `19:03:22+07:00` quy về UTC là `120322Z`, test phải khẳng định đúng điều đó.

- [ ] **Step 2: Chạy test, xác nhận hỏng**

Run: `npx vitest run src/domain/events.test.ts`

- [ ] **Step 3: Cài đặt `src/domain/events.ts`**

`parseEvent` bọc `JSON.parse` trong try catch và kiểm tối thiểu `schemaVersion === 1`, `eventId`, `type`, `createdAt`. Không ném ra ngoài.

- [ ] **Step 4: Chạy test, xác nhận pass**

Run: `npx vitest run src/domain/events.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/events.ts src/domain/events.test.ts
git commit -m "feat: define event schema v1 and file naming"
```

---

### Task 5: Dựng trạng thái từ danh sách event

**Files:**
- Create: `src/domain/reduce.ts`
- Test: `src/domain/reduce.test.ts`

**Interfaces:**
- Consumes: `JudexpEvent` từ Task 4
- Produces:
  - `type Entity = { key: string; kind: EntityKind; labels: string[]; firstSeen: string; lastSeen: string; encounters: Encounter[]; mergedInto?: string }`
  - `type Encounter = { eventId: string; verdict: Verdict | null; tags: string[]; note?: string; happenedAt: string; context?: Record<string, unknown> }`
  - `type State = { entities: Map<string, Entity> }`
  - `applyEvents(state: State, events: JudexpEvent[]): State`
  - `emptyState(): State`

- [ ] **Step 1: Viết test hỏng, gồm hai ca Review Focus**

```ts
it('records an encounter under its entity', ...);
it('attaches an entity to an encounter that had none', ...);
it('amend replaces fields of the target event', ...);
it('merge folds one entity into another and keeps both keys reachable', ...);
it('tombstone hides the target event', ...);
it('tombstone on a merge event undoes the merge', ...);

// Review Focus 4
it('is idempotent: the same eventId applied twice counts once', () => {
  const s = applyEvents(emptyState(), [e, e]);
  expect(s.entities.get('59H123456')!.encounters).toHaveLength(1);
});

// Review Focus 5
it('orders by createdAt, not by array order', ...);
it('keeps a future-dated event from corrupting the entity', () => {
  const s = applyEvents(emptyState(), [future, past]);
  expect(s.entities.get('59H123456')!.encounters).toHaveLength(2);
  expect(s.entities.get('59H123456')!.lastSeen).toBe(future.createdAt);
});
```

- [ ] **Step 2: Chạy test, xác nhận hỏng**

Run: `npx vitest run src/domain/reduce.test.ts`
Expected: FAIL.

- [ ] **Step 3: Cài đặt `src/domain/reduce.ts`**

Sắp event theo `createdAt` rồi apply tuần tự. Giữ một `Set` các `eventId` đã apply để bảo đảm idempotent. `merge` ghi `mergedInto` lên entity nguồn và chuyển encounters sang entity đích, nhưng **giữ lại khóa nguồn tra được**, vì Task 12 phải tìm ra được bằng tên cũ.

- [ ] **Step 4: Chạy test, xác nhận pass**

Run: `npx vitest run src/domain/reduce.test.ts`
Expected: PASS, gồm hai test Review Focus về idempotent và createdAt.

- [ ] **Step 5: Commit**

```bash
git add src/domain/reduce.ts src/domain/reduce.test.ts
git commit -m "feat: fold events into entity state, idempotent by eventId"
```

---

### Task 6: Quy tắc màu

**Files:**
- Create: `src/domain/color.ts`
- Test: `src/domain/color.test.ts`

**Interfaces:**
- Consumes: `Entity` từ Task 5
- Produces: `entityColor(e: Entity): 'grey' | 'red' | 'yellow' | 'green'`, `meetingCount(e: Entity): number`

- [ ] **Step 1: Viết test hỏng theo đúng §7 của spec**

```ts
it('is grey when no encounter has been rated', ...);
it('is red when the latest rated encounter is bad', ...);
it('is red when 2 of the last 5 rated encounters are bad', ...);
it('is green when the latest rated is good and no bad in the last 5 rated', ...);
it('is yellow otherwise', ...);
it('ignores unrated encounters when computing colour but counts them as meetings', () => {
  const e = entityWith([rated('good'), unrated(), unrated()]);
  expect(entityColor(e)).toBe('green');
  expect(meetingCount(e)).toBe(3);
});
```

- [ ] **Step 2: Chạy test, xác nhận hỏng**

Run: `npx vitest run src/domain/color.test.ts`
Expected: FAIL.

- [ ] **Step 3: Cài đặt `src/domain/color.ts`**

- [ ] **Step 4: Chạy test, xác nhận pass**

Run: `npx vitest run src/domain/color.test.ts`
Expected: PASS.
- [ ] **Step 5: Commit**

```bash
git add src/domain/color.ts src/domain/color.test.ts
git commit -m "feat: entity colour rule with grey for unrated"
```

---

### Task 7: Khớp mờ

**Files:**
- Create: `src/search/fuzzy.ts`
- Test: `src/search/fuzzy.test.ts`

**Interfaces:**
- Consumes: `normalizePlate`, `normalizeName` từ Task 3; `Entity` từ Task 5
- Produces: `searchEntities(state: State, query: string): Entity[]` (xếp theo điểm khớp giảm dần)

- [ ] **Step 1: Viết test hỏng**

```ts
it('matches an exact plate', ...);
it('matches a plate prefix: "59h1" finds 59H123456', ...);
it('matches a plate suffix: "23456" finds 59H123456', ...);
it('tolerates one wrong character: "59H723456" finds 59H123456', ...);
it('tolerates OCR lookalikes both ways', () => {
  expect(keysOf(searchEntities(st, '59HI234S6'))).toContain('59H123456');
});
it('matches names without diacritics: "bun bo" finds "Bún Bò Huế 14"', ...);
it('still finds an entity by a label it used to have', ...);
it('returns nothing for an empty query', ...);
```

Bảng lẫn ký tự hai chiều: `0` với `O`, `1` với `I` và `L`, `2` với `Z`, `5` với `S`, `8` với `B`, `6` với `G`.

- [ ] **Step 2: Chạy test, xác nhận hỏng**

- [ ] **Step 3: Cài đặt `src/search/fuzzy.ts`**

Thứ tự ưu tiên khi chấm điểm: khớp đúng, khớp tiền tố, khớp hậu tố, rồi Levenshtein tối đa 1 sau khi đã quy đổi bảng lẫn ký tự. Tên so bằng trigram trên chuỗi đã bỏ dấu.

- [ ] **Step 4: Chạy test, xác nhận pass**

- [ ] **Step 5: Commit**

```bash
git add src/search/fuzzy.ts src/search/fuzzy.test.ts
git commit -m "feat: fuzzy lookup for plates and names"
```

---

### Task 8: Đọc ghi kho qua SAF

**Files:**
- Create: `src/storage/kho.ts`
- Test: `src/storage/kho.test.ts`

**Interfaces:**
- Consumes: `SafPlugin` từ Task 2, `parseEvent` và `eventFileName` từ Task 4
- Produces:
  - `type Cursor = Record<string, { size: number; lastModified: number }>` (khóa là tên file)
  - `type KhoDeps = { saf: Pick<SafPlugin, 'listFolder' | 'readFile' | 'writeFile' | 'ensureDir'>; log: (msg: string) => void }`
  - `ensureKhoLayout(deps, rootUri): Promise<{ events: string; inbox: string; parsed: string; attachments: string }>`
  - `writeEvent(deps, eventsUri, e: JudexpEvent): Promise<void>`
  - `readNewEvents(deps, eventsUri, cursor): Promise<{ events: JudexpEvent[]; cursor: Cursor; skipped: string[] }>`

`KhoDeps` tồn tại để test tiêm `saf` giả, không cần thiết bị.

- [ ] **Step 1: Viết test hỏng với SAF giả, gồm ba ca Review Focus**

```ts
it('creates the four kho folders once', ...);
it('writes an event under its canonical file name', ...);
it('reads only files the cursor has not seen', ...);

// Review Focus 1
it('skips a malformed file and still returns the good ones', async () => {
  const r = await readNewEvents(deps, uri, {});
  expect(r.events).toHaveLength(1);
  expect(r.skipped).toEqual(['broken.json']);
});

// Review Focus 2
it('ignores .sync-conflict files and logs them', async () => {
  const r = await readNewEvents(deps, uri, {});
  expect(r.events).toHaveLength(0);
  expect(logged).toContain('sync-conflict');
});

// Review Focus 3
it('re-reads a file whose size or lastModified is -1', async () => {
  const cursor = { 'a.json': { size: -1, lastModified: -1 } };
  const r = await readNewEvents(deps, uri, cursor);
  expect(r.events).toHaveLength(1);
});
```

- [ ] **Step 2: Chạy test, xác nhận hỏng**

- [ ] **Step 3: Cài đặt `src/storage/kho.ts`**

File được coi là **chưa đọc** khi tên chưa có trong cursor, **hoặc** khi `size` hay `lastModified` của nó bằng -1 hay thiếu, **hoặc** khi hai giá trị đó khác bản trong cursor. File hỏng vào `skipped` và vẫn cập nhật cursor để không đọc lại mãi.

- [ ] **Step 4: Chạy test, xác nhận pass**

- [ ] **Step 5: Commit**

```bash
git add src/storage/kho.ts src/storage/kho.test.ts
git commit -m "feat: read and write the kho folder through SAF"
```

---

### Task 9: Index phái sinh và snapshot

**Files:**
- Create: `src/index/store.ts`
- Test: `src/index/store.test.ts`

**Interfaces:**
- Consumes: `applyEvents` và `State` từ Task 5, `readNewEvents` và `Cursor` từ Task 8
- Produces:
  - `type Snapshot = { schemaVersion: 1; cursor: Cursor; events: JudexpEvent[] }`
  - `loadIndex(deps, eventsUri, snapshot: Snapshot | null): Promise<{ state: State; snapshot: Snapshot }>`
  - `rebuildIndex(deps, eventsUri): Promise<{ state: State; snapshot: Snapshot }>`

Snapshot giữ nguyên danh sách event đã đọc chứ không giữ `State` đã gấp, để đổi quy tắc gấp ở bản sau không phải bỏ snapshot cũ.

- [ ] **Step 1: Viết test hỏng**

```ts
it('builds state from an empty snapshot by reading every file', ...);
it('reads only new files when a snapshot is given', async () => {
  const r = await loadIndex(deps, uri, snapshotOfOneFile);
  expect(deps.saf.readFile).toHaveBeenCalledTimes(1);
});
it('rebuild ignores the snapshot and re-reads everything', ...);
it('produces the same state whether built incrementally or rebuilt', ...);
```

Test cuối là tính chất quan trọng nhất của task này.

- [ ] **Step 2: Chạy test, xác nhận hỏng**

Run: `npx vitest run src/index/store.test.ts`
Expected: FAIL.

- [ ] **Step 3: Cài đặt `src/index/store.ts`**

- [ ] **Step 4: Chạy test, xác nhận pass**

Run: `npx vitest run src/index/store.test.ts`
Expected: PASS, gồm cả test "same state whether built incrementally or rebuilt".
- [ ] **Step 5: Commit**

```bash
git add src/index/store.ts src/index/store.test.ts
git commit -m "feat: derived index with incremental snapshot and rebuild"
```

---

### Task 10: Profile và cài đặt

**Files:**
- Create: `src/profile/settings.ts`
- Test: `src/profile/settings.test.ts`

**Interfaces:**
- Consumes: `@capacitor/preferences`
- Produces:
  - `type KhoChoice = { rootUri: string; label: string }`
  - `getKho(): Promise<KhoChoice | null>`, `setKho(c: KhoChoice): Promise<void>`
  - `getDeviceId(): Promise<string>` (sinh một lần, ngắn, dùng trong tên file event)
  - `getPin(): Promise<string | null>`, `setPin(pin: string | null): Promise<void>`

Tài liệu và UI gọi đây là **profile**, không gọi là đăng nhập, theo §12 của spec.

- [ ] **Step 1: Viết test hỏng với Preferences giả**

```ts
it('returns null before any kho is chosen', ...);
it('round-trips the chosen kho', ...);
it('generates a device id once and keeps it', async () => {
  expect(await getDeviceId()).toBe(await getDeviceId());
});
```

- [ ] **Step 2: Chạy test, xác nhận hỏng**

Run: `npx vitest run src/profile/settings.test.ts`
Expected: FAIL.

- [ ] **Step 3: Cài đặt `src/profile/settings.ts`**

- [ ] **Step 4: Chạy test, xác nhận pass**

Run: `npx vitest run src/profile/settings.test.ts`
Expected: PASS.
- [ ] **Step 5: Commit**

```bash
git add src/profile/settings.ts src/profile/settings.test.ts
git commit -m "feat: profile settings for kho choice, device id and pin"
```

---

### Task 11: Hệ thiết kế (mốc M0.5)

Task này không có test tự động. Deliverable là file token cộng ba ảnh màn hình mẫu, và nó phải xong **trước** mọi task UI, theo D6 của spec.

**Files:**
- Create: `src/ui/theme/tokens.css`
- Create: `docs/design/mockups/` (ba ảnh: Tra cứu, Chấm nhanh, Chi tiết thực thể)

- [ ] **Step 1: Viết `tokens.css`**

Biến CSS cho màu, cỡ chữ, bán kính, khoảng cách. Bắt buộc theo §13: dark mode là mặc định, tương phản cao, **bốn màu verdict kèm icon riêng chứ không chỉ khác màu** (grey, red, yellow, green), và một biến font mono riêng cho biển số.

- [ ] **Step 2: Dựng ba màn hình mẫu và chốt với huynh**

- [ ] **Step 3: Commit**

```bash
git add src/ui/theme/tokens.css docs/design/
git commit -m "design: add design tokens and screen mockups"
```

---

### Task 12: Màn Tra cứu

**Files:**
- Create: `src/ui/LookupPage.tsx`, `src/ui/EntityRow.tsx`, `src/ui/DecisionCard.tsx`
- Delete: `src/DebugKho.tsx`
- Test: `src/ui/LookupPage.test.tsx`

**Interfaces:**
- Consumes: `searchEntities` (Task 7), `entityColor` và `meetingCount` (Task 6), `loadIndex` (Task 9)
- Produces: route mặc định `/`

- [ ] **Step 1: Viết test hỏng theo ba tình huống ở §9.1**

```ts
it('focuses the search box on mount', ...);
it('shows colour, last-seen age, meeting count and top three tags for a rated entity', ...);
it('shows "chưa chấm lần nào" with a grey marker for an unrated entity', ...);
it('says "chưa gặp người này" instead of rendering an empty list', () => {
  render(<LookupPage state={emptyState()} />);
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: '59H1' } });
  expect(screen.getByText(/chưa gặp/i)).toBeInTheDocument();
});
it('renders a plate in the mono font class', ...);
```

- [ ] **Step 2: Chạy test, xác nhận hỏng**

- [ ] **Step 3: Cài đặt ba component**

Khi chưa gõ gì thì hiện "Gặp gần đây" và hai chip lọc danh sách đen, danh sách ruột. Hộp Chờ chấm để trống ở plan này, plan 3 mới có nội dung.

- [ ] **Step 4: Chạy test, xác nhận pass**

- [ ] **Step 5: Commit**

```bash
git add src/ui/ && git rm src/DebugKho.tsx
git commit -m "feat: lookup screen with decision card"
```

---

### Task 13: Màn Chấm nhanh, đường nhập tay

**Files:**
- Create: `src/ui/QuickRateSheet.tsx`, `src/domain/tags.ts`
- Test: `src/ui/QuickRateSheet.test.tsx`, `src/domain/tags.test.ts`

**Interfaces:**
- Consumes: `newEncounter` (Task 4), `writeEvent` (Task 8), `normalizePlate` và `normalizeName` (Task 3), `getDeviceId` (Task 10)
- Produces: `tagsFor(kind: EntityKind): { good: string[]; bad: string[] }` lấy nguyên văn §20 của spec

- [ ] **Step 1: Viết test hỏng**

```ts
it('offers the driver tag vocabulary for kind=driver', () => {
  expect(tagsFor('driver').bad).toContain('chạy ẩu');
});
it('writes an encounter event with the chosen verdict and tags', async () => {
  // chạm "xấu", chạm chip "chạy ẩu", chạm Lưu
  expect(written.type).toBe('encounter');
  expect(written.verdict).toBe('bad');
  expect(written.tags).toEqual(['chạy ẩu']);
  expect(written.entityRef!.key).toBe('59H123456');
});
it('keeps a free-typed tag that is not in the vocabulary', ...);
it('requires a verdict before the save button is enabled', ...);
```

- [ ] **Step 2: Chạy test, xác nhận hỏng**

- [ ] **Step 3: Cài đặt**

Ba nút verdict khổ lớn theo §13. Với `kind = 'place'` thì có thêm nút lấy toạ độ hiện tại, lưu kèm `accuracy` theo §6.

- [ ] **Step 4: Chạy test, xác nhận pass**

- [ ] **Step 5: Commit**

```bash
git add src/ui/QuickRateSheet.tsx src/domain/tags.ts src/ui/QuickRateSheet.test.tsx src/domain/tags.test.ts
git commit -m "feat: quick rate sheet with tag vocabulary"
```

---

### Task 14: Màn Chi tiết thực thể và gộp

**Files:**
- Create: `src/ui/EntityPage.tsx`, `src/ui/MergePrompt.tsx`
- Test: `src/ui/EntityPage.test.tsx`

**Interfaces:**
- Consumes: `Entity` (Task 5), `writeEvent` (Task 8)
- Produces: route `/entity/:key`

- [ ] **Step 1: Viết test hỏng**

```ts
it('lists encounters newest first with verdict and tags', ...);
it('lists every label the entity has ever had', ...);
it('suggests a merge for a nearby similar restaurant but never merges on its own', () => {
  render(<EntityPage ... />);
  expect(screen.getByText(/có phải quán này/i)).toBeInTheDocument();
  expect(written).toBeUndefined();
});
it('writes a merge event only after the user confirms', ...);
it('does not suggest a merge when gps accuracy is worse than 100m', ...);
```

Ba test cuối là D9 và quy tắc `accuracy` ở §6.

- [ ] **Step 2: Chạy test, xác nhận hỏng**

Run: `npx vitest run src/ui/EntityPage.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Cài đặt hai component**

- [ ] **Step 4: Chạy test, xác nhận pass**

Run: `npx vitest run src/ui/EntityPage.test.tsx`
Expected: PASS.
- [ ] **Step 5: Commit**

```bash
git add src/ui/EntityPage.tsx src/ui/MergePrompt.tsx src/ui/EntityPage.test.tsx
git commit -m "feat: entity detail with confirm-first merge"
```

---

### Task 15: Màn Cài đặt và đèn Syncthing

**Files:**
- Create: `src/ui/SettingsPage.tsx`, `src/sync/status.ts`
- Test: `src/sync/status.test.ts`, `src/ui/SettingsPage.test.tsx`

**Interfaces:**
- Consumes: `Syncthing.request` (Task 2), `getKho` và `setKho` (Task 10), `rebuildIndex` (Task 9)
- Produces: `syncStatus(deps, cfg): Promise<'synced' | 'pending' | 'unreachable'>`

- [ ] **Step 1: Viết test hỏng cho `syncStatus` với Syncthing giả**

```ts
it('is unreachable when the local Syncthing does not answer', ...);
it('is unreachable when Atomman is not in /rest/system/connections', ...);
it('is pending when /rest/db/completion is below 100', ...);
it('is synced when the device is connected and completion is 100', ...);
```

Đọc đúng hai endpoint của Syncthing v2 như Gú's Library đang dùng: `/rest/system/connections` chỉ đọc trường `connected`, và `/rest/db/completion?folder=<id>&device=<atomman>` đọc trường số `completion`.

- [ ] **Step 2: Chạy test, xác nhận hỏng**

- [ ] **Step 3: Cài đặt `src/sync/status.ts` và `SettingsPage.tsx`**

Màn Cài đặt có: chọn kho (gọi `Saf.pickFolder`), đèn ba mức, nút dựng lại index, ô xem `_worker.log` (file sẽ rỗng cho tới plan 3), và ô đặt hoặc xóa PIN.

- [ ] **Step 4b: Cổng PIN khi mở lại app**

Test trước: `it('asks for the pin when a pin is set and the app resumes', ...)` và `it('goes straight in when no pin is set', ...)`. Cài đặt trong `src/ui/PinGate.tsx`, bọc quanh router. Theo §12, PIN chỉ chặn người cầm máy, **không** mã hóa dữ liệu trong kho, và UI phải nói đúng như vậy khi đặt PIN.

- [ ] **Step 4: Chạy test, xác nhận pass**

- [ ] **Step 5: Commit**

```bash
git add src/sync/ src/ui/SettingsPage.tsx
git commit -m "feat: settings screen with three-state Syncthing light"
```

---

### Task 16: Nghiệm thu M1 trên hai máy thật

Không có unit test. Đây là cửa cuối của plan 1.

- [ ] **Step 1: Build và cài bản release lên hai máy**

Run: `npm run build && npx cap sync android && cd android && ./gradlew assembleDebug && adb install -r app/build/outputs/apk/debug/app-debug.apk`

- [ ] **Step 2: Máy A ghi, máy B thấy**

Trên máy A: chấm tay một tài xế biển `59H1-234.56` mức xấu kèm tag "chạy ẩu". Expected: trên máy B mở app, tra `59h1`, ra đúng thực thể đó với màu đỏ.

- [ ] **Step 3: Khớp mờ trên máy thật**

Tra `59H723456` (sai một ký tự) và `23456` (chỉ hậu tố). Expected: cả hai đều ra.

- [ ] **Step 4: Chạy được khi không mạng**

Bật chế độ máy bay, tra cứu lại. Expected: vẫn ra kết quả, đèn Syncthing báo chưa thấy Atomman.

- [ ] **Step 5: Dựng lại index**

Bấm nút dựng lại index trong Cài đặt. Expected: ra đúng trạng thái như trước khi dựng lại.

- [ ] **Step 6: Commit và gắn tag**

```bash
git tag -a v0.1.0 -m "M1: lookup and manual logging on real devices"
```
