# Review: làm lại 3 trang flashcard (kmaedu-fe, chưa commit, so với HEAD d71e4a1)

## Phạm vi
- File: 15 file sửa/xóa trong `src` (diff +434/−1294) và 44 file mới (3118 dòng) dưới `src/lib/stable-index*`,
  `src/lib/flashcard-detail/`, `src/pages/k/CreateFlashcardPage.tsx`, `src/pages/k/components/{create-flashcard,flashcard-detail,flashcard-list}/`.
- Đọc thêm để kiểm hợp đồng: `src/stores/useAIGeneratorStore.ts`, `src/stores/useFlashcardSetStore.ts`,
  `src/components/organisms/k/FlashcardGenerator.tsx`, `src/pages/k/AIToolPage.tsx`, backend
  `apps/content-service/src/modules/flashcardset/{flashcardset.service.ts,dto/*}`, `flashcard-study`, `prisma/schema.prisma`,
  `apps/gateway-service/config/routes.yaml`.
- Độ sâu: toàn bộ thay đổi. Không chạy lại suite (đã có tsc/eslint/test/build exit 0 cho cây này).

## Đối chiếu spec (plan.md + 3 phase)
| # | Yêu cầu | Kết quả | Bằng chứng |
|---|---|---|---|
| 1 | Danh sách: header + nút "+ Tạo Flashcard" → `/k/flash-card/create` | PASS | `FlashcardsPage.tsx:16` |
| 2 | 4 thẻ số liệu thay theo bảng plan | PASS | `FlashcardStatsSection.tsx`, `averageCardsPerSet` |
| 3 | Cột Danh mục = `tags[0]`, Tiến độ → trạng thái, ô biểu tượng theo id | PASS | `flashcard-list-logic.ts`, `set-tile.tsx` |
| 4 | Giữ modal sửa/xóa/chia sẻ, phân trang server, tìm debounce | PASS | `use-flashcard-set-dialogs.tsx`, `use-flashcard-list-data.ts` |
| 5 | Chi tiết: header, Chia sẻ / Sao chép / Xóa, 4 số liệu, tab, tìm, lọc nhãn, sửa tại chỗ, phân trang | PASS | `ManageFlashcardSetDetailPage.tsx`, `flashcard-detail/*` |
| 6 | Tab "Thống kê học tập" (đã học, đã thuộc, cần ôn, lần học gần nhất) | PASS có lệch | API chỉ trả `studiedCardIds`; báo cáo phase 2 ghi rõ |
| 7 | Sao chép = tạo bộ + chép thẻ | PASS (không kèm nhãn, đã ghi) | `use-copy-flashcard-set.ts` |
| 8 | Tạo: 3 tab, tab tài liệu chỉ khi `ai:generate` | PASS | `CreateFlashcardPage.tsx:30-32` |
| 9 | Tab quiz gate thêm `quizset:manage` | EXTRA, có lý do (API list quiz cần quyền này) | `CreateFlashcardPage.tsx:31` |
| 10 | Quiz → thẻ, bỏ câu không có đáp án, báo số câu bỏ | PASS | `quiz-to-flashcards.ts`, `use-create-flashcard-submit.ts:83-87` |
| 11 | AI → tạo bộ + `setHistoryFlashcardsToFlashcardSet` → mở chi tiết | PASS | `CreateFlashcardPage.tsx:77-106` |
| 12 | Route `/k/flash-card/create` guard `flashcardset:manage` | PASS | `routes/index.tsx:135` (path tĩnh, không đụng `/k/flash-card`) |
| 13 | Mẹo nhỏ đóng được, localStorage bọc try/catch | PASS | `tips-banner.tsx` |
| 14 | File ≤ 200 dòng | PASS | lớn nhất 190 (`CreateFlashcardPage.tsx`) |

## Đánh giá chung
Bản làm tốt, đúng phạm vi "chỉ frontend", tách file gọn, có test logic thuần với bằng chứng RED. Không có lỗi bảo mật
hay mất dữ liệu nghiêm trọng (Critical = 0). Còn ba điểm Important: (1) trang tạo không biết đến job tạo đề đang chạy
từ `/k/ai-tool` nên có thể làm mồ côi job đó; (2) tải hết thẻ bằng các trang offset chạy song song không giới hạn và
không khử trùng id, trong khi backend sắp xếp theo `createdAt` có nhiều giá trị trùng, nên bộ thẻ > 100 có thể hiện
trùng/thiếu thẻ và "Sao chép" chép sai; (3) các luồng nhiều bước (tạo rồi điền, tự lưu khi job AI xong, sao chép)
chưa có test nào.

## Critical
Không có.

## Important

### I1. Trang tạo bỏ qua job AI của trình tạo đề, làm mồ côi job đó
- Vị trí: `src/pages/k/CreateFlashcardPage.tsx:49-51`, `:101-105`, `:115`.
- Lỗi: `useJobStore.currentJobId` dùng chung cho cả trình tạo đề và trình tạo flashcard. `/k/ai-tool` khóa bằng
  `isAnyGenerating = isTestGenerating || isFlashcardGenerating` (`AIToolPage.tsx:47-49`); trang mới chỉ xem
  `useFlashcardGeneratorStore.isGenerating`. Kịch bản: người dùng bấm tạo đề ở `/k/ai-tool`, chuyển sang
  `/k/flash-card/create`, chọn PDF, bấm "Tạo Flashcard" → `setCurrentJobId(newJob)` ghi đè id → vòng poll của job tạo
  đề tự dừng (`pollJobStatus` thấy `currentJobId !== jobId`), `useTestGeneratorStore.isGenerating` kẹt `true` đến khi
  tải lại trang, kết quả đề không bao giờ về UI (chỉ còn trong lịch sử), và đã tốn thêm một lượt AI.
- Sửa: tính `otherJobRunning = useTestGeneratorStore((s) => s.isGenerating) || (hasJob && !gen.isGenerating)`; khi đúng
  thì khóa nút ở tab tài liệu với dòng "Đang có tác vụ AI khác chạy, đợi xong hoặc dừng ở Công cụ AI". Tab quiz/thủ
  công không cần khóa.

### I2. Tải hết thẻ: offset trên thứ tự không ổn định, không khử trùng, song song không giới hạn
- Vị trí: `src/lib/flashcard-detail/flashcard-detail.ts:78-82` (gọi từ `use-flashcard-cards.ts:31`).
- Lỗi:
  - Backend trả thẻ `orderBy: { flashCard: { createdAt: 'asc' } }` không có khóa phụ
    (`flashcardset.service.ts:204-212`). Thẻ thêm hàng loạt (`setFlashcardsToFlashcardSet` 50 thẻ trong một
    transaction, lưu lịch sử AI bằng một lần ghi) dễ trùng `createdAt` tới mili giây. Postgres không bảo đảm thứ tự các
    dòng hòa nhau giữa hai câu `LIMIT 100 OFFSET 0` và `LIMIT 100 OFFSET 100` (top-N sort khác nhau), nên ở ranh giới
    trang một thẻ có thể xuất hiện hai lần và thẻ khác biến mất. Ví dụ dễ gặp: thêm 3 thẻ tay rồi lưu 50 + 50 thẻ AI →
    lô thứ hai nằm vắt qua vị trí 100. (Suy luận từ hành vi Postgres, chưa tái hiện trên DB thật.)
  - Hệ quả trên FE: key React trùng (`flashcard-list.tsx:70`), số thứ tự và "Tổng số thẻ" sai, tỷ lệ hoàn thành sai, và
    "Sao chép" (`use-copy-flashcard-set.ts:25`) chép thẻ trùng và bỏ sót thẻ: sai dữ liệu của bộ mới.
  - `Promise.all` bắn mọi trang cùng lúc: bộ 3.000 thẻ = 30 request đồng thời vào content (pool Prisma 5 kết nối, mỗi
    request 3 câu SQL), và lớn hơn nữa thì chạm `defaultRateLimit` 100/phút của gateway → 429 → cả lần đọc thất bại và
    các request khác của người dùng cũng bị 429.
- Sửa: trong `collectPages` khử trùng theo `id` (giữ lần đầu) và chạy tối đa 3–4 trang một lúc (hoặc tuần tự); thêm
  test "trang 2 trả lại một thẻ của trang 1 → kết quả không trùng". Gốc rễ là backend thiếu `id` làm khóa phụ trong
  `orderBy` (ngoài phạm vi "chỉ frontend", nên ghi lại để làm sau).

### I3. Luồng nhiều bước chưa có test nào
- Vị trí: `use-create-flashcard-submit.ts:41-76`, `CreateFlashcardPage.tsx:83-106` (cờ `wantsSave`/`wasGenerating`),
  `use-copy-flashcard-set.ts:23-57`.
- Lỗi: test mới chỉ phủ hàm thuần (map quiz, chia lô, định dạng). Những lỗi đáng sợ nhất của thay đổi này không test nào
  bắt: tự lưu khi job xong nhưng người dùng đã hủy; lưu hai lần khi job xong đúng lúc người dùng bấm "Lưu"; tạo bộ lỗi
  thì không được điều hướng; điền thẻ lỗi thì vẫn mở bộ đã tạo; sao chép lỗi giữa chừng. Theo testing-policy
  ("a listed plausible bug no test catches") đây là thiếu sót phải bù.
- Sửa: tách quyết định thành hàm thuần rồi test ở môi trường node: `shouldSaveOnJobEnd({ wasGenerating, isGenerating,
  wantsSave, historyId, cardCount })`, và một hàm `createAndFill({ create, fill })` trả `{ setId, outcome }` (dùng chung cho
  submit hook và sao chép). Sao chép nên dùng lại `saveCardsInBatches` thay vì vòng lặp riêng (xem M1).

## Minor

- M1 `use-copy-flashcard-set.ts:12,37-44`: viết lại vòng chia lô (`BATCH`, `chunk`) đã có ở `save-cards-in-batches.ts`
  (và `chunk` trùng ở `flashcard-create-logic.ts`, `flashcard-detail.ts`). Khác hành vi với trang tạo: lỗi giữa chừng thì
  ở lại trang cũ, không mở bộ mới đã tạo dở → người dùng bấm lại và có thêm một bản sao dở thứ hai. Sửa: dùng
  `saveCardsInBatches`, lỗi thì vẫn mở bộ mới như `useCreateFlashcardSubmit`.
- M2 `flashcard-detail-header.tsx:92` + `use-copy-flashcard-set.ts:24`: khi tải thẻ lỗi (`cards === null`) nút "Sao chép"
  vẫn bấm được nhưng không làm gì, không báo. Sửa: truyền `disabled={copying || cards === null}`.
- M3 `use-copy-flashcard-set.ts:51`: không có cờ `mounted` như submit hook; người dùng rời trang khi đang chép vẫn bị kéo
  sang bộ mới.
- M4 `CreateFlashcardPage.tsx:87`: job AI trả `historyId` nhưng 0 thẻ → vẫn tạo bộ rồi backend báo "History không có
  flashcard nào" → bộ rỗng + toast lỗi. Sửa: chỉ lưu khi `generatedCards.length > 0`, ngược lại báo AI không tạo được thẻ.
- M5 `CreateFlashcardPage.tsx:115,139`: job flashcard chạy từ `/k/ai-tool` làm trang tạo khóa luôn hàng tab (không sang
  được tab quiz/thủ công) cho tới khi job xong hoặc bị dừng; kết quả chưa lưu từ `/k/ai-tool` hiện thành nút "Lưu thành
  bộ thẻ" (quyết định có chủ đích của main thread, chỉ nên ghi trong UI là kết quả đến từ Công cụ AI). Khóa tab nên chỉ áp
  khi chính trang này khởi động job (`wantsSave.current`).
- M6 `CreateFlashcardPage.tsx:101-103`: giữa lúc bấm và lúc store bật `isGenerating` còn `await pdfOk()` (đọc lại PDF);
  bấm đúp trong khoảng đó tạo hai job AI (cùng mẫu sẵn có ở `FlashcardGenerator.tsx:48`). Sửa: bọc nhánh tài liệu bằng
  `singleFlight` hoặc cờ `starting`.
- M7 `document-source-panel.tsx:48` ghi "nhấn **Tạo Flashcard** để lưu" trong khi nút lúc đó là "Lưu thành bộ thẻ"
  (`CreateFlashcardPage.tsx:117`).
- M8 `flashcard-inline-editor.tsx:24-30`: mặt trước "đơn giản" đi qua `plainText` rồi `textToHtml`: chỉ giải 6 entity,
  gộp khoảng trắng/xuống dòng; thẻ cũ dạng chữ trơn có xuống dòng hoặc entity khác (`&#x27;`, `&hellip;`) bị đổi nội dung
  dù người dùng không sửa gì. Sửa: chỉ coi là đơn giản khi `textToHtml(plainText(html))` tái tạo đúng `html` (hoặc bản
  trơn không chứa `\n`/`&`).
- M9 `ManageFlashcardSetDetailPage.tsx:108,171`: khi thẻ chưa tải xong, số liệu hiện "0 thẻ / 0 phút" và hộp xóa bộ ghi
  "cùng 0 thẻ". Sửa: hiện skeleton/"—" khi `cards === null`.
- M10 `use-flashcard-cards.ts:28-40` vs `:73-94`: `latest` chỉ chặn reload chồng reload; một reload (đổi nhãn) đang bay
  về sau một lần sửa/xóa sẽ ghi đè danh sách bằng dữ liệu cũ. Khả năng thấp (hai thao tác ở hai tab khác nhau). Sửa: tăng
  `latest.current` trong mỗi lần vá tại chỗ.
- M11 `use-flashcard-list-data.ts:43-55`: cờ `stale` chỉ chặn `totalResults`; store vẫn nhận `flashcardSetsK` từ response
  cũ về muộn (giống HEAD, không phải hồi quy).
- M12 `flashcard-tabs-bar.tsx:37-53`, `ManageFlashcardSetDetailPage.tsx:112`: tab có `role="tab"` nhưng thiếu
  `aria-controls`/`id`, vùng nội dung thiếu `role="tabpanel"`, không có điều hướng phím mũi tên (cả `source-tabs.tsx`).
- M13 `quiz-to-flashcards.ts:10,23`: so khớp đáp án dạng chữ không giải entity (`AT&T` vs `<p>AT&amp;T</p>`) và chỉ nhận
  chữ A–D; các câu đó bị bỏ và được đếm, nên an toàn, chỉ là bỏ nhiều hơn cần.

## Edge case đã soát
- Tạo bộ lỗi → ở lại, giữ input (đúng). Điền lỗi → vẫn mở bộ, toast số thẻ đã thêm (đúng). Bấm đúp submit quiz/thủ công →
  `singleFlight` chặn (đúng). Rời trang khi đang lưu → không kéo lại (đúng, `mounted`).
- Job AI: hủy → `wantsSave` reset, không lưu (đúng); lỗi → store toast, không lưu (đúng); rời trang giữa job → quay lại thấy
  "Lưu thành bộ thẻ" (đúng, nhưng xem M5); quiz job khác đang chạy → I1.
- Lô 50 thẻ khớp transaction 5 giây của backend; DTO không giới hạn số thẻ/độ dài; `min(1)` cho question/answer được
  `hasContent`/`copyPayload` lọc trước.
- Route `/k/flash-card/create` khai báo path tĩnh nên không đè `/k/flash-card` hay `/k/manage-flashcard-set/:id`.
- `getProgressApi` dùng `@RequireOwnerOrPermission('flashcard:study')` nên giáo viên (chủ bộ) không bị 403; id thẻ đã học
  là `FlashCard.id`, khớp với id dùng để tính tỷ lệ.
- Trang chi tiết: `key={id}` reset sạch khi mở bộ khác; nhãn bị xóa khi đang lọc tự về "Tất cả".

## Làm tốt
- Tạo-rồi-điền giữ bộ đã tạo và mở nó khi điền lỗi: không bao giờ tạo bộ thứ hai khi thử lại.
- Kiểm tên trước khi gọi AI, gate tab theo quyền thật của API, không sửa store dùng chung.
- `textToHtml` escape đúng; bỏ skeleton nháy theo `loading` của store; vá danh sách tại chỗ thay vì tải lại.
- Test logic thuần có bằng chứng RED trên assertion, phủ biên tốt (0/1/biên trang, NaN, dữ liệu méo).

## Thứ tự sửa
1. I1 (chặn job khác đang chạy). 2. I2 (khử trùng + giới hạn song song trong `collectPages`, kèm test). 3. M1 + I3 (gộp
sao chép vào `saveCardsInBatches`, tách hàm quyết định và viết test). 4. M4, M2, M3, M6. 5. Phần Minor còn lại.

## Số liệu
- tsc exit 0, eslint 0 vấn đề trên 59 file, vitest 37 file / 315 test exit 0, build exit 0 (đã ghi, không chạy lại).
- Coverage: không đo.

## Chưa giải quyết
- I2 dựa trên suy luận về thứ tự hòa của Postgres, chưa tái hiện trên DB thật; khử trùng phía FE rẻ nên nên làm dù sao.
- Chưa có kiểm tra trên trình duyệt có đăng nhập cho luồng ghi dữ liệu (lưu, sao chép, xóa).
