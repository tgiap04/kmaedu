---
status: completed
created: 2026-11-20
---
# Trang tạo phòng thi theo ảnh, kèm 3 thiết lập mới của phiên thi

## Yêu cầu

Người dùng (2026-11-20) yêu cầu: "sửa lại ui tạo phòng thi theo ảnh sau nhé". Các quyết định đã chốt qua câu hỏi:

- **Luồng tạo:** một trang đầy đủ tạo phòng thi, rồi tạo luôn phiên thi đầu tiên mang cấu hình đã chọn.
- **Thời gian làm bài:** thêm vào backend. Có đồng hồ đếm ngược, đồng thời server chặn sau hạn.
- **Chống gian lận:** thêm vào backend, bật hoặc tắt theo từng phiên.
- **Cho phép thoát giữa chừng:** thêm vào backend. Khi tắt, thí sinh rời trang làm bài thì bài được tự nộp.
- **Yêu cầu đăng nhập:** bỏ. Thi luôn bắt buộc đăng nhập, form không hiển thị lựa chọn này.
- **Ngôn ngữ:** trao đổi với người dùng bằng tiếng Việt.

## Hợp đồng (assessment-service, chỉ thêm, migration kiểu expand)

| Thay đổi | Chi tiết |
|---|---|
| `ExamSession.durationMinutes Int?` | `null` nghĩa là làm đến hết phiên (như hiện nay). Giá trị hợp lệ từ 1 đến 1440. |
| `ExamSession.antiCheatEnabled Boolean @default(true)` | Phiên cũ giữ hành vi hiện tại. |
| `ExamSession.allowLeaveMidway Boolean @default(true)` | Phiên cũ giữ hành vi hiện tại. Trang tạo mới gửi `false` theo ảnh. |
| DTO tạo và sửa phiên | Nhận thêm 3 trường trên. View của host trả về cả 3. |
| `GET /examattempts/:id/secure-quiz` | Trả thêm `deadline` (ISO), `antiCheatEnabled`, `allowLeaveMidway`.<br>`deadline = min(startedAt + durationMinutes, endTime)`.<br>`timeLimitMinutes` là số phút từ `startedAt` đến `deadline`.<br>Token câu hỏi hết hạn ở `deadline + 30s`. |
| Lưu tiến độ sau `deadline + 30s` | Trả 409 `ATTEMPT_DEADLINE_PASSED`, không ghi. |
| Câu trả lời trong secure-submit sau hạn | Token đã hết hạn, nên câu đó không được tính. |
| `POST /cheatinglogs` khi phiên tắt chống gian lận | Trả 201 (mặc định POST của Nest) `{ logged: false }`, không ghi. |
| `POST /examattempts/:id/leave` (`exam:take`, chủ bài làm, không thì 404; trả 201) | Bài đang làm của phiên có `allowLeaveMidway=false` được nộp và chấm trên đáp án đã lưu, giống `/submit`.<br>Trả `{ handedIn: true, score, correctAnswers, totalQuestions }`.<br>Phiên cho phép thoát, hoặc bài đã nộp, trả `{ handedIn: false }`.<br>Body tùy chọn giống `/progress`, được lưu trước khi chấm. |

## Các phase

| Phase | Nội dung | Người làm | Trạng thái |
|---|---|---|---|
| 1 | Backend: migration, DTO, view, `deadline`, chặn sau hạn, cheating log, `/leave`, test | subagent (safety-critical: migration) | Completed |
| 2 | FE: trang `/k/manage-exam-room/new` (stepper 4 bước, 3 section, bước xem lại), nút "Tạo phòng thi" chuyển trang | main | Completed |
| 3 | FE: trang làm bài (bật/tắt chống gian lận, đếm ngược theo `deadline`, rời trang thì nộp), form sửa phiên có 3 trường mới | main | Completed |
| 4 | Kiểm thử, review, cập nhật docs (CLAUDE.md, docs/system nếu có) | main + reviewer | Completed |

## Kết quả và rủi ro còn lại (2026-11-20)

- **Đã làm:** trang `/k/manage-exam-room/new`, migration expand có `lock_timeout`, `/leave`, hạn làm bài có chặn ở server, cờ chống gian lận, form sửa phiên.
  - Ba đường nộp bài (`/submit`, `/leave`, `secure-submit`) chỉ ghi khi bài còn đang làm, nên khi chạy song song thì đúng một lần nộp thắng.
- **Hành vi đổi với phiên cũ:**
  - `timeLimitMinutes` nay đếm từ `startedAt` của bài đến hạn, không còn là độ dài phiên.
  - `/progress` trả 409 sau `endTime + 30s`.
- **Rủi ro đã biết:**
  - Trên điện thoại, trình duyệt có thể không hiện hộp xác nhận khi đóng tab, nhưng bài vẫn được nộp.
  - Hai tab cùng một bài: đóng một tab sẽ nộp bài của tab kia.
  - Đồng hồ đếm ngược dùng giờ máy khách so với `deadline` của server.
- **Rollback:** Prisma không có down migration. Muốn rollback phải chạy `DROP COLUMN` bằng tay, và cấu hình đã nhập sẽ mất.
