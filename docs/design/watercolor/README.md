# Ảnh nguồn theme Watercolor Sài Gòn

Ảnh đã chốt qua moodboard ngày 2026-10-23 tới 2026-10-27, làm nguồn cho tài sản cuối của mốc M5. Thiết kế và quyết định nằm ở [spec Watercolor](../../superpowers/specs/2026-10-27-judexp-watercolor-design.md); đây chỉ là kho ảnh và nguồn gốc của chúng.

Đây là bản ý tưởng đã duyệt, chưa phải tài sản cuối. Tài sản cuối (icon theo mật độ, hình bóng một màu, bốn icon loại tách rời) dựng từ các file này theo §7 của spec.

## Các file

| File | Là gì | Cỡ |
|---|---|---|
| `logo-cyclo-d1.webp` | Xích lô góc nghiêng D1, chữ Judexp sơn trên bạt hông mui, trên giấy kem | 1024 x 1024 |
| `logo-cyclo-d1-cutout.webp` | Cùng chiếc xe, đã tách nền (có kênh trong suốt). Phần giấy kem nằm lọt trong bánh và mui vẫn còn, nên trên nền tối cần quầng sáng sau xe | 823 x 749 |
| `logo-lockup-day.webp` | Logo đầy đủ tham chiếu: xe D1, chữ Judexp Fraunces màu `#b5532a`, vệt đường chấm `#8a6a4a`; nền trong suốt | 1024 x 1280 |
| `logo-lockup-night.webp` | Như trên, chữ màu đào `#f3b994`, vệt đường `#d9cdb8`, cho nền tối | 1024 x 1280 |
| `icon-launcher-d1.webp` | Icon màn hình chính: xe D1 chiếm 62% cạnh, nền kem `#f7eedb`. Xe còn lấn khỏi vòng an toàn 66dp khoảng 3dp và lệch xuống 2dp, nên khi xuất icon cuối thu còn khoảng 90% và căn lại tâm (§7 của spec) | 1024 x 1024 |
| `kinds-k1.webp` | Bộ 4 icon loại K1 trên một tấm: xe (taxi cổ xanh vàng và Cub đỏ), quán (xe đẩy mái sọc), món (tô phở), địa điểm (ghim có nhà phố) | 1024 x 1024 |
| `empty-state-day.webp` | Hình doodle màn tìm không thấy, bản ngày | 1024 x 1024 |
| `empty-state-night.webp` | Cùng hình, bản đêm trên giấy tối | 1024 x 1024 |
| `prompts.json` | Prompt và ảnh mẫu đã dùng cho từng ảnh, để vẽ lại hoặc vẽ thêm cùng nét | |

## Nguồn gốc

- Vẽ bằng `google/gemini-3-pro-image` qua OpenRouter, khoảng 0,14 USD mỗi ảnh. Toàn bộ moodboard (mười vòng, gồm cả các hướng không chọn) hết khoảng 6,6 USD.
- Chiếc xe D1 đi qua ba bước, mỗi bước lấy ảnh trước làm mẫu: xích lô góc nghiêng, rồi bản nét đậm màu đầy đủ, rồi bản có chữ trên mui. Chữ trên mui do model sơn theo mẫu chữ Fraunces dựng sẵn, nên nét mảnh hơn Fraunces thật một chút (rủi ro R4 trong spec).
- Chữ Judexp dưới xe trong hai file `logo-lockup-*` dựng bằng font Fraunces thật (variable, độ đậm 650, trục SOFT 100), không phải do model vẽ. Trong app, phần chữ này dựng lại bằng chữ thật chứ không dùng ảnh.
- Tách nền bằng cách loang từ mép ảnh qua vùng gần màu giấy; hai ảnh logo đầy đủ chụp từ trang HTML có nền trong suốt.

Moodboard với mọi vòng và lựa chọn đã lưu: https://claude.ai/artifact/JBhcNugQbDveTpNYYBvASw
