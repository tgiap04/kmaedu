# Chuyển toàn bộ icon frontend sang Phosphor

Quyết định của người dùng (2026-11-18): thư viện **@phosphor-icons/react 2.1.10**, kiểu **kết hợp** (nét
`regular` cho điều khiển, `duotone` cho icon trang trí). Chỉ frontend (`kmaedu-fe`), không đổi backend.

## Hiện trạng

- 205 file import `lucide-react`, 193 icon khác nhau, 36 chỗ dùng kiểu `LucideIcon`.
- Lẻ: `@tabler/icons-react` (2 file đăng nhập/đăng ký), `react-icons/fa` (1), `@ant-design/icons` (4 import trực tiếp).
- Lucide mặc định 24px; Phosphor mặc định `1em` → phải đặt mặc định 24px qua `IconContext` để icon không
  có class kích thước giữ nguyên cỡ.

## Các phase

| # | Phase | Trạng thái |
|---|---|---|
| 1 | Nền: cài gói, `IconContext` mặc định (24px, regular), helper `DecorativeIcons` (duotone), kiểu `AppIcon` | Completed |
| 2 | Codemod lucide → Phosphor theo bảng `icon-map.json` (AST TypeScript, giữ alias, đổi `LucideIcon` → `Icon`, `strokeWidth` → `weight`) | Completed |
| 3 | Thư viện lẻ (tabler, react-icons, antd icons) → Phosphor; gỡ `lucide-react`, `@tabler/icons-react`, `@heroicons/react`, `react-icons` khi không còn import | Completed |
| 4 | Chọn lại icon theo ngữ nghĩa từng mục (menu trái, đầu trang, thẻ thống kê) + bật duotone cho các vùng trang trí | Completed |
| 5 | Kiểm tra: tsc, eslint, vitest, build, grep không còn import cũ, so kích thước bundle | Completed |

## Quy tắc codemod

- Dùng tên có hậu tố `…Icon` của Phosphor (bản không hậu tố đã deprecated) → không đụng `Map`, `Image`, `Link`.
- Import có alias (`Clock as ClockIcon`) giữ tên cục bộ; import không alias đổi tên mọi tham chiếu (AST, bỏ qua
  tên thuộc tính, key object, chuỗi).
- Hai icon Lucide cùng ánh xạ một icon Phosphor trong một file → gộp một import.
- Tên đích trùng một binding khác trong file → dừng và báo, sửa tay.
- `strokeWidth` ≥ 2.5 trên icon → `weight="bold"`; còn lại bỏ thuộc tính (Phosphor không dùng nét).

## Rủi ro

- Kích thước mặc định (đã xử lý ở phase 1), icon dùng trick `fill-*` (đổi sang `weight="fill"`, sửa tay),
  file vendor `src/components/ui|kokonutui|magicui` (vẫn chuyển, không lint).
- Không thể xem trên trình duyệt trong phiên (cần đăng nhập) → người dùng kiểm tra trực quan.

## Kiểm tra cuối

`yarn tsc --noEmit`, `yarn eslint` các file đổi, `yarn test`, `yarn build`, `git grep "lucide-react"` = 0.
