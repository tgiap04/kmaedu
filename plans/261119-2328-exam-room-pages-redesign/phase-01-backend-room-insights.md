# Phase 01 — Backend: số liệu phòng, thí sinh, kết thúc phòng

## Context Links
- Plan: [plan.md](plan.md) (mục "Hợp đồng API" là hợp đồng chính xác)
- Code:
  - `kmaedu-be/apps/assessment-service/src/modules/examroom/examroom.service.ts` (`getAllExamRooms`)
  - `.../examattempt/examattempt.service.ts` (`getExamAttemptsByRoom`, `$queryRaw` ở ~1304)
  - `.../examsession/examsession.service.ts` (`invalidateRoomCache`, xóa phiên ở ~690)
  - `test/authz/authz-matrix.rows.ts`

## Overview
Ưu tiên cao, trạng thái Pending. Thêm số liệu mà hai trang mới cần. Các trường và route đều là mới, không đổi trường
hay route có sẵn.

## Key Insights
- `ExamSession.status` không được cập nhật theo giờ: trạng thái thật suy ra từ `startTime`/`endTime`.
- `ExamAttempt.status`:
  - 0 = IN_PROGRESS, 1 = COMPLETED, 2 = CANCELLED (thực tế không bao giờ được ghi).
  - `score` là phần trăm 0–100.
  - `passingScore` nằm ở phiên.
- `whitelist` của phiên là danh sách user id; chỉ có nghĩa khi `assessType = 1` (PRIVATE).
- Bắt đầu làm bài kiểm tra `endTime < now`. Nộp bài không kiểm tra `endTime`, nên đóng phiên sớm không làm mất
  bài đang làm.
- Tên thí sinh nằm ở auth: dùng `this.users.profileMap(ids)` (gọi theo lô, có cache), không gọi từng người.

## Requirements
1. `list-all`: thêm cho mỗi phòng:
   - `sessionWindows`: `[{startTime, endTime|null}]`, sắp theo `startTime` tăng dần.
   - `participantCount`: số `userId` khác nhau có ít nhất một attempt trong phòng.
   - Toàn bộ chỉ tốn một truy vấn tổng hợp, không N+1.
2. `GET /examattempts/room/:examRoomId/overview?window=` (mặc định `30m`):
   - Thí sinh = bài làm mới nhất (theo `startedAt`) của mỗi user trong phòng, cộng người trong whitelist phiên
     PRIVATE chưa có bài.
   - Các con số trả về:
     - `completed`, `inProgress`, `cancelled`: theo trạng thái bài mới nhất.
     - `notStarted`.
     - `candidates`: tổng các nhóm trên.
     - `averageScore`: trung bình điểm bài đã nộp, làm tròn 1 chữ số; `null` khi chưa ai nộp.
     - `passed`: số bài có `score >= passingScore` của phiên đó.
     - `scoreBuckets`: 10 ô, mỗi ô 10%; điểm 100 vào ô cuối.
   - `timeline`: đếm mọi attempt COMPLETED có `finishedAt` trong `[from, now)`.
     - Số ô theo `window`: 30m = 15 ô × 2 phút, 1h = 12 × 5, 24h = 24 × 60, 7d = 14 × 720.
     - `from = now - window`; trả `{window, from (ISO), bucketMinutes, counts}`.
3. `GET /examattempts/room/:examRoomId/candidates`:
   - Tham số: `page` ≥ 1, `limit` 1–100 (mặc định 10), `search?`, `status? = submitted|in_progress|not_started`,
     `result? = passed|failed`.
   - `result` chỉ khớp thí sinh đã nộp.
   - Tìm kiếm: so khớp tên hoặc username, không phân biệt hoa thường và dấu (NFD, bỏ dấu, `đ`→`d`). Chỉ lấy profile
     của mọi thí sinh khi có `search`; không có `search` thì chỉ lấy profile của trang hiện tại.
   - Thứ tự: người đã bắt đầu theo `startedAt` tăng dần, sau đó người chưa bắt đầu theo `userId`.
   - Mỗi phần tử:
     - Thông tin người: `userId`, `user` (`{id, username, name}`, hoặc `null`).
     - `status`: `submitted|in_progress|not_started|cancelled`.
     - Bài làm: `attemptId`, `sessionId`, `startedAt`, `finishedAt`, `score`, `passed`, `timeSpentSeconds`,
       `attemptCount`. Người chưa bắt đầu có các trường này là `null` và `attemptCount = 0`.
   - Dạng trả về: `{candidates, total, page, limit, totalPages}`.
4. `POST /examsessions/room/:examRoomId/end`:
   - Đặt `endTime = now` cho các phiên có `startTime <= now` và (`endTime` null hoặc `> now`), trong một `updateMany`.
   - Trả `{ended, endedAt}`; không có phiên nào đang chạy thì trả `ended: 0` (gọi lại vẫn an toàn).
   - Xóa cache như đường xóa phiên: item cache của từng phiên đã đóng, list cache của user và `invalidateRoomCache`.
5. Phân quyền và kiểm tra quyền sở hữu:
   - Route 2 và 3 dùng `@RequirePermissions('exam_result:view')`; route 4 dùng `@RequirePermissions('exam_session:manage')`.
   - Phòng không phải của người gọi trả 404 (không lộ là phòng có tồn tại).
   - Mỗi controller nhận input bằng DTO Zod, có `@UsePipes(ZodValidationPipe)` ở cấp class.

## Architecture
- Đặt logic thuần trong `modules/examattempt/room-candidates.ts`:
  - `buildCandidates`, `filterCandidates`, `summarize`, `timelineBuckets`, `foldVietnamese`.
  - Service chỉ truy vấn rồi gọi các hàm này.
- `participantCount` dùng một `$queryRaw` có `COUNT(DISTINCT a."userId") ... GROUP BY s."examRoomId"`, lọc theo
  `hostId`; làm theo mẫu `$queryRaw` có sẵn.
  - Nếu tagged template gặp vấn đề schema, dùng `groupBy(['examSessionId','userId'])` rồi gộp theo phòng.
- `endRoom` đặt trong `ExamSessionService`, vì service này đã sở hữu việc ghi phiên và các hàm xóa cache.

## Related Code Files
- Sửa:
  - `examroom.service.ts`
  - `examattempt.service.ts`, `examattempt.controller.ts`
  - `examsession.service.ts`, `examsession.controller.ts`
  - `test/authz/authz-matrix.rows.ts`
- Tạo:
  - `examattempt/room-candidates.ts` và spec
  - `examattempt/dto/room-candidates.dto.ts`
  - Spec cho `endRoom`, cho `participantCount`/`sessionWindows`

## Implementation Steps
1. Viết spec cho các hàm thuần trước (RED), rồi viết `room-candidates.ts`.
2. Thêm hai method service và route GET, kèm DTO.
3. Làm `endRoom` và route POST, kèm spec dùng prisma giả: chỉ đóng phiên đang chạy, xóa cache, phòng của người khác
   trả 404.
4. Mở rộng `getAllExamRooms`, kèm spec.
5. Thêm dòng vào ma trận authz cho 3 route: không token → 401, sai quyền → 403, chủ phòng khác → 404.
6. Chạy `yarn typecheck`, `yarn test apps/assessment-service`, `yarn test test/authz`.

## Todo List
- [x] room-candidates.ts và spec
- [x] overview + candidates route
- [x] end room route
- [x] list-all sessionWindows + participantCount
- [x] authz matrix
- [x] typecheck + test

## Success Criteria
- Mọi spec mới từng fail trên code cũ hoặc trên hàm còn trống.
- `yarn typecheck` trả 0.
- `yarn test` của assessment-service và `test/authz` đều xanh.

## Risk Assessment
- Phòng có rất nhiều thí sinh làm mỗi request thành O(n): chấp nhận được, vì một phòng cỡ một lớp học.
- Tìm kiếm lấy profile của mọi thí sinh: profileMap gọi theo lô và có cache 600s.
- Đóng phiên đúng lúc có người đang bắt đầu làm: lần kiểm tra `endTime` khi bắt đầu sẽ chặn người đó. Đây đúng là
  ý nghĩa của "kết thúc".

## Security Considerations
- Kiểm tra chủ phòng trên mọi route mới.
- Không trả email, `accessCode` hay `whitelist` thô.
- Tham số `search` chỉ dùng để lọc trong bộ nhớ, không ghép vào SQL.

## Next Steps
Phase 03 gọi các route này.
