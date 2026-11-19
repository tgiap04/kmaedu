# Phase 03 — Trang tạo flashcard `/k/flash-card/create`

Trạng thái: hoàn tất (DONE_WITH_CONCERNS, xem mục cuối). Chỉ làm frontend, không đụng backend, store AI hay component `ai-tool/*`.

## File đã thêm / sửa

| File | Dòng |
|---|---|
| `src/pages/k/CreateFlashcardPage.tsx` | 195 |
| `src/pages/k/components/create-flashcard/create-flashcard-ui.tsx` (panel/field class, ô số thẻ − 50 +) | 45 |
| `.../document-source-panel.tsx` (tab tài liệu) | 68 |
| `.../pdf-drop-zone.tsx` | 68 |
| `.../quiz-source-panel.tsx` (tab quiz) | 113 |
| `.../manual-source-panel.tsx` (tab thủ công) | 74 |
| `.../settings-panel.tsx` (khối "Cài đặt tạo Flashcard") | 109 |
| `.../source-tabs.tsx`, `.../tips-banner.tsx` | 38, 44 |
| `.../use-create-flashcard-submit.ts` (tạo bộ + điền thẻ + chuyển trang) | 99 |
| `.../use-quiz-sources.ts` (danh sách bộ quiz, câu hỏi của bộ) | 72 |
| `.../quiz-to-flashcards.ts`, `flashcard-create-logic.ts`, `save-cards-in-batches.ts` (logic thuần) | 43, 61, 29 |
| 3 file `*.test.ts` tương ứng | 83, 112, 44 |
| `src/routes/index.tsx`: 1 import + 1 dòng route đặt ngay sau `/k/flash-card` | +2 |

## Từng phần của thiết kế

- Breadcrumb "Quản lý Flashcard > Tạo Flashcard": `Breadcrumb` của `components/antd`, truyền vào `eyebrow` của `PageHeader` (ô icon hồng + tiêu đề + phụ đề như ảnh).
- Khối trái 3 tab gạch chân đỏ (`role=tablist`). Tab "Từ tài liệu của bạn" chỉ hiện khi `useCan("ai:generate")`; tab "Từ Quiz đã tạo" chỉ hiện khi `useCan("quizset:manage")` (API danh sách quiz cần quyền này, thiếu thì 403); tab "Nhập thủ công" luôn hiện. Mặc định mở tab hiện đầu tiên.
- Khối phải "Cài đặt tạo Flashcard" (nền gradient hồng): tên bộ thẻ (bắt buộc, tối đa 200), công tắc Công khai, riêng tab tài liệu có "Số thẻ cần tạo" (− / +, 1–50 như `MAX_GENERATE_ITEMS` của backend, gõ số được, chốt khi blur) và "Tập trung theo từ khóa" + ô từ khóa. Nút đỏ lớn "Tạo Flashcard".
- Dải "Mẹo nhỏ" đóng được, nhớ bằng `localStorage` (bọc try/catch, lỗi thì chỉ hiện lại lần sau).
- Bỏ theo plan.md: ô "Nhập nội dung" dán văn bản, Độ khó, Ngôn ngữ, Loại thẻ, 2 công tắc phụ, DOCX/TXT/MD (chỉ PDF, tối đa 5 MB và 50 trang như công cụ AI). Thay bằng tùy chọn API có thật (số thẻ, từ khóa).
- Vùng kéo thả của tài liệu cao 260px, dưới có 3 ô bước "Tải lên PDF / AI sinh thẻ / Lưu bộ thẻ" để cột trái không trống.
- Tên bộ thẻ mặc định lấy từ tên file (bỏ đuôi) hoặc "<tên quiz> - Flashcard"; người dùng gõ thì giữ giá trị của họ. Mô tả tự ghi nguồn ("Tạo từ tài liệu ..." / "Tạo từ bộ quiz ...") cho tab tài liệu và quiz.
- Responsive: lưới dùng container query (`@3xl`), dưới 768px xếp dọc; hàng tab cuộn ngang khi hẹp.

## Ba luồng

1. Tài liệu: chọn PDF (dùng `usePdfFileHandlers`: kiểm PDF, 5 MB, 50 trang; khi chọn file mới thì `clearFlashcards()` rồi `setFile` để không giữ thẻ của file cũ) -> bấm "Tạo Flashcard" (kiểm tên trước để không tốn lượt AI) -> `generateFlashcards()` của `useFlashcardGeneratorStore` (upload, tạo job, polling) -> trang hiện `ResultLoading` + danh sách bước thật của job, có nút "Dừng tạo" (gọi `cancelCurrentJob`, chỉ hiện khi có jobId) -> job xong, effect thấy `isGenerating` true -> false và người dùng đã bấm -> `createFlashcardSetApi` rồi `setHistoryFlashcardsToFlashcardSet({ flashcardsetIds: [id], historyId: generatedCardsId })` -> `clearFlashcards()` -> mở `/k/manage-flashcard-set/:id`. Nếu người dùng rời trang rồi quay lại giữa chừng thì trang bắt đầu sạch (trừ khi job vẫn chạy: lúc đó hiện tiến độ, xong thì nút đổi thành "Lưu thành bộ thẻ").
2. Quiz: mở tab thì tải `getAllQuizSetsApi` (tìm theo tên, chọn một bộ kiểu radio) -> chọn bộ thì đọc hết câu hỏi (`getQuizSetQuestionsApi`, 100 câu/trang, đúng mức tối đa backend) -> `quizzesToFlashcards`: mặt trước = câu hỏi, mặt sau = nội dung đáp án đúng (đáp án là chữ A-D hoặc chính nội dung, bỏ tiền tố "A."), giữ nguyên HTML vì thẻ hiển thị bằng RichTextViewer; câu rỗng hoặc không xác định được đáp án đúng bị bỏ và đếm ("Sẽ tạo 45 thẻ từ 50 câu ... Bỏ 5 câu") -> bấm nút: tạo bộ + `setFlashcardsToFlashcardSet` theo lô 50 thẻ (backend chạy mỗi request trong 1 transaction 5 giây) -> toast có số thẻ và số câu bị bỏ -> mở trang chi tiết.
3. Thủ công: mô tả + thẻ phân loại (Enter để thêm, tối đa 10 thẻ, mỗi thẻ tối đa 30 ký tự) + tên + công khai -> tạo bộ trống -> mở trang chi tiết để thêm thẻ.

Chung: nhấn đúp bị chặn bằng `singleFlight` + `submitting` (nút và các trường khóa); tạo bộ thất bại thì toast lỗi và giữ nguyên input; bộ đã tạo nhưng điền thẻ lỗi thì toast "Đã tạo bộ thẻ nhưng chưa thêm đủ thẻ" kèm số thẻ đã thêm (lô nào đã vào) rồi mở bộ thẻ (retry không tạo bộ thứ hai); rời trang giữa chừng không bị kéo lại.

## TDD (RED -> GREEN)

- RED: viết 3 file test cùng stub trả giá trị sai, chạy `yarn vitest run src/pages/k/components/create-flashcard` -> `Test Files 3 failed (3) / Tests 30 failed | 5 passed (35)`, đều là AssertionError (ví dụ `expected [] to deeply equal [ '1', '3' ]`, `expected +0 to be 103`, `expected +0 to be an instance of PartialSaveError`), không phải lỗi import.
- `sourceDescription` thêm sau: hạ tạm thân hàm cho sai, `Tests 1 failed | 20 passed` (`expected 'HĐH.pdf' to be 'Tạo từ tài liệu "HĐH.pdf"'`), rồi khôi phục.
- GREEN: `Test Files 3 passed (3) / Tests 37 passed (37)`.
- Phủ: danh sách rỗng, câu hỏi lệch (không phải chuỗi, null), đáp án chữ thường / có khoảng trắng / đúng nội dung / sai / rỗng / vượt số lựa chọn, ảnh-only, HTML giữ nguyên, lựa chọn dạng object; số thẻ NaN/Infinity/0/51/phân số; tên quá dài; tag trùng khác hoa thường, quá dài, quá số lượng, không đổi mảng gốc; lô 0 thẻ, 103 thẻ, lỗi ở lô thứ 2, lỗi ở lô đầu.

## Kết quả lệnh (thư mục `kmaedu-fe`)

- `yarn tsc --noEmit -p tsconfig.json` -> exit 0
- `yarn eslint src/pages/k/CreateFlashcardPage.tsx src/pages/k/components/create-flashcard src/routes/index.tsx` -> exit 0, 0 lỗi
- `yarn vitest run src/pages/k/components/create-flashcard` -> exit 0, 37 test pass

## Kiểm tra giao diện và luồng (harness tạm, đã xóa `__preview__/flashcard-create`, vite cổng 5203 đã tắt)

Ảnh trong `/private/tmp/claude-501/-Users-tgiap-dev-devs-kmaedu/488c8867-498d-4858-b7a7-eabd8f01430a/scratchpad/flashcard-create/`: `doc-empty.png`, `doc-file.png`, `doc-generating.png`, `doc-result.png`, `quiz.png`, `quiz-fail.png`, `quiz-empty.png`, `manual.png`, `noai.png` (chỉ có quyền flashcardset:manage: chỉ còn tab thủ công, không có khối AI), `mobile-doc.png`, `mobile-quiz.png` (thân 390px).

Luồng chạy thật trong trình duyệt headless với adapter axios giả (không gọi backend), đọc log request:
- tài liệu: `POST /ai/generate-from-file` -> poll xong -> `POST /flashcardsets` -> `POST /flashcardsets/save-history-to-flashcardset {"flashcardsetIds":["NEWSET"],"historyId":"h1"}` -> đường dẫn `/k/manage-flashcard-set/NEWSET`;
- quiz 50 câu (5 câu đáp án sai): 45 thẻ, toast "bỏ 5 câu"; quiz 130 câu: lô 2 lỗi -> toast "Đã thêm 50 thẻ trước khi lỗi", vẫn mở bộ thẻ; tạo bộ lỗi -> ở lại trang, toast lỗi;
- lưu lịch sử lỗi -> toast "đã tạo bộ thẻ nhưng chưa thêm đủ thẻ" và mở bộ thẻ; thủ công thiếu tên -> báo lỗi, không gọi API.

## Không làm / chú ý

- Không tải lại tệp gần đây (`recent-files-card`): thiết kế chỉ có vùng kéo thả.
- Công cụ AI dùng chung store: `useFlashcardGeneratorStore.setFile` đồng thời gán file sang store tạo đề, nên sau khi chọn file ở trang này, trang `/k/ai-tool` có thể thấy file đó ở tab đề. Chưa sửa vì store là read-only; nếu cần thì sửa trong store.
- Trang này gọi `clearFlashcards()` khi mở (khi không có job chạy), nên kết quả AI chưa lưu từ `/k/ai-tool` bị bỏ khỏi bộ nhớ trang; thẻ vẫn nằm trong lịch sử tài liệu.
- Nút "Tạo Flashcard" trên trang danh sách (agent A) cần điều hướng tới `/k/flash-card/create`.
- Tab tài liệu dùng chung mức giới hạn 5 MB và 50 trang của công cụ AI (khác thiết kế "20MB").
