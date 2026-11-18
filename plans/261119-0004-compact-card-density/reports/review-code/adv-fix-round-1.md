# Adversarial re-review: fix round 1 (compact-card-density, kmaedu-fe)

Scope: the hunks in `fix-round-1.md`, checked against the "Chấp nhận" table in `adjudication.md` and the original findings.
Evidence run: `TZ=<zone> npx vitest run src/pages/k/my-exams-types.test.ts` under UTC, Asia/Ho_Chi_Minh, America/Los_Angeles, Pacific/Kiritimati (read-only run, nothing written in the repo). `toast` from `useToast()` is a module constant and the store actions are stable, so `fetchExams`'s useCallback deps do not loop; checked.

## Per accepted finding

| ID | Verdict | Note |
|---|---|---|
| AL-1 = ARCH-1 (pin on ContinueExamCard) | Resolved | `onTogglePin` passed, marker in title, `CardMenu` after "Lịch sử"; `cn`/twMerge makes `!h-[34px]` win over `!h-7`/`!h-8`; 34px matches `controlHeight: 34` in AppProviders. The stale cache after pin is in R4 (pre-existing). |
| AL-2 (pills wrong on multi-page) | Partly resolved | Pills hidden when `totalPages > 1`, correct for the header. Per-card `attemptCount` / `bestScore` for a room that straddles a page boundary are still partial (R5). |
| LY-1 (ViolationsCard) | Resolved | `git diff HEAD` on `session-analytics-sections.tsx` now only shows `ScoreDistributionCard` `h-64 → h-52`; ViolationsCard is back at HEAD `h-64`. |
| LY-2 (flashcard flip card) | Resolved | Room for the answer on the back face (min-h minus border, padding, ~98px chrome): phone 320-2-48-98 = 172px (HEAD 160), `sm` 380-2-64-98 = 216px (HEAD 188); lines are also wider because of the smaller padding. Structural weakness (back face is `absolute inset-0`, height decided by the front face only) is unchanged from HEAD, so a long answer on a short question still overflows, only later than before. |
| AL-6 = TEST-1 = CODE-1 (`formatAttemptTime`) | Partly resolved | Logic correct (NaN guard, future clamp, exactly 7 days → date; shared formatter reused; boundaries tested and I could not find a plausible mutation of `WEEK_MS`/`>=`/guard the tests miss). But two test cases depend on the runner timezone (R1). |
| AL-3 = ARCH-2 (expanded vs URL) | Mostly resolved | (a) and (b) fixed. (c) `canExpand` is still true from `totalPages > 1` when `others.length <= 4`, so "Xem tất cả" reveals only the pager (R3). (d) continuing section uncapped, untouched. |
| AL-5 (fetch failure) | Mostly resolved | Error state, retry, log, pills hidden. The "another page's data under this page number" invariant is only kept on the error path (R2); empty out-of-range page still shows 0/0/0 pills (R6). |
| LY-3 (flashcard-result-preview) | Resolved | Face 280 - 2 border - 48 padding = 230; label ~28 + 2x`gap-3` 24 + hint ~20 + content 144 = ~216, slack ~14px (was ~0). The text scroll area is now 144px vs 192px at HEAD (R7, trade-off). |
| LY-4 (study-room skeleton) | Resolved | `h-40` (160px) sits inside the real card's ~157-177px range. HEAD was `h-44`. |
| LY-7 (landing) | Resolved | `FeatureShowcase.tsx` has no diff against HEAD; ProductShowcase step rows/number/h3 and TestimonialsSection quote have no diff in those lines; `MetricsSection` counter `text-5xl lg:text-7xl` (one step each from `text-6xl lg:text-8xl`) in a 2-column grid, no overflow risk. Other, out-of-scope padding changes in those files remain from the first round. |
| LY-8 (AboutSection gap) | Resolved | `grid gap-8 md:grid-cols-3` restored. |

## Findings

### R1
SEVERITY: Medium (test reliability)
CATEGORY: Assumption
LOCATION: src/pages/k/my-exams-types.test.ts:97-100 (`formatAttemptTime` "exactly a week back")
ATTACK: Run `yarn test` on a machine whose timezone is not UTC+/-near Vietnam. `formatAttemptTime` formats in the runner's zone and the test hard-codes the expected string for UTC instants. Reproduced: TZ=America/Los_Angeles gives `5/11/2026` instead of `6/11/2026` (instant 2026-11-06T05:00Z); TZ=Pacific/Kiritimati gives `12/11/2026` instead of `11/11/2026`. UTC and Asia/Ho_Chi_Minh pass. vitest.config.ts does not pin TZ.
IMPACT: Test is green in CI (UTC) and red on a developer laptop in the Americas or the Pacific, so a developer is pushed to "fix" the test or ignore it. The adjudication deliberately rejected pinning the production formatter to Asia/Ho_Chi_Minh (view-zone display is intended), so the tests have to carry the zone themselves.
FIX: Make the date-branch assertions zone-independent (build the expected string with the same local-calendar path from a local-time `Date`, or choose instants at local midday for every zone and assert on the zone-neutral parts), or pin TZ for the test run in the vitest config; keep one assertion that only checks the >= 7 day branch is taken.

### R2
SEVERITY: Low
CATEGORY: Race
LOCATION: src/pages/k/MyExamsPage.tsx:46-64 (`fetchExams`) and :70-73 (`useEffect`)
ATTACK: The new comment "Never leave another page's rooms under this page number" is only enforced in the catch. The success path has no staleness guard: start `?page=2` (slow), go back to `?page=1` (cached, resolves at once), then the page-2 response lands and overwrites `examAttempts`/`total` under `currentPage` 1. The same applies to a retry that resolves after a page switch (browser back/forward or an in-app link; the pager is hidden while loading, history navigation is not).
IMPACT: Rooms of page 2 under page 1's URL/pager state, and wrong `total` (wrong `showOverview`). Pre-existing, but the fix claims the invariant and still can violate it.
FIX: Ignore a result whose page is no longer the current page (effect-cleanup flag or request counter), for both success and failure.

### R3
SEVERITY: Low
CATEGORY: Assumption
LOCATION: src/pages/k/MyExamsPage.tsx:107-110 (`canExpand`), :141-143 (collapse); direct-link case at :32-34
ATTACK: (a) 50 attempts spread over 3 rooms, `totalPages > 1`: `others.length <= 4` but `canExpand` is true, so "Xem tất cả" reveals no cards, only the pager. (b) Open `/k/my-exams?page=2`, press the pager "1": `expandedByUser` is still false, `currentPage` is 1, so the list collapses to 4 cards with the pager hidden again, and the user has to press "Xem tất cả" to reach page 2 again. (c) Collapse from page 2 does `setSearchParams({})` but does not scroll up, so the user lands mid-page.
IMPACT: Confusing label and an extra click; no data loss.
FIX: Show the pager whenever `totalPages > 1` (decouple it from `expanded`) or drop the `totalPages > 1` term from `canExpand`; set the user-expanded flag when the pager is used.

### R4
SEVERITY: Low
CATEGORY: Data
LOCATION: src/pages/k/MyExamsPage.tsx:76-92 (`handleTogglePin`); src/stores/useStudentMaterialsStore.ts:63-84 (`examsCache`)
ATTACK: Pin a room (optimistic local state, server updated), go to page 2, return to page 1 (or press "Thu gọn" on page 2): `fetchExams` serves the cached page, which still has the old `isPinned`. Nothing calls `invalidateExams` or patches the cache on pin.
IMPACT: Pin marker and pinned-first order revert in the UI although the server has it pinned; clicking again then un-pins on the server. Pre-existing (AL-8 rejected as not in this diff), but the new pin marker on the Continue card, retry and collapse-to-page-1 make it reachable more often.
FIX: Patch or invalidate the cached pages on a successful pin toggle (the store already has `updateFlashcardPin` as a pattern).

### R5
SEVERITY: Low
CATEGORY: Data
LOCATION: src/pages/k/MyExamsPage.tsx:111 (`showOverview`); src/pages/k/my-exams-types.ts `groupBySession`
ATTACK: Account with more than 50 attempts: the pills are hidden, but each card still shows `attemptCount`, `bestScore`, `bestPercentage` computed from the loaded page only, and a room whose attempts straddle a page boundary appears on two pages with different numbers.
IMPACT: Half of AL-2 (card numbers) is unchanged; looks authoritative.
FIX: Server-side grouping/aggregation, or label card stats as per page; at minimum record it as a known limit.

### R6
SEVERITY: Low
CATEGORY: Failure
LOCATION: src/pages/k/MyExamsPage.tsx:121-128, :111
ATTACK: `?page=N` beyond the last page (stale bookmark, rows deleted) where the API answers 200 with an empty list: `failed` is false, `sessions` empty, `total` > 0 and `totalPages <= 1` or not; the empty state "Chưa có bài thi nào" shows with pills 0/0/0 (when `totalPages <= 1`) and no pager (the pager lives only in the non-empty branch). Likewise `?page=-1` fails the request every time and retry repeats the same page.
IMPACT: Misleading empty state for an account that has exams; no in-page way back.
FIX: In the empty branch, when `total > 0` or `currentPage > 1`, offer a link/button to page 1 (or clamp the page), and hide pills there.

### R7
SEVERITY: Low
CATEGORY: Failure (content visibility)
LOCATION: src/components/organisms/k/ai-tool/flashcard-result-preview.tsx:21
ATTACK: Generated card whose answer is longer than ~5 lines at `md`.
IMPACT: `max-h-36` (144px) is a 25% smaller reading area than HEAD's `max-h-48` (192px); long answers scroll sooner inside a face that also lost 60px of height (340 → 280). No overflow now, but the preview shows less of what the user is asked to review.
FIX: Accept as a trade-off, or give the face back some height (e.g. 300px) and use `max-h-40`.

### R8
SEVERITY: Low
CATEGORY: Observability / testing
LOCATION: src/pages/k/MyExamsPage.tsx:36-37, 98-111; vitest `include: src/**/*.test.ts` (node env)
ATTACK: The fixes for AL-2, AL-3 and AL-5 (`showOverview`, `expanded`/`toggleExpanded`, `failed`) live inline in the component; nothing tests them. Flipping `totalPages <= 1` to `< 1`, dropping `currentPage > 1` from `expanded`, or removing `setFailed(true)` passes all 223 tests and tsc.
IMPACT: The three accepted behaviour fixes can regress silently.
FIX: Extract the derivations into pure functions in `my-exams-types.ts` (overview visible, expanded state, can-expand, next URL on collapse) and test the boundaries (totalPages 0/1/2, page 1/2, failed).

### R9
SEVERITY: Low
CATEGORY: Data (display)
LOCATION: src/pages/k/components/session-card.tsx ExamMeta (calendar icon + `formatAttemptTime(...)`)
ATTACK: An unreadable `startedAt` now returns "" (intended by the fix), but the calendar icon is still rendered next to nothing. Also the label changed from "Vừa xong" to lower-case "vừa xong" (shared formatter).
IMPACT: Cosmetic: orphan icon; inconsistent capitalisation versus the rest of the meta row only if a reviewer cares.
FIX: Render the date span only when the string is non-empty.

## Cleared (looked for, not found)
- No render/effect loop: `fetchExams` identity is stable; `failed` is reset at the start of each fetch; retry cannot double-fire (skeleton replaces the button while loading).
- Pin while failed is impossible (no cards); the rollback path is unchanged.
- `toggleExpanded` state transitions from page 1/2 with `expandedByUser` true/false all end in the intended state (collapse from page 2 clears the URL and sets the flag false).
- `formatAttemptTime` boundaries (30s, 1m, 59m, 60m, 23h59m, 24h, 6d23h59m, exactly 7d, future, NaN) correct; tests would fail on `>=` → `>` or a wrong `WEEK_MS`.
- Landing reverts match HEAD; no supply-chain change.
