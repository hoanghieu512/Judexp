# Judexp Plan 5: Theme Watercolor Sài Gòn và bộ nhận diện xích lô

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thay hệ thiết kế M0.5 bằng theme Watercolor Sài Gòn (ngày làm chính, đêm theo chế độ tối của máy) và làm xong bộ nhận diện xích lô của M5, mà tra cứu vẫn nhanh như v0.2.0 và dấu Tốt, Ổn, Xấu vẫn là thứ nổi nhất màn hình.

**Architecture:** Mọi màu và mọi thứ đổi theo ngày đêm nằm ở `src/ui/theme/tokens.css`: bản ngày ở `:root`, bản đêm là một khối biến viết hai chỗ (media query của máy, và `:root[data-scheme='dark']` cho phương án lùi của S6). Thành phần chỉ đọc token, nên màu, hình doodle nào hiện, quầng kem sau xe đều đổi bằng cùng một cơ chế. Tranh màu nước là ảnh WebP dựng bằng script Python từ `docs/design/watercolor/master/`; hình bóng một màu là VectorDrawable vẽ từ mặt nạ bằng potrace. Phần Android chỉ đổi resource và dòng `setSmallIcon`, trừ khi S6 trượt.

**Tech Stack:** React 19, Ionic React 9, Vite 8, Vitest 5 + Testing Library + jsdom, Capacitor 8.5.3 (minSdk 24, target 36), core-splashscreen 1.2.0, gói `@fontsource` 5.3.0, Python 3 với Pillow và numpy, potrace (cài bằng Homebrew), `cwebp`.

**Spec:** `docs/superpowers/specs/2026-10-27-judexp-watercolor-design.md` (huynh duyệt 2026-10-27). Mục §11 (sửa spec gốc) đã làm ở commit `b2fedab`, plan này không làm lại.

**Phủ mốc:** M5. Thứ tự: đo mốc và spike S6 trước mọi thay đổi giao diện (§8, §10), rồi phần web (Task 4 tới 10), rồi Android (Task 11, 12), cuối cùng nghiệm thu trên máy (Task 13).

**Quyết định của plan** (spec để ngỏ, huynh xem lúc duyệt):

1. Ô mã mono ở Cài đặt là bốn ô Syncthing: địa chỉ (`jx-st-url`), API key (`jx-st-key`), Device ID của Atomman (`jx-st-atomman`), Folder ID (`jx-st-folder`), nhận class `jx-code`. Ô "Người ghi", "Tên máy" và PIN dùng Nunito.
2. Màu vệt loang thành token (`--jx-wash-peach`, `--jx-wash-sky`, `--jx-wash-mint`), và việc ẩn hiện theo ngày đêm cũng là token (`--jx-show-day`, `--jx-show-night`, `--jx-halo-opacity`). Nhờ vậy bản đêm chỉ nằm ở khối biến của `tokens.css`, đổi theo cả media query lẫn `data-scheme`, và test tương phản đọc được màu vệt.
3. Font import ở `src/AppShell.tsx` cạnh `tokens.css`, nên app và harness moodboard cùng nhận một bộ font.
4. Đo mở nguội: dGen1 reboot giữa các lần (spec §8); UBS1 dùng `am force-stop` (engine e2e vẫn làm vậy trên UBS1). Dòng log mốc chỉ in ở bản build (`import.meta.env.PROD`), để Vitest không ồn. "Không chậm hơn" nghĩa là trung vị sau M5 không vượt trung vị mốc quá 5% (ngưỡng nhiễu đo); vượt thì báo huynh kèm số, không tự kết luận.
5. Biến CSS cục bộ của một thành phần (độ trễ của sao, bề rộng khung logo) không mang tiền tố `--jx-`: tiền tố đó dành cho token của `tokens.css`, và test của Task 4 đòi mọi `var(--jx-…)` phải có định nghĩa ở đó.
6. Không bump version, không gắn tag: mọi ghi chép vào `[Unreleased]` của CHANGELOG, huynh quyết số bản.

## Global Constraints

- Code, comment, tên biến, commit message: tiếng Anh. Chữ trên màn hình: tiếng Việt. Không dùng em dash ở bất cứ đâu. Markdown không cắt dòng cứng.
- **Không đổi bố cục, điều hướng hay luồng** (§1). Phụ lục A của spec nằm ngoài M5.
- **Không đổi chữ hiển thị, tên trợ năng, vai trò, `data-testid` hay class mà test dựa vào** (§5, mục Ràng buộc với test). E2e chạy lại mà không sửa bộ chọn nào. `src/ui/tokens.test.ts` phải còn xanh: selector nguyên văn `.jx-mark[data-color='…']` cho đủ bốn màu và ba verdict; khối `.jx-app {` đầu tiên có `height: 100%` và `overflow-y: auto`; khối `.jx-nav-item {` đầu tiên có `min-height: var(--jx-touch-min)`.
- Icon loại, hình doodle, logo xe và sao là trang trí: `alt=""` và `aria-hidden="true"`. Không thêm loại vào nhãn trợ năng của dòng (`EntityRow.tsx`). Không sinh chữ bằng CSS `content:`.
- Màu chỉ dành cho verdict (W3). Nền dấu verdict và nút chấm là màu đặc `--jx-*-soft` (W14).
- Bản ngày ở `:root` với `color-scheme: light`. Bản đêm viết ở hai chỗ, giống hệt nhau, kèm `color-scheme: dark`: `@media (prefers-color-scheme: dark) { :root:not([data-scheme='light']) { … } }` và `:root[data-scheme='dark'] { … }`. Không dùng `data-theme` (để dành cho mục Theme sau này). Không bật algorithmic darkening.
- Font đóng gói trong app, không tải từ mạng. Chỉ subset latin và vietnamese, import từng file theo subset.
- Chuyển động chỉ có ở màn chờ mở kho, và tắt khi máy bật giảm chuyển động. Màn chờ không bao giờ ở lâu hơn mốc `ready`.
- Tài sản cuối dựng từ `docs/design/watercolor/master/` (hai ảnh doodle dựng từ bản WebP 92 vì không có master); không đưa ảnh 1024 vào APK.
- APK tăng dưới 2 MB so với mốc đo ở Task 1. Mở nguội không chậm hơn mốc.
- Trên dGen1 không bao giờ `am force-stop`; mở app bằng `adb -s <dGen1> shell monkey -p com.judexp.app -c android.intent.category.LAUNCHER 1`. Hai máy nhận ra qua `adb devices -l`: model `k6789v1_64` là dGen1, model `UBS1` là UBS1. Không PIN trên máy khi đo.
- Build: `npm test`, `npm run build`, `npx cap sync android`, `cd android && ./gradlew testDebugUnitTest assembleDebug`. JDK 21, SDK 36.
- Không push, không tạo PR khi huynh chưa bảo.

## Review Focus

Năm ca spec ngầm định mà luồng chính không tự chạm tới. Mỗi dòng đã có test hoặc bước kiểm gắn vào task sở hữu.

1. **Đổi chế độ tối khi app đang mở, hoặc khi app ở nền rồi quay lại.** Màu phải đổi theo ngay, không cần mở lại app. → Task 2 (spike ba ca), Task 3 nếu trượt, Task 13 kiểm lại bằng mắt.
2. **Một token chỉ có ở bản ngày, hoặc được dùng mà không định nghĩa.** Bản đêm sẽ hiện màu ngày (chữ tối trên nền tối), hoặc phần tử mất màu như huy hiệu không màu của v0.1.0. → Task 4: test mọi màu của bản ngày có bản đêm, mọi `var(--jx-…)` trong mọi file CSS của `src/ui` có định nghĩa.
3. **Kho mở lỗi, chưa chọn kho, hoặc có PIN.** Màn chờ phải nhường chỗ ngay cho Cài đặt (có logo và banner lỗi đọc được) hoặc `PinGate`. → Task 10: test AppShell cho nhánh mở kho lỗi.
4. **Bàn phím đang mở ở màn tìm không thấy trên dGen1, và ca có biển gần giống.** Câu trả lời ở đúng chỗ như v0.2.0, doodle nằm dưới và chỉ hiện khi không có biển gần giống. → Task 9: test thứ tự DOM và ca có biển gần giống; Task 13 kiểm trên dGen1.
5. **Máy bật giảm chuyển động.** Sao hiện sẵn màu vàng, đứng yên. → Task 10: test đọc stylesheet.

---

### Task 1: Đo mốc mở nguội và dung lượng APK trước M5

Đo trước khi đổi bất cứ thứ gì về giao diện: đổi rồi thì không còn mốc để so (§8). Task này cần cả hai máy cắm `adb`, và cần huynh mở khóa dGen1 sau mỗi lần reboot nếu máy có khóa màn hình.

**Files:**
- Modify: `src/ui/LookupPage.tsx` (effect tự focus ô tìm)
- Create: `scripts/cold-start.sh`
- Modify: `CHANGELOG.md` (`[Unreleased]`, thêm `### Added` trên `### Fixed`)

**Interfaces:**
- Produces: dòng log `[judexp] lookup-ready` (logcat tag `Capacitor/Console`), in mỗi lần `LookupPage` mount ở bản build. Script `scripts/cold-start.sh <serial> <runs> <reboot|force-stop>`, Task 13 dùng lại đúng như vậy.

- [ ] **Step 1: Thêm dòng log mốc**

Trong effect đang gọi `box.current?.focus()` của `LookupPage`, ngay sau lệnh focus: `if (import.meta.env.PROD) console.info('[judexp] lookup-ready');`. Comment một dòng nói vì sao có nó (đo mở nguội, §8 spec Watercolor).

- [ ] **Step 2: Viết `scripts/cold-start.sh`**

Mỗi lượt: đưa app về trạng thái nguội (`reboot`: `adb reboot`, `wait-for-device`, chờ `getprop sys.boot_completed` bằng `1`, in "Mở khóa máy rồi bấm Enter" và chờ Enter, rồi chờ thêm 20 giây cho máy yên; `force-stop`: `am force-stop com.judexp.app` rồi chờ 5 giây), `adb logcat -c`, mở bằng lệnh `monkey` ở Global Constraints, đợi tối đa 60 giây cho tới khi `adb logcat -d -v epoch` có dòng chứa `[judexp] lookup-ready`. Mốc đầu là dòng `ActivityTaskManager` khớp `START u0 .*cmp=com.judexp.app/.MainActivity`, mốc cuối là dòng `lookup-ready`, cả hai lấy giờ epoch của logcat. Ghi thêm số của dòng `Displayed com.judexp.app/.MainActivity … +…ms` (lúc frame đầu, tức hết màn mở app của hệ thống). In một dòng mỗi lượt (`run 3: ready 2140 ms, displayed 812 ms`), lượt quá 60 giây in `run 3: no lookup-ready (kho did not open, or a PIN is set?)` và không tính. Cuối cùng in trung vị, nhỏ nhất, lớn nhất của cả hai số. `set -euo pipefail`, tính bằng `awk`.

- [ ] **Step 3: Build, cài, kiểm script chạy**

Run: `npm test && npm run build && npx cap sync android && (cd android && ./gradlew assembleDebug) && adb -s <UBS1> install -r android/app/build/outputs/apk/debug/app-debug.apk && scripts/cold-start.sh <UBS1> 1 force-stop`
Expected: Vitest xanh, một dòng `run 1: ready … ms, displayed … ms`.

- [ ] **Step 4: Đo mốc**

Cài cùng APK lên dGen1. Run: `scripts/cold-start.sh <UBS1> 5 force-stop` rồi `scripts/cold-start.sh <dGen1> 5 reboot`.
Expected: mỗi máy đủ 5 lượt có số. Thiếu lượt nào (kho bị giấu sau boot lỗi trên dGen1) thì chạy bù cho đủ 5.

- [ ] **Step 5: Ghi mốc vào CHANGELOG và commit**

Đo cỡ APK: `ls -l android/app/build/outputs/apk/debug/app-debug.apk`. Trong `[Unreleased]`, thêm `### Added` trên `### Fixed`, một mục: **Dòng log `[judexp] lookup-ready` khi ô tìm có con trỏ**, để đo mở nguội (`scripts/cold-start.sh`); kèm mốc trước M5 cho từng máy (trung vị, nhỏ nhất, lớn nhất của cả hai số, số lượt, cách đưa về nguội) và cỡ APK debug.

```bash
git add src/ui/LookupPage.tsx scripts/cold-start.sh CHANGELOG.md
git commit -m "chore: log when the lookup box has focus, and measure cold start before M5"
```

---

### Task 2: Spike S6, WebView có theo chế độ tối của máy không

Ba ca trên cả hai máy (§10). Code của spike là bản vá tạm, **không commit**. Kết quả quyết định có làm Task 3 hay không: spec đã chốt phương án lùi, nên ca nào trượt thì làm Task 3 luôn, báo huynh kết quả.

**Files:**
- Tạm thời: `src/main.tsx` (hoàn lại ở Step 5)
- Modify: `docs/superpowers/specs/2026-10-27-judexp-watercolor-design.md` (§10, hàng S6), `docs/superpowers/specs/2026-10-16-judexp-design.md` (§16, hàng S6)

- [ ] **Step 1: Vá tạm và cài lên hai máy**

Thêm vào cuối `src/main.tsx`:

```ts
// S6 spike, never committed.
const dark = () => (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
console.info('[judexp] s6 start', dark());
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => console.info('[judexp] s6 change', dark()));
document.addEventListener('visibilitychange', () => console.info('[judexp] s6', document.visibilityState, dark()));
```

Build, `npx cap sync android`, `assembleDebug`, cài lên dGen1 và UBS1. Đọc log bằng `adb -s <máy> logcat -v time -s Capacitor/Console:I | grep s6`. Đổi chế độ bằng `adb -s <máy> shell cmd uimode night yes` (hoặc `no`), kiểm bằng `adb -s <máy> shell cmd uimode night`. ROM nào không nhận lệnh này thì đổi bằng ô Quick Settings.

- [ ] **Step 2: Ca 1, mở nguội ở từng chế độ**

Với mỗi máy và mỗi chế độ (`yes`, `no`): đặt chế độ, đưa app về nguội như Task 1 (dGen1 reboot, UBS1 force-stop), mở bằng `monkey`.
Expected: `s6 start dark` khi `night yes`, `s6 start light` khi `night no`.

- [ ] **Step 3: Ca 2, đổi chế độ khi app đang hiện**

App đang ở Tra cứu, đổi chế độ hai chiều.
Expected: mỗi lần đổi có một dòng `s6 change` đúng chế độ mới, app không khởi động lại (không có `s6 start` mới).

- [ ] **Step 4: Ca 3, đổi khi app ở nền rồi quay lại**

`adb -s <máy> shell input keyevent KEYCODE_HOME`, đổi chế độ, mở lại bằng `monkey` (activity `singleTask` quay lại bản đang chạy).
Expected: dòng `s6 visible …` mang đúng chế độ mới (có hoặc không kèm `s6 change` lúc còn ở nền).

- [ ] **Step 5: Hoàn bản vá, ghi kết quả, commit**

`git checkout src/main.tsx`, rồi `git status` chỉ còn hai file spec. Ghi vào hàng S6 của cả hai spec: ngày đóng, bảng nhỏ ba ca nhân hai máy (đạt hay trượt, kèm dòng log), và "làm Task 3 của plan Watercolor" hoặc "không cần phương án lùi". Đặt lại chế độ của hai máy như trước khi spike.

```bash
git add docs/superpowers/specs/2026-10-27-judexp-watercolor-design.md docs/superpowers/specs/2026-10-16-judexp-design.md
git commit -m "docs: close spike S6 with the dark mode results on dGen1 and UBS1"
```

---

### Task 3 (chỉ làm khi Task 2 có ca trượt): native đặt `data-scheme`

Bỏ qua cả task nếu sáu lần kiểm của Task 2 đều đạt. CSS của Task 4 đã nhận `data-scheme`, nên phía web không phải sửa gì thêm.

**Files:**
- Create: `android/app/src/main/java/com/judexp/app/SchemeScript.java` (thuần, không dùng kiểu Android ngoài hằng số)
- Create: `android/app/src/main/java/com/judexp/app/SchemePlugin.java`
- Create: `android/app/src/test/java/com/judexp/app/SchemeScriptTest.java`
- Modify: `android/app/src/main/java/com/judexp/app/MainActivity.java` (`registerPlugin(SchemePlugin.class)` cạnh các plugin khác)
- Modify: `android/app/build.gradle` (`implementation "androidx.webkit:webkit:$androidxWebkitVersion"`: Capacitor khai webkit là `implementation` nên app không thấy)

**Interfaces:**
- Produces: `SchemeScript.isNight(int uiMode) -> boolean`, `SchemeScript.forNight(boolean night) -> String` (một câu JS đặt `document.documentElement.dataset.scheme`).

- [ ] **Step 1: JUnit đỏ cho `SchemeScript`**

`SchemeScriptTest`:
- `nightModeYesIsNight`: `isNight(Configuration.UI_MODE_NIGHT_YES | Configuration.UI_MODE_TYPE_NORMAL)` là `true`.
- `nightModeNoAndUndefinedAreDay`: `UI_MODE_NIGHT_NO` và `UI_MODE_NIGHT_UNDEFINED` (cùng `UI_MODE_TYPE_NORMAL`) là `false`.
- `scriptSetsTheAttributeCssReads`: `forNight(true)` bằng `"document.documentElement.dataset.scheme='dark';"`, `forNight(false)` bằng `"document.documentElement.dataset.scheme='light';"`.

- [ ] **Step 2: Chạy, xác nhận đỏ**

Run: `cd android && ./gradlew testDebugUnitTest --tests com.judexp.app.SchemeScriptTest`
Expected: FAIL vì `SchemeScript` chưa có.

- [ ] **Step 3: Viết `SchemeScript` và `SchemePlugin`**

`SchemePlugin` là `@CapacitorPlugin(name = "Scheme")`, không có method cho JS. Capacitor gọi `load()` của plugin trước khi WebView tải trang (`Bridge`: `registerAllPlugins()` rồi mới `loadWebView()`), nên:
- `load()`: nếu `WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)` thì `WebViewCompat.addDocumentStartJavaScript(getBridge().getWebView(), SchemeScript.forNight(nightNow()), Collections.singleton("*"))`, để thuộc tính có trước lần vẽ đầu.
- `handleOnConfigurationChanged(Configuration)` và `handleOnResume()`: `getBridge().getWebView().evaluateJavascript(SchemeScript.forNight(nightNow()), null)`. Manifest khai `uiMode` trong `configChanges` nên activity không được tạo lại, và đây là chỗ duy nhất biết máy vừa đổi chế độ.
- `nightNow()` đọc `getContext().getResources().getConfiguration().uiMode`.

- [ ] **Step 4: JUnit xanh, build qua**

Run: `cd android && ./gradlew testDebugUnitTest assembleDebug`
Expected: PASS, gồm 3 test mới.

- [ ] **Step 5: Kiểm lại đúng những ca đã trượt**

Vá tạm `src/main.tsx` như Task 2 Step 1, thêm `document.documentElement.dataset.scheme` vào mỗi dòng log. Cài lên hai máy, chạy lại các ca đã trượt.
Expected: `dataset.scheme` đúng chế độ máy ở mọi ca. Hoàn bản vá (`git checkout src/main.tsx`).

- [ ] **Step 6: Commit**

```bash
git add android/app/src/main/java/com/judexp/app/SchemeScript.java android/app/src/main/java/com/judexp/app/SchemePlugin.java android/app/src/test/java/com/judexp/app/SchemeScriptTest.java android/app/src/main/java/com/judexp/app/MainActivity.java android/app/build.gradle
git commit -m "feat: native sets data-scheme when the WebView misses a dark mode change"
```

---

### Task 4: Màu ngày, đêm và cơ chế theo máy

**Files:**
- Modify: `src/ui/theme/tokens.css` (viết lại phần màu; thang chữ, khoảng cách, vùng chạm, chuyển động giữ nguyên)
- Modify: `index.html`
- Modify: `src/ui/ui.css` (chỉ chỗ dùng token bị xóa)
- Create: `src/ui/theme.test.ts`
- Create: `src/ui/contrast.test.ts`

**Interfaces:**
- Produces (token, Task 6 tới 10 dùng): mọi token màu của bảng §3 spec, gồm `--jx-accent`, `--jx-title`, `--jx-ink`, `--jx-brand`, `--jx-road`, `--jx-shadow`, `--jx-dash`, `--jx-nav-border`, `--jx-chip-bg`, `--jx-chip-text`, `--jx-star`, `--jx-star-edge`, `--jx-good-soft`, `--jx-ok-soft`, `--jx-bad-soft`. Thêm: `--jx-wash-peach`, `--jx-wash-sky`, `--jx-wash-mint`; `--jx-show-day` (`block` ngày, `none` đêm), `--jx-show-night` (ngược lại); `--jx-halo-opacity` (`0` ngày, `0.8` đêm).

- [ ] **Step 1: Viết test đỏ cho cơ chế ngày đêm**

`src/ui/theme.test.ts` đọc `tokens.css` và `index.html` bằng `readFileSync` (như `tokens.test.ts`), với một helper `declarations(css, selector, insideMedia?)` trả `Map<tên, giá trị>` của khối có đúng selector đó.
- `day lives in :root`: `color-scheme` là `light`, `--jx-bg` là `#f6eddd`, `--jx-text` là `#2b2118`, `--jx-show-day` là `block`, `--jx-show-night` là `none`, `--jx-halo-opacity` là `0`.
- `night is written twice, the same both times`: khối `:root:not([data-scheme='light'])` trong `@media (prefers-color-scheme: dark)` và khối `:root[data-scheme='dark']` có cùng bộ khai báo; trong đó `color-scheme` là `dark`, `--jx-bg` là `#1a1714`, `--jx-bad` là `#f6767b`, `--jx-unrated` là `#7c8c9d`, `--jx-halo-opacity` là `0.8`.
- `night overrides every colour the day sets`: mọi token của `:root` có giá trị bắt đầu bằng `#`, trừ `--jx-star` và `--jx-star-edge`, đều có trong khối đêm; cùng với `--jx-show-day`, `--jx-show-night`, `--jx-halo-opacity`.
- `the dead light theme and the unused tokens are gone`: `tokens.css` không chứa `data-theme`, `--jx-unrated-soft`, `--jx-mark-`.
- `every token a stylesheet uses is defined`: mọi `var(--jx-…)` trong mọi file `.css` dưới `src/ui` (đọc thư mục, gồm cả `theme/`, nên file của task sau tự được kiểm) có trong `:root`.
- `the page is painted before React`: `index.html` có `<meta name="color-scheme" content="light dark"`, có `#f6eddd` và `#1a1714`, và có `[data-scheme='dark']`.

- [ ] **Step 2: Viết test đỏ cho độ tương phản**

`src/ui/contrast.test.ts` lấy màu từ chính `tokens.css` (khối ngày và khối đêm ở trên), tính tỉ lệ WCAG, màu có kênh alpha thì phủ lên nền trước khi tính. `it.each` qua `day` và `night`, mỗi cặp là một test tên như `day: text-dim on wash-peach ≥ 4.5`:
- chuẩn 4.5: `text` và `text-dim` trên `bg`, `surface` và trên ba vệt (vệt phủ lên `bg`); `good`, `ok`, `bad`, `unrated` trên `surface`; `good`, `ok`, `bad` trên `-soft` của chính nó; `chip-text` trên `chip-bg` phủ lên `surface` và lên `bg`; `text-on-accent` trên `ink` và trên `accent`; `title` trên `bg` và trên ba vệt.
- chuẩn 3: `ink` trên `surface` (viền ô nhập); `brand` trên `bg` và trên vệt đào (chữ lớn).

Đệ đã tính trước các màu của spec với đúng công thức này: mọi cặp đạt, khớp bảng §3 (ví dụ `brand` trên vệt đào bản ngày 3,72, `ok` trên `ok-soft` bản ngày 4,60).

- [ ] **Step 3: Chạy, xác nhận đỏ**

Run: `npx vitest run src/ui/theme.test.ts src/ui/contrast.test.ts`
Expected: FAIL (`:root` còn là bản tối, chưa có khối đêm).

- [ ] **Step 4: Viết lại `tokens.css` và `index.html`**

Thứ tự trong `tokens.css`: comment đầu viết lại (bỏ "dark by default", nói ngày làm chính, đêm theo máy, `data-scheme` cho phương án lùi của S6, `data-theme` để dành); `:root` với bản ngày cộng thang chữ, khoảng cách, vùng chạm, chuyển động hiện có; khối đêm trong media query; khối đêm `[data-scheme='dark']`; khối `prefers-reduced-motion` hiện có. Giá trị lấy nguyên từ bảng §3 của spec, vệt loang lấy từ đoạn "Vệt loang" của §3 (ngày `#fbd9bd`, `#cde4f2`, `#d7ecd9`; đêm `#5a3a2a55`, `#2f4f6655`, `#2f4d3a44`). Xóa khối `[data-theme='light']`, `--jx-unrated-soft` và bốn `--jx-mark-*` (không chỗ nào dùng: ký tự dấu nằm trong JSX). Trong `ui.css`, `.jx-mark[data-color='grey']` và `[data-color='unrated']` đổi nền sang `transparent`.

`index.html`, trong `<head>`:

```html
<meta name="color-scheme" content="light dark" />
<style>
  html { background: #f6eddd; }
  @media (prefers-color-scheme: dark) { html:not([data-scheme='light']) { background: #1a1714; } }
  html[data-scheme='dark'] { background: #1a1714; }
</style>
```

- [ ] **Step 5: Chạy toàn bộ, xác nhận xanh**

Run: `npm test && npm run build`
Expected: PASS hết, gồm `tokens.test.ts` cũ.

- [ ] **Step 6: Commit**

```bash
git add src/ui/theme/tokens.css index.html src/ui/ui.css src/ui/theme.test.ts src/ui/contrast.test.ts
git commit -m "feat: Watercolor colours, day in :root and night following the phone"
```

---

### Task 5: Font Fraunces, Nunito, Mali, JetBrains Mono

**Files:**
- Modify: `package.json`, `package-lock.json`
- Create: `src/ui/theme/fonts.css`
- Modify: `src/main.tsx` (bỏ sáu dòng import Inter, Roboto Mono)
- Modify: `src/AppShell.tsx` (import `./ui/theme/fonts.css` ngay trước `tokens.css`)
- Modify: `src/ui/theme/tokens.css` (token chữ)
- Modify: `docs/design/watercolor/tools/harness/main.tsx` (bỏ import Inter, Roboto Mono: harness nhận font qua `AppShell`)
- Create: `src/ui/fonts.test.ts`

**Interfaces:**
- Produces: family `'Fraunces Variable'`, `'Nunito'`, `'Mali'`, `'JetBrains Mono'`; token `--jx-font` (Nunito), `--jx-font-mono` (JetBrains Mono), `--jx-font-display` ('Fraunces Variable'), `--jx-font-hand` (Mali), `--jx-text-title` 1.4rem, `--jx-text-name` 1.15rem, `--jx-text-hand` 1.2rem, `--jx-weight-display` 650, `--jx-weight-heavy` 800. Mỗi chuỗi font kết thúc bằng một family chung (`serif`, `sans-serif`, `cursive`, `monospace`), không dùng `system-ui` (comment hiện có giải thích lỗi monospace của WebView AOSP).

- [ ] **Step 1: Viết test đỏ**

`src/ui/fonts.test.ts` đọc `fonts.css`, `tokens.css`, `package.json`, `src/main.tsx`:
- `imports only the latin and vietnamese files`: mọi `@import` khớp `/@fontsource\/(nunito|mali|jetbrains-mono)\/(latin|vietnamese)-\d{3}\.css/`, và đủ bộ: Nunito 400, 600, 700, 800; Mali 400; JetBrains Mono 500, 700; mỗi độ đậm cả hai subset.
- `Fraunces uses the full axis file for both subsets`: đúng hai `@font-face` có `font-family: 'Fraunces Variable'`, một trỏ tới `fraunces-latin-full-normal.woff2`, một tới `fraunces-vietnamese-full-normal.woff2`, cả hai có `unicode-range` và `font-weight: 100 900`.
- `the tokens name the bundled families`: `--jx-font` bắt đầu bằng `'Nunito'`, `--jx-font-mono` bằng `'JetBrains Mono'`, `--jx-font-display` bằng `'Fraunces Variable'`, `--jx-font-hand` bằng `'Mali'`.
- `Inter and Roboto Mono are gone`: `package.json` không có `@fontsource/inter`, `@fontsource/roboto-mono`; `src/main.tsx` không import `@fontsource`.

- [ ] **Step 2: Chạy, xác nhận đỏ**

Run: `npx vitest run src/ui/fonts.test.ts`
Expected: FAIL vì `fonts.css` chưa có.

- [ ] **Step 3: Cài gói, viết `fonts.css`, sửa token**

`npm install @fontsource-variable/fraunces@5.3.0 @fontsource/nunito@5.3.0 @fontsource/mali@5.3.0 @fontsource/jetbrains-mono@5.3.0` rồi `npm uninstall @fontsource/inter @fontsource/roboto-mono`. Hai `@font-face` của Fraunces: chép nguyên hai khối latin và vietnamese từ CSS trục đầy đủ của gói (`node_modules/@fontsource-variable/fraunces/full.css`), chỉ đổi `./files/` trong `src` thành `@fontsource-variable/fraunces/files/`. Nếu Vite không tự giải được đường dẫn gói trong `url()` (build báo không tìm thấy file), thêm alias trong `vite.config.ts` trỏ tới thư mục `files` của gói và dùng alias đó.

- [ ] **Step 4: Chạy test, build, kiểm file font trong bản build**

Run: `npm test && npm run build && ls dist/assets | grep woff2 | grep -E 'latin-ext|cyrillic|greek|math|symbols'; du -ch dist/assets/*.woff2 | tail -1`
Expected: test và build xanh; lệnh `grep` không in gì; ghi lại tổng cỡ font để báo ở Task 13.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/ui/theme/fonts.css src/main.tsx src/AppShell.tsx src/ui/theme/tokens.css docs/design/watercolor/tools/harness/main.tsx src/ui/fonts.test.ts
git commit -m "feat: bundle Fraunces, Nunito, Mali and JetBrains Mono, latin and vietnamese only"
```

---

### Task 6: Khung và thành phần

Đổi cách vẽ theo bảng §5 của spec, trừ dấu verdict (Task 7), icon loại (Task 8), màn tìm không thấy (Task 9) và logo (Task 10).

**Files:**
- Modify: `src/ui/ui.css`
- Modify: `src/ui/SettingsPage.tsx` (bốn ô Syncthing thêm `jx-code`)
- Modify: `src/ui/tokens.test.ts`, `src/ui/SettingsPage.test.tsx`
- Modify: `e2e/README.md` (mục Bẫy "Chữ hoa bằng CSS")

**Interfaces:**
- Consumes: token của Task 4 và Task 5.
- Produces: class `jx-code` cho ô mã; token `--jx-radius-card` 18px.

- [ ] **Step 1: Viết test đỏ**

Trong `tokens.test.ts`, thêm `describe('Watercolor frame')`:
- `the washes show through the screen`: khối `.jx-app {` đầu tiên có `radial-gradient` dùng đủ `var(--jx-wash-peach)`, `var(--jx-wash-sky)`, `var(--jx-wash-mint)`; `.jx-screen` và `.jx-nav` có `background: transparent`.
- `section titles are not uppercased by CSS`: `ui.css` không chứa `text-transform: uppercase` (chữ hoa bằng CSS lọt vào cây trợ năng).
- `no text comes from CSS`: `ui.css` không khớp `/content\s*:/`.
- `code fields and plates stay mono`: có khối cho `.jx-search.jx-code` với `font-family: var(--jx-font-mono)`, và khối `.jx-plate {` có `font-family: var(--jx-font-mono)`.

Trong `SettingsPage.test.tsx`: `the Syncthing code fields are mono, the name fields are not`: bốn ô có nhãn "Địa chỉ Syncthing…", "API key Syncthing…", "Device ID của Atomman", "Folder ID của kho" có class `jx-code`; ô "Người ghi…", "Tên máy…", "PIN mở app…" không có.

- [ ] **Step 2: Chạy, xác nhận đỏ**

Run: `npx vitest run src/ui/tokens.test.ts src/ui/SettingsPage.test.tsx`
Expected: FAIL ở các test mới, trừ phần `.jx-plate` vốn đã mono (giữ làm rào).

- [ ] **Step 3: Sửa `ui.css` và `SettingsPage.tsx`**

Theo bảng §5 và §4 của spec; những chỗ spec không ghi số:
- `.jx-app`: `background` là ba `radial-gradient` của §3 (dùng ba token vệt) xếp trên `var(--jx-bg)`; giữ nguyên `height`, `overflow-y` trong khối đầu tiên.
- `.jx-section-title`: `--jx-font-display`, `--jx-weight-display`, `--jx-text-title`, `--jx-title`, bỏ `text-transform` và `letter-spacing`. `.jx-name`: `--jx-font-display`, 600, `--jx-text-name`. Cả hai và chữ logo (Task 10) mang `font-variation-settings: 'SOFT' 100, 'WONK' 0`.
- `.jx-screen` dùng `font-family: var(--jx-font)`; `.jx-search` dùng `--jx-font` 600, viền 2px `--jx-ink`, bo `--jx-radius-card`; `.jx-search.jx-code` mono 500; `.jx-plate` mono `--jx-weight-bold`.
- `.jx-empty`: `--jx-font-hand`, `--jx-text-hand`, `text-align: center`, `line-height: 1.5`.
- `.jx-tag`: bo `999px`, `--jx-weight-bold`, `--jx-chip-bg`, `--jx-chip-text`; đang chọn: nền `--jx-ink`, chữ `--jx-text-on-accent`.
- `.jx-nav-item`: bo `999px`, `--jx-weight-heavy`, viền 1.5px `--jx-nav-border`; đang chọn: nền và viền `--jx-accent`, chữ `--jx-text-on-accent`. `min-height` giữ trong khối đầu tiên.
- `.jx-row`, `.jx-prompt`, `.jx-verdict`: theo §5 (bóng phẳng `0 3px 0 var(--jx-shadow)`, viền nét đứt `--jx-dash`, bo 18px).

`e2e/README.md`, mục "Chữ hoa bằng CSS": tiêu đề mục không còn viết hoa bằng CSS từ M5, giữ việc tìm `heading` không phân biệt hoa thường vì nó vô hại.

- [ ] **Step 4: Chạy toàn bộ, xác nhận xanh**

Run: `npm test && npm run build`
Expected: PASS.

- [ ] **Step 5: Nhìn bằng mắt trên harness**

Chạy harness theo `docs/design/watercolor/tools/README.md`, **không** có `?dir=` (để thấy CSS thật của app), mở bằng trình duyệt trong app ở cỡ 360 x 800, chụp Tra cứu và Chấm nhanh ở `colorScheme` light rồi dark. So với `docs/design/watercolor/screens/D2-lookup.webp`, `D2N-lookup.webp`, `D2-rate.webp`, `D2N-rate.webp`; chỗ nào khác spec thì spec thắng (README của thư mục nói ảnh chụp trước W13 tới W17).
Expected: nền giấy có vệt, chữ đọc rõ ở cả hai bản, dấu Tốt, Ổn, Xấu vẫn nổi nhất.

- [ ] **Step 6: Commit**

```bash
git add src/ui/ui.css src/ui/SettingsPage.tsx src/ui/tokens.test.ts src/ui/SettingsPage.test.tsx e2e/README.md
git commit -m "feat: Watercolor frame, washes, chips, nav and mono code fields"
```

---

### Task 7: Dấu verdict có hình riêng

**Files:**
- Create: `src/ui/VerdictMark.tsx`, `src/ui/VerdictMark.test.tsx`
- Modify: `src/ui/EntityRow.tsx`, `src/ui/EntityPage.tsx` (hai chỗ), `src/ui/SettingsPage.tsx` (đèn đồng bộ)
- Modify: `src/ui/ui.css`, `src/ui/tokens.test.ts`

**Interfaces:**
- Produces: `export type MarkColor = EntityColor | Verdict | 'unrated'` và `export default function VerdictMark({ color, glyph, label }: { color: MarkColor; glyph: string; label?: string })`, render `<span className="jx-mark" data-color={color} aria-label={label}>`; với `red` và `bad` có thêm một `<svg className="jx-mark-shape" aria-hidden="true">` tam giác đứng trước ký tự. Chỗ gọi giữ nguyên bảng ký tự đang có (`COLOR_MARKS`, `VERDICT_MARKS`, `LIGHT_MARK`) và nhãn đang có.

- [ ] **Step 1: Viết test đỏ**

`VerdictMark.test.tsx`:
- `draws Xấu as a triangle`: với `color` là `red` và là `bad`, phần tử `.jx-mark` có một `svg` mang `aria-hidden="true"`, và `textContent` vẫn đúng `'✕'`.
- `other marks are plain shapes`: `green`, `yellow`, `grey`, `good`, `ok` không có `svg`.
- `keeps the label a screen reader reads`: `label="xấu"` cho `aria-label="xấu"`; không truyền thì không có `aria-label`.

Trong `tokens.test.ts`: `ui.css` không chứa `clip-path` (nó cắt mất viền, W15); khối của `green`/`good` có `border: 2px solid var(--jx-good)`, `yellow`/`ok` có `2px solid var(--jx-ok)`, `grey`/`unrated` có `2px dashed var(--jx-unrated)`.

- [ ] **Step 2: Chạy, xác nhận đỏ**

Run: `npx vitest run src/ui/VerdictMark.test.tsx src/ui/tokens.test.ts`
Expected: FAIL.

- [ ] **Step 3: Viết `VerdictMark`, thay bốn chỗ dùng, sửa CSS**

Hình theo W4 và W15: Tốt tròn, Ổn vuông bo 9px, Chưa chấm tròn nét đứt nền trong suốt, mỗi hình viền 2px màu verdict trên nền `--jx-*-soft`. Tam giác: `viewBox="0 0 40 36"`, path `M20 2 L38 34 H2 Z`, `fill: var(--jx-bad-soft)`, `stroke: var(--jx-bad)`, `stroke-width: 2`, `stroke-linejoin: round`. Để ký tự nằm trên tam giác mà không phải bọc thêm thẻ (test cũ đọc `textContent` của dấu): `.jx-mark { position: relative; isolation: isolate }`, `.jx-mark-shape { position: absolute; inset: 0; z-index: -1 }`; dấu `red`/`bad` bỏ nền và viền của span, đẩy ký tự xuống vài px cho vào giữa tam giác.

- [ ] **Step 4: Chạy toàn bộ, xác nhận xanh**

Run: `npm test && npm run build`
Expected: PASS, kể cả test cũ của `LookupPage`, `EntityPage`, `SettingsPage`, `AppShell`.

- [ ] **Step 5: Commit**

```bash
git add src/ui/VerdictMark.tsx src/ui/VerdictMark.test.tsx src/ui/EntityRow.tsx src/ui/EntityPage.tsx src/ui/SettingsPage.tsx src/ui/ui.css src/ui/tokens.test.ts
git commit -m "feat: verdict marks by shape, a bordered triangle for Xấu"
```

---

### Task 8: Bộ 4 icon loại

**Files:**
- Modify: `docs/design/watercolor/tools/cutout.py` (tách phần xử lý thành hàm `cut(im: Image.Image, thr: float) -> Image.Image`, CLI giữ nguyên cách gọi)
- Create: `docs/design/watercolor/tools/export_kinds.py`
- Create: `src/assets/kinds/{driver,restaurant,dish,place}-{44,56,64,66,84,96}.webp` (24 file)
- Create: `src/ui/KindIcon.tsx`, `src/ui/KindIcon.test.tsx`
- Modify: `src/ui/EntityRow.tsx`, `src/ui/PendingBox.tsx`, `src/ui/QuickRateSheet.tsx`, `src/ui/EntityPage.tsx`, `src/ui/ui.css`
- Modify: `src/ui/LookupPage.test.tsx`, `src/ui/PendingBox.test.tsx`, `src/ui/QuickRateSheet.test.tsx`, `src/ui/EntityPage.test.tsx`
- Modify: `docs/design/watercolor/tools/README.md` (thêm dòng cho script mới)

**Interfaces:**
- Produces: `export default function KindIcon({ kind, size }: { kind: EntityKind; size: 22 | 28 | 32 })`, render `<img className="jx-kind" data-kind={kind} width={size} height={size} alt="" aria-hidden="true" src={2x} srcSet="{2x} 2x, {3x} 3x" />`. File lấy bằng `import.meta.glob('../assets/kinds/*.webp', { eager: true, import: 'default' })`.

- [ ] **Step 1: Dựng ảnh**

`export_kinds.py`: đọc `docs/design/watercolor/master/kinds-k1.webp` (1024 x 1024, lưới 2 x 2: trên trái `driver`, trên phải `restaurant`, dưới trái `dish`, dưới phải `place`), cắt bốn ô 512, tách nền bằng `cut()` (ngưỡng mặc định 30), đệm thành hình vuông trong suốt căn giữa, thu bằng LANCZOS về 44, 56, 64, 66, 84, 96 px (2x và 3x của 22, 28, 32dp), lưu WebP có alpha, quality 90, `method=6`.
Run: `python3 docs/design/watercolor/tools/export_kinds.py && ls src/assets/kinds | wc -l && du -ch src/assets/kinds | tail -1`
Expected: `24`, tổng dưới 200 KB. Mở bản 96 px của từng loại bằng công cụ xem ảnh: không còn mảng giấy quanh hình (khói của tô phở mất bớt là chấp nhận được).

- [ ] **Step 2: Viết test đỏ**

`KindIcon.test.tsx`:
- `every kind has an icon at 2x and 3x of every size`: với mỗi giá trị của `EntityKind` và mỗi cỡ 22, 28, 32, render rồi kiểm `src` chứa `-${size * 2}` và `srcSet` chứa `-${size * 3}`.
- `is decoration only`: `alt=""`, `aria-hidden="true"`.

Chỗ đặt, mỗi chỗ một test:
- `LookupPage.test.tsx`: dòng `entity-59H123456` chứa `img[data-kind="driver"]` cỡ 22, và `aria-label` của dòng giữ đúng chuỗi như trước.
- `PendingBox.test.tsx`: thẻ `reminder-…` có `img[data-kind]` cỡ 22 đứng trước nhãn.
- `QuickRateSheet.test.tsx`: chip vẫn có tên đúng `/^xe$/i` và chứa `img[data-kind="driver"]` cỡ 28.
- `EntityPage.test.tsx`: hàng đầu màn có `img[data-kind]` cỡ 32.

- [ ] **Step 3: Chạy, xác nhận đỏ**

Run: `npx vitest run src/ui/KindIcon.test.tsx src/ui/LookupPage.test.tsx src/ui/PendingBox.test.tsx src/ui/QuickRateSheet.test.tsx src/ui/EntityPage.test.tsx`
Expected: FAIL ở các test mới.

- [ ] **Step 4: Viết `KindIcon` và đặt vào bốn chỗ**

Theo hàng "Icon loại" của §5: giữa dấu verdict và tên ở `EntityRow` (22); trước tên trong thẻ nhắc của `PendingBox` (22, `r.kind`); trên chip chọn loại của `QuickRateSheet` (28, trước chữ); hàng đầu của `EntityPage` theo cùng thứ tự với `EntityRow` (32). `.jx-kind { flex: none; }`; chip chọn loại căn icon và chữ theo hàng ngang.

- [ ] **Step 5: Chạy toàn bộ, xác nhận xanh**

Run: `npm test && npm run build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add docs/design/watercolor/tools/cutout.py docs/design/watercolor/tools/export_kinds.py docs/design/watercolor/tools/README.md src/assets/kinds src/ui/KindIcon.tsx src/ui/KindIcon.test.tsx src/ui/EntityRow.tsx src/ui/PendingBox.tsx src/ui/QuickRateSheet.tsx src/ui/EntityPage.tsx src/ui/ui.css src/ui/LookupPage.test.tsx src/ui/PendingBox.test.tsx src/ui/QuickRateSheet.test.tsx src/ui/EntityPage.test.tsx
git commit -m "feat: K1 kind icons on rows, reminders, kind chips and the detail screen"
```

---

### Task 9: Màn tìm không thấy có hình doodle

**Files:**
- Create: `docs/design/watercolor/tools/export_art.py`
- Create: `src/assets/watercolor/empty-day.webp`, `src/assets/watercolor/empty-night.webp`
- Modify: `src/ui/DecisionCard.tsx`, `src/ui/ui.css`, `src/ui/LookupPage.test.tsx`, `docs/design/watercolor/tools/README.md`

**Interfaces:**
- Consumes: `--jx-show-day`, `--jx-show-night` (Task 4).
- Produces: `export_art.py` với danh sách `JOBS` (nguồn, đích, chiều rộng), Task 10 thêm job logo. Class `jx-day-only`, `jx-night-only` (`display: var(--jx-show-day)` và `var(--jx-show-night)`), Task 10 dùng lại.

- [ ] **Step 1: Dựng ảnh**

`export_art.py`: thu `docs/design/watercolor/empty-state-day.webp` và `empty-state-night.webp` về rộng 420 px (2x của 210), WebP quality 85.
Run: `python3 docs/design/watercolor/tools/export_art.py && ls -l src/assets/watercolor`
Expected: hai file, mỗi file dưới 60 KB.

- [ ] **Step 2: Viết test đỏ** (`LookupPage.test.tsx`)

- `the doodle sits under the answer, not inside it`: gõ một biển đủ chưa gặp vào state trống; có `no-match`, có `empty-art`; `no-match.nextElementSibling` là `empty-art`; `no-match` không chứa `img`; `empty-art` có `aria-hidden="true"` và hai `img` (`jx-day-only`, `jx-night-only`, `alt=""`).
- `no doodle when a near plate is shown`: state có `59H123456`, gõ `59H123458`: có `near-plates`, không có `empty-art`.
- `a name nobody has visited also gets the doodle`: gõ một tên quán chưa có: có `empty-art`.

- [ ] **Step 3: Chạy, xác nhận đỏ**

Run: `npx vitest run src/ui/LookupPage.test.tsx`
Expected: FAIL ở ba test mới.

- [ ] **Step 4: Sửa `DecisionCard` và CSS**

Khi `answers.length === 0 && near.length === 0`, ngay sau `<p data-testid="no-match">` là `<div className="jx-empty-art" data-testid="empty-art" aria-hidden="true">` chứa hai ảnh. CSS: ảnh rộng 210px, `max-height: 40vh`, `height: auto`, căn giữa. Chữ của `no-match` đã là Mali căn giữa từ Task 6.

- [ ] **Step 5: Chạy toàn bộ, xác nhận xanh, commit**

Run: `npm test && npm run build`
Expected: PASS.

```bash
git add docs/design/watercolor/tools/export_art.py docs/design/watercolor/tools/README.md src/assets/watercolor src/ui/DecisionCard.tsx src/ui/ui.css src/ui/LookupPage.test.tsx
git commit -m "feat: a doodle under the not-met answer, day and night"
```

---

### Task 10: Logo đầy đủ, màn chờ mở kho, đầu Cài đặt

**Files:**
- Modify: `docs/design/watercolor/tools/export_art.py` (thêm job logo)
- Create: `src/assets/watercolor/logo-cyclo.webp`
- Create: `src/ui/LogoLockup.tsx`, `src/ui/logo.css`, `src/ui/BootScreen.tsx`, `src/ui/BootScreen.test.tsx`
- Modify: `src/AppShell.tsx` (nhánh `if (!ready)`), `src/ui/SettingsPage.tsx`
- Modify: `src/AppShell.test.tsx`, `src/ui/SettingsPage.test.tsx`
- Modify: `docs/design/watercolor/tools/harness/main.tsx`, `docs/design/watercolor/tools/README.md` (tham số `?boot=1`)

**Interfaces:**
- Consumes: `--jx-brand`, `--jx-road`, `--jx-star`, `--jx-star-edge`, `--jx-halo-opacity`, `--jx-font-display`, `--jx-weight-display` (Task 4, 5).
- Produces: `export default function LogoLockup({ variant }: { variant: 'boot' | 'header' })` (`boot`: có sao, khung rộng `min(84vw, 57vh)`; `header`: không sao, khung rộng `40vw`); `export const STARS: { x: number; y: number; size: number; delay: number }[]` (phần trăm và mili giây, chép bảng §6.4); `export default function BootScreen()`. Biến CSS cục bộ `--logo-w` (bề rộng khung) và `--star-delay` (trễ của từng sao).

- [ ] **Step 1: Dựng ảnh xe**

Thêm job vào `export_art.py`: `docs/design/watercolor/master/logo-cyclo-d1-cutout.webp` (823 x 749, đã tách nền) thu về rộng 640 px, WebP có alpha, quality 88.
Run: `python3 docs/design/watercolor/tools/export_art.py && ls -l src/assets/watercolor/logo-cyclo.webp`
Expected: dưới 120 KB.

- [ ] **Step 2: Viết test đỏ**

`BootScreen.test.tsx`:
- `shows the logo and says the kho is opening`: có chữ đúng `Judexp`, có `Đang mở kho...`, ảnh xe có `alt=""`.
- `pops the five stars in order`: đúng 5 phần tử `.jx-star`, biến `--star-delay` lần lượt `0ms`, `150ms`, `300ms`, `450ms`, `600ms`.
- `stands still when the phone asks for less motion`: đọc `src/ui/logo.css`: có `@keyframes jx-pop` và `@keyframes jx-shimmer`; có khối `@media (prefers-reduced-motion: reduce)` trong đó `.jx-star` có `animation: none` và `fill: var(--jx-star)`.

`AppShell.test.tsx`:
- `shows the logo while the kho opens and leaves the moment it is ready`: bọc `fakePrefs` (có sẵn kho) sao cho lời gọi đầu tiên của bước khởi động chờ một promise do test nắm; trước khi giải: thấy `Judexp` và `Đang mở kho...`; giải xong: thấy `searchbox`, không còn `Đang mở kho...`.
- Trong `describe('AppShell, when the kho cannot be opened')`, test hiện có "still reaches a screen…" kiểm thêm: có chữ `Judexp` của logo và có `role="alert"`.

`SettingsPage.test.tsx`: `puts the logo above the Kho heading`: chữ `Judexp` đứng trước heading `Kho` theo `compareDocumentPosition`, và màn này không có `.jx-star`.

- [ ] **Step 3: Chạy, xác nhận đỏ**

Run: `npx vitest run src/ui/BootScreen.test.tsx src/AppShell.test.tsx src/ui/SettingsPage.test.tsx`
Expected: FAIL ở các test mới.

- [ ] **Step 4: Viết `LogoLockup`, `BootScreen`, `logo.css`; nối vào `AppShell` và `SettingsPage`**

Khung, ảnh, chữ, vệt đường, sao, keyframe, quầng đêm và cỡ đều theo §6.4 của spec, không đổi số. Những chỗ spec không nói:
- Khung đặt `--logo-w` (theo `variant`) và tính mọi cỡ từ biến đó (`font-size: calc(var(--logo-w) * 0.195)`...), nên một component dùng cho cả hai chỗ.
- Lớp sao là một SVG `viewBox="0 0 100 125"` (khung 4:5) phủ khung, `overflow: visible`. Mỗi sao là `<g transform="translate(x - s/2, y - s/2) scale(s / 24)">` bọc `<path className="jx-star" style={{ '--star-delay': '150ms' }}>`, với x = tâm x × 100, y = tâm y × 125, s = cỡ × 100. Hoạt ảnh CSS đặt trên `path`, không đặt trên `g`: thuộc tính `transform` của CSS sẽ đè thuộc tính `transform` của SVG, làm mất vị trí sao.
- `animation: jx-pop 900ms cubic-bezier(.2,.8,.2,1) var(--star-delay) both, jx-shimmer 2.6s ease-in-out calc(var(--star-delay) + 1.1s) infinite`.
- Quầng kem là một `div` sau ảnh xe với `opacity: var(--jx-halo-opacity)`, nên ban ngày không thấy.
- `BootScreen` là `<div className="jx-app jx-boot">` căn giữa dọc ngang, gồm `<LogoLockup variant="boot" />` và `<p className="jx-empty">Đang mở kho...</p>`.
- `AppShell`: `if (!ready) return <BootScreen />;`. `SettingsPage`: `<LogoLockup variant="header" />` ngay trên `<h2>Kho</h2>`.

- [ ] **Step 5: Chạy toàn bộ, xác nhận xanh**

Run: `npm test && npm run build`
Expected: PASS.

- [ ] **Step 6: Nhìn bằng mắt trên harness**

Harness như Task 6 Step 5. Thêm tham số `?boot=1` vào `harness/main.tsx`: Preferences giả không bao giờ trả lời, nên app đứng ở màn chờ để nhìn và chụp (ghi vào bảng tham số của `tools/README.md`). Xem màn chờ với `?boot=1` và đầu Cài đặt với `?nokho=1`, ở 360 x 800 và 480 x 480 (cỡ dGen1), sáng và tối. So bố cục với `docs/design/watercolor/logo-lockup-day.webp` và `logo-lockup-night.webp`; chỉnh độ lớn quầng sáng của sao theo mắt (§6.4).
Expected: logo không tràn ở 480 x 480, chữ "Đang mở kho..." nằm dưới khung, sao bật lần lượt rồi nháy.

- [ ] **Step 7: Commit**

```bash
git add docs/design/watercolor/tools/export_art.py docs/design/watercolor/tools/harness/main.tsx docs/design/watercolor/tools/README.md src/assets/watercolor/logo-cyclo.webp src/ui/LogoLockup.tsx src/ui/logo.css src/ui/BootScreen.tsx src/ui/BootScreen.test.tsx src/AppShell.tsx src/ui/SettingsPage.tsx src/AppShell.test.tsx src/ui/SettingsPage.test.tsx
git commit -m "feat: the cyclo logo with popping stars while the kho opens, and atop Settings"
```

---

### Task 11: Icon màn hình chính và icon thông báo

Cần potrace: `brew install potrace` (công cụ dev, không vào app).

**Files:**
- Create: `docs/design/watercolor/tools/export_android_icons.py`, `docs/design/watercolor/tools/silhouette.py`
- Modify: `android/app/src/main/res/mipmap-{mdpi,hdpi,xhdpi,xxhdpi,xxxhdpi}/ic_launcher.png`, `ic_launcher_round.png`, `ic_launcher_foreground.png` (15 file)
- Modify: `android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml`, `ic_launcher_round.xml` (thêm `<monochrome android:drawable="@drawable/ic_launcher_monochrome"/>`)
- Modify: `android/app/src/main/res/values/ic_launcher_background.xml` (`#F7EEDB`)
- Create: `android/app/src/main/res/drawable/ic_launcher_monochrome.xml`, `android/app/src/main/res/drawable/ic_notification.xml`
- Modify: `android/app/src/main/java/com/judexp/app/ReminderAlarmReceiver.java` (`setSmallIcon(R.drawable.ic_notification)`)
- Delete: `android/app/src/main/res/drawable-v24/ic_launcher_foreground.xml`, `android/app/src/main/res/drawable/ic_launcher_background.xml`
- Modify: `docs/design/watercolor/tools/README.md`

**Interfaces:**
- Produces: `@mipmap/ic_launcher_foreground` (xe D1 trên khung 108dp, trong suốt ngoài xe), Task 12 dùng làm icon màn mở app; `@drawable/ic_notification`.

- [ ] **Step 1: So chữ trên mui với Fraunces thật (R4), chờ huynh**

Cắt vùng mui có chữ từ `docs/design/watercolor/master/icon-launcher-d1.webp`, phóng lên 512 px chiều rộng, đặt cạnh chữ "Judexp" dựng bằng Fraunces 650 SOFT 100 WONK 0 cùng cỡ (một trang HTML tạm trong scratchpad, font lấy từ `node_modules`, chụp bằng trình duyệt trong app). Gửi ảnh cho huynh.
Expected: huynh nói "giữ". Nếu huynh thấy lệch rõ: **dừng task và hỏi huynh**, vì sơn lại cần key OpenRouter (`tools/gen.py` phải sửa để đọc `OPENROUTER_API_KEY`, theo file bàn giao).

- [ ] **Step 2: Xuất icon launcher, kiểm vòng an toàn 66dp**

`export_android_icons.py`: tách xe khỏi nền `#f7eedb` của `master/icon-launcher-d1.webp` bằng `cut()`, thu còn 90%, đặt tâm hộp bao của xe vào tâm khung 1024 (khung 1024 ứng với 108dp). Đo khoảng cách từ tâm tới điểm mực xa nhất (alpha trên 32), đổi ra dp; **lớn hơn 33dp thì thoát mã 1** và in số đo. Ghi lớp trước 108, 162, 216, 324, 432 px. Icon cũ: phủ lớp trước lên nền `#f7eedb`, cắt phần 72/108 ở giữa, thu về 48, 72, 96, 144, 192 px; `ic_launcher.png` vuông, `ic_launcher_round.png` có mặt nạ tròn khử răng cưa.
Run: `python3 docs/design/watercolor/tools/export_android_icons.py`
Expected: in bán kính mực xa nhất, nhỏ hơn hoặc bằng 33dp; 15 file PNG được ghi đè.

- [ ] **Step 3: Vẽ hai hình bóng bằng `silhouette.py`**

Mặt nạ lấy từ chính lớp trước vừa xuất: điểm khác màu giấy (khoảng cách màu tới `#f7eedb` trên ngưỡng) và có alpha. Khác `cut()` ở chỗ giấy lọt trong bánh và mui thành lỗ, nên hình bóng còn ra bánh xe. Làm mượt (đóng rồi mở hình thái), bỏ đốm nhỏ, chạy `potrace -b svg --flat` với `-t` và `-a` đưa qua tham số dòng lệnh, rồi bọc `d` vào VectorDrawable: một `<group>` mang `translateY`, `scaleX`, `scaleY` đúng như `transform` potrace in ra, `fillColor` một màu. Hai đầu ra:
- `ic_launcher_monochrome.xml`: 108dp, viewport bằng cỡ mặt nạ 432, hình nằm trong vòng 66dp (cùng hình học với lớp trước).
- `ic_notification.xml`: 24dp, mặt nạ cắt sát xe chừa 2dp mỗi bên rồi thu về 96 px, làm mượt mạnh hơn để nan hoa thành bánh đặc, `fillColor` `#FFFFFFFF`.
"Chỉnh tay" là chạy lại với ngưỡng và tham số khác; lệnh cuối cùng ghi vào `tools/README.md`. Xem trước bằng SVG potrace in ra (phóng ở 24 px và 48 px).
Expected: nhìn ra xích lô có mui và bánh ở cả hai cỡ.

- [ ] **Step 4: Nối resource, đổi `setSmallIcon`, xóa vector robot**

Run: `grep -rn "drawable.ic_launcher_foreground\|drawable/ic_launcher_background" android/app/src/main; cd android && ./gradlew testDebugUnitTest assembleDebug`
Expected: `grep` không in gì; build và JUnit xanh.

- [ ] **Step 5: Kiểm trên hai máy**

Cài lên dGen1 và UBS1, xem icon ở màn hình chính. Bật thông báo thử: tra một biển `00E…` trên UBS1 cho có nhắc, lấy `notificationId` từ `adb -s <UBS1> shell run-as com.judexp.app cat files/pending.json`, rồi `adb -s <UBS1> shell am broadcast -n com.judexp.app/.ReminderShowNowReceiver --ei notificationId <id>`; bấm "Không đi" trong Chờ chấm sau khi xem xong. Icon theo hình nền chỉ kiểm nếu launcher hỗ trợ và đã bật (R8). Chụp màn gửi huynh.
Expected: icon tròn trịa trong khung của từng máy; icon thông báo ra dáng xe. Không ra dáng thì theo R2: dựng mặt nạ chữ J Fraunces (chụp từ trang HTML tạm như Step 1), cho qua `silhouette.py`, thay `ic_notification.xml`, kiểm lại.

- [ ] **Step 6: Commit**

```bash
git add -A android/app/src/main/res android/app/src/main/java/com/judexp/app/ReminderAlarmReceiver.java docs/design/watercolor/tools
git commit -m "feat: cyclo launcher icon with a monochrome layer, and a cyclo notification icon"
```

---

### Task 12: Màn mở app của hệ thống

**Files:**
- Modify: `android/app/src/main/res/values/styles.xml`
- Create: `android/app/src/main/res/values/colors.xml`, `android/app/src/main/res/values-night/colors.xml`
- Delete: 11 file `splash.png` (`drawable`, `drawable-port-{mdpi,hdpi,xhdpi,xxhdpi,xxxhdpi}`, `drawable-land-{…}`)

**Interfaces:**
- Consumes: `@mipmap/ic_launcher_foreground` (Task 11).
- Produces: màu `jx_window_bg` (`#F6EDDD`, đêm `#1A1714`), `jx_splash_icon_bg` (`#F7EEDB`, không có bản đêm).

- [ ] **Step 1: Sửa theme, thêm màu, xóa ảnh splash cùng một lượt**

`AppTheme.NoActionBarLaunch` đổi parent sang `Theme.SplashScreen.IconBackground`, bỏ `android:background`, đặt `windowSplashScreenBackground` `@color/jx_window_bg`, `windowSplashScreenIconBackgroundColor` `@color/jx_splash_icon_bg`, `windowSplashScreenAnimatedIcon` `@mipmap/ic_launcher_foreground` (thuộc tính của core-splashscreen, không có tiền tố `android:`). `AppTheme.NoActionBar` thêm `android:windowBackground` `@color/jx_window_bg`. Không gọi `installSplashScreen()`, không đặt `postSplashScreenTheme` (§6.3). Xóa 11 file `splash.png` trong cùng thay đổi: còn dòng `@drawable/splash` mà mất ảnh thì build lỗi.

- [ ] **Step 2: Build**

Run: `grep -rn "drawable/splash" android/app/src/main; cd android && ./gradlew assembleDebug`
Expected: `grep` không in gì; build xanh.

- [ ] **Step 3: Kiểm trên hai máy, ngày và đêm**

Cài lên hai máy. Mỗi chế độ, mở nguội như Task 1 và quay màn bằng `adb -s <máy> shell screenrecord --time-limit 8 /sdcard/jx-open.mp4` (kéo về bằng `adb pull`), xem từng khung.
Expected: màn mở app đúng nền kem hoặc nền đêm, có đĩa kem sau xe; không có khung màu lạ giữa màn mở app, màn chờ mở kho và Tra cứu; dải status bar và nav bar cùng màu nền.

- [ ] **Step 4: Commit**

```bash
git add -A android/app/src/main/res
git commit -m "feat: system splash shows the cyclo on a cream disc, day and night"
```

---

### Task 13: Nghiệm thu trên máy, số đo và tài liệu

Theo §8 của spec. Mục nào không đạt thì ghi số và ảnh, báo huynh; không tự gọi là đạt.

**Files:**
- Modify (chỉ khi Step 4 thấy nháy): `src/main.tsx`
- Modify: `CHANGELOG.md`, `README.md`, `docs/superpowers/specs/2026-10-27-judexp-watercolor-design.md` (dòng trạng thái)

- [ ] **Step 1: Toàn bộ test và build**

Run: `npm test && npm run build && npx cap sync android && (cd android && ./gradlew testDebugUnitTest assembleDebug)`
Expected: tất cả xanh. Cài APK lên dGen1 và UBS1.

- [ ] **Step 2: Mở nguội và dung lượng**

Run: `scripts/cold-start.sh <UBS1> 5 force-stop` và `scripts/cold-start.sh <dGen1> 5 reboot`, cùng cách và số lượt như Task 1, chạy trước e2e. Đo cỡ APK.
Expected: trung vị `ready` của mỗi máy không vượt trung vị mốc quá 5% (ngưỡng nhiễu); APK tăng dưới 2 MB. Vượt thì dừng, báo huynh kèm số của từng lượt, kiểm Step 4 trước (font và ảnh màn chờ là thứ mới nằm trên đường mở app).

- [ ] **Step 3: E2e trên UBS1**

Run: `npm run e2e`
Expected: 3 test xanh, và `git diff 993ec01 -- e2e/tests e2e/lib` rỗng (không sửa bộ chọn nào).

- [ ] **Step 4: Kiểm bằng mắt trên hai máy, sáng và tối**

Chụp bằng `adb -s <máy> exec-out screencap -p > <scratchpad>/<máy>-<màn>-<chế độ>.png`, gửi huynh. Từng mục:
- S6: đổi chế độ khi app đang mở và khi ở nền, màu đổi theo không cần mở lại.
- Màn chờ mở kho: không tràn trên dGen1 (480 x 480 dp), sao bật lần lượt; frame đầu không hiện font dự phòng hay thiếu xe. Nếu thấy nháy: trong `src/main.tsx`, trước `createRoot`, chèn `<link rel="preload">` cho ảnh xe (`as="image"`) và hai file Fraunces (`as="font"`, `type="font/woff2"`, `crossorigin`), lấy đường dẫn bằng import `?url`; `npm test && npm run build`, kiểm lại.
- Màn tìm không thấy trên dGen1: khi đã cất bàn phím không phải cuộn; khi bàn phím mở vẫn thấy câu "Chưa gặp người này".
- Icon loại 22dp không nhòe (R3). Nhòe thì **hỏi huynh** chọn giữa tăng lên 28dp hay chỉ giữ ở chip chọn loại và đầu màn Chi tiết, kèm ảnh chụp.
- Dấu verdict ba hình nhìn rõ trên thẻ ở cả hai bản; tam giác Xấu có viền.
- Icon màn hình chính, icon thông báo, màn mở app: đã kiểm ở Task 11, 12; chụp lại một lượt trên bản cuối.

- [ ] **Step 5: Tài liệu**

- `CHANGELOG.md`, `[Unreleased]`: mục M5 có dòng mở đầu bằng lời thường cho từng thay đổi người dùng thấy (theme ngày đêm theo máy, dấu verdict có hình, icon loại, doodle, logo và màn chờ, icon app, icon thông báo, màn mở app), mục Changed cho font (bỏ Inter, Roboto Mono) và token, số đo mở nguội trước và sau của từng máy, cỡ APK trước và sau, kết quả S6, máy đã kiểm, phần chưa kiểm (ví dụ R7 trên Android 7 tới 11, icon theo hình nền nếu launcher không hỗ trợ).
- `README.md`: hàng M5 ở bảng Trạng thái, dòng font ở Tech stack, `scripts/cold-start.sh` ở mục Test.
- Spec Watercolor: dòng trạng thái ghi đã làm trên branch, ngày, và kết quả nghiệm thu.

- [ ] **Step 6: Commit, rồi dừng chờ huynh**

```bash
git add CHANGELOG.md README.md docs/superpowers/specs/2026-10-27-judexp-watercolor-design.md
git commit -m "docs: M5 Watercolor in the changelog and README, with the measurements"
```

Không push, không tạo PR, không bump version khi huynh chưa bảo.

---

## Phủ spec

| Spec | Task |
|---|---|
| §2 W1, W2, W3, W14 | 4, 6 |
| §2 W4, W15 | 7 |
| §2 W5, §4 | 5, 6 |
| §2 W6, W8, §6.4 | 10 |
| §2 W7, W11, §6.1, §6.2 | 11 |
| §2 W9 | 8 |
| §2 W10, W16 | 9 |
| §2 W13 | 6 |
| §2 W17, §6.3 | 12 |
| §3 màu và tương phản, §5 cơ chế ngày đêm | 4 |
| §5 khung và thành phần, ràng buộc test | 6 tới 10, Global Constraints |
| §7 tài sản | 8, 9, 10, 11 |
| §8 nghiệm thu | 1, 13 |
| §10 S6 | 2, 3 |
| §10 R2, R3, R4, R5, R8 | 11, 13, 11, 5 và 13, 11 |
| §11 sửa spec gốc | đã làm ở `b2fedab` |
