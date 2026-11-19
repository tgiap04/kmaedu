# Báo cáo phase 2: trang chi tiết bộ thẻ `/k/manage-flashcard-set/:id`

Trạng thái: DONE. Chỉ làm frontend, không đổi backend. Ảnh tham chiếu: `images/17.png`.

## File đã đổi

Sửa:
- `kmaedu-fe/src/pages/k/ManageFlashcardSetDetailPage.tsx` (362 -> 177 dòng, viết lại, mỗi lần mở một bộ là một lần mount theo `key={id}`)

Xóa:
- `kmaedu-fe/src/pages/k/components/flashcard-grid-card.tsx` (lưới thẻ cũ, không còn ai dùng; đã `git grep` xác nhận)

Mới, logic thuần (có test):
- `kmaedu-fe/src/lib/flashcard-detail/flashcard-detail.ts` (94 dòng)
- `kmaedu-fe/src/lib/flashcard-detail/flashcard-detail.test.ts` (34 test)

Mới, giao diện và hook, dưới `kmaedu-fe/src/pages/k/components/flashcard-detail/`:
- `flashcard-detail-header.tsx` (102): breadcrumb, ô biểu tượng, tên + nút bút, pill Công khai/Riêng tư, mô tả, tag, nút Chia sẻ / Sao chép / Xóa
- `flashcard-detail-stats.tsx` (46): 4 thẻ số liệu
- `flashcard-tabs-bar.tsx` (97): tab, ô tìm kiếm, nút "Bộ lọc"
- `flashcard-list.tsx` (105): dòng "Hiển thị a – b trong tổng số N thẻ", danh sách, nút thêm thẻ, phân trang
- `flashcard-row.tsx` (79): một hàng thẻ (số thứ tự, mặt trước, mặt sau rút gọn, nhãn, nút bút, menu ⋮ Xóa)
- `flashcard-inline-editor.tsx` (104): form sửa/thêm tại chỗ (Cụm từ, Mô tả, Xem trước, Hủy / Lưu thay đổi)
- `flashcard-pager.tsx` (38), `flashcard-stats-panel.tsx` (91)
- `use-flashcard-set-detail.ts`, `use-flashcard-cards.ts`, `use-flashcard-progress.ts`, `use-copy-flashcard-set.ts`

Không sửa: `FlashcardInlineForm`, `FlashcardEditorDialog`, `ViewFlashcardDialog` (không cần), `FlashcardLabelManager` (chỉ dùng lại, đặt trong tab "Nhãn").
`FlashcardEditorDialog` và `FlashcardInlineForm` giờ không còn nơi nào dùng (trang cũ dùng Dialog, trang mới sửa tại chỗ); để nguyên vì ngoài phạm vi, trang chính có thể dọn sau.

## Từng phần của thiết kế

| Thiết kế | Cách làm |
|---|---|
| Breadcrumb "Quản lý Flashcard > Chi tiết bộ thẻ" | Có, link về `/k/flash-card` |
| Ô biểu tượng | Biểu tượng cố định theo id (`stableIndex`, 6 icon) vì ảnh bìa đã bỏ |
| Tên + nút bút | Bút mở `FlashcardSetModal` (mode edit), lưu bằng `updateFlashcardSet` của store |
| Dòng phụ "Được tạo từ: ..." | Bỏ; dùng mô tả của bộ (không có thì "Chưa có mô tả"), kèm tag của bộ như trang cũ |
| Pill Public | "Công khai"/"Riêng tư"; bấm mở `ShareFlashcardModal`, đóng modal thì tải lại bộ để cập nhật pill |
| Chia sẻ | `ShareFlashcardModal` có sẵn |
| Sao chép | `useCopyFlashcardSet`: tạo bộ riêng tư "<tên> (bản sao)" (dùng `copyTitle` của trang quiz), cùng mô tả/tag, chép thẻ qua `setFlashcardsToFlashcardSet` theo lô 50, rồi mở bộ mới. Chép **không kèm nhãn** (xem "Điều chưa làm") |
| Xóa | `DeleteConfirmDialog`, `deleteFlashcardSet`, rồi về `/k/flash-card` |
| Tổng số thẻ | Số thẻ đang có (đếm từ danh sách đã tải) |
| Thời gian học ước tính | `formatStudyTime`: số thẻ x 36 giây, làm tròn phút; 50 thẻ = "30 phút", 108 thẻ = "1 giờ 5 phút" |
| Lượt xem | `set.viewCount` |
| Tỷ lệ hoàn thành | `getProgressApi` của chính người xem: số thẻ đã học còn tồn tại / tổng thẻ; lỗi hoặc chưa học thì "—" (kèm dòng "Bạn chưa học bộ thẻ này") |
| Tab "Danh sách thẻ" | Có, kèm số thẻ |
| Tab "Thống kê học tập" | Thanh tiến độ + nút "Học ngay" (`/study-flashcard/:id`), Đã học / Chưa học / Lượt xem / Ngày tạo / Cập nhật lần cuối, và danh sách "Thẻ theo nhãn" có thanh tỷ lệ. Không có "đã thuộc / cần ôn / lần học gần nhất" vì `getProgressApi` chỉ trả `studiedCardIds`, `totalCards`, `progressPercentage` |
| Tab "Nhãn" (thêm) | `FlashcardLabelManager` nguyên bản; đổi nhãn thì tải lại nhãn và thẻ |
| Ô tìm kiếm | Lọc trên **toàn bộ** thẻ của bộ: API thẻ không có tham số tìm, nên trang tải hết thẻ một lần (trang 100 thẻ, `collectPages`) rồi tìm/lọc/phân trang trong bộ nhớ, giống trang quiz. Tìm cả hai mặt, bỏ dấu, bỏ thẻ HTML |
| Nút "Bộ lọc" | Dropdown: Tất cả thẻ / Chưa gán nhãn / từng nhãn (thay Select cũ). Nhãn bị xóa khi đang lọc thì tự về "Tất cả" |
| Cột độ khó | Bỏ; ô đó hiển thị nhãn của thẻ (dữ liệu thật) |
| Hàng thẻ | Số thứ tự trong vòng tròn (theo vị trí trong cả bộ, không đổi khi lọc), mặt trước đậm, mặt sau rút gọn, bút, ⋮ -> Xóa (xác nhận) |
| Bấm bút -> mở rộng tại chỗ | Form "Cụm từ", "Mô tả" (`RichTextEditor`), khung "Xem trước" (`RichTextViewer`), "Hủy" / "Lưu thay đổi". Chỉ mở một hàng một lúc; thêm thẻ dùng cùng form |
| Độ khó trong form sửa | Bỏ |
| Phân trang | 10 thẻ/trang, nút số kiểu thiết kế (5 số) + trái/phải |
| Thêm thẻ | Nút nét đứt "Thêm thẻ" dưới danh sách, mở cùng form ở đầu danh sách |

Quyết định về "Cụm từ": ô này là input chữ thường như thiết kế khi mặt trước là chữ trơn hoặc một đoạn `<p>` (lưu lại thành `<p>…</p>` đã escape). Nếu thẻ cũ có định dạng, ảnh, danh sách thì giữ `RichTextEditor` để không mất dữ liệu (đã chụp thử với thẻ có chữ đậm).

Khác với trang cũ: bỏ `loading` của store khỏi điều kiện hiện skeleton (store bật `loading` mỗi lần thêm/sửa/xóa thẻ nên trang cũ nháy skeleton và mất form đang mở). Thêm/sửa/xóa thẻ gọi API trực tiếp rồi vá danh sách tại chỗ, không tải lại cả bộ; vẫn xóa cache `flashcardsets`, cache `flashcards-by-label` của nhãn thẻ và thống kê flashcard như cũ.

## TDD

RED (stub sai giá trị trước, chạy `yarn vitest run src/lib/flashcard-detail`):
- Lượt đầu: 26 test fail trên assertion, ví dụ `AssertionError: expected '' to be '0 phút'`, `expected [] to have a length of 230`, `promise resolved "[]" instead of rejecting`; 2 pass.
- Thêm sau, mỗi lần stub trước: `hasContent` -> `expected true to be false` (1 fail); `pageNumbers` -> `expected [] to deeply equal [ 1 ]` (2 fail); `studiedCount` -> `expected -1 to be 2` (1 fail).

GREEN: `Test Files 1 passed, Tests 34 passed`.

Phủ biên: 0 thẻ, 1 thẻ (36 giây làm tròn thành 1 phút), 5/7/8 thẻ (làm tròn), 99/100/108/200 thẻ (đổi sang giờ), số âm / NaN; tỷ lệ hoàn thành khi không có thẻ / chưa học / id thẻ đã xóa / id trùng; lọc theo nhãn + tìm kiếm + không dấu; chia trang (trang vượt biên, danh sách rỗng, vừa đủ một trang); `isSimpleHtml` / `textToHtml` (escape); `copyPayload` bỏ thẻ rỗng mặt; `chunk`; `collectPages` (230 thẻ, 0 thẻ, một trang, trang lỗi làm cả lần đọc lỗi).

## Kết quả lệnh

- `yarn tsc --noEmit -p tsconfig.json`: exit 0 (lúc đầu có một lỗi trong `create-flashcard/save-cards-in-batches.test.ts` của agent khác, sau đó đã hết)
- `yarn eslint` trên trang, thư mục `flashcard-detail`, `lib/flashcard-detail`: exit 0, 0 lỗi, 0 cảnh báo (đã sửa một lỗi regex backtracking và hai cảnh báo hooks của chính mình)
- `yarn vitest run src/lib/flashcard-detail`: exit 0, 34/34 pass
- File lớn nhất 177 dòng (trang), đều dưới 200

## Kiểm tra giao diện

Do trang cần đăng nhập, tôi dựng harness tạm `kmaedu-fe/__preview__/flashcard-detail/` (ConfigProvider, IconDefaultsProvider, ToastProvider, MemoryRouter) và **giả lập tại lớp axios** (`api.defaults.adapter`) với 50 thẻ, 2 nhãn, tiến độ 39/50, nên trang chạy đúng mã thật, không đổi hành vi app. Đã tắt vite cổng 5202 và xóa thư mục harness (thư mục cha `__preview__/` còn lại vì có thư mục của agent khác).

Ảnh trong `/private/tmp/claude-501/-Users-tgiap-dev-devs-kmaedu/488c8867-498d-4858-b7a7-eabd8f01430a/scratchpad/flashcard-detail/`:
- `10-final-desktop.png`: danh sách (1328 px)
- `02-edit.png`: sửa hàng 2 (khớp thiết kế), `03-rich.png`: sửa thẻ có định dạng, `07-add.png`: thêm thẻ
- `04-stats.png`, `06-noprogress.png`: tab thống kê (có tiến độ / chưa học), `05-labels.png`: tab nhãn
- `08-mobile.png`, `09-mobile-tabs.png`: bề rộng 390 px

Lưu ý khi xem ảnh: trong vài ảnh chụp tab (`04`, `06`) gạch chân tab còn ở "Danh sách thẻ" do hiệu ứng `transition` bị đóng băng lúc chụp ảo; đã kiểm tra DOM (`aria-selected="true"` đúng tab thống kê) nên không phải lỗi.

Không chụp được trong harness: hộp thoại Chia sẻ / Sửa thông tin / xác nhận xóa (dùng lại component có sẵn, chưa đổi) và các thao tác ghi dữ liệu (Lưu, Sao chép, Xóa), vì không gửi request thay đổi dữ liệu.

## Điều chưa làm / lưu ý

1. Sao chép không kèm nhãn: API thêm thẻ hàng loạt (`set-flashcards-to-flashcardset`) không trả id thẻ mới nên không gán nhãn được; chép từng thẻ để lấy id thì chậm (N request tuần tự). Toast sau khi chép có ghi "Thẻ được chép không kèm nhãn". Thứ tự thẻ trong cùng một lô 50 phụ thuộc `createdAt` do backend sinh (hành vi sẵn có của API này).
2. Mỗi lần mở trang tải hết thẻ (các trang 100) và `getFlashcardSetByIdApi` của store cũng trả hết thẻ không kèm nhãn, nên có một lần đọc thừa; chấp nhận vì cần nhãn từng thẻ và store là đường duy nhất lấy thông tin bộ. Với bộ rất lớn (hàng nghìn thẻ) sẽ chậm hơn phân trang phía server; nếu cần thì đổi sang tìm kiếm phía server (backend chưa hỗ trợ).
3. Mỗi lần đọc trang 1 của API thẻ, backend ghi một dòng lịch sử xem (`flashCardViewHistory`): việc tải hết thẻ vẫn chỉ gọi trang 1 một lần mỗi lần mở trang, như trước.
4. `getProgressApi` do trang học ghi tiến độ; với tài khoản không có quyền học nó có thể lỗi, khi đó hiển thị "—" (đã bắt lỗi, không toast).
5. Trang dùng `src/lib/stable-index.ts` (file mới của agent khác, đã có trong cây làm việc); nếu agent đó đổi tên thì import ở `flashcard-detail-header.tsx` cần theo.
6. Thẻ số liệu dùng component riêng trong `flashcard-detail-stats.tsx` thay `ExamOverviewStatCard`, vì tiêu đề "Thời gian học ước tính" bị cắt (`truncate`) ở bề rộng 4 cột; tôi không sửa file của nơi khác.

**Status:** DONE
