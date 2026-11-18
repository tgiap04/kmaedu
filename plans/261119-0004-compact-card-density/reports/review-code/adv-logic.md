# Adversarial logic review: compact-card-density (kmaedu-fe)

Scope: MyExamsPage, my-exams-types(.test), session-card, continue-exam-card, my-exams-sections, exam-in-progress.svg, shared Card/PageHeader/StatCard/HistoryStatCard/ProgressCircle/admin charts.
Checked and clean: package.json and yarn.lock unchanged (no supply-chain change); SVG has no script or external refs; all 43 Card consumers read (no consumer passes `styles`, and the unmodified ones keep their own padding); chart callers (AdminOverviewPage passes height=220, others use defaults); ProgressCircle viewBox 80 matches r=32/cx=40 and the 201 dasharray; Phosphor icon names all exist.

## AL-1  Medium  Assumption (feature regression)
LOCATION: src/pages/k/components/continue-exam-card.tsx:20-52; src/pages/k/MyExamsPage.tsx:117-124
ATTACK: Pin a room (or have one already pinned), then start an attempt in it so it has status 0. The room moves to "Tiep tuc hoc" and renders as ContinueExamCard.
IMPACT: ContinueExamCard takes no `onTogglePin` and has no pin menu or pinned marker. A room with an open attempt can no longer be pinned or unpinned, and a pinned one gives no cue. Pinned-first ordering inside the section is invisible. The only pin entry point is SessionCard's CardMenu.
FIX: Give ContinueExamCard the same pin action (menu or button) and pinned marker as SessionCard, and pass `handleTogglePin` through. Otherwise say explicitly that pinning does not apply to in-progress rooms.

## AL-2  Medium  Data
LOCATION: src/pages/k/MyExamsPage.tsx:39-43, 101; src/pages/k/my-exams-types.ts examOverview
ATTACK: A user with more than 50 attempts (PAGE_SIZE counts attempts, not rooms), or a room whose attempts straddle a page boundary.
IMPACT: The header pills "N phong thi / dang lam / da hoan thanh" are computed only from the current page's 50 attempts, but read as account totals. They change when paging. Per-card `attemptCount` and `bestScore` are also partial for a room split across pages, and the same room can appear on two pages with different numbers. The old small "N phong thi" chip had the same flaw, but the pills now sit in the page header and look authoritative.
FIX: Compute the pills from a server-side count, or label them as per-page ("trong trang nay"), or hide them when `totalPages > 1`. Group by room on the server or fetch by room instead of by attempt.

## AL-3  Low  Assumption (state vs URL)
LOCATION: src/pages/k/MyExamsPage.tsx:32, 94-95, 140-143
ATTACK: (a) `expanded` is initialised once from `currentPage > 1` and never re-synced with the URL. On page 1, click back/forward or an in-app link to `?page=2`: `expanded` stays false and the page shows 4 cards with no pagination. (b) On page 2 or later, press "Thu gon": pagination disappears and the user is stuck on a page of 4 cards. (c) `canExpand` is true when `others.length <= 4` but `totalPages > 1`: "Xem tat ca" then reveals no extra cards, only the pager. (d) The "Tiep tuc hoc" list is neither previewed nor capped and can hold up to 50 cards.
IMPACT: Inconsistent navigation, confusing "Xem tat ca" label, long page.
FIX: Derive `expanded` from the URL (`page > 1`) or always render the pager when `totalPages > 1`. Keep the preview slice independent of paging. Cap or collapse the continuing section.

## AL-4  Low  Data
LOCATION: src/pages/k/components/session-card.tsx ExamStats (finished / good logic)
ATTACK: bestScore 0.0 or 12.0 on a finished attempt. A session with only in-progress or cancelled attempts.
IMPACT: The removed `getScoreColor` graded the score (red below 50, amber below 80). Now any finished score, including 0.0 and 0%, renders green "text-success", so a failing result looks like a pass. An unfinished room shows "—" for the score but "0%" for best rate, which is inconsistent.
FIX: Restore tone by score, or neutral ink for all values. Render "—" for the rate when `bestScore === null`.

## AL-5  Low  Failure / Observability
LOCATION: src/pages/k/MyExamsPage.tsx:46-58, 101
ATTACK: /student/recent-exam-attempts fails on first load, or on a page change.
IMPACT: First load: the empty state "Chua co bai thi nao" shows with pills "0 phong thi, 0 dang lam, 0 da hoan thanh", which is wrong (an error, not an empty account). On a later page change: the old page's data stays under the new page number and pager highlight. The `catch {}` drops the error with no log and no error state or retry.
FIX: Keep an `error` state with a retry in place of the empty state, hide the pills when there is an error, and log the caught error.

## AL-6  Low  Assumption (time)
LOCATION: src/pages/k/my-exams-types.ts formatTimeAgo; src/pages/k/my-exams-types.test.ts
ATTACK: A user outside Asia/Ho_Chi_Minh, or an unparsable `startedAt`.
IMPACT: `toLocaleDateString("vi-VN")` has no `timeZone`, so the date follows the browser zone. An invalid date falls through every `<` check (NaN) and prints "Invalid Date". The >=7-day test asserts against the same function (tautology). No boundary cases (59/60 min, 23/24 h, 6/7 d).
FIX: Pass `timeZone: "Asia/Ho_Chi_Minh"` and guard NaN. Add boundary tests with fixed expected strings.

## AL-7  Low  Security (hygiene, no exploit found)
LOCATION: src/pages/k/components/continue-exam-card.tsx:6-9, 46
ATTACK: `examSessionId` or `inProgressAttemptId` containing `?`, `#`, `&` or `/`.
IMPACT: Interpolated without encoding into the path and query before `window.location.assign`. The "/exam-session/" prefix rules out an open redirect or `javascript:` URL, and the ids are server-issued, so exploitation is not realistic. A malformed id would just change the route or query.
FIX: Use `encodeURIComponent` on both ids.

## AL-8  Low  Race
LOCATION: src/pages/k/MyExamsPage.tsx:65-85 (handleTogglePin)
ATTACK: Toggle the pin, then change page before the request returns, with the request failing. Or leave the page and come back within the session.
IMPACT: The rollback maps over whatever `examAttempts` is current by room id, so it can flip `isPinned` on another page's data for the same room. The toggle endpoint is a flip, not a set, so a timed-out request that did apply leaves the UI inverted. `examsCache` is never updated (unlike `updateFlashcardPin` for flashcards), so a cached page shows the old pin on revisit. Mostly pre-existing, now behind a menu.
FIX: Write the new pin state into `examsCache` (an exam analogue of `updateFlashcardPin`), ignore a rollback when the page has changed, and refetch after a failure.
