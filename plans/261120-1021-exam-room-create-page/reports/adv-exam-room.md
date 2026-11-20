# Adversarial review: trang tạo phòng thi + 3 thiết lập phiên thi

Base HEAD 4fc2072, diff chưa commit. Chỉ liệt kê vấn đề. Không tính các mục Stage 2 đã báo (progress không chặn theo IN_PROGRESS, /submit fallback phụ thuộc giờ máy khách, /leave keepalive nuốt lỗi, cỡ ExamQuizPage, sửa durationMinutes giữa chừng, 201 vs 200, dòng trống ManageExamRoomPage).

Không có thay đổi package.json hay lockfile trong diff, nên mục Supply không có phát hiện.

## Tóm tắt

| ID | Mức | Vị trí | Một dòng |
|---|---|---|---|
| A1 | Critical | examattempt.service.ts:1516-1531, 1586; attempt-deadline.ts:35-39 | Tạo lại token câu hỏi sau hạn rồi secure-submit trong 1 giây: hạn làm bài chỉ chặn ở client |
| A2 | Medium | examattempt.service.ts (không có reaper), ExamQuizPage / startExamAttempt:187 | Bài quá hạn mà không ai nộp thì ở IN_PROGRESS mãi, không được chấm |
| A3 | Medium | use-leave-hand-in.ts:39-50, 66-80 | "Không thoát giữa chừng" chỉ do client ép, ngắt mạng hoặc lỗi thì rời đi rồi quay lại làm tiếp |
| A4 | Medium | useExamRoomDetailStore.ts:122-146, 172-190; ExamSessionFormModal.tsx:298-303 | State cục bộ không có 3 trường mới, lần sửa sau ghi đè bằng giá trị mặc định |
| A5 | Medium | create-room-draft.ts:92-93; examattempt.service.ts:~245 | "Số lần tham gia" N được gửi thành maxAttempts=N, backend cộng thêm 1 lượt đầu: thí sinh được N+1 lần |
| A6 | Low | use-create-exam-room.ts:65-67 | Lỗi tạo phiên bị nuốt hoàn toàn, host không biết vì sao (bộ đề quá lớn, số câu vượt) |
| A7 | Low | create-room-draft.ts:90; use-create-exam-room.ts:65 | startTime lấy từ giờ máy host: máy chạy nhanh thì phiên "chưa bắt đầu" |
| A8 | Low | examsession-public.mapper.ts:62-80; examattempt.service.ts:538-546; student-exam.service.ts:69-77 | Cột cũ timeLimitMinutes vẫn được phát, không phản ánh durationMinutes; thí sinh không thấy luật trước khi vào |
| A9 | Low | examattempt.service.ts:485-519 | Hand-in do /leave không để lại dấu vết lý do, host và hỗ trợ không phân biệt được |
| A10 | Low | 20261120103000_exam_session_attempt_rules/migration.sql:1 | lock_timeout 5s làm migration fail đúng lúc đang có phiên thi, Prisma kẹt P3009 |
| A11 | Low | ExamQuizPage.tsx:175 | handleAutoSubmit dùng deadline nhưng không có trong deps, closure có thể cũ |
| A12 | Low | use-create-exam-room.ts:57-75 | Chống double-click chỉ dựa vào disabled của state, không có ref guard |

## Chi tiết

### A1. Critical / Security: hạn làm bài bị vượt qua bằng cách tạo lại token

- LOCATION: kmaedu-be/apps/assessment-service/src/modules/examattempt/examattempt.service.ts:1516-1531 (`getSecureQuizQuestions`), :1586 (`submitSecureExamAttempt`); attempt-deadline.ts:35-39 (`tokenExpirySeconds`, sàn 1 giây).
- ATTACK: thí sinh có bài IN_PROGRESS đã qua `deadline + 30s` (bỏ tab, hoặc phiên chỉ có `durationMinutes`, hoặc `endTime` đã qua). Gọi `GET /examattempts/:id/secure-quiz`. Endpoint này không kiểm tra `status` hay `isPastDeadline`, và `tokenExpirySeconds` trả `max(1, ...)` nên vẫn phát token sống 1 đến 2 giây cho từng câu. Script lấy token rồi gọi ngay `POST /examattempts/:id/secure-submit` với bộ đáp án chọn tuỳ ý (tra cứu từ nguồn ngoài). `submitSecureExamAttempt` không kiểm tra hạn, chỉ dựa vào hạn của JWT, và `answers` do client gửi hoàn toàn, không bị ràng buộc với tiến độ đã lưu. Rate limit mặc định 100 request mỗi phút không cản được. Vì `secure-quiz` và `secure-submit` nhận thẳng `attemptId`, chuyện `startExamAttempt` từ chối sau `endTime` (dòng 203) không áp dụng.
- IMPACT: hợp đồng "câu trả lời sau hạn không được tính vì token đã hết hạn" sai. Hạn làm bài và `endTime` chỉ được ép ở `/progress`. Thí sinh nộp được bài chấm điểm bất kỳ lúc nào sau hạn, kể cả nhiều giờ hoặc nhiều ngày sau, miễn bài còn IN_PROGRESS. Đồng thời đọc được nội dung câu hỏi sau hạn để chia sẻ. Sàn 1 giây còn cho thấy thiết kế cố ý vẫn cấp token sau hạn.
- FIX: chặn từ gốc. `secure-quiz` chỉ phát token khi bài IN_PROGRESS và chưa `isPastDeadline` (quá hạn thì trả 409 `ATTEMPT_DEADLINE_PASSED`, hoặc không kèm câu hỏi). Bỏ sàn 1 giây cho token. `secure-submit` kiểm tra `isPastDeadline` ở server và khi quá hạn thì chấm theo đáp án đã lưu (như `/submit`) thay vì nhận `answers` từ client. Thêm test: gọi secure-quiz rồi secure-submit sau hạn phải không nhận đáp án mới.

### A2. Medium / Failure: bài quá hạn không bao giờ được đóng

- LOCATION: examattempt.service.ts (không có job nào đóng bài quá hạn); startExamAttempt:187-226.
- ATTACK: thí sinh làm bài, đóng trình duyệt, tắt mạng hoặc `/leave` thất bại. Server không có reaper cho bài quá `deadline` hay `endTime` (khi `endTime` tự qua, không có gì nộp hộ; chỉ nút "kết thúc phòng" mới nộp hộ).
- IMPACT: bài giữ IN_PROGRESS với điểm 0 trong bảng điểm của host, không được chấm theo đáp án đã lưu. Phiên chỉ có `durationMinutes` (không `endTime`) thì `startExamAttempt` vẫn cho "tiếp tục" bài đã hết hạn, và thí sinh `maxAttempts=1` không thể làm bài mới. Với tắt "thoát giữa chừng", đây chính là đường mà bài lẽ ra phải tự nộp.
- FIX: tác vụ định kỳ (hoặc chấm lười khi đọc) hand-in mọi bài IN_PROGRESS có `isPastDeadline`, dùng chung `handIn` với guard trạng thái. `startExamAttempt` khi gặp bài đã quá hạn thì nộp nó rồi cho tính lượt, thay vì resume.

### A3. Medium / Race + Assumption: luật "không thoát giữa chừng" chỉ do client ép

- LOCATION: kmaedu-fe/src/pages/exam-session/use-leave-hand-in.ts:39-50 (pagehide), :66-80 (`confirmLeave`).
- ATTACK: server không có heartbeat hay chuyển trạng thái nào khi thí sinh rời đi, nên `allowLeaveMidway=false` chỉ có hiệu lực khi `/leave` tới được server. Thí sinh bật chế độ máy bay (hoặc chặn request `/leave` bằng devtools) rồi đóng tab, hoặc bấm link nội bộ khi mạng lỗi. `confirmLeave` nuốt lỗi và vẫn gọi `blocker.proceed()` (dòng 71-77), nên cũng rời đi trong khi `/leave` fail (401 do hết phiên, 5xx, 409).
- IMPACT: bài vẫn IN_PROGRESS, thí sinh quay lại qua `startExamAttempt` (resume) và làm tiếp, tức là rời trang, tra cứu rồi quay lại, đúng điều luật cấm. Kết hợp A2, không có gì nộp hộ. Chuyện "lỗi bị nuốt" Stage 2 đã báo, mục này là hệ quả: luật không thể ép được khi chỉ có client.
- FIX: ép ở server. Khi `allowLeaveMidway=false`, lưu thời điểm hoạt động cuối (heartbeat qua `/progress`), và resume một bài đã im quá ngưỡng ngắn thì nộp bài thay vì cho tiếp tục. Trong `confirmLeave`, không `proceed()` khi `/leave` lỗi: báo lỗi và cho thử lại.

### A4. Medium / Data: state cục bộ thiếu 3 trường mới, lần sửa sau ghi đè giá trị thật

- LOCATION: kmaedu-fe/src/stores/useExamRoomDetailStore.ts:122-146 (`createSession`) và :172-190 (`updateSession`); ExamSessionFormModal.tsx:298-303, :165-168; room-sessions-tab.tsx:52-54.
- ATTACK: host tạo phiên với `allowLeaveMidway=false`, `durationMinutes=45` từ modal trong tab Phiên thi. Store dựng phiên cục bộ theo danh sách trường cố định, không có `durationMinutes`, `antiCheatEnabled`, `allowLeaveMidway`. `submitForm` chỉ gọi `onChanged()`, không tải lại danh sách phiên. Host mở lại modal sửa phiên đó (đổi giờ chẳng hạn): form đọc `sessionAny.durationMinutes ?? null`, `antiCheatEnabled ?? true`, `allowLeaveMidway ?? true`, tức giá trị mặc định, và `submitData` luôn gửi cả ba trường. Tương tự `updateSession` không cập nhật ba trường vào state cục bộ, nên sửa 45 thành 60 rồi mở lại sẽ thấy 45 cũ.
- IMPACT: ghi đè im lặng cấu hình đã đặt (45 phút thành không giới hạn, tắt thoát giữa chừng thành cho phép, chống gian lận tắt thành bật), kể cả giữa lúc có người đang thi. Chỉ hết hiệu lực khi danh sách được tải lại. Luồng từ trang tạo mới thì ổn vì chuyển trang kéo lại danh sách.
- FIX: ghép nguyên `response.examSession` vào state (hoặc thêm ba trường vào hai chỗ ghép). Sau create/update tải lại danh sách với `forceRefresh`. Trong modal sửa, chỉ gửi trường đã đổi để giá trị mặc định không đè lên giá trị thật.

### A5. Medium / Assumption: "Số lần tham gia" lệch một lượt

- LOCATION: kmaedu-fe/src/lib/exam-room/create-room-draft.ts:92-93; backend examattempt.service.ts (startExamAttempt, `totalAllowedAttempts = 1 + examSession.maxAttempts`).
- ATTACK: backend coi `maxAttempts` là số lượt LÀM LẠI, tổng lượt = 1 + maxAttempts (khi `allowRetake=true`). Trang tạo mới gửi `allowRetake: maxAttempts > 1` và `maxAttempts: N`. Chọn "3 lần" thì thí sinh làm được 4 lần; chọn "2 lần" được 3 lần; chỉ "1 lần" đúng. Trang xem lại cũng ghi "3 lần".
- IMPACT: thí sinh được thêm một lượt so với con số host thấy khi duyệt, ảnh hưởng điểm số công bằng.
- FIX: ánh xạ rõ ràng, gửi `maxAttempts = N - 1` (và `allowRetake = N > 1`), hoặc thống nhất ý nghĩa ở backend. Thêm test ghép UI N với tổng lượt thực.

### A6. Low / Observability: lỗi tạo phiên bị nuốt

- LOCATION: kmaedu-fe/src/pages/k/components/exam-room-create/use-create-exam-room.ts:65-67; useExamRoomDetailStore.ts:149-155 (`silent`).
- ATTACK: phòng tạo xong, phiên lỗi (`QUIZSET_TOO_LARGE`, số câu vượt do cache bộ đề 5 phút lệch, `QUIZSET_DELETED`).
- IMPACT: toast chỉ nói "chưa mở được phiên thi", mã lỗi cụ thể bị bỏ vì `silent: true`; host không biết phải sửa gì. Phòng không phiên là trạng thái nửa vời, mà trang chuyển đi ngay nên nút thử lại biến mất.
- FIX: lấy `createSessionErrorMessage(code)` đưa vào mô tả toast cảnh báo. Giữ lại thông tin để host tạo phiên lại với cấu hình đã nhập (hoặc chuyển kèm tham số).

### A7. Low / Assumption: startTime theo giờ máy host

- LOCATION: create-room-draft.ts:90; use-create-exam-room.ts:65 (`new Date()`).
- ATTACK: đồng hồ máy host nhanh N phút. `startTime` nằm trước giờ server, `startExamAttempt` (dòng 195-197) trả "Phiên thi chưa bắt đầu" trong N phút kể cả cho host thử.
- IMPACT: thí sinh vào phòng ngay sau khi tạo bị từ chối. Cũng đúng cho `endTime` tính theo giờ máy (hạn tham gia lệch).
- FIX: bỏ `startTime` khỏi payload để server đặt `now()` (hoặc trừ độ lệch an toàn như 1 phút).

### A8. Low / Data: cột cũ timeLimitMinutes lệch với durationMinutes

- LOCATION: examsession-public.mapper.ts:62-80 (`pickSession` phát `timeLimitMinutes`, không phát 3 trường mới); examattempt.service.ts:538-546 (`/quiz` tính từ `endTime - startTime`); student-exam.service.ts:69-77 (`timeRemaining` từ cột cũ).
- ATTACK: schema giữ cả `timeLimitMinutes` (luôn null, DTO không bao giờ ghi) lẫn `durationMinutes` mới. `secure-quiz` trả đếm ngược từ `startedAt` đến hạn, còn `/quiz` vẫn trả độ dài phiên, và các trang thí sinh dùng cột cũ.
- IMPACT: trang thông tin phiên và "Tiếp tục làm bài" không hiện giới hạn thời gian hay luật không thoát giữa chừng cho thí sinh trước khi bắt đầu, trong khi đồng hồ bài làm đã chạy từ lúc vào. Hai endpoint trả `timeLimitMinutes` khác nghĩa.
- FIX: đưa `durationMinutes` (và cờ luật) vào view thí sinh; hoặc dùng một cột duy nhất và bỏ cột cũ khỏi mapper. Thống nhất ý nghĩa `timeLimitMinutes` ở `/quiz`.

### A9. Low / Observability: hand-in qua /leave không có lý do

- LOCATION: examattempt.service.ts:485-519 (`leaveExamAttempt`), `handIn` (:440).
- ATTACK: thí sinh tải lại trang (F5) hoặc đóng tab nhầm, sau khi xác nhận hộp thoại của trình duyệt.
- IMPACT: bài bị nộp ngay; `finishedAt` giống nộp tay. Host và hỗ trợ không phân biệt nộp tay, hết giờ hay bị buộc rời, khó giải quyết khiếu nại. Không có log phía server cho hand-in này (khác "end room" có log).
- FIX: ghi lý do (cột `submitReason` hoặc log có `attemptId`, userId, nguồn) và hiển thị cho host.

### A10. Low / Failure: migration lock_timeout

- LOCATION: kmaedu-be/apps/assessment-service/prisma/migrations/20261120103000_exam_session_attempt_rules/migration.sql:1-2.
- ATTACK: `ALTER TABLE "ExamSession"` cần khoá ACCESS EXCLUSIVE; deploy trúng lúc có transaction giữ `ExamSession` quá 5 giây (end-room có timeout 30s, `lockSessionRow` khi bắt đầu bài).
- IMPACT: migration fail; Prisma ghi trạng thái failed, các lần `migrate deploy` sau báo P3009 cho tới khi ai đó `migrate resolve` bằng tay, trong khi entrypoint không bao giờ chạy `migrate resolve`. `SET lock_timeout` còn tồn tại trên phiên kết nối đó cho các lệnh ghi bảng `_prisma_migrations`.
- FIX: dùng `SET LOCAL lock_timeout` trong khối transaction rõ ràng, thêm retry ở bước deploy, và ghi runbook xử lý P3009 cho migration này.

### A11. Low / Race: closure cũ của handleAutoSubmit

- LOCATION: kmaedu-fe/src/pages/exam-session/ExamQuizPage.tsx:175 (deps), :69 (`pastDeadline` đọc state `deadline`).
- ATTACK: `handleAutoSubmit` đọc `pastDeadline()` nhưng `deadline` không có trong deps. Hiện tại `setDeadline` và `setTokenMap` nằm cùng một lô cập nhật nên chưa lộ; chỉ cần ai đó tách chúng ra (hoặc `deadline` đổi sau khi tải lại) là `late` luôn `false`.
- IMPACT: khi `late` sai thì lưu tiến độ 409 không được nuốt, tự nộp văng lỗi và đặt `autoSubmitFailed`, thí sinh kẹt không nộp được.
- FIX: thêm `deadline` vào deps, hoặc đọc `deadline` qua ref.

### A12. Low / Race: nhấn đúp "Tạo phòng thi"

- LOCATION: use-create-exam-room.ts:57-75; ManageExamRoomCreatePage.tsx (nút `disabled={form.submitting}`).
- ATTACK: hai lần bấm rất nhanh (hoặc Enter lặp) trước khi `submitting` kịp hiển thị. Chống lặp chỉ dựa vào `disabled` sinh ra từ state, không có `useRef` guard.
- IMPACT: trong thực tế React xả cập nhật sự kiện rời rạc đồng bộ nên khó xảy ra, nhưng nếu xảy ra thì tạo hai phòng cùng tên và hai phiên. Hai gọi API tuần tự (phòng rồi phiên) cũng không có idempotency key.
- FIX: ref guard đầu `submit`; cân nhắc idempotency key cho tạo phòng.
