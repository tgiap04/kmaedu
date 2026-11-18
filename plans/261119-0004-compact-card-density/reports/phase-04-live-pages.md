# Phase 4 — Phòng học, làm bài, học flashcard

## File đã sửa (chỉ đổi class)
- `exam-session/ExamQuizPage.tsx`: icon lỗi h-16 → h-12; icon kết quả h-20 → h-14; tiêu đề kết quả text-3xl → 2xl; số liệu 5 ô text-2xl → xl; gap-6/space-y-6 giữa thẻ → 4; bỏ `size="lg"` ở 2 nút (Xem tổng quan, Nộp bài). Giữ nguyên chữ câu hỏi/đáp án.
- `exam-session/ExamSessionPage.tsx`: icon trạng thái lỗi/riêng tư h-16 → h-12; `py-12` → `py-8` trong 3 thẻ; skeleton gap-6/space-y-6 → 4.
- `study-flashcard/FlashcardStudyPage.tsx`: thẻ lật p-10/sm:p-14 → p-6/sm:p-8, min-h 340/400 → 280/320; ô icon h-14 → h-12 (2 chỗ). Chữ question/answer giữ nguyên.
- `study-room/components/room-card.tsx`: p-5 → p-4; ô chữ cái size-11 → size-10; mt-4 → mt-3 (2 chỗ).
- `study-room/StudyRoomListPage.tsx`: skeleton thẻ h-44 → h-36.
- `study-room/components/{chat,roster,leaderboard,playlist}-panel.tsx`: header `px-4 pt-4 pb-3`, content `p-4 pt-0` (trước là mặc định p-5 + pb-4 sẽ cộng dồn khoảng cách với header).
- `study-room/components/pomodoro-panel.tsx`: content `py-5` → `p-4`; trạng thái tải py-10 → py-8; đồng hồ text-5xl → text-4xl.

## Sửa đệm Card (do phase 1 bỏ đệm thân antd)
- Bỏ `pt-6` trên 3 `CardContent` câu hỏi/kết quả (mặc định p-5 đã đủ).
- Thanh bên danh sách câu: ôn tập `pt-6 !pb-0 !px-0` → `py-4 !px-0` (các con đã có px riêng); đang làm bài `pt-6 !pb-0 !px-0` → `p-4` (các con không có px, trước nhờ đệm antd).
- `youtube-sync-player.tsx`: giữ full-bleed (Card overflow-hidden); `MediaControlBar` đã có `p-3` — không sửa.
- `room-rail-tabs.tsx`: dựa vào `.ant-card-body` flex/h-full, không phụ thuộc đệm — không sửa.

## Bỏ qua
- InputOTPSlot h-12 (ô nhập, không phải thẻ), modal tạo/vào/cấu hình phòng, roster-row, media-control-bar, room-access-*: đã gọn, không phải thẻ lớn.
- Header/footer trang flashcard, header phòng học, khung layout: ngoài phạm vi.

## Kết quả
- `yarn tsc --noEmit -p tsconfig.json`: exit 0, không lỗi.
- `yarn eslint` 10 file đã đổi: 0 lỗi, 4 cảnh báo có sẵn (react-hooks/exhaustive-deps, unused formatTime) không liên quan.
