# Phase 02 — Trang danh sách phòng thi (`/k/manage-exam-room`)

## Context Links
- [plan.md](plan.md)
- Ảnh tham chiếu: ảnh 3 trong yêu cầu.
- Code:
  - `kmaedu-fe/src/pages/k/ManageExamRoomPage.tsx`
  - Mẫu toolbar/bảng/lưới của trang flashcard: `src/pages/k/components/flashcard-list/*`,
    `src/components/organisms/k/FlashcardTablePagination.tsx`

## Overview
Ưu tiên cao, trạng thái Pending. Dựng lại trang theo ảnh. Toàn bộ dữ liệu lấy từ `list-all` (đã có
`sessionWindows` và `participantCount`). Lọc, đếm và phân trang làm ở client.

## Key Insights
- Trạng thái phòng tính theo giờ hiện tại từ `sessionWindows`, dùng chung một hàm cho cả hai trang:
  - Đang diễn ra: có phiên `start <= now < end` (hoặc chưa có `end`).
  - Sắp diễn ra: có phiên chưa bắt đầu.
  - Đã kết thúc: mọi phiên đã kết thúc.
  - Chưa có phiên: phòng không có phiên nào.
- Thời gian diễn ra là khoảng từ lúc phiên đầu bắt đầu đến lúc phiên cuối kết thúc.
  - Cùng ngày: `16/11/2026 14:00 – 15:00`.
  - Khác ngày: ghi đủ cả hai ngày.
  - Có phiên không giới hạn giờ kết thúc: `… – Không giới hạn`.

## Requirements
- Breadcrumb "Quản lý phòng thi > Danh sách phòng thi".
- Tiêu đề "Danh sách phòng thi" và mô tả như ảnh; nút đỏ "Tạo phòng thi".
- 4 thẻ số liệu: Tổng số phòng thi, Đang diễn ra, Đã kết thúc, Tổng lượt tham gia.
  - Mỗi thẻ có ô icon tròn, nền màu nhạt và icon lớn mờ ở góc phải.
- Toolbar:
  - Ô tìm kiếm, chọn trạng thái, chọn thời gian tạo (Hôm nay / 7 ngày / 30 ngày).
  - Nút chuyển lưới/danh sách; nút đang chọn tô đỏ.
- Bảng:
  - Cột chọn (checkbox), Tên phòng thi (kèm dòng "Đề: … • N câu"), Loại đề, Thời gian diễn ra, Số người tham gia,
    Trạng thái (pill có chấm), Thao tác.
  - Nút thao tác: phòng đã kết thúc là "Xem kết quả", các phòng còn lại là "Vào phòng".
  - Menu ⋮ gồm Xem chi tiết, Chỉnh sửa, Xóa.
- Chọn nhiều phòng thì hiện thanh "Đã chọn N phòng · Xóa"; xóa lần lượt từng phòng và báo phòng nào lỗi.
- Phân trang "Hiển thị 1 – 5 / 5 phòng thi".
- Chế độ lưới hiện cùng thông tin dưới dạng thẻ.
- Modal tạo/sửa, hộp xác nhận xóa và luồng `?quizSetId=` giữ như cũ.

## Related Code Files
- Sửa:
  - `src/pages/k/ManageExamRoomPage.tsx`
  - `src/types/examRoom.ts`
  - `src/components/organisms/k/FlashcardTablePagination.tsx` (thêm prop `noun`)
- Tạo:
  - `src/lib/exam-room/room-status.ts` và test
  - `src/components/k-page/stat-highlight-card.tsx`
  - `src/pages/k/components/exam-room-list/*`: toolbar, table, grid, row menu, status pill, hook dữ liệu và test
- Xóa nếu không còn nơi dùng: `RoomStatsSection`, `ExamRoomList`, `RecentParticipantsList`.

## Todo List
- [x] room-status.ts và test
- [x] stat-highlight-card
- [x] toolbar, table, grid, bulk delete
- [x] trang mới
- [x] dọn component cũ

## Success Criteria
- Bố cục khớp ảnh.
- Test logic và test hook xanh.
- tsc, lint và build sạch.

## Risk Assessment
- `list-all` bị cache 5 phút: trạng thái vẫn tính lại theo giờ hiện tại nên không bị cũ, chỉ số người tham gia có
  thể trễ tới 5 phút.

## Security Considerations
Không có: chỉ hiển thị dữ liệu của chính người dùng.

## Next Steps
Phase 03.
