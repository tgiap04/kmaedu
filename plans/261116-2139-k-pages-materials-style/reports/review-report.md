# Review: /k pages restyle to match /k/my-materials

Scope: `git diff -- kmaedu-fe` (52 files) plus untracked files (k-page/page-header, word-family breadcrumb/toolbar, management-table-rows/types, profile/*, flashcard-grid-card, quiz-question-row, room-*, session-analytics-sections, attempt-detail-sheet, numbered-pagination, my-exams-pagination). Read-only review; no commands that mutate the tree. Did not re-run tsc/build/tests (recorded runs accepted).

Score: 8.5 / 10. No critical defects.

## Behaviour parity (checked old vs new per page)
- ManageExamRoomDetailPage + room-sessions-section: create / share / stats / edit / delete handlers, `canManageSessions` -> SnapshotOutdatedBanner, `refreshingId`, pagination (prev/next, disabled at ends), empty and loading states all preserved.
- ExamRoomSessionAnalyticsPage + session-analytics-sections + attempt-detail-sheet: sort toggle logic identical, `cheatingStats.length > 0` gate kept, `handleViewDetail` / sheet open state kept.
- MyExamsPage: pin optimistic update + rollback, `order` style, page change, history dialog all kept. ExamsPagination hides at totalPages<=1 as before.
- ManageQuizSetDetailPage / ManageFlashcardSetDetailPage: search resets page, `disabled={showForm}` on add/edit/delete, delete-last-item-on-page logic, label filter reset, pagination window math and `totalPages > 1` gate all kept (NumberedPagination replicates the old window).
- ProfilePage: tabs, `handleProfileUpdate`, tab content gating unchanged; emoji removal is the only text change.
- WordFamilyDetailPage + word-family-toolbar: canGenerate / canSave / canToFlashcard + `viewMode === "list" && selectedCount > 0` conditions identical. WordFamilyCategoryPage: `canGenerate` gate kept.
- StudyRoomListPage: `canCreate` gate kept on header button, empty-state text, and FAB-like block at line 89. Empty-state CTAs removed, but the header still carries Join/Create, so no capability lost.
- ManagementTable (+ management-table-rows): primary action still gated on `questionCount > 0`; mobile fallback when no primary action moves "Chỉnh sửa" to the main pill and keeps secondary/share/delete in the menu, so every action stays reachable. Desktop table hidden below md, mobile rows hidden at md+.
- QuizPractice, PracticeHistory (retry / open), SharedQuizSection, VerifyPage (resend/disabled): handlers and conditions intact.
- No clickable div/article/li without a button/link was introduced (grep of `<div|article|span|li|tr ... onClick` over touched files returned nothing). Only pre-existing `TableHead onClick` sort headers (see C5).

## history / ai-tool / my-materials
- No file under history/ or ai-tool/ is in the diff. `HistoryStatCard` is unchanged. The renamed k-page kit (`ItemRow`, `SectionCard`, ...) has no importer in history/ai-tool.
- my-materials: only import renames + `PageHeader` in MyMaterialsPage. `SectionCard` with `illustration` renders the same DOM/classes as before (body class string identical when `plain` is unset); `PageHeader` reproduces the old header classes (icon size/stroke moved to `[&_svg]`). Rendered output should be identical; recommend one visual check of `/k/my-materials` anyway.

## Critical defects
None found.

## Concerns
C1 (low, a11y/UX) `components/k-page/item-row.tsx` menu items and `management-table-rows.tsx:buildRowMenu`: "Xóa" is a plain DropdownMenuItem with no destructive styling, while the old table used a red trash icon and ExamRoomCardItem a `destructive` button. Scenario: user opens the ⋮ menu on /k/flash-card and sees Edit and Delete styled identically; one mis-click opens the delete confirm. Confirm dialogs still exist, so risk is cosmetic. Suggest `variant?: "destructive"` on RowAction -> `text-destructive`.
C2 (low) `ItemRow` menu `key={label}` (item-row.tsx ~line 95) and `buildRowMenu` fall back to `label: ""` when `secondaryActionLabel` / `shareActionLabel` is undefined. Two empty labels -> duplicate React key and an unlabeled menu entry. Props are optional in `ManagementActions`; make the label required when the icon is given.
C3 (low, scope) /k/manage-exam-room (`ExamRoomList.tsx`) also moved edit/delete into the ⋮ menu. The stated intended change names only /k/manage-exam and /k/flash-card; confirm this is accepted. Also `ExamRoomList` now shows "Bộ đề: {roomType}" and "Riêng tư" as meta text; the old Lock icon / "Câu hỏi" label are gone.
C4 (low, mobile) `page-header.tsx`: the `<h1>` is `min-w-0 flex-1` but has no `break-words`/`line-clamp`. A long exam title or an unbroken word in `ManageExamRoomDetailPage` / `ManageQuizSetDetailPage` at 360px can still overflow the 3xl text. Add `break-words`.
C5 (low, a11y, pre-existing) `session-analytics-sections.tsx:106,109` sortable `TableHead onClick` is mouse-only (no button/tabindex/aria-sort). Not a regression, but the restyle was the chance to fix it.
C6 (low) `ExamSearchFilterBar.tsx` / `FlashcardSearchFilterBar.tsx` use `[&>div:first-child]:...` arbitrary selectors to restyle the child `SearchBar` root. Silent break if SearchBar's root element changes. Same fragility for templates' `[&>header]:-mb-5` (cancels PageHeader's `mb-6`) in `ExamManagementTemplate.tsx` / `FlashcardManagementTemplate.tsx`. Prefer a `className` prop or `PageHeader` `compact` flag.
C7 (low, UX) Error text lost its error colour: `WordFamilyDetailPage` / `WordFamilyCategoryPage` now render `<SectionMessage title={error}/>` (text-ink, no retry) where the old box used red `#c64545`. Users may not read it as an error. Use a destructive variant.
C8 (low) `ManageFlashcardSetDetailPage` PageHeader subtitle now shows the fallback "Quản lý thẻ nhớ và nhãn..." when description is empty (old: nothing). Harmless copy change; mention in changelog of intended UX.
C9 (cosmetic) `ManagementTable` empty state shows the count pill "0" (`totalResults ?? data.length`) and the data-less `ManagementMobileRows` wrapper adds a redundant `<div key>` around each `ItemRow`. PracticeHistory nests a bordered SectionCard inside the practice SectionCard's Tabs (card-in-card).
C10 (a11y, low) `profile-tabs.tsx` sets `role="tablist"`/`role="tab"` but no `role="tabpanel"`, `aria-controls`, or arrow-key handling; screen readers announce tabs that behave as plain buttons. Either drop the roles or complete the pattern.

## Mobile overflow audit
- Fixed widths: `ItemRow` metric `w-[180px]` is `hidden lg:flex` (ok); action pill `sm:min-w-[112px]` and label collapses to icon below sm (ok); title/meta truncate inside `min-w-0 flex-1` (ok).
- Tables: RoomSessionsSection and ManagementTable desktop table are inside `overflow-x-auto` (ok); ManagementTable has a dedicated mobile list.
- SectionCard body has `min-w-0`; plain-mode grids use `p-4` + responsive columns. `SelectTrigger w-40` in flashcard label filter sits in a `flex-wrap` header (ok).
- `numbered-pagination` and `ExamTablePagination` wrap (`flex-wrap`/`flex-col sm:flex-row`) (ok).

## Refinements
1. Add a destructive variant to `RowAction` and require labels in `buildRowMenu` (C1, C2).
2. `break-words` on PageHeader title (C4).
3. Give `SearchBar` a `className` prop instead of `[&>div:first-child]` selectors, and give `PageHeader` a `className` or `tight` prop instead of `[&>header]:-mb-5` (C6).
4. Add a unit test for `buildRowMenu` (order secondary, share, edit, delete; mobile no-primary slice) since it holds the only non-trivial new logic; the other new pieces are presentational.
5. Run one visual pass (390px and 1280px) on /k/manage-exam, /k/flash-card, /k/manage-exam-room/:id, /k/profile, /k/my-materials; tsc/build/test cannot catch layout.

Status: DONE_WITH_CONCERNS (all concerns low severity; none block merge).
