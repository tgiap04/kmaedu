# Phase 02a report - /k/manage-exam and /k/flash-card

## Files changed (all under kmaedu-fe/src)
- components/organisms/k/ManagementTable.tsx (rewritten), management-table-rows.tsx + management-table-types.ts (new: mobile rows, shared types)
- components/organisms/k/{ExamTable,FlashcardTable}.tsx: new optional props totalResults, onCreate (passed through)
- components/organisms/k/{Exam,Flashcard}{ManagementHeader,StatsSection,SearchFilterBar,TablePagination}.tsx: classes/markup only
- templates/{ExamManagementTemplate,FlashcardManagementTemplate}.tsx: layout gap + pass totalResults/onCreate
- components/organisms/TableSkeletonLoader.tsx: reshaped (only the two pages use it)
- Pages ManageExamPage/FlashcardsPage unchanged (they only render the skeleton and the templates).

## Look now
- Header: PageHeader (gradient icon tile, large title, subtitle), "Tạo đề thi"/"Tạo flashcard" brand pill in actions.
- Stats: HistoryStatCard tiles (3 columns from sm, stacked on phones). Trend props were already ignored by the old StatCard.
- Search/filter: white rounded-[20px] card, hairline border, soft shadow; SearchBar min-width neutralised so 375px does not overflow.
- List: SectionCard (brand-soft icon tile, bold title, count pill = totalResults). Desktop: table with tinted header row, hairline dividers, tinted icon in name cell, brand pill primary action + ⋮ menu (share/secondary/edit/delete). Mobile (<md): ItemRow rows with status badge, primary pill, ⋮ menu.
- Empty state: SectionMessage + "Tạo đề thi"/"Tạo flashcard" pill calling the existing create handler.
- Pagination: same white card, pill buttons, focus rings.

## Left as-is
- SearchBar, FilterSelect, StatCard, ExamStatusBadge (shared with other pages), modals, all handlers/stores.
- Edit/delete/share moved from icon buttons into the ⋮ menu (same handlers, same labels); the primary action stays a visible pill and still only shows when count > 0 (on mobile with count 0, Edit becomes the visible pill).

## Verification
- tsc -b: exit 1, only errors in files I do not own (pages/k/components/attempt-detail-sheet.tsx missing ./session-analytics-sections, ExamRoomSessionAnalyticsPage) - the other agent's work in progress. None in my files.
- eslint on my files: exit 0, no errors/warnings.
- yarn test: 18 files, 122 tests passed.
- Not visually checked in a browser.

**Status:** DONE_WITH_CONCERNS
**Summary:** Both teacher list pages restyled after /k/my-materials; behaviour unchanged.
**Report:** this file
**Concerns:** tsc not clean due to another agent's files; no browser check at 375px.
