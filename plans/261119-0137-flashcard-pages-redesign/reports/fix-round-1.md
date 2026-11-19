# Fix vòng 1: 3 trang flashcard (chỉ frontend, kmaedu-fe)

Làm đúng các mục "Chấp nhận" trong `adjudication.md`. Không đụng `useAIGeneratorStore.ts`, `ai-tool/*`, backend; không chạy lệnh git ghi.

## Từng mục đã sửa

### I-1. Trang tạo làm mồ côi job tạo đề
- Sửa: hàm thuần `aiJobBlock({ testGenerating, flashcardGenerating, hasJob })` (`flashcard-flow-logic.ts:57-60`). Job flashcard của chính nó không bị chặn (job resume đặt cờ cả hai store). Khóa nút tab "tài liệu" và hiện dòng "Đang có tác vụ AI khác chạy. Đợi xong hoặc dừng nó ở Công cụ AI rồi quay lại." (`CreateFlashcardPage.tsx:22,79,140`). Tab quiz/thủ công không bị khóa. Lúc bấm, hook đọc lại ba store bằng `getState()` sau khi kiểm file xong, nên job khác bắt đầu trong lúc đó cũng bị chặn (`use-document-generation.ts:54-62`).
- Test: `flashcard-flow-logic.test.ts` > `aiJobBlock`. RED: `AssertionError: expected false to be true` (stub trả `false`). GREEN sau khi cài.

### I-2. Tải hết thẻ: trùng, thiếu, song song không giới hạn
- Sửa: `collectPages` (`flashcard-detail.ts:89-101`) đọc tối đa `COLLECT_CONCURRENCY = 3` trang một lúc (hàng đợi worker), ghép theo thứ tự trang, rồi khử trùng theo `id` bằng `appendUnique` (giữ bản đầu).
- Test: `flashcard-detail.test.ts` > `collectPages`. RED: `expected [ '1', '2', '2', '3' ] to deeply equal [ '1', '2', '3' ]` và `expected 11 to be less than or equal to 3` (11 request cùng lúc). GREEN sau khi sửa.
- Ghi chú ngoài phạm vi frontend: gốc rễ là backend `orderBy: { flashCard: { createdAt: 'asc' } }` (`flashcardset.service.ts`) thiếu `id` làm khóa phụ nên thứ tự các dòng hòa nhau giữa hai câu `LIMIT/OFFSET` không ổn định. FE chỉ chặn được thẻ hiện hai lần; một thẻ khác vẫn có thể bị thiếu ở ranh giới trang. Cần thêm `{ id: 'asc' }` vào `orderBy` ở một PR backend sau.

### I-3. Luồng nhiều bước chưa có test
- `createAndFill({ create, fill })` (`flashcard-flow-logic.ts:12-26`): create lỗi thì dừng, không gọi fill; fill lỗi thì giữ bộ đã tạo và báo `added` (từ `PartialSaveError`, hoặc `null`). `pathAfterCreate(result, mounted)` (`:29-31`): có bộ và người dùng còn ở trang thì mở bộ, ngược lại `null`. `onJobEnd` (`:43-47`): "wait" / "skip" / "save" / "empty" cho việc tự lưu khi job AI kết thúc.
- Hook mỏng đi: `use-create-flashcard-submit.ts` (`run`, dòng 41-75) và `use-copy-flashcard-set.ts` (dòng 37-69) đều chạy qua `createAndFill` + `pathAfterCreate`; hook job AI tách ra `use-document-generation.ts` (86 dòng) để trang tạo còn 153 dòng.
- "Sao chép" dùng lại `saveCardsInBatches` (bỏ vòng chia lô riêng và `chunk` trùng trong `flashcard-detail.ts`; test `chunk` ở đó bỏ theo, `chunk` gốc vẫn ở `flashcard-create-logic.ts`).
- Test: `flashcard-flow-logic.test.ts` (17 case). RED: 14 case đỏ trên assertion (ví dụ `expected 'wait' to be 'save'`, `expected '' to be null`, `expected "vi.fn()" to be called with arguments: [ 's1' ]`) khi hàm còn là stub. GREEN: 17/17.

### Minor
| Mục | Sửa | Vị trí | Test |
|---|---|---|---|
| Sao chép lỗi giữa chừng: mở bộ đã tạo, báo số thẻ đã chép | `partial` toast "chỉ chép được X/N thẻ" rồi `navigate` | `use-copy-flashcard-set.ts:55-66` | `createAndFill`/`pathAfterCreate` (trên) |
| Nút Sao chép tắt khi tải thẻ lỗi hoặc chưa xong | prop `copyDisabled`, `title` giải thích | `flashcard-detail-header.tsx:30,41,94`; `ManageFlashcardSetDetailPage.tsx:113` | không (chỉ thuộc tính component) |
| Rời trang khi đang chép thì không bị kéo đi | cờ `mounted` + single-flight như hook submit | `use-copy-flashcard-set.ts:25-34,66` | `pathAfterCreate(…, false) → null` |
| Job AI có `historyId` nhưng 0 thẻ: không tạo bộ, báo lỗi | `onJobEnd` trả "empty" → `toast.error("AI không tạo được thẻ nào")` | `use-document-generation.ts:45-52` | `onJobEnd` |
| Bấm đúp khi đang kiểm file | `singleFlight` bọc `start` | `use-document-generation.ts:50-64` | không (dùng `singleFlight` đã có test) |
| Job flashcard từ /k/ai-tool chỉ khóa tab tài liệu | thanh tab chỉ khóa khi `startedHere` (= đã bấm ở trang này và job đang chạy) | `use-document-generation.ts:80`; `CreateFlashcardPage.tsx:102` | `onJobEnd` ("skip" khi `wantsSave=false`) |
| Câu thông báo khớp chữ trên nút | "nhấn **Lưu thành bộ thẻ**" | `document-source-panel.tsx:48` | không (chữ) |
| Sửa tại chỗ mặt trước chữ trơn: không ghi lại nếu không sửa, giữ xuống dòng/entity | `frontToSave(original, text)` | `flashcard-detail.ts:74-77`; `flashcard-inline-editor.tsx:31` | `flashcard-detail-editing.test.ts`. RED: `expected '<p>It&amp;#x27;s &amp;hellip;</p>false' to be 'It&#x27;s &hellip;'`. GREEN |
| Số liệu/hộp xóa không hiện "0 thẻ" khi chưa tải xong | `cardCount: number \| null` → "—"; hộp xóa ghi "toàn bộ thẻ"; tab thẻ/thống kê hiện skeleton hoặc nút thử lại | `flashcard-detail-stats.tsx`; `flashcard-tabs-bar.tsx:14,69`; `ManageFlashcardSetDetailPage.tsx:105-131,115,118` | không (hiển thị) |
| Lần tải lại về muộn không ghi đè thao tác mới | `createReadGate`: sửa tại chỗ làm lần đọc đang bay thành cũ và yêu cầu đọc lại | `read-gate.ts`; `use-flashcard-cards.ts:27-53` | `read-gate.test.ts`. RED: 4 case `expected false to be true` (stub). GREEN 4/4 |
| Tab có tablist/tab/tabpanel, `aria-controls`, phím mũi tên | `id`/`aria-controls`/`tabIndex` + `onKeyDown` dùng `nextTabIndex`; vùng nội dung `role="tabpanel"`; áp cả `source-tabs.tsx` ở trang tạo | `flashcard-tabs-bar.tsx:22-23,41-46,57-62`; `ManageFlashcardSetDetailPage.tsx:119`; `source-tabs.tsx:15-21,36-38`; `flashcard-detail.ts:116-123` | `nextTabIndex` trong `flashcard-detail-editing.test.ts`. RED: `expected null to be 1`, `expected 2 to be +0`. GREEN |
| Quiz → thẻ bỏ sót đáp án có ký tự đặc biệt | gốc là giải mã entity: dùng `plainText` (đã giải 6 entity) thay `replace` thô | `quiz-to-flashcards.ts:1,11` | `quiz-to-flashcards.test.ts` ("AT&T" khớp "AT&amp;T"). RED: `expected { cards: [], skipped: 1 } to deeply equal { cards: [ … ], skipped: +0 }`. GREEN |

## Không sửa
- Bác bỏ trong phân xử: phản hồi trang danh sách về muộn ghi đè (đã có từ HEAD).
- Lỗi thứ tự hòa nhau của backend (I-2) cần PR backend, đã ghi ở trên.
- Không có kiểm tra trình duyệt có đăng nhập (không đăng nhập, không gửi request ghi); luồng ghi (lưu, sao chép, xóa) chỉ kiểm bằng hàm thuần và tsc.

## Lệnh đã chạy (mã thoát thật, trong `kmaedu-fe`)
- `yarn tsc --noEmit -p tsconfig.json` → 0
- `yarn eslint <21 file đã đổi/tạo>` → 0 (0 lỗi)
- `yarn vitest run src/lib/flashcard-detail src/pages/k/components/create-flashcard` → 0 (7 file, 100 test)
- `yarn test` → 0 (40 file, 344 test)
- Mọi file ≤ 200 dòng (lớn nhất `flashcard-detail.test.ts` 195; trang tạo 153; trang chi tiết 188).

## Hunk để review lại (file:dòng)
- `src/lib/flashcard-detail/flashcard-detail.ts`: 1-3 (import), 69-101 (`frontToSave`, `COLLECT_CONCURRENCY`, `collectPages`; bỏ `chunk`), 114-123 (`nextTabIndex`)
- `src/lib/flashcard-detail/read-gate.ts` (mới, 26 dòng) và các test `flashcard-detail.test.ts`, `flashcard-detail-editing.test.ts` (mới), `read-gate.test.ts` (mới)
- `src/pages/k/components/create-flashcard/flashcard-flow-logic.ts` (mới, 61 dòng) + `.test.ts` (mới)
- `src/pages/k/components/create-flashcard/use-document-generation.ts` (mới, 86 dòng)
- `src/pages/k/components/create-flashcard/use-create-flashcard-submit.ts`: 8-9 (import), 41-75 (`run`)
- `src/pages/k/components/create-flashcard/quiz-to-flashcards.ts`: 1, 11 (+ test mới)
- `src/pages/k/components/create-flashcard/document-source-panel.tsx`: 48
- `src/pages/k/components/create-flashcard/source-tabs.tsx`: 1-3, 13-21, 26-39
- `src/pages/k/CreateFlashcardPage.tsx`: 1-18 (import), 22, 48-65 (bỏ cờ/effect cũ, thêm `doc`), 66-76 (`handleSubmit`), 78-80, 102, 140
- `src/pages/k/components/flashcard-detail/use-copy-flashcard-set.ts` (viết lại toàn bộ, 71 dòng)
- `src/pages/k/components/flashcard-detail/use-flashcard-cards.ts`: 1-12, 25-43, 46-58, 70-90
- `src/pages/k/components/flashcard-detail/flashcard-detail-header.tsx`: 28-30, 41, 94
- `src/pages/k/components/flashcard-detail/flashcard-detail-stats.tsx`: prop `cardCount` + hai `Tile` đầu
- `src/pages/k/components/flashcard-detail/flashcard-tabs-bar.tsx`: 1, 5, 12-15, 22-23, 38-46, 52-70
- `src/pages/k/components/flashcard-detail/flashcard-inline-editor.tsx`: 5, 30-31
- `src/pages/k/ManageFlashcardSetDetailPage.tsx`: 16, 103-113, 115, 118-131, 171
