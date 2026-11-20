# SCR027: ManageExamRoomDetailPage — Screen Spec

**Screen**: SCR027: ManageExamRoomDetailPage
**Type**: composite (7 independent regions)
**Route**: `/k/manage-exam-room/:id`
**Generated**: 2026-06-06
**Updated**: 2026-11-20 — page now composes `PageHeader`, `RoomDetailStats`, `RoomInfoCard`, `RoomProgressCard` and four tabs (candidates, sessions, stats, settings); `AttemptDetailSheet` added; sharing/validation/endpoints brought in line with the code

## Purpose

A protected workspace page that lets the host (quiz set owner) manage a single exam room: view stats, create/edit/delete sessions, copy a session link, manage candidates, edit or delete the room, and navigate to per-session analytics. The teacher uses this to operate an exam end-to-end.

## Screen Layout

KLayout-wrapped page (`guarded` default layout, `routes/index.tsx:92`). `ManageExamRoomDetailPage` renders a `PageHeader` (breadcrumb, title, status pill, room actions), a stats row, a two-column row (room info + progress), a tabbed card (candidates, sessions, stats, settings) and two overlays (attempt detail sheet, end-room confirm). The active tab lives in the `?tab=` query (default `candidates`). — source: `ManageExamRoomDetailPage.tsx:115`

### Layout Sketch

```
┌─────────────────────────────────────────┐
│  R1: KLayout Sidebar + Header (sticky)  │
├─────────────────────────────────────────┤
│  R2: PageHeader                         │
│   RoomBreadcrumb / title / quiz set /   │
│   RoomStatusPill / RoomDetailActions    │
├─────────────────────────────────────────┤
│  R3: RoomDetailStats (4 cards)          │
│   total / ongoing / ended / participants│
├───────────────────┬─────────────────────┤
│  R4a: RoomInfoCard│ R4b: RoomProgressCard│
├───────────────────┴─────────────────────┤
│  R5: Tabs (RoomDetailTabs + tabpanel)   │
│   candidates | sessions | stats | settings
├─────────────────────────────────────────┤
│  R6: AttemptDetailSheet (side sheet)    │
│  R7: End-room DeleteConfirmDialog       │
└─────────────────────────────────────────┘
```

### Layout Regions

| Region ID | Name | Position | Scrollable | Key Components | Responsive Behavior |
|-----------|------|----------|------------|----------------|---------------------|
| R1 | KLayout chrome | sticky-top | no | SideBar, header | sidebar-collapsed-sm |
| R2 | PageHeader | static | no | `PageHeader` (`large`), `RoomBreadcrumb`, `RoomStatusPill`, `RoomDetailActions` | actions wrap under the title |
| R3 | RoomDetailStats | static | no | `RoomDetailStats` → 4 `StatHighlightCard` | 1 col, 2 cols from 480px, 4 cols at `xl` |
| R4 | Info + progress | static | no | `RoomInfoCard`, `RoomProgressCard` | `lg:grid-cols-[minmax(0,1fr)_minmax(0,1.55fr)]` |
| R5 | Tabs card | static | tab list scrolls sideways on phones | `RoomDetailTabs`; panels `CandidatesTab`, `RoomSessionsTab`, `RoomStatsTab`, `RoomSettingsTab` | full-width |
| R6 | AttemptDetailSheet | overlay | yes | `AttemptDetailSheet` (driven by `useAttemptDetail`) | side sheet |
| R7 | End-room dialog | modal overlay | no | `DeleteConfirmDialog` | centered modal |

Region R5 hosts these nested pieces: the sessions tab opens `ExamSessionFormModal` (create/edit), a share dialog (read-only session link + copy) and a delete confirm dialog (`room-sessions-tab.tsx:100`, `room-sessions-tab.tsx:115`, `room-sessions-tab.tsx:125`); the settings tab holds `ExamRoomForm`, `RoomOverviewPanel`, `RoomDangerPanel` and a delete-room confirm (`room-settings-tab.tsx:78`, `room-settings-tab.tsx:92`, `room-settings-tab.tsx:98`).

## User Flow

### Happy Path

1. User navigates from ManageExamRoomPage → opens a room → `RoomDetail` (keyed by room id) calls `useExamRoomStore.fetchExamRoomById(id)` (`ManageExamRoomDetailPage.tsx:60`)
2. Stats row and info card derive from the room's sessions via `roomTimeline`; `useRoomOverview` loads `GET /api/v1/examattempts/room/:id/overview` for the progress card and participants count (`ManageExamRoomDetailPage.tsx:55`)
3. Candidates tab (default) reads `GET /api/v1/examattempts/room/:id/candidates` with search, status and result filters, 10 per page (`use-room-candidates.ts:7`)
4. User opens "Phiên thi" tab → `useExamRoomDetailStore.fetchSessions(roomId, page, 10)` lists sessions (`room-sessions-tab.tsx:33`)
5. User clicks "Tạo phiên thi" → `ExamSessionFormModal` → submit → `POST /api/v1/examsessions` (`room-sessions-tab.tsx:72`, `room-sessions-tab.tsx:52`)
6. User picks "Xem thống kê" on a session row → navigates to `/k/manage-exam-room/:id/session/:sessionId` (`room-sessions-tab.tsx:95`)
7. User picks "Chia sẻ" on a session row → dialog shows the session link `/exam-session/:sessionId` with a copy button (`room-sessions-tab.tsx:17`, `room-sessions-tab.tsx:100`)
8. User clicks "Xem chi tiết" on a submitted candidate → `AttemptDetailSheet` opens (`ManageExamRoomDetailPage.tsx:152`)
9. User clicks "Kết thúc phòng" (shown while a session is running and the user has `exam_session:manage`) → confirm → `POST /api/v1/examsessions/room/:id/end` (`ManageExamRoomDetailPage.tsx:127`, `ManageExamRoomDetailPage.tsx:172`)

### Branches

| Decision point | Condition | Outcome on this screen | Source |
|----------------|-----------|------------------------|--------|
| Room loading | no room for this id and no error yet | Skeleton blocks | `ManageExamRoomDetailPage.tsx:91` |
| Room not found | `fetchExamRoomById` rejects with 404 | `SectionMessage` "Không tìm thấy phòng thi" + "Quay lại danh sách" | `ManageExamRoomDetailPage.tsx:100` |
| Room load failed | non-404 error | `SectionMessage` "Không tải được phòng thi" + retry | `ManageExamRoomDetailPage.tsx:84` |
| Empty sessions | `sessions.length === 0` | empty-state + "Tạo phiên thi" CTA | `room-sessions-section.tsx:56` |
| Empty candidates | `list.rows.length === 0` and not loading | "Chưa có thí sinh nào" (or "Không có thí sinh phù hợp" when filtered) | `candidates-tab.tsx:96` |
| Delete session | confirm dialog | `deleteSession` then refresh | `room-sessions-tab.tsx:125` |
| Delete room | confirm in settings tab | room deleted, navigate to `/k/manage-exam-room` | `room-settings-tab.tsx:53` |
| Source quiz set deleted | `room.sourceDeleted` | Warning "Bộ đề gốc đã bị xóa — không thể tạo phiên thi mới" on the info card | `room-detail-cards.tsx:53` |
| Live room | `timeline.status === "ongoing"` | overview refreshes every 30 s; candidates refresh every 30 s on the candidates tab | `use-room-overview.ts:7`, `use-room-candidates.ts:10` |

## Data Inventory

| Field | Display Label | Source | Format | Empty Behavior | Cross-ref |
|-------|---------------|--------|--------|----------------|-----------|
| roomTitle | Exam room title (page title) | `useExamRoomStore.currentExamRoom.title` | raw | — | MODEL-016 |
| quizSetTitle | "Đề thi: …" | `room.quizSet.title` | raw | "Chưa có bộ đề" | MODEL-005 |
| totalSessions | "Tổng phiên thi" | `timeline.ongoing + upcoming + ended` | integer | 0 | MODEL-018 |
| ongoing | "Đang diễn ra" | `timeline.ongoing` | integer | 0 | MODEL-018 |
| ended | "Đã kết thúc" | `timeline.ended` | integer | 0 | MODEL-018 |
| participants | "Lượt tham gia" | `overview.completed + inProgress + cancelled` | integer | "–" until the overview loads | MODEL-019 |
| roomStatus | status pill | `roomTimeline(sessions, now).status` (`ongoing` / `upcoming` / `ended` / `empty`) | `RoomStatusPill` | — | DISC-001 |
| startsAt | "Thời gian bắt đầu" | `timeline.startsAt` via `formatStamp` | date-time | "Chưa có phiên thi" | MODEL-018 |
| createdAt | "Thời gian tạo" | `room.createdAt` via `formatStamp` | date-time | — | MODEL-016 |
| host | "Người tổ chức" | `displayUserName(room.host)` | raw | — | MODEL-016 |
| candidates | tab label "Danh sách thí sinh (N)" | `overview.candidates` | integer | label without count | MODEL-019 |
| sessions | tab label "Phiên thi (N)" | `sessions.length` | integer | 0 | MODEL-018 |

## UI States

| State | Trigger | Visual Behavior | User Action Available | Source |
|-------|---------|----------------|-----------------------|--------|
| loading | room not yet loaded | skeleton blocks (`aria-busy`) | none | `ManageExamRoomDetailPage.tsx:91` |
| not found | 404 on room load | message + back button | "Quay lại danh sách" | `ManageExamRoomDetailPage.tsx:100` |
| error | non-404 error on room load | message + retry | "Thử lại" | `ManageExamRoomDetailPage.tsx:84` |
| overview failed | overview read fails | progress card shows retry; last numbers stay | retry | `ManageExamRoomDetailPage.tsx:141` |
| candidates failed | candidates read fails | `role="alert"` line with "Thử lại" | retry | `candidates-tab.tsx:82` |
| sessions empty | 0 sessions | empty-state + CTA | create session | `room-sessions-section.tsx:56` |
| mutation in flight | `mutationLoading` | confirm dialogs and form disabled/loading | none | `ManageExamRoomDetailPage.tsx:166` |
| session form | "Tạo phiên thi" or "Chỉnh sửa" | `ExamSessionFormModal` | fill + submit | `room-sessions-tab.tsx:115` |
| share-dialog | "Chia sẻ" on a session | dialog with the link and a copy button | copy link | `room-sessions-tab.tsx:100` |
| end-room confirm | "Kết thúc phòng" | `DeleteConfirmDialog` "Kết thúc phòng thi" | "Kết thúc" / cancel | `ManageExamRoomDetailPage.tsx:164` |
| attempt sheet | candidate "Xem chi tiết" / "Xem bài làm" | `AttemptDetailSheet` | close | `ManageExamRoomDetailPage.tsx:162` |

## Validation & Error Feedback

### A) Client-side

Session form (`ExamSessionFormModal`):

| Field | Type | Required | Constraints | Async Check | Error Message |
|-------|------|----------|-------------|-------------|---------------|
| startTime | datetime | yes | non-empty | none | "Vui lòng chọn thời gian bắt đầu" |
| accessCode | string | when access type = code | exactly 6 digits | none | "Vui lòng nhập mã truy cập" / "Mã truy cập phải là 6 chữ số" |
| whitelistUsers | list | when access type = whitelist | at least 1 user | none | "Vui lòng thêm ít nhất 1 người dùng" |
| maxAttempts | integer | when retake allowed | 1–10 | none | "Số lần làm phải từ 1 đến 10" |
| durationMinutes | integer | no | whole minutes 1–1440; empty = until the session ends | none | "Thời gian làm bài từ 1 đến 1440 phút" |

Source: `ExamSessionFormModal.tsx:233`, `session-time-section.tsx:23`.

### B) Server-side

#### Create session
- **Endpoint:** `POST /api/v1/examsessions`
- **Request:** `{ examRoomId, startTime, endTime?, assessType, accessCode?, whitelist, allowRetake, maxAttempts, showAnswersAfterSubmit, passingScore, questionCount, questionSelectionMode, labelQuestionConfig, shuffleQuestions, durationMinutes, antiCheatEnabled, allowLeaveMidway }`
- **Success:** session created, list refreshed
- **Errors:** toast with the server message or a mapped create-session message
- **Source:** `kmaedu-fe/src/apis/examSessionApi.ts:91`, `kmaedu-fe/src/stores/useExamRoomDetailStore.ts:114`

#### Update session
- **Endpoint:** `PUT /api/v1/examsessions/:id`
- **Source:** `kmaedu-fe/src/apis/examSessionApi.ts:112`

#### Delete session
- **Endpoint:** `DELETE /api/v1/examsessions/:id`
- **Source:** `kmaedu-fe/src/apis/examSessionApi.ts:120`

#### End room
- **Endpoint:** `POST /api/v1/examsessions/room/:examRoomId/end`
- **Success:** running sessions closed; page refreshes room, overview and candidates
- **Source:** `kmaedu-fe/src/apis/examSessionApi.ts:270`, `kmaedu-fe/src/stores/useExamRoomDetailStore.ts:270`

#### Room overview and candidates
- **Endpoints:** `GET /api/v1/examattempts/room/:examRoomId/overview`, `GET /api/v1/examattempts/room/:examRoomId/candidates`
- **Source:** `kmaedu-fe/src/apis/examAttemptApi.ts:427`, `kmaedu-fe/src/apis/examAttemptApi.ts:432`

#### Update / delete room
- **Endpoints:** `PUT /api/v1/examrooms/:id`, `DELETE /api/v1/examrooms/:id`
- **Source:** `kmaedu-fe/src/apis/examRoomApi.ts:77`, `kmaedu-fe/src/apis/examRoomApi.ts:84`

## Interaction Patterns

- **Tab selection lives in the URL** — `?tab=candidates|sessions|stats|settings`, replace navigation; arrow keys move between tabs — source: `ManageExamRoomDetailPage.tsx:70`, `room-detail-tabs.tsx:27`
- **Sessions paginate 10 per page** — source: `room-sessions-tab.tsx:15`, `room-sessions-section.tsx:115`
- **Candidates: search, status filter, result filter, pagination, CSV export** — source: `candidates-tab.tsx:59`, `candidates-tab.tsx:42`
- **"Sao chép link" copies the running (else next) session's link; "Xem kết quả" switches to the stats tab and scrolls to it** — source: `room-detail-actions.tsx:18`, `ManageExamRoomDetailPage.tsx:128`
- **Delete with confirmation (session, room, end room)** — source: `room-sessions-tab.tsx:125`, `room-settings-tab.tsx:98`, `ManageExamRoomDetailPage.tsx:164`
- **Room state refresh after a session change** — `refreshAll` re-reads the room, overview and candidates — source: `ManageExamRoomDetailPage.tsx:77`
- **Store reset on leave** — `useExamRoomDetailStore.reset` runs on unmount — source: `ManageExamRoomDetailPage.tsx:65`

## Accessibility

| Aspect | Status | Notes |
|--------|--------|-------|
| ARIA roles/labels | partial | Tab row is `role="tablist"` with `role="tab"`, `aria-selected`, and a `role="tabpanel"` (`room-detail-tabs.tsx:38`, `ManageExamRoomDetailPage.tsx:146`); search input has `aria-label`; loading blocks use `aria-busy` |
| Keyboard navigation | supported | Arrow keys move between tabs (roving `tabIndex`); Tab through table rows, filters and buttons |
| Focus management | unmanaged | Dialog focus is left to the dialog primitives; no custom trap |
| Screen reader compatibility | unknown | Pagination not announced |

`[NO_A11Y_DETECTED] — accessibility audit needed before production release.`

## Conditional Rendering

| Condition | Type | Renders | Hidden | Notes |
|-----------|------|---------|--------|-------|
| `canEndSessions && timeline.status === "ongoing"` | permission | "Kết thúc phòng" button | button omitted | `ManageExamRoomDetailPage.tsx:127`, `room-detail-actions.tsx:44` |
| `linkSessionId === null` | data | "Sao chép link" disabled with a tooltip | enabled | `room-detail-actions.tsx:33` |
| `tab === "candidates" \| "sessions" \| "stats" \| "settings"` | state | the matching tab panel only | the other panels | `ManageExamRoomDetailPage.tsx:147` |
| `room.sourceDeleted` | data | warning on `RoomInfoCard`; form quiz set cleared | warning omitted | `room-detail-cards.tsx:53`, `room-settings-tab.tsx:38` |
| `live && tab === "candidates"` | state | live candidate refresh | no refresh | `ManageExamRoomDetailPage.tsx:57` |
| `overview === null` (stats tab) | async | pulsing placeholder | stats content | `room-stats-tab.tsx:19` |

## Security Surface

| Guard | Type | Consequence if bypassed |
|-------|------|------------------------|
| Route guard `guarded(..., { permission: "exam_room:manage", pageKey: "manage-exam-room" })` | permission | redirect to login or `/403`; UX only (`routes/index.tsx:162`) |
| `useCan("exam_session:manage")` hides "Kết thúc phòng" | permission | UX only; the server enforces |
| Host ownership check (server) | permission | cross-user data modification |

## Source References

- Page/View: `kmaedu-fe/src/pages/k/ManageExamRoomDetailPage.tsx:1`
- Header and shared components: `kmaedu-fe/src/components/k-page/page-header.tsx`, `kmaedu-fe/src/components/k-page/section-card.tsx`, `kmaedu-fe/src/pages/k/components/exam-room-list/room-breadcrumb.tsx`, `kmaedu-fe/src/pages/k/components/exam-room-list/room-status-pill.tsx`
- Detail components: `kmaedu-fe/src/pages/k/components/exam-room-detail/room-detail-actions.tsx`, `room-detail-cards.tsx` (`RoomDetailStats`, `RoomInfoCard`), `room-detail-tabs.tsx`, `room-progress-card.tsx`, `candidates-tab.tsx`, `candidates-table.tsx`, `room-sessions-tab.tsx`, `room-stats-tab.tsx`, `room-settings-tab.tsx`, `room-settings-aside.tsx`
- Hooks: `kmaedu-fe/src/pages/k/components/exam-room-detail/use-room-overview.ts:1`, `kmaedu-fe/src/pages/k/components/exam-room-detail/use-room-candidates.ts:1`, `kmaedu-fe/src/pages/k/components/use-attempt-detail.ts:1`
- Sessions list: `kmaedu-fe/src/pages/k/components/room-sessions-section.tsx:1`
- Attempt sheet: `kmaedu-fe/src/pages/k/components/attempt-detail-sheet.tsx:1`
- Session form: `kmaedu-fe/src/components/organisms/ExamSessionFormModal.tsx:1`
- Store: `kmaedu-fe/src/stores/useExamRoomDetailStore.ts:1`
- API: `kmaedu-fe/src/apis/examRoomApi.ts` + `kmaedu-fe/src/apis/examSessionApi.ts` + `kmaedu-fe/src/apis/examAttemptApi.ts`
- Route config: `kmaedu-fe/src/routes/index.tsx:162`
