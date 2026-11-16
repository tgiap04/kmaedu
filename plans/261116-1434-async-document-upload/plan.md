---
title: "Upload tài liệu bất đồng bộ cho generate-from-file"
status: completed
created: 2026-11-16
priority: high
effort: vừa (3 phase)
branch: develop
blockedBy: []
blocks: []
---

# Upload tài liệu bất đồng bộ

**Vấn đề (đo trên local 2026-11-16):** `POST /ai/generate-from-file` chờ document → r2 → Cloudflare upload xong mới trả. Mạng tới R2 chậm (2,8 MB mất ~86 s, có lần `socket hang up`), hạn gRPC `UploadFile` 60 s (`document-service/src/clients/r2.client.ts:30`) → 503 `STORAGE_UNAVAILABLE`; r2 vẫn upload xong sau đó → file mồ côi trên R2. Client S3 của r2 không có timeout/retry.

**Người dùng chọn:** API trả `jobId` ngay, upload chạy trong worker.

## Phases

| Phase | Name | Status |
|---|---|---|
| 1 | [document-service: staging + worker upload](#phase-1) | Completed |
| 2 | [content-service: job chờ upload](#phase-2) | Completed |
| 3 | [FE bước "Tải tài liệu lên kho" + docs](#phase-3) | Completed |

## Contract (chốt trước, các phase dựa vào đây)

- `UserStorage.processingStatus` thêm giá trị `UPLOADING`; proto `DocumentProcessingStatus` thêm `DOCUMENT_PROCESSING_STATUS_UPLOADING = 6` (chỉ thêm).
- gRPC `CreateUpload` (chỉ content gọi): bản mới chưa có (không trùng) → trong **một transaction** insert `UserStorage` (`UPLOADING`, `keyR2`/`url` tính trước, chưa có trên R2) + dòng staging chứa bytes; **không** gọi R2, **không** phát `document.uploaded`; trả document `UPLOADING` ngay. File trùng vẫn trả bản cũ (`reused`).
- Worker document (ROLE worker): nhận dòng staging (`FOR UPDATE SKIP LOCKED` + lease), upload lên R2 (deadline dài, retry backoff), thành công → một transaction: xóa staging, `UPLOADING → PENDING`, `queuedAt`, outbox `document.uploaded` (payload như cũ, có `downloadUrl`). Hết lượt thử → `FAILED`, xóa staging, xếp `r2_delete_tasks` cho key (dọn bản upload dở/mồ côi), outbox **`document.upload_failed {storageId, userId, reason}`** (mới).
- Xóa tài liệu khi đang `UPLOADING`: staging bị xóa theo (FK cascade); worker thấy dòng đã mất thì xếp xóa key trên R2. `EnsureProcessed` không phát lại `document.uploaded` cho `UPLOADING`.
- content: tài liệu trả về `UPLOADING` → tạo `GenerationJob` trạng thái mới **`WAITING_UPLOAD`** (thuộc `IN_FLIGHT_STATUSES`: lock, cancel, watchdog), **chưa** ghi `content.generation.requested`; trả `jobId` ngay. Consume `document.uploaded` → job `WAITING_UPLOAD` của storageId đó chuyển `QUEUED` + outbox `content.generation.requested` (dùng `downloadUrl` trong event) trong một transaction. Consume `document.upload_failed` → job `WAITING_UPLOAD` → `FAILED` (`UPLOAD_FAILED`), nhả lock. `GET /ai/job/:id` của job `WAITING_UPLOAD` trả `progress: {stage: "uploading"}`.
- FE: thêm bước `uploading` ("Tải tài liệu lên kho lưu trữ") ngay sau "Gửi yêu cầu".
- r2-service: client S3 có `requestTimeout`/`connectionTimeout` và `maxAttempts`.

## Phase 1
document-service (+ r2-service client): migration (bảng staging, FK cascade, chỉ thêm), repository, `createFromBytes` bất đồng bộ, worker poller (theo mẫu r2-delete/outbox của `libs/messaging`), event `document.upload_failed` (+ proto message), guard `EnsureProcessed`, deadline upload worker, timeout/retry S3. Test: unit + e2e/integration theo cách repo đang làm.

## Phase 2
content-service: `JobStatus.WAITING_UPLOAD`, `generateFromFile`/`regenerate` với tài liệu `UPLOADING`, consumer `document.uploaded` + `document.upload_failed`, mô tả job. Test unit.

## Phase 3
FE step + `CLAUDE.md`, changelog, README document/deploy.

**Kiểm chứng:** jest document/content, typecheck từng service, `check:ownership`, `check:deps`, `buf lint`, lint-migrations, FE tsc/eslint/vitest, chạy thật trên stack local với PDF 2,8 MB.
