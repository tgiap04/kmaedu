---
status: completed
created: 2026-11-19
---
# Thẻ gọn hơn trên toàn bộ frontend

Người dùng (2026-11-18): thấy thẻ ở `/k/my-exams` "to đùng", đã thu nhỏ trang đó. Giờ áp cùng mức gọn
cho mọi trang của `kmaedu-fe`. Chỉ đổi class giao diện: không đổi hành vi, dữ liệu, route, API.

## Hiện trạng (Study)

- `components/antd/card.tsx` bọc `Card` của antd. antd thêm đệm thân 24px, trong khi mọi chỗ dùng (43 file)
  đều tự có đệm kiểu shadcn (`p-6` trên Card, hoặc `CardHeader px-6 pt-6` / `CardContent px-6`), nên thẻ thực tế
  có đệm ~48px. Đây là nguồn "to" lớn nhất và sửa được một lần.
- `PageHeader` (15 trang /k): ô biểu tượng 64px, tiêu đề 36px.
- Hàng danh sách `/k` (`ItemRow`, `SectionCard`) vốn đã gọn, giữ nguyên.
- Còn lại là thẻ riêng từng trang: ô biểu tượng 56–80px, tiêu đề thẻ 20–28px, số liệu 30–36px, đệm 24–32px,
  chiều cao cố định `h-[NNNpx]`.

## Thang thu nhỏ (áp cho mọi phase, chỉ trong thẻ/khối dạng thẻ)

| Thứ | Trước → Sau |
|---|---|
| Đệm thẻ / panel | `p-8` → `p-5`; `p-6` → `p-4` (`p-5` nếu thẻ chứa form hay đoạn văn dài); `p-5` → `p-4`; `md:p-6`/`md:p-8` → `md:p-5` |
| Khoảng cách giữa các thẻ | `gap-6`/`gap-8` → `gap-4`; `space-y-6`/`space-y-8` giữa các thẻ → `space-y-4` |
| Ô biểu tượng trong thẻ | 80px → 56px, 64px → 48px, 56px → 48px, 48px → 40px; icon bên trong giảm theo tỷ lệ |
| Tiêu đề thẻ | `text-2xl` → `text-xl`, `text-xl` → `text-lg`, `text-lg` → `text-base` |
| Số liệu lớn trong thẻ | `text-4xl` → `text-3xl`, `text-3xl` → `text-2xl`, `text-2xl` → `text-xl` |
| Chiều cao cố định của thẻ | giảm ~20%, hoặc bỏ khi nội dung tự quyết định chiều cao |
| Nút trong thẻ | `size="lg"`/`h-12` → mặc định (34px); icon theo |
| Biểu tượng trạng thái rỗng / lỗi trong thẻ | `h-16 w-16` → `h-12 w-12` |

Không đụng: khung layout và lề trang, cỡ chữ nội dung đọc (`text-sm`/`text-base`), nội dung câu hỏi khi làm
bài, markdown, tiêu đề hero / tiêu đề mục của landing, sidebar và header điều hướng, `components/ui`,
`kokonutui`, `magicui`, `components/antd/*` (trừ `card.tsx`), logic và test.

## Phase

| # | Phase | Ai làm | Trạng thái |
|---|---|---|---|
| 1 | [Thành phần dùng chung](phase-01-shared.md) | main | Completed |
| 2 | [Trang /k](phase-02-k-pages.md) | agent A | Completed |
| 3 | [Component /k](phase-03-k-components.md) | agent B | Completed |
| 4 | [Phòng học, làm bài, học flashcard](phase-04-live-pages.md) | agent C | Completed |
| 5 | [Admin và trang công khai](phase-05-admin-public.md) | agent D | Completed |
| 6 | Kiểm tra: tsc, eslint file đã đổi, `yarn test`, build; chụp trang công khai; review toàn bộ | main | Completed |

Phase 2–5 sở hữu các file tách rời nhau và chạy song song sau phase 1.
