# Judexp: Theme Watercolor Sài Gòn và bộ nhận diện

> **Trạng thái:** chốt qua mười vòng moodboard từ 2026-10-23 tới 2026-10-27 với huynh và Gú. Chưa có plan, chưa có dòng code nào.
> **Quan hệ với spec gốc:** tài liệu này sửa §13 (hệ thiết kế) và mốc M5 của [spec gốc](2026-10-16-judexp-design.md). Phần nào ở đây không nhắc thì spec gốc vẫn đúng.
> **Moodboard:** https://claude.ai/artifact/JBhcNugQbDveTpNYYBvASw, có mọi vòng và lựa chọn đã lưu. Ảnh nguồn đã chốt nằm trong [`docs/design/watercolor/`](../../design/watercolor/).

## 1. Mục tiêu

Hai việc:

1. Thay hệ thiết kế M0.5 (nền tối, xám, font Inter) bằng **theme Watercolor Sài Gòn** làm theme chính. Giữ mọi nguyên tắc của §13 trừ đúng một điều: "dark mode mặc định".
2. Làm xong **M5**: icon màn hình chính, icon thông báo, màn mở app, màn chờ mở kho, bộ 4 icon loại, hình minh họa màn trống.

**Thành công trông như thế nào:** mở app thấy chất Sài Gòn xưa, mà tra cứu vẫn nhanh như v0.2.0: không thêm bước, không thêm giây chờ, và dấu Tốt, Ổn, Xấu vẫn là thứ nổi nhất màn hình.

### Phi mục tiêu của đợt này

- **Không đổi bố cục, điều hướng hay luồng.** Chỉ đổi màu, chữ, khung, và thêm hình minh họa, icon loại. Những vấn đề bố cục thấy khi chạy thử v0.2.0 ghi ở phụ lục A để làm sau.
- **Mục Theme trong Cài đặt, mục chọn icon app riêng, cặp xe riêng cho từng theme:** đã duyệt hướng nhưng làm sau, xem §9.
- **Chuyển động ngoài màn chờ mở kho.** Chạy trong webview trên máy yếu, nên §13 vẫn giữ "chuyển động tối giản".

## 2. Quyết định đã chốt

| # | Quyết định | Lý do |
|---|---|---|
| W1 | Theme chính là **Watercolor Sài Gòn**: giấy kem, vệt loang màu nước, nét mực nâu | Gú chọn ở vòng 2, giữa Ký họa Sài Gòn, Watercolor và Noir cổ điển. Noir được khen nhưng "hơi trầm, chưa sảng khoái sau trải nghiệm"; Gú muốn mềm và tươi hơn. |
| W2 | **Ngày làm chính, đêm tự bật theo chế độ tối của máy.** Không có nút bật tay | Thay gạch "dark mode mặc định" của §13. Watercolor là nền sáng; theo máy thì ban đêm ngoài đường vẫn tối, không chói, và huynh không phải nhớ bật. |
| W3 | **Màu chỉ dành cho verdict.** Tranh màu nước chỉ ở hình minh họa, không đặt sau dấu verdict | Giữ lý do gốc của §13: màu đỏ phải là thứ hiện lên trước. Dấu verdict là màu phẳng có hình riêng, tranh là vệt loang; hai thứ khác chất nên không lẫn. |
| W4 | **Dấu verdict có hình riêng:** Tốt hình tròn, Ổn hình vuông bo góc, Xấu tam giác, Chưa chấm vòng nét đứt. Ký tự bên trong giữ như cũ | §13 đã đòi "mỗi mức có icon và hình dạng riêng"; v0.2.0 mới có bốn hình tròn khác ký tự. |
| W5 | **Font:** Fraunces cho tiêu đề và tên quán, Nunito cho chữ thân, Mali cho lời doodle, JetBrains Mono cho biển số | Cả bốn có bộ ký tự tiếng Việt (đã kiểm metadata Google Fonts; vòng 1 từng dùng hai font thiếu dấu). Fraunces mềm như bảng hiệu cũ, Nunito tròn dễ đọc, JetBrains Mono có số 0 chấm giữa nên giữ được yêu cầu biển số mono của §13. Thay Inter và Roboto Mono. |
| W6 | **Logo** là chiếc xích lô góc nghiêng (bản D1) có chữ Judexp sơn trên bạt hông mui; bên dưới là chữ Judexp Fraunces màu cam đất kèm một vệt đường chấm | Ý của Gú: "logo là cái xe, có thêm tên app, không lồng ghép gì nữa", như xích lô chở đi đó đây. Chữ trên mui lấy bố cục mẫu D, kiểu chữ mẫu A. Huynh chốt ngày 2026-10-25. |
| W7 | **Icon màn hình chính** là chiếc xe D1, có chữ trên mui, không vẽ thêm chữ Fraunces trong icon | Android tự in tên app dưới icon bằng font của máy; vẽ thêm thì tên lặp hai lần và xe nhỏ đi. Huynh chốt ngày 2026-10-27. |
| W8 | **Màn mở app** của hệ thống hiện icon D1. **Màn chờ mở kho** hiện logo đầy đủ, sao vàng quanh xe bật lần lượt: từ trong suốt, lóe trắng, rồi vàng, sau đó nháy nhẹ | Hiệu ứng chạy trong khoảng app vốn phải chờ mở kho, không thêm giây nào. Đây là bản 1 trong hai bản đã thử; bản 2 (xe lăn vào) để dành, xem §9. |
| W9 | **Bộ 4 icon loại là K1:** taxi cổ xanh vàng cùng xe Cub đỏ, xe đẩy bán đồ ăn mái sọc, tô phở, ghim địa điểm có nhà phố | Gú giữ K1 gốc vì màu hài hòa hơn bản đổi màu. Icon xe là một cặp ô tô và xe máy vì mục xe gồm cả hai. |
| W10 | **Màn tìm không thấy có hình doodle** (sổ mở, dấu hỏi, thuyền giấy) với chữ Mali, bản ngày và bản đêm riêng | "Chưa gặp" là câu trả lời thường gặp nhất (§9.1), nên nó phải có mặt mũi chứ không phải một màn trống. |
| W11 | **Tranh là ảnh raster** (WebP trong app, PNG theo mật độ cho Android). **Hình bóng một màu** (icon thông báo, lớp icon theo hình nền của Android 13) vẽ riêng thành vector | Màu nước không vector hóa được mà còn giữ chất; hình bóng thì phải là một màu sạch. |
| W12 | **Làm sau:** mục Theme trong Cài đặt với Noir luxury, Sổ đen, Modern art; mục chọn icon app riêng, đổi icon kèm cảnh báo app sẽ đóng lại; mỗi theme có cặp xe riêng | Huynh duyệt hướng ngày 2026-10-23 và dặn ghi lại. Không nằm trong đợt này. |

## 3. Màu

Tên token theo `src/ui/theme/tokens.css`. Bản ngày nằm ở `:root`; bản đêm ghi đè trong `@media (prefers-color-scheme: dark)`. Đây là đảo ngược so với v0.2.0, nơi `:root` là tối và bản sáng nằm dưới `[data-theme='light']`.

| Token | Ngày | Đêm | Dùng cho |
|---|---|---|---|
| `--jx-bg` | `#f6eddd` | `#1a1714` | Nền app, có thêm vệt loang |
| `--jx-surface` | `#fffaf1` | `#24201c` | Dòng kết quả, thẻ, ô tìm |
| `--jx-surface-raised` | `#efe3cd` | `#2e2924` | Thẻ Chờ chấm, chip |
| `--jx-border` | `#e0cfb3` | `#3d362f` | Viền thẻ, bóng phẳng dưới thẻ |
| `--jx-text` | `#2b2118` | `#f6eee2` | Chữ chính |
| `--jx-text-dim` | `#6c5f4e` | `#bcb09e` | Chữ phụ |
| `--jx-text-on-accent` | `#fffaf1` | `#1a1714` | Chữ trên nền accent |
| `--jx-good` | `#13754d` | `#35c97a` | Tốt |
| `--jx-ok` | `#896305` | `#eab308` | Ổn |
| `--jx-bad` | `#bc2e37` | `#f2545b` | Xấu |
| `--jx-unrated` | `#5c6b7c` | `#7c8c9d` | Chưa chấm |
| `--jx-accent` (mới) | `#3977a5` | `#8ec3e6` | Nút điều hướng đang chọn |
| `--jx-title` (mới) | `#6b3f24` | `#f3b994` | Tiêu đề mục |
| `--jx-ink` (mới) | `#3b2a1e` | `#d9cdb8` | Viền ô tìm, chip đang chọn, vệt đường dưới logo |
| `--jx-brand` (mới) | `#b5532a` | `#f3b994` | Chữ Judexp dưới logo |

Các token `*-soft` (nền của dấu verdict) giữ cách cũ: bản ngày là màu verdict ở độ đục 13% (riêng Ổn dùng vàng `#e0a800` ở 18%), bản đêm ở 15% như v0.2.0.

**Vệt loang** là radial-gradient trên nền app, không phải ảnh: ngày dùng đào `#fbd9bd`, xanh trời `#cde4f2`, bạc hà `#d7ecd9`; đêm dùng `#5a3a2a55`, `#2f4f6655`, `#2f4d3a44`. Vệt loang chỉ nằm ở nền app, không đặt sau thẻ hay chữ.

**Độ tương phản đã đo** theo công thức WCAG. Bản đầu từ moodboard có năm cặp dưới 4,5:1 (Tốt, Ổn, Xấu trên thẻ ở bản ngày, chữ trên nút xanh trời, Chưa chấm ở bản đêm); các màu trong bảng trên là bản đã chỉnh:

| Cặp | Ngày | Đêm |
|---|---|---|
| Chữ chính trên nền / trên thẻ | 13,6 / 15,2 | 15,5 / 14,1 |
| Chữ phụ trên nền / trên thẻ | 5,3 / 6,0 | 8,4 / 7,6 |
| Tốt, Ổn, Xấu trên thẻ | 5,5 / 5,3 / 5,6 | 7,5 / 8,4 / 4,8 |
| Tốt, Ổn, Xấu trên nền dấu của chính nó (dấu là hình, chuẩn 3:1) | 4,6 / 4,6 / 4,6 | 5,7 / 6,2 / 4,0 |
| Chưa chấm trên thẻ | 5,3 | 4,7 |
| Chữ trên nút đang chọn | 4,6 | 9,4 |
| Tiêu đề mục trên nền | 7,7 | 10,4 |
| Chữ Judexp dưới logo trên nền | 4,3 (chữ lớn, chuẩn 3:1) | 10,4 |

## 4. Chữ

| Vai trò | Font | Độ đậm | Cỡ |
|---|---|---|---|
| Tiêu đề mục (`.jx-section-title`) | Fraunces, trục SOFT 100 | 650 | 1.4rem, bỏ viết hoa |
| Tên quán, món, địa điểm (`.jx-name`) | Fraunces, trục SOFT 100 | 600 | 1.15rem |
| Chữ thân, nút, chip | Nunito | 400, 600; nút điều hướng 800 | Theo thang cỡ hiện có |
| Lời doodle: màn trống, màn chờ | Mali | 400 | 1.2rem |
| Biển số (`.jx-plate`, ô nhập biển số) | JetBrains Mono | 700 | Như hiện có |
| Chữ Judexp dưới logo | Fraunces, trục SOFT 100 | 650 | Khoảng 20% chiều rộng logo |

- Đóng gói qua `@fontsource` như Inter hiện nay, chỉ lấy subset latin và vietnamese. Không tải font từ mạng, vì app phải chạy được khi mất mạng (§9.6 spec gốc).
- Fraunces cần bản variable để có trục SOFT. Nếu gói không có trục này thì dùng Fraunces thường, khác biệt nhỏ (R6).
- Bỏ Inter và Roboto Mono khỏi gói.
- Thang cỡ chữ, khoảng cách, vùng chạm trong `tokens.css` giữ nguyên.

## 5. Khung và thành phần

Bố cục giữ nguyên; chỉ đổi cách vẽ.

| Thành phần | Thay đổi |
|---|---|
| Nền app | Giấy kem cộng ba vệt loang (ngày); giấy tối cộng ba vệt dịu (đêm) |
| Điều hướng | Nút bo tròn hẳn, chữ Nunito 800. Đang chọn: nền `--jx-accent`, chữ `--jx-text-on-accent` |
| Ô tìm | Viền `--jx-ink` 2px, bo 18px, chữ Nunito 600; ô nhập biển số vẫn mono |
| Dòng kết quả, thẻ | Bo 18px, viền `--jx-border`, bóng phẳng `0 3px 0` cùng màu viền |
| Thẻ Chờ chấm | Viền nét đứt |
| Chip tag | Nền xanh trời nhạt; đang chọn: nền `--jx-ink`, chữ kem |
| Dấu verdict | Hình theo W4 |
| Icon loại | Mới: icon 22dp đặt giữa dấu verdict và tên trong dòng kết quả, Gặp gần đây, Chờ chấm; icon 28dp trên chip chọn loại ở Chấm nhanh; icon 32dp ở đầu màn Chi tiết |
| Màn tìm không thấy | Hình doodle rộng 210px phía trên câu trả lời; câu trả lời đổi sang chữ Mali, căn giữa |
| Màn chờ mở kho | Logo đầy đủ, lớp sao, chữ "Đang mở kho..." bằng Mali (§6.4) |
| Màn chưa chọn kho, đầu trang Cài đặt | Logo đầy đủ cỡ nhỏ, không có sao |

**Ràng buộc với test e2e:** giữ nguyên mọi tên trợ năng và `data-testid` hiện có ("Tra cứu", "Chấm nhanh", "Lưu", "Chấm tốt", `entity-*`, `no-match`...). Icon loại là trang trí, gắn `aria-hidden`; loại đã có trong tên của dòng.

**Cơ chế ngày, đêm:** chỉ dựa vào chế độ tối của máy. Giữ chỗ cho thuộc tính `data-theme` trên thẻ gốc để mục Theme sau này (§9) gắn vào, nhưng đợt này không có giao diện chọn.

## 6. Bộ nhận diện trên Android

### 6.1 Icon màn hình chính

- **Adaptive icon:** lớp nền là màu kem `#f7eedb`; lớp trước là xe D1 dạng PNG theo mật độ (khung 108dp: 108, 162, 216, 324, 432 px), xe nằm trọn trong vùng an toàn 66dp ở giữa.
- **Lớp một màu** cho icon theo hình nền (Android 13 trở lên): hình bóng xe D1, vector một màu.
- **Icon cũ** cho Android 7 và 7.1 (minSdk 24): `ic_launcher.png` và `ic_launcher_round.png` 48dp (48 tới 192 px) dựng từ cùng hình.
- Tên app giữ "Judexp" (`strings.xml`).

### 6.2 Icon thông báo

Hình bóng trắng 24dp (24 tới 96 px), dựng từ hình bóng xe D1 rút gọn. Thay `R.drawable.ic_launcher_foreground` đang dùng trong `ReminderAlarmReceiver`. Nếu ở 24dp trên máy thật không ra dáng xe thì dùng chữ J một màu (R2).

### 6.3 Màn mở app của hệ thống

Theme khởi động đã dùng `Theme.SplashScreen` của androidx core-splashscreen. Đặt `windowSplashScreenBackground` là kem `#f6eddd` (ngày) và `#1a1714` (đêm, trong `values-night`); `windowSplashScreenAnimatedIcon` là icon D1, đứng yên. Bỏ các drawable `splash.png` mặc định của Capacitor. Không đặt chữ ở ô thương hiệu dưới đáy, vì tên đã nằm trên mui và Android đã in tên ở màn hình chính.

### 6.4 Màn chờ mở kho

Thay đoạn `if (!ready)` trong `AppShell.tsx`, hiện chỉ in "Đang mở kho...":

- **Logo đầy đủ** căn giữa, rộng khoảng 84% màn hình: ảnh xe D1 đã tách nền; chữ Judexp là chữ thật bằng Fraunces màu `--jx-brand`; vệt đường chấm là SVG màu `--jx-ink`. Chữ và vệt đường dựng thật (không phải ảnh) để tự đổi màu theo ngày, đêm.
- **Lớp sao:** năm ngôi sao bốn cánh dạng SVG, đặt quanh xe. Mỗi sao trong 900 ms: từ trong suốt phóng lên 1,45 lần với màu trắng và quầng sáng, rồi thu về màu vàng `#f5c542` viền `#a8611c`. Các sao bật cách nhau 150 ms, sau đó nháy nhẹ theo chu kỳ 2,6 s.
- **Chữ** "Đang mở kho..." bằng Mali, dưới logo.
- **Không giữ màn này lâu hơn thời gian mở kho.** Kho mở xong là vào Tra cứu ngay, kể cả khi hiệu ứng chưa chạy hết.
- **`prefers-reduced-motion`:** sao hiện sẵn màu vàng, không chuyển động.
- **Bản đêm:** một quầng sáng kem dịu sau xe, vì phần giấy kem nằm lọt trong bánh và mui của ảnh không tách được; chữ Judexp màu đào.

## 7. Tài sản

Ảnh nguồn đã chốt nằm trong [`docs/design/watercolor/`](../../design/watercolor/), kèm `README.md` ghi nguồn gốc và `prompts.json` để vẽ lại cùng nét.

| File | Dùng để làm |
|---|---|
| `logo-cyclo-d1.webp`, `logo-cyclo-d1-cutout.webp` | Icon màn hình chính, logo ở màn chờ, Cài đặt, màn chưa chọn kho; nguồn để vẽ hình bóng |
| `logo-lockup-day.webp`, `logo-lockup-night.webp` | Mẫu bố cục logo đầy đủ; trong app dựng lại bằng ảnh xe cộng chữ thật |
| `icon-launcher-d1.webp` | Nguồn cho lớp trước adaptive icon và icon cũ |
| `kinds-k1.webp` | Cắt thành 4 icon loại, tách nền |
| `empty-state-day.webp`, `empty-state-night.webp` | Hình màn tìm không thấy |

Việc dựng tài sản cuối, plan sẽ chia bước:

1. Cắt K1 thành bốn icon, tách nền, xuất WebP cho app ở 2x và 3x của các cỡ 22, 28, 32dp.
2. Vẽ hình bóng xe D1 thành vector (tách đường viền từ ảnh đã tách nền rồi chỉnh tay), dùng cho lớp một màu và icon thông báo.
3. Xuất lớp trước adaptive icon và icon cũ theo mật độ từ `icon-launcher-d1.webp`.
4. So chữ trên mui với chữ Fraunces thật ở 512px trước khi xuất icon cuối; lệch rõ thì sơn lại phần chữ (R4).
5. Nén hình doodle và ảnh xe sang WebP ở cỡ hiển thị, không đưa bản 1024 vào APK.

## 8. Kiểm thử và nghiệm thu

- `npm test` và `npm run build` xanh. Thêm test cho màn chờ mở kho: có logo và chữ "Đang mở kho...", sao hiện tĩnh khi bật giảm chuyển động.
- JUnit phần Java xanh (icon thông báo đổi resource).
- E2e trên UBS1 xanh mà không phải sửa bộ chọn phần tử nào.
- Độ tương phản đạt bảng §3; màu nào đổi so với bảng thì đo lại.
- Trên dGen1 và UBS1:
  - Đổi chế độ tối của máy thì app đổi bản ngày, đêm.
  - Icon đúng ở khung của từng máy, và ở icon theo hình nền (cả hai máy đều Android 13 trở lên).
  - Icon thông báo nhìn ra hình.
  - Màn mở app đúng màu ngày, đêm.
  - Thời gian từ lúc chạm icon tới lúc ô tìm có con trỏ không chậm hơn v0.2.0. Đo cả hai bản trên cùng máy, ghi số vào CHANGELOG.
  - dGen1 (màn vuông 480 x 480 dp): màn chờ và màn tìm không thấy không tràn, không phải cuộn.
- Đo dung lượng APK tăng thêm và ghi lại. Mục tiêu dưới 2 MB.

## 9. Làm sau, đã ghi lại

- **Mục Theme trong Cài đặt:** Watercolor (mặc định), Noir luxury, Sổ đen, Modern art, dựng từ các hướng ở moodboard vòng 1 và 2. Mỗi theme cần bộ token, bộ font đủ dấu (Sổ đen và Modern art phải thay Instrument Serif và Archivo Black, hai font thiếu dấu đã dùng ở moodboard), bộ 4 icon loại với cặp xe riêng (một loại ô tô và một loại xe máy hợp theme), hình màn trống, icon app.
- **Chọn icon app riêng:** một mục cài đặt tách khỏi Theme, đổi icon bằng `activity-alias`, áp dụng kèm cảnh báo app sẽ đóng lại. Phải kiểm trên Samsung, vì có launcher tạo trùng icon hoặc làm mất icon đã ghim.
- **Sao chuyển động ngay ở màn mở app của hệ thống** (AnimatedVectorDrawable, tối đa khoảng 1 s), nếu sau này muốn hiệu ứng sớm hơn màn chờ.
- **Hiệu ứng xe lăn vào** (bản 2 ở moodboard): xe chạy vào từ trái, vệt đường vẽ dần, sao bật dọc vệt đường.

## 10. Rủi ro và spike

| # | Rủi ro | Cách xử lý |
|---|---|---|
| S6 | WebView có báo đúng chế độ tối của máy cho CSS (`prefers-color-scheme`) không | Theme Android của app đã là DayNight (`AppTheme.NoActionBar`), nên nhiều khả năng là có. Kiểm trên dGen1 và UBS1 ở bước đầu của plan, trước khi làm bản đêm. Không được thì native đọc chế độ máy rồi đặt `data-theme`. |
| R2 | Icon thông báo hình xích lô ở 24dp không ra dáng | Thử trên máy; không đạt thì dùng chữ J một màu. |
| R3 | Icon loại màu nước ở 22dp nhòe | Thử trên máy; không đạt thì tăng lên 28dp, hoặc chỉ dùng ở chip chọn loại và đầu màn Chi tiết. |
| R4 | Chữ trên mui do model vẽ không đúng hẳn Fraunces | So ở 512px; lệch rõ thì sơn lại phần chữ. |
| R5 | APK nặng thêm vì font và ảnh | Chỉ subset latin và vietnamese, ảnh WebP ở cỡ hiển thị; đo và ghi lại. |
| R6 | Gói Fraunces không có trục SOFT | Kiểm khi cài; không có thì dùng Fraunces thường. |

## 11. Thay đổi kéo theo trong spec gốc

- §2 thêm **D13**: theme Watercolor Sài Gòn, ngày làm chính và đêm theo máy, bộ nhận diện xích lô; trỏ về tài liệu này.
- §13 thay gạch "Dark mode mặc định, sáng là tùy chọn" bằng "Theme Watercolor Sài Gòn: ngày làm chính, đêm theo chế độ tối của máy", và ghi M0.5 đã xong, M5 theo tài liệu này.
- §16 thêm S6.
- §17 sửa hàng M5.
- §19.2 thêm mục Theme trong Cài đặt và mục chọn icon app.

## Phụ lục A: vấn đề bố cục thấy khi chạy thử v0.2.0 (ngoài đợt này)

Ghi từ lần chạy thử ngày 2026-10-23, để làm ở đợt sau:

- Thanh điều hướng nằm trên cùng, xa ngón cái khi cầm một tay; chữ "Chấm nhanh" xuống hai dòng ở màn 360dp.
- Màn Chi tiết không có tiêu đề và nút quay lại.
- Một thực thể chưa chấm hiện hai lần ở Tra cứu: trong Chờ chấm và trong Gặp gần đây.
- Tiêu đề màn Chi tiết của quán hiện khóa đã chuẩn hóa ("com tam ba ghi") thay vì tên ("Quán Cơm Tấm Ba Ghi").
- Chip chọn loại và chip tag cao khoảng 24dp, dưới mức 56dp của token vùng chạm; tag tốt và tag xấu trộn chung một khối; nút "Lưu" trông như một dòng thường.
