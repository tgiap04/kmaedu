# Bo góc đồng nhất 10px cho frontend

Quyết định của người dùng (2026-11-18): mọi bo góc = **10px**; dạng viên thuốc (`rounded-full` trên nút, ô
nhập, badge) → 10px; **giữ tròn** những thứ vốn là hình tròn (avatar, chấm, nút icon tròn, số thứ tự trong vòng
tròn, công tắc, vòng xoay chờ).

## Hiện trạng

26 kiểu bo góc trên 204 file: `rounded-full` 241, `rounded-lg` 114, `rounded-xl` 85, `rounded-2xl` 67,
`rounded-md` 40, `rounded-[20px]` 31, `rounded-[8px]` 27, `rounded` 22… CSS antd riêng 8/12/18px, theme antd 8px
(Modal 12px).

## Các phase

| # | Phase | Trạng thái |
|---|---|---|
| 1 | Token Tailwind: mọi `--radius-*` = 10px (rounded, sm…4xl đều ra 10px) | Completed |
| 2 | Codemod class: `rounded-[Npx]` → `rounded-lg`; `rounded-full` dạng viên thuốc → `rounded-lg`, hình tròn giữ; ca không rõ → giữ + liệt kê để xem tay | Completed |
| 3 | antd: theme `borderRadius`/`borderRadiusLG` = 10, Button/Modal/Tag = 10; CSS ghi đè trong `globals.css` 8/12/18px → 10px | Completed |
| 4 | Kiểm tra: tsc, eslint, test, build; đo `border-radius` thực tế trên trang công khai bằng Chrome | Completed |

## Phân loại `rounded-full`

Xét chuỗi class chứa nó: có `size-*`, `aspect-square`, `h-N` = `w-N`, `animate-spin` → hình tròn, giữ. Có
`px-*`/`pl-*`/`pr-*`, `w-full`, `flex-1`, `min-w-*`, hoặc `h-N` ≠ `w-N` → viên thuốc, đổi. Còn lại → giữ, xem tay.
Thanh cao ≤ 20px với bo 10px vẫn tròn hai đầu, nên đổi thanh tiến độ không đổi hình.
