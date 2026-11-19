# Phase 01 — Picker gán nhãn dùng chung

**Overview:** ưu tiên cao, in-progress. Một popover chọn / tạo nhãn dùng cho dòng thẻ flashcard và dòng câu hỏi.

## Related code files
- Tạo: `kmaedu-fe/src/lib/label-picker/label-picker.ts` (+ `.test.ts`): `orderLabels`, `filterLabels`,
  `findLabelByName`, `nextLabelOrder`.
- Tạo: `kmaedu-fe/src/pages/k/components/assign-label-picker.tsx`.
- Sửa (flashcard): `flashcard-row.tsx`, `flashcard-list.tsx`, `use-flashcard-cards.ts` (`assignLabel`),
  `ManageFlashcardSetDetailPage.tsx` (tạo nhãn rồi gán), `flashcard-label-manager.tsx` (dùng `nextLabelOrder`, `orderLabels`).
- Sửa (đề thi): `question-table-row.tsx`, `question-table.tsx`, `use-quiz-set-detail.ts` (`assignChapter`,
  `createChapterFor`), `ManageQuizSetDetailPage.tsx`, `quiz-set-chapter-manager.tsx` (dùng `nextLabelOrder`).

## Steps
1. Test trước cho `label-picker.ts` (đỏ vì sai giá trị), rồi viết hàm.
2. Component popover: ô nhập (autofocus, tối đa 100 ký tự như API), danh sách đã lọc, dòng tạo mới, spinner khi đang lưu,
   không đóng khi đang lưu, đóng khi xong.
3. Flashcard: gán xong vá nhãn vào thẻ trong bộ nhớ (không tải lại cả bộ); tạo nhãn mới thì tải lại danh sách nhãn.
4. Đề thi: gán / tạo xong tải lại đề (như các thao tác khác của trang).

## Success criteria
- Dòng chưa có nhãn có nút; chọn nhãn có sẵn → dòng hiện nhãn đó; gõ tên mới → nhãn được tạo và gán.
- Tên trùng (không phân biệt hoa thường, có phân biệt dấu) không tạo bản sao mà gán nhãn có sẵn.
- `yarn tsc`, `yarn eslint` các file đổi, `yarn test`, `yarn build` đều 0.

## Risks
- Tạo được nhãn nhưng gán lỗi → tải lại danh sách nhãn trong mọi trường hợp tạo thành công.
- Lọc "Chưa gán nhãn" đang bật: dòng vừa gán biến khỏi danh sách (đúng ý lọc).
