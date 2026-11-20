# SCR028: ExamRoomSessionAnalyticsPage — Screen Spec

**Screen**: SCR028: ExamRoomSessionAnalyticsPage
**Type**: atomic
**Route**: `/k/manage-exam-room/:id/session/:sessionId`
**Generated**: 2026-06-06
**Updated**: 2026-11-20 — page, data sources, labels and guards re-verified against source; no analytics endpoint, retry, ARIA or middleware claims remain

## Purpose

A permission-guarded workspace page that shows analytics for a single exam session: four summary cards, a score distribution chart, a violations chart, a ranking of completed candidates, and a per-candidate detail sheet. The host uses it to review results and integrity for one session.

## Screen Layout

KLayout-wrapped page (`guarded(...)` wraps it in `KLayout`, `kmaedu-fe/src/routes/index.tsx:93-97`). Top: `PageHeader` with breadcrumb. Then summary cards, a charts row (recharts), and the ranking table.

### Layout Sketch

```
┌─────────────────────────────────────────┐
│  R1: KLayout Sidebar + Header           │
├─────────────────────────────────────────┤
│  R2: Page content                       │
│  ┌─ R2a: PageHeader ─────────────────┐  │
│  │  breadcrumb, title, session title │  │
│  ├─ R2b: AnalyticsStats (4 cards) ───┤  │
│  ├─ R2c: Charts row ─────────────────┤  │
│  │  [score distribution: BarChart]   │  │
│  │  [violations: PieChart, if any]   │  │
│  └─ R2d: RankingCard ────────────────┘  │
│     table: rank, candidate, score,      │
│     status, time, violations, detail    │
└─────────────────────────────────────────┘
```

### Layout Regions

| Region ID | Name | Position | Scrollable | Key Components | Responsive Behavior |
|-----------|------|----------|------------|----------------|---------------------|
| R1 | KLayout chrome | sticky-top | no | SideBar, header | sidebar-collapsed-sm |
| R2a | PageHeader | static | no | `PageHeader` (title "Thống kê phiên thi", subtitle = session title) with `Breadcrumb` eyebrow (`kmaedu-fe/src/pages/k/ExamRoomSessionAnalyticsPage.tsx:122-137`) | fluid |
| R2b | AnalyticsStats | static | no | 4× `HistoryStatCard` (`kmaedu-fe/src/pages/k/components/session-analytics-sections.tsx:27-36`) | 1-col, 2-col-sm, 4-col-lg |
| R2c | Charts row | static | no | `ScoreDistributionCard` (BarChart), `ViolationsCard` (PieChart, only when cheating stats are non-empty) (`kmaedu-fe/src/pages/k/ExamRoomSessionAnalyticsPage.tsx:141-144`) | 1-col, 2-col-lg |
| R2d | RankingCard | static | table only (`overflow-x-auto`, `kmaedu-fe/src/pages/k/components/session-analytics-sections.tsx:100`) | ranking table with 7 columns | full-width |

## User Flow

### Happy Path

1. On the exam room detail page, sessions tab, the user opens the "Tùy chọn phiên thi" menu of a session row and picks "Xem thống kê" (`kmaedu-fe/src/pages/k/components/room-sessions-section.tsx:96-101`), which navigates to `/k/manage-exam-room/:id/session/:sessionId` (`kmaedu-fe/src/pages/k/components/exam-room-detail/room-sessions-tab.tsx:95`).
2. The page mounts and fetches in parallel the session (`getExamSessionByIdApi`), the attempts (`getExamAttemptsBySessionApi(sessionId, 1, 100, true)`, one best attempt per user, first 100 only) and the cheating stats (`getSessionCheatingStatsApi`) (`kmaedu-fe/src/pages/k/ExamRoomSessionAnalyticsPage.tsx:43-47`).
3. Average score, pass count, score distribution and total violations are computed in the browser from those responses (`kmaedu-fe/src/pages/k/ExamRoomSessionAnalyticsPage.tsx:87-100`).
4. The user reviews the charts, then the ranking; clicking "Xem" on a row opens `AttemptDetailSheet` (a side sheet) with that candidate's attempts and aggregated violations (`kmaedu-fe/src/pages/k/ExamRoomSessionAnalyticsPage.tsx:156`, `kmaedu-fe/src/pages/k/components/use-attempt-detail.ts:18-35`).

### Branches

| Decision point | Condition | Outcome on this screen | Source |
|----------------|-----------|------------------------|--------|
| Empty attempts | no completed attempt | "Chưa có thí sinh nào hoàn thành bài thi" | `kmaedu-fe/src/pages/k/components/session-analytics-sections.tsx:98` |
| No violations | cheating stats empty | violations chart is not rendered | `kmaedu-fe/src/pages/k/ExamRoomSessionAnalyticsPage.tsx:143` |
| Sort ranking | User clicks the "Điểm cao nhất" or "Vi phạm" header | Client-side re-sort, no re-fetch; same field toggles asc/desc, a new field starts desc | `kmaedu-fe/src/pages/k/ExamRoomSessionAnalyticsPage.tsx:78-85`, `kmaedu-fe/src/pages/k/ExamRoomSessionAnalyticsPage.tsx:102-108` |
| Load failure | any of the three requests rejects | error toast, no retry control | `kmaedu-fe/src/pages/k/ExamRoomSessionAnalyticsPage.tsx:58-61` |

## Data Inventory

| Field | Display Label | Source | Format | Empty Behavior | Cross-ref |
|-------|---------------|--------|--------|----------------|-----------|
| sessionTitle | page subtitle and breadcrumb | `sessionData.examRoom?.title`, fallback "Phiên thi" (breadcrumb fallback "Phòng thi") | raw | fallback text | MODEL-018 |
| completed | "Thí sinh hoàn thành" | count of attempts with `status === 1` | integer | 0 | MODEL-019 |
| avgScore | "Điểm trung bình" | mean of completed `attempt.score` | `toFixed(1)` + "%" | 0.0% | MODEL-019 |
| passed | "Đạt yêu cầu" | `passedCount/completed`, passed = `score >= passingScore` | "x/y" | 0/0 | MODEL-019 |
| totalViolations | "Lượt vi phạm" | `sum(cheatingStats[].totalCount)` | integer | 0 | MODEL-020 |
| scoreDistribution | "Phân bố điểm số" | 10 bins of 10 points, computed client-side | BarChart | zero-height bars | MODEL-019 |
| violationsByType | "Thống kê vi phạm" | `cheatingStats[]` `{description, totalCount, type}` | PieChart | card not rendered | MODEL-020 |
| rank | "Hạng" | row index in the sorted list | "#n" | — | — |
| studentName | "Thí sinh" | `displayUserName(attempt.user)` | raw | per `displayUserName` | MODEL-001 |
| attemptScore | "Điểm cao nhất" | `attempt.score`, `correctAnswers/totalQuestions` | "x.x%" + "(c/t)" | — | MODEL-019 |
| status | "Trạng thái" | `score >= passingScore` | badge "Đạt" / "Chưa đạt" | — | MODEL-019 |
| timeSpent | "Thời gian làm" | `formatDuration(attempt.timeSpentSeconds)` | m:ss | — | MODEL-022 |
| violationCount | "Vi phạm" | `attempt.violationCount` | badge when > 0 | 0 | MODEL-020 |

Sources: `kmaedu-fe/src/pages/k/ExamRoomSessionAnalyticsPage.tsx:51`, `kmaedu-fe/src/pages/k/components/session-analytics-sections.tsx:21-25`, `kmaedu-fe/src/pages/k/components/session-analytics-sections.tsx:30-33`, `kmaedu-fe/src/pages/k/components/session-analytics-sections.tsx:104-124`.

## UI States

| State | Trigger | Visual Behavior | User Action Available | Source |
|-------|---------|----------------|-----------------------|--------|
| loading | requests in flight | skeletons: title bar, 4 stat cards, one large block | none | `kmaedu-fe/src/pages/k/ExamRoomSessionAnalyticsPage.tsx:110-118` |
| empty | 0 completed attempts | `SectionMessage` in the ranking card | none | `kmaedu-fe/src/pages/k/components/session-analytics-sections.tsx:98` |
| error | any request rejects | error toast: reads `error.response.data.message`, which an `ApiRequestError` from `api.ts` does not carry, so it usually shows "Không thể tải dữ liệu"; page then renders with empty data | none (no retry) | `kmaedu-fe/src/pages/k/ExamRoomSessionAnalyticsPage.tsx:58-61` |

## Validation & Error Feedback

`N/A — no client-side form validation detected.`

### B) Server-side

#### Get session
- **Endpoint:** `GET /examsessions/get-by-id/:id`
- **Used for:** title (`examRoom.title`), `passingScore`, `startTime`, `endTime`
- **Source:** `kmaedu-fe/src/apis/examSessionApi.ts:108`

#### List attempts of a session
- **Endpoint:** `GET /examattempts/list-by-session/:sessionId` with `page=1`, `limit=100`, `distinctUser=true`
- **Success:** `200` → `{ attempts: ExamAttemptListItem[], total, page, limit, totalPages }`; only the first 100 attempts are loaded
- **Source:** `kmaedu-fe/src/apis/examAttemptApi.ts:239`, `kmaedu-fe/src/pages/k/ExamRoomSessionAnalyticsPage.tsx:45`

#### Get cheating stats
- **Endpoint:** `GET /cheatinglogs/session/:id/stats`
- **Success:** `200` → `CheatingSessionStats[]`, each `{ type, description, totalCount, affectedAttempts }`
- **Source:** `kmaedu-fe/src/apis/cheatingLogApi.ts:76`, type at `kmaedu-fe/src/apis/cheatingLogApi.ts:34-39`

#### Candidate detail sheet
- **Endpoints:** `GET /cheatinglogs/session/:sessionId/user/:userId`, then the attempt detail via `getExamAttemptDetailApi`
- **Source:** `kmaedu-fe/src/apis/cheatingLogApi.ts:116`, `kmaedu-fe/src/pages/k/components/use-attempt-detail.ts:23-29`

## Interaction Patterns

- **Recharts BarChart for score distribution, PieChart for violations** — source: `kmaedu-fe/src/pages/k/components/session-analytics-sections.tsx:43`, `kmaedu-fe/src/pages/k/components/session-analytics-sections.tsx:61`
- **Ranking sorted by score or violations, ascending or descending (completed attempts only, no time tie-break)** — source: `kmaedu-fe/src/pages/k/ExamRoomSessionAnalyticsPage.tsx:78`
- **Row action "Xem" opens `AttemptDetailSheet`** — source: `kmaedu-fe/src/pages/k/components/session-analytics-sections.tsx:125`, `kmaedu-fe/src/pages/k/ExamRoomSessionAnalyticsPage.tsx:156`

## Accessibility

| Aspect | Status | Notes |
|--------|--------|-------|
| ARIA roles/labels | none | no `role` or `aria-*` attribute in the page or its section components |
| Keyboard navigation | partial | "Xem" is a native `button`; the sortable headers only have `onClick` (`kmaedu-fe/src/pages/k/components/session-analytics-sections.tsx:106`, `:109`) |
| Focus management | not verified | sheet focus behaviour comes from the shared `Sheet` component, not checked here |
| Screen reader compatibility | not verified | no chart data summary in the page source |

`[NO_A11Y_DETECTED] — accessibility audit needed before production release.`

## Conditional Rendering

| Condition | Type | Renders | Hidden | Notes |
|-----------|------|---------|--------|-------|
| no completed attempt | data | empty message in the ranking card | ranking table | `kmaedu-fe/src/pages/k/components/session-analytics-sections.tsx:97-98` |
| `cheatingStats.length === 0` | data | — | violations chart | `kmaedu-fe/src/pages/k/ExamRoomSessionAnalyticsPage.tsx:143` |
| `loading` | state | skeletons | whole page content | `kmaedu-fe/src/pages/k/ExamRoomSessionAnalyticsPage.tsx:110` |

## Security Surface

| Guard | Type | Consequence if bypassed |
|-------|------|------------------------|
| `guarded(..., { permission: "exam_result:view", pageKey: "manage-exam-room" })` | permission (UX only; `RequirePermission` + `FeatureRoute`) | redirect to login or `/403`; backend still enforces | 

Route: `kmaedu-fe/src/routes/index.tsx:164-165`. Authorization of the three data calls is enforced by the backend, not by this page.

## Source References

- Page/View: `kmaedu-fe/src/pages/k/ExamRoomSessionAnalyticsPage.tsx:1`
- Charts and ranking: `kmaedu-fe/src/pages/k/components/session-analytics-sections.tsx:1`
- Detail sheet: `kmaedu-fe/src/pages/k/components/attempt-detail-sheet.tsx:1`
- API: `kmaedu-fe/src/apis/examSessionApi.ts:108` + `kmaedu-fe/src/apis/examAttemptApi.ts:239` + `kmaedu-fe/src/apis/cheatingLogApi.ts:76`
