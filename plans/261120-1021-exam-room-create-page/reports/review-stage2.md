# Code Review — thay đổi chưa commit (trang tạo phòng thi + luật làm bài) · Stage 2

**Verdict:** REWORK — không có P0. Một race trên `/progress` có thể ghi đè đáp án của bài đã nộp, cần sửa trước khi merge.
**Score:** 8/10 · **Accepted:** P0 0 · P1 0 · P2 3 · P3 4 · **Rejected:** 0 · **Deferred:** 0
**Scope:** 39 file (23 sửa + 16 mục chưa track), +420/−106 lines ở phần sửa · stages: spec pass · quality reviewer subagent · adversarial không thuộc báo cáo này (Stage 3 chạy riêng)

## P0 · Critical
None.

## P1 · High
None.

## P2 · Medium

### ERR-1 · Error Handling › Concurrency — `/progress` ghi không kiểm trạng thái, có thể đè đáp án bài đã COMPLETED
- **Where:** `kmaedu-be/apps/assessment-service/src/modules/examattempt/examattempt.service.ts:375` (kiểm tra status ở :349-355)
- **Problem:** `updateExamAttemptProgress` đọc status rồi `update({ where: { id } })`, không có `status: IN_PROGRESS` trong `where`. Ba đường nộp bài đã được khóa bằng điều kiện này (`handIn`, `secure-submit`) nhưng `/progress` thì không.
- **Impact:** Nút nộp bài, `/leave` lúc pagehide và autosave debounce chạy gần nhau. Nếu autosave tới sau hand-in, nó ghi đè `answers` (khóa `q_<index>`) lên bài đã chấm. Điểm giữ nguyên, nhưng màn xem lại đáp án và dữ liệu lưu bị lệch. Luồng `/leave` mới làm cửa sổ này dễ xảy ra hơn. Kế hoạch ghi "chỉ ghi khi IN_PROGRESS" cho ba đường nộp; `/progress` nằm ngoài nên không vi phạm hợp đồng, nhưng cùng một lớp lỗi.
- **Fix:** `where: { id: attemptId, status: EXAM_ATTEMPT_STATUS.IN_PROGRESS }`, bắt `P2025` rồi trả 400 "đã nộp" như `secure-submit`; thêm một test song song.
- **Confidence:** plausible · **Found by:** quality

### ERR-2 · Error Handling › Contract/clock — luồng nộp quá hạn dựa vào đồng hồ máy khách
- **Where:** `kmaedu-fe/src/pages/exam-session/ExamQuizPage.tsx:137,143` và `:441` (`doSubmit` không có fallback)
- **Problem:** Fallback `/submit` khi token hết hạn (400) chỉ chạy khi `late = Date.now() >= deadline`. Máy khách chạy chậm hơn server quá 30 giây thì `late=false`, token đã chết, `secure-submit` trả 400, không có fallback. Auto-submit báo lỗi và dừng. Nộp tay qua `doSubmit` (:441) cũng không có fallback, nên thí sinh không nộp được bằng UI cho tới khi tải lại.
- **Impact:** Thí sinh có đồng hồ lệch kẹt ở trang làm bài, bài vẫn IN_PROGRESS. Kế hoạch đã ghi rủi ro "đồng hồ máy khách" nhưng chưa xử lý lối thoát.
- **Fix:** Fallback theo mã 400 của secure-submit, không theo `late` (hoặc đo độ lệch giờ từ header `Date` của response secure-quiz rồi trừ vào deadline). Dùng chung cho `doSubmit`.
- **Confidence:** plausible · **Found by:** quality

### TEST-1 · Testing › Coverage of failure paths — hook rời trang chưa test được đường lỗi hand-in và 401
- **Where:** `kmaedu-fe/src/pages/exam-session/use-leave-hand-in.ts:42-49` (keepalive `.catch(() => {})`), `:70-78` (`confirmLeave` nuốt lỗi)
- **Problem:** Test hiện có (9 case) phủ đường thành công, bfcache, blocker, refresh định kỳ. Không có case nào cho `/leave` lỗi hoặc 401 khi token hết hạn. Lỗi bị nuốt, thí sinh rời đi mà bài vẫn mở, chỉ có comment nói host kết thúc được. Hành vi này nên có test và được ghi rõ cho host.
- **Fix:** Thêm test `confirmLeave` khi API reject (vẫn `proceed`), và thêm `console.warn` hoặc toast ngắn để có dấu vết.
- **Confidence:** confirmed · **Found by:** quality

## P3 · Low

### ARCH-1 · Architecture › Cohesion — `ExamQuizPage.tsx` đã 960 dòng và tăng thêm ~60
- **Where:** `kmaedu-fe/src/pages/exam-session/ExamQuizPage.tsx:1` (quy tắc 200 dòng/file)
- **Problem:** Logic hạn chót (`secondsLeft`, `pastDeadline`, các state luật) được thêm thẳng vào file đã quá lớn.
- **Fix:** Tách hook `useAttemptDeadline` (deadline, secondsLeft, pastDeadline) ra file riêng ở lần chạm tới.

### ARCH-2 · Architecture › Live rules — sửa phiên đang chạy đổi hạn của bài đang làm
- **Where:** `kmaedu-be/apps/assessment-service/src/modules/examsession/examsession.service.ts:520`
- **Problem:** `durationMinutes` được đọc trực tiếp, nên host giảm số phút giữa kỳ thi thì bài đang làm bị `/progress` 409 sớm hơn, trong khi token cũ còn sống đến hạn cũ. FE đếm lùi theo `deadline` đã tải lúc mở trang nên không biết hạn đã đổi.
- **Fix:** Khóa 3 trường khi phiên đã có bài IN_PROGRESS, hoặc ghi rõ trong UI rằng chỉ áp cho lượt làm mới.

### ERR-3 · Error Handling › Contract — `/cheatinglogs` và `/leave` trả 201, hợp đồng ghi 200
- **Where:** `kmaedu-be/apps/assessment-service/src/modules/examattempt/examattempt.controller.ts:113`, `kmaedu-be/apps/assessment-service/src/modules/cheatinglog/cheatinglog.service.ts:50`
- **Problem:** Lệch bảng hợp đồng trong plan (báo cáo phase 1 đã ghi nhận). FE dùng axios nên không ảnh hưởng.
- **Fix:** Sửa plan cho khớp (khuyến nghị) hoặc thêm `@HttpCode(200)`.

### CODE-1 · Clean Code › Dead code — dòng trống thừa và import có thể thừa sau khi bỏ modal tạo
- **Where:** `kmaedu-fe/src/pages/k/ManageExamRoomPage.tsx:61-62` (hai dòng trống liên tiếp sau `quizSetOptions`)
- **Problem:** Còn dư dòng trống sau khi xóa `handleCreate`. `quizSetsLoading` và `quizSetOptions` vẫn dùng cho modal sửa nên giữ.
- **Fix:** Xóa một dòng trống.

## Notes
- Migration `20261120103000_exam_session_attempt_rules`: `ADD COLUMN` với `DEFAULT` hằng, kiểu expand. Postgres 11+ không viết lại bảng, chỉ giữ ACCESS EXCLUSIVE rất ngắn. Có `SET lock_timeout = '5s'` (đổi lại: có thể fail nhanh khi có giao dịch dài, deploy cần thử lại). Ba cột nullable hoặc có default, app cũ chạy bình thường khi rolling deploy. `ExamSession` là bảng nhỏ (số phiên, không phải số bài làm), số dòng giả định dưới 100k. Rollback: Prisma không có down, chỉ `DROP COLUMN` thủ công, mất cấu hình đã nhập; plan đã ghi. Không có backfill. Không chạy dry run (không yêu cầu).
- Gateway: `/api/v1/examattempts` match theo prefix, `auth: required`, rate limit mặc định 100/phút, nên `/leave` đã có đường vào; không cần sửa `routes.yaml`.
- `/leave` chỉ tác động bài của chính người gọi (`findFirst` theo `userId`), người khác nhận 404; `authz-matrix` có dòng mới với TEACHER bị 403.
- Hai tab cùng một bài: đóng một tab nộp bài của tab kia. Đã nằm trong rủi ro đã biết của plan.

## Coverage by dimension
| # | Dimension | Status | P0 | P1 | P2 | P3 |
|---|---|---|---|---|---|---|
| 1 | Security | checked — clean (IDOR, quyền, validate body đều ổn) | 0 | 0 | 0 | 0 |
| 2 | Performance & Optimization | checked — clean (không thêm query lặp; `cheatinglog` thêm một `select` lồng) | 0 | 0 | 0 | 0 |
| 3 | Clean Code & Readability | checked | 0 | 0 | 0 | 2 |
| 4 | Error Handling & Logging | checked | 0 | 0 | 2 | 1 |
| 5 | Architecture & Design | checked | 0 | 0 | 0 | 1 |
| 6 | Testing & Maintainability | checked | 0 | 0 | 1 | 0 |

(ARCH-1 tính vào Clean Code theo quy tắc kích thước file; ARCH-2 vào Architecture.)

## Spec compliance
| # | Requirement | PASS / MISSING / EXTRA | Evidence |
|---|---|---|---|
| 1 | 3 cột mới, expand migration | PASS | `migration.sql`, `schema.prisma:90-93` |
| 2 | DTO tạo/sửa nhận 3 trường, view host trả đủ | PASS | `create-examsession.dto.ts`, `update-examsession.dto.ts`, `examsession.service.ts:168,518` |
| 3 | secure-quiz trả `deadline`, cờ; token chết ở deadline+30s | PASS | `examattempt.service.ts:1526-1576`, `attempt-deadline.ts` |
| 4 | `/progress` sau deadline+30s trả 409 | PASS | `examattempt.service.ts:357` |
| 5 | Cheating log bị bỏ qua khi tắt chống gian lận | PASS (201, không phải 200: ERR-3) | `cheatinglog.service.ts:49` |
| 6 | `/leave` nộp khi không cho thoát; 404 người khác | PASS | `examattempt.service.ts:485-509`, controller |
| 7 | Ba đường nộp chỉ ghi khi IN_PROGRESS | PASS (riêng `/progress` chưa: ERR-1) | `examattempt.service.ts:455,1682` |
| 8 | Trang `/k/manage-exam-room/new`, stepper 4 bước, một toast gộp | PASS | `ManageExamRoomCreatePage.tsx`, `use-create-exam-room.ts:62-66` |
| 9 | Form phiên có 3 trường; thẻ phòng hiện thời gian tạo | PASS | `ExamSessionFormModal.tsx`, `room-detail-cards.tsx:50` |
| 10 | Trang làm bài: beforeunload, pagehide keepalive bỏ qua bfcache, useBlocker, keep-alive session, đếm ngược theo deadline | PASS | `use-leave-hand-in.ts`, `ExamQuizPage.tsx` |
| 11 | Fallback `/submit` hẹp sau deadline | PASS có điều kiện (ERR-2) | `ExamQuizPage.tsx:143` |

## Done well
- `attempt-deadline.ts`: hàm thuần, có hằng grace riêng, test 100% line/branch, tách khỏi service (`attempt-deadline.ts:1-60`).
- `handIn()` gom `/submit` và `/leave` vào một đường, `where` kèm `status IN_PROGRESS` và bắt `P2025` (`examattempt.service.ts:440-478`).
- Migration có `lock_timeout`, mặc định giữ nguyên hành vi phiên cũ.
- `LeaveAttemptSchema` nhận body rỗng cho pagehide (`progress.dto.ts:12`); FE dùng `fetch keepalive` thay `sendBeacon` (đúng Content-Type), bỏ qua `persisted` bfcache.
- Store tạo phòng/phiên có `silent`, partial failure (phòng tạo được, phiên không) được xử lý và dẫn tới tab phiên thi.
- Hook tách khỏi page, có 9 test cho hook và test riêng cho `activeSectionIndex`, `create-room-draft`.

## Actions in order
1. ERR-1: thêm `status: IN_PROGRESS` vào `where` của `/progress`, map P2025 thành 400, kèm test song song.
2. ERR-2: fallback `/submit` theo mã 400 (cả auto-submit lẫn `doSubmit`), hoặc bù lệch giờ server.
3. TEST-1: test lỗi cho `confirmLeave` / `/leave` và để lại dấu vết.
4. P3: ARCH-1, ARCH-2, ERR-3, CODE-1 làm hoặc ghi nhận.

## Rejected and deferred
| ID | Title | Disposition | Reason or issue |
|---|---|---|---|
| – | – | – | Chưa qua bước adjudication của main session |

## Not verified
- Không chạy lại test, vì đã có bản ghi exit 0 cho cây hiện tại (FE 575/575, BE 639/639, typecheck, ownership, deps, lint-migrations).
- Không chạy dry run migration và không kết nối DB nào.
- Chưa mở trình duyệt: hành vi `beforeunload` / `pagehide` / `useBlocker` thật trên Safari và di động chưa kiểm chứng; chỉ đọc code và test jsdom.
- Chưa đọc kỹ từng component trình bày (`basic-info-section`, `review-*`, `rules-section`, stepper), chỉ xem kích thước và logic ở hook, page, draft.
