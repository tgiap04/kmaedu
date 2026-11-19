---
status: completed
created: 2026-11-19
---
# Làm lại 3 trang flashcard theo thiết kế

Người dùng (2026-11-19): làm trang danh sách flashcard, chi tiết bộ thẻ và tạo flashcard giống 3 ảnh
(`/private/tmp/claude-501/-Users-tgiap-dev-devs-kmaedu/488c8867-498d-4858-b7a7-eabd8f01430a/images/16.png` danh sách,
`17.png` chi tiết, `18.png` tạo). Quyết định của người dùng: **chỉ làm frontend** — dùng dữ liệu và API sẵn có; phần
thiết kế không có dữ liệu thì thay bằng số liệu thật hoặc bỏ. Không đổi backend, không migration.

## Thứ thiết kế có nhưng backend không có → cách xử lý

| Thiết kế | Xử lý |
|---|---|
| Ảnh từng bộ thẻ | Ô biểu tượng (ảnh bìa đã bỏ có chủ đích); chọn biểu tượng cố định theo id như `/k/my-exams` |
| Thẻ số liệu "Đã học hôm nay", "Tỷ lệ hoàn thành TB" (danh sách) | Thay bằng "Tổng số thẻ" (`totalCards`) và "Thẻ trung bình / bộ" (`totalCards / totalGroups`) |
| Cột "Danh mục" | Tag đầu tiên của bộ (`tags[0]`), không có thì "—" |
| Cột "Tiến độ" | Thay bằng trạng thái chia sẻ (Công khai / Riêng tư) |
| Lọc "Tất cả danh mục" | Giữ bộ lọc trạng thái sẵn có, kiểu dáng như thiết kế |
| Độ khó từng thẻ, lọc độ khó | Bỏ (thẻ chỉ có câu hỏi / đáp án) |
| "Được tạo từ: …" | Bỏ; dòng phụ dùng mô tả của bộ |
| "Thời gian học ước tính" | Tính ở frontend: số thẻ × 36 giây (50 thẻ ≈ 30 phút như ảnh) |
| "Tỷ lệ hoàn thành" (chi tiết) | Từ tiến độ học của chính người xem (`getProgressApi`): thẻ đã thuộc / tổng thẻ; chưa học thì "—" |
| Tab "Thống kê học tập" | Số liệu từ `getProgressApi` (đã học, đã thuộc, cần ôn, lần học gần nhất) |
| Nút "Sao chép" | Frontend: tạo bộ mới + chép mọi thẻ bằng API sẵn có |
| Tạo: "Nhập nội dung" dán văn bản | Bỏ (AI chỉ sinh từ file) |
| Tạo: Độ khó, Ngôn ngữ, Loại thẻ, 2 công tắc | Bỏ; thay bằng tùy chọn API có: số thẻ, tập trung theo từ khóa (+ từ khóa) |
| Tạo: tab "Từ Quiz đã tạo" | Frontend: chọn một bộ quiz của mình → câu hỏi thành mặt trước, đáp án đúng thành mặt sau |
| Tạo: upload PDF/DOCX/TXT/MD | Chỉ PDF (như công cụ AI) |

## Quy ước chung
- Mật độ gọn như `/k/my-exams` và plan `261119-0004-compact-card-density` (đệm thẻ 16–20px, ô biểu tượng 40–56px,
  tiêu đề thẻ `text-base`/`text-lg`, nút mặc định 34px). Dùng `PageHeader`, `SectionCard`, token màu sẵn có, icon
  Phosphor, `Button`/`DropdownMenu`/`Dialog` trong `components/antd`.
- Chỉ đổi giao diện và ghép API sẵn có; logic thuần mới có test vitest (`src/**/*.test.ts`, môi trường node), viết test
  trước và thấy đỏ vì sai giá trị.
- File ≤ 200 dòng; tách component nhỏ.

## Phase

| # | Phase | Ai làm | Trạng thái |
|---|---|---|---|
| 1 | [Trang danh sách flashcard](phase-01-flashcard-list.md) | agent A | Completed |
| 2 | [Trang chi tiết bộ thẻ](phase-02-flashcard-detail.md) | agent B | Completed |
| 3 | [Trang tạo flashcard](phase-03-flashcard-create.md) | agent C | Completed |
| 4 | Kiểm tra chung + review | main | Completed |

Phase 1–3 sở hữu file tách rời, chạy song song.
