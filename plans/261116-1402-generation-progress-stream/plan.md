---
title: "Tiến độ thật cho sinh quiz/flashcard (thay chữ chạy cố định)"
status: completed
created: 2026-11-16
priority: medium
effort: nhỏ-vừa (1 phase, ~15 file)
branch: develop
blockedBy: []
blocks: []
---

# Tiến độ thật cho sinh quiz/flashcard

Yêu cầu (người dùng): ô "Kết quả" đang chạy chữ cố định; phải hiện đúng bước đang chạy, tới bước nào hiện bước đó.

## Phases

| Phase | Name | Status |
|---|---|---|
| 1 | [Event tiến độ ai → content → FE](#phase-1) | Completed |

## Phase 1

**Luồng:** ai-service phát `ai.generation.progress {jobId, stage, at, done?, total?}` (outbox, transaction riêng để commit ngay; relay 0,5 s) → content lưu vào cột mới `GenerationJob.progress` (JSONB, chỉ ghi khi job còn QUEUED/PROCESSING và `at` mới hơn; lần đầu chuyển QUEUED → PROCESSING) → `GET /ai/job/:id` trả `progress` → FE poll 3 s (trước 10 s) và hiện danh sách bước.

**Các bước (`stage`):** `processing_document` (OCR inline) → `waiting_graph` (job đang hoãn chờ đồ thị) → `planning` → `generating` (`done/total` theo lô) → `reviewing` (lọc trùng, sinh bù). Bước bị bỏ qua (tài liệu đã OCR, đồ thị đã READY) hiện là đã xong khi bước sau tới.

**File:**
- ai: `messaging/progress.py` (mới, contextvar + report best-effort), `generation_handler.py`, `graph_wait.py`, `graphrag/generation_runner.py`, test.
- proto: `events/v1/ai_events.proto` thêm `AiGenerationProgress` (chỉ thêm, không phá).
- content: `prisma/schema.prisma` + migration `add_generation_job_progress` (expand, cột nullable), `generation-job.repository.ts`, `generation-events.handler.ts`, `generation-query.service.ts`, spec.
- FE: `apis/aiApi.ts` (type), `stores/useAIGeneratorStore.ts` (lưu progress, poll 3 s), `ai-tool/result-panel.tsx` (`ResultLoading` theo bước), hai generator truyền progress.

**Ràng buộc:** báo tiến độ không bao giờ làm hỏng job (lỗi chỉ log); event cũ/đến trễ không ghi đè event mới; output `ai.generation.completed` giữ nguyên; poll 3 s = 20 req/phút, dưới giới hạn mặc định 100/phút của gateway; watchdog 60 phút dựa `updatedAt` nên job còn báo tiến độ được coi là còn sống.

**Kiểm chứng:** pytest ai-service (tích hợp), jest content (handler + query), `yarn typecheck:content`, FE `tsc` + eslint + vitest nếu có logic thuần, buf lint, chạy thật trên stack local.
