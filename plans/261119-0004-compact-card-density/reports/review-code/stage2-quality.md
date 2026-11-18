# Code Review — pending changes in kmaedu-fe (HEAD d3c6ab9 .. working tree) · stage 2 quality

**Verdict:** REWORK — no P0/P1; one test gap, one lost capability and a few P3 items. Nothing blocks the merge.
**Score:** 8/10 · **Accepted:** P0 0 · P1 0 · P2 2 · P3 5 · **Rejected:** 0 · **Deferred:** 0 (adjudication is left to the main session)
**Scope:** 130 files (126 modified + 4 new), +678/−630 lines tracked (+~190 lines in new files) · stages: spec pass (see below) · quality done · adversarial not part of this stage

## P0 · Critical — must fix before merge
None.

## P1 · High — fix before merge
None.

## P2 · Medium — fix in this change or defer with an issue

### TEST-1 · Testing › Edge cases — `formatTimeAgo` tests miss every unit boundary
- **Where:** `src/pages/k/my-exams-types.test.ts:81-93` (code under test: `src/pages/k/my-exams-types.ts:115-118`)
- **Problem:** the table has one value per branch (40 s, 45 min, 5 h, 4 d) and a 12-day date. No case sits on or next to 1 min, 60 min, 24 h or 7 d.
- **Impact:** I copied the module and test to the scratchpad and applied three one-character mutations: `diffMins < 60` to `<= 60`, `diffHours < 24` to `<= 24`, `diffDays < 7` to `<= 7`. All three stay green (12/12 pass). An off-by-one at a boundary would ship (a card saying "60 phút trước" instead of "1 giờ trước", or "7 ngày trước" instead of a date). The same run showed the other tests bite: the `bestScore` truthiness mutant and the `Math.abs` removal are both caught. Also unlisted: a future date (clock skew) and an unparsable `lastAttemptAt` (gives the text "Invalid Date").
- **Fix:** add rows for 59 m 59 s / 60 m, 23 h 59 m / 24 h, 6 d 23 h / 7 d (exactly), plus a future date and an invalid string; use the table style already there. Compute the date-branch expectation from a literal for one fixed timezone-independent case, not from the same `toLocaleDateString` call the code uses (`my-exams-types.test.ts:92` mirrors production, policy 5.3).
- **Confidence:** confirmed (mutants run) · **Found by:** quality

### ARCH-1 · Architecture › Consistency — a room with an open attempt can no longer be pinned or unpinned
- **Where:** `src/pages/k/MyExamsPage.tsx:42` (split), `src/pages/k/components/continue-exam-card.tsx:38-47` (only "Tiếp tục" and "Lịch sử"), `src/pages/k/components/session-card.tsx:73-89` (the pin menu exists only on the other card)
- **Problem:** before, every room card had the pin toggle. `splitByProgress` now moves every `hasInProgress` room into the featured card, which has no menu and no pinned marker, and `handleTogglePin` is never reachable for it.
- **Impact:** a room pinned earlier and later reopened by the student shows no pin and cannot be unpinned until the attempt is finished; an in-progress room cannot be pinned at all. The pin state is kept in the backend, so it silently reappears afterwards. Frequency: every student with a pinned room and an open attempt.
- **Fix:** if the mock really leaves the menu out of the featured card, record it as a decision in the plan; otherwise give `ContinueExamCard` the same `CardMenu` (export it from `session-card.tsx`) and the pinned marker, passing `onTogglePin` from the page.
- **Confidence:** confirmed · **Found by:** quality (spec reading: the mock lists the menu only for "Các bài thi khác", so this may be as designed)

## P3 · Low — optional

### CODE-1 · Clean Code › DRY — a second `formatTimeAgo` that has drifted from the shared one
- **Where:** `src/pages/k/my-exams-types.ts:108-120`, versus `src/lib/history/history-format.ts:8-20` (already unit-tested; other copies: `src/components/atoms/k/RecentFileItem.tsx:18`, `src/pages/k/ExamHistoryPage.tsx:32`)
- **Problem:** the function was moved out of `session-card.tsx` and now has its own test, which cements the copy. The shared one guards invalid dates and future dates and has week/month/year steps; this one does not (invalid date gives "Invalid Date"; wording "Vừa xong" vs "vừa xong").
- **Impact:** the same "time ago" reads differently across /k pages; the copy lacks the guards. `lastAttemptAt` comes from `startedAt`, so an invalid value is unlikely today.
- **Fix:** reuse `@/lib/history/history-format` (agree the wording and the 7-day cutoff with the owner), delete the copy and its tests, or fold the extra tests into `history-format.test.ts`.
- **Confidence:** confirmed · **Found by:** quality

### CODE-2 · Clean Code › Magic numbers — skeleton constants repeat page constants
- **Where:** `src/pages/k/components/my-exams-sections.tsx:74` (`length: 4`, grid `@3xl:grid-cols-2`) vs `src/pages/k/MyExamsPage.tsx:19` (`PREVIEW_COUNT = 4`); `my-exams-sections.tsx:46` (`[116, 112, 150]` pill widths guessed from the text)
- **Problem:** the skeleton count and column breakpoint must match `PREVIEW_COUNT` and the real grid by hand.
- **Impact:** the layout shifts when someone changes one and not the other; harmless otherwise.
- **Fix:** export `PREVIEW_COUNT` from `my-exams-types.ts` (or a sections constant) and use it in the skeleton.
- **Confidence:** confirmed · **Found by:** quality

### ARCH-2 · Architecture › Consistency — "Xem tất cả" / "Thu gọn" interacts oddly with server pagination
- **Where:** `src/pages/k/MyExamsPage.tsx:32` (`expanded` starts from `currentPage > 1`), `:92-93`, `:128`, `:143`
- **Problem:** (a) on `?page=2`, pressing "Thu gọn" shows 4 cards, hides the pager, and the URL still says page 2; (b) with at most 4 "other" rooms but more than one page, the button reads "Xem tất cả" and only reveals the pager; (c) `expanded` is never reset when the user pages back to 1.
- **Impact:** confusing but recoverable (press again). No data is lost.
- **Fix:** derive `canExpand` from `others.length > PREVIEW_COUNT` only and show the pager whenever `totalPages > 1`; or hide "Thu gọn" while `currentPage > 1`.
- **Confidence:** confirmed (by reading) · **Found by:** quality

### ARCH-3 · Architecture › Consistency — three `size="lg"` props removed in a pass described as class-only
- **Where:** `src/pages/exam-session/ExamQuizPage.tsx:619` ("Xem tổng quan"), `:881` ("Nộp bài"), `src/templates/ExamRoomDetailTemplate.tsx:173` ("Bắt đầu làm bài")
- **Problem:** these are props, not classes. The plan's scale table lists "size=lg → default", but the task statement says no prop changes. The affected buttons are the main call to action on the exam screen and on the room entry card.
- **Impact:** antd `large` to `middle` takes the button from about 40 px to 32 px on the screen where students submit under time pressure and are often on tablets. No behaviour change.
- **Fix:** either keep `size="lg"` on these three primary actions (exempt them in the plan) or state the prop change as accepted in the plan.
- **Confidence:** confirmed · **Found by:** quality / spec

### ARCH-4 · Architecture › Coupling — the shared card lets a caller's `styles` prop undo the zero body padding
- **Where:** `src/components/antd/card.tsx:13-14`
- **Problem:** `styles={{ body: { padding: 0 } }}` comes before `{...props}`, so any caller that passes its own `styles` (for the header, say) replaces the whole object and the antd 24 px body padding returns.
- **Impact:** none today (`git grep "styles="` finds no Card caller); a trap for the next one.
- **Fix:** merge the caller's `styles` with the body override, or place the override after the spread.
- **Confidence:** speculative · **Found by:** quality

## Notes
- `session-card.tsx:45`, `:33-35`: the results turn green once an attempt is finished whatever the score (old `getScoreColor` gave green/amber/red by score), so a 0.0 shows green. The comment on line 29 says it is deliberate; confirm with the mock. A room with only an open attempt shows "—" for the score but "0%" for the rate (the 0 comes from `bestPercentage` in `my-exams-types.ts:38-46`, unchanged).
- Touch targets: `CardMenu` is 28 px (`session-card.tsx:77`), several `h-11`/`min-h-[44px]` controls moved to 40 px/44 px in `ai-tool/*` and `ExamSearchFilterBar.tsx:21`. Within WCAG 2.2 AA (24 px); below the 44 px AAA comfort size.
- `PageHeader` subtitle went from `text-base` to `text-sm` (`page-header.tsx:26`) although the plan lists reading text as untouched; one line, probably intended.
- No change touches input handling, auth, secrets, data exposure, dependencies (no `package.json` change) or SVG scripting (`exam-in-progress.svg` has no script or event attributes and is loaded through `<img>`).

## Coverage by dimension
| # | Dimension | Status | P0 | P1 | P2 | P3 |
|---|---|---|---|---|---|---|
| 1 | Security | checked — no input, auth, data or dependency change; `window.location.assign` URL built from server ids as before (`continue-exam-card.tsx:6-9`) | 0 | 0 | 0 | 0 |
| 2 | Performance & Optimization | checked — no queries; `useMemo` over grouping/split; per-card `formatTimeAgo` is O(1); chart default heights only | 0 | 0 | 0 | 0 |
| 3 | Clean Code & Readability | checked | 0 | 0 | 0 | 2 |
| 4 | Error Handling & Logging | checked — unchanged fetch/pin handlers (`MyExamsPage.tsx:45-87`) still toast and roll back the optimistic pin | 0 | 0 | 0 | 0 |
| 5 | Architecture & Design | checked | 0 | 0 | 1 | 3 |
| 6 | Testing & Maintainability | checked | 0 | 0 | 1 | 0 |

## Spec compliance
| # | Requirement | PASS / MISSING / EXTRA | Evidence |
|---|---|---|---|
| 1 | Header with 3 count pills (rooms / open / finished), skeleton while loading | PASS | `my-exams-sections.tsx:20-51`, `MyExamsPage.tsx:101`; `examOverview` tested |
| 2 | "Tiếp tục học" featured card for rooms with an open attempt | PASS | `continue-exam-card.tsx`, `MyExamsPage.tsx:112-121`; `splitByProgress` tested |
| 3 | 2-column "Các bài thi khác", history button | PASS | `MyExamsPage.tsx:130`, `session-card.tsx:119-122` |
| 4 | ··· menu with pin/unpin | PASS for "other" cards; featured card has none (ARCH-1) | `session-card.tsx:73-89,123` |
| 5 | Date, violations, attempt-count pill | PASS | `session-card.tsx:55-71,126-129` |
| 6 | Best score, attempts, best rate | PASS | `session-card.tsx:30-52` |
| 7 | "Xem tất cả" toggle with pagination | PASS with edge cases (ARCH-2) | `MyExamsPage.tsx:91-93,128,143` |
| 8 | Shrink the my-exams cards | PASS | `p-4`, `size-12`, `text-base` in `session-card.tsx:103-112` |
| 9 | Shared `antd/card.tsx`: body padding 0, parts pad themselves | PASS | `card.tsx:13-23`; the 43 consumers were walked: 33 edited in the diff, 10 not (`CategoryItem`, `ConversationItem`, `ExamMetricCard`, `NotificationItem`, `SystemCheckSection`, `UpcomingSessionCard`, `UserSearchInput`, `NotificationFilterSidebar`, `SettingsSidebar`, `youtube-sync-player`); none keeps double padding, none relies on the old 24 px body |
| 10 | Scale table applied to every page | PASS (spot-read all hunks; no invalid or conflicting class found) | diff |
| 11 | Class-only: no behaviour, data or prop change | EXTRA — three `size="lg"` props removed (ARCH-3); chart default heights (`StatChart.tsx:110`, `SourceBreakdownChart.tsx:71`) and the `ProgressCircle` viewBox (`ProgressCircle.tsx:19`) are default values or an attribute that keep the layout, callers `AdminOverviewPage.tsx:133` updated; `AdminStatsPage` uses the new default | diff |

## Edge cases turned up (scouting pass)
- `components/antd/card.tsx`: `CardHeader` has no bottom padding and `CardContent` has `p-5`, so a header followed by an unstyled content gets a 20 px gap. All callers that follow a header add `pt-3`/`pt-4`/`pt-0`, checked one by one. `ExamQuizPage.tsx:531,654,782` use plain `<CardContent>` with no header, so they now pad 20 px on all sides (was 24 px body + 24 px sides).
- Three `CardHeader className="px-4 pb-3"` (`CategoriesSidebar.tsx:20`, `PostsList.tsx:21`, `ConversationList.tsx:36`) keep the default `pt-5`, so the top gap (20 px) differs from the sides (16 px). Visual nit only; I could not view logged-in pages.
- Consumers outside the diff change look because the antd body padding is gone, and were not seen in a browser: `youtube-sync-player.tsx:181-216` (video and control bar now touch the card border instead of sitting 24 px inside), `NotificationItem.tsx:36-44` (16 px instead of 40 px), `CategoryItem.tsx:27`/`ConversationItem.tsx:27` (12 px instead of 36 px), `UserSearchInput.tsx:153` (result rows flush to the border). All look like intended results of the shared change.
- `ProgressCircle.tsx`: the new viewBox keeps the 80-unit drawing scaled to 64 px; the dash length 201 is unchanged and correct (2π·32). `value / total` with `total = 0` gives NaN as before (pre-existing, not changed here).
- `stableIndex` with the minimum int32 hash: `Math.abs` gives 2147483648, still a valid number for `%`; covered by the range test.
- `ExamsPagination` keeps its own `border-t` (`my-exams-pagination.tsx:26`), now floating under the grid instead of inside a section card.

## Testing-policy "After code" checklist for `my-exams-types.test.ts`
| Check | Result |
|---|---|
| Asserts meaningful contracts, would fail on listed bugs, shown against pre-change code or at most 3 fault injections | Partly. New file, no pre-change code, and no RED or injection record was given to me. I ran 5 mutations in the scratchpad (no repo file touched): 2 caught (`examOverview` truthiness, `stableIndex` `Math.abs`), 3 survived (all `formatTimeAgo` boundaries, TEST-1). `examOverview` and `splitByProgress` tests are strong (score 0 counted, order kept, empty input). |
| TDD evidence fits; no setup error called RED | Unproven: nothing recorded. Raised as part of TEST-1 at Medium; does not block. |
| Post-RED changes to assertions listed | Nothing recorded. |
| No sleeps, wall-clock, mocked internals, hollow passes | Clean. `now` is injected; no loop over an empty set (`stableIndex` list is non-empty; the 30-id set asserts a count). |
| No integration repeating a cheaper level | N/A, unit only; right level for pure logic. |
| Test scope reflects real dependencies | Gap: `groupBySession` (unchanged, `my-exams-types.ts:19-68`) feeds `bestScore`/`hasInProgress`, which every new function and the header pills depend on, and it has no test. Not a new-code defect; worth a later table-driven test. |
| Date-branch expectation | Mirrors production (`toLocaleDateString("vi-VN")` on both sides, line 92); depends on Node ICU having `vi`. |
| Recorded gate | `yarn test` 31 files / 218 tests exit 0 (recorded, not re-run by me). |

## Done well
- `my-exams-types.ts:85-106`: the new logic is pure, small and injectable (`now`), so it could be unit-tested without a DOM; `examOverview` counts a 0-score finish correctly and says so in a test (`my-exams-types.test.ts:34`).
- `session-card.tsx:41-48` and `continue-exam-card.tsx:18-35`: container queries (`@3xl`, `@5xl`) lay the card out by its own width, so it works beside the sidebar; `<dl>/<dt>/<dd>` markup, `aria-label` on the menu trigger, `aria-expanded` through `ViewAllButton`, decorative image `aria-hidden`.
- `MyExamsPage.tsx:70-87`: the optimistic pin with rollback and toast is untouched and still correct.
- `card.tsx:13-23`: the density fix is made once at the source, and every caller that had compensated (`-mt-8`, `!px-0`, `py-3`) was adjusted in the same change (`ChatHistoryCard.tsx:117`, `ExamQuizPage.tsx:569-575`, `SubjectSelector.tsx:217-224`).
- The skeleton and the loaded layout match in structure, so the page does not jump on load.

## Actions in order
1. TEST-1: add boundary, future-date and invalid-date rows to `my-exams-types.test.ts` (5 minutes; the mutants above are the checks).
2. ARCH-1: decide with the mock whether the featured card needs the pin menu; implement or record the decision in the plan.
3. CODE-1: reuse or merge with `lib/history/history-format.ts`, then delete the duplicate and its tests.
4. ARCH-3: decide on `size="lg"` for the three primary buttons.
5. ARCH-2, CODE-2, ARCH-4: small clean-ups, optional.

## Numbers
- `tsc --noEmit` exit 0; `eslint` on the 129 changed files exit 0 (0 errors, 13 warnings, none in the my-exams files that I saw); `yarn test` 31 files / 218 tests exit 0; `yarn build` exit 0. All as recorded by the implementer; I re-ran only the 5 mutants on `my-exams-types` in a scratch copy.
- Coverage: not measured (no run recorded). Test-to-code ratio for the new logic: 94 test lines for 38 new logic lines.

## Rejected and deferred
| ID | Title | Disposition | Reason or issue |
|---|---|---|---|
| – | – | – | Nothing rejected or deferred at this stage. |

## Not verified
- Anything visual on logged-in pages (/k/*, exam, study room, admin): no browser run was possible, so spacing, wrapping at narrow widths, and the container-query breakpoints at the real content width are judged from the class lists only.
- Container queries `@3xl`/`@5xl` assume Tailwind v4's default container scale (48 rem / 64 rem); the build passes but a missing variant would only show as a wrong layout.
- Re-run of the full suite, eslint and build (used the recorded results).
- The mock itself was not available to me; the spec items come from the task text and the plan.
