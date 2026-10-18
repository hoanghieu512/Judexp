# Bộ test khói e2e: Judexp

3 test chạy trên **máy Android thật** (UBS1, kho QA), lái app bằng [tester-army/e2e](https://github.com/tester-army/e2e) + agent-device, theo khuôn `e2e/` của Gu Library. Gõ, bấm và **mọi phép kiểm** đi bằng nhãn trợ năng chính xác, không nhờ model phán; model (Haiku 5.5 qua OpenRouter) chỉ là lưới dự phòng và tới giờ chưa được gọi lần nào: **0 token, $0 mỗi lượt**.

| File | Test |
|---|---|
| `tests/lookup.e2e.ts` | Thẻ quyết định nói đúng: biển đã chấm, biển gặp nhưng chưa chấm, biển chưa gặp; gõ đủ một biển lệch 1 ký tự thì trả lời "Chưa gặp người này" và để biển đã biết riêng dưới tiêu đề "Biển gần giống" |
| `tests/rate.e2e.ts` | Chấm nhanh "Xấu" ghi đúng 1 event vào kho, event mang `verdict: "bad"`, thẻ thành xấu và thêm 1 lần gặp |
| `tests/reminder.e2e.ts` | Tra xong để lại nhắc, bấm "Tốt" trên thông báo không mở app, lần mở app sau thì có đúng 1 event `verdict: "good"`, `source.kind: "reminder"` |

## Chạy trên kho QA thật

Huynh chốt ngày 2026-10-18: môi trường QA là môi trường test, e2e chạy thẳng trên đó, không tách app hay kho riêng. Kho là chỉ-thêm và sync sang Atomman, nên mọi thứ test ghi là **vĩnh viễn**. Vì vậy:

- Test chỉ dùng **dải biển `00E…`**: mã tỉnh 00 không có thật, nên không đụng biển thật và nhìn là biết dữ liệu test. `00E000001` (chưa chấm) và `00E000002` (đã chấm) là 2 event mẫu trong `fixtures/events/`, preflight nạp vào kho một lần (đã có thì thôi). `src/e2eFixtures.test.ts` phía app kiểm app đọc được đúng chúng.
- **Mỗi lượt để lại đúng 2 event:** một lần "Xấu" cho `00E000002` (chấm nhanh) và một lần "Tốt" cho `00E000003` (qua thông báo). Biển chưa gặp lấy ngẫu nhiên `00E9xxxxx` mỗi lượt và không ghi gì.
- **Mỗi lần tra xong sinh một nhắc**; đầu và cuối mỗi test bấm "Không đi" cho mọi nhắc `00E`, nên không nhắc nào reo trên máy 90 phút sau. "Không đi" không ghi gì vào kho.
- Lịch sử các biển `00E` dày dần qua từng lượt, nên phép kiểm không dựa vào trạng thái ban đầu: màu do một lần chấm quyết định, số lần gặp tăng đúng 1, event mới nhất mang đúng verdict.

## Cài lần đầu

```bash
npm --prefix e2e install
```

- Key OpenRouter **chỉ để ở biến môi trường**: `export OPENROUTER_API_KEY=…` trong `~/.bash_profile` (key dùng chung với Gu Library). e2e không đọc `.env`.
- Cắm UBS1, mở khoá, cho phép gỡ lỗi USB. Lần chạy đầu agent-device cài APK phụ `com.callstack.agentdevice.snapshothelper`; Play Protect trên UBS1 sẽ hỏi, người phải bấm cho phép (UBS1 đã có sẵn từ Gu Library).
- App cần kiểm phải là **APK debug** cài sẵn trên máy: test đọc Preferences và `pending.json` bằng `run-as`, và gọi receiver chỉ có ở bản debug (xem Bẫy). Kho QA đã chọn trong app, thông báo đã bật, không đặt PIN.

## Chạy

```bash
npm run e2e
```

Từ thư mục gốc. `preflight` chạy trước và dừng ngay kèm cách sửa khi: thiếu key, không chạy được adb, không thấy máy, máy không phải máy QA, chưa cài app, không đọc được kho (chưa chọn kho, hoặc APK không phải bản debug), **kho trông như Prod** (đường dẫn hay folder Syncthing có chữ `prod`), app đặt PIN, chưa bật thông báo. Qua hết thì nạp event mẫu và in `✓ app vX trên UBS1 · kho … (judexp-gu-qa) · …`.

- Một file: `npm --prefix e2e test -- tests/rate.e2e.ts`.
- Unit của các hàm đọc adb, Preferences, vị trí nút thông báo, preflight: `npm --prefix e2e run unit` (không cần máy). Kiểm kiểu: `npm --prefix e2e run typecheck`.
- Gỡ lỗi: thêm `--video on --debug`; từ thư mục gốc phải qua hai `--`: `npm run e2e -- -- --video on`.

Số đo (UBS1, 18/10/2026): 3 test, khoảng **1 phút 48 giây**, 0 token model, ba lượt liền đều xanh.

## Test có canh lỗi thật không

Ngày 18/10 đã dựng một APK cố ý hỏng ba chỗ (thẻ quyết định không tách biển gần giống; chấm nhanh ghi "Ổn" thay cho verdict đã chọn; app không settle câu trả lời từ thông báo) rồi chạy bộ test:

- Tra cứu: đỏ. Nhắc: đỏ ("5 → 5 event").
- **Chấm nhanh: vẫn xanh, tức là test rỗng.** `00E000002` đã có 3 lần "Xấu" từ các lượt trước, mà luật màu là có từ 2 lần xấu trong 5 lần chấm gần nhất thì đỏ, nên ghi nhầm "Ổn" thì biển vẫn đỏ. Sửa: test đọc event mới nhất trong kho và đòi `verdict: "bad"`. Chạy lại trên APK hỏng: đỏ ("expected ok to be bad").

Thêm test mới thì làm lại bước này: hỏng đúng thứ test canh, test phải đỏ.

## Đọc kết quả

- Tổng: `e2e/.e2e/report.json`.
- Test trượt: `e2e/.e2e/artifacts/android/<test>/…/failure/screen.txt` (cây giao diện lúc trượt) cùng ảnh chụp.

Phân loại trượt như Gu Library: **hạ tầng** (không thấy máy, khởi động chậm) thì chạy lại một lần; **locator hay phép kiểm** thì coi là hồi quy cho tới khi chứng minh ngược lại.

## Quy ước nhãn trong app

Test bấm và đọc theo `aria-label` nói việc cộng đối tượng:

- dòng kết quả: `Mở 00E000002, xấu, 3 lần gặp, hôm nay` (biển hoặc tên, màu bằng chữ: tốt, tạm, xấu, chưa chấm; số lần gặp; lần gặp cuối khi đã chấm);
- hộp Chờ chấm: `Chấm tốt cho <nhãn>`, `Không đi <nhãn>`;
- Chấm nhanh: nút chấm `Chấm tốt` / `Chấm ổn` / `Chấm xấu` có `aria-pressed` (xem Bẫy), chip loại và chip tag có `aria-pressed`;
- tiêu đề mục gần giống là `heading` "Biển gần giống, có thể là xe khác".

## Máy hỗ trợ

- **Chỉ UBS1.**
- **dGen1 là máy QA nhưng engine không chạy được trên đó**, preflight từ chối: engine force-stop app ở đầu mỗi test, và trên dGen1 (ethOS, WebView 124) chỉ một lần force-stop là WebView ra màn đen, chỉ reboot mới hết (Gu Library đã thử lại từ máy vừa reboot, vẫn hỏng). dGen1 kiểm tay, mở app bằng `adb shell monkey -p com.judexp.app -c android.intent.category.LAUNCHER 1`.

## Bẫy đã biết

- **Nhắc có cửa sổ alarm 10 phút** (`setWindow`), nên không chờ được trong test. Bản debug có thêm `ReminderShowNowReceiver` (`android/app/src/debug/`, không bao giờ vào bản release, khoá bằng quyền `DUMP` nên chỉ adb gọi được) hiện ngay thông báo của một nhắc đang chờ bằng đúng code alarm chạy. Vì vậy chính bước AlarmManager báo giờ không được e2e kiểm.
- **Nút có `aria-pressed` thành `switch`** trên Android, và tên của nó là chữ hiển thị ("Xấu"), không phải `aria-label` ("Chấm xấu") → `verdictToggle` nhận cả hai.
- **Chữ hoa bằng CSS lọt vào cây trợ năng**: tiêu đề `jx-section-title` có `text-transform: uppercase` nên đọc ra "BIỂN GẦN GIỐNG, …" → tìm theo `heading` không phân biệt hoa thường.
- **Bàn phím che nửa dưới, và cái gì bị che thì rơi khỏi cây trợ năng** (nút chấm dưới ô biển số, biển gần giống thứ ba). `lookup()` và test chấm cất bàn phím bằng phím Back khi `dumpsys input_method` báo đang mở; bàn phím nuốt phím đó, app không nhận.
- **`uiautomator dump` không chạy được cạnh engine** (agent-device giữ kết nối UiAutomation). Cây của engine đã có cả khay thông báo, nên nút trên thông báo được tìm bằng locator và chọn theo vị trí ngay dưới tiêu đề "Chấm chuyến <biển>?" (`nearestToTitle`).
- **Bấm locator vào nút trên khay bị từ chối** ("covered by another visible element", khay vẽ đè lên cửa sổ app) → chạm theo toạ độ tâm nút (`tapAt`).
- **Đồng hồ UBS1 từng tụt về 2024** sau khi hết pin; ngày tháng lạ thì xem `adb shell date` trước.
- **Gboard UBS1 nuốt chữ "u"** khi gõ qua adb (Gu Library). Biển `00E…` không có chữ "u"; tra tên có "u" thì gõ cách khác.
- Không dùng `app.clearState()`, `installApp`, `--test-ime`.
