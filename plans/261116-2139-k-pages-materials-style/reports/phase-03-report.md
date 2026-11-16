# Phase 03 report - word family pages

## Files changed
- kmaedu-fe/src/pages/k/WordFamilyPage.tsx (87 lines)
- kmaedu-fe/src/pages/k/WordFamilyCategoryPage.tsx (164)
- kmaedu-fe/src/pages/k/WordFamilyDetailPage.tsx (259; ~120 of it is untouched polling/state logic)
- kmaedu-fe/src/components/k/word-family/ListView.tsx (classes only)
- new: components/k/word-family/word-family-breadcrumb.tsx, word-family-toolbar.tsx

## Look now
- /k/word-family: PageHeader (Languages icon tile, same title/subtitle). Categories are white rounded-[20px] cards, hairline border, soft shadow, hover lift 200ms, 36px brand-soft icon tile, arrow. Skeleton cards, SectionMessage for empty/error.
- /:slug: breadcrumb in PageHeader eyebrow, category name/description as title/subtitle, "Tạo thêm từ gốc" in actions. Root words are in a SectionCard "Từ gốc" with a count pill, shown as a grid of small cards (tinted letter tile, hover lift). Loading = RowsSkeleton, empty = SectionMessage, generating = brand-soft banner.
- /:slug/:rootWord: breadcrumb eyebrow, PageHeader with rootWord and "N từ vựng · slug". Tree/List toggle, "Sinh lại từ con", "Lưu" and "Tạo Flashcard (n)" moved into WordFamilyToolbar (same handlers/permissions/conditions). Tree and List sit in SectionCards (tree scrolls inside its card). ListView rows use hairline-soft dividers, brand-soft POS pill, focus ring.

## Left as-is
- TreeView, WordFamilyNode, WordDetailModal, CreateFlashcardModal, HighlightedWord, word-family-tree.css: the tree and modals have their own CSS and are only used by the detail page; restyling them risked layout regressions. They are wrapped in a SectionCard only.
- antd Button/Spin kept for action buttons (behaviour and loading states unchanged). Category page keeps "Tạo thêm từ gốc" as antd primary button.
- No handlers, store calls, routes, permission checks or text meaning changed. Admin pages do not import these components (git grep: only WordFamilyDetailPage).
- Not visually checked in a browser (no ui-verifier run).

## Verification
- tsc -b: exit 0
- eslint on owned files: exit 0, no errors/warnings
- yarn test: 18 files / 122 tests passed
(An earlier tsc run showed one error in src/pages/k/components/room-detail-overview.tsx, another agent's file; it was gone on the final run.)

**Status:** DONE
