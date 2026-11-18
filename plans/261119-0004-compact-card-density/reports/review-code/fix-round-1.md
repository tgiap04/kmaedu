# Fix round 1 — review only these hunks (kmaedu-fe, working tree)

Everything else in the uncommitted change was reviewed in the first pass and is out of scope.

- `src/pages/k/my-exams-types.ts` (end of file): `formatTimeAgo` → `formatAttemptTime`; under a week it delegates to
  `formatTimeAgo` from `src/lib/history/history-format.ts` (lower-case "vừa xong", clamps future times), from a week it
  prints `toLocaleDateString("vi-VN")`, unreadable date → "". Import added at the top.
- `src/pages/k/my-exams-types.test.ts`: `formatAttemptTime` tests (boundaries 1 min / 59–60 min / 23 h / 1 day /
  7 days − 1 min / exactly 7 days, fixed date strings, future, unreadable). Was RED on assertions before the change.
- `src/pages/k/components/session-card.tsx`: `CardMenu` exported, takes `className`; uses `formatAttemptTime`.
- `src/pages/k/components/continue-exam-card.tsx`: new `onTogglePin` prop, pinned marker in the title, `CardMenu` after "Lịch sử".
- `src/pages/k/MyExamsPage.tsx`: `failed` state (clears data on error, logs, "Không tải được danh sách bài thi" + retry,
  pills hidden); `expanded = expandedByUser || currentPage > 1`; `toggleExpanded` (collapsing on page ≥ 2 resets to page 1);
  `showOverview = !failed && totalPages <= 1` (pills only when the loaded page is the whole list); `onTogglePin` passed
  to `ContinueExamCard`.
- `src/pages/k/components/session-analytics-sections.tsx` ViolationsCard: chart box `h-52` → `h-64`.
- `src/pages/study-flashcard/FlashcardStudyPage.tsx:442,460`: flip card `min-h` 280/320 → 320/380.
- `src/components/organisms/k/ai-tool/flashcard-result-preview.tsx:21`: `max-h-40` → `max-h-36`.
- `src/pages/study-room/StudyRoomListPage.tsx`: skeleton `h-36` → `h-40`.
- Landing reverted to the HEAD sizes: `FeatureShowcase.tsx` rows/h3/illustration; `ProductShowcase.tsx` step rows,
  number, h3; `TestimonialsSection.tsx` quote; `AboutSection.tsx` stats grid `gap-8`. `MetricsSection.tsx` counter
  `lg:text-6xl` → `lg:text-7xl`.

Runs on this tree: tsc exit 0; eslint on these files 0 errors (3 pre-existing warnings in MetricsSection/TestimonialsSection);
`yarn test` 31 files / 223 tests exit 0; `yarn build` exit 0.
