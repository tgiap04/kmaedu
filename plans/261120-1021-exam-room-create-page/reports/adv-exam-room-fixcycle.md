# Adversarial re-review (fix-cycle) - exam room create page

Phạm vi: 7 fix trong yêu cầu. Chỉ liệt kê điểm còn lỗi hoặc mới phát sinh.

## F1. Medium - Contract: nhánh quá hạn của secure-submit trả shape khác, thiếu `userAnswer`
- LOCATION: kmaedu-be/apps/assessment-service/src/modules/examattempt/examattempt.service.ts:1611-1613 (gọi submitExamAttempt, trả ở :398-430); FE kmaedu-fe/src/pages/exam-session/ExamQuizPage.tsx:150-160, 643-649
- ATTACK: thí sinh nộp quá deadline+30s (máy ngủ, tab bị throttle, đồng hồ lệch). Server trả kết quả của `submitExamAttempt`: `questions: questions.map(withAnswer)` (snapshot.reader.ts:74) không có `userAnswer`, còn nhánh secure thêm `userAnswer: verifiedAnswers[q.id]` (:1713).
- IMPACT: với `showAnswersAfterSubmit = true`, màn kết quả đếm "chưa trả lời" = toàn bộ câu (`!q.userAnswer`) và "sai" = 0, phần review không hiện đáp án đã chọn, dù điểm đã chấm đúng. Nhánh fallback cũ của FE (submitExamAttemptApi, ExamQuizPage:147) cũng dính, nhưng nay mọi lần nộp trễ đều vào đó. `examAttempt` trả về là cả row (kèm `answers`, `selectedQuestionIds`, id câu hỏi thật) thay vì 4 field, nên lộ id câu hỏi mà đường secure cố giấu.
- FIX: thêm `userAnswer` vào `questions` của submitExamAttempt (theo `answers` đã lưu theo question id), hoặc để secure-submit tự map kết quả về đúng SecureSubmitResponse (pick 4 field của examAttempt).

## F2. Medium - Nhất quán: `maxAttempts` được hiểu 3 kiểu, mapping FE mới tạo hiển thị "3/2"
- LOCATION: kmaedu-fe/src/lib/exam-room/create-room-draft.ts:93-94; examattempt.service.ts:244-255 (startExamAttempt, tổng = 1 + maxAttempts, chỉ đếm COMPLETED); examattempt.service.ts:1175-1182 (createExamAttempt, `attemptCount >= maxAttempts`, đếm mọi attempt); examsession.service.ts:991-994 + kmaedu-fe/src/pages/exam-session/ExamSessionPage.tsx:321-326 (hiển thị `${next}/${maxAttempts}`); ExamSessionFormModal.tsx:159, 525 (nhãn "Số lần làm tối đa")
- ATTACK: chọn 3 lần trên trang tạo -> server lưu `maxAttempts = 2`. Luồng `/start` cho đủ 3 lần (đúng), nhưng ExamSessionPage hiển thị "1/2, 2/2, rồi 3/2". Modal sửa phiên hiện "2" cho phòng vừa tạo với 3 lần, và validate 1-10 như số lần thử lại. Route legacy `POST /examattempts` (createExamAttempt) coi `maxAttempts` là tổng, chặn lần thứ 3. FE hiện không gọi route này, nhưng nó vẫn mở với `exam:take`, nên hai route cho hai đáp án khác nhau trên cùng một session.
- IMPACT: số lần hiển thị lệch số lần thật; giáo viên sửa phiên một lần là đổi luôn tổng số lần mà không biết. Mapping `draft - 1` chỉ đúng với một trong ba nơi đọc.
- FIX: chọn một nghĩa (khuyến nghị: `maxAttempts` = tổng, sửa startExamAttempt `totalAllowedAttempts = maxAttempts` kèm migration/chuyển đổi dữ liệu cũ), hoặc giữ nghĩa "retry" nhưng sửa ExamSessionPage, modal (nhãn và giá trị `+1`) và xóa/đồng bộ createExamAttempt. FE không nên tự trừ 1.

## F3. Low - Race autosave và hand-in: toast lỗi, kẹt không hiện kết quả
- LOCATION: ExamQuizPage.tsx:131-148, 169-176; examattempt.service.ts:386-388 (P2025 -> 400)
- ATTACK: attempt đã được nộp từ chỗ khác (tab thứ hai, /leave, host kết thúc) rồi tab này chạm hết giờ. `updateExamAttemptProgressApi` trả 400 "Bài làm đã được nộp trước đó" (không phải 409, và `late` có thể false do đồng hồ client chậm), `saving.catch` ném lại, đi vào catch ngoài: `setAutoSubmitFailed(true)` + toast.error, vòng retry mỗi giây dừng, màn kết quả không hiện.
- IMPACT: thí sinh đã nộp xong vẫn thấy lỗi và kẹt ở trang làm bài (trước fix, request này ghi đè answers của attempt đã chấm; nay bị chặn nhưng UX vẫn gãy). Beacon beforeunload thì chỉ im lặng, không có tác dụng phụ (đúng).
- FIX: coi 400 "đã nộp" như 409 (hoặc đổi server sang 409 `ATTEMPT_ALREADY_SUBMITTED` có `code`), rồi nạp kết quả từ `/detail`.

## F4. Low - `finishedAt` của hand-in trễ bị ghi theo giờ nộp thực
- LOCATION: examattempt.service.ts:462 (handIn `finishedAt: new Date()`), dùng cho cả nhánh quá hạn ở :1611 và /leave
- ATTACK: thí sinh bỏ tab, vài giờ sau mở lại; hand-in chấm trên dữ liệu đã lưu nhưng `finishedAt` = lúc vừa nộp.
- IMPACT: `timeSpentSeconds` trong overview/candidates vượt xa `durationMinutes` (so với deadline), làm sai thống kê thời gian và xếp hạng theo thời gian nếu có.
- FIX: với nhánh quá hạn dùng `finishedAt = min(now, deadline)`.

## F5. Low - Cửa sổ nhỏ giữa hạn token và `isPastDeadline`
- LOCATION: attempt-deadline.ts:42-45 (`ceil`), CryptoService.signQuestionToken (iat làm tròn xuống)
- ATTACK: token có `exp = floor(now) + ceil(ms/1000)`, có thể sớm hơn deadline+grace tới <1 s. Trong khoảng đó `isPastDeadline` còn false nhưng mọi token đã hết hạn -> secure-submit trả 400 "Phiên làm bài không hợp lệ" thay vì chấm; FE chỉ chuyển sang submit-saved khi `late` (đồng hồ client) đúng.
- IMPACT: xác suất thấp; có thể thấy toast lỗi một lần, bấm nộp lại là xong (nhánh A1 lúc đó bắt được).
- FIX: cộng thêm 1-2 s vào `tokenExpirySeconds`, hoặc khi mọi token hết hạn và gần deadline thì đi nhánh nộp theo dữ liệu đã lưu.

## F6. Low - Nộp thủ công quá hạn: toast "Nộp bài thành công" nhưng câu cuối bị bỏ
- LOCATION: ExamQuizPage.tsx:441-459 (doSubmit: saveProgress nuốt lỗi 409, rồi secure-submit), examattempt.service.ts:1611
- ATTACK: thí sinh chọn thêm đáp án rồi bấm nộp sau deadline+grace. Progress bị từ chối (409, bị nuốt), secure-submit lặng lẽ bỏ `answers` trong body, vẫn trả 200.
- IMPACT: điểm dựa trên bản lưu cũ; UI không báo "một số câu trả lời sau hạn không được tính". Đúng ý nghiệp vụ nhưng mất minh bạch.
- FIX: trả cờ `lateSubmit: true` trong response để FE hiện cảnh báo.

## Đã kiểm, không có lỗi
- Fix 1, hand-in kép: handIn/secure-submit đều `update where status = IN_PROGRESS` và map P2025 -> 400; nộp trễ qua progress trong grace rồi submit chỉ chấm cái đã lưu trong hạn, không có đường chấm đáp án muộn. /leave dùng cùng mốc `isPastDeadline` với /progress nên không lệch.
- Fix 3: log `attempt <id> handed in on leave (session <id>, in time: bool)` chỉ chứa id nội bộ và cờ, không có PII (không userId, email, tên).
- Fix 5: khớp default server (`antiCheatEnabled`/`allowLeaveMidway` = true, `durationMinutes` null) và xử lý `null` đúng ở updateSession. Public mapper học sinh không xuất các field mới, là chủ ý (host dùng row đầy đủ).
- Fix 7: guard ref hợp lý, reset trong finally. Còn lại: nếu `createExamRoom` ném lỗi sau khi server đã tạo (timeout mạng), bấm lại sẽ tạo phòng trùng (Low, không có idempotency key).
- Fix 6: deps có `deadline` là đủ; closure không cũ vì `answers` đã nằm trong deps.
