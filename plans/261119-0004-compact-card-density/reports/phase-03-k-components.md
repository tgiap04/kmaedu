# Phase 03 — Component /k: báo cáo

Chỉ đổi class. 48 file, không đụng logic, props, test. Thang theo plan.md.

## Card không còn đệm của antd (sửa theo Phase 1)
- Card chỉ có nội dung trần: `ExamInstructionsSection`, `ExamProgressSection`, `NeedHelpSection`, `QuickTasksSection`, `UpcomingExamsSection` p-6 -> p-4.
- `FormSelectFlashcardSet`, `FormSelectQuizSet`: `<CardContent>` -> `p-4` (form tạo nhanh).
- `FlashcardInlineForm`, `QuestionInlineForm`: Card p-6 -> p-5 (form), tiêu đề text-lg -> text-base.
- Card có CardHeader + CardContent (CardContent mặc định giờ là p-5 nên thêm `pt-3` để khỏi cách tiêu đề 20px): `InterfaceSettingsSection`, `NotificationList`, `TopContributors`, `TrendingSidebar`, `ConnectionInfoPanel`, `QuestionConfigSection`, `FlashcardLabelManager` (2 Card). Profile (`ProfileForm`, `DeviceList`, `ChangePasswordSection`): `pt-6` -> `pt-4`.
- Card có CardContent `p-0` hoặc ScrollArea tự đệm: `CategoriesSidebar` (thêm `pb-3` cho header vì không còn đệm antd), `PostsList`, `ConversationList` (`pb-4` -> `pb-3`).
- `ChatHistoryCard`: bỏ `-mt-8` (bù đệm cũ) -> `pt-1`.
- `SubjectSelector`: Card con bỏ `py-3` (kiểu shadcn), CardContent `p-3`.
- Giữ nguyên (đã ổn): NotificationItem, CategoryItem, ConversationItem, UserSearchInput dropdown, PostCard/UpcomingSessionCard/ExamMetricCard/SystemCheckSection (đã p-4), NotificationFilterSidebar/SettingsSidebar (p-4).

## Thu nhỏ theo thang
- Tiêu đề thẻ: text-xl -> text-lg (InterfaceSettings, NotificationList, PostsList, QuickTasks, UpcomingExams, ConversationList, Profile/Device CardTitle); text-lg -> text-base (CategoriesSidebar, TopContributors, TrendingSidebar, ConnectionInfoPanel, PostCard, HistoryListCardHeader, RecentActivitySection, ai-tool recent-files, tiêu đề empty state).
- Ô biểu tượng: `CountdownTimer` 64 -> 48 (icon 32 -> 24), `ProgressCircle` 80 -> 64 (thêm viewBox để vòng co theo), `RecentActivitySection`/`HistoryListCardHeader` 44 -> 40, `IconTile` (ai-tool) 48 -> 40, `exam-overview-stat-card` 56 -> 48, DeviceList 44 -> 40, TableSkeletonLoader 64 -> 48 (khớp PageHeader mới).
- Số liệu: `exam-overview-stat-card` 28px -> text-2xl, `CountdownTimer` 3xl -> 2xl, ProgressCircle xl -> lg.
- Đệm thẻ: ExamHistoryListSection/PDFHistoryListSection/RecentActivitySection/TableSkeletonLoader p-5 -> p-4; ai-tool panel `p-4 md:p-5` -> `p-4` (result-panel md:p-6 -> md:p-5); FlipCard p-8 -> p-5; exam-overview-stat-card px-4 py-5 -> p-4; ExamSearchFilterBar p-2.5 -> p-2.
- Chiều cao/nút: ExamSearchFilterBar control h-12 -> h-10 (icon/pl theo), ExamManagementHeader nút h-12 -> h-10, ai-tool nút/ô nhập h-11 -> h-10, upload dropzone gọn hơn (pt-7/pb-6 -> pt-5/pb-5, hình 128x96 -> 112x80), result-panel min-h 600 -> 480, empty state ai-tool 360 -> 300, flashcard preview h-340 -> 280, quiz-result-list min/max 360/620 -> 300/520, RecentFilesList min-h 320 -> 280; ResultLoading gap/đệm gọn, tiêu đề 26/30px -> 22/24px.
- Khoảng cách: TrendingSidebar space-y-6 -> 4, RoomStatsSection mb-6 -> mb-4, ProfileForm space-y-6 -> 5, ConnectionInfoPanel/InterfaceSettings/QuestionConfig space-y-6 -> 4/5, FormSelect* gap-6 -> 4, py-12/py-8 của empty state -> py-8/py-6.
- Empty state: RecentFilesModal, RecentFilesList h-16 w-16 -> h-12 w-12; ChangePasswordSection thành công 56 -> 48; SubjectSelector icon 48 -> 40.

## Bỏ qua và lý do
- `organisms/k/SideBar.tsx`, `HeaderSection` (điều hướng/landing), `StandardMarkdownRenderer`, `RichTextEditor`/`RichTextViewer` (nội dung đọc).
- `FlipCard` cỡ chữ (nội dung flashcard để đọc), chỉ đổi đệm.
- `k/word-family/*` (node cây có bố cục px cố định trong CSS, modal), ExamHeaderSection h1 (tiêu đề trang thi).
- Các dialog/modal (ExamRoomModal, ExamSessionFormModal, QuestionEditorDialog, PracticeSettingsModal, ViewFlashcardDialog, ImageUrlDialog, ...): chỉ vỏ dialog, hộp bên trong đã p-3/p-4.
- Bảng (ExamTable, ManagementTable, thead h-14/h-10) không phải thẻ.
- Không cần sửa ngoài phạm vi.

## Kiểm tra
- `yarn tsc --noEmit -p tsconfig.json`: exit 0, 0 lỗi.
- `yarn eslint <48 file đã đổi>`: exit 0, 0 lỗi, 1 cảnh báo cũ (`FlashcardLabelManager.tsx:142` react-hooks/exhaustive-deps, không do sửa này).
- Không chạy build/dev server; chưa xem bằng mắt.

Lưu ý: thư mục scratchpad dùng chung nên một agent khác ghi đè file danh sách của tôi giữa chừng; tôi chỉ sửa file bằng đường dẫn tường minh, đã kiểm tra lại danh sách file đổi.
