# Code Review — pending changes trong kmaedu-fe (HEAD d3c6ab9) · level medium

**Verdict:** SEALED sau 2 vòng sửa — lúc đầu là REWORK (3 lỗi P1, không P0); mọi mục chấp nhận đã sửa và kiểm chứng.
**Score:** 8/10 sau sửa · **Accepted:** P0 0 · P1 3 · P2 3 · P3 8 · **Rejected:** 11 · **Deferred:** 0
**Scope:** 129 file (125 sửa, 4 mới), +1034/−622 dòng · stages: spec pass (WARN) · quality pass · adversarial 2 vòng (2 reviewer + 1 soát lại phần sửa)

## P0 · Critical — must fix before merge
None.

## P1 · High — fix before merge

### ARCH-1 · Architecture & Design › tính năng bị mất — thẻ "Tiếp tục học" không ghim/bỏ ghim được (đã sửa)
- **Where:** `src/pages/k/components/continue-exam-card.tsx` (menu ···), `src/pages/k/MyExamsPage.tsx` (truyền `onTogglePin`)
- **Problem:** phòng còn lượt đang làm chuyển sang thẻ "Tiếp tục học", thẻ này không có menu ghim.
- **Impact:** phòng đã ghim không bỏ ghim được, phòng đang làm không ghim được, tới khi nộp bài.
- **Fix:** dùng lại `CardMenu` (···) và dấu ghim trên thẻ này.
- **Confidence:** confirmed · **Found by:** quality + adversarial

### ARCH-2 · Architecture & Design › bố cục — biểu đồ tròn "Thống kê vi phạm" bị cắt (đã sửa)
- **Where:** `src/pages/k/components/session-analytics-sections.tsx:59`
- **Problem:** khung giảm `h-64` → `h-52` nhưng bán kính cố định 80 (đường kính 160 > ~152 chỗ trống).
- **Impact:** đỉnh hình tròn và nhãn bị cắt, đáy đè lên chú thích.
- **Fix:** trả khung về `h-64`.
- **Confidence:** confirmed · **Found by:** adversarial

### ARCH-3 · Architecture & Design › bố cục — thẻ lật ở trang học flashcard tràn chữ sớm hơn (đã sửa)
- **Where:** `src/pages/study-flashcard/FlashcardStudyPage.tsx:442,460`
- **Problem:** `min-h` 340/400 → 280/320; mặt sau định vị tuyệt đối, không có xử lý tràn.
- **Impact:** đáp án dài (~4 dòng trên điện thoại) tràn ra ngoài thẻ, đè lên nhãn và gợi ý.
- **Fix:** `min-h` 320/380; vùng chữ (trừ đệm) giờ ≥ trước.
- **Confidence:** confirmed · **Found by:** adversarial

## P2 · Medium — fix in this change or defer with an issue

### ARCH-4 · Architecture & Design › số liệu — 3 ô đếm ở đầu trang chỉ tính trang đang tải (đã sửa)
- **Where:** `src/pages/k/my-exams-types.ts` (`myExamsView.showOverview`), `src/pages/k/MyExamsPage.tsx`
- **Problem/Impact:** người có hơn 50 lượt thi thấy số đếm của riêng trang hiện tại như thể tổng.
- **Fix:** chỉ hiện ô đếm khi danh sách nằm gọn trong một trang và tải thành công.
- **Confidence:** confirmed · **Found by:** adversarial

### TEST-1 · Testing & Maintainability › trùng code + thiếu ca ngưỡng — `formatTimeAgo` chép lại và test yếu (đã sửa)
- **Where:** `src/pages/k/my-exams-types.ts` (`formatAttemptTime`), `src/pages/k/my-exams-types.test.ts`
- **Problem:** bản chép của `lib/history/history-format.ts` lệch bản gốc ("Invalid Date" khi ngày hỏng); test không có ca ngưỡng, 3/5 đột biến vẫn xanh; ca "ngày" so hàm với chính nó.
- **Fix:** dưới 1 tuần gọi `formatTimeAgo` dùng chung, từ 1 tuần hiện ngày, ngày hỏng → ""; test ngưỡng 1/59/60 phút, 23 giờ, 1 ngày, 7 ngày − 1 phút, đúng 7 ngày, tương lai, ngày hỏng (đỏ trước khi sửa).
- **Confidence:** confirmed · **Found by:** quality + adversarial

### TEST-2 · Testing & Maintainability › test phụ thuộc môi trường — test ngày đổi kết quả theo múi giờ (đã sửa)
- **Where:** `src/pages/k/my-exams-types.test.ts` (describe `formatAttemptTime`)
- **Problem/Impact:** máy CI ở UTC−8 hay UTC+14 thì test đỏ (`5/11` thay vì `6/11`).
- **Fix:** mốc thời gian dựng theo giờ địa phương; đã chạy xanh dưới America/Los_Angeles và Pacific/Kiritimati.
- **Confidence:** confirmed (đã tái hiện) · **Found by:** adversarial (vòng soát lại)

## P3 · Low — optional (tất cả đã sửa)

- **ARCH-5** · trạng thái mở/thu gọn không theo URL; "Thu gọn" ở trang ≥ 2 giấu phân trang; bấm trang 1 thì thu gọn — `MyExamsPage.tsx` (`toggleExpanded`, `handlePageChange`), `my-exams-types.ts` (`myExamsView`).
- **ARCH-6** · mặt thẻ flashcard xem trước gần như hết khoảng trống — `flashcard-result-preview.tsx:21` (`max-h-36`).
- **ARCH-7** · khung chờ tải danh sách phòng học thấp hơn thẻ thật — `StudyRoomListPage.tsx` (`h-40`).
- **ARCH-8** · trang công khai thu nhỏ cả hàng của mục (không phải thẻ) và chữ trích dẫn — hoàn lại `FeatureShowcase.tsx`, các bước `ProductShowcase.tsx`, trích dẫn `TestimonialsSection.tsx`, khoảng số liệu `AboutSection.tsx:98`; số đếm `MetricsSection.tsx` chỉ giảm một bậc.
- **ERR-1** · tải lỗi hiện "Chưa có bài thi nào" kèm ô đếm 0/0/0, lỗi bị nuốt — `MyExamsPage.tsx` (trạng thái `failed`, ghi log, "Không tải được danh sách bài thi" + Thử lại).
- **ERR-2** · trả lời chậm của trang cũ ghi đè trang mới — `MyExamsPage.tsx` (`latestLoad`).
- **TEST-3** · logic mở/thu gọn, phân trang, ô đếm nằm trong component nên không test được — tách `myExamsView`, 6 test viết trước.
- **CODE-1** · ngày hỏng vẫn hiện biểu tượng lịch cạnh nhãn rỗng — `session-card.tsx` (`ExamMeta`).

## Notes
- Thay đổi không phải class ngoài trang Bài thi của tôi chỉ có: bỏ `size="lg"` ở 3 nút, số chiều cao biểu đồ admin, `viewBox` của `ProgressCircle` (giữ đúng tọa độ), kích thước ảnh ở `HistoryTemplate`. `package.json`/`yarn.lock` không đổi.
- 43 chỗ dùng `Card` (kể cả 10 file ngoài diff) đều đã tự có đệm sau khi bỏ đệm 24px của antd.

## Coverage by dimension
| # | Dimension | Status | P0 | P1 | P2 | P3 |
|---|---|---|---|---|---|---|
| 1 | Security | checked — clean (không XSS/redirect mới; SVG không có script; không có dependency mới) | 0 | 0 | 0 | 0 |
| 2 | Performance & Optimization | checked — clean (danh sách tối đa 50 lượt/trang, không vòng lặp nặng) | 0 | 0 | 0 | 0 |
| 3 | Clean Code & Readability | checked | 0 | 0 | 0 | 1 |
| 4 | Error Handling & Logging | checked | 0 | 0 | 0 | 2 |
| 5 | Architecture & Design | checked | 0 | 3 | 1 | 4 |
| 6 | Testing & Maintainability | checked | 0 | 0 | 2 | 1 |

## Spec compliance
Xem `stage1-spec.md`: 6 PASS, 2 EXTRA (tiêu đề trang admin 30 → 24px; lề tiêu đề danh mục/hội thoại/bài viết `px-4`), cả hai đã báo người dùng.

## Done well
- Bỏ đệm hai lớp của `Card` ở một chỗ (`src/components/antd/card.tsx`) thay vì sửa 43 file.
- Logic mới của trang Bài thi của tôi là hàm thuần có test (`my-exams-types.ts`: `examOverview`, `splitByProgress`, `stableIndex`, `formatAttemptTime`, `myExamsView`).
- Chữ câu hỏi/đáp án khi làm bài và chữ nội dung đọc giữ nguyên cỡ.

## Actions in order
Không còn việc bắt buộc. Nên làm: mở các trang cần đăng nhập trên dev server (5173) để xem giao diện thật — nhất là màn xem lại kết quả bài thi, các panel phòng học, trang công cụ AI, trang học flashcard, thống kê phiên thi.

## Rejected and deferred
| ID | Title | Disposition | Reason or issue |
|---|---|---|---|
| AL-4 | Kết quả đã nộp luôn màu xanh, "—"/"0%" | Rejected | Đúng ảnh thiết kế; đã báo người dùng |
| AL-6 (múi giờ) | Không ép `Asia/Ho_Chi_Minh` | Rejected | Hiện theo múi giờ người xem là đúng |
| AL-7 | id không encode trong `resumeUrl` | Rejected | Code chuyển nguyên, id cuid do server sinh, tiền tố cố định |
| AL-8 / R4 | Ghim: rollback nhầm trang, cache không cập nhật | Rejected | Code ghim và cache không đổi trong diff, có từ trước |
| CODE-2 | Skeleton ghi cứng 4 | Rejected | Chỗ giữ chỗ, không cần bằng `PREVIEW_COUNT` |
| ARCH-3 (quality) = LY-6 | Bỏ `size="lg"` ở 3 nút | Rejected | Đúng thang của plan, nút vẫn 34px |
| ARCH-4 (quality) | `styles` trước `{...props}` trong `Card` | Rejected | Props là `ComponentProps<"div">`, không có `styles` |
| LY-4 (`ManageExamRoomPage`) | Skeleton lệch | Rejected | Có từ trước |
| LY-5 | `py-12` trạng thái rỗng, `space-y-6` admin | Rejected | Không thuộc thang / là khoảng giữa các mục của trang |
| LY-7 (`CoralCallout`, khung code) | Thu nhỏ quá phạm vi | Rejected | Là thẻ → đúng phạm vi |
| R5 | Số liệu phòng bị chia qua 2 trang | Rejected | `groupBySession` không đổi, có từ trước |
| R6 | `?page=` vượt số trang | Rejected | Chỉ khi tự gõ URL; trạng thái rỗng vốn vậy |
| R7 | Vùng chữ flashcard xem trước thấp hơn | Rejected | Đúng chủ ý thu nhỏ, vẫn cuộn được |

## Not verified
- Các trang cần đăng nhập (/k, admin, phòng học, làm bài, học flashcard) chưa được xem bằng trình duyệt: không được dùng phiên đăng nhập của người dùng hay tạo dữ liệu mới. Chỉ xem được /login, /about, /contact, trang chủ.
- Không soát lại vòng 3 cho phần sửa vòng 2 (nhỏ, Low hoặc chỉ là test, đã có test chứng minh).

Kiểm chứng trên cây cuối: `yarn tsc --noEmit -p tsconfig.json` exit 0; `yarn eslint` 128 file đổi exit 0 (0 lỗi, 13 cảnh báo có từ trước); `yarn test` 31 file / 229 test exit 0; `TZ=America/Los_Angeles yarn vitest run src/pages/k/my-exams-types.test.ts` 23/23; `yarn build` exit 0.
