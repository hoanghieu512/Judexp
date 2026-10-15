# Nhớ Dai: Design Spec

> **Trạng thái:** đã duyệt qua brainstorming ngày 2026-10-16 (3/3 phần), chưa có plan triển khai, chưa có dòng code nào.
> **Tên app:** "Nhớ Dai" là tên tạm. Tên chốt phải có trước M0 vì nó quyết định `appId` và folder repo. Các phương án đã bàn: Nhớ Dai, Gặp Lại, Đã Gặp, Sổ Gặp.
> **Người dùng thật:** huynh và Gú. Prod có người dùng thật ngay từ đầu, mức cẩn thận bằng Gú's Library.

## 1. Mục tiêu

App là một **sổ ký ức trải nghiệm cá nhân** cho sinh hoạt thường ngày: tài xế từng chở, quán từng ăn, món từng gọi, địa điểm từng tới.

Giá trị cốt lõi **không** phải là ghi review cho đẹp, mà là **tra cứu tại hiện trường**: biển số vừa hiện trên app đặt xe, gõ vào là biết lần trước thế nào, trong vài giây, trước khi bấm đồng ý. Mọi quyết định thiết kế trong tài liệu này phục vụ đúng một câu đó.

Ba điều kiện sinh tử, theo thứ tự:

1. **Tra cứu phải nhanh và chịu được sai lệch.** Biển số OCR lệch một ký tự, tên quán hôm nay viết khác hôm qua: không khớp mờ thì sổ vô dụng.
2. **Nhập phải gần như không mất công.** Ghi một cuốc xe mất 40 giây thì tháng sau bỏ app. Mục tiêu dưới 10 giây cho một lần ghi.
3. **Dữ liệu của riêng từng người**, chứa trong nhà, không qua cloud của ai khác.

**Thành công trông như thế nào:** sau hai tháng dùng, mở app tra cứu trở thành phản xạ trước mỗi lần đặt xe hay gọi đồ, và ít nhất một lần app cứu được một cuốc xe hoặc một bữa ăn tệ mà huynh đã quên mất là từng gặp.

### Phi mục tiêu của v1

Ghi rõ để sau này không ai tưởng là bị bỏ quên:

- Chia sẻ dữ liệu chéo giữa huynh và Gú (đã chừa sẵn trường `visibility`, bật sau bằng cách thêm một folder Syncthing chung, không phải đổi schema).
- iOS (khả thi, nhưng cần spike riêng, xem §16-S4).
- Nối dữ liệu với Ăn Khéo.
- Thống kê, biểu đồ, bảng xếp hạng (tốn công mà không giúp quyết định tại hiện trường).
- Thang 5 sao (xem D8).
- Bong bóng nổi đè lên app đặt xe.

## 2. Quyết định đã chốt

| # | Quyết định | Lý do |
|---|---|---|
| D1 | Android trước, chừa đường iOS | Cả 6 máy trong cụm hiện tại đều là Android. iOS không bị loại, chỉ không nằm trong v1. |
| D2 | Syncthing vẫn là tầng vận chuyển | Nó đã cho sẵn: xuyên NAT qua relay (máy Gú khác mạng vẫn sync), tùy chọn sync qua 4G, và iOS khả thi qua Möbius Sync Pro mà huynh đã chạy thật với Obsidian. Nhận định ban đầu "iOS không dùng được Syncthing" là **sai**, đã bỏ. |
| D3 | Mỗi profile một folder Syncthing riêng, không share chéo | Folder là đơn vị chia sẻ của Syncthing, nên muốn hai người không thấy nhau thì phải khác folder. Mỗi event vẫn mang `author` và `visibility` để mở cổng chia sẻ sau. |
| D4 | v1 phủ cả đi lại, ăn uống và địa điểm | Lõi thực thể dùng chung nên thêm nhóm sau sẽ phải đập ra làm lại. Phân mốc bên trong plan, không cắt tính năng. |
| D5 | Parser chốt bằng phase test đối đầu | Hai bản cài sau một cổng chung, chọn bằng số đo thật trên ảnh thật, không chọn bằng cảm giác. Xem §10. |
| D6 | Hệ thiết kế trước khi code, bộ icon sinh sau | Màu và cỡ chữ là thứ code xong mới đổi thì phải sơn lại toàn bộ. Icon thì vẽ trước màn hình chưa tồn tại sẽ vẽ sai cỡ và vẽ thừa. |
| D7 | Hướng A: kho file chỉ-thêm, index dựng ở local | Hướng duy nhất mà mọi rủi ro còn lại đều đã được kiểm chứng trên máy thật ở Gú's Library. Xem §3. |
| D8 | Ba mức verdict thay cho 5 sao | Huynh không cần xếp hạng, huynh cần một màu đỏ hiện lên trước khi bấm. Ba mức thì một chạm là xong; năm sao thì lưỡng lự giữa 3 và 4 mỗi lần, mà lưỡng lự giết thói quen ghi chép. Chi tiết nằm ở tag. |
| D9 | Gộp thực thể phải hỏi, không bao giờ tự gộp | Gộp sai thì lịch sử hai quán lẫn vào nhau và gỡ ra rất mệt. |

### Hai hướng đã xét và loại

- **Server API trên Atomman (loại):** phải tự viết lại đúng những việc Syncthing đang làm miễn phí (xuyên NAT, retry, phát hiện trùng, xử lý conflict), phải có auth thật, và ba plugin native sẵn có thành vô dụng. Đổi một mớ hạ tầng đã chạy lấy một đống việc chưa ai thử, để mua về thứ hai người dùng không cần.
- **CouchDB + PouchDB (loại):** replication và conflict resolution có sẵn trong protocol, nhưng phải vận hành thêm một service lạ trên Windows 24/7 và vẫn phải lo đường ra cho máy Gú. Chỉ đáng nếu sau này có nhiều người dùng thật ngoài hai người.

## 3. Kiến trúc tổng thể

```
  Điện thoại huynh                    Atomman (Windows, 24/7)              Máy Gú
  ┌──────────────────┐                ┌───────────────────────┐          ┌─────────────┐
  │ App (Capacitor)  │                │ Syncthing (service)   │          │ App         │
  │  SAF ──► kho     │◄──Syncthing───►│ D:\Review\huynh\kho   │          │             │
  │  index SQLite    │   (relay,      │ D:\Review\gu\kho      │◄────────►│ kho của Gú  │
  │  (local, phái    │    4G, LAN)    │                       │ Syncthing│             │
  │   sinh, ko sync) │                │ Worker Python         │          │             │
  └──────────────────┘                │  (Scheduled Task 1')  │          └─────────────┘
                                      │  inbox ──► parsed     │
                                      │  parser port:         │
                                      │   local_ocr |         │
                                      │   openrouter_vision   │
                                      └───────────────────────┘
```

Nguyên tắc gốc, kế thừa nguyên văn từ Gú's Library:

- App local-first, **không backend**. "Môi trường" nghĩa là folder kho nào cộng cụm Syncthing nào, không phải một tầng app. Cùng một APK chạy cả QA lẫn Prod.
- **Index là dữ liệu phái sinh:** không sync, mỗi máy tự dựng lại từ file gốc. Hỏng thì xóa dựng lại. Hai máy không bao giờ conflict vì không chia sẻ index.
- App chỉ đọc và ghi folder kho, **không tự viết logic sync**.

## 4. Kho và môi trường

Tách môi trường ở **cấp cha**, tách profile thành **folder Syncthing riêng**:

```
D:\Review\huynh\kho\          folder-ID  review-huynh-qa
D:\Review\gu\kho\             folder-ID  review-gu-qa
D:\Review-Prod\huynh\kho\     folder-ID  review-huynh-prod
D:\Review-Prod\gu\kho\        folder-ID  review-gu-prod
```

Mỗi `kho\` có:

```
events\        chỉ thêm, 1 file = 1 việc đã xảy ra, không bao giờ sửa
inbox\         ảnh share từ điện thoại, chờ worker đọc
parsed\        worker trả kết quả bóc trường
_worker.log    log worker, đọc được từ điện thoại
```

`.stversions\` và archive ảnh gốc để **sibling ngoài cây sync** (ví dụ `D:\Review\huynh\_archive\`), đúng cách huynh đang làm, để cô lập và tránh copy nhầm.

Điện thoại huynh chỉ ghép folder của huynh, máy Gú chỉ ghép folder của Gú. **Không share chéo:** máy test không thấy kho Prod, máy Gú không thấy kho QA.

## 5. Schema event

Tên file: `<ISO8601 compact>_<device>_<uuid7>.json`, ví dụ `20261016T190322Z_zflip4_a3f9c21.json`. Sắp theo tên là sắp theo thời gian, và nhìn tên biết máy nào ghi. Tên chỉ để người đọc; **mọi logic sắp xếp dùng `createdAt` trong nội dung**, vì đồng hồ hai máy có thể lệch.

```jsonc
{
  "schemaVersion": 1,
  "eventId": "a3f9c21...",          // uuid, là khóa duy nhất của event
  "type": "encounter",              // encounter | attach | amend | merge | tombstone
  "author": "huynh",
  "device": "zflip4",
  "createdAt": "2026-10-16T19:03:22+07:00",
  "visibility": "private",          // private | shared  (cổng chừa cho chia sẻ sau)

  "entityRef": {                    // null nếu còn chờ parse
    "kind": "driver",               // driver | restaurant | dish | place
    "key": "59H123456",             // khóa đã chuẩn hóa, xem §6
    "label": "Nguyễn Văn A"         // nhãn thấy được lúc đó
  },

  "verdict": "bad",                 // good | ok | bad
  "tags": ["chạy ẩu", "nói nhiều"], // tùy chọn
  "note": "vượt đèn đỏ 2 lần",      // tùy chọn

  "context": {                      // tùy chọn, biết gì ghi nấy
    "app": "grab",
    "price": 42000,
    "route": "Q1 → Q7",
    "happenedAt": "2026-10-16T18:40:00+07:00",
    "geo": { "lat": 10.7769, "lng": 106.7009 }
  },

  "source": {
    "kind": "share",                // share | manual
    "imageRef": "a3f9c21.jpg",      // tên file trong inbox\, nếu có
    "parsedBy": "openrouter_vision",
    "confidence": 0.94
  }
}
```

### Năm loại event

| Loại | Việc nó ghi | Trường riêng |
|---|---|---|
| `encounter` | Một lần gặp: verdict, tag, note, thực thể (hoặc chưa biết thực thể) | như trên |
| `attach` | Gắn thực thể vào một encounter sau khi parse về muộn | `targetEventId`, `entityRef` |
| `amend` | Sửa nội dung một event cũ; index lấy bản mới nhất theo `createdAt` | `targetEventId`, các trường cần thay |
| `merge` | Gộp hai thực thể bị tách đôi | `fromKey`, `intoKey`, cả hai giữ lại |
| `tombstone` | Ẩn một event (kể cả ẩn một event `merge` để gỡ gộp) | `targetEventId` |

**App không bao giờ xóa file trong `events\`.** Đây là phòng đúng rủi ro "xóa nhầm lan truyền qua Syncthing" đã ghi ở doc Gú's Library. Dọn file cũ là việc tay trên Atomman, định kỳ, có chủ ý.

## 6. Định danh thực thể

Nguyên tắc: **khóa là thứ không đổi, nhãn là thứ thấy được.** Mọi nhãn từng gặp đều được giữ lại nên tra tên cũ vẫn ra.

### `driver`

Khóa là biển số chuẩn hóa: bỏ mọi ký tự không phải chữ hoặc số, in hoa. `59H1-234.56` và `59-H1 23456` đều thành `59H123456`.

Tên tài xế chỉ là nhãn: app đặt xe đổi tên hiển thị, và một biển số có thể nhiều người chạy (xe thuê, xe gia đình). App vẫn nhận ra **xe**, và hiện cả danh sách tên đã từng gặp để huynh tự đối chiếu.

### `restaurant`

Không có khóa sạch. Khóa là tên chuẩn hóa cộng toạ độ nếu có. Chuẩn hóa tên: NFD rồi bỏ dấu, lowercase, gộp khoảng trắng, bỏ các tiền tố chung chung `quán`, `tiệm`, `nhà hàng`, `cửa hàng` (chỉ bỏ ở đầu chuỗi, và chỉ các từ trong danh sách này, để không làm sai nghĩa tên riêng).

Hai thực thể cách nhau **dưới 150m** mà tên gần giống thì app **hỏi** "có phải quán này không". Không tự gộp (D9). Đồng ý thì ghi event `merge`.

### `dish`

Khóa là khóa quán cộng tên món chuẩn hóa. Món không tồn tại độc lập khỏi quán.

### `place`

Khóa là uuid app sinh (đây là thứ huynh ghi tay), kèm địa chỉ và toạ độ.

## 7. Index phái sinh

SQLite trong vùng dữ liệu riêng của app. **Không nằm trong kho, không sync.**

```sql
events(event_id PK, type, created_at, author, device, file_name, raw_json)
entities(entity_key PK, kind, primary_label, first_seen, last_seen,
         n_good, n_ok, n_bad, merged_into)
labels(entity_key, label, last_seen)
encounters(event_id PK, entity_key, verdict, tags_json, note,
           happened_at, image_ref, confidence)
plates(entity_key, key_norm, key_rev)   -- key_rev để tìm theo hậu tố nhanh
entity_fts                              -- FTS5 trên nhãn đã bỏ dấu
meta(key, value)                        -- con trỏ file đã đọc, schemaVersion
```

Dựng tăng dần: giữ con trỏ file đã đọc trong `meta`, mỗi lần mở app hoặc thấy Syncthing vừa về file mới thì chỉ đọc phần mới. Apply event theo `createdAt`, khóa theo `event_id`, nên **đọc lại cùng một file không bao giờ nhân đôi dữ liệu** (idempotent, có test riêng cho tính chất này).

Hỏng hay lệch thì xóa dựng lại từ đầu. Ở mức vài nghìn event một năm, dựng lại hết mất vài giây.

Bỏ qua mọi file có `.sync-conflict` trong tên và ghi log, không im lặng nuốt.

### Quy tắc màu của thực thể

Màu phải trả lời được câu "có nên dùng lại không", nên không lấy trung bình:

- **Đỏ** nếu lần gần nhất là `bad`, hoặc có từ 2 lần `bad` trong 5 lần gần nhất.
- **Xanh** nếu không có `bad` nào trong 5 lần gần nhất và lần gần nhất là `good`.
- **Vàng** cho mọi trường hợp còn lại.

Quy tắc này là hàm thuần, có test bảng ca.

## 8. Khớp mờ

**Biển số:** chuẩn hóa, rồi so khớp theo thứ tự ưu tiên: khớp đúng, khớp tiền tố, khớp hậu tố (dùng `key_rev`), rồi khoảng cách Levenshtein tối đa 1, cộng bảng lẫn ký tự thường gặp hai chiều: `0`↔`O`, `1`↔`I`↔`L`, `2`↔`Z`, `5`↔`S`, `8`↔`B`, `6`↔`G`. Bảng này cần cho **cả hai phía**: OCR lẫn, mà huynh gõ nhanh cũng lẫn.

*Tối ưu để sau, cần kiểm chứng trước khi hard-code:* nếu xác nhận được tập chữ cái thực sự dùng trong biển số Việt Nam thì loại bớt được ứng viên. Chưa kiểm chứng nên v1 không giả định.

**Tên:** bỏ dấu, lowercase, so theo trigram qua FTS5.

Toàn bộ khớp mờ chạy trên index ở máy, nên **mất mạng, Atomman tắt, đi tỉnh, vẫn tra được**.

## 9. Các luồng

### 9.1 Share ảnh (luồng nhập chính)

1. Huynh đang ở app đặt xe hoặc app đồ ăn, bấm **Chia sẻ**, chọn app này. `ShareTargetPlugin` nhận ảnh.
2. App ghi ảnh vào `inbox/<uuid>.jpg` rồi **mở ngay bảng chấm**: ba nút verdict khổ lớn, dưới là chip tag. Chạm một nút là event `encounter` đã nằm trong kho, kể cả khi app chưa biết đó là ai (`entityRef: null`).
3. Thoát giữa đường thì ảnh vẫn nằm `inbox/` và hiện trong hộp **Chờ chấm** có badge. Worker vẫn parse song song, nên lúc quay lại đã có sẵn tên và biển số.
4. Syncthing đẩy ảnh lên Atomman, worker parse, ghi `parsed/<uuid>.json`, Syncthing đẩy về. App thấy file thì ghi event `attach`.
5. Nếu huynh đã tự gõ biển số trước đó thì kết quả parse **không ghi đè**, chỉ lưu trong `source` để đối chiếu. Người thắng luôn là huynh.

Thiết kế có chủ ý: **chấm điểm và nhận dạng là hai việc rời nhau.** Parse chậm hay Atomman đang tắt cũng không cản được việc ghi.

### 9.2 Tra cứu

Màn mặc định khi mở app. Ô tìm duy nhất, bàn phím bật sẵn. Kết quả hiện thẳng trong dòng: màu, lần gần nhất cách đây bao lâu, số lần gặp, ba tag hay gặp nhất. Không phải mở chi tiết mới thấy điều cần thấy.

Chưa gõ gì thì hiện "Chờ chấm (N)" và "Gặp gần đây". Hai chip lọc "danh sách đen" và "danh sách ruột" nằm ngay đây, không làm màn riêng.

### 9.3 Chấm tay

Nút cộng, chọn loại, gõ biển số hoặc tên, ba nút verdict, chip tag, xong. Mục tiêu dưới 10 giây. Với `place` thì có thêm nút lấy toạ độ hiện tại.

### 9.4 Offline

Không cần viết hàng đợi: app ghi file xuống kho local, Syncthing tự đẩy khi có mạng. Đây là một trong những lý do chọn hướng A.

## 10. Worker trên Atomman

Python, chạy bằng Scheduled Task như Gú's Library, nhưng **nhịp 1 phút thay vì 3 phút**: cảm giác "share xong quay lại app đã thấy tên" khác hẳn cảm giác chờ. Một lần chạy quét `inbox\` của tất cả profile và cả hai môi trường, có lock file để hai nhịp không đè nhau.

Bên trong là **một cổng `parser` với hai bản cài**, chọn bằng config:

- `local_ocr`: OCR trên máy cộng heuristic bóc trường.
- `openrouter_vision`: gửi ảnh cho vision model, nhận về JSON đúng trường. API key nằm **trên Atomman**, không bao giờ nằm trong app, nên điện thoại không giữ secret nào.

`parsed/<uuid>.json` ghi: các trường bóc được, `confidence`, tên parser, thời gian, và **text thô khi dùng OCR** để sau này sửa heuristic mà không cần giữ ảnh.

Ảnh gốc sau khi parse thì **chuyển sang archive sibling ngoài cây sync**, không xóa thẳng: còn bằng chứng để đối chiếu khi parse sai, không chiếm chỗ điện thoại, và không rời mạng nhà.

### Phase test parser đối đầu (M2)

Đầu vào huynh chuẩn bị: **15 đến 20 screenshot thật**, phủ Grab bike, Grab car, Be, ShopeeFood, cố tình có vài ca khó (chụp lúc tối màu, ảnh crop thiếu, đơn nhiều món).

Đo trên cùng bộ ảnh, cho cả hai parser:

| Chỉ số | Ngưỡng đạt | Ghi chú |
|---|---|---|
| Biển số đúng **từng ký tự** | >= 90% | Sai một ký tự là tra sang người khác, không có vùng xám |
| Tên quán đúng sau chuẩn hóa | >= 85% | Cho phép sai dấu và hoa thường |
| Giá đúng con số | >= 90% | Bỏ qua định dạng |
| Thời gian mỗi ảnh | ghi số | |
| Chi phí mỗi ảnh | ghi số | |

**Quy tắc chốt:** `local_ocr` đạt ngưỡng biển số thì chọn **lai** (local trước, gọi vision khi hụt trường). Không đạt thì chọn **`openrouter_vision` thuần**. Kết quả đo ghi vào `docs/` kèm ngày và phiên bản parser.

Bộ ảnh này thành **bộ test hồi quy** của worker, nên công sức làm phase test không phải đồ bỏ.

### Đánh đổi riêng tư đã biết và đã chấp nhận có điều kiện

Screenshot đơn đồ ăn thường có **địa chỉ nhà và số điện thoại**. Dùng `openrouter_vision` nghĩa là mấy thứ đó rời khỏi mạng nhà, dù key nằm trên Atomman. Đây là lý do có phase test: nếu `local_ocr` đủ tốt thì mặc định không gì rời nhà, và vision chỉ là cứu cánh khi parse hụt.

## 11. Cấu trúc app

Capacitor + Ionic React + Vite + TypeScript, build hoàn toàn bằng CLI, không mở Android Studio. Toolchain và quy ước keystore theo đúng Gú's Library.

```
src/
  storage/   SAF đọc ghi kho          (lift SafPlugin)
  events/    schema, ghi và đọc event
  domain/    chuẩn hóa khóa, apply event → state, gộp và gỡ gộp, quy tắc màu
  search/    khớp mờ biển số và tên
  index/     SQLite phái sinh, dựng tăng dần, query
  intake/    share target, inbox, theo dõi parsed
  sync/      đọc trạng thái Syncthing, đèn ba mức
  profile/   chọn kho, PIN
  ui/        màn hình
```

Ranh giới bắt buộc: **`domain` và `search` không được biết gì về file, SQLite hay Capacitor.** Nhận dữ liệu thuần, trả dữ liệu thuần, nên phần logic dễ sai nhất test được trong một giây mà không cần cắm điện thoại. `index` chỉ phụ thuộc `domain`. `ui` không bao giờ gọi thẳng `storage`.

### Bốn màn hình

1. **Tra cứu** (mặc định, §9.2)
2. **Chấm nhanh** (sheet, mở từ share hoặc nút cộng, §9.1 và §9.3)
3. **Chi tiết thực thể**: dòng thời gian các lần gặp, mọi nhãn từng thấy, nút sửa và nút gộp
4. **Cài đặt**: chọn kho (profile và môi trường), đèn Syncthing, PIN, dựng lại index, xem `_worker.log`

## 12. Profile và riêng tư

"Login" trong kiến trúc không-backend này **không thể là auth thật**, vì không có server nào xác thực. Nó là **chọn profile**, và profile quyết định đọc folder kho nào. Tài liệu và UI gọi đúng tên là **profile**, không gọi là đăng nhập, để sau này không ai tưởng có bảo mật thật.

Bảo vệ thực tế gồm: khóa máy sẵn có của Android, cộng **PIN tùy chọn** trong app để chặn người cầm máy mở xem. Dữ liệu trong kho **không mã hóa**, ai cầm được máy và mở được khóa máy thì đọc được file. Đây là mức bảo vệ đã chấp nhận, ghi ra để không ai hiểu nhầm.

## 13. Hệ thiết kế

Bối cảnh dùng quyết định mọi thứ: đứng ngoài đường, **một tay**, có thể giữa trưa nắng gắt hoặc tối thui, và đang gấp vì tài xế đã nhận cuốc.

- **Tương phản cao, chữ to, vùng chạm lớn.** Không có chỗ cho chữ nhỏ thanh mảnh.
- **Dark mode mặc định**, sáng là tùy chọn.
- **Màu không được là tín hiệu duy nhất.** Ba mức verdict phải phân biệt được cả khi mù màu đỏ lục, nên mỗi mức có icon và hình dạng riêng.
- **Biển số render bằng font mono.** Font thường thì `0` với `O`, `1` với `l` nhìn như nhau, mà app này sống chết ở chỗ đọc đúng biển số.
- **Chuyển động tối giản**, vì chạy trong webview và máy test thuộc lớp yếu.

Đầu ra phase thiết kế (trước khi code UI): một file token (màu, cỡ chữ, bán kính, khoảng cách) cộng ba màn hình mẫu. Phần sinh ảnh bằng API để dành cho **icon app và bộ icon bốn loại** (xe, quán, món, địa điểm), làm sau khi luồng đã chạy, lúc đó mới biết cần đúng bao nhiêu icon và cỡ nào.

## 14. Các ca xấu

| Ca | Cách xử lý |
|---|---|
| Parse sai biển số | `confidence` >= 0.9 thì gắn luôn; dưới ngưỡng thì **bắt xác nhận một lần** trước khi lưu. Mỗi lần huynh sửa, cặp ảnh và giá trị đúng vào bộ test hồi quy. |
| Atomman tắt hoặc worker chết | App hiện badge "N ảnh chờ đọc" và dùng `SyncthingPlugin` nói rõ "chưa thấy Atomman", không im lặng để huynh tưởng app hỏng. |
| Hai máy ghi cùng lúc | Không thể conflict: một file một event, không ai sửa file của ai. |
| Đồng hồ hai máy lệch | Index sắp theo `createdAt` trong nội dung, không theo tên file. `amend` trỏ `eventId` nên không phụ thuộc thứ tự tới. |
| File `.sync-conflict-*` vẫn lọt | Index bỏ qua và ghi log. |
| Gộp thực thể sai | `tombstone` lên chính event `merge` đó. Không cần loại event mới. |
| Index hỏng | Xóa dựng lại từ kho. Có nút trong Cài đặt. |

## 15. Chiến lược test

- **Hàm thuần (`domain`, `search`), test dày bằng vitest:** chuẩn hóa khóa, khớp mờ, apply event vào state, idempotent khi đọc lại file, quy tắc màu, gộp và gỡ gộp. Đây là chỗ bug đau nhất mà lại khó phát hiện bằng mắt.
- **Worker, pytest:** bộ ảnh thật của huynh làm bộ hồi quy, so với giá trị đúng đã ghi.
- **Không mock được, bắt buộc máy thật:** SAF ghi vào kho, share sheet nhận ảnh từ app đặt xe, Syncthing đẩy qua lại giữa hai máy.

## 16. Rủi ro còn mở và spike cần làm

| # | Spike | Vì sao chưa chắc |
|---|---|---|
| S1 | SAF ghi được event vào folder con tự tạo trong kho, trên Android 14 và 15 | Gú's Library đã ghi được `_inbox/`, nhưng doc của nó ghi rõ phần ghi vào folder khác **chưa có spike**. Làm ở M0. |
| S2 | `ShareTargetPlugin` nhận được `image/*` share từ app đặt xe và app đồ ăn | Đã nhận file tài liệu, chưa xác nhận với ảnh từ các app đó. Làm ở M0. |
| S3 | Thư viện SQLite cho Capacitor | Gú's Library ghi rõ "chưa chốt thư viện". Nếu plugin SQLite gây rắc rối cho build CLI thì **phương án lùi**: giữ index trong bộ nhớ và cache ra một file JSON, vẫn đủ nhanh ở mức vài nghìn event. |
| S4 | iOS đọc folder Möbius Sync từ Capacitor | Möbius Pro sync được (đã chứng minh với Obsidian), nhưng app của mình đọc folder đó cần document picker và security-scoped bookmark, là việc native, chưa thử. Ngoài v1. |
| S5 | Nút hành động trên thông báo để chấm điểm không cần mở app | Tính năng M5, bỏ được nếu vướng. |

## 17. Mốc triển khai

| Mốc | Nội dung | Nghiệm thu |
|---|---|---|
| **M0** | Dựng khung repo, lift ba plugin native, chốt tên và `appId` | Ghi được một event vào kho thật và **máy kia thấy được**. S1 và S2 xong. |
| **M1** | `domain` + `search` + `index` + màn Tra cứu + chấm tay | Tra biển số gõ sai một ký tự vẫn ra. App dùng được thật dù chưa có ảnh. |
| **M2** | Phase test parser đối đầu | Có bảng số đo, chốt parser theo quy tắc §10. |
| **M3** | Worker + luồng share tới parse tới attach | Share một ảnh thật, dưới 2 phút sau app hiện đúng biển số. |
| **M4** | Áp hệ thiết kế, bộ icon | Ba màn hình mẫu khớp với app thật. |
| **M5** | Nhắc lại đúng lúc bằng thông báo | Tùy sức, bỏ được. |

M0 cố tình đứng đầu vì nó là **rủi ro cao nhất**, không phải vì nó dễ.

## 18. Tái dụng từ repo sẵn có

| Lấy gì | Từ đâu |
|---|---|
| `SafPlugin.java` đọc ghi folder qua Storage Access Framework | Gu-Library |
| `ShareTargetPlugin.java` nhận file share vào app | Gu-Library |
| `SyncthingPlugin.java` đọc trạng thái Syncthing qua REST, đèn ba mức | Gu-Library |
| Khuôn worker Python + Scheduled Task + lock + `_worker.log` | Gu-Library worker |
| Khuôn ops doc QA/Prod, hai dòng trạng thái App và Worker | Gu-Library `Docs/` |
| Toolchain build CLI (JDK 21, SDK 36), quy ước keystore | Gu-Library |
| GPS, chọn khu vực, lọc khoảng cách Haversine | Ăn Khéo |

Ước lượng: app mới bắt đầu từ khoảng 60% chứ không phải từ số không.

## 19. Phụ lục: bộ tag v1

Tag lưu trong event dưới dạng chuỗi. **Từ vựng nằm trong code app, không nằm trong kho**, nên thêm hay bỏ tag ở bản sau cũng không làm hỏng event cũ. Tag tự gõ vẫn lưu được.

**`driver`** tốt: chạy êm, đúng đường, xe sạch, đúng giờ, thân thiện. xấu: chạy ẩu, vượt đèn đỏ, đi lòng vòng, bắt chờ lâu, đòi thêm tiền, hay hủy cuốc, xe cũ bẩn, mùi thuốc lá, nói nhiều.

**`restaurant`** tốt: ngon, sạch sẽ, nhanh, đúng mô tả, giá hợp, phục vụ dễ thương. xấu: mặn, nhạt, nguội, ít topping, sai món, ship lâu, đắt, quán bẩn, dầu lại.

**`dish`** tốt: gọi lại, đáng tiền, ăn hoài không ngán. xấu: không gọi nữa, nhỏ hơn ảnh, ngọt quá, mặn quá.

**`place`** tốt: đáng đi lại, chỗ ngồi thoải mái, dễ đỗ xe, wifi tốt, yên tĩnh. xấu: ồn, khó đỗ xe, chật, nóng.
