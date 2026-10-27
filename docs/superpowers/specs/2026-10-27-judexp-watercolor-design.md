# Judexp: Theme Watercolor Sài Gòn và bộ nhận diện

> **Trạng thái:** chốt qua mười vòng moodboard từ 2026-10-23 tới 2026-10-27 với huynh và Gú. Qua một lượt review độc lập đối chiếu với code ngày 2026-10-27: sửa các chỗ lệch với repo, thêm W13 tới W17. Chưa có plan, chưa có dòng code nào.
> **Quan hệ với spec gốc:** tài liệu này sửa §2, §13, §16, §17 và §19.2 của [spec gốc](2026-10-16-judexp-design.md), chi tiết ở §11. Phần nào ở đây không nhắc thì spec gốc vẫn đúng.
> **Moodboard:** https://claude.ai/artifact/JBhcNugQbDveTpNYYBvASw, có mọi vòng và lựa chọn đã lưu. Ảnh nguồn đã chốt nằm trong [`docs/design/watercolor/`](../../design/watercolor/). CSS thử của bản đã duyệt là hướng `D2` và `D2N` trong `docs/design/watercolor/tools/harness/directions.css`: chỉ để tham khảo, chỗ nào khác tài liệu này thì tài liệu này thắng.

## 1. Mục tiêu

Hai việc:

1. Thay hệ thiết kế M0.5 (nền tối, xám, font Inter) bằng **theme Watercolor Sài Gòn** làm theme chính. Giữ mọi nguyên tắc của §13 trừ "dark mode mặc định", và nói rõ phạm vi của quy tắc biển số mono (W13).
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
| W5 | **Font:** Fraunces cho tiêu đề và tên quán, Nunito cho chữ thân, Mali cho lời doodle, JetBrains Mono cho biển số | Cả bốn có bộ ký tự tiếng Việt (đã kiểm metadata Google Fonts và gói @fontsource; vòng 1 từng dùng hai font thiếu dấu). Fraunces mềm như bảng hiệu cũ, Nunito tròn dễ đọc, JetBrains Mono có số 0 chấm giữa nên giữ được yêu cầu biển số mono của §13. Thay Inter và Roboto Mono. |
| W6 | **Logo** là chiếc xích lô góc nghiêng (bản D1) có chữ Judexp sơn trên bạt hông mui; bên dưới là chữ Judexp Fraunces màu cam đất kèm một vệt đường chấm | Ý của Gú: "logo là cái xe, có thêm tên app, không lồng ghép gì nữa", như xích lô chở đi đó đây. Chữ trên mui lấy bố cục mẫu D, kiểu chữ mẫu A. Huynh chốt ngày 2026-10-25. |
| W7 | **Icon màn hình chính** là chiếc xe D1, có chữ trên mui, không vẽ thêm chữ Fraunces trong icon | Android tự in tên app dưới icon bằng font của máy; vẽ thêm thì tên lặp hai lần và xe nhỏ đi. Huynh chốt ngày 2026-10-27. |
| W8 | **Màn mở app** của hệ thống hiện icon D1. **Màn chờ mở kho** hiện logo đầy đủ, sao vàng quanh xe bật lần lượt: từ trong suốt, lóe trắng, rồi vàng, sau đó nháy nhẹ | Hiệu ứng chạy trong khoảng app vốn phải chờ mở kho, không thêm giây nào. Đây là bản 1 trong hai bản đã thử; bản 2 (xe lăn vào) để dành, xem §9. |
| W9 | **Bộ 4 icon loại là K1:** taxi cổ xanh vàng cùng xe Cub đỏ, xe đẩy bán đồ ăn mái sọc, tô phở, ghim địa điểm có nhà phố | Gú giữ K1 gốc vì màu hài hòa hơn bản đổi màu. Icon xe là một cặp ô tô và xe máy vì mục xe gồm cả hai. |
| W10 | **Màn tìm không thấy có hình doodle** (sổ mở, dấu hỏi, thuyền giấy) với chữ Mali, bản ngày và bản đêm riêng | "Chưa gặp" là câu trả lời thường gặp nhất (§9.1), nên nó phải có mặt mũi chứ không phải một màn trống. |
| W11 | **Tranh là ảnh raster** (WebP trong app, PNG theo mật độ cho Android). **Hình bóng một màu** (icon thông báo, lớp icon theo hình nền của Android 13) vẽ riêng thành vector | Màu nước không vector hóa được mà còn giữ chất; hình bóng thì phải là một màu sạch. |
| W12 | **Làm sau:** mục Theme trong Cài đặt với Noir luxury, Sổ đen, Modern art; mục chọn icon app riêng, đổi icon kèm cảnh báo app sẽ đóng lại; mỗi theme có cặp xe riêng | Huynh duyệt hướng ngày 2026-10-23 và dặn ghi lại. Không nằm trong đợt này. |
| W13 | **Ô Tra cứu dùng Nunito** như moodboard. Biển số hiển thị (dòng kết quả, Chi tiết, Chờ chấm), ô Biển số ở Chấm nhanh và các ô mã ở Cài đặt (địa chỉ, API key, folder id, device id) vẫn mono | Ô Tra cứu nhận cả biển số lẫn tên quán, và tên quán gõ bằng mono trông khô. Quy tắc mono của §13 sinh ra để **đọc** biển số không nhầm 0 với O, 1 với l: chỗ đọc vẫn mono. Ô Tra cứu là chữ huynh tự gõ, và biển số Việt Nam không dùng chữ O, I. Ô mã ở Cài đặt mới là chỗ dễ nhầm thật, nên giữ mono. Huynh chốt ngày 2026-10-27. |
| W14 | **Nền của dấu verdict và nút chấm là màu đặc pha sẵn**, không trong suốt. **Màu Xấu bản đêm là `#f6767b`** | Bản trong suốt để vệt loang và nền thẻ lọt qua: chữ trên nút chấm chỉ đạt khoảng 4,1:1 trên nền app ở bản ngày, Xấu bản đêm 3,96:1. Màu đặc cho cùng một tương phản ở mọi chỗ đặt. Huynh chốt ngày 2026-10-27. |
| W15 | **Mỗi hình dấu verdict có viền 2px màu verdict**; tam giác Xấu vẽ bằng SVG | Nền nhạt của dấu chỉ khác nền thẻ 1,1 tới 1,4:1, nên không viền thì hình gần như không thấy và W4 không làm được việc của nó. Viền màu verdict đạt từ 4,6:1. `clip-path` cắt mất viền nên tam giác phải là SVG. Huynh chốt ngày 2026-10-27. |
| W16 | **Hình doodle màn tìm không thấy đặt dưới câu trả lời**, chỉ hiện khi không có biển gần giống | Lúc tra, bàn phím đang mở; hình đặt trên sẽ đẩy câu "Chưa gặp người này" xuống dưới bàn phím, nhất là trên dGen1. Đặt dưới thì câu trả lời ở đúng chỗ như v0.2.0. Huynh chốt ngày 2026-10-27. |
| W17 | **Màn mở app của hệ thống có đĩa kem `#f7eedb` sau icon**, cả ngày lẫn đêm | Ảnh xe còn giấy kem nằm lọt trong bánh và mui; trên nền tối sẽ lộ mảng giấy. Đĩa nền icon là cách Android hỗ trợ sẵn; ban ngày đĩa gần như trùng màu nền nên không thấy. Huynh chốt ngày 2026-10-27. |

## 3. Màu

Tên token theo `src/ui/theme/tokens.css`. Bản ngày nằm ở `:root`; bản đêm theo cơ chế ở §5. Đây là đảo ngược so với v0.2.0, nơi `:root` là tối. Khối `:root[data-theme='light']` của v0.2.0 là CSS chết (không chỗ nào trong app đặt `data-theme`), xóa khi làm.

| Token | Ngày | Đêm | Dùng cho |
|---|---|---|---|
| `--jx-bg` | `#f6eddd` | `#1a1714` | Nền app, có thêm vệt loang |
| `--jx-surface` | `#fffaf1` | `#24201c` | Dòng kết quả, thẻ hỏi, ô nhập, nút điều hướng chưa chọn |
| `--jx-surface-raised` | `#efe3cd` | `#2e2924` | Dự phòng: sau đợt này không thành phần nào dùng (chip, thẻ hỏi, nút đang chọn đã có token riêng) |
| `--jx-border` | `#e0cfb3` | `#3d362f` | Viền dòng kết quả |
| `--jx-text` | `#2b2118` | `#f6eee2` | Chữ chính |
| `--jx-text-dim` | `#6c5f4e` | `#bcb09e` | Chữ phụ, chữ "Đang mở kho..." |
| `--jx-text-on-accent` | `#fffaf1` | `#1a1714` | Chữ trên nền `--jx-accent` và trên chip đang chọn |
| `--jx-good` | `#13754d` | `#35c97a` | Tốt |
| `--jx-ok` | `#896305` | `#eab308` | Ổn |
| `--jx-bad` | `#bc2e37` | `#f6767b` | Xấu |
| `--jx-unrated` | `#5c6b7c` | `#7c8c9d` | Chưa chấm |
| `--jx-accent` (mới) | `#3977a5` | `#8ec3e6` | Nút điều hướng đang chọn |
| `--jx-title` (mới) | `#6b3f24` | `#f3b994` | Tiêu đề mục |
| `--jx-ink` (mới) | `#3b2a1e` | `#d9cdb8` | Viền ô nhập, nền chip đang chọn |
| `--jx-brand` (mới) | `#b5532a` | `#f3b994` | Chữ Judexp dưới logo |
| `--jx-road` (mới) | `#8a6a4a` | `#d9cdb8` | Vệt đường chấm dưới logo, đúng màu của ảnh logo đã duyệt |
| `--jx-shadow` (mới) | `#e0cfb3` | `#0f0d0b` | Bóng phẳng dưới dòng kết quả |
| `--jx-dash` (mới) | `#c9b391` | `#5a4f43` | Viền nét đứt của thẻ hỏi |
| `--jx-nav-border` (mới) | `#3b2a1e` | `#4a4138` | Viền nút điều hướng chưa chọn |
| `--jx-chip-bg` (mới) | `#8ec3e633` | `#8ec3e626` | Nền chip |
| `--jx-chip-text` (mới) | `#3a4e5c` | `#cfe3f1` | Chữ chip |
| `--jx-star`, `--jx-star-edge` (mới) | `#f5c542`, `#a8611c` | như ngày | Sao ở màn chờ |

**Nền của dấu verdict và nút chấm** là màu đặc pha sẵn (W14): màu verdict phủ lên `--jx-surface` ở độ đục 13% bản ngày (riêng Ổn dùng vàng `#e0a800` ở 18%), 15% bản đêm. `.jx-problem` (banner lỗi) cũng dùng `--jx-bad-soft`.

| Token | Ngày | Đêm |
|---|---|---|
| `--jx-good-soft` | `#e0e9dc` | `#27392a` |
| `--jx-ok-soft` | `#f9ebc6` | `#423619` |
| `--jx-bad-soft` | `#f6dfd9` | `#442d2a` |

`--jx-unrated-soft` bỏ: dấu Chưa chấm có nền trong suốt (W4). Đổi màu verdict nào thì pha lại màu soft tương ứng.

**Vệt loang** là radial-gradient trên nền `.jx-app`, không phải ảnh; `.jx-screen` và `.jx-nav` để nền trong suốt cho vệt lộ ra. Ba vệt: `radial-gradient(60% 25% at 0% 0%, <đào> 0%, transparent 70%)`, `radial-gradient(55% 25% at 100% 35%, <xanh trời> 0%, transparent 70%)`, `radial-gradient(60% 25% at 10% 85%, <bạc hà> 0%, transparent 70%)`. Ngày: đào `#fbd9bd`, xanh trời `#cde4f2`, bạc hà `#d7ecd9`. Đêm: `#5a3a2a55`, `#2f4f6655`, `#2f4d3a44`. Thẻ, dòng kết quả, ô nhập có nền đặc nên vệt không lọt vào; chữ nằm thẳng trên vệt (tiêu đề mục, chữ phụ, chip trên nền app) vẫn phải đạt bảng dưới, đã đo ở tâm vệt đậm nhất.

**Độ tương phản đã đo** theo công thức WCAG. Bản đầu từ moodboard có bốn cặp dưới 4,5:1: Tốt và Ổn trên thẻ ở bản ngày, chữ trên nút xanh trời, Chưa chấm ở bản đêm. Review thêm ra chữ nút chấm trên nền app và Xấu bản đêm (W14), chữ chip đang chọn bản đêm. Các màu trong bảng trên là bản đã chỉnh:

| Cặp | Ngày | Đêm |
|---|---|---|
| Chữ chính trên nền / trên thẻ | 13,6 / 15,2 | 15,5 / 14,1 |
| Chữ phụ trên nền / trên thẻ / trên vệt loang | 5,3 / 6,0 / 4,7 tới 5,0 | 8,4 / 7,6 / 6,9 tới 7,3 |
| Tốt, Ổn, Xấu, Chưa chấm trên thẻ (chữ, và viền dấu chuẩn 3:1) | 5,5 / 5,3 / 5,6 / 5,3 | 7,5 / 8,4 / 6,0 / 4,7 |
| Tốt, Ổn, Xấu trên nền dấu và nút chấm (màu đặc) | 4,6 / 4,6 / 4,6 | 5,7 / 6,2 / 4,7 |
| Chữ chip trên nền chip, chip trên thẻ / trên nền app | 7,4 / 6,8 | 9,0 / 10,0 |
| Chip đang chọn: `--jx-text-on-accent` trên `--jx-ink` | 13,2 | 11,4 |
| Chữ trên nút điều hướng đang chọn | 4,6 | 9,4 |
| Tiêu đề mục trên nền / trên vệt loang | 7,7 / 6,7 tới 7,2 | 10,4 / 8,5 tới 9,0 |
| Viền ô nhập `--jx-ink` trên thẻ (thành phần, chuẩn 3:1) | 13,2 | 10,3 |
| Chữ Judexp dưới logo trên nền / trên vệt đào (chữ lớn, chuẩn 3:1) | 4,3 / 3,7 | 10,4 |

## 4. Chữ

| Vai trò | Font | Độ đậm | Cỡ |
|---|---|---|---|
| Tiêu đề mục (`.jx-section-title`) | Fraunces, SOFT 100 | 650 | 1.4rem, bỏ viết hoa và giãn chữ |
| Tên quán, món, địa điểm (`.jx-name`) | Fraunces, SOFT 100 | 600 | 1.15rem |
| Chữ thân, nút, ô Tra cứu, ô PIN, Tag riêng, Ghi chú | Nunito | 400, 600 | Theo thang cỡ hiện có |
| Chip, ký tự trong dấu verdict | Nunito | 700 | Theo thang cỡ hiện có |
| Nút điều hướng | Nunito | 800 | `--jx-text-sm` |
| Lời doodle: mọi `.jx-empty`, chữ ở màn chờ | Mali | 400 | 1.2rem, căn giữa |
| Biển số (`.jx-plate`, ô Biển số ở Chấm nhanh) | JetBrains Mono | 700 | Như hiện có |
| Ô mã ở Cài đặt (địa chỉ, API key, folder id, device id) | JetBrains Mono | 500 | Như hiện có |
| Chữ Judexp dưới logo | Fraunces, SOFT 100 | 650 | 19,5% chiều rộng khung logo (§6.4) |

Token mới, vì các giá trị trên nằm ngoài thang hiện có: `--jx-font-display` ('Fraunces Variable'), `--jx-font-hand` (Mali), `--jx-text-title` 1.4rem, `--jx-text-name` 1.15rem, `--jx-text-hand` 1.2rem, `--jx-weight-display` 650, `--jx-weight-heavy` 800, `--jx-radius-card` 18px. `--jx-font` thành Nunito, `--jx-font-mono` thành JetBrains Mono. Thang cỡ chữ, khoảng cách, vùng chạm hiện có giữ nguyên.

Đóng gói:

- Gói: `@fontsource-variable/fraunces`, `@fontsource/nunito`, `@fontsource/mali` (không có bản variable), `@fontsource/jetbrains-mono`. Lúc review cả bốn ở bản 5.3.0 và đều có subset vietnamese. Không tải font từ mạng, vì app phải chạy được khi mất mạng (§9.6 spec gốc).
- **Chỉ subset latin và vietnamese.** Import từng file theo subset (ví dụ `@fontsource/nunito/latin-400.css` và `@fontsource/nunito/vietnamese-400.css`), không import `400.css`: file đó kéo cả bảy subset (cyrillic, greek, latin-ext...) và Vite đóng gói hết. Inter hiện nay đang bị đúng lỗi này (`src/main.tsx`).
- **Fraunces dùng file trục đầy đủ** (`full`: opsz, wght, SOFT, WONK) để chữ tự đổi cỡ quang học như moodboard. File `soft` không có trục opsz (ghim ở 9), nên chữ logo và tiêu đề sẽ dày và kém sắc hơn bản đã duyệt. Gói không có CSS tách subset cho bản này, nên tự viết `@font-face` trỏ tới `files/fraunces-latin-full-normal.woff2` và `files/fraunces-vietnamese-full-normal.woff2` (gói có export `./files/*`), chép `unicode-range` từ CSS của gói. Đặt `font-variation-settings: 'SOFT' 100, 'WONK' 0` (WONK mặc định của file là 1); so với ảnh lockup khi làm. Hai file khoảng 151 KB, bản `soft` khoảng 79 KB.
- `font-display` của fontsource là `swap`. Font nằm trong APK nên tải gần như tức thì; chấp nhận, và kiểm màn chờ trên dGen1 (§6.4).
- Bỏ Inter và Roboto Mono khỏi gói.

## 5. Khung và thành phần

Bố cục giữ nguyên; chỉ đổi cách vẽ.

| Thành phần | Thay đổi |
|---|---|
| Nền app | `.jx-app`: `--jx-bg` cộng ba vệt loang (§3). `.jx-screen`, `.jx-nav` nền trong suốt |
| Nút điều hướng (`.jx-nav-item`) | Bo tròn hẳn, Nunito 800. Chưa chọn: nền `--jx-surface`, viền 1.5px `--jx-nav-border`, chữ `--jx-text`. Đang chọn: nền và viền `--jx-accent`, chữ `--jx-text-on-accent` |
| Ô nhập (`.jx-search`) | Nền `--jx-surface`, viền 2px `--jx-ink`, bo 18px. Nunito 600, trừ ô Biển số ở Chấm nhanh (đã có `.jx-plate`) và các ô mã ở Cài đặt (W13). Ô mã hiện chỉ có `.jx-search`, nên cần thêm class hoặc thuộc tính để nhận font mono |
| Dòng kết quả (`.jx-row`) | Nền `--jx-surface`, viền 1px `--jx-border`, bóng phẳng `0 3px 0 var(--jx-shadow)`, bo 18px |
| Thẻ hỏi (`.jx-prompt`: thẻ nhắc trong Chờ chấm, hộp gộp, hộp xác nhận dựng lại index) | Nền `--jx-surface`, viền 1.5px nét đứt `--jx-dash`, bo 18px |
| Chip (`.jx-tag`: tag trong dòng kết quả, chip loại, chip tag, nút "Thêm tag") | Bo tròn hẳn, Nunito 700, nền `--jx-chip-bg`, chữ `--jx-chip-text`. Đang chọn: nền `--jx-ink`, chữ `--jx-text-on-accent` |
| Dấu verdict (`.jx-mark`) | Hình theo W4, viền 2px màu verdict (W15), nền `--jx-*-soft`. Chưa chấm: nền trong suốt, viền 2px nét đứt `--jx-unrated`. Ký tự ✔ – ✕ ? giữ trong JSX như hiện nay. Tam giác Xấu vẽ bằng SVG có fill và stroke lấy từ token (không dùng `clip-path`, vì nó cắt mất viền). Đèn đồng bộ ở Cài đặt cũng là `.jx-mark` với màu green, yellow, red, grey nên nhận cùng hình; chấp nhận, vì tam giác đỏ đọc ra "có vấn đề" là đúng nghĩa |
| Nút chấm (`.jx-verdict`) | Giữ khung chữ nhật, bo 18px. Nền `--jx-*-soft`, chữ màu verdict; đang chọn: viền 2px màu verdict như hiện có. Nút "Không đi": nền `--jx-surface`, chữ `--jx-text` |
| Tiêu đề mục | Màu `--jx-title`, chữ theo §4 |
| Icon loại | Mới: icon 22dp đặt giữa dấu verdict và tên trong dòng kết quả, Gặp gần đây, phần chưa chấm của Chờ chấm (cùng là `EntityRow`); icon 22dp trước tên trong thẻ nhắc của Chờ chấm (thẻ này không có dấu verdict); icon 28dp trên chip chọn loại ở Chấm nhanh; icon 32dp ở đầu màn Chi tiết. Dữ liệu loại có sẵn ở mọi chỗ (`entity.kind`, `r.kind`, `KINDS`) |
| Màn tìm không thấy | Câu trả lời đổi sang chữ Mali, căn giữa, giữ đúng chỗ. Hình doodle rộng 210px (tối đa 40% chiều cao màn hình) đặt ngay dưới câu trả lời, là phần tử đứng cạnh `<p data-testid="no-match">` chứ không nằm trong nó. Chỉ hiện khi không có biển gần giống (W16) |
| Màn chờ mở kho | Logo đầy đủ, lớp sao, chữ "Đang mở kho..." (§6.4) |
| Đầu `SettingsPage` | Logo đầy đủ cỡ nhỏ (khung rộng khoảng 40% màn hình), không sao, đặt trên `<h2>Kho</h2>`. `SettingsPage` vừa là màn Cài đặt, vừa là màn chưa chọn kho, vừa là màn báo lỗi mở kho (nhánh `!kho \|\| !dirs` của `AppShell`), nên một chỗ phủ cả ba |

`.jx-name` cũng dùng cho chữ không phải tên thực thể (nhãn kho, trạng thái đồng bộ ở Cài đặt, hộp gộp); Fraunces áp luôn ở đó, chấp nhận.

**Ràng buộc với test.** Không đổi chữ hiển thị, tên trợ năng hay vai trò mà test dựa vào.

- E2e (`e2e/tests`, chạy trên UBS1) không dùng `data-testid`, mà tìm theo:
  - nút "Tra cứu", "Chấm nhanh", "Lưu";
  - ô Tra cứu là textbox đầu tiên và duy nhất trên màn đó (`getByRole('textbox').first()`);
  - nút chấm là switch tên theo chữ hiển thị `^(Chấm )?(Tốt|Ổn|Xấu)$`, nên chữ đọc được trong nút chỉ là tên mức, ký tự dấu giữ `aria-hidden`;
  - nhãn dòng `^Mở <biển>, <màu>, <n> lần gặp`;
  - nút `Không đi <biển>`;
  - chữ `^Chưa gặp người này\.`;
  - tiêu đề "biển gần giống, có thể là xe khác", không phân biệt hoa thường;
  - thông báo "Chấm chuyến <biển>?" và nút "Tốt" trên thông báo.
- Vitest dùng thêm mọi `data-testid` hiện có (giữ nguyên hết), class `jx-plate` và `jx-name`, tên chip đúng nguyên văn (`/^xe$/`, `/^xấu$/`), và ký tự dấu chỉ trong bộ ✔ – ✕ ?.
- `src/ui/tokens.test.ts` đọc `ui.css` bằng chuỗi và regex: phải còn selector nguyên văn `.jx-mark[data-color='green']` và các màu, verdict khác; khối `.jx-app {` đầu tiên phải có `height: 100%` và `overflow-y: auto`; khối `.jx-nav-item {` đầu tiên phải có `min-height: var(--jx-touch-min)`.
- Icon loại và hình doodle là trang trí, gắn `aria-hidden`. **Không** thêm loại vào nhãn trợ năng của dòng: `EntityRow.tsx` ghép nhãn mà e2e và Vitest khớp nguyên văn.
- Không sinh chữ bằng CSS `content:`, vì chữ đó lọt vào cây trợ năng (đã gặp với `text-transform`, xem mục Bẫy của `e2e/README.md`).
- Bỏ viết hoa ở tiêu đề mục không làm hỏng e2e (tiêu đề được tìm không phân biệt hoa thường); sửa mục "Chữ hoa bằng CSS" trong `e2e/README.md` cho khớp.

**Cơ chế ngày, đêm.** Chỉ dựa vào chế độ tối của máy (W2).

- Bản ngày ở `:root`, `color-scheme: light`.
- Bản đêm là một khối biến viết ở hai chỗ, kèm `color-scheme: dark`: trong `@media (prefers-color-scheme: dark) { :root:not([data-scheme='light']) { ... } }` và trong `:root[data-scheme='dark'] { ... }`. Bình thường không ai đặt `data-scheme`, nên app theo máy. Thuộc tính này để phương án lùi của S6 (native đặt) dùng được ngay mà không phải viết lại CSS.
- `data-theme` để dành cho mục Theme sau này (§9), dùng để chọn họ theme, không dùng cho sáng tối.
- Không bật algorithmic darkening của WebView: app tự có bản đêm, và Capacitor 8.5.3 không bật nó.
- `index.html` thêm `<meta name="color-scheme" content="light dark">` và nền inline `#f6eddd`, đêm `#1a1714` theo media query, để từ lúc WebView vẽ tới lúc React vẽ không chớp màu khác.

## 6. Bộ nhận diện trên Android

### 6.1 Icon màn hình chính

- **Adaptive icon:** lớp nền là màu kem `#f7eedb` (màu `ic_launcher_background`); lớp trước là xe D1 dạng PNG theo mật độ (khung 108dp: 108, 162, 216, 324, 432 px cho mdpi tới xxxhdpi). Xe phải nằm trọn trong vòng tròn an toàn đường kính 66dp ở giữa. Ảnh nguồn `icon-launcher-d1.webp` chưa đạt: xe rộng 66,3dp, lệch xuống 2,1dp, điểm mực xa nhất cách tâm 36dp. Khi xuất, thu xe còn khoảng 90% và căn lại tâm (§7).
- **Lớp một màu** cho icon theo hình nền (Android 13 trở lên): hình bóng xe D1, vector một màu, khai `<monochrome>` trong cả `mipmap-anydpi-v26/ic_launcher.xml` và `ic_launcher_round.xml`, khung 108dp, hình trong 66dp.
- **Icon cũ** cho Android 7 và 7.1 (minSdk 24): `ic_launcher.png` và `ic_launcher_round.png` 48dp (48 tới 192 px) dựng từ cùng hình.
- Tên app giữ "Judexp" (`strings.xml`).
- Sau khi đổi, vector robot `drawable-v24/ic_launcher_foreground.xml` và `drawable/ic_launcher_background.xml` của Capacitor không còn chỗ nào dùng: xóa.

### 6.2 Icon thông báo

Hình bóng trắng một màu, một VectorDrawable 24dp (minSdk 24 đọc được vector, không cần PNG theo mật độ), dựng từ hình bóng xe D1 rút gọn. Android chỉ dùng kênh alpha của icon này. Thay `R.drawable.ic_launcher_foreground` đang dùng ở `ReminderAlarmReceiver.java` (dòng `setSmallIcon`). Nếu ở 24dp trên máy thật không ra dáng xe thì dùng chữ J một màu (R2).

### 6.3 Màn mở app của hệ thống

Hiện trạng: `AppTheme.NoActionBarLaunch` có parent `Theme.SplashScreen` (core-splashscreen 1.2.0) nhưng chưa đặt thuộc tính `windowSplashScreen*` nào, và có dòng `android:background=@drawable/splash` (`styles.xml`). Capacitor không gọi `installSplashScreen()`; `BridgeActivity` tự `setTheme(AppTheme.NoActionBar)` trong `onCreate`. Vì vậy Android 12 trở lên đang hiện icon mặc định của hệ thống.

- `AppTheme.NoActionBarLaunch` đổi parent sang `Theme.SplashScreen.IconBackground` và đặt:
  - `windowSplashScreenBackground`: kem `#f6eddd` (values), `#1a1714` (values-night, thư mục mới);
  - `windowSplashScreenIconBackgroundColor`: `#f7eedb` ở cả hai bản (W17);
  - `windowSplashScreenAnimatedIcon`: lớp trước của adaptive icon, đứng yên. Icon có nền dùng khung 240dp, phần thấy được là vòng tròn 160dp, cùng tỉ lệ với vùng 72/108 của adaptive icon, nên dùng lại được lớp trước.
- Bỏ dòng `android:background=@drawable/splash` **cùng lúc** xóa 11 file `splash.png` (`drawable`, `drawable-port-*`, `drawable-land-*`). Xóa ảnh mà còn dòng này thì build lỗi.
- Không cần `postSplashScreenTheme`, vì không gọi `installSplashScreen()`. Nếu plan quyết định gọi (ví dụ để dùng `setKeepOnScreenCondition`) thì phải gọi trước `super.onCreate()` và đặt `postSplashScreenTheme` là `@style/AppTheme.NoActionBar`.
- `AppTheme.NoActionBar` đặt `android:windowBackground` bằng một màu resource có bản values-night: kem `#f6eddd`, đêm `#1a1714`. Đây là màu hiện ra giữa màn mở app và lần vẽ đầu của WebView. Trên dGen1 (WebView 124), plugin SystemBars của Capacitor còn tô dải status bar và nav bar bằng màu này.
- Không đặt chữ ở ô thương hiệu dưới đáy, vì tên đã nằm trên mui và Android đã in tên ở màn hình chính.

### 6.4 Màn chờ mở kho

**Khi nào hiện.** Thay nhánh `if (!ready)` trong `AppShell.tsx`, hiện chỉ in "Đang mở kho...". Mốc `ready` đã gồm mở kho, đọc index (`refresh`), `settle` và `askNotificationsOnce`. Sau mốc đó app vào Tra cứu; hoặc `PinGate` nếu có PIN; hoặc `SettingsPage` nếu chưa chọn kho hay mở kho lỗi (kèm banner). Lần đầu chạy, hộp xin quyền thông báo của Android hiện đè lên màn chờ: chấp nhận.

**Không giữ màn này lâu hơn mốc `ready`.** Tới mốc là chuyển màn ngay, kể cả khi hiệu ứng chưa chạy hết.

**Khung logo.** Tỉ lệ 4:5, giống khung tham chiếu `logo-lockup-day.webp` (1024 x 1280). Trong khung là một cột căn giữa ngang, cả cột căn giữa dọc:

- ảnh xe đã tách nền (`logo-cyclo-d1-cutout.webp`), rộng 84% khung;
- chữ "Judexp" thật, Fraunces 650 SOFT 100, cỡ 19,5% chiều rộng khung, `line-height: 1`, giãn chữ 0.01em, màu `--jx-brand`, cách xe 2,3% chiều rộng khung;
- vệt đường chấm SVG, rộng 60,5% khung, viewBox `0 0 200 14`, path `M4 8 C 40 3, 70 12, 100 7 S 160 3, 196 8`, nét 2.4, `stroke-dasharray: 0.5 9`, đầu tròn, màu `--jx-road`, cách chữ 1,4% chiều rộng khung.

Chữ và vệt đường dựng thật (không phải ảnh) để tự đổi màu theo ngày, đêm.

**Cỡ khung:** `width: min(84vw, 57vh)`. Phần có hình chiếm khoảng 83% chiều cao khung, nên trên dGen1 (480 x 480 dp) logo cao khoảng 285dp, còn chỗ cho chữ bên dưới. Chữ "Đang mở kho..." đặt ngay dưới khung: Mali, `--jx-text-hand`, màu `--jx-text-dim`.

**Lớp sao.** Năm ngôi sao bốn cánh, một SVG phủ khung logo. Tọa độ tính theo khung: x theo chiều rộng, y theo chiều cao, cỡ theo chiều rộng.

| Sao | Tâm x | Tâm y | Cỡ | Trễ |
|---|---|---|---|---|
| 1 | 9,5% | 5,7% | 8,3% | 0 ms |
| 2 | 88,1% | 7,6% | 7,1% | 150 ms |
| 3 | 97,6% | 38,1% | 6,0% | 300 ms |
| 4 | 2,4% | 43,8% | 6,0% | 450 ms |
| 5 | 52,4% | 0% | 6,0% | 600 ms |

- Hình sao, viewBox `0 0 24 24`: `M12 0C12.9 7.2 16.8 11.1 24 12C16.8 12.9 12.9 16.8 12 24C11.1 16.8 7.2 12.9 0 12C7.2 11.1 11.1 7.2 12 0Z`. Fill `--jx-star`, viền `--jx-star-edge` nét 0.35 (đơn vị viewBox của sao). Biến đổi quanh tâm từng sao (`transform-box: fill-box; transform-origin: center`).
- Bật (`pop`), 900 ms, `cubic-bezier(.2,.8,.2,1)`, giữ trạng thái cuối:
  - 0%: trong suốt, phóng 0.2, xoay -30°, màu trắng;
  - 40%: hiện rõ, phóng 1.45, xoay 10°, màu `#fffbe6`, quầng `drop-shadow(0 0 2px #fff) drop-shadow(0 0 4px #ffe58a)`;
  - 70%: phóng 0.92, xoay 0, vàng có viền, quầng `drop-shadow(0 0 1.5px #ffe58a)`;
  - 100%: phóng 1, vàng có viền, không quầng.
- Nháy (`shimmer`), chu kỳ 2,6 s, `ease-in-out`, lặp mãi, bắt đầu sau trễ của sao cộng 1,1 s: ở 12% phóng 1.18 kèm `drop-shadow(0 0 2px #fff6c8)`, ở 24% về 1.
- Độ lớn quầng ở trên đo trên moodboard, nơi khung điện thoại rộng khoảng 200px; trong app chỉnh theo mắt, giữ tỉ lệ với cỡ sao.
- `prefers-reduced-motion`: sao hiện sẵn màu vàng, không chuyển động.

**Bản đêm.** Phần giấy kem nằm lọt trong bánh và mui của ảnh không tách được, nên đặt một quầng kem dịu sau xe: hình tròn đường kính 98% chiều rộng khung, tâm ở x 50%, y 24% của khung, nền `radial-gradient(closest-side, #f6edddd9, #f6eddd99 45%, transparent)`, độ mờ 0.8. Chữ Judexp màu `--jx-brand` của bản đêm (đào).

**Font và ảnh ở frame đầu.** Font `swap` và ảnh xe chưa giải mã kịp có thể làm frame đầu hiện font dự phòng hoặc chưa có xe. Cả hai nằm trong APK nên gần như tức thì; chấp nhận, kiểm trên dGen1, thấy nháy thì preload ảnh và font của màn này.

## 7. Tài sản

Ảnh nguồn đã chốt nằm trong [`docs/design/watercolor/`](../../design/watercolor/), kèm `README.md` ghi nguồn gốc và `prompts.json` để vẽ lại cùng nét. Công cụ đã dùng (vẽ qua OpenRouter, tách nền, harness chạy app trên trình duyệt với plugin giả, script chụp) ở `docs/design/watercolor/tools/`.

| File | Dùng để làm |
|---|---|
| `logo-cyclo-d1.webp`, `logo-cyclo-d1-cutout.webp` | Icon màn hình chính, logo ở màn chờ và đầu Cài đặt; nguồn để vẽ hình bóng |
| `logo-lockup-day.webp`, `logo-lockup-night.webp` | Mẫu bố cục logo đầy đủ; trong app dựng lại bằng ảnh xe cộng chữ thật (§6.4) |
| `icon-launcher-d1.webp` | Nguồn cho lớp trước adaptive icon và icon cũ |
| `kinds-k1.webp` | Cắt thành 4 icon loại, tách nền |
| `empty-state-day.webp`, `empty-state-night.webp` | Hình màn tìm không thấy |

Việc dựng tài sản cuối, plan sẽ chia bước:

1. Cắt K1 thành bốn icon, tách nền, xuất WebP cho app ở 2x và 3x của các cỡ 22, 28, 32dp.
2. Vẽ hình bóng xe D1 thành vector (tách đường viền từ ảnh đã tách nền rồi chỉnh tay), dùng cho lớp một màu và icon thông báo.
3. Xuất lớp trước adaptive icon và icon cũ theo mật độ từ `icon-launcher-d1.webp`: thu xe còn khoảng 90%, căn lại tâm, kiểm bằng mặt nạ tròn 66dp trước khi xuất.
4. So chữ trên mui với chữ Fraunces thật ở 512px trước khi xuất icon cuối; lệch rõ thì sơn lại phần chữ (R4).
5. Nén hình doodle và ảnh xe sang WebP ở khoảng 2x cỡ hiển thị lớn nhất, không đưa bản 1024 vào APK.

## 8. Kiểm thử và nghiệm thu

- `npm test` và `npm run build` xanh. Thêm test cho màn chờ mở kho: có logo và chữ "Đang mở kho...". Phần giảm chuyển động kiểm bằng cách đọc stylesheet như `tokens.test.ts`, vì jsdom không có `matchMedia` và không áp CSS.
- `./gradlew assembleDebug` qua: bước này bắt resource thiếu sau khi đổi icon và xóa `splash.png`. JUnit phần Java xanh, nhưng không test JUnit nào chạm resource nên JUnit một mình không đủ.
- E2e trên UBS1 xanh mà không phải sửa bộ chọn phần tử nào.
- Độ tương phản đạt bảng §3; màu nào đổi so với bảng thì đo lại.
- Trên dGen1 và UBS1:
  - Spike S6 đạt cả ba ca (§10).
  - Icon đúng ở khung của từng máy. Icon theo hình nền chỉ kiểm nếu launcher của máy hỗ trợ và đã bật (R8).
  - Icon thông báo nhìn ra hình.
  - Màn mở app đúng màu ngày, đêm, có đĩa kem. Không chớp màu lạ giữa màn mở app, màn chờ và Tra cứu; dải status bar, nav bar đúng màu nền.
  - Thời gian mở nguội, từ lúc chạm icon tới lúc ô tìm có con trỏ, không chậm hơn v0.2.0. Mốc cuối là một dòng log thêm vào chỗ `LookupPage.tsx` tự focus ô tìm. Trên dGen1 không dùng `am force-stop`, vì WebView sẽ ra màn đen tới khi reboot (README, mục sự cố): reboot giữa các lần đo, mở bằng `adb shell monkey -p com.judexp.app -c android.intent.category.LAUNCHER 1`. Đo mỗi bản vài lần trên cùng máy, ghi số vào CHANGELOG.
  - dGen1 (màn vuông 480 x 480 dp): màn chờ không tràn; màn tìm không thấy không phải cuộn khi đã cất bàn phím, và khi bàn phím mở vẫn thấy câu trả lời.
- Đo dung lượng APK tăng thêm so với 8,6 MB của v0.2.0 và ghi lại. Mục tiêu dưới 2 MB.

## 9. Làm sau, đã ghi lại

- **Mục Theme trong Cài đặt:** Watercolor (mặc định), Noir luxury, Sổ đen, Modern art, dựng từ các hướng ở moodboard vòng 1 và 2, chọn bằng thuộc tính `data-theme` (§5). Mỗi theme cần bộ token, bộ font đủ dấu (Sổ đen và Modern art phải thay Instrument Serif và Archivo Black, hai font thiếu dấu đã dùng ở moodboard), bộ 4 icon loại với cặp xe riêng (một loại ô tô và một loại xe máy hợp theme), hình màn trống, icon app.
- **Chọn icon app riêng:** một mục cài đặt tách khỏi Theme, đổi icon bằng `activity-alias`, áp dụng kèm cảnh báo app sẽ đóng lại. Phải kiểm trên Samsung, vì có launcher tạo trùng icon hoặc làm mất icon đã ghim.
- **Sao chuyển động ngay ở màn mở app của hệ thống** (AnimatedVectorDrawable, tối đa khoảng 1 s), nếu sau này muốn hiệu ứng sớm hơn màn chờ.
- **Hiệu ứng xe lăn vào** (bản 2 ở moodboard): xe chạy vào từ trái, vệt đường vẽ dần, sao bật dọc vệt đường.

## 10. Rủi ro và spike

| # | Rủi ro | Cách xử lý |
|---|---|---|
| S6 | WebView có báo đúng chế độ tối của máy cho CSS (`prefers-color-scheme`) không, cả khi đổi chế độ lúc app đang mở | Với targetSdk 36, WebView lấy theo `isLightTheme` của theme activity; `AppTheme.NoActionBar` là DayNight, nên mở nguội nhiều khả năng đúng. Rủi ro nằm ở chỗ manifest khai `configChanges` có `uiMode`: activity không được tạo lại khi đổi chế độ, và chưa rõ WebView có cập nhật theo không. Kiểm ba ca trên dGen1 và UBS1 ở bước đầu của plan, trước khi làm bản đêm: mở nguội ở từng chế độ; đổi chế độ khi app đang hiện; đổi khi app ở nền rồi quay lại. Ca nào không đạt thì native đọc chế độ máy, đặt `data-scheme` trước lần vẽ đầu và cập nhật trong `onConfigurationChanged`; CSS đã viết sẵn để nhận (§5). |
| R2 | Icon thông báo hình xích lô ở 24dp không ra dáng | Thử trên máy; không đạt thì dùng chữ J một màu. |
| R3 | Icon loại màu nước ở 22dp nhòe | Thử trên máy; không đạt thì tăng lên 28dp, hoặc chỉ dùng ở chip chọn loại và đầu màn Chi tiết. |
| R4 | Chữ trên mui do model vẽ không đúng hẳn Fraunces | So ở 512px; lệch rõ thì sơn lại phần chữ. |
| R5 | APK nặng thêm vì font và ảnh | Chỉ subset latin và vietnamese, ảnh WebP ở cỡ hiển thị; đo và ghi lại. |
| R6 | Gói Fraunces không có trục SOFT | Đã đóng: `@fontsource-variable/fraunces` 5.3.0 có trục SOFT (kiểm ngày 2026-10-27). |
| R7 | Màn mở app trên Android 7 tới 11 chạy bằng bản compat của core-splashscreen, mà hai máy QA đều Android 14 trở lên | Làm theo tài liệu của thư viện; có máy cũ thì kiểm thêm. |
| R8 | Icon theo hình nền phụ thuộc launcher (ethOS trên dGen1, launcher của UBS1) | Chỉ kiểm khi launcher hỗ trợ; không hỗ trợ thì ghi lại, không chặn nghiệm thu. |

## 11. Thay đổi kéo theo trong spec gốc

- §2 thêm **D13**: theme Watercolor Sài Gòn, ngày làm chính và đêm theo máy, bộ nhận diện xích lô; trỏ về tài liệu này.
- §13 thay gạch "Dark mode mặc định, sáng là tùy chọn" bằng "Theme Watercolor Sài Gòn: ngày làm chính, đêm theo chế độ tối của máy", và ghi M0.5 đã xong, M5 theo tài liệu này.
- §13 gạch "Biển số render bằng font mono": nói rõ áp dụng ở mọi chỗ hiển thị biển số, ô chỉ nhập biển số và ô mã ở Cài đặt; ô Tra cứu dùng font thân (W13).
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
