---
status: completed
created: 2026-11-19
---
# Gán nhãn ngay trên dòng thẻ / câu hỏi chưa có nhãn

Người dùng (2026-11-19): "với các flashcard, quiz chưa gán nhãn thì cần thêm button gán nhãn đã có hoặc tạo nhãn mới".

Chỉ frontend. Backend đã có: `POST /flashcardsets/:id/labels/:labelId/flashcards` (`assignFlashcardsToLabelApi`),
`POST /quizsets/:id/labels/:labelId/questions` (`assignQuestionsToLabelApi`), và hai API tạo nhãn. Không đổi API,
không migration.

## Quyết định
- Dòng chưa có nhãn hiện nút nhỏ viền đứt "+ Gán nhãn" (trang đề thi: "+ Gán chương", vì cả trang gọi nhãn là chương)
  thay cho chữ "Chưa gán nhãn" / "Chưa phân chương".
- Bấm nút mở popover (antd `Popover`): một ô vừa lọc vừa đặt tên, danh sách nhãn (chấm màu + tên), và dòng
  "Tạo nhãn “X”" khi tên gõ vào chưa trùng nhãn nào. Enter: trùng tên thì gán nhãn đó, không thì tạo mới.
- Nhãn mới lấy màu `chapterColorAt(số nhãn)`, `order` = lớn nhất + 1; đổi màu sau ở tab Nhãn / Chương.
- Tạo xong mà gán lỗi: nhãn vẫn còn, danh sách nhãn vẫn được tải lại để người dùng chọn lại.
- Đang sửa dòng khác (hoặc chính dòng đó) thì nút bị khóa như các nút khác trên dòng.

## Phase
| Phase | Name | Status |
|---|---|---|
| 01 | [Picker dùng chung + nối vào 2 trang](phase-01-assign-label-picker.md) | Completed |
