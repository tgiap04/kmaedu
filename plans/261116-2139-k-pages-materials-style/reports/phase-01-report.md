# Phase 01 report - learner pages

Verification: tsc -b exit 0 (final run); yarn lint exit 0, 0 errors, no warnings in owned files; yarn test 18 files / 122 tests pass.

Files changed (frontend, kmaedu-fe/src):
- pages/k/MyExamsPage.tsx, my-exams-types.ts (grouping helpers moved here), components/my-exams-pagination.tsx (new)
- pages/k/QuizPracticePage.tsx, components/quiz-practice/{AccessCodeForm,PracticeHistory,PracticeResult,QuestionNavigator,QuestionPanel}.tsx
- pages/k/ProfilePage.tsx, components/profile/{profile-summary-card,profile-tabs}.tsx (new), components/molecules/profile/{ProfileForm,ChangePasswordSection,DeviceList}.tsx (classes only)
- pages/k/VerifyPage.tsx
- pages/study-room/StudyRoomListPage.tsx, components/room-card.tsx (only used by the list page)

Look now: every page has PageHeader (icon, Vietnamese subtitle, actions) and SectionCard blocks. My-exams: grid of existing SessionCard inside a card with count pill, SectionMessage empty state. Quiz practice: header with pill link, intro tabs in a card, history as ItemRow list with RowsSkeleton/SectionMessage/retry; question panel, navigator, result cards use the rounded-[20px] frame; runner logic untouched. Profile: summary card and pill tabs, form cards use 36px brand-soft tile and pill buttons. Verify: PageHeader plus rounded card, zinc/red replaced by tokens. Study room list: header actions, "Phòng của tôi" card, restyled room cards.

Left as-is: SessionCard and session-history-dialog (outside my list); Tabs/Button/Input components from antd; practice progress logic. Removed an emoji from the profile completeness text (text meaning unchanged).
