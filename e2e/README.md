# Bộ test khói e2e: Judexp

3 test chạy trên **máy Android thật** (UBS1, kho QA), lái app bằng [tester-army/e2e](https://github.com/tester-army/e2e) + agent-device, theo khuôn `e2e/` của Gu Library. Gõ, bấm và **mọi phép kiểm** đi bằng nhãn trợ năng chính xác. Không test nào gọi model: **0 token, $0 mỗi lượt**. Cấu hình vẫn khai một agent (Haiku 5.5 qua OpenRouter) như Gu Library, để dành cho bước mơ hồ sau này, nên preflight vẫn đòi key.

| File | Test |
|---|---|
| `tests/lookup.e2e.ts` | Thẻ quyết định nói đúng: biển đã chấm, biển gặp nhưng chưa chấm, biển chưa gặp; gõ đủ một biển lệch 1 ký tự thì trả lời "Chưa gặp người này" và để biển đã biết riêng dưới tiêu đề "Biển gần giống" |
| `tests/rate.e2e.ts` | Chấm nhanh "Xấu" ghi đúng 1 file event mới vào kho, event mang `verdict: "bad"`, `source.kind: "manual"`; thẻ thành xấu và thêm 1 lần gặp |
| `tests/reminder.e2e.ts` | Tra xong thì app lưu nhắc **và hẹn alarm**; app ở nền, alarm đó nổ, bấm "Tốt" trên thông báo **không đưa app lên**; câu trả lời nằm trong hàng chờ, đúng lần tra và đúng kho; lần mở app sau thì thành đúng 1 event `verdict: "good"`, `source.kind: "reminder"`, hàng chờ hết câu đó |

## Chạy trên kho QA thật

Huynh chốt ngày 2026-10-18: môi trường QA là môi trường test, e2e chạy thẳng trên đó, không tách app hay kho riêng. Kho là chỉ-thêm và sync sang Atomman, nên mọi thứ test ghi là **vĩnh viễn**. Vì vậy:

- Test chỉ dùng **dải biển `00E…`** (`lib/plates.ts`): mã tỉnh 00 không có thật, nên không đụng biển thật và nhìn là biết dữ liệu test. `00E000001` (chưa chấm) và `00E000002` (đã chấm) là 2 event mẫu trong `fixtures/events/`, preflight nạp vào kho một lần (đã có thì thôi). `src/e2eFixtures.test.ts` phía app kiểm app đọc được đúng chúng.
- **Mỗi lượt xanh để lại đúng 2 event:** một lần "Xấu" cho `00E000002` (chấm nhanh) và một lần "Tốt" cho `00E000003` (qua thông báo). Biển chưa gặp lấy ngẫu nhiên `00E9xxxxx` mỗi lượt và không ghi gì.
- **Mỗi lần tra xong sinh một nhắc.** Sau mỗi test, qua hay trượt, `afterEach` đóng khay, mở lại app và bấm "Không đi" cho mọi nhắc `00E`, nên không nhắc nào reo trên máy 90 phút sau, và không nhắc nào nằm lại trong `pending.json` để lần khởi động lại máy hay lần cài APK sau hẹn lại. "Không đi" không ghi gì vào kho. Bấm Ctrl-C giữa lượt thì `afterEach` không chạy: chạy lại một lượt là dọn.
- Lịch sử các biển `00E` dày dần qua từng lượt, nên phép kiểm không dựa vào trạng thái ban đầu: màu do một lần chấm quyết định, số lần gặp tăng đúng 1, đúng 1 file event **mới** (so theo tên file đã có trước, không theo thứ tự tên) mang đúng verdict.
- **Đừng chấm tay `00E000001`, đừng tra rồi chấm `00E000009`.** Kho chỉ-thêm nên không gỡ được, và test tra cứu sẽ hỏng mãi. `00E000001` còn nằm trong mục chưa chấm của hộp Chờ chấm trên UBS1, dễ chạm nhầm. Preflight phát hiện hai chuyện này và chỉ hằng cần đổi.

## Cài lần đầu

```bash
npm --prefix e2e install
```

- Key OpenRouter **chỉ để ở biến môi trường**: `export OPENROUTER_API_KEY=…` trong `~/.bash_profile` (key dùng chung với Gu Library). e2e không đọc `.env`.
- Cắm UBS1, mở khoá, cho phép gỡ lỗi USB. Lần chạy đầu agent-device cài APK phụ `com.callstack.agentdevice.snapshothelper`; Play Protect trên UBS1 sẽ hỏi, người phải bấm cho phép (UBS1 đã có sẵn từ Gu Library).
- App cần kiểm phải là **APK debug** cài sẵn trên máy: test đọc Preferences, `pending.json` và hàng chờ câu trả lời bằng `run-as`, và gọi receiver chỉ có ở bản debug (xem Bẫy). Kho QA đã chọn trong app, folder Syncthing trong Cài đặt có đuôi `-qa`, thông báo đã bật, không đặt PIN.

## Chạy

```bash
npm run e2e
```

Từ thư mục gốc. `preflight` chạy trước và dừng ngay kèm cách sửa khi: thiếu key, không chạy được adb, không thấy máy, máy không phải máy QA, máy là dGen1, chưa cài app, không đọc được kho (chưa chọn kho, hoặc APK không phải bản debug), **không chắc là kho QA** (folder Syncthing trong Cài đặt phải có đuôi `-qa`; chưa đặt cũng từ chối, vì đường dẫn trên máy không nói kho thuộc môi trường nào), app đặt PIN, chưa bật thông báo, `00E000001` đã bị chấm hay `00E000009` đã có event. Qua hết thì nạp event mẫu và in `✓ app vX trên UBS1 · kho … (judexp-gu-qa) · …`.

- Một file: `npm --prefix e2e test -- tests/rate.e2e.ts`.
- Unit của các hàm đọc adb, Preferences, câu trả lời, vị trí nút thông báo, preflight: `npm --prefix e2e run unit` (không cần máy). Kiểm kiểu: `npm --prefix e2e run typecheck`.
- Gỡ lỗi: thêm `--video on --debug`; từ thư mục gốc phải qua hai `--`: `npm run e2e -- -- --video on`.

Số đo (UBS1, 18/10/2026): 3 test, khoảng **1 phút 57 giây** (mỗi test mở lại app một lần trong `afterEach`), 0 token model.

## Test có canh lỗi thật không

Mỗi test phải đỏ khi app hỏng đúng thứ nó canh. Ngày 18/10 đã dựng các APK cố ý hỏng rồi chạy:

| APK hỏng | Kết quả |
|---|---|
| Thẻ quyết định không tách biển gần giống | Tra cứu: đỏ |
| Chấm nhanh ghi "Ổn" thay cho verdict đã chọn | Chấm nhanh: **lần đầu vẫn xanh** (test rỗng, xem dưới); sau khi sửa: đỏ, "expected ok to be bad" |
| App không settle câu trả lời từ thông báo | Nhắc: đỏ, không có event mới |
| `schedule()` không hẹn alarm | Nhắc: đỏ, "app không hẹn alarm nào cho nhắc …" |
| `schedule()` làm rơi `khoUri` (câu trả lời không bao giờ settle) | Nhắc: đỏ, `khoUri` của câu trả lời rỗng |
| Nút trên thông báo mở app | Nhắc: đỏ, app lên foreground |

Test chấm nhanh lần đầu chỉ kiểm màu: `00E000002` đã có 3 lần "Xấu" từ các lượt trước, mà luật màu là có từ 2 lần xấu trong 5 lần chấm gần nhất thì đỏ, nên ghi nhầm "Ổn" thì biển vẫn đỏ. Nay test đọc file event mới và đòi `verdict: "bad"`. Ba dòng cuối thêm sau review độc lập: bản đầu của test nhắc dựng thông báo từ `pending.json` nên không thấy được `schedule()` hỏng, và bấm nút lúc app đang mở.

Thêm test mới thì làm lại bước này: hỏng đúng thứ test canh, test phải đỏ. Lượt chạy APK hỏng có thể để lại rác trong máy (ví dụ một câu trả lời `khoUri` rỗng mà app không bao giờ settle); xem `run-as com.judexp.app ls files/reminder-answers` và dọn trước khi chạy bản thật.

## Đọc kết quả

- Tổng: `e2e/.e2e/report.json`.
- Test trượt: `e2e/.e2e/artifacts/android/<test>/…/failure/screen.txt` (cây giao diện lúc trượt) cùng ảnh chụp.

Phân loại trượt như Gu Library: **hạ tầng** (không thấy máy, khởi động chậm) thì chạy lại một lần; **locator hay phép kiểm** thì coi là hồi quy cho tới khi chứng minh ngược lại.

## Quy ước nhãn trong app

Test bấm và đọc theo `aria-label` nói việc cộng đối tượng:

- dòng kết quả: `Mở 00E000002, xấu, 3 lần gặp, hôm nay, chạy ẩu` (biển hoặc tên; màu bằng chữ: tốt, tạm, xấu, chưa chấm; số lần gặp; lần gặp cuối khi đã chấm; các tag hiện trên dòng);
- hộp Chờ chấm: `Chấm tốt cho <nhãn>`, `Không đi <nhãn>`;
- Chấm nhanh: nút chấm `Chấm tốt` / `Chấm ổn` / `Chấm xấu` có `aria-pressed` (xem Bẫy), chip loại và chip tag có `aria-pressed`;
- tiêu đề mục gần giống là `heading` "Biển gần giống, có thể là xe khác".

## Máy hỗ trợ

- **Chỉ UBS1.**
- **dGen1 là máy QA nhưng engine không chạy được trên đó**, preflight từ chối: engine force-stop app ở đầu mỗi test, và trên dGen1 (ethOS, WebView 124) chỉ một lần force-stop là WebView ra màn đen, chỉ reboot mới hết (Gu Library đã thử lại từ máy vừa reboot, vẫn hỏng). dGen1 kiểm tay, mở app bằng `adb shell monkey -p com.judexp.app -c android.intent.category.LAUNCHER 1`.

## Bẫy đã biết

- **Nhắc có cửa sổ alarm 10 phút** (`setWindow`), nên không chờ được trong test. Bản debug có thêm `ReminderShowNowReceiver` (`android/app/src/debug/`, không bao giờ vào bản release) tìm đúng PendingIntent mà `schedule()` đã đặt (theo mã thông báo), hủy alarm đó và bắn nó ngay, nên thông báo hiện với chính dữ liệu `schedule()` đưa xuống, và test đỏ khi `schedule()` không đặt gì. Chính việc AlarmManager tự báo giờ thì e2e không kiểm.
- **Receiver đó nằm trên mọi APK debug**, kể cả máy Prod, vì hiện chưa có bản release ký. Nó khoá bằng quyền `DUMP`: chỉ adb shell hoặc app hệ thống đặc quyền gửi được, app thường không bao giờ có. Việc tệ nhất nó làm được là cho một nhắc reo sớm, với người đã cắm adb vào máy.
- **Mỗi lượt e2e tắt mọi alarm và xoá mọi thông báo của app trên UBS1**: `app.open()` của engine force-stop app ở đầu mỗi test. Nhắc thật đang chờ của huynh trên UBS1 sẽ mất alarm tới lần mở app kế tiếp. Đang thử tay một lần chờ đủ 90 phút thì đừng chạy e2e.
- **Nút có `aria-pressed` thành `switch`** trên Android, và tên của nó là chữ hiển thị ("Xấu"), không phải `aria-label` ("Chấm xấu") → `verdictToggle` nhận cả hai.
- **Chữ hoa bằng CSS lọt vào cây trợ năng**: tiêu đề `jx-section-title` có `text-transform: uppercase` nên đọc ra "BIỂN GẦN GIỐNG, …" → tìm theo `heading` không phân biệt hoa thường.
- **Bàn phím che nửa dưới, và cái gì bị che thì rơi khỏi cây trợ năng** (nút chấm dưới ô biển số, biển gần giống thứ ba). `lookup()` và test chấm cất bàn phím bằng phím Back khi `dumpsys input_method` báo đang mở; bàn phím nuốt phím đó, app không nhận.
- **`uiautomator dump` không chạy được cạnh engine** (agent-device giữ kết nối UiAutomation). Cây của engine đã có cả khay thông báo, nên nút trên thông báo được tìm bằng locator và chọn theo vị trí ngay dưới tiêu đề "Chấm chuyến <biển>?" (`nearestToTitle`). Nhỡ chọn nhầm nút của nhắc khác thì phép kiểm hàng chờ (đúng lần tra, đúng kho) bắt được.
- **Chạm vào khay phải đi bằng `adb input tap`**: locator tap bị từ chối ("covered by another visible element", khay vẽ đè cửa sổ app), còn `tapAt` của engine từ chối khi app đang ở nền ("tap escaped the app").
- **Câu trả lời app không settle được nằm lại hàng chờ mãi** (câu của kho khác, hay `khoUri` hỏng): `answerFor` khớp cả `reminderId` lẫn `lookedUpAt` của đúng lần tra.
- **Đồng hồ UBS1 từng tụt về 2024** sau khi hết pin; ngày tháng lạ thì xem `adb shell date` trước. Phép kiểm event đã không phụ thuộc thứ tự tên file nữa.
- **Gboard UBS1 nuốt chữ "u"** khi gõ qua adb (Gu Library). Biển `00E…` không có chữ "u"; tra tên có "u" thì gõ cách khác.
- **Artifact lúc trượt có thể chứa secret**: `screen.txt` và ảnh chụp ghi lại màn đang mở, mà màn Cài đặt hiện API key Syncthing của máy dạng chữ thường (gặp ngày 19/10). `.e2e/` đã gitignore; đừng gửi thư mục đó cho ai.
- **Một lần chập chờn chưa rõ gốc** (19/10, bản 0.2.0): test chấm nhanh trượt vì ngay sau khi gõ biển ở Tra cứu, app lại đứng ở Cài đặt, đã cuộn xuống giữa trang. Chạy lại hai lần riêng test đó và một lượt cả bộ đều xanh. App không giữ lịch sử điều hướng, nên phím Back lọt tới app chỉ đưa app về nền chứ không sang Cài đặt; nghi cú chạm theo ref của engine trúng nhầm nút "Cài đặt" (Gu Library từng gặp lỗi cùng họ), chưa chứng minh. Gặp lại thì chạy với `--video on` để thấy cú chạm.
- Không dùng `app.clearState()`, `installApp`, `--test-ime`.
