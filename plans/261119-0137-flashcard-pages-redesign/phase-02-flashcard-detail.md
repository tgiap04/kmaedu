# Phase 2 — Trang chi tiết bộ thẻ `/k/manage-flashcard-set/:id` (agent B)

Ảnh: `images/17.png`. Bố cục: breadcrumb "Quản lý Flashcard > Chi tiết bộ thẻ"; đầu trang: ô biểu tượng, tên bộ + nút bút
(sửa thông tin bộ — modal sửa có sẵn), dòng phụ = mô tả, pill "Public"/"Riêng tư"; nút "Chia sẻ" (modal chia sẻ có sẵn),
"Sao chép" (tạo bộ "<tên> (bản sao)" và chép mọi thẻ, rồi mở bộ mới), "Xóa" (xác nhận rồi về danh sách);
4 thẻ số liệu: Tổng số thẻ, Thời gian học ước tính, Lượt xem, Tỷ lệ hoàn thành (plan.md);
tab "Danh sách thẻ" | "Thống kê học tập" (+ giữ quản lý nhãn hiện có ở một tab "Nhãn" nếu cần chỗ), ô "Tìm kiếm trong bộ thẻ...",
nút "Bộ lọc" (lọc theo nhãn — thay cho Select nhãn hiện tại); "Hiển thị a – b trong tổng số N thẻ"; danh sách hàng: số thứ tự
trong vòng tròn, mặt trước (đậm), mặt sau rút gọn, nút bút, nút ⋮ (Xóa); bấm bút → hàng mở rộng tại chỗ: "Cụm từ" (mặt trước),
"Mô tả" (mặt sau, `RichTextEditor` sẵn có), khung "Xem trước", "Hủy" / "Lưu thay đổi"; nút thêm thẻ; phân trang số.

File sở hữu: `src/pages/k/ManageFlashcardSetDetailPage.tsx`, file mới dưới `src/pages/k/components/flashcard-detail/`,
`src/pages/k/components/flashcard-grid-card.tsx`, `src/components/organisms/{FlashcardInlineForm,FlashcardEditorDialog,ViewFlashcardDialog}.tsx`
(chỉ khi cần). `FlashcardLabelManager.tsx` chỉ dùng lại, không viết lại.
Tìm kiếm: API thẻ không có tham số tìm — lọc trên trang đang tải và ghi rõ trên giao diện, hoặc tải hết khi có từ khóa
(chọn cách đúng, nói rõ trong báo cáo).
