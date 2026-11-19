## Re-Review: fix vòng 1 (3 trang flashcard, kmaedu-fe, cây chưa commit)

Phạm vi: chỉ các hunk trong `fix-round-1.md`, đối chiếu với các mục "Chấp nhận" trong `adjudication.md`. Đọc kèm `src/stores/useAIGeneratorStore.ts` (vòng đời `currentJobId`, resume, poll) để kiểm I-1. Không chạy trình duyệt, không đăng nhập.

Chạy lại (bản sao ở scratchpad `fc-rereview/`, `node_modules` symlink, không đụng repo):
- `vitest run src/lib/flashcard-detail src/pages/k/components/create-flashcard` → 7 file, 100 test, exit 0.
- `tsc --noEmit -p tsconfig.json` → exit 0.
- 8 mutation, cả 8 bị test bắt (1 test đỏ mỗi lần): bỏ khử trùng trong `collectPages`; nuốt lỗi một trang; bỏ giới hạn song song; `frontToSave` luôn viết lại; `aiJobBlock` bỏ `hasJob`; `onJobEnd` bỏ nhánh "empty"; `onJobEnd` lưu khi job chưa từng chạy; `read-gate.end` chỉ đếm lượt đọc hiện hành.

### Findings Under Verification
- addressed Important `CreateFlashcardPage.tsx:101-115` (I-1, job tạo đề bị mồ côi) — `aiJobBlock` (`flashcard-flow-logic.ts:58-61`) khóa khi `testGenerating || hasJob` mà không có job flashcard; `blocked` chỉ áp khi chưa có kết quả (`use-document-generation.ts:33`); kiểm lại bằng `getState()` sau `await pdfOk()` (`:55-60`); nút bị tắt + dòng giải thích (`CreateFlashcardPage.tsx:79,140`). Đã soát store: mọi đường kết thúc (completed/failed/hết lượt/lỗi poll liên tiếp/cancel) đều đặt `currentJobId = null`, nên không có trạng thái khóa vĩnh viễn.
- addressed Important `flashcard-detail.ts:78-82` (I-2, trùng/thiếu/song song) — `collectPages` (`flashcard-detail.ts:89-101`): tối đa `COLLECT_CONCURRENCY = 3` worker, ghép theo thứ tự trang, `appendUnique` theo `id` giữ bản đầu. Phần "thiếu thẻ ở ranh giới trang" vẫn do backend (đã ghi, ngoài phạm vi frontend như plan chấp nhận).
- addressed Important `use-create-flashcard-submit.ts:41-76` (I-3, luồng nhiều bước chưa test) — quyết định tách thành `createAndFill`, `pathAfterCreate`, `onJobEnd`, `aiJobBlock` (`flashcard-flow-logic.ts:14-61`), 17 case; hook submit (`use-create-flashcard-submit.ts:42-77`) và sao chép (`use-copy-flashcard-set.ts:35-69`) chạy qua chúng. Mutation cho thấy test bắt được lỗi thật.
- addressed Minor `use-copy-flashcard-set.ts:37-44` — dùng `saveCardsInBatches` (`:48`), lỗi giữa chừng vẫn mở bộ mới và báo `X/N` (`:58-65`).
- addressed Minor `flashcard-detail-header.tsx:92` — `disabled={copying || copyDisabled}` (`flashcard-detail-header.tsx:94`), `copyDisabled={cards === null}` (`ManageFlashcardSetDetailPage.tsx:113`).
- addressed Minor `use-copy-flashcard-set.ts:51` — cờ `mounted` + `pathAfterCreate(result, mounted.current)` (`use-copy-flashcard-set.ts:27-33,64`).
- addressed Minor `CreateFlashcardPage.tsx:87` (job có historyId, 0 thẻ) — `onJobEnd` trả "empty" → toast lỗi, không tạo bộ (`use-document-generation.ts:47`).
- addressed Minor `CreateFlashcardPage.tsx:115` (job từ /k/ai-tool khóa tab) — chỉ khóa khi `startedHere = wantsSave && gen.isGenerating` (`use-document-generation.ts:81`, `CreateFlashcardPage.tsx:102`).
- addressed Minor `CreateFlashcardPage.tsx:101-103` (bấm đúp khi kiểm file) — `start` bọc `singleFlight` (`use-document-generation.ts:51-64`).
- addressed Minor `document-source-panel.tsx:48` — câu đổi thành "nhấn **Lưu thành bộ thẻ**".
- addressed Minor `flashcard-inline-editor.tsx:24-30` — mặt trước không sửa được giữ nguyên byte (`flashcard-detail.ts:74-77`, `flashcard-inline-editor.tsx:31`). Còn lại (không chặn): người dùng sửa một thẻ chữ trơn có entity lạ thì ô nhập hiện entity thô và lưu đúng như ô hiện; đó là đúng chữ người dùng thấy, không phải mất dữ liệu ngầm.
- addressed Minor `ManageFlashcardSetDetailPage.tsx:108` — `cardCount: number | null` → "—" (`flashcard-detail-stats.tsx:47-48`), hộp xóa ghi "toàn bộ" (`ManageFlashcardSetDetailPage.tsx:173`), tab thẻ/thống kê hiện skeleton hoặc "Thử lại" (`:105-109,120`).
- addressed Minor `use-flashcard-cards.ts:28-40` (reload về muộn ghi đè) — `createReadGate` (`read-gate.ts:6-26`); `patched` vô hiệu lượt đọc đang bay và đọc lại (`use-flashcard-cards.ts:51-53`), kết quả cũ bị bỏ (`:33,37`).
- addressed Minor `flashcard-tabs-bar.tsx:37-53` (a11y tab) — `id`/`aria-controls`/`tabIndex` lăn + mũi tên/Home/End (`flashcard-tabs-bar.tsx:41-62`), `role="tabpanel"` (`ManageFlashcardSetDetailPage.tsx:119`), cũng áp ở `source-tabs.tsx:15-38` và `CreateFlashcardPage.tsx:103`. Xem N-2 cho một chi tiết còn sót.
- addressed Minor `quiz-to-flashcards.ts:10-23` — so khớp đi qua `plainText` (giải entity) (`quiz-to-flashcards.ts:11,22-24`); test "AT&T" vs `AT&amp;T`. Phần chữ cái sau D vẫn bị bỏ và được đếm, đúng điều kiện trong phân xử.
- không xét (Defer) Minor `use-flashcard-list-data.ts:43-55` — bác bỏ/để sau trong phân xử, fix không đụng.

### Verdict Entries Under Verification
None (`refuted`, `unproven`, `reachableRegressions` của verdict trước đều rỗng).

### New Findings From The Fix Diff
- N-1 Minor `kmaedu-fe/src/lib/flashcard-detail/flashcard-detail.ts:93-99` — khi một trang lỗi (ví dụ 429), `Promise.all` reject ngay nhưng các worker còn lại vẫn tiếp tục lấy hết các trang còn lại. Bộ 3.000 thẻ lỗi ở trang 2 vẫn bắn thêm ~28 request vô ích, và nếu lỗi là 429 thì làm giới hạn của gateway nặng thêm; người dùng bấm "Thử lại" trong lúc đó thì hai loạt chạy song song (read-gate chặn kết quả cũ nên dữ liệu vẫn đúng, chỉ phí request). Sửa: thêm cờ `failed` dùng chung, worker bắt lỗi thì đặt cờ và các worker khác dừng vòng `while`; test: trang 2 lỗi → số lần gọi `fetchPage` ≤ `COLLECT_CONCURRENCY + 1`.
- N-2 Minor `kmaedu-fe/src/pages/k/components/flashcard-detail/flashcard-tabs-bar.tsx:59`, `kmaedu-fe/src/pages/k/components/create-flashcard/source-tabs.tsx:34` — mọi tab đều có `aria-controls` trỏ tới panel riêng, nhưng trang chỉ render một `tabpanel` (của tab đang chọn), nên các tab không chọn trỏ tới id không tồn tại; axe báo `aria-valid-attr-value`, trình đọc màn hình không theo được liên kết. Sửa: chỉ gắn `aria-controls` cho tab đang chọn (`aria-controls={on ? panelId : undefined}`), hoặc render đủ panel và ẩn bằng `hidden`.

Không thấy hồi quy ở các luồng được yêu cầu soát:
- Tạo bộ → điền thẻ: create lỗi thì ở lại, giữ input; fill lỗi thì giữ và mở bộ, báo số thẻ; rời trang thì không kéo về.
- Tự lưu khi job AI kết thúc: `wantsSave` chuyển từ ref sang state; effect chạy theo `isGenerating` nên đọc đúng `wantsSave` của lần render đó. Hủy → skip; job lỗi trước khi bắt đầu → `setWantsSave(false)` (`use-document-generation.ts:63`); rời trang giữa job → quay lại thấy "Lưu thành bộ thẻ", không tự lưu.
- Sao chép: single-flight, tắt khi chưa có thẻ, mở bộ dở dang.
- Trang chi tiết: khử trùng + 3 luồng song song; read-gate không để lượt đọc cũ ghi đè thao tác sửa/xóa.
- Chặn job AI giữa /k/ai-tool và trang tạo: không có đường nào giữ `currentJobId` mãi sau khi job dừng. Còn một điểm có từ trước (không do fix): job được resume đặt `isGenerating` ở cả hai store, nên trên trang tạo nút "Dừng tạo" có thể dừng một job tạo đề được resume. Đây là hành vi của store dùng chung, ngoài phạm vi vòng này.
- Sửa tại chỗ mặt trước chữ trơn: không sửa thì giữ nguyên byte; sửa thì lưu một đoạn `<p>` đã escape.
- Tab: chuyển bằng mũi tên đưa focus sang tab mới, roving tabindex đúng; tab bị `disabled` không nhận phím (đúng).

Kiểm test (testing-policy §9 "After code"): test mới khẳng định hợp đồng chứ không chép lại cài đặt; RED ghi trong `fix-round-1.md` là lỗi assertion, không phải lỗi setup; 8 mutation đều bị bắt. Lưu ý nhỏ: test giới hạn song song dùng `setTimeout` 2-5 ms để các trang xong lệch thứ tự. Nó không khẳng định thời gian nên không flaky theo đồng hồ, nhưng dùng promise điều khiển tay sẽ đúng chính sách "không sleep" hơn. Không chặn. Hook (`use-document-generation`, `use-copy-flashcard-set`) không có test riêng, nhưng chúng đã mỏng và mọi nhánh quyết định nằm trong hàm thuần đã test.

### Assessment
Ready. Cả 3 Important và các Minor đã chấp nhận đều đã xử lý. Hai mục mới đều là Minor, không chặn. Gốc rễ thứ tự hòa nhau ở backend (`orderBy` thiếu `id`) vẫn cần một PR backend riêng.

**Status:** DONE

## Verdict

```json
{
  "score": 8,
  "criticalCount": 0,
  "decision": "SEALED",
  "acceptanceCovered": [
    "list page: create button routes to /k/flash-card/create, 4 stats per plan.md, category=tags[0], status column, icon tile by id",
    "list page keeps edit/delete/share modals, server paging, debounced search",
    "detail page: header actions share/copy/delete, 4 stats, tabs, search, label filter, inline edit, paging",
    "create page: 3 tabs gated by ai:generate / quizset:manage, quiz->cards skipping unanswerable, AI history save, manual create",
    "route /k/flash-card/create guarded by flashcardset:manage, static path does not shadow other routes",
    "files <= 200 lines"
  ],
  "regressionChecked": [
    "list edit/delete/share modals and stats refresh",
    "detail label manager, card add/edit/delete, pagination, label cache invalidation",
    "shared AI generator store vs /k/ai-tool",
    "routes ordering in src/routes/index.tsx",
    "stableIndex move (my-exams session-card import)",
    "getProgressApi permission for owners",
    "fix round 1: create->fill, auto-save on AI job end, copy set, collectPages dedupe + bounded concurrency, AI job block vs /k/ai-tool (store currentJobId lifecycle), inline plain-text front edit, tab keyboard/aria; 8 mutations killed"
  ],
  "contractStatus": "OK",
  "refuted": [],
  "unproven": [],
  "reachableRegressions": [],
  "findings": [
    {
      "severity": "Important",
      "category": "Concurrency",
      "location": "kmaedu-fe/src/pages/k/CreateFlashcardPage.tsx:101-115",
      "summary": "addressed — create page ignores a running quiz job from /k/ai-tool; starting a flashcard job overwrites the shared currentJobId, orphaning the quiz job and leaving test store isGenerating stuck",
      "disposition": "Accept"
    },
    {
      "severity": "Important",
      "category": "Logic",
      "location": "kmaedu-fe/src/lib/flashcard-detail/flashcard-detail.ts:78-82",
      "summary": "addressed — collectPages fetches all offset pages in parallel without dedupe; backend orders by createdAt with ties so sets >100 cards can show duplicate/missing cards and Copy copies them wrongly; unbounded concurrency can hit the 100/min gateway limit",
      "disposition": "Accept"
    },
    {
      "severity": "Important",
      "category": "Testing",
      "location": "kmaedu-fe/src/pages/k/components/create-flashcard/use-create-flashcard-submit.ts:41-76",
      "summary": "addressed — multi-step flows (create+fill, auto-save on job end, copy) have no tests; only pure helpers are tested",
      "disposition": "Accept"
    },
    {
      "severity": "Minor",
      "category": "Maintainability",
      "location": "kmaedu-fe/src/pages/k/components/flashcard-detail/use-copy-flashcard-set.ts:37-44",
      "summary": "addressed — copy re-implements batching and does not open the partially copied set, inviting a second partial copy",
      "disposition": "Accept"
    },
    {
      "severity": "Minor",
      "category": "Logic",
      "location": "kmaedu-fe/src/pages/k/components/flashcard-detail/flashcard-detail-header.tsx:92",
      "summary": "addressed — Copy button enabled but silently no-ops when cards failed to load",
      "disposition": "Accept"
    },
    {
      "severity": "Minor",
      "category": "Logic",
      "location": "kmaedu-fe/src/pages/k/components/flashcard-detail/use-copy-flashcard-set.ts:51",
      "summary": "addressed — navigates to the copy even after the user left the page",
      "disposition": "Accept"
    },
    {
      "severity": "Minor",
      "category": "Logic",
      "location": "kmaedu-fe/src/pages/k/CreateFlashcardPage.tsx:87",
      "summary": "addressed — job with historyId but 0 cards creates an empty set then errors",
      "disposition": "Accept"
    },
    {
      "severity": "Minor",
      "category": "UX",
      "location": "kmaedu-fe/src/pages/k/CreateFlashcardPage.tsx:115",
      "summary": "addressed — a flashcard job started on /k/ai-tool locks the create page tabs",
      "disposition": "Accept"
    },
    {
      "severity": "Minor",
      "category": "Concurrency",
      "location": "kmaedu-fe/src/pages/k/CreateFlashcardPage.tsx:101-103",
      "summary": "addressed — double click during await pdfOk() starts two AI jobs (same pattern as FlashcardGenerator)",
      "disposition": "Accept"
    },
    {
      "severity": "Minor",
      "category": "UX",
      "location": "kmaedu-fe/src/pages/k/components/create-flashcard/document-source-panel.tsx:48",
      "summary": "addressed — copy says press 'Tạo Flashcard' while the button reads 'Lưu thành bộ thẻ'",
      "disposition": "Accept"
    },
    {
      "severity": "Minor",
      "category": "Logic",
      "location": "kmaedu-fe/src/pages/k/components/flashcard-detail/flashcard-inline-editor.tsx:24-30",
      "summary": "addressed — simple-front round trip collapses newlines and undecoded entities on save",
      "disposition": "Accept"
    },
    {
      "severity": "Minor",
      "category": "UX",
      "location": "kmaedu-fe/src/pages/k/ManageFlashcardSetDetailPage.tsx:108",
      "summary": "addressed — stats and delete dialog show 0 cards while cards are loading",
      "disposition": "Accept"
    },
    {
      "severity": "Minor",
      "category": "Concurrency",
      "location": "kmaedu-fe/src/pages/k/components/flashcard-detail/use-flashcard-cards.ts:28-40",
      "summary": "addressed — a reload in flight can overwrite an in-place edit/delete patch",
      "disposition": "Accept"
    },
    {
      "severity": "Minor",
      "category": "Concurrency",
      "location": "kmaedu-fe/src/pages/k/components/flashcard-list/use-flashcard-list-data.ts:43-55",
      "summary": "stale flag guards totalResults only; late response still writes the store (pre-existing)",
      "disposition": "Defer"
    },
    {
      "severity": "Minor",
      "category": "Accessibility",
      "location": "kmaedu-fe/src/pages/k/components/flashcard-detail/flashcard-tabs-bar.tsx:37-53",
      "summary": "addressed — tabs lack aria-controls/tabpanel and arrow-key navigation",
      "disposition": "Accept"
    },
    {
      "severity": "Minor",
      "category": "Logic",
      "location": "kmaedu-fe/src/pages/k/components/create-flashcard/quiz-to-flashcards.ts:10-23",
      "summary": "addressed — text-answer match ignores entities and letters past D; such questions are skipped (safe)",
      "disposition": "Defer"
    },
    {
      "severity": "Minor",
      "category": "Performance",
      "location": "kmaedu-fe/src/lib/flashcard-detail/flashcard-detail.ts:93",
      "summary": "after one page read fails, the remaining collectPages workers keep fetching every remaining page (wasted requests, worsens a 429); stop the workers on the first failure",
      "disposition": "Accept"
    },
    {
      "severity": "Minor",
      "category": "Accessibility",
      "location": "kmaedu-fe/src/pages/k/components/flashcard-detail/flashcard-tabs-bar.tsx:59",
      "summary": "unselected tabs carry aria-controls pointing at panel ids that are not rendered (same in create-flashcard/source-tabs.tsx:34); set aria-controls only on the selected tab or render hidden panels",
      "disposition": "Accept"
    }
  ]
}
```
