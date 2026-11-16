# Workshop Survey Report: các chỗ lưu file/ảnh lên R2 hoặc server

Ngày: 2026-11-16 · Phạm vi: `kmaedu-be` (Nest + Python ai-service) và `kmaedu-fe`.

Mọi lần ghi lên R2 đều đi qua **r2-service** (gRPC `UploadFile` → `PutObjectCommand`, `apps/r2-service/src/r2-service.service.ts:68`). Không service nào khác cầm khóa R2. Key có dạng `<area>/<userId>/<tên>`, dựng bằng `ownerKeyFolder(area, userId)`.

## Lưu lên R2

| # | Tính năng | API (qua gateway) | Service xử lý | Thư mục R2 | Gọi từ FE |
|---|---|---|---|---|---|
| 1 | Ảnh đại diện | `POST /api/v1/profile/upload-avatar` (multipart `file`) | auth `profile.controller.ts:61` → `profile.service.ts:118` | `avatars/<userId>/` | `profileApi.ts:57` |
| 2 | Ảnh bìa hồ sơ | `POST /api/v1/profile/upload-banner` | auth `profile.controller.ts:90` | `banners/<userId>/` | `profileApi.ts:73` |
| 3 | Thumbnail bộ câu hỏi (tạo/sửa) | `POST/PUT /api/v1/quizsets` (multipart `thumbnail`) | content `quizset.controller.ts:76,153` → `quizset.service.ts:58,406` | `quizset-thumbnails/<userId>/` | `quizsetApi.ts:62,188` |
| 4 | Thumbnail bộ flashcard (tạo/sửa) | `POST/PUT /api/v1/flashcardsets` (multipart `thumbnail`) | content `flashcardset.controller.ts:90,168` → `flashcardset.service.ts:81,430` | `flashcardset-thumbnails/<userId>/` | `flashcardSetApi.ts:84,208` |
| 5 | Ảnh chèn trong trình soạn thảo (câu hỏi, thẻ) | `POST /api/v1/r2/image` (multipart `file`, ≤ 2 MB, chỉ `image/*`, quyền `document:upload`) | document `r2-image.controller.ts:25` → `image-upload.service.ts:14` | `images/<userId>/` | `mediaApi.ts:17` ← `ImageUrlDialog` ← `RichTextEditor` (QuestionEditorDialog, QuestionInlineForm, InlineQuestionEditor, FlashcardEditorDialog, FlashcardInlineForm) |
| 6 | PDF để sinh quiz/flashcard (bất đồng bộ) | `POST /api/v1/ai/generate-from-file` (multipart `file`) | content `ai.controller.ts:61` → gRPC document `CreateUpload` (`document-upload.service.ts:84`) ghi bytes vào bảng `upload_staging` → worker `document-upload.worker.ts:100` đẩy lên R2 | `ai-uploads/<userId>/` | `examApi.ts:22` ← `useAIGeneratorStore` |
| 7 | Upload nhanh cho AI chat (OCR để tới tin nhắn đầu) | `POST /api/v1/ai/quick-upload` (multipart, ≤ 50 MB) | document `upload.controller.ts:45` → `document-upload.service.ts:63` | `ai-teacher/<userId>/` | không thấy FE nào gọi |
| 8 | Đăng ký file đã có trên R2 (xếp hàng OCR) | `POST /api/v1/ai/upload` (JSON `keyR2`, `url`) | document `upload.controller.ts:86` → `document-register.service.ts:22` | chỉ ghi DB, không ghi R2; key phải thuộc `ai-uploads/` hoặc `ai-teacher/` của chính user | không thấy FE nào gọi |

Gateway (`apps/gateway-service/config/routes.yaml`): nhóm `/ai/(upload…|quick-upload|upload-image)` `maxBodySize: 50mb`; `/r2/image` `3mb`; route auth/profile `3mb`.

## Lưu tạm trên server (không lưu lâu dài)

| Chỗ | Làm gì | Dọn dẹp |
|---|---|---|
| `upload_staging` (bảng Postgres, schema `document`) | giữ bytes của PDF (bytea) tới khi worker upload xong | worker xóa dòng trong cùng transaction khi chuyển `UPLOADING → PENDING`; FK cascade |
| ai-service `ocr_service.py:382` | tải PDF từ presigned URL về file tạm để OCR | `os.unlink` ở `:531` |
| ai-service `rag/retriever.py:1473`, `evaluation/sandbox/utils.py:14`, `evaluation/pipeline/report_writer.py:17` | file tạm / thư mục sandbox của script đánh giá, không chạy trên đường request | do script quản lý |
| `libs/common/src/services/pdf.service.ts:73` | ghi ảnh trang đã tiền xử lý để Tesseract đọc | có danh sách `tempFiles`; service được export nhưng không app nào inject (code cũ) |

## Xóa file trên R2 (để đối chiếu với quy tắc "xóa bản ghi thì xóa cả ảnh")

Bảng `r2_delete_tasks` được ghi cùng transaction với thao tác xóa/thay ảnh, sau đó worker gọi r2 `DeleteObjects`: auth (avatar/banner), content (thumbnail), vocabulary (ảnh category, chỉ key dưới `word-family/`), document (file upload, ảnh `images/`), ai-chat (ảnh trong tin nhắn, chỉ `images/<ownerId>/`).

## Unresolved Questions
- `POST /api/v1/ai/upload-image` (document `upload.controller.ts:94`) chỉ là placeholder, trả `implementation pending`. `aiChatApi.uploadImage` (FE `aiChatApi.ts:226`) vẫn gọi nó, nhưng không component nào dùng hàm này.
- `quick-upload` và `POST /ai/upload` không có chỗ gọi nào ở FE; có thể là API thừa.
- Ảnh category của vocabulary là URL do admin nhập. Không tìm thấy đường nào hiện upload vào `word-family/`, nên phần xóa key dưới `word-family/` có lẽ chỉ còn phục vụ dữ liệu cũ.
- `ExamRoom`, study-room, ai-chat (ngoài ảnh tin nhắn) không có upload file.
