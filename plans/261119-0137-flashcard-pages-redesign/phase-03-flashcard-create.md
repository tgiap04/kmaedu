# Phase 3 — Trang tạo flashcard `/k/flash-card/create` (agent C)

Ảnh: `images/18.png`. Bố cục: breadcrumb "Quản lý Flashcard > Tạo Flashcard"; tiêu đề "Tạo Flashcard" + phụ đề; khối trái có
3 tab: "Từ tài liệu của bạn" (vùng kéo thả PDF — dùng lại logic upload/sinh của công cụ AI), "Từ Quiz đã tạo" (chọn một bộ
quiz của mình), "Nhập thủ công" (tên, mô tả, công khai, tag); khối phải "Cài đặt tạo Flashcard": tên bộ thẻ, công khai,
và với tab tài liệu: "Số thẻ cần tạo" (nút − / +, giới hạn theo backend), "Tập trung theo từ khóa" + ô từ khóa;
nút đỏ lớn "Tạo Flashcard"; dải "Mẹo nhỏ" đóng được (nhớ trạng thái đóng bằng localStorage, bọc try/catch).
Luồng: tài liệu → sinh bằng AI (tiến độ như công cụ AI) → tạo bộ + lưu kết quả bằng `setHistoryFlashcardsToFlashcardSet`
→ mở trang chi tiết; quiz → tạo bộ + `setFlashcardsToFlashcardSet` (mặt trước = câu hỏi, mặt sau = đáp án đúng; bỏ câu
không có đáp án đúng, báo số câu bị bỏ) → mở trang chi tiết; thủ công → tạo bộ → mở trang chi tiết để thêm thẻ.
Tab tài liệu chỉ hiện khi người dùng có quyền `ai:generate` (`useCan`).

File sở hữu: file mới `src/pages/k/CreateFlashcardPage.tsx`, file mới dưới `src/pages/k/components/create-flashcard/`,
một dòng route trong `src/routes/index.tsx` (`guarded(..., { permission: "flashcardset:manage", pageKey: "flash-card" })`).
Component công cụ AI (`components/organisms/k/ai-tool/*`, `useAIGeneratorStore`) chỉ dùng lại, không sửa; cần sửa thì báo.
