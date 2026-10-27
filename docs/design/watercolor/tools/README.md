# Công cụ làm moodboard và tài sản Watercolor

Các script đã dùng để vẽ, tách nền, ghép ảnh và chụp app ở moodboard ngày 2026-10-23 tới 2026-10-27. Giữ lại để dựng tài sản cuối của M5 và để chụp kiểm giao diện mà không cần điện thoại. Không phải code của app: không nằm trong `tsconfig` (chỉ `src`), không vào APK.

| File | Làm gì |
|---|---|
| `gen.py` | Vẽ ảnh qua OpenRouter (`google/gemini-3-pro-image`), nhận file job JSON gồm `name`, `prompt`, `refs` (ảnh mẫu). Key không nằm trong script: proxy của môi trường cloud tự gắn header `Authorization` cho `openrouter.ai`. Cách chạy: `python3 gen.py jobs.json <thư mục ra> [tên job...]` |
| `cutout.py` | Tách chủ thể khỏi nền giấy trơn: vùng gần màu giấy nối với mép ảnh thành trong suốt. `python3 cutout.py vào.png ra.png [ngưỡng]` |
| `compose_cyclo.py`, `compose_badge.py` | Ghép xích lô mờ sau hoặc dưới một hình khác (dùng ở các vòng moodboard, giữ để tham khảo cách làm mờ đúng mức đã duyệt: 42%, bão hòa 0,55) |
| `harness/` | Chạy chính `AppShell` của app trên trình duyệt với plugin native giả (`mocks.ts`): kho trong bộ nhớ có dữ liệu mẫu đủ bốn loại và bốn màu, một nhắc chờ chấm. `directions.css` phủ các hướng thiết kế theo tham số `?dir=` (`D2` là Watercolor ngày, `D2N` là đêm; `A`, `B`, `C`, `D1`, `A2` là các hướng khác) |
| `shoot-screens.cjs`, `shoot-themes.cjs` | Chụp các màn chính bằng Playwright từ harness |

Chạy harness:

1. `python3 harness/fetch_fonts.py` (tải font Google về `harness/public/`, đã gitignore)
2. `cd harness && npx vite --config vite.config.mjs` (cổng 5199; `node_modules` và `src` lấy từ gốc repo)
3. `NODE_PATH=$(npm root -g) node shoot-themes.cjs <thư mục ra> D2,D2N`

Tham số khác của harness: `?nokho=1` (lần đầu chưa chọn kho), `?pin=1234`, `?empty=1&noremind=1` (kho trống), `?sync=offline|pending|none`.
