# Phase 02 - Trang /k va templates (agent A)

Chi doi class. Khong dong vao 8 file trang Bai thi da xong.

## File da doi
- templates/ExamRoomDetailTemplate.tsx: 4 Card p-6 -> p-4 (Card nay dung antd/card, body da p-0 nen padding tren Card la dung); gap-6 -> gap-4; space-y-6 -> space-y-4; nut "Bat dau lam bai" bo size="lg".
- templates/HistoryTemplate.tsx: o icon header size-16 -> size-12, anh 40 -> 32, tieu de sm:text-3xl -> sm:text-[28px] (khop PageHeader); space-y-6, gap-6 -> 4.
- templates/ExamRoomManagementTemplate.tsx: mb-8 -> mb-4, gap-6 -> gap-4.
- templates/NotificationTemplate.tsx, ProfileTemplate.tsx: space-y-6/gap-6 -> 4.
- CreateExamPage.tsx: o icon 80 -> 56 (o trong 44 -> 36), tieu de 34px -> 28px, mo ta text-sm, nut h-12 -> h-10.
- create-exam/{exam-structure-card,exam-customize-card,pdf-quiz-file-picker,source-question-list}.tsx: p-5 md:p-6 -> p-4 md:p-5; tieu de the 18px -> text-base; icon size-6 -> size-5; mt-5/gap-6 -> 4; the chon file p-4 -> p-3.
- create-exam/exam-hero-illustration.tsx: w-40 -> w-32, p-4 -> p-3.
- ExamRoomSessionAnalyticsPage.tsx, session-analytics-sections.tsx: space-y-6/gap-6 -> 4; skeleton h-28 -> h-24, h-96 -> h-80, h-16 -> h-12; chart h-64 -> h-52.
- room-detail-overview.tsx: mb-6 -> mb-4 (2 cho). room-sessions-section.tsx: icon trang thai rong 48 -> 40.
- ManageExamRoomDetailPage.tsx, ManageExamRoomPage.tsx, ManageFlashcardSetDetailPage.tsx, ManageQuizSetDetailPage.tsx: skeleton thu ~20% (h-28 -> h-24, h-96 -> h-80, h-64 -> h-52, h-[320px] -> h-[256px], h-40 -> h-32), space-y/gap/mb-6 -> 4.
- QuizPracticePage.tsx + quiz-practice/{AccessCodeForm,PracticeResult,QuestionNavigator,QuestionPanel}.tsx: p-5 md:p-6 -> p-4 md:p-5; form ma p-6 -> p-5; diem text-4xl -> 3xl; gap/space-y 6 -> 4; py-6 -> py-4.
- VerifyPage.tsx: the p-8/p-6 sm:p-8 -> p-5; o check 80 -> 56, o khien 48 -> 40, o thanh cong 48 -> 40; tieu de text-xl -> text-lg; o OTP h-12 w-12 -> h-10 w-10; nut py-3 -> py-2; khoang cach mb/mt-6/8 -> 4/5.
- ProfilePage.tsx: gap-6 lg:gap-8 -> gap-4 lg:gap-5, gap-5 -> gap-4. profile-summary-card.tsx: banner h-24 -> h-16, avatar 80 -> 56, padding px-5 pb-5 -> px-4 pb-4, ten/chu cai text-xl -> text-lg.
- quiz-set-detail/quiz-set-detail-header.tsx: o file 72 -> 56 (icon size-8 -> 6), nut size-11 -> size-10. quiz-set-info-panel.tsx space-y-6 -> 4. quiz-set-usage-panel.tsx: o 44 -> 40, py-4 -> py-3.
- attempt-detail-sheet.tsx: so lieu text-3xl -> 2xl, avatar 48 -> 40, space-y-6 -> 4.
- WordFamilyPage.tsx: skeleton card p-5 -> p-4. PDFHistoryPage.tsx, ExamHistoryPage.tsx: tieu de the text-lg -> text-base, pagination py-4 -> py-3.

## Card padding
Chi 1 file import Card tu antd/card: ExamRoomDetailTemplate (5 Card, deu da co padding p-N tren Card, khong co CardHeader/Content). Da doi het sang p-4. Cac file con lai dung SectionCard/div tu bao boc, khong bi anh huong boi Phase 1.

## Bo qua (co chu y)
- Layout shell: gap-5 cua cac trang (AIToolPage, CreateExamPage, ManageQuizSetDetailPage, MyMaterialsPage, Flashcard/ExamManagementTemplate co `[&>header]:-mb-5` gan voi gap-5): khong nam trong thang, ghi nhan layout.
- Tieu de trang (h1 text-2xl/3xl tren Notification, ExamHistory, PDFHistory, Profile template): tieu de trang, khong phai the.
- ManageExamPage, FlashcardsPage, HistoryPage, AIToolPage, MyMaterialsPage, ManageExamRoom list, WordFamily Category/Detail: chi dung SectionCard/ItemRow hoac component ngoai thu muc (organisms/molecules thuoc agent khac), khong co lop the rieng can sua.
- question-inline-editor, quiz-set-chapter-manager, flashcard-grid-card, quiz-set-stats: da gon (p-4 md:p-5, tile 32-40px).
- Dep nhan 'ExamOverviewStatCard', 'RoomStatsSection', 'ExamRoomList', 'ProfileForm' (components/organisms|molecules): ngoai pham vi, nen phase 3/4/5 xu ly.

## Kiem tra
- `yarn tsc --noEmit -p tsconfig.json`: exit 0.
- `yarn eslint <37 file da doi>`: exit 0, 0 error, 4 warning co san (react-hooks/exhaustive-deps trong ManageFlashcardSetDetailPage, react/no-unstable-default-props trong ExamRoomDetailTemplate) khong lien quan.
- Khong chay test moi (chi doi class). Khong dung git.
