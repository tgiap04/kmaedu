# Phase 01 — Trang danh sách flashcard `/k/flash-card`: báo cáo

## File đã đổi (đều trong `kmaedu-fe/`)
Sửa: `src/pages/k/FlashcardsPage.tsx` (55 dòng), `src/templates/FlashcardManagementTemplate.tsx`,
`src/components/organisms/k/{FlashcardTable,FlashcardStatsSection,FlashcardSearchFilterBar,FlashcardManagementHeader,FlashcardTablePagination}.tsx`,
`src/pages/k/my-exams-types.ts` + `.test.ts` (bỏ `stableIndex`), `src/pages/k/components/session-card.tsx` (đổi import).

Mới: `src/lib/stable-index.ts` + `.test.ts`; dưới `src/pages/k/components/flashcard-list/`:
`flashcard-list-logic.ts` + `.test.ts`, `flashcard-row.ts`, `set-tile.tsx`, `set-pills.tsx`, `row-actions.tsx`, `toolbar-select.tsx`,
`flashcard-grid.tsx`, `empty-state.tsx`, `use-flashcard-list-data.ts`, `use-flashcard-set-dialogs.tsx`. Mọi file ≤ 120 dòng.

## Từng phần của thiết kế
| Thiết kế | Cách làm |
|---|---|
| Tiêu đề + nút "+ Tạo Flashcard" | `PageHeader` + `Button solid`, bấm `navigate("/k/flash-card/create")`. Modal tạo bộ đã bỏ khỏi trang. Trên màn < 640px nút chỉ còn dấu + (có `aria-label`) để tiêu đề không bị bóp. |
| 4 thẻ số liệu | Tổng số bộ thẻ, Tổng số thẻ, Tổng lượt xem (từ `useStatsStore`) và "Thẻ trung bình / bộ" = `totalCards / totalGroups` (1 chữ số thập phân, `averageCardsPerSet`). Thay "Đã học hôm nay" và "Tỷ lệ hoàn thành TB" như plan.md. |
| Ô tìm + lọc danh mục + sắp xếp + chuyển bảng/lưới | Ô tìm có debounce 500ms (như cũ); bộ lọc trạng thái (Tất cả / Công khai / Riêng tư) vẽ như pill "Tất cả danh mục" của thiết kế; sắp xếp; nhóm nút bảng/lưới (`aria-pressed`). |
| Sắp xếp | API `GET /flashcardsets/` không có tham số sort (chỉ page, limit, search, tags, isPublic, isPinned; BE luôn `createdAt desc`). Cũ: select sort không tác dụng gì. Nay sắp xếp **ở frontend trên trang đang tải** (`sortFlashcardSets`: Mới nhất / Tên A-Z theo `vi` / Số thẻ / Lượt xem). Hạn chế: chỉ sắp trong 10 bộ của trang hiện tại, không sắp toàn bộ danh sách. |
| Bảng "Danh sách bộ flashcard (N)" | `SectionCard` + bảng dùng container query. Từ ~900px: cột Tên bộ thẻ (ô biểu tượng + tên + mô tả), Danh mục, Số thẻ, Lượt xem, Ngày tạo, Trạng thái, Thao tác. Bấm tên đi `/k/manage-flashcard-set/:id`. Ghim hiện icon ghim cạnh tên. |
| Ảnh từng bộ | Ô biểu tượng Phosphor 40px (bảng) / 56px (lưới), icon + màu chọn cố định theo id bằng `stableIndex` (6 kiểu). Không còn emoji. |
| Cột Danh mục | Pill tag đầu tiên (`categoryLabel`), cùng tag thì cùng màu; không có tag thì "—". |
| Cột Tiến độ | Thay bằng cột Trạng thái (pill Công khai / Riêng tư). |
| Thao tác | Pill "Chơi" → `/study-flashcard/:id`; nút bút → modal sửa có sẵn; menu ··· → Quản lý thẻ, Chia sẻ, Xóa (modal chia sẻ/xóa có sẵn, được giữ nguyên). |
| Chân bảng | "Hiển thị a – b / N bộ thẻ" (`visibleRange`) + nút mũi tên và số trang cửa sổ 5 trang (`pageNumbers`), phân trang server như cũ (10 bộ/trang). |
| Dạng lưới | `FlashcardGrid`: thẻ gọn (1/2/3 cột theo bề rộng khung) cùng thông tin và thao tác. |
| Màn hẹp | Dưới ~900px mỗi dòng gọn lại (tên, mô tả, pill, "a thẻ • b lượt xem • ngày"); dưới ~670px nút thao tác xuống dưới dòng. |
| Trạng thái rỗng | `FlashcardEmptyState`: "chưa có bộ thẻ" kèm nút tạo, hoặc "không có bộ thẻ nào khớp" khi đang tìm/lọc. |

## Hành vi giữ nguyên / đổi nhỏ
- Giữ: phân trang server, tìm debounce, lọc trạng thái, modal sửa/xóa/chia sẻ, số liệu từ `useStatsStore`, `invalidateFlashcardStats` + `fetchFlashcardStats` sau xóa/sửa.
- Đổi nhỏ (có chủ đích): đổi tìm kiếm / lọc thì về trang 1 (trước đây giữ nguyên số trang nên có thể ra trang trống); sau khi xóa thì tải lại trang (hoặc lùi 1 trang nếu trang vừa hết bộ) để tổng N đúng; skeleton chỉ hiện đến lần tải đầu tiên (trước đó kết quả tìm rỗng làm thanh tìm bị gỡ ra, mất focus); bỏ các trường `*Trend` khỏi props (không dùng).
- Trang quá dài đã tách: `FlashcardsPage` 280 → 55 dòng nhờ 2 hook (`use-flashcard-list-data`, `use-flashcard-set-dialogs`).

## Test: RED rồi GREEN
- RED (stub sai cố ý, thất bại ở assertion, không phải lỗi import): `yarn vitest run src/lib/stable-index.test.ts src/pages/k/components/flashcard-list` → `Test Files 2 failed (2) | Tests 14 failed | 3 passed (17)`. Ví dụ: `expected [ 'Mạng', 'An toàn', 'Linux' ] to deeply equal [ 'An toàn', 'Linux', 'Mạng' ]`.
- GREEN sau khi cài đặt: `yarn vitest run src/lib/stable-index.test.ts src/pages/k` → `Test Files 7 passed (7) | Tests 83 passed (83)`, exit 0 (gồm test `stableIndex` đã chuyển, `my-exams-types.test.ts` vẫn xanh).
- Test mới: `categoryLabel`, `averageCardsPerSet` (chia 0, NaN), `visibleRange` (trang cuối, rỗng), `pageNumbers`, `sortFlashcardSets` (4 khóa, không đổi input, ổn định khi hòa, ngày lỗi xếp cuối).

## Lệnh kiểm tra
- `yarn tsc --noEmit -p tsconfig.json`: chỉ còn 1 lỗi ở file của agent khác (`src/pages/k/components/create-flashcard/save-cards-in-batches.test.ts(23,12) TS2571`); không có lỗi ở file của phase này.
- `yarn eslint <các file đã đổi/mới>`: exit 0, 0 lỗi.
- `yarn vitest run ...`: exit 0 như trên.

## Kiểm tra hình ảnh (harness tạm, đã xóa `__preview__/flashcard-list` và tắt vite cổng 5201)
Ảnh trong `/private/tmp/claude-501/-Users-tgiap-dev-devs-kmaedu/488c8867-498d-4858-b7a7-eabd8f01430a/scratchpad/flashcard-list/`:
`desktop-table.png`, `desktop-grid.png`, `tablet-table.png` (khung 700px), `phone-table.png`, `phone-grid.png` (khung 390px), `empty.png`.
So với ảnh 16.png: bố cục, mật độ và màu khớp (không có sidebar/topbar vì harness chỉ dựng riêng trang). Đã sửa sau vòng 1: nhãn thẻ số liệu bị cắt "..." ở màn hẹp, chiều cao dòng không đều, nút thao tác chen chật trên điện thoại.

## Không làm / cần lưu ý
- Không có cột Tiến độ, thẻ "Đã học hôm nay", "Tỷ lệ hoàn thành TB", lọc theo danh mục thật (không có dữ liệu; theo plan.md).
- Sắp xếp chỉ trong trang hiện tại (xem trên). Muốn sắp toàn bộ cần BE thêm tham số sort, ngoài phạm vi "chỉ frontend".
- Ngoài file của phase: `FlashcardManagementTemplate` không còn nhận `onCreate` modal; không còn nơi nào khác dùng các organism này (đã `git grep`). `ManagementTable`/`HistoryStatCard`/`FilterSelect`/`SearchBar` không còn được trang này dùng nhưng còn dùng ở chỗ khác nên không xóa.
- Cần route `/k/flash-card/create` do agent khác thêm; trang này chỉ điều hướng tới đó.
