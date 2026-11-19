# Phân xử review (reports/review.md)

Không Critical. 3 Important + 13 Minor (kể cả 2 mục "để sau").

## Chấp nhận — sửa ở vòng 1
- I-1 Trang tạo bỏ qua job tạo đề đang chạy (`CreateFlashcardPage.tsx:101-115`): khóa tab tài liệu khi trình tạo đề đang chạy hoặc có job khác (`useJobStore.currentJobId` không phải job flashcard của trang).
- I-2 Tải hết thẻ có thể trùng/thiếu (`lib/flashcard-detail/flashcard-detail.ts:78-82`): khử trùng theo id, giới hạn 3–4 trang song song; ghi rõ trong báo cáo rằng gốc là backend thiếu khóa sắp xếp phụ (ngoài phạm vi frontend).
- I-3 Thiếu test cho luồng nhiều bước: tách phần quyết định (tạo bộ → điền thẻ → kết quả một phần; tự lưu khi job xong; sao chép) thành hàm thuần có test; "Sao chép" dùng lại `saveCardsInBatches`.
- Minor: sao chép lỗi giữa chừng → mở bộ đã tạo + báo số thẻ đã chép; nút Sao chép tắt khi tải thẻ lỗi; không điều hướng sau khi đã rời trang; job AI có mã lịch sử nhưng 0 thẻ → không tạo bộ, báo lỗi; chặn bấm đúp khi đang kiểm file (single-flight); job flashcard từ /k/ai-tool chỉ khóa tab tài liệu, không khóa tab quiz/thủ công; sửa câu thông báo cho khớp chữ trên nút; sửa tại chỗ mặt trước chữ trơn: không ghi lại mặt trước nếu người dùng không sửa, giữ xuống dòng; số liệu / hộp xóa không hiện "0 thẻ" khi chưa tải xong; lần tải lại về muộn không ghi đè thao tác mới (bộ đếm lượt tải); tab trang chi tiết có role tablist/tab/tabpanel, aria-controls, phím mũi tên.
- Quiz → thẻ bỏ sót đáp án có ký tự đặc biệt: sửa nếu gốc là giải mã entity HTML đơn giản; nếu không, để sau (câu bị bỏ đã được đếm và báo).

## Bác bỏ
- Danh sách: phản hồi về muộn ghi đè — có từ HEAD, không do diff này.

## Vòng soát lại (re-review-1.md): SEALED
- N-1 (Minor) một trang lỗi vẫn kéo các trang còn lại: Chấp nhận — `collectPages` dừng mọi luồng sau lỗi đầu tiên; test viết trước (đỏ vì assertion, rồi xanh).
- N-2 (Minor) `aria-controls` trỏ tới panel không render: Chấp nhận — chỉ tab đang chọn có `aria-controls` (`flashcard-tabs-bar.tsx`, `source-tabs.tsx`).
- Có từ trước: job khôi phục từ phiên trước bật "đang tạo" ở cả hai store — ngoài phạm vi, ghi lại.
- Để sau (backend): `orderBy` thẻ thiếu khóa phụ `id` → frontend chỉ khử trùng được.

Cây cuối: tsc 0; eslint 65 file 0 vấn đề; `yarn test` 40 file / 345 test exit 0; build 0.
