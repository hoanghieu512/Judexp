# Bàn giao M5: từ phiên cloud sang máy local

Viết ngày 2026-10-27, cuối phiên Claude Code trên cloud. Mở phiên mới trên máy local thì đọc file này đầu tiên.

## Đang ở đâu

- Phần thiết kế M5 (theme Watercolor Sài Gòn, bộ nhận diện xích lô) đã xong. [Spec Watercolor](../specs/2026-10-27-judexp-watercolor-design.md) đã qua một lượt review độc lập đối chiếu với code, và **huynh duyệt ngày 2026-10-27**.
- Chưa có plan, chưa có dòng code nào của M5.
- **Bước kế tiếp:** viết kế hoạch triển khai M5 từ spec bằng skill `superpowers:writing-plans`, lưu vào `docs/superpowers/plans/` theo lối tên đang có (ví dụ `2026-10-28-judexp-watercolor.md`). Huynh duyệt plan rồi mới code.

## Mở phiên local

1. Lấy branch: `git fetch origin`, rồi `git checkout claude/relaxed-planck-ifz792` (đã có thì `git pull`). Branch chưa có PR.
2. Cài theo mục cài đặt của README: Node 24 và `npm install`, JDK 21, Android SDK 36, `adb` cắm dGen1 và UBS1.
3. Claude Code trên máy cần plugin superpowers (các skill `writing-plans`, `subagent-driven-development` hoặc `executing-plans`, `test-driven-development`, `verification-before-completion`). Phiên cloud có sẵn plugin; máy local thì kiểm danh sách skill trước.
4. Câu mở đầu gợi ý: "Đọc `docs/superpowers/handoffs/2026-10-27-m5-cloud-to-local.md` rồi viết plan M5 theo spec Watercolor."

## Commit của chặng này

| Commit | Nội dung |
|---|---|
| `b2fedab` | Spec Watercolor bản đầu; spec gốc thêm D13, S6, sửa §13, hàng M5, §19.2; README; ảnh nguồn `docs/design/watercolor/` |
| `61cdb4a` | Công cụ moodboard `docs/design/watercolor/tools/` (vẽ ảnh, tách nền, harness chạy app trên trình duyệt) |
| `b61e1e1` | Sửa spec theo review độc lập, thêm W13 tới W17 |
| Commit chứa file này | Huynh duyệt spec; ảnh gốc không nén `master/`, ảnh chụp màn `screens/`, hai bước trung gian của xe; ảnh ý tưởng cho ba theme làm sau; file bàn giao này |

## Tài liệu và ảnh, tất cả đã nằm trong repo

| Ở đâu | Có gì |
|---|---|
| `docs/superpowers/specs/2026-10-27-judexp-watercolor-design.md` | Spec M5: quyết định W1 tới W17, token màu và tương phản, font, thành phần, Android, màn chờ (tọa độ sao, keyframe), tài sản, nghiệm thu, rủi ro |
| `docs/superpowers/specs/2026-10-16-judexp-design.md` | Spec gốc, đã sửa §2 (D13), §13, §16 (S6), §17 (M5), §19.2 |
| `docs/design/watercolor/` | Ảnh nguồn đã duyệt (WebP 92 để xem), `master/` bản không nén để dựng tài sản cuối, `screens/` ảnh chụp màn moodboard, `prompts.json`, `tools/` |
| `docs/design/future-themes/` | Ảnh ý tưởng cho Noir luxury, Sổ đen, Modern art (icon app, bộ icon loại, màn chụp) và prompt, cho mục Theme làm sau |
| https://claude.ai/artifact/JBhcNugQbDveTpNYYBvASw | Moodboard: mọi vòng, mọi hướng kể cả hướng không chọn, và các lựa chọn đã lưu. Trang vẫn còn trên claude.ai sau khi container cloud bị thu hồi; mở bằng trình duyệt, hoặc bằng công cụ Artifact của Claude Code (action `read`) |

## Việc cần nhớ khi viết plan M5

- **Đo mốc v0.2.0 trước khi đổi gì:** thời gian mở nguội tới lúc ô tìm có con trỏ, trên cả dGen1 và UBS1, theo cách đo ở §8 của spec (trên dGen1 không dùng `am force-stop`). Đổi code rồi thì không còn mốc để so.
- **Spike S6 làm đầu tiên**, ba ca trên máy thật (§10). Phiên local có máy cắm `adb` nên làm được ngay; phiên cloud thì không.
- `src/ui/theme/tokens.css`: đảo lại, ngày ở `:root`, đêm theo cơ chế `data-scheme` ở §5; xóa khối `[data-theme='light']` (CSS chết).
- `src/AppShell.tsx`, nhánh `if (!ready)`: thay bằng màn chờ mở kho (§6.4). Test giảm chuyển động đọc stylesheet, vì jsdom không có `matchMedia`.
- `android/app/src/main/res/values/styles.xml`: bỏ dòng `android:background=@drawable/splash` **cùng lúc** xóa 11 file `splash.png`; thêm thư mục `values-night`; đặt `windowBackground` (§6.3).
- `ReminderAlarmReceiver.java`, dòng `setSmallIcon`: đổi sang vector icon thông báo mới (§6.2).
- Ràng buộc test ở §5: e2e tìm theo chữ, nhãn và vai trò; Vitest theo `data-testid` và class; `src/ui/tokens.test.ts` khớp regex trên `ui.css`.
- Font: import theo từng subset; Fraunces dùng file trục đầy đủ với `'WONK' 0` (§4).
- Tài sản cuối dựng từ `docs/design/watercolor/master/` theo §7; icon launcher thu còn khoảng 90% và căn tâm.
- Phụ lục A của spec (bố cục) nằm ngoài M5.

## Công cụ: local khác cloud ở đâu

- **Vẽ ảnh qua OpenRouter (`tools/gen.py`):** trên cloud, proxy của môi trường tự gắn key; script không tự gửi header `Authorization`, nên chạy ở local sẽ bị từ chối. Khi cần vẽ thêm, thêm vài dòng cho script đọc biến môi trường `OPENROUTER_API_KEY`. Đặt key trong shell của máy, không dán vào chat. Key đang dùng trên cloud có hạn mức 8 USD, đã dùng khoảng 6,56 USD. M5 nhiều khả năng không cần vẽ thêm, trừ khi phải sơn lại chữ trên mui (R4).
- **Harness và tách nền:** cần Python 3 với Pillow và numpy. `python3 docs/design/watercolor/tools/harness/fetch_fonts.py` tải font Google về máy (ở local không vướng proxy). Script chụp cần Playwright: cài `playwright` toàn cục, chạy `npx playwright install chromium`, rồi chạy script với `NODE_PATH=$(npm root -g)` như `tools/README.md`.
- **Higgsfield:** phiên cloud gọi qua MCP; gói starter đã hết hạn và chế độ vector của Recraft bị chặn. M5 không cần.

## Không mang theo được

- Scratchpad của container cloud (ảnh vẽ thử mọi vòng, file nháp, file nguồn HTML của moodboard) sẽ mất khi container bị thu hồi. Mọi ảnh cần cho M5 và cho ba theme làm sau đã chép vào repo; ảnh của các hướng không chọn còn xem được trên moodboard.
- Phiên cloud không ghi được log phiên vào vault Obsidian (`claude-sessions/judexp/`), cũng không cập nhật ledger `.superpowers/sdd/` trên máy Mac. Chặng này chỉ có quyết định thiết kế, đã ghi đủ trong spec (W1 tới W17, kèm ngày huynh chốt). Nếu muốn có log cho chặng này, phiên local tóm từ file này và lịch sử commit.

## Quy ước làm việc với huynh

- Xưng đệ, gọi huynh; trả lời tiếng Việt. Code, comment, commit, tên biến bằng tiếng Anh.
- Bàn vấn đề thì chỉ phân tích: 2 tới 3 phương án có ưu nhược, đề xuất một, không viết code trong chat. Đã chốt và sửa được trực tiếp thì tóm tắt việc sẽ làm, hỏi "làm luôn nhé?".
- Thiếu context thì hỏi, không tự suy diễn.
- Không dùng em dash. Markdown không cắt dòng cứng.
- Không nói "đã xong" khi chưa có bằng chứng; báo rõ phần chưa kiểm.
- Không tạo PR khi huynh chưa bảo.
