# Phase 1 (backend): báo cáo

Trạng thái: DONE_WITH_CONCERNS. Chưa commit, chưa chạy migration lên DB nào.

## File đã đổi (kmaedu-be/apps/assessment-service trừ khi ghi khác)
- `prisma/schema.prisma`: `ExamSession.durationMinutes Int?`, `antiCheatEnabled Boolean @default(true)`, `allowLeaveMidway Boolean @default(true)`.
- `prisma/migrations/20261120103000_exam_session_attempt_rules/migration.sql` (mới, khớp `prisma migrate diff` từ schema HEAD).
- `src/modules/examattempt/attempt-deadline.ts` (mới): `attemptDeadline`, `isPastDeadline`, `tokenExpirySeconds`, `minutesUntilDeadline`, `ATTEMPT_DEADLINE_GRACE_MS = 30000`, `AttemptDeadlinePassedException` (409 `ATTEMPT_DEADLINE_PASSED`).
- `src/modules/examattempt/examattempt.service.ts`: secure-quiz trả `deadline`/`antiCheatEnabled`/`allowLeaveMidway`, token hết hạn ở hạn + 30 s; `/progress` chặn sau hạn + 30 s; `/submit` và `/leave` dùng chung `handIn()`; thêm `leaveExamAttempt`.
- `src/modules/examattempt/examattempt.controller.ts`: `POST /examattempts/:id/leave` (`@RequirePermissions('exam:take')`).
- `src/modules/examattempt/dto/progress.dto.ts`: `LeaveAttemptSchema` / `LeaveAttemptDto` (body `/progress`, có thể vắng).
- `src/modules/examsession/dto/create-examsession.dto.ts`, `update-examsession.dto.ts`, `examsession.service.ts`: nhận và lưu 3 trường.
- `src/modules/cheatinglog/cheatinglog.service.ts`: phiên tắt chống gian lận thì trả `{ logged: false }`, không ghi.
- `kmaedu-be/test/authz/authz-matrix.rows.ts`: thêm dòng cho `/leave`.
- `CLAUDE.md` (gốc): một câu trong mục `assessment-service`.

## Migration
```sql
ALTER TABLE "ExamSession" ADD COLUMN "durationMinutes" INTEGER,
ADD COLUMN "antiCheatEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "allowLeaveMidway" BOOLEAN NOT NULL DEFAULT true;
```

## Response
- `GET /examattempts/:id/secure-quiz`: thêm `deadline: string | null` (ISO), `antiCheatEnabled: boolean`, `allowLeaveMidway: boolean`; `timeLimitMinutes` = floor(phút từ `startedAt` tới `deadline`), `null` khi không có hạn.
- `PUT /examattempts/:id/progress` sau hạn + 30 s: 409 `{ statusCode: 409, code: 'ATTEMPT_DEADLINE_PASSED', message }`.
- `POST /cheatinglogs` khi tắt: `{ logged: false }` (status mặc định của `@Post` là 201, như nhánh bật).
- `POST /examattempts/:id/leave`: `{ handedIn: true, score, correctAnswers, totalQuestions }` hoặc `{ handedIn: false }`; người khác 404 (status 201 như `/submit`).
- View host (`get-by-id`, `list`, chi tiết phòng, create/update) trả nguyên dòng nên tự có 3 trường.

## Test (đỏ trước, xanh sau)
- `attempt-deadline.spec.ts`: 13 test (đỏ 11 trên stub, xanh 13).
- `examattempt.service.attempt-rules.spec.ts`: 14 test (đỏ 10 trên stub, xanh 14).
- `cheatinglog.service.spec.ts`: 3 test (đỏ 1, xanh 3).
- `examsession.service.attempt-rules.spec.ts`: 7 test (đỏ 6, xanh 7).
- `dto/progress.dto.spec.ts`: 3 test (viết sau khi code, không có pha đỏ).

## Lệnh và exit code
- `yarn typecheck:assessment`: 0
- `yarn test test/authz`: 0 (12 suite, 414 test)
- `yarn test apps/assessment-service`: 0 (32 suite, 224 test, trước khi thêm dòng matrix; dòng matrix chỉ đổi test/authz)
- `yarn check:ownership`: 0
- `CHANGED_FILES=<migration> scripts/lint-migrations.sh HEAD`: 0 (script chỉ quét file đã commit trong diff, file chưa track thì truyền qua `CHANGED_FILES`)
- Coverage: `attempt-deadline.ts` 100% line/branch.

## Điều cần lưu ý
1. Secure-submit sau hạn + 30 s: mọi token đều hết hạn, nhánh "không token nào hợp lệ" có sẵn trả 400 và bài vẫn IN_PROGRESS; tải lại cũng chỉ nhận token sống 1 s. FE nên nộp trong 30 s ân hạn, hoặc khi gặp lỗi đó thì gọi `/submit` (chấm trên đáp án đã lưu). Nếu muốn backend tự xử lý thì cần một quyết định riêng cho secure-submit.
2. `ExamSession.timeLimitMinutes` cũ vẫn còn trong schema (không DTO nào ghi); hợp đồng dùng `durationMinutes` nên không đụng tới.
3. `/submit` và `/leave` chạy song song có thể ghi đè nhau (giữ nguyên kiểu `update` theo id như trước).
4. `/leave` đọc body JSON: `navigator.sendBeacon` gửi `text/plain` nên body bị bỏ qua (vẫn nộp trên đáp án đã lưu). FE nên dùng `fetch(..., { keepalive: true, credentials: 'include', headers: { 'Content-Type': 'application/json' } })`.
5. Hợp đồng ghi 200 cho `/cheatinglogs` khi tắt; endpoint giữ status mặc định 201 như nhánh bật (axios coi cả hai là thành công).
