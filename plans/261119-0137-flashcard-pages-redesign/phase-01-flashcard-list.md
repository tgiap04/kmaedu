# Phase 1 — Trang danh sách flashcard `/k/flash-card` (agent A)

Ảnh: `images/16.png`. Bố cục: tiêu đề "Quản lý Flashcard" + nút đỏ "+ Tạo Flashcard" (điều hướng tới `/k/flash-card/create`);
4 thẻ số liệu (xem plan.md); thanh lọc: ô tìm "Tìm kiếm bộ flashcard...", bộ lọc trạng thái, sắp xếp, nút chuyển
dạng bảng / lưới; khối "Danh sách bộ flashcard (N)" dạng bảng: Tên bộ thẻ (ô biểu tượng + tên), Danh mục (pill tag đầu),
Số thẻ, Lượt xem, Ngày tạo, Trạng thái, Thao tác (pill "▶ Chơi" → `/study-flashcard/:id`, nút bút → modal sửa bộ có sẵn,
nút ··· → Quản lý thẻ, Chia sẻ, Xóa); bấm tên → `/k/manage-flashcard-set/:id`; chân bảng "Hiển thị a – b / N bộ thẻ" +
phân trang số. Dạng lưới: thẻ bộ gọn với cùng thông tin và thao tác. Màn hình hẹp: bảng thành danh sách thẻ.

File sở hữu: `src/pages/k/FlashcardsPage.tsx`, `src/templates/FlashcardManagementTemplate.tsx`,
`src/components/organisms/k/{FlashcardTable,FlashcardStatsSection,FlashcardSearchFilterBar,FlashcardManagementHeader,FlashcardTablePagination}.tsx`,
file mới dưới `src/pages/k/components/flashcard-list/`, và chuyển `stableIndex` từ `src/pages/k/my-exams-types.ts` sang
`src/lib/stable-index.ts` (+ test chuyển theo; cập nhật import ở my-exams).
Giữ: modal sửa/xóa/chia sẻ hiện có, phân trang server, tìm kiếm debounce, thống kê từ `useStatsStore`.
Bỏ: modal tạo bộ trên trang này (tạo chuyển sang trang mới).
