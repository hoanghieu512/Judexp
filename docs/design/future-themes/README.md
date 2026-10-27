# Ảnh ý tưởng cho các theme làm sau

Ba theme sẽ vào mục Theme trong Cài đặt sau M5 (W12 và §9 của [spec Watercolor](../../superpowers/specs/2026-10-27-judexp-watercolor-design.md), §19.2 của spec gốc). Ảnh ở đây là bản ý tưởng từ moodboard vòng 1 và 2 ngày 2026-10-23, **chưa duyệt làm tài sản cuối**: huynh dặn còn phải hoàn thiện vài icon, icon app, và vẽ cặp xe riêng cho từng theme (một loại ô tô và một loại xe máy hợp theme, không cố định taxi và Cub).

| Thư mục | Theme | Chất |
|---|---|---|
| `noir-luxury/` | Noir luxury (moodboard gọi "Noir cổ điển", hướng A và A2) | Nền đen, vàng kim, serif kiểu Didone |
| `so-den/` | Sổ đen (hướng B) | Bìa sổ da đen, nét ngà vẽ một đường liền |
| `modern-art/` | Modern art màu khối (hướng C) | Khối màu cơ bản đỏ, vàng, xanh, nền kem |

Mỗi thư mục có:

| File | Là gì |
|---|---|
| `icon-1.webp`, `icon-2.webp` | Hai ý tưởng icon app (moodboard đặt tên `<hướng>1-icon`, `<hướng>2-icon`) |
| `kinds.webp` | Bộ 4 icon loại trên một tấm: xe máy, quán, món, địa điểm. Icon xe ở đây mới là xe máy; khi làm thật phải thành cặp ô tô và xe máy |
| `lookup.webp`, `rate.webp` | Ảnh chụp màn Tra cứu và Chấm nhanh theo hướng đó, chụp từ harness (`docs/design/watercolor/tools/harness`, tham số `?dir=A2`, `B`, `C`) |

Ghi chú khi làm tiếp:

- Màn của Sổ đen và Modern art chụp ở vòng 1, khi còn dùng Instrument Serif và Archivo Black: **hai font này thiếu dấu tiếng Việt**, phải thay. Noir luxury đã đổi sang Playfair Display và Be Vietnam Pro ở vòng 2 (hướng A2), đủ dấu.
- `prompts.json` giữ nguyên prompt đã dùng cho từng ảnh, để vẽ lại hoặc vẽ thêm cùng nét bằng `docs/design/watercolor/tools/gen.py`.
- Ảnh lưu WebP chất lượng 92 từ bản PNG 1024 x 1024 của model; đủ làm ảnh mẫu và xem ý tưởng. Tài sản cuối của các theme này sẽ vẽ lại, nên không giữ bản không nén.
- Moodboard còn các hướng không chọn khác (Ký họa Sài Gòn, bộ icon đêm K2, các icon app vòng 2): xem ở https://claude.ai/artifact/JBhcNugQbDveTpNYYBvASw.
