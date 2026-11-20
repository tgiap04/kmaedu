# SCR031: ExamSessionPage — Screen Spec

**Screen**: SCR031: ExamSessionPage
**Type**: atomic
**Route**: `/exam-session/:id`
**Generated**: 2026-06-06
**Updated**: 2026-11-20 — waiting room rebuilt on `pages/exam-session/components/waiting-room-*.tsx` (old template and section components removed), host view added, dashboard-header layout, corrected endpoints

## Purpose

A candidate enters an exam session waiting room, sees the session facts (title, quiz set, duration, questions, passing score, attempt count, schedule, host, attempt rules), checks their past and in-progress attempts, confirms the honour pledge and proceeds to the quiz or resumes an existing attempt. The room's host who opens the same URL sees the host view instead: the same facts, the room actions and the list of candidates who joined. The page is accessed via a direct URL or from SCR029 (MyExamsPage).

## Screen Layout

The page renders inside `ExamSessionLayout` (`routes/index.tsx:145`): the `/k` dashboard header without the sidebar — logo, back button (previous in-app page, or `/k/my-exams` when the page was opened directly), workspace search, notifications, profile — and a copyright footer. The body is `WaitingRoomLayout`: a header with breadcrumb, title and subtitle, then a two-column grid (`lg:grid-cols-[minmax(0,1fr)_340px]`, `xl` 400px) with stats, room info and rules on the left and a panel on the right, and a footer bar pinned to the bottom with the pledge and the start button. Under `lg` the grid is a single column. The access code gate renders as a dialog with `showCloseButton=false`, blocking all other content. The not-found, access-denied and error states render centered cards (`max-w-md`).

### Layout Sketch

```
┌─────────────────────────────────────────────────────┐
│ (conditional) AccessCodeDialog — blocking dialog    │
│ (conditional) sessionNotFound Card                  │
│ (conditional) access denied Card                    │
│ (conditional) error / retry Card                    │
│ (conditional) loading skeleton grid                 │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ R1: ExamSessionLayout header (logo, back, search…)  │
├─────────────────────────────────────────────────────┤
│ R2: WaitingRoomHeader (breadcrumb, title, actions)  │
│  ┌──────────────────────────┐  ┌─────────────────┐  │
│  │ R3: Left column          │  │ R4: Right panel │  │
│  │  WaitingRoomStats (4)    │  │  Candidate:     │  │
│  │  WaitingRoomInfoCard     │  │   Attempts card │  │
│  │  WaitingRoomRulesCard    │  │  Host:          │  │
│  │                          │  │   Roster card   │  │
│  └──────────────────────────┘  └─────────────────┘  │
├─────────────────────────────────────────────────────┤
│ R5: WaitingRoomFooter (sticky): note | pledge | start│
└─────────────────────────────────────────────────────┘
```

### Layout Regions

| Region ID | Name | Position | Scrollable | Key Components | Responsive Behavior |
|-----------|------|----------|------------|----------------|---------------------|
| R1 | Page Header | sticky-top | no | `ExamSessionLayout`: `Logo`, back button, `HeaderSearch`, `NotificationBell`, `ProfileDropdown` | always visible |
| R2 | Room Header | static | no | `WaitingRoomHeader`: breadcrumb (`Bài thi của tôi` for a candidate, `Quản lý phòng thi` for the host), title, subtitle, host `actions` | wraps on small screens |
| R3 | Left Column | static | yes | `WaitingRoomStats` (duration, questions, passing score, attempt), `WaitingRoomInfoCard` (quiz set, type, schedule, host name), `WaitingRoomRulesCard` (time limit, anti-cheat, leave midway, login) | stats 1/2/4 columns by width; rules 1/2/4 columns |
| R4 | Right Panel | static | yes (list scrolls) | candidate: `WaitingRoomAttemptsCard`; host: `WaitingRoomRosterCard` | `lg:` 340px, `xl:` 400px column |
| R5 | Footer Bar | sticky-bottom | no | `WaitingRoomFooter`: note, pledge `Checkbox` (candidate only), "Bắt đầu làm bài" button | full-width start button on mobile |
| R6 | AccessCodeDialog | overlay | no | `InputOTP`, "Quay lại" / "Xác nhận" buttons | centered, `sm:max-w-md` |
| R7 | Session Not Found Card | static (centered) | no | `XCircleIcon` + back button | `max-w-md` centered |
| R8 | Access Denied Card | static (centered) | no | `LockSimpleIcon` + back button | `max-w-md` centered |
| R9 | Loading Skeleton | static | no | 3 skeletons left + 2 skeletons right | same grid shape as main layout |
| R10 | Error Card | static (centered) | no | `XCircleIcon` + message + "Thử lại" (host lookup) or "Về trang chủ" (candidate load) | `max-w-md` centered |

## User Flow

### Happy Path (candidate)

1. Candidate navigates to `/exam-session/{id}`.
2. The load effect (`ExamSessionPage.tsx:68`) waits for auth; if not authenticated it redirects to `/login?from=...` with `setRedirectBackTarget` (`ExamSessionPage.tsx:82`). If `/auth/me` is unreachable (`sessionUnavailable`) it shows `SessionUnavailable` instead (`ExamSessionPage.tsx:172`).
3. For users with `exam_session:manage`, `useHostWaitingRoom` first asks the session API; a 404 means "not the host" and the candidate flow continues (`use-host-waiting-room.ts:40`).
4. `checkExamSessionAccessApi(id)` determines access (`ExamSessionPage.tsx:91`).
5. If access is granted and the user has `exam:take` (`canLoadExamStats`): stats load via `getExamSessionStatsApi`, then attempt history via `getMyAttemptsBySessionApi` (`ExamSessionPage.tsx:96`, `ExamSessionPage.tsx:103`). `fromStudentStats` builds the view model (`waiting-room-view.ts:47`) and `WaitingRoomLayout` renders it (`ExamSessionPage.tsx:393`).
6. Candidate reads the rules, ticks "Tôi đã đọc quy định và cam kết không gian lận" (`waiting-room-footer.tsx:25`).
7. Candidate clicks **Bắt đầu làm bài** (disabled until the pledge is ticked and `exam:take` is held, `ExamSessionPage.tsx:417`). `handleStartExam` validates that `startTime <= now` and `endTime` has not passed, calls `invalidateExams()`, then navigates to `/exam-session/{id}/quiz` (`ExamSessionPage.tsx:366`).
8. If an attempt is in progress, the attempts card shows **Tiếp tục làm bài** for it (`waiting-room-attempts-card.tsx:72`), navigating to `/exam-session/{id}/quiz?attemptId=...` (`ExamSessionPage.tsx:384`).
9. For finished attempts, **Xem chi tiết** navigates to `/exam-session/{id}/quiz?attemptId=...&view=result` (`ExamSessionPage.tsx:389`).

### Happy Path (room host)

1. Host opens the URL; `useHostWaitingRoom` loads the session via `getExamSessionByIdApi` (`use-host-waiting-room.ts:31`); success sets state `host`.
2. `HostWaitingRoom` renders the same layout from `fromHostSession` with room actions (`RoomDetailActions`) in the header and `WaitingRoomRosterCard` on the right (`host-waiting-room.tsx:36`).
3. The roster is read via `getExamAttemptsBySessionApi(id, 1, 100, true)` and refreshed every 15 seconds (`ROSTER_REFRESH_MS`, `use-host-waiting-room.ts:6`, `use-host-waiting-room.ts:67`).
4. The start button is always disabled ("Chủ phòng không làm bài trong phòng của mình", `host-waiting-room.tsx:48`); "Kết thúc phòng thi" asks for confirmation, then closes the room and reloads the session (`host-waiting-room.tsx:57`).

### Branches

| Decision point | Condition | Outcome on this screen | Source |
|----------------|-----------|------------------------|--------|
| User not authenticated | `isAuthenticated === false` and not `sessionUnavailable` | Redirect to `/login?from=...` | `ExamSessionPage.tsx:76` |
| Session unavailable | `!isAuthenticated && sessionUnavailable` | `SessionUnavailable` component | `ExamSessionPage.tsx:172` |
| Host lookup ok | `host.state === "host"` | Host view (`HostWaitingRoom`) | `ExamSessionPage.tsx:176` |
| Not the host | session API answers 404 | Candidate flow continues | `use-host-waiting-room.ts:40` |
| Host lookup failed (not 404) | first lookup fails | Retry card with message and "Thử lại"; after the host view is shown a later failure keeps it | `ExamSessionPage.tsx:187`, `use-host-waiting-room.ts:44` |
| Session not found (404) | `error.status === 404` on the candidate load | "Không tìm thấy phiên thi" Card + "Về trang chủ" button | `ExamSessionPage.tsx:117`, `ExamSessionPage.tsx:223` |
| Access type = `code_required` | access check says so and stats not allowed | AccessCodeDialog shown (InputOTP) | `ExamSessionPage.tsx:111` |
| Access type = `denied` | `!hasAccess && accessType === "denied"` | "Phiên thi riêng tư" Card + back button | `ExamSessionPage.tsx:312` |
| Access code wrong | verify call rejects | Inline error "Mã truy cập không đúng" under OTP | `ExamSessionPage.tsx:162` |
| Other load failure | candidate load throws (not 404) | Error toast and a card with the message + "Về trang chủ" | `ExamSessionPage.tsx:120`, `ExamSessionPage.tsx:327` |
| Session not started yet | `startTime > now` on start click | Info toast "Phiên thi chưa bắt đầu. Vui lòng quay lại đúng giờ." | `ExamSessionPage.tsx:371` |
| Session ended | `endTime < now` on start click | Info toast "Phiên thi đã kết thúc." | `ExamSessionPage.tsx:375` |
| Access but no `exam:take` | `!stats && hasAccess && !canTakeExam` | Status notice (`rbac.teacherCannotTakeExam`) | `ExamSessionPage.tsx:343` |
| `stats === null` after access granted | no stats yet | Centered `CircleNotchIcon` spinner | `ExamSessionPage.tsx:356` |

## Data Inventory

| Field | Display Label | Source | Format | Empty Behavior | Cross-ref |
|-------|---------------|--------|--------|----------------|-----------|
| `view.title` | Exam title (breadcrumb + h1) | stats `title` / host `examRoom.title` | raw string | host: "Phòng thi" | MODEL-018.title |
| `view.subtitle` | Subtitle | stats `description` / room `description` | raw string | "Thi trực tuyến" | MODEL-018.description |
| `view.attemptMinutes` | Thời gian / Giới hạn thời gian làm bài | stats `attemptDurationMinutes` / host `durationMinutes` | `durationLabel`: "N phút" | "Không giới hạn" | MODEL-018.durationMinutes |
| `view.totalQuestions` | Tổng số câu hỏi | stats `totalQuestions` / host `totalQuestions` | "N câu" | "–" | MODEL-018.questionCount |
| `view.passingScore` | Điểm đạt | stats / host `passingScore` | "N%" | "Không yêu cầu" | MODEL-018.passingScore |
| `view.attemptsLabel` | Lượt thi | candidate: `attemptsLabel(currentAttempt, maxAttempts)`; host: `allowRetake` / `maxAttempts` | "Lần đầu", "Lần N", "N/M"; host "Tối đa N lần" or "1 lần" | n/a | MODEL-018.maxAttempts |
| `view.quizSetTitle` | Bộ đề | stats `quizSetTitle` / `examRoom.quizSet.title` | raw string | "–" | MODEL-018 |
| `view.startTime` | Thời gian bắt đầu | stats / session `startTime` | `formatStamp`: "dd/MM/yyyy • HH:mm" | "–" | MODEL-018.startTime |
| `view.endTime` | Thời gian kết thúc | stats / session `endTime` | `formatStamp` | "Không giới hạn" | MODEL-018.endTime |
| `view.hostName` | Người tổ chức | stats `host` / `examRoom.host` via `displayUserName` | raw string | per `displayUserName` | MODEL-018 |
| `view.antiCheatEnabled` | Chống gian lận | stats / session `antiCheatEnabled` | "Bật chế độ giám sát" / "Không giám sát" | true | MODEL-018 |
| `view.allowLeaveMidway` | Cho phép thoát giữa chừng | stats / session `allowLeaveMidway` | "Có" / "Không, rời trang sẽ nộp bài" | true | MODEL-018 |
| `myAttempts[].status` | Attempt status | `getMyAttemptsBySessionApi` → `MyAttemptItem.status` | 0 → "Đang thi"; else "Hoàn thành", or "Đạt" / "Chưa đạt" when a passing score exists | n/a | DISC-008 |
| `myAttempts[].percentage` | Score % | computed `round(correctAnswers/totalQuestions*100)` | `XX%` + "N/M đúng" | 0 | MODEL-019.correctAnswers |
| `myAttempts[].timeSpentSeconds` | Duration | computed by `attemptSpentSeconds(startedAt, finishedAt)` | `formatSpent` (`M:SS`) | null → hidden | MODEL-019.timeSpentSeconds |
| `myAttempts[].violationCount` | Violations | `MyAttemptItem.violationCount` | "N vi phạm" | 0 → hidden | MODEL-020.count |
| `candidates[]` | Danh sách thí sinh | `getExamAttemptsBySessionApi` (host, one row per candidate) | name + "Đang làm" / "Đã nộp" | "Chưa có thí sinh nào tham gia" | MODEL-019 |
| `rosterCounts` | Đã vào phòng / Đang làm / Chưa bắt đầu | computed from candidates and `session.whitelist` | integers | "Chưa bắt đầu": "–" when not invite-only | MODEL-018.whitelist |

## UI States

| State | Trigger | Visual Behavior | User Action Available | Source |
|-------|---------|----------------|-----------------------|--------|
| loading | access check in-flight or host lookup loading | Skeleton grid (3 left + 2 right) | none | `ExamSessionPage.tsx:203` |
| session not found | `error.status === 404` | Centered error card with XCircle icon + back button | "Về trang chủ" | `ExamSessionPage.tsx:223` |
| access denied | `accessType === "denied"` | "Phiên thi riêng tư" card + back button | "Về trang chủ" | `ExamSessionPage.tsx:312` |
| access code gate | `accessType === "code_required"` | InputOTP dialog, no close button | enter 6 digits + verify, or "Quay lại" | `ExamSessionPage.tsx:242` |
| verifying code | `verifying === true` | Verify button shows spinner + "Đang xác thực..."; slots disabled | none | `ExamSessionPage.tsx:294` |
| code error | `codeError !== ""` | Red border on all slots + error message | re-enter code | `ExamSessionPage.tsx:287` |
| host error | first host lookup fails (not 404) | Error card with message | "Thử lại" | `ExamSessionPage.tsx:187` |
| load error | candidate load fails (not 404) | Error card with message | "Về trang chủ" | `ExamSessionPage.tsx:327` |
| host view | `host.state === "host"` | Host waiting room + roster | room actions, "Kết thúc phòng thi" | `ExamSessionPage.tsx:176` |
| stats null | `stats === null` after access granted | Centered spinner | none | `ExamSessionPage.tsx:356` |
| attempt history loading | `myAttemptsLoading === true` | 2 skeleton rows | none | `waiting-room-attempts-card.tsx:34` |
| attempt history empty | `attempts.length === 0` | "Chưa có lượt thi nào" empty state | none | `waiting-room-attempts-card.tsx:36` |
| roster loading | candidates loading, list empty | 3 skeleton rows | none | `waiting-room-roster-card.tsx:31` |
| roster empty | `candidates.length === 0` | "Chưa có thí sinh nào tham gia" | none | `waiting-room-roster-card.tsx:35` |
| start button disabled | pledge not ticked or no `exam:take` | Button disabled, tooltip with the reason | tick the pledge | `waiting-room-footer.tsx:33` |

## Validation & Error Feedback

### A) Client-side

| Field | Type | Required | Constraints | Async Check | Error Message |
|-------|------|----------|-------------|-------------|---------------|
| access code | OTP | yes | exactly 6 characters; verify button disabled until 6 are entered | none | "Mã truy cập phải có 6 chữ số" |
| access code (submitted) | OTP | yes | must match server code | `verifyExamSessionAccessCodeApi` | "Mã truy cập không đúng" |

### B) Server-side

#### Check session access
- **Endpoint:** `GET /api/v1/examsessions/study/{id}/access`
- **Request:** `{id}` from URL param
- **Success:** `200` → `{ hasAccess, accessType }`
- **Errors:** `404` → session not found card; other → error toast + card
- **Trigger:** `useEffect` on mount / `id` change
- **Source:** `ExamSessionPage.tsx:91`, `examSessionApi.ts:136`

#### Verify access code
- **Endpoint:** `POST /api/v1/examsessions/study/{id}/verify-code`
- **Request:** `{ accessCode }` (6-digit string)
- **Success:** `200` → dialog closes, stats loaded (when `exam:take`), code kept in `sessionStorage` for the start call
- **Errors:** rejection → inline error "Mã truy cập không đúng"
- **Trigger:** Click "Xác nhận" in AccessCodeDialog
- **Source:** `ExamSessionPage.tsx:150`, `examSessionApi.ts:164`

#### Get session stats
- **Endpoint:** `GET /api/v1/examsessions/study/{id}/stats`
- **Request:** `{id}` from URL param
- **Success:** `200` → `setStats(sessionStats)`; layout renders. Only called when `canLoadExamStats(hasAccess, canTakeExam)` (the endpoint requires `exam:take`)
- **Errors:** error toast + card with the server or fallback message "Không thể tải thông tin phiên thi"
- **Trigger:** after access check or after code verification
- **Source:** `ExamSessionPage.tsx:96`, `examSessionApi.ts:252`, `lib/rbac/exam-stats-gate.ts:2`

#### Get session (host)
- **Endpoint:** `GET /api/v1/examsessions/get-by-id/{id}`
- **Success:** `200` → host view
- **Errors:** `404` → not the host, candidate flow; other → retry card
- **Trigger:** mount, when the user may manage sessions, and "Thử lại"
- **Source:** `use-host-waiting-room.ts:31`, `examSessionApi.ts:107`

#### Start exam attempt
- **Endpoint:** implicit via `startExamAttemptApi` call from the quiz page (SCR032)
- **Success:** this page only navigates to `/exam-session/{id}/quiz`
- **Errors:** `startTime > now` → info toast; `endTime < now` → info toast (checked on this page, no request sent)
- **Trigger:** Click "Bắt đầu làm bài" button
- **Source:** `ExamSessionPage.tsx:366`

#### Get attempts by session
- **Endpoint:** `GET /api/v1/examattempts/list?examSessionId={id}&page=1&limit=10`
- **Request:** `{ examSessionId, page, limit }`
- **Success:** `200` → `setMyAttempts(examAttempts)`
- **Errors:** silently caught; no user-visible error
- **Trigger:** after stats load
- **Source:** `ExamSessionPage.tsx:103`, `examAttemptApi.ts:267`

#### Get candidates by session (host)
- **Endpoint:** `GET /api/v1/examattempts/list-by-session/{id}?page=1&limit=100&distinctUser=true`
- **Success:** `200` → roster; failures keep the last list and retry on the next 15 s tick
- **Source:** `use-host-waiting-room.ts:58`, `examAttemptApi.ts:233`

## Interaction Patterns

- **Clicking "Xác nhận" in AccessCodeDialog verifies the 6-digit OTP** — on success, dialog closes and session stats load; on failure, red border on all slots + error message, source: `ExamSessionPage.tsx:140`
- **Ticking the pledge enables the start button** — `agreed` state plus `exam:take` gate `canStart`, source: `ExamSessionPage.tsx:417`, `waiting-room-footer.tsx:26`
- **Clicking "Bắt đầu làm bài" navigates to quiz page** — validates time bounds first, then `invalidateExams()` + `navigate(...)`, source: `ExamSessionPage.tsx:366`
- **Clicking "Tiếp tục làm bài" resumes an in-progress attempt** — navigates with `attemptId` param, source: `waiting-room-attempts-card.tsx:72`, `ExamSessionPage.tsx:384`
- **Clicking "Xem chi tiết" on a completed attempt** — navigates with `attemptId` and `view=result` params, source: `waiting-room-attempts-card.tsx:74`, `ExamSessionPage.tsx:389`
- **Host roster refreshes every 15 seconds** — `setInterval` while the host view is active, source: `use-host-waiting-room.ts:67`
- **Header back button** — `navigate(-1)` or `/k/my-exams` when the router's first entry, source: `ExamSessionLayout.tsx:29`

## Accessibility

| Aspect | Status | Notes |
|--------|--------|-------|
| ARIA roles/labels | present | AccessCodeDialog uses the dialog primitive; breadcrumb is `nav aria-label="Breadcrumb"` with `aria-current="page"` (`waiting-room-header.tsx:16`); decorative icons `aria-hidden`; header back button has `aria-label="Quay lại"`; notices use `role="status"` |
| Keyboard navigation | supported | Tab through OTP slots, pledge checkbox and buttons; OTP auto-advances focus |
| Focus management | managed | Dialog prevents outside interaction; `onPointerDownOutside` + `onEscapeKeyDown` blocked on OTP dialog |
| Screen reader compatibility | unknown | OTP slots have `index` props; no live region for roster updates |

[NO_A11Y_DETECTED] — accessibility audit needed before production release.

## Conditional Rendering

| Condition | Type | Renders | Hidden | Notes |
|-----------|------|---------|--------|-------|
| `!isAuthenticated && sessionUnavailable` | auth | `SessionUnavailable` | all other content | `ExamSessionPage.tsx:172` |
| `host.state === "host" && host.session` | role | `HostWaitingRoom` | candidate layout | `ExamSessionPage.tsx:176` |
| `host.state === "error"` | async | Retry card | all other content | `ExamSessionPage.tsx:187` |
| `loading || host.state === "loading"` | async | Skeleton grid | all other content | `ExamSessionPage.tsx:203` |
| `sessionNotFound === true` | data | Error card with XCircle | all other content | `ExamSessionPage.tsx:223` |
| `showCodeDialog === true` | data | AccessCodeDialog | all other content | `ExamSessionPage.tsx:242` |
| `accessType === "denied"` | auth | Access denied card | all other content | `ExamSessionPage.tsx:312` |
| `!stats && loadError` | async | Load error card | layout | `ExamSessionPage.tsx:327` |
| `!stats && hasAccess && !canTakeExam` | role | Teacher-cannot-take-exam notice | layout | `ExamSessionPage.tsx:343` |
| `stats === null` (post-access) | data | Spinner | layout | `ExamSessionPage.tsx:356` |
| `!canTakeExam` (with stats) | role | Notice above the grid | none | `ExamSessionPage.tsx:397` |
| `pledge` prop present | role | Pledge checkbox (candidate); omitted for the host | — | `waiting-room-footer.tsx:24` |
| `view.endTime` set | data | formatted end time | "Không giới hạn" | `waiting-room-info-card.tsx:43` |
| `loading` (attempts) | async | Skeleton rows | attempt list | `waiting-room-attempts-card.tsx:34` |
| `attempts.length === 0` | data | Empty state "Chưa có lượt thi nào" | attempt list | `waiting-room-attempts-card.tsx:36` |
| `attempt.status === 0` | data | "Tiếp tục làm bài" button | "Xem chi tiết" button | `waiting-room-attempts-card.tsx:71` |
| `canEnd` (host) | data | "Kết thúc phòng thi" enabled while the session is running | disabled otherwise | `host-waiting-room.tsx:42` |

## Component Variants

| Component | Discriminating field | Variants on this screen | Screen-specific props/slots | Cross-ref |
|-----------|---------------------|------------------------|----------------------------|-----------|
| WaitingRoomLayout | caller | candidate (attempts aside, pledge footer) / host (roster aside, header actions, no pledge) | `view`, `crumb`, `actions`, `notice`, `aside`, `footer` | MODEL-018 |
| WaitingRoomAttemptsCard | `attempt.status`, `passingScore` | working (spinner) / done / passed / failed | percentage, correct count, duration, violations, action button | DISC-008 |
| WaitingRoomRosterCard | `candidate.status` | "Đang làm" / "Đã nộp" | counts row, candidate list | MODEL-019 |
| AccessCodeDialog | `verifying` state | idle / verifying (disabled + spinner) | 6 InputOTPSlot elements + error message | N/A |

## Security Surface

| Guard | Type | Consequence if bypassed |
|-------|------|------------------------|
| `isAuthenticated` check in load effect | auth | Redirect to `/login?from=...` with return URL preserved |
| `checkExamSessionAccessApi` — whitelist/code check | auth | Students without access see denied card or code gate; server enforces 403 |
| `accessType === "denied"` renders access denied UI | auth | Students not in whitelist see "Phiên thi riêng tư" card |
| `accessType === "code_required"` renders OTP dialog | auth | Students must provide correct 6-digit code to proceed |
| Host detection via session API (404 for non-hosts) | auth | UX only; the server decides who may read the session and the roster |
| `canLoadExamStats` / `canTakeExam` | permission | Stats are not requested without `exam:take`; the start button is disabled |
| Pledge checkbox before start | policy | Candidate must acknowledge the rules before starting |
| `startTime > now` prevents early start | time | Candidate sees info toast; navigation is skipped |
| `endTime < now` prevents late start | time | Candidate sees info toast; navigation is skipped |

## Source References

- Page/View: `kmaedu-fe/src/pages/exam-session/ExamSessionPage.tsx:44`
- Layout: `kmaedu-fe/src/routes/layouts/ExamSessionLayout.tsx:16`
- Waiting room layout: `kmaedu-fe/src/pages/exam-session/components/waiting-room-layout.tsx:19`
- Header: `kmaedu-fe/src/pages/exam-session/components/waiting-room-header.tsx:13`
- Stats: `kmaedu-fe/src/pages/exam-session/components/waiting-room-stats.tsx:27`
- Info card: `kmaedu-fe/src/pages/exam-session/components/waiting-room-info-card.tsx:26`
- Rules card: `kmaedu-fe/src/pages/exam-session/components/waiting-room-rules-card.tsx:20`
- Attempts card: `kmaedu-fe/src/pages/exam-session/components/waiting-room-attempts-card.tsx:31`
- Panel: `kmaedu-fe/src/pages/exam-session/components/waiting-room-panel.tsx:5`
- Footer: `kmaedu-fe/src/pages/exam-session/components/waiting-room-footer.tsx:15`
- Host view: `kmaedu-fe/src/pages/exam-session/components/host-waiting-room.tsx:28`
- Roster card: `kmaedu-fe/src/pages/exam-session/components/waiting-room-roster-card.tsx:22`
- Host hook: `kmaedu-fe/src/pages/exam-session/use-host-waiting-room.ts:16`
- View model: `kmaedu-fe/src/lib/exam-session/waiting-room-view.ts:47` (`fromStudentStats`), `kmaedu-fe/src/lib/exam-session/waiting-room-view.ts:65` (`fromHostSession`)
- Stats gate: `kmaedu-fe/src/lib/rbac/exam-stats-gate.ts:2`
- API: `kmaedu-fe/src/apis/examSessionApi.ts`, `kmaedu-fe/src/apis/examAttemptApi.ts`
- Auth store: `kmaedu-fe/src/stores/useAuthStore.ts`
- Student materials store: `kmaedu-fe/src/stores/useStudentMaterialsStore.ts`
- Route config: `kmaedu-fe/src/routes/index.tsx:145`
