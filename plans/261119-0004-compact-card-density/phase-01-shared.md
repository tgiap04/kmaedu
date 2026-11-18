# Phase 1 — Thành phần dùng chung (main)

Ưu tiên: cao (phase 2–5 dựa vào). Thang thu nhỏ: `plan.md`.

## File
- `kmaedu-fe/src/components/antd/card.tsx`: thân antd Card đệm 0 (mỗi chỗ dùng tự có đệm, như shadcn);
  `CardHeader` `px-5 pt-5`, `CardContent` `p-5`, `CardFooter` `px-5 pb-5`, `CardTitle` `text-lg`.
- `kmaedu-fe/src/components/k-page/page-header.tsx`: ô 64 → 48px, tiêu đề 36 → 28px, phụ đề 16 → 14px.
- `kmaedu-fe/src/components/molecules/HistoryStatCard.tsx`: đệm 20 → 16px, số 30 → 24px, ô 36 → 32px.
- `kmaedu-fe/src/components/molecules/StatCard.tsx`: số 24 → 20px.

## Xong khi
- tsc, eslint các file trên = 0.
- Chỗ dùng `Card` mà không tự có đệm đã được xem (chỉ `UserSearchInput` dropdown — hàng tự có `px-3`).

## Rủi ro
- `Card` có `CardHeader` nhưng không có `CardContent` → mất đệm dưới. Phase 3–5 xem lại thẻ của mình.
