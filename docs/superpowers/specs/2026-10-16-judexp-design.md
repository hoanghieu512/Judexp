# Judexp: Design Spec

> **Trạng thái:** đã duyệt qua brainstorming ngày 2026-10-16 (3/3 phần), chưa có plan triển khai, chưa có dòng code nào.
> **Tên app:** Judexp, chốt ngày 2026-10-16 (judge + experience). `appId` là `com.judexp.app`, theo lối `com.gulibrary.app` của Gú's Library.
> **Người dùng thật:** huynh và Gú. Prod có người dùng thật ngay từ đầu, mức cẩn thận bằng Gú's Library.

## 1. Mục tiêu

App là một **sổ ký ức trải nghiệm cá nhân** cho sinh hoạt thường ngày: tài xế từng chở, quán từng ăn, món từng gọi, địa điểm từng tới.

Giá trị cốt lõi **không** phải là ghi review cho đẹp, mà là **tra cứu tại hiện trường**: biển số vừa hiện trên app đặt xe, gõ vào là biết lần trước thế nào, trong vài giây, trước khi bấm đồng ý.

App vì vậy sống ở **hai thời điểm khác nhau**. Tài liệu này tách rạch ròi hai thời điểm đó, vì gộp lại thì mọi thiết kế phía sau đều lệch:

- **Thời điểm Hỏi:** lúc app đặt xe vừa ghép tài xế. Trên màn hình có tên, biển số, sao, loại xe, quãng đường, giá. Huynh cần một quyết định, và **chưa có gì để đánh giá** vì chuyến chưa xảy ra.
- **Thời điểm Ghi:** sau khi chuyến xong hoặc bữa ăn xong. Giờ mới có trải nghiệm thật để chấm, và đầu vào là **lịch sử chuyến** hoặc nhập tay.

Hai luồng nối với nhau ở §9.3: **mỗi lần tra cứu là một tín hiệu huynh sắp đi chuyến đó**, nên luồng Hỏi tự sinh đầu vào cho luồng Ghi mà không thêm bước nào cho huynh.

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
- Điểm dự đoán tự động trước chuyến (ý của Gú). Ngoài v1, nhưng **có một yêu cầu đặt lên v1**, xem §19.1.
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
| D10 | Tách hẳn luồng Hỏi và luồng Ghi, `verdict` thành tùy chọn | Thời điểm quyết định và thời điểm đánh giá là hai thời điểm khác nhau. Chuyến cũ nạp từ lịch sử thì huynh không còn nhớ, nên vào app dưới dạng đã gặp chưa chấm. Góp ý của huynh ngày 2026-10-16. |
| D11 | Nhắc chấm 90 phút sau mỗi lần tra cứu, bốn nút trên thông báo | Bắt nhãn lúc còn nóng mà không thêm bước nào cho huynh. Gom cuối ngày thì nhớ lơ mơ hơn; không nhắc thì hộp Chờ chấm sẽ đầy dần rồi bị bỏ qua. |
| D12 | Điện thoại chỉ giữ ảnh biển hiệu **thu nhỏ**, bản đầy đủ nằm trên Atomman | Ý của huynh ngày 2026-10-16 về dung lượng. Bản 320px lấy được 92% lợi ích dung lượng mà không mất khả năng nhận ra quán lúc đứng ngoài đường không mạng. Luồng xin ảnh gốc đẩy sang §19.2. |

### Hai hướng đã xét và loại

- **Server API trên Atomman (loại):** phải tự viết lại đúng những việc Syncthing đang làm miễn phí (xuyên NAT, retry, phát hiện trùng, xử lý conflict), phải có auth thật, và ba plugin native sẵn có thành vô dụng. Đổi một mớ hạ tầng đã chạy lấy một đống việc chưa ai thử, để mua về thứ hai người dùng không cần.
- **CouchDB + PouchDB (loại):** replication và conflict resolution có sẵn trong protocol, nhưng phải vận hành thêm một service lạ trên Windows 24/7 và vẫn phải lo đường ra cho máy Gú. Chỉ đáng nếu sau này có nhiều người dùng thật ngoài hai người.

## 3. Kiến trúc tổng thể

```
  Điện thoại huynh                    Atomman (Windows, 24/7)              Máy Gú
  ┌──────────────────┐                ┌───────────────────────┐          ┌─────────────┐
  │ App (Capacitor)  │                │ Syncthing (service)   │          │ App         │
  │  SAF ──► kho     │◄──Syncthing───►│ D:\Judexp\Hieu\kho    │          │             │
  │  index SQLite    │   (relay,      │ D:\Judexp\gu\kho      │◄────────►│ kho của Gú  │
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
D:\Judexp\Hieu\kho\           folder-ID  judexp-hieu-qa
D:\Judexp\gu\kho\             folder-ID  judexp-gu-qa
D:\Judexp-Prod\Hieu\kho\      folder-ID  judexp-hieu-prod
D:\Judexp-Prod\gu\kho\        folder-ID  judexp-gu-prod
```

Mỗi `kho\` có:

```
events\        chỉ thêm, 1 file = 1 việc đã xảy ra, không bao giờ sửa
inbox\         ảnh share từ điện thoại, chờ worker đọc
parsed\        worker trả kết quả bóc trường
attachments\   ảnh biển hiệu **thu nhỏ**, giữ lại và vẫn sync (§9.5)
_worker.log    log worker, đọc được từ điện thoại
```

`.stversions\` và archive ảnh gốc để **sibling ngoài cây sync** (ví dụ `D:\Judexp\huynh\_archive\`), đúng cách huynh đang làm, để cô lập và tránh copy nhầm.

Điện thoại huynh chỉ ghép folder của huynh, máy Gú chỉ ghép folder của Gú. **Không share chéo:** máy test không thấy kho Prod, máy Gú không thấy kho QA.

Hiện trạng QA, dựng ngày 2026-10-16: **dGen1** ghép `judexp-hieu-qa`, **UBS1** ghép `judexp-gu-qa`. Hai máy test khác lớp nhau (dGen1 màn vuông 480x480dp Android 15, UBS1 720x1600 Android 14), nên số đo bố cục của máy này không suy sang máy kia được.

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

  "verdict": "bad",                 // good | ok | bad | null  (null = đã gặp, chưa chấm)
  "tags": ["chạy ẩu", "nói nhiều"], // tùy chọn
  "note": "vượt đèn đỏ 2 lần",      // tùy chọn

  "context": {                      // tùy chọn, biết gì ghi nấy
    "app": "grab",
    "price": 42000,
    "route": "Q1 → Q7",
    "happenedAt": "2026-10-16T18:40:00+07:00",
    "geo": { "lat": 10.7769, "lng": 106.7009 },

    // Đặc trưng đọc được ở thời điểm Hỏi. Thu ngay từ v1 để §19.1 có dữ liệu hiệu chỉnh.
    "driverStars": 4.6,
    "vehicleType": "bike",
    "distanceKm": 7.2,
    "durationMin": 24
  },

  "source": {
    "kind": "share_history",        // share_booking | share_history | camera | manual | reminder
    "imageRef": "a3f9c21.jpg",      // tên file trong inbox\, nếu có
    "imageKind": "history_list",    // booking | history_list | order_detail | unknown
    "batchRef": "a3f9c21",          // nhiều encounter sinh từ cùng một ảnh thì chung batchRef
    "rowIndex": 2,                  // dòng thứ mấy trong ảnh lịch sử
    "parsedBy": "openrouter_vision",
    "confidence": 0.94
  }
}
```

### Năm loại event

| Loại | Việc nó ghi | Trường riêng |
|---|---|---|
| `encounter` | Một lần gặp: verdict, tag, note, thực thể (hoặc chưa biết thực thể). `verdict` có thể null, nghĩa là **đã gặp nhưng chưa chấm** | như trên |
| `attach` | Gắn thực thể vào một encounter sau khi parse về muộn | `targetEventId`, `entityRef` |
| `amend` | Sửa nội dung một event cũ; index lấy bản mới nhất theo `createdAt`. Cũng là cách **verdict tới sau** cho một lần gặp chưa chấm | `targetEventId`, các trường cần thay |
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

GPS trong hẻm hoặc trong nhà lệch được 50 tới 100m, nên toạ độ luôn lưu kèm `accuracy`, và **`accuracy` trên 100m thì không được dùng để gợi ý gộp**: lúc đó chỉ so tên.

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

- **Xám** nếu chưa có lần gặp nào được chấm: hiện "đã gặp N lần, chưa chấm lần nào". Sau khi nạp nền từ lịch sử (§9.4) thì đây là trạng thái **thường gặp nhất**, nên nó phải trông bình thường chứ không trông như lỗi.
- **Đỏ** nếu lần **được chấm** gần nhất là `bad`, hoặc có từ 2 lần `bad` trong 5 lần được chấm gần nhất.
- **Xanh** nếu không có `bad` nào trong 5 lần được chấm gần nhất và lần được chấm gần nhất là `good`.
- **Vàng** cho mọi trường hợp còn lại.

Lần gặp chưa chấm **không tham gia** tính màu nhưng **vẫn tính** vào số lần gặp, vì "đã đi xe này 3 lần" tự nó là một tín hiệu, dù yếu.

Quy tắc này là hàm thuần, có test bảng ca.

## 8. Khớp mờ

**Biển số:** chuẩn hóa, rồi so khớp theo thứ tự ưu tiên: khớp đúng, khớp tiền tố, khớp hậu tố (dùng `key_rev`), rồi khoảng cách Levenshtein tối đa 1, cộng bảng lẫn ký tự thường gặp hai chiều: `0`↔`O`, `1`↔`I`↔`L`, `2`↔`Z`, `5`↔`S`, `8`↔`B`, `6`↔`G`. Bảng này cần cho **cả hai phía**: OCR lẫn, mà huynh gõ nhanh cũng lẫn.

*Tối ưu để sau, cần kiểm chứng trước khi hard-code:* nếu xác nhận được tập chữ cái thực sự dùng trong biển số Việt Nam thì loại bớt được ứng viên. Chưa kiểm chứng nên v1 không giả định.

**Tên:** bỏ dấu, lowercase, so theo trigram qua FTS5.

Toàn bộ khớp mờ chạy trên index ở máy, nên **mất mạng, Atomman tắt, đi tỉnh, vẫn tra được**.

## 9. Hai luồng

Hai thời điểm ở §1 thành hai luồng có tên riêng: luồng **Hỏi** phục vụ quyết định, luồng **Ghi** phục vụ ký ức. §9.3 là chỗ nối chúng lại.

### 9.1 Luồng Hỏi: đi hay hủy

Xảy ra lúc app đặt xe vừa ghép tài xế, hoặc lúc huynh đang đứng trước một quán lạ.

Hai đường vào:

- **Gõ:** mở app, gõ biển số hoặc tên, bàn phím bật sẵn. Đường nhanh nhất, gõ bốn số là xong.
- **Share ảnh màn ghép tài xế:** khỏi gõ, và bóc luôn được các đặc trưng (sao, loại xe, quãng đường, giá) mà gõ tay không có. Đổi lại phải chờ một vòng worker.

Đầu ra là **thẻ quyết định**, và nó phải trung thực về chuyện nó biết gì:

| Tình huống | Thẻ hiện gì |
|---|---|
| Từng chấm người này | Màu, verdict từng lần, lần gần nhất cách đây bao lâu, ba tag hay gặp nhất. Bằng chứng mạnh. |
| Đã gặp nhưng chưa chấm | Xám, "đã đi xe này 3 lần, chưa chấm lần nào". Tín hiệu yếu, và nói rõ là yếu. |
| Chưa gặp bao giờ | Nói thẳng "chưa gặp người này". Đây là **trường hợp thường gặp nhất**, nhất là trong tháng đầu, nên nó phải là một câu trả lời đàng hoàng chứ không phải một màn hình rỗng. |

**Luồng Hỏi không sinh encounter.** Chuyến chưa xảy ra thì chưa có gì để ghi. Nó chỉ sinh một nhắc chờ ở §9.3.

### 9.2 Luồng Ghi: lịch sử trải nghiệm

Xảy ra sau khi chuyến xong hoặc bữa ăn xong. Bốn đường vào, xếp theo mức tiện:

1. **Trả lời nhắc** (§9.3): chạm một nút trên thông báo. Nhanh nhất, và là đường đệ muốn huynh dùng nhiều nhất.
2. **Chụp lịch sử chuyến hoặc lịch sử đơn:** một ảnh sinh **nhiều** encounter. App hiện danh sách dòng bóc được, mỗi dòng ba nút verdict. Chấm dòng nào thì dòng đó có verdict; bỏ qua thì dòng đó vào kho dưới dạng **đã gặp, chưa chấm**.
3. **Chụp tại chỗ bằng camera trong app** (§9.5): dành cho quán ăn ngoài đường, không đặt qua app nào.
4. **Nhập tay:** nút cộng, chọn loại, gõ biển số hoặc tên, ba nút verdict, chip tag. Mục tiêu dưới 10 giây.

Nguyên tắc xuyên suốt: **chấm điểm và nhận dạng là hai việc rời nhau.** Parse chậm hay Atomman đang tắt cũng không cản được việc ghi, và ghi xong rồi mới biết là ai cũng không sao.

### 9.3 Nhắc chấm, chỗ hai luồng nối vào nhau

**Mỗi lần tra cứu là một tín hiệu huynh sắp đi chuyến đó.** App không cần huynh làm thêm gì: nó đã biết lúc 18h40 huynh tra `59H123456`.

- Mỗi lần tra cứu sinh một **nhắc chờ**, hẹn **90 phút** sau.
- Thông báo hiện ba nút **tốt, ổn, xấu**: Android chỉ vẽ ba nút đầu của một thông báo (đã thử trên UBS1 và dGen1 ngày 2026-10-18). Chạm một nút là xong, **không mở app**: câu trả lời vào hàng chờ trong vùng dữ liệu riêng của app, và thành event `encounter` (`source.kind: reminder`) trong kho ở lần mở app kế tiếp.
- **Không đi** nằm trong hộp Chờ chấm. Vuốt bỏ hay kệ thông báo cũng chỉ ẩn nó, nhắc vẫn chờ trong hộp. Chọn không đi thì **không ghi gì vào kho**, chỉ tắt nhắc. Chuyến không xảy ra thì không có ký ức nào để lưu.
- Nhắc chờ quá **48 giờ** không trả lời thì tự bỏ, vì sau đó huynh cũng không còn nhớ để chấm cho đúng.
- Nhắc chờ lưu trong `pending.json` ở vùng dữ liệu riêng của app: **không nằm trong kho, không sync**, vì máy nào tra thì máy đó nhắc. Cố ý để ngoài index SQLite, vì dựng lại index sẽ xóa mất nhắc đang chờ.

Hộp **Chờ chấm** trong màn Tra cứu là đường lùi cho mọi nhắc bị bỏ qua và mọi dòng chưa chấm.

### 9.4 Nạp nền lần đầu

App chỉ có giá trị khi đã có dữ liệu, mà ngày đầu thì không có gì. Cách giải không phải là chờ ba tháng.

Lần đầu mở app, nó hướng huynh mở **lịch sử chuyến** trong app đặt xe và chụp vài ảnh cuộn. Mỗi ảnh ra hàng chục dòng, nên vài phút là app có vài chục tài xế và vài chục quán **đã từng gặp**. Hầu hết ở trạng thái chưa chấm, và như vậy là đúng: không ai nhớ nổi chuyến ba tháng trước ra sao. Chuyến nào nhớ rõ là tệ thì chấm luôn lúc đó.

Nhờ bước này, ngay tuần đầu thẻ quyết định đã nói được "huynh đã đi xe này 3 lần" thay vì "chưa gặp người này".

### 9.5 Chụp tại chỗ: quán ăn ngoài đường

Quán vỉa hè không có đơn, không có lịch sử, nên hai đường share ở trên không với tới. Đường duy nhất còn lại là gõ tay lúc vừa ăn xong, đúng cái ma sát giết thói quen ghi chép.

Camera trong app giải chỗ đó, và **giá trị chính nằm ở toạ độ chứ không ở chữ trên biển hiệu**: lúc huynh đứng tại quán, toạ độ chính là nửa khóa định danh theo §6, và nó không sai kiểu OCR sai.

- Chụp, **nén ngay trên máy thành hai bản**: bản đầy đủ cạnh dài 1600px JPEG chất lượng 80 (khoảng 200 tới 400KB thay vì 3 tới 10MB) ghi vào `inbox/`, và bản **thu nhỏ** cạnh dài 320px chất lượng 70 (khoảng 25KB) ghi vào `attachments/`. Không nén thì Syncthing đẩy nặng và điện thoại đầy dần.
- Lưu kèm toạ độ và **`accuracy`** của phép định vị.
- Chấm ngay tại chỗ, không chờ parse.
- Worker đọc biển hiệu chỉ để **gợi ý nhãn**. Sai thì huynh sửa một chữ, vì khóa thật là toạ độ. Đây là khác biệt rủi ro so với biển số: biển số sai là tra nhầm sang người khác, tên quán sai chỉ là phiền nhẹ.
- **Ảnh nhòe không phải ca lỗi.** Toạ độ vẫn đúng và ảnh vẫn giúp huynh nhận ra quán. App có nút chụp lại nhưng **không bắt** chụp lại, chỉ nói "không đọc được tên, huynh gõ giúp" rồi đi tiếp.
- **Điện thoại chỉ giữ bản thu nhỏ.** Bản đầy đủ đi theo đường của ảnh đơn hàng, ra archive trên Atomman sau khi worker xử lý (§10). Bản 320px thừa sức nhận ra quán trên thẻ kết quả, nơi ảnh chỉ hiện rộng chừng 120px, mà 200 quán tốn khoảng 5MB thay vì 60MB. Muốn xem bản đầy đủ để đọc chữ trên biển thì đó là ca hiếm, xem §19.2.

### 9.6 Offline

Không cần viết hàng đợi: app ghi file xuống kho local, Syncthing tự đẩy khi có mạng. Đây là một trong những lý do chọn hướng A.

## 10. Worker trên Atomman

Python, chạy bằng Scheduled Task như Gú's Library, nhưng **nhịp 1 phút thay vì 3 phút**: cảm giác "share xong quay lại app đã thấy tên" khác hẳn cảm giác chờ. Một lần chạy quét `inbox\` của tất cả profile và cả hai môi trường, có lock file để hai nhịp không đè nhau.

Bên trong là **một cổng `parser` với hai bản cài**, chọn bằng config:

- `local_ocr`: OCR trên máy cộng heuristic bóc trường.
- `openrouter_vision`: gửi ảnh cho vision model, nhận về JSON đúng trường. API key nằm **trên Atomman**, không bao giờ nằm trong app, nên điện thoại không giữ secret nào.

**Hợp đồng của cổng `parser`:** nhận một ảnh, trả về `imageKind` (`booking`, `history_list`, `order_detail`, `signboard`, `unknown`) và một **mảng** bản ghi, vì một ảnh lịch sử chứa nhiều dòng. Ảnh đơn lẻ trả mảng một phần tử. Nhận sai `imageKind` là xử lý sai luồng, nên nó là một chỉ số đo riêng ở phase test.

`parsed/<uuid>.json` ghi: các trường bóc được, `confidence`, tên parser, thời gian, và **text thô khi dùng OCR** để sau này sửa heuristic mà không cần giữ ảnh.

**Chính sách ảnh theo loại, không phải một chính sách cho tất cả:**

| Loại ảnh | Sau khi parse | Vì sao |
|---|---|---|
| `booking`, `history_list`, `order_detail` | Chuyển sang archive sibling **ngoài cây sync**, không xóa thẳng | Chứa địa chỉ nhà và số điện thoại. Vẫn còn bằng chứng để đối chiếu khi parse sai, mà không chiếm chỗ điện thoại. |
| `signboard` (chụp tại chỗ, §9.5) | Bản đầy đủ ra archive **ngoài cây sync**; bản **thu nhỏ 320px** do app sinh thì ở lại `attachments/` và vẫn sync | Điện thoại cần nhận ra quán lúc đang ngoài đường không mạng, nhưng không cần ảnh nét. Ảnh biển hiệu không chứa gì nhạy cảm, nên đây thuần là chuyện dung lượng chứ không phải chuyện riêng tư. |

Khác biệt này cho phép đặt **chính sách parser theo loại ảnh**: ảnh đơn hàng xử lý tại nhà, còn ảnh biển hiệu gửi vision model thoải mái vì không có gì để lộ.

**Dung lượng trên điện thoại sau một năm, để biết rõ đang tối ưu cái gì:**

| Thứ | Cỡ một cái | Một năm |
|---|---|---|
| Event JSON | ~1KB | ~2MB |
| Index SQLite | | vài MB |
| Ảnh màn hình trong `inbox/` | ~300KB | gần bằng 0, vì chỉ sống 1 tới 3 phút |
| Ảnh biển hiệu thu nhỏ | ~25KB | ~5MB cho 200 quán |

Tổng chừng 15 tới 30MB. Bỏ hẳn ảnh thu nhỏ chỉ tiết kiệm thêm khoảng 5MB, không đáng đổi lấy việc mất khả năng nhận ra quán khi Atomman tắt.

**Ảnh gốc trên Atomman cũng cần chính sách dọn**, nếu không thì vài năm nữa không ai còn biết đống đó là gì: ảnh đơn hàng và ảnh lịch sử giữ **12 tháng** rồi xóa, ảnh biển hiệu giữ **vô thời hạn** vì nó là thứ duy nhất còn lại của một quán (200 quán cũng chỉ 60MB trên ổ D). Mỗi lần dọn ghi vào `_worker.log`.

### Phase test parser đối đầu (M2)

Đầu vào huynh chuẩn bị: **25 tới 30 ảnh thật**, chia ba nhóm vì ba nhóm khó theo cách khác nhau:

- **Nhóm Hỏi (6 tới 8 ảnh):** màn hình vừa ghép tài xế của Grab bike, Grab car, Be. Cần bóc biển số, sao, loại xe, quãng đường, giá.
- **Nhóm Ghi dạng màn hình (14 tới 17 ảnh):** danh sách lịch sử chuyến và lịch sử đơn của Grab, Be, ShopeeFood, cộng vài ảnh chi tiết một đơn. Cần bóc **đúng số dòng** và đúng trường từng dòng.
- **Nhóm biển hiệu (5 tới 6 ảnh):** ảnh chụp thật biển hiệu quán, có cả ảnh nghiêng, chói nắng và chụp ban đêm. Đây là nhóm đệ dự đoán sẽ tách hai parser rõ nhất.

Cố tình nhét vài ca khó: chụp lúc tối màu, ảnh crop thiếu nửa dòng, đơn nhiều món, danh sách dài phải cuộn.

Đo trên cùng bộ ảnh, cho cả hai parser:

| Chỉ số | Ngưỡng đạt | Ghi chú |
|---|---|---|
| Nhận đúng `imageKind` | 100% | Nhận sai loại là xử lý sai luồng |
| Biển số đúng **từng ký tự** | >= 90% | Sai một ký tự là tra sang người khác, không có vùng xám |
| Số dòng bóc đúng trong ảnh lịch sử | 100% | Thiếu dòng thì mất chuyến mà không ai biết, thừa dòng thì rác vào kho |
| Tên quán trên **biển hiệu** | không đặt ngưỡng | Chỉ là gợi ý nhãn, khóa thật là toạ độ. Vẫn đo để thấy chênh lệch giữa hai parser |
| Tên quán đúng sau chuẩn hóa | >= 85% | Cho phép sai dấu và hoa thường |
| Giá đúng con số | >= 90% | Bỏ qua định dạng |
| Thời gian mỗi ảnh | ghi số | |
| Chi phí mỗi ảnh | ghi số | |

**Quy tắc chốt:** `local_ocr` đạt ngưỡng biển số thì chọn **lai** (local trước, gọi vision khi hụt trường). Không đạt thì chọn **`openrouter_vision` thuần**. Nhóm biển hiệu được phép chốt **khác** nhóm màn hình, vì nó không chứa gì nhạy cảm nên không có lý do giữ nó ở nhà bằng mọi giá. Kết quả đo ghi vào `docs/` kèm ngày và phiên bản parser.

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
  intake/    share target, camera, nén ảnh, inbox, theo dõi parsed
  sync/      đọc trạng thái Syncthing, đèn ba mức
  profile/   chọn kho, PIN
  ui/        màn hình
```

Ranh giới bắt buộc: **`domain` và `search` không được biết gì về file, SQLite hay Capacitor.** Nhận dữ liệu thuần, trả dữ liệu thuần, nên phần logic dễ sai nhất test được trong một giây mà không cần cắm điện thoại. `index` chỉ phụ thuộc `domain`. `ui` không bao giờ gọi thẳng `storage`.

### Bốn màn hình

1. **Tra cứu** (mặc định, §9.1), gồm hộp Chờ chấm và hai chip lọc danh sách đen, danh sách ruột
2. **Chấm nhanh** (sheet, mở từ nhắc, từ share, từ camera hoặc từ nút cộng, §9.2)
3. **Chi tiết thực thể**: dòng thời gian các lần gặp, mọi nhãn từng thấy, ảnh biển hiệu nếu có, nút sửa và nút gộp
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
| Atomman tắt nhiều ngày | Ảnh trong `inbox/` nằm lại trên máy tới khi Atomman nhận được, vì Syncthing là đồng bộ hai chiều chứ không phải đẩy rồi quên. Ở mức 300KB một ảnh thì chấp nhận được, và badge "N ảnh chờ đọc" cho huynh biết đang tồn bao nhiêu. |
| Tra cứu nhưng không đi | Nút "không đi" trên thông báo: không ghi gì vào kho, chỉ tắt nhắc. |
| Nhắc bị bỏ qua | Quá 48 giờ thì tự bỏ. Hộp Chờ chấm vẫn giữ ảnh và dòng chưa chấm. |
| Ảnh lịch sử bóc thiếu dòng | Ngưỡng số dòng là 100% ở §10, và app hiện số dòng bóc được để huynh đối chiếu bằng mắt với ảnh. |
| Ảnh chụp nhòe, không đọc được tên quán | Không chặn. Toạ độ vẫn đúng, ảnh vẫn giữ, app chỉ xin huynh gõ tên. |
| Ảnh chụp quá nặng | Nén trên máy trước khi ghi vào kho (§9.5). |
| Index hỏng | Xóa dựng lại từ kho. Có nút trong Cài đặt. |

## 15. Chiến lược test

- **Hàm thuần (`domain`, `search`), test dày bằng vitest:** chuẩn hóa khóa, khớp mờ, apply event vào state, idempotent khi đọc lại file, quy tắc màu, gộp và gỡ gộp. Đây là chỗ bug đau nhất mà lại khó phát hiện bằng mắt. Ba tính chất thêm từ bản sửa 2026-10-16: lần gặp **chưa chấm** không tham gia tính màu nhưng vẫn tính số lần gặp; một ảnh sinh N encounter cùng `batchRef` mà chấm một dòng không đụng dòng khác; lịch hẹn nhắc (tra lúc t thì nhắc lúc t cộng 90 phút, quá t cộng 48 giờ thì bỏ).
- **Worker, pytest:** bộ ảnh thật của huynh làm bộ hồi quy, so với giá trị đúng đã ghi.
- **Không mock được, bắt buộc máy thật:** SAF ghi vào kho, share sheet nhận ảnh từ app đặt xe, Syncthing đẩy qua lại giữa hai máy.

## 16. Rủi ro còn mở và spike cần làm

| # | Spike | Vì sao chưa chắc |
|---|---|---|
| S1 | SAF ghi được event vào folder con tự tạo trong kho, trên Android 14 và 15 | Gú's Library đã ghi được `_inbox/`, nhưng doc của nó ghi rõ phần ghi vào folder khác **chưa có spike**. Làm ở M0. |
| S2 | `ShareTargetPlugin` nhận được `image/*` share từ app đặt xe và app đồ ăn | **Đã đóng ở M0 (2026-10-16, UBS1).** Ba đường gửi đều nhận được URI và đọc ra đúng PNG qua `Saf.readFileBase64`: share từ Google Photos khi app đang mở, khi app đang tắt, và nút Chia sẻ trên khung xem trước ảnh chụp màn hình của hệ thống. Đường cuối chính là đường "chụp màn Grab rồi chia sẻ", chỉ khác nội dung ảnh. Chưa thử với ảnh chụp trên chính màn Grab hay ShopeeFood vì máy test không cài hai app đó. |
| S3 | Thư viện SQLite cho Capacitor | Gú's Library ghi rõ "chưa chốt thư viện". Nếu plugin SQLite gây rắc rối cho build CLI thì **phương án lùi**: giữ index trong bộ nhớ và cache ra một file JSON, vẫn đủ nhanh ở mức vài nghìn event. |
| S4 | iOS đọc folder Möbius Sync từ Capacitor | Möbius Pro sync được (đã chứng minh với Obsidian), nhưng app của mình đọc folder đó cần document picker và security-scoped bookmark, là việc native, chưa thử. Ngoài v1. |
| S5 | Nút hành động trên thông báo để chấm không cần mở app | **Đã đóng ở M4 (2026-10-18, UBS1 và dGen1).** Plugin chuẩn mở app khi bấm nút, nên Judexp tự viết phần native: nút là broadcast tới một receiver chỉ ghi câu trả lời vào hàng chờ, không mở activity nào. Hai giới hạn thật: Android chỉ vẽ ba nút đầu (Không đi chuyển vào hộp Chờ chấm), và alarm không chính xác dùng cửa sổ 10 phút (`setWindow`), vì `setAndAllowWhileIdle` cho trễ tới một giờ. |

## 17. Mốc triển khai

| Mốc | Nội dung | Nghiệm thu |
|---|---|---|
| **M0** | Dựng khung repo, lift ba plugin native, đặt `appId` `com.judexp.app` | Ghi được một event vào kho thật và **máy kia thấy được**. S1 và S2 xong. |
| **M0.5** | Hệ thiết kế: file token cộng ba màn hình mẫu (§13) | Có token trước khi code UI, đúng D6, khỏi sơn lại sau. |
| **M1** | `domain` + `search` + `index` + luồng Hỏi đường gõ + nhập tay | Tra biển số gõ sai một ký tự vẫn ra. Thẻ quyết định hiện đúng cả ba tình huống §9.1. App dùng được thật dù chưa có ảnh. |
| **M2** | Phase test parser đối đầu, ba nhóm ảnh | Có bảng số đo, chốt parser theo quy tắc §10. |
| **M3** | Worker, share ảnh lịch sử (một ảnh nhiều dòng), nạp nền §9.4, share ảnh màn ghép tài xế, **camera chụp tại chỗ §9.5** | Chụp một ảnh lịch sử ra đúng số dòng, chấm được từng dòng. Chụp một quán ngoài đường, lưu được kèm toạ độ, và sau khi worker xử lý thì trên máy chỉ còn bản thu nhỏ. |
| **M4** | Nhắc chấm 90 phút, ba nút trên thông báo cùng hộp Chờ chấm (§9.3) | Tra một biển số, 90 phút sau (trễ tối đa 10 phút) nhận thông báo, chạm một nút là xong không mở app, và lần mở app kế tiếp event vào kho. |
| **M5** | Bộ icon app và icon bốn loại | Khớp với hệ thiết kế M0.5. |

M0 cố tình đứng đầu vì nó là **rủi ro cao nhất**, không phải vì nó dễ. M4 không phải tính năng phụ: không có nó thì nhãn verdict không tích lũy, và §19.1 vĩnh viễn không có dữ liệu để hiệu chỉnh.

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

## 19. Tính năng tương lai đã bàn

### 19.1 Điểm dự đoán trước chuyến (ý của Gú, 2026-10-16)

Ý: tự chấm điểm một chuyến dựa trên **sao tài xế, loại phương tiện, quãng đường**, cho ra một khoảng điểm để quyết định hủy tìm tài xế khác hay không. Giá trị lớn nhất của nó nằm ở đúng trường hợp thường gặp nhất: **chưa từng gặp người này**, lúc đó lịch sử cá nhân không giúp được gì.

**Vì sao không làm ở v1:** một công thức chấm điểm chỉ có nghĩa khi hiệu chỉnh được bằng kết quả thật. Đặt ra bây giờ "sao dưới 4.7 thì trừ 2 điểm" là con số bịa. Khi đã có vài trăm chuyến vừa có đặc trưng lúc đặt vừa có verdict sau chuyến, app mới nói được câu có thật: *"sao dưới 4.7 thì tỉ lệ chuyến xấu của huynh là 35%, trên 4.8 là 8%"*. Lúc đó khoảng điểm là số của riêng huynh, không phải số của người viết app.

**Yêu cầu nó đặt lên v1, và đây mới là phần quan trọng:** v1 phải **thu đủ đặc trưng lúc đặt** (`driverStars`, `vehicleType`, `distanceKm`, `durationMin`, `price`, giờ đi) ngay trong `context` của encounter, cộng verdict sau chuyến. Không thu từ bây giờ thì tính năng này sinh ra với dữ liệu bằng không và phải chờ thêm vài trăm chuyến nữa. Dữ liệu huấn luyện sinh ra như **sản phẩm phụ** của §9.1 cộng §9.3, không cần huynh làm gì thêm.

**Hai ràng buộc chốt trước để sau này không trượt:**

- **Không hiện điểm số dạng 7.3 trên 10.** Chỉ ba mức: nên đi, cân nhắc, nên hủy. Số thập phân giả vờ chính xác trong khi nó không chính xác.
- **Chỉ khuyên hủy khi có bằng chứng cá nhân**, tức chính người này huynh từng chấm xấu. Tín hiệu chung như sao thấp chỉ để tham khảo, vì hủy chuyến có phí thật và tụt điểm tài khoản thật. App không được khuyên huynh mất tiền dựa trên một tương quan yếu.

### 19.2 Những cái khác đã nhắc tới

**Xin ảnh gốc từ Atomman.** App không có kênh hỏi Atomman vì nó không gọi API nào. Muốn xem bản đầy đủ của một ảnh thì phải dựng một luồng hỏi đáp giả lập qua file: app ghi `requests/<uuid>.json` vào kho, worker thấy thì chép ảnh từ archive ngược vào `attachments/`, Syncthing đẩy về, app hiện, rồi worker dọn sau vài ngày. Mất một tới ba phút và chỉ chạy khi Atomman đang bật. Để ngoài v1 vì bản thu nhỏ đã phủ gần hết nhu cầu nhận diện; nó chỉ cần khi muốn đọc chữ trên biển hoặc đối chiếu một ca parse sai. **Không phải đổi gì ở v1 để sau này làm được**, vì ảnh gốc vẫn luôn nằm trên Atomman theo đúng `imageRef`.

Ngoài ra: chia sẻ cảnh báo chéo với Gú (đã chừa `visibility`), iOS (S4), nối dữ liệu với Ăn Khéo, và thống kê dạng "tháng này huynh đi 23 chuyến, 3 chuyến tệ".

## 20. Phụ lục: bộ tag v1

Tag lưu trong event dưới dạng chuỗi. **Từ vựng nằm trong code app, không nằm trong kho**, nên thêm hay bỏ tag ở bản sau cũng không làm hỏng event cũ. Tag tự gõ vẫn lưu được.

**`driver`** tốt: chạy êm, đúng đường, xe sạch, đúng giờ, thân thiện. xấu: chạy ẩu, vượt đèn đỏ, đi lòng vòng, bắt chờ lâu, đòi thêm tiền, hay hủy cuốc, xe cũ bẩn, mùi thuốc lá, nói nhiều.

**`restaurant`** tốt: ngon, sạch sẽ, nhanh, đúng mô tả, giá hợp, phục vụ dễ thương. xấu: mặn, nhạt, nguội, ít topping, sai món, ship lâu, đắt, quán bẩn, dầu lại.

**`dish`** tốt: gọi lại, đáng tiền, ăn hoài không ngán. xấu: không gọi nữa, nhỏ hơn ảnh, ngọt quá, mặn quá.

**`place`** tốt: đáng đi lại, chỗ ngồi thoải mái, dễ đỗ xe, wifi tốt, yên tĩnh. xấu: ồn, khó đỗ xe, chật, nóng.
