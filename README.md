# Judexp

App Android (**Capacitor + Ionic React + Vite + TypeScript**) làm **sổ ký ức trải nghiệm cá nhân**: tài xế từng chở, quán từng ăn, món từng gọi, địa điểm từng tới. Giá trị chính là **tra cứu tại hiện trường**: app đặt xe vừa ghép tài xế, gõ biển số là biết lần trước thế nào, trước khi bấm đồng ý. appId `com.judexp.app`, build hoàn toàn bằng CLI (không mở Android Studio). Người dùng thật: huynh và Gú.

App sống ở hai thời điểm, nên tách thành hai luồng:

- **Luồng Hỏi** (đi hay hủy): gõ biển số hoặc tên, app trả **thẻ quyết định** kèm màu của thực thể. Luồng này không ghi gì vào kho, chỉ để lại một nhắc chấm.
- **Luồng Ghi** (sau chuyến, sau bữa): chấm ba mức **Tốt / Ổn / Xấu** kèm tag, từ thông báo nhắc, từ hộp Chờ chấm hoặc nhập tay.
- **Nhắc chấm** nối hai luồng: 90 phút sau mỗi lần tra rõ đối tượng, thông báo có ba nút, chạm là chấm xong mà không mở app.

---

## Overview

Local-first, **không backend**. Dữ liệu là một **kho file chỉ-thêm**: mỗi lần gặp, sửa, gộp hay ẩn là một file JSON mới trong `events/`, app không bao giờ sửa hay xóa file cũ. **Syncthing** chở kho giữa điện thoại và **Atomman** (Windows, chạy 24/7). App chỉ đọc ghi folder kho qua **SAF** (Storage Access Framework), không tự viết logic sync. Hai máy không bao giờ chạm cùng một file nên không có conflict.

**Index là dữ liệu phái sinh**: mỗi máy tự dựng từ file gốc, giữ trong bộ nhớ, kèm một snapshot JSON trong vùng dữ liệu riêng của app (`index-snapshot.json` ở `Directory.Data`) để mở app không phải đọc lại cả kho. Snapshot gắn với kho của nó; hỏng hay lệch thì xóa dựng lại. Spec §7 ghi SQLite, plan 1 đổi sang in-memory cộng snapshot vì ở mức vài nghìn event SQLite gần như không thêm gì mà lại kéo theo rủi ro S3.

Worker Python trên Atomman (đọc ảnh share, bóc biển số và tên quán) **chưa làm**, thuộc mốc M2 và M3.

Thiết kế, quyết định và rủi ro: **[spec](docs/superpowers/specs/2026-10-16-judexp-design.md)**. Spec là nguồn chân lý, plan chỉ lập luận từ spec.

---

## Trạng thái

| Mốc | Nội dung | Trạng thái |
|---|---|---|
| M0 | Khung repo, ba plugin native lấy từ Gu Library, ghi event vào kho thật | Xong (`v0.1.0`); spike S1, S2 đã đóng |
| M0.5 | Hệ thiết kế: token cộng ba màn hình mẫu | Xong (`v0.1.0`) |
| M1 | Domain, khớp mờ, index, luồng Hỏi đường gõ, nhập tay | Xong, nghiệm thu trên dGen1 (`v0.1.0`) |
| M2 | Phase test parser đối đầu (OCR local và vision LLM) | Chưa làm, chờ bộ 25 tới 30 ảnh thật |
| M3 | Worker, share ảnh, nạp nền từ lịch sử, camera chụp tại chỗ | Chưa làm |
| M4 | Nhắc chấm 90 phút, nút trên thông báo, hộp Chờ chấm | Xong (`v0.2.0`); spike S5 đã đóng |
| M5 | Bộ icon app và icon bốn loại | Chưa làm |

Lịch sử thay đổi: **[CHANGELOG.md](CHANGELOG.md)**.

---

## Features

- **Tra cứu** (màn mặc định, ô tìm có focus sẵn): một ô cho cả biển số lẫn tên. Biển số bỏ dấu phân cách (`59H1-234.56` thành `59H123456`), khớp đúng, tiền tố, hậu tố, lệch tối đa một ký tự, mảnh giữa biển từ 3 ký tự, cộng bảng ký tự dễ lẫn `0/O`, `1/I/L`, `2/Z`, `5/S`, `8/B`, `6/G`. Biển số chỉ đi qua các luật này, không qua luật tên, nên một biển chưa gặp không ra nhầm tài xế cũ. Tên bỏ dấu (kể cả `đ`, và chữ `Ð` mà OCR hay viết), bỏ dấu câu, khớp theo từ: nguyên từ xếp trên phần đầu của một từ dài hơn, khớp ở đầu tên xếp trên khớp ở giữa, trigram đỡ lỗi gõ. Tiền tố chung chung (`quán`, `tiệm`, `nhà hàng`, `cửa hàng`) không cần gõ, mà gõ dở cũng vẫn ra. Bằng điểm thì lần gặp gần nhất đứng trước. Chạy hoàn toàn trên máy nên mất mạng hay Atomman tắt vẫn tra được.
- **Thẻ quyết định** nói rõ app biết gì: từng chấm (màu, verdict từng lần), đã gặp chưa chấm (xám, "đã gặp N lần"), chưa gặp ("Chưa gặp người này" cho biển số, "Chưa ghé chỗ này" cho tên).
- **Màu thực thể**: xám khi chưa có lần nào được chấm; đỏ khi lần chấm gần nhất là Xấu hoặc có từ 2 lần Xấu trong 5 lần chấm gần nhất; xanh khi 5 lần gần nhất không có Xấu và lần gần nhất là Tốt; vàng cho phần còn lại. Lần gặp chưa chấm không tính màu nhưng vẫn tính số lần gặp. Mỗi trạng thái có dấu riêng, màu không bao giờ là tín hiệu duy nhất.
- **Chấm nhanh**: sheet chọn loại (tài xế, quán, món, địa điểm), ba nút verdict, chip tag theo loại, ghi chú. Địa điểm có khóa uuid do app sinh.
- **Chi tiết thực thể**: dòng thời gian các lần gặp, mọi nhãn từng thấy, sửa verdict của một lần chấm (`amend`), **gộp phải hỏi** (chỉ gợi ý cho quán: tên gần giống trong 150 m, toạ độ có `accuracy` trên 100 m thì chỉ so tên), gỡ gộp (`tombstone` lên event `merge`).
- **Nhắc chấm (M4)**: tra xong mà rõ đúng một đối tượng, hoặc gõ đủ một biển số chưa gặp, thì 90 phút sau (luật "rõ đối tượng" ở spec §9.3) có thông báo với ba nút **Tốt, Ổn, Xấu**. Chạm nút không mở app: câu trả lời vào hàng chờ trong vùng dữ liệu riêng, thành event `encounter` (`source.kind: "reminder"`) ở lần mở app kế tiếp. Nhắc quá 48 giờ tự bỏ. Alarm có cửa sổ 10 phút, được đặt lại sau khi khởi động máy hay cập nhật app, nhắc đã hiện thì không nổ lại.
- **Hộp Chờ chấm**: nhắc đang chờ (có nút **Không đi**, chỉ tắt nhắc, không ghi gì vào kho) và những lần gặp chưa chấm.
- **Cài đặt**: chọn kho qua SAF (profile và môi trường), tên người ghi, PIN mở app, đèn Syncthing ba mức (địa chỉ, API key, Device ID của Atomman, lưu bằng nút "Lưu và kiểm tra kết nối"), dựng lại index, xem đuôi `_worker.log`, xin lại quyền thông báo.
- **Kho bị Android giấu**: sau một lần boot lỗi, provider có thể liệt kê kho rỗng mà vẫn cho tạo folder. App nhận ra (native trả `KHO_HIDDEN`, JS ném `KhoUnreadableError`), bảo khởi động lại máy và không mở đường ghi nào, thay vì tạo `events (1)` rồi ghi vào chỗ không ai đọc.

---

## Tech stack

| Lớp | Công nghệ |
|-----|-----------|
| UI | React 19, Ionic React 9, TypeScript 7, token CSS (`src/ui/theme/tokens.css`), font bundle Inter + Roboto Mono |
| Build | Vite 8, Capacitor CLI 8 |
| Native | Capacitor 8 (Android, minSdk 24, target/compile SDK 36); plugin tự viết `SafPlugin`, `ShareTargetPlugin`, `SyncthingPlugin` (lấy từ Gu Library) và `ReminderPlugin` cùng các receiver |
| Lưu trữ | Kho qua SAF; snapshot index, nhắc chờ và câu trả lời nhắc qua `@capacitor/filesystem` (`Directory.Data`); cài đặt qua `@capacitor/preferences` |
| Đồng bộ | Syncthing, chạy ngoài app |
| Test | Vitest 5 + Testing Library + jsdom; JUnit cho phần Java; e2e trên máy thật bằng tester-army/e2e + agent-device (`e2e/`) |

### Cấu trúc thư mục

```
src/
  domain/     khóa, schema event, gấp event thành state, màu, gộp, tag, lịch nhắc (hàm thuần)
  search/     khớp mờ biển số và tên, chọn đối tượng của một lần tra
  storage/    đọc ghi kho qua SAF
  index/      index phái sinh và snapshot
  reminders/  hàng chờ nhắc, biến câu trả lời thành event
  profile/    cài đặt: kho, PIN, tên người ghi
  sync/       đèn Syncthing
  plugins/    lớp TypeScript cho plugin native
  ui/         màn hình và token
android/app/src/main/java/com/judexp/app/   plugin native và receiver
docs/         spec, plan, mockup thiết kế
```

Ranh giới bắt buộc: `domain` và `search` không biết gì về file, Capacitor hay SAF (nhận dữ liệu thuần, trả dữ liệu thuần, test trong một giây không cần điện thoại). `index` chỉ phụ thuộc `domain`. `ui` không gọi thẳng `storage`.

---

## Cách chạy (How to run)

### Yêu cầu

- Node.js (đang dùng 24) và npm
- JDK 21 và Android SDK 36, khai báo `JAVA_HOME`, `ANDROID_HOME` như Gu Library
- `adb` và một máy Android thật: SAF, share sheet, thông báo và Syncthing không giả lập được
- Syncthing trên điện thoại (GUI bật HTTPS) và trên Atomman

### Cài đặt

```bash
npm install
```

### Test

```bash
npm test                                # Vitest (domain, search, index, UI)
npm run build                           # tsc -b && vite build
cd android && ./gradlew testDebugUnitTest   # JUnit cho receiver và hàng chờ nhắc
```

`npm test` không typecheck. Luôn chạy `npm run build` trước khi gọi là xong.

### E2E trên máy thật

```bash
npm run e2e
```

Ba test khói (tra cứu, chấm nhanh, nhắc chấm qua nút trên thông báo) chạy trên UBS1, **ghi thẳng vào kho QA** bằng dải biển `00E…`, khoảng 2 phút, không gọi model. Cần APK debug, kho QA đã chọn với folder Syncthing đuôi `-qa`, thông báo bật, không PIN; dGen1 không chạy được. Cách cài, những gì mỗi lượt để lại trong kho, và các bẫy: [`e2e/README.md`](e2e/README.md).

### Build APK debug và cài lên máy

```bash
npm run build && npx cap sync android
cd android && ./gradlew assembleDebug
adb -s <máy> install -r app/build/outputs/apk/debug/app-debug.apk
```

Chưa có bản release ký: Judexp chưa có keystore riêng. Khi cần thì theo quy ước của Gu Library (keystore nằm ngoài repo, mật khẩu trong `android/keystore.properties`, file này đã gitignore). Mất keystore là không cài đè được bản cập nhật.

---

## Version

Một nguồn duy nhất là `package.json` (hiện `0.2.0`, tag `v0.2.0`), như Gu Library. `android/app/build.gradle` đọc `versionName` từ đó và tính `versionCode` = major × 10000 + minor × 100 + patch (0.2.0 là 200), nên không bao giờ quên tăng. Vite inject `__APP_VERSION__`; Cài đặt hiện "Judexp phiên bản X" ở mục Máy này, và preflight e2e in đúng số đó. Bump version là sửa `package.json` (`npm version x.y.z --no-git-tag-version`, sửa luôn `package-lock.json`) rồi build lại; đừng sửa hai chỗ.

---

## Kho và môi trường

Môi trường tách ở cấp cha, mỗi profile một folder Syncthing riêng, không share chéo:

| Folder trên Atomman | Folder-ID |
|---|---|
| `D:\Judexp\Hieu\kho\` | `judexp-hieu-qa` |
| `D:\Judexp\gu\kho\` | `judexp-gu-qa` |
| `D:\Judexp-Prod\Hieu\kho\` | `judexp-hieu-prod` |
| `D:\Judexp-Prod\gu\kho\` | `judexp-gu-prod` |

Mỗi kho có `events/` (chỉ thêm), `inbox/` (ảnh chờ worker), `parsed/` (kết quả worker), `attachments/` (ảnh biển hiệu thu nhỏ) và `_worker.log`. Cùng một APK chạy cả QA lẫn Prod; "môi trường" là folder kho nào, không phải một tầng app.

Máy QA: **dGen1** (màn vuông 480x480 dp, Android 15) ghép `judexp-hieu-qa`; **UBS1** (720x1600, Android 14) ghép `judexp-gu-qa`. Hai máy khác lớp nhau nên số đo bố cục của máy này không suy sang máy kia được.

---

## Riêng tư

- "Profile" không phải đăng nhập: không có server nào xác thực, chọn profile chỉ là chọn folder kho.
- PIN chỉ chặn người cầm máy mở xem. Dữ liệu trong kho **không mã hóa**.
- App không giữ secret nào. API key của vision LLM (khi có worker) nằm trên Atomman.
- Index, nhắc chờ và câu trả lời nhắc nằm trong vùng dữ liệu riêng của app, không vào kho, không sync.

---

## Troubleshooting

| Dấu hiệu | Nguyên nhân và cách xử lý |
|-----|-----------|
| App báo không đọc được kho, bảo khởi động lại máy | Provider `com.android.externalstorage` lỗi sau một lần boot nên giấu cả kho (logcat: `Queried directory ... is hidden`). Khởi động lại máy rồi mở app. |
| dGen1 mở app ra màn đen | `am force-stop` lặp lại làm WebView không bind được tiến trình sandbox. Gỡ cài lại không hết, chỉ reboot. Trên dGen1 mở app bằng `adb shell monkey -p com.judexp.app -c android.intent.category.LAUNCHER 1`. |
| Đèn Syncthing không xanh | Địa chỉ phải là `https://127.0.0.1:8384`: Android chặn cleartext kể cả localhost, nên GUI Syncthing phải bật HTTPS. 403 là API key sai. Dò từ Mac: `adb forward tcp:18384 tcp:8384` rồi `curl -sk https://127.0.0.1:18384/rest/system/status`; 307 là http đang chuyển sang https, timeout là Syncthing không chạy. Nhớ `adb forward --remove`. |
| App cảnh báo ô API key | Đã dán Device ID vào ô API key; hai ô nằm cạnh nhau trong UI Syncthing. |
| Nhắc tới trễ | Alarm có cửa sổ 10 phút (`setWindow`), Doze có thể hoãn thêm khi máy nằm yên lâu. Kiểm bằng `adb shell dumpsys alarm`. |
| Thông báo chỉ có 3 nút | Android chỉ vẽ 3 action đầu của một thông báo. "Không đi" nằm trong hộp Chờ chấm. |
| Ngày giờ lạ trên UBS1 | Đồng hồ từng tụt về 24/09/2024 sau khi hết pin và khởi động lại khi chưa có Wi-Fi. Xem `adb shell date` trước. |
| `adb shell input text` gõ nối vào chữ cũ | Ô tìm giữ chữ khi app sống ngầm. Xóa ô trước khi gõ. |
| Cài APK trên dGen1 hiện hộp thoại Play Protect | Chọn "Don't send" (không gửi gì, không đổi cài đặt). |
| Test ngày giờ đỏ trên máy khác | Test ghim `TZ=Asia/Ho_Chi_Minh` trong `vite.config.ts`; đừng bỏ dòng đó. |

---

## Tài liệu

- Spec: [`docs/superpowers/specs/2026-10-16-judexp-design.md`](docs/superpowers/specs/2026-10-16-judexp-design.md)
- Plan 1, nền tảng app (M0, M0.5, M1): [`docs/superpowers/plans/2026-10-16-judexp-nen-tang-app.md`](docs/superpowers/plans/2026-10-16-judexp-nen-tang-app.md)
- Plan 4, nhắc chấm (M4): [`docs/superpowers/plans/2026-10-18-judexp-nhac-cham.md`](docs/superpowers/plans/2026-10-18-judexp-nhac-cham.md)
- Mockup thiết kế: [`docs/design/mockups.html`](docs/design/mockups.html)
- Ledger SDD (mọi ruling đệ làm thay huynh) nằm trong `.superpowers/sdd/`, đã gitignore nên chỉ có trên máy Mac. Log phiên nằm trong vault Obsidian (`claude-sessions/judexp/`), ngoài repo.
