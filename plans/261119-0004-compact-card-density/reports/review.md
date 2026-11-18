# Review: thẻ gọn hơn toàn frontend (261119-0004)

## Review Summary

### Scope
- Files reviewed: toàn bộ `git diff -- kmaedu-fe/src` (126 file, +674/−626) cùng 3 file chưa track
  (`pages/k/components/continue-exam-card.tsx`, `pages/k/components/my-exams-sections.tsx`,
  `pages/k/my-exams-types.test.ts`). Đọc thêm mọi file dùng `@/components/antd/card` (43 file), kể cả file
  không bị sửa, vì đổi `styles.body.padding = 0` tác động lên tất cả.
- Depth: đọc từng hunk của diff; với từng `<Card>` thì soát cả Card, CardHeader, CardContent và phần thân.
- Không chạy lại suite: tsc, eslint, `yarn test`, build đã chạy trên cây cuối (exit 0, xem mục Numbers).

### Spec Compliance
| # | Yêu cầu (plan.md) | Kết quả | Bằng chứng |
|---|---|---|---|
| 1 | Bỏ đệm thân 24px của antd Card, mọi chỗ gọi tự đệm | PASS | `components/antd/card.tsx:15`; cả 43 file gọi đều có đệm riêng (p-4 trên Card, hoặc CardHeader/CardContent) |
| 2 | Thang thu nhỏ (đệm, gap, ô biểu tượng, tiêu đề, số liệu, chiều cao, nút) | PASS | áp đều ở admin, /k, live, công khai; vài chỗ lệch nhỏ ghi ở Low |
| 3 | Không đụng chữ nội dung đọc, câu hỏi khi làm bài, markdown | PASS | `ExamQuizPage` giữ `fontSize={16}` / `13`, `FlashcardStudyPage` giữ cỡ chữ câu hỏi |
| 4 | Không đụng sidebar/nav, `components/ui`, kokonutui, magicui, `components/antd/*` (trừ card), routes/layout | PASS | file khớp "sidebar" chỉ là `CategoriesSidebar`, `TrendingSidebar` (thẻ nội dung /k, không phải nav) |
| 5 | Chỉ đổi class, không đổi logic/props/dữ liệu (ngoài my-exams) | PASS | ngoài className chỉ có: `viewBox` cho `ProgressCircle` (bắt buộc khi thu svg), số chiều cao chart (`height` mặc định 320→260, 200→160, 260→220), bỏ `size="lg"` ở nút (plan cho phép), `width/height` của img trong `HistoryTemplate` |
| 6 | Redesign /k/my-exams (logic mới) | PASS | `examOverview`, `splitByProgress`, `stableIndex`, `formatTimeAgo` có test; xem Low #5 về số liệu trong pill |

### Assessment
Thay đổi chắc tay. Đổi `card.tsx` đúng chỗ gây "to" nhất, và mọi chỗ gọi đều đã được soát lại đệm: không thẻ nào
bị dính sát mép, không thẻ nào chỉ có header mà thiếu đệm đáy, các `-mt-8`/`pt-6` cũ (bù cho đệm antd) đã gỡ.
Còn **một lỗi hiển thị chắc chắn xảy ra** ở trang xem lại kết quả bài thi (nút bị cắt mép phải), cộng vài chỗ khoảng
cách lệch nhỏ. Các trang cần đăng nhập chưa được xem bằng mắt, nên phần hình ảnh của chúng vẫn chưa được chứng minh.

### Critical
Không có.

### High (Important)
1. **Thẻ "Danh sách câu hỏi" ở chế độ xem lại kết quả: nút "Xem tổng quan" bị cắt mép phải, khối chú thích dính sát mép thẻ**
   — `src/pages/exam-session/ExamQuizPage.tsx:569-617`.
   CardContent giữ `!px-0` (dòng 570), trước đây vẫn có đệm thân 24px của antd che cho. Giờ đệm thân bằng 0 nên:
   - `<Button className="w-full !mt-3 mx-3 …">` (dòng 617) rộng 100% cộng lề trái 12px, tràn 12px sang phải và bị
     `overflow-hidden` của Card cắt mất viền phải.
   - Khối chú thích `bg-background !p-3 !rounded-lg` (dòng 600) chạy sát hai mép thẻ.
   - Tiêu đề (`px-4`) và lưới (`px-3` + `p-1`) tự đệm nên vẫn ổn, vì vậy thẻ trông lệch: phần trên có lề 16px,
     phần dưới bằng 0.

   Sửa tối thiểu, làm giống thẻ cùng loại ở chế độ làm bài (dòng 823, đã đúng):
   - dòng 570: `py-4 !px-0` → `p-4`
   - dòng 571: bỏ `px-4` ở `h3`
   - dòng 576: `p-1 px-3` → `p-1`
   - dòng 617: bỏ `mx-3`

### Medium
Không có.

### Low (Minor)
1. **Khoảng cách giữa header và nội dung bị gấp đôi ở ConnectionInfoPanel** —
   `src/components/molecules/ConnectionInfoPanel.tsx:41,50`. CardHeader `pb-4` cộng CardContent `pt-3` ra 28px,
   trong khi mọi thẻ khác cùng kiểu chỉ 12px. Sửa: bỏ `pb-4` ở CardHeader (dòng 41).
2. **Mặt thẻ flashcard trong xem trước AI hết chỗ khi câu trả lời dài** —
   `src/components/organisms/k/ai-tool/flashcard-result-preview.tsx:15,21,65`. Khung cao 280px, `py-6` để lại
   232px cho nội dung, mà nhãn (24) + đoạn văn `max-h-48` (192) + 2 khoảng `gap-3` (24) + gợi ý (20) = 260px.
   Nội dung không bị cắt (canh giữa nên tràn vào phần đệm) nhưng đệm trên/dưới còn khoảng 10px, nhìn chật.
   Sửa: `max-h-48` → `max-h-40` ở dòng 21.
3. **Lề trái của header và danh sách lệch nhau 4px** — `organisms/k/CategoriesSidebar.tsx:20,27`,
   `organisms/k/ConversationList.tsx:36,66`, `organisms/k/PostsList.tsx:21,40`. CardHeader giờ `px-5`, danh sách bên
   trong tự đệm `px-4`. Lỗi lệch này đã có từ trước (lệch 8px), giờ còn 4px. Sửa: thêm `px-4` vào CardHeader của ba
   file, hoặc đổi danh sách bên trong sang `px-5`.
4. **Đệm thẻ chưa đồng đều** — thẻ dùng các phần con (CardHeader/CardContent mặc định) đệm 20px; thẻ `p-4` và các
   panel phòng học (`px-4 pt-4` / `p-4 pt-0`) đệm 16px; header/nội dung khi thì `pt-3`, khi thì `pt-4`
   (`profile/ChangePasswordSection.tsx:101`, `DeviceList.tsx:160`, `ProfileForm.tsx:62`). Chênh 4px, nhìn không
   ra là lỗi, nhưng nếu muốn đồng nhất thì đổi mặc định ở `card.tsx` sang `px-4 pt-4` / `p-4` / `px-4 pb-4`.
5. **my-exams: con số trong pill và skeleton** — `src/pages/k/MyExamsPage.tsx:44,101`. `examOverview(sessions)`
   chỉ đếm các phòng thuộc trang hiện tại (50 lượt thi mỗi trang, gom theo phòng phía client). Với người có hơn
   50 lượt thi, pill "N phòng thi" thấp hơn số thật. Hành vi này giống `countLabel` cũ nên không phải lỗi mới, chỉ
   ghi lại để biết. Thêm nữa, `MyExamsSkeleton` (`my-exams-sections.tsx:73`) chia cột theo `md:grid-cols-2`, còn
   lưới thật chia theo container `@3xl:grid-cols-2`, nên khi tải xong có thể nhảy bố cục. Sửa: bọc skeleton bằng
   `@container` và dùng `@3xl:grid-cols-2`. Ngoài ra `space-y-8` giữa các mục (dòng 104) lệch thang `space-y-4`
   của plan; nếu là khoảng cách giữa các mục thì có thể giữ.

### Edge Cases Turned Up
- Đã soát cả các thẻ không bị sửa mà vẫn chịu ảnh hưởng của `padding: 0`: `CategoryItem`, `ConversationItem`
  (`p-3` trên Card), `NotificationItem` (thân `p-4`), dropdown `UserSearchInput` (hàng tự `px-3 py-2`),
  `youtube-sync-player` (video tràn mép là đúng ý, `MediaControlBar` có `p-3`), `ExamMetricCard` và
  `SystemCheckSection` (`p-4`). Không cái nào bị dính mép.
- Wrapper `Card` vẫn spread `props` sau `styles` nên caller có thể ghi đè. Hiện không caller nào truyền
  `styles`/`bodyStyle`. `.glass-card .ant-card-body { padding: 24px !important }` trong `globals.css:475` sẽ
  thắng nếu sau này có ai dùng class `glass-card`, hiện không file TSX nào dùng.
- `room-rail-tabs.tsx:73` dựa vào `.ant-card-body` làm flex column cho các panel phòng học; không bị ảnh hưởng.
- Kiểm tra vị trí tương đối sau khi thu nhỏ: avatar ở `profile-summary-card` (`-top-7 size-14` + `pt-9`) vẫn
  cách chữ 8px như cũ; `RecentActivitySection` `sm:pl-[52px]` khớp ô 40px + gap 12px; icon tìm kiếm ở
  `ExamSearchFilterBar` (`left-3.5 size-4`, `pl-10`) không đè chữ; `ProgressCircle` có thêm `viewBox` nên vòng tròn
  co theo ô 64px.
- Chữ nhỏ nhất mới thêm vào là 12px; nút nhỏ nhất là `CardMenu` 28px (`session-card.tsx`), vừa đủ ngưỡng.

### Done Well
- Sửa tận gốc ở `card.tsx` thay vì vá từng trang, và có comment giải thích lý do.
- Gỡ sạch các chỗ bù cho đệm antd (`ChatHistoryCard` `-mt-8`, `pt-6` trong `ExamQuizPage`, `py-3` trên root ở
  `SubjectSelector`).
- Panel phòng học dùng `p-4 pt-0` đúng cách, nên phần thân flex/scroll vẫn giữ `min-h-0`.
- Logic mới của my-exams là hàm thuần và có test (`my-exams-types.test.ts`); `formatTimeAgo` nhận `now` để test
  được.

### Actions In Order
1. `ExamQuizPage.tsx:570/571/576/617`: thêm lại đệm cho thẻ danh sách câu hỏi ở chế độ xem lại (High #1).
2. `ConnectionInfoPanel.tsx:41`: bỏ `pb-4`.
3. `flashcard-result-preview.tsx:21`: `max-h-48` → `max-h-40`.
4. (tùy chọn) Low #3–#5.
5. Khi có tài khoản test: chụp `/k`, `/k/my-exams`, `/exam-session/:id/quiz` (cả chế độ xem lại), phòng học,
   admin overview để xác nhận phần hình ảnh.

### Numbers
- Typecheck: `yarn tsc --noEmit -p tsconfig.json` exit 0 (main thread ghi lại, cây cuối).
- Lint: eslint trên 129 file đổi, exit 0, 0 lỗi, 13 cảnh báo có từ trước.
- Test: `yarn test` 31 file / 218 test, exit 0. Coverage: không đo.
- Build: `yarn build` exit 0.
- Hình ảnh: đã xem /login, /about, /contact; chưa xem các trang cần đăng nhập.

### Still Unresolved
- Phần hình ảnh của mọi trang cần đăng nhập (/k, admin, phòng học, làm bài) chưa được xem bằng mắt. Lỗi High #1
  ở trên tìm ra bằng cách đọc code; có thể còn lỗi nhỏ khác chỉ lộ ra khi render.

```json
{
  "score": 7,
  "criticalCount": 0,
  "decision": "REWORK",
  "acceptanceCovered": [
    "antd Card body padding removed; all 43 callers pad themselves (no flush content, no header-only card without bottom padding)",
    "scale table applied across admin, /k, live pages and public pages",
    "exam question/answer text and markdown sizes unchanged",
    "no edits in components/ui, kokonutui, magicui, components/antd (except card.tsx), nav sidebar, routes, layouts",
    "class-only outside my-exams (plus required ProgressCircle viewBox and chart height defaults)",
    "my-exams new logic covered by unit tests"
  ],
  "regressionChecked": [
    "every <Card> from @/components/antd/card, including unchanged callers",
    "CardHeader/CardContent spacing combinations",
    "negative margins and absolute positioning tied to shrunk sizes",
    "fixed heights/min/max heights vs content (flip cards, charts, skeletons, scroll areas, chat panels)",
    "text below 12px and touch targets below 28px",
    "room-rail-tabs .ant-card-body flex dependency and globals.css .glass-card override"
  ],
  "contractStatus": "OK",
  "refuted": [],
  "unproven": [
    "visual correctness of authenticated pages (/k, admin, study-room, exam session) — not screenshotted"
  ],
  "reachableRegressions": [
    "ExamQuizPage review mode: 'Xem tổng quan' button overflows and is clipped on the right; legend box flush to card edges (src/pages/exam-session/ExamQuizPage.tsx:570-617)"
  ],
  "findings": [
    { "severity": "High", "category": "Layout", "location": "src/pages/exam-session/ExamQuizPage.tsx:570-617", "summary": "review-mode question list card keeps !px-0 after body padding removal: button w-full mx-3 clipped by overflow-hidden, legend flush to edges; use p-4 and drop px-4/px-3/mx-3", "disposition": "Accept" },
    { "severity": "Low", "category": "Layout", "location": "src/components/molecules/ConnectionInfoPanel.tsx:41", "summary": "CardHeader pb-4 + CardContent pt-3 gives 28px gap vs 12px elsewhere; drop pb-4", "disposition": "Accept" },
    { "severity": "Low", "category": "Layout", "location": "src/components/organisms/k/ai-tool/flashcard-result-preview.tsx:21", "summary": "280px face leaves 232px content box for up to 260px content; long answers squeeze padding to ~10px; max-h-48 -> max-h-40", "disposition": "Accept" },
    { "severity": "Low", "category": "Consistency", "location": "src/components/organisms/k/CategoriesSidebar.tsx:20-27", "summary": "header px-5 vs inner list px-4 (also ConversationList, PostsList); 4px misalignment, pre-existing at 8px", "disposition": "Defer" },
    { "severity": "Low", "category": "Consistency", "location": "src/components/antd/card.tsx:20-23", "summary": "part defaults pad 20px while p-4 cards and study-room panels pad 16px", "disposition": "Defer" },
    { "severity": "Low", "category": "Layout", "location": "src/pages/k/components/my-exams-sections.tsx:73", "summary": "skeleton uses md:grid-cols-2 while real grid uses @3xl container query; possible layout jump", "disposition": "Defer" },
    { "severity": "Low", "category": "Logic", "location": "src/pages/k/MyExamsPage.tsx:44", "summary": "overview pills count only rooms on the current 50-attempt page (same as old countLabel)", "disposition": "Defer" }
  ]
}
```
