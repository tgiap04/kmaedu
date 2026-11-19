---
status: completed
created: 2026-11-19
---
# Làm lại trang danh sách và trang chi tiết phòng thi theo ảnh

Người dùng (2026-11-19): "sửa lại ui trang danh sách phòng thi và trang chi tiết phòng thi cho giống hệt ảnh".
Chốt qua câu hỏi:
- Phạm vi FE + BE: thêm số liệu thật ở assessment-service, không phá API cũ.
- Trang chi tiết thêm tab "Phiên thi" cạnh 3 tab trong ảnh.
- Làm phần làm được, ẩn phần không có:
  - "Kết thúc phòng" đóng ngay mọi phiên đang diễn ra.
  - "Xuất báo cáo" tải CSV.
  - "Theo dõi" mở trang thống kê phiên; "Xem kết quả" mở tab Thống kê chi tiết.
  - Ẩn "Nhắc thi" và bộ lọc loại đề; cột "Loại đề" luôn là "Đề trắc nghiệm" (hệ thống chỉ có trắc nghiệm).

## Hợp đồng API (assessment-service, chỉ thêm)
1. `GET /examrooms/list-all`: mỗi phòng có thêm `sessionWindows: {startTime, endTime|null}[]` (tăng dần) và
   `participantCount` (số user khác nhau có bài làm). FE tự tính trạng thái từ `sessionWindows` theo giờ hiện tại.
2. `GET /examattempts/room/:examRoomId/overview?window=30m|1h|24h|7d` (`exam_result:view`, chủ phòng, không thì 404):
   - Đếm theo trạng thái: `candidates`, `completed`, `inProgress`, `notStarted`, `cancelled`.
   - Điểm: `averageScore`, `passed`, `scoreBuckets[10]`.
   - Biểu đồ: `timeline {window, from, bucketMinutes, counts[]}`.
3. `GET /examattempts/room/:examRoomId/candidates?page&limit<=100&search&status&result` (`exam_result:view`):
   - Mỗi thí sinh lấy bài làm mới nhất.
   - Người trong whitelist phiên riêng tư mà chưa làm bài được tính là `not_started`.
   - Tìm theo tên hoặc username, không phân biệt dấu.
4. `POST /examsessions/room/:examRoomId/end` (`exam_session:manage`):
   - Đặt `endTime = now` cho phiên đang diễn ra và trả `{ended, endedAt}`.
   - Phiên sắp tới giữ nguyên.
   - Trong cùng transaction, nộp hộ mọi bài còn đang làm trong các phiên đó, chấm theo đáp án đã tự lưu (cùng logic với
     nộp bài), trả thêm `closedAttempts`. Người dùng chọn cách này sau review (ARCH-2), để kết quả phòng là kết quả cuối.
   - Không ai bắt đầu hay vào lại được nữa: màn làm bài vào lại qua `start`, và `start` từ chối sau endTime.

## Phase
| Phase | Name | Status |
|---|---|---|
| 01 | [Backend: số liệu phòng, thí sinh, kết thúc phòng](phase-01-backend-room-insights.md) | Completed |
| 02 | [Trang danh sách phòng thi](phase-02-room-list-page.md) | Completed |
| 03 | [Trang chi tiết phòng thi](phase-03-room-detail-page.md) | Completed |

Phase 01 chạy song song với 02 (khác repo, khác file). Phase 03 cần hợp đồng API ở trên, không cần chờ code BE xong.

## Kiểm chứng
- BE:
  - Unit spec cho các hàm thuần (dựng danh sách thí sinh, lọc, chia mốc thời gian, đếm người tham gia).
  - Cập nhật ma trận `test/authz` cho 3 route mới.
  - Chạy `yarn typecheck` và `yarn test` cho assessment-service.
- FE:
  - Test logic thuần (trạng thái phòng, khoảng thời gian, lọc, CSV).
  - Test hook/component cho bộ lọc danh sách và nút kết thúc phòng.
  - Chạy tsc, lint, `yarn test`, build.
- Không chạy e2e trên DB dev. Chưa kiểm tra trên trình duyệt thật.
