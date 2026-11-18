# Phân xử review-code (Stage 2 + Stage 3)

Nguồn: `stage2-quality.md` (TEST/ARCH/CODE), `adv-logic.md` (AL), `adv-layout.md` (LY). Mục trùng được gộp.
Tổng: 23 phát hiện (Stage 2: 7; AL: 8; LY: 8). Gộp mục trùng (AL-1=ARCH-1; AL-6=TEST-1=CODE-1; AL-3=ARCH-2; LY-6=ARCH-3) còn 18. Chấp nhận 11 (3 mục chỉ một phần), bác bỏ 7, hoãn 0. Bản trước ghi nhầm 19/12.

## Chấp nhận (sửa)

| ID | Mức | Vị trí | Cách sửa |
|---|---|---|---|
| AL-1 = ARCH-1 | Medium | `continue-exam-card.tsx` | Thêm menu ··· (ghim / bỏ ghim) và dấu ghim cho thẻ "Tiếp tục học" |
| AL-2 | Medium | `MyExamsPage.tsx` (pills) | Ô đếm chỉ đúng khi cả danh sách nằm trong một trang: ẩn khi có từ 2 trang trở lên |
| LY-1 | Medium | `session-analytics-sections.tsx` ViolationsCard | Biểu đồ tròn bán kính 80 cần chỗ: trả khung về `h-64` |
| LY-2 | Medium | `FlashcardStudyPage.tsx` thẻ lật | `min-h` 280/320 → 320/380 (vùng chữ ≥ trước nhờ đệm đã giảm) |
| AL-6 = TEST-1 = CODE-1 | Low (P2) | `my-exams-types.ts` `formatTimeAgo` | Đổi thành `formatAttemptTime`: dưới 1 tuần dùng `formatTimeAgo` dùng chung (`lib/history`), từ 1 tuần là ngày; ngày hỏng → ""; test ngưỡng và ngày cố định |
| AL-3 = ARCH-2 | Low | `MyExamsPage.tsx` expanded | `expanded` = người dùng mở hoặc đang ở trang ≥ 2; "Thu gọn" ở trang ≥ 2 quay về trang 1 |
| AL-5 | Low | `MyExamsPage.tsx` fetch | Lỗi tải: xóa dữ liệu cũ, hiện thông báo + "Thử lại", ẩn ô đếm |
| LY-3 | Low | `flashcard-result-preview.tsx:21` | `max-h-40` → `max-h-36` để còn chỗ cho dòng gợi ý |
| LY-4 (một phần) | Low | `StudyRoomListPage.tsx` skeleton | `h-36` → `h-40` cho gần thẻ thật |
| LY-7 (một phần) | Low | landing | Hoàn lại hàng mục `FeatureShowcase`, các bước `ProductShowcase`, chữ trích dẫn `TestimonialsSection`; số đếm `MetricsSection` chỉ giảm một bậc (`lg:text-7xl`) |
| LY-8 | Low | `AboutSection.tsx:98` | Khối số liệu của mục (không phải thẻ): trả `gap-8` |

## Bác bỏ

| ID | Lý do |
|---|---|
| AL-4 | Màu xanh cho mọi kết quả đã nộp và "—" / "0%" theo đúng ảnh thiết kế; đã báo người dùng |
| AL-6 (múi giờ) | Hiển thị theo múi giờ của người xem là đúng; ép `Asia/Ho_Chi_Minh` sai cho người ở nơi khác |
| AL-7 | `resumeUrl` là code chuyển nguyên, id do server sinh (cuid), tiền tố `/exam-session/` cố định; không có đường khai thác |
| AL-8 | Logic ghim/rollback và cache không đổi trong diff này (có từ trước) |
| CODE-2 | Số ô skeleton là chỗ giữ chỗ, không cần bằng `PREVIEW_COUNT` |
| ARCH-3 = LY-6 | Bỏ `size="lg"` đúng thang của plan (nút trong thẻ → mặc định 34px); không có lỗi |
| ARCH-4 | `Card` nhận `React.ComponentProps<"div">`, không có prop `styles`: người gọi không truyền được (TS báo lỗi) |
| LY-4 (`ManageExamRoomPage`) | Lệch skeleton có từ trước, diff không làm tệ hơn |
| LY-5 | `py-12` ở trạng thái rỗng không nằm trong thang; `space-y-6` ở admin là khoảng giữa các mục của trang (layout) |
| LY-7 (`CoralCallout`, khung code `ProductShowcase`) | Là thẻ (callout card, code window) → đúng phạm vi |

## Vòng 2: soát lại riêng phần sửa (`adv-fix-round-1.md`)

9 mục chấp nhận ở vòng 1 đã được xác nhận là xử lý xong; AL-2 và AL-6 xong một phần (R5, R1), AL-5 gần xong (R2, R6).

| ID | Mức | Phán quyết | Lý do / cách sửa |
|---|---|---|---|
| R1 | Medium | Chấp nhận | Test ngày phụ thuộc múi giờ máy chạy: mốc thời gian dựng theo giờ địa phương; đã chạy xanh dưới America/Los_Angeles và Pacific/Kiritimati |
| R2 | Low | Chấp nhận | Bộ đếm lượt tải (`latestLoad`): kết quả của lượt cũ bị bỏ, cả nhánh thành công lẫn lỗi |
| R3 | Low | Chấp nhận | Chuyển trang giữ danh sách ở trạng thái mở |
| R8 | Low | Chấp nhận | Tách `myExamsView` (mở/thu gọn, số thẻ hiện, phân trang, ô đếm) thành hàm thuần, 6 test viết trước (đỏ vì sai giá trị rồi mới xanh) |
| R9 | Low | Chấp nhận | Không hiện mục ngày khi nhãn rỗng |
| R4 | Low | Bác bỏ | Ghim không cập nhật cache trang: code ghim và cache không đổi trong diff, có từ trước |
| R5 | Low | Bác bỏ | Số liệu của phòng bị chia qua 2 trang: `groupBySession` không đổi, có từ trước |
| R6 | Low | Bác bỏ | `?page=` vượt số trang chỉ có khi tự gõ URL; trạng thái rỗng vốn như vậy |
| R7 | Low | Bác bỏ | Vùng chữ flashcard xem trước thấp hơn là đúng chủ ý thu nhỏ; vẫn cuộn được |

Sau vòng 2: tsc 0; eslint 128 file 0 lỗi (13 cảnh báo có từ trước); `yarn test` 31 file / 229 test exit 0 (thêm `TZ=America/Los_Angeles` cho file my-exams: 23/23); build 0. Không soát lại vòng 3: phần sửa vòng 2 nhỏ, đều là Low hoặc chỉ là test, và đã có test chứng minh.
