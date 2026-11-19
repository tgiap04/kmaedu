# Phase 03 — Trang chi tiết phòng thi (`/k/manage-exam-room/:id`)

## Context Links
- [plan.md](plan.md) (hợp đồng API)
- Ảnh tham chiếu: ảnh 4 trong yêu cầu.
- Code:
  - `kmaedu-fe/src/pages/k/ManageExamRoomDetailPage.tsx`
  - `src/pages/k/components/room-sessions-section.tsx`
  - `src/pages/k/ExamRoomSessionAnalyticsPage.tsx`, `src/pages/k/components/attempt-detail-sheet.tsx`
  - `src/pages/k/components/session-analytics-sections.tsx`

## Overview
Ưu tiên cao, trạng thái Pending. Dựng lại trang theo ảnh và giữ nguyên toàn bộ phần quản lý phiên, chuyển nó vào
tab "Phiên thi".

## Requirements
- Breadcrumb "Quản lý phòng thi > Chi tiết phòng thi".
- Phần đầu trang:
  - Ô icon, tên phòng, dòng "Đề thi: … • Loại: Trắc nghiệm", pill trạng thái.
  - Nút "Sao chép link":
    - Lấy link phiên đang diễn ra; nếu không có thì lấy phiên sắp tới gần nhất.
    - Khóa khi phòng không có phiên nào.
  - Nút "Xem kết quả": mở tab Thống kê chi tiết.
  - Nút "Kết thúc phòng":
    - Chỉ hiện khi có phiên đang diễn ra.
    - Bấm vào hiện hộp xác nhận; xác nhận thì gọi `POST /examsessions/room/:id/end`, rồi tải lại phòng, các phiên
      và số liệu.
- 4 thẻ số liệu:
  - Tổng phiên thi, Đang diễn ra, Đã kết thúc: tính từ `examSessions` của phòng.
  - Lượt tham gia: `completed + inProgress + cancelled` lấy từ overview.
- Thẻ "Thông tin phòng thi": Thời gian bắt đầu, Thời gian kết thúc, Người tổ chức.
- Thẻ "Tiến độ làm bài":
  - Vòng tròn hiện % đã nộp trên tổng thí sinh, kèm chú thích Đã hoàn thành / Đang làm / Chưa bắt đầu.
  - Biểu đồ vùng số bài nộp theo mốc thời gian, chọn khoảng 30 phút / 1 giờ / 24 giờ / 7 ngày.
- Tab (lưu trong `?tab=`): Danh sách thí sinh (N), Phiên thi (N), Thống kê chi tiết, Cài đặt phòng thi.
  - Danh sách thí sinh:
    - Bộ lọc: tìm kiếm (debounce), trạng thái, kết quả.
    - Nút "Xuất báo cáo": tải CSV gồm mọi trang theo bộ lọc hiện tại, có BOM để Excel đọc đúng tiếng Việt.
    - Cột: #, Thí sinh, Trạng thái, Bắt đầu làm, Nộp bài lúc, Điểm, Thời gian làm, Hành động.
    - Hành động: "Xem chi tiết" mở sheet bài làm; "Theo dõi" mở trang thống kê phiên. Menu ⋮ có "Thống kê phiên".
    - Phân trang.
  - Phiên thi: `RoomSessionsSection` có sẵn, kèm nút "Tạo phiên thi".
  - Thống kê chi tiết:
    - Ba ô: đã nộp, điểm trung bình, tỉ lệ đạt.
    - Phân bố điểm, dùng lại `ScoreDistributionCard`.
    - Bảng phiên kèm link "Xem thống kê".
  - Cài đặt phòng thi: form tên, mô tả, bộ đề (dùng lại `ExamRoomForm`, lưu bằng `updateExamRoom`) và vùng nguy
    hiểm "Xóa phòng thi".
- Tách việc tải chi tiết bài làm thành hook dùng chung với trang thống kê phiên.

## Related Code Files
- Sửa:
  - `ManageExamRoomDetailPage.tsx`, `ExamRoomSessionAnalyticsPage.tsx`
  - `src/apis/examAttemptApi.ts`, `src/apis/examSessionApi.ts`
- Tạo `src/pages/k/components/exam-room-detail/*`:
  - header, stats, info card, progress card
  - tabs, candidates (table, toolbar, hook, CSV)
  - stats tab, settings tab
- Tạo `src/lib/exam-room/candidates-csv.ts` và test.
- Xóa `src/pages/k/components/room-detail-overview.tsx`.

## Todo List
- [x] API client
- [x] header, stats, info, progress
- [x] tab thí sinh (table, filter, export)
- [x] tab phiên, thống kê, cài đặt
- [x] hook chi tiết bài làm dùng chung
- [x] test

## Success Criteria
- Bố cục khớp ảnh.
- Mọi chức năng phiên cũ vẫn chạy.
- Test, tsc, lint và build sạch.

## Risk Assessment
- Overview và candidates tải độc lập: một bên lỗi thì chỉ phần đó hiện lỗi, kèm nút thử lại.
- Gõ tìm kiếm nhanh: dùng read gate để bỏ kết quả của lần gọi cũ.

## Security Considerations
Xác nhận trước khi kết thúc phòng, vì không hoàn tác được.

## Next Steps
Review toàn bộ thay đổi, cập nhật tài liệu.
