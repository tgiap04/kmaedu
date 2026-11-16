# Phase 02b report - teacher exam-room and set detail pages

## Files changed
Edited: pages/k/{ManageExamRoomPage, ManageExamRoomDetailPage, ExamRoomSessionAnalyticsPage, ManageQuizSetDetailPage, ManageFlashcardSetDetailPage}.tsx; pages/k/components/{session-card, session-history-dialog, snapshot-outdated-banner}.tsx; components/organisms/k/{ExamRoomList, RoomStatsSection, RecentParticipantsList}.tsx.
New (pages/k/components): room-detail-overview, room-sessions-section, session-analytics-sections, attempt-detail-sheet, numbered-pagination, quiz-question-row, flashcard-grid-card.

## Look now
- Room list: PageHeader (DoorOpen tile, create button right), 2 HistoryStatCard tiles, SectionCard "Danh sách phòng thi" with ItemRow per room (meta "Bộ đề: x • n câu", pill "Xem chi tiết", menu Chỉnh sửa/Xóa), SectionCard "Thí sinh gần đây" with initial tiles; skeleton and empty states in the same look.
- Room detail: breadcrumb in eyebrow, 4 stat tiles, info SectionCard, sessions SectionCard (status count pills in header, table inside overflow-x-auto with hairline dividers, pill pager, empty state with create action).
- Session analytics: breadcrumb eyebrow, 4 tiles, chart cards, ranking SectionCard (scrollable table, pill "Xem"), detail Sheet with rounded-xl tokens.
- Quiz-set detail: PageHeader (tags as subtitle), 2 tiles, LabelManager unchanged, question SectionCard (search + add in header, rows with tinted number tile, option chips in brand tokens, numbered pill pagination, inline editor in a padded row).
- Flashcard-set detail: same shell, 3 tiles, label filter + add in header, cards in a 3-col grid of rounded-2xl tiles.
- session-card/history dialog/banner: token and radius polish only.

## Left as-is
- LabelManager / FlashcardLabelManager (components/organisms, not owned; still antd Card look).
- ExamRoomDetailTemplate (only used by the learner exam-session page) and ExamRoomManagementTemplate (unused); dialogs/modals internals.
- ExamRoomCardItem, ParticipantListItem, RoomStatsCard molecules are no longer used by the room list (not deleted, not owned).
- Behaviour, stores, routes, permissions unchanged. Detail pages remain 280-380 lines because the state/handlers stay in the page.

## Verification
- tsc -b: exit 0 (after final edit)
- yarn lint on my files: exit 0, 0 errors; remaining warnings (exhaustive-deps, unused updateQuestion) pre-exist
- yarn test: 18 files, 122 tests passed

**Status:** DONE_WITH_CONCERNS
