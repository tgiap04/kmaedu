# SCR032: ExamQuizPage — Screen Spec

**Screen**: SCR032: ExamQuizPage
**Type**: atomic
**Route**: `/exam-session/:id/quiz`
**Generated**: 2026-06-06
**Updated**: 2026-11-20 — quiz UI moved to `components/organisms/quiz/*`, keyboard shortcuts from `quiz-keys.ts`, server deadline, anti-cheat and leave rules, result/review flow, corrected endpoints

---

## Purpose

A student takes an active exam inside this page. The page starts or resumes an attempt, loads the questions (plaintext over TLS, each with a per-question JWT), renders a segmented progress bar, a question card and a question navigator with a countdown, auto-saves progress (debounced), detects cheating behaviors when the session enables anti-cheat, and submits answers on completion or at the server deadline.

---

## Screen Layout

Three-region layout: a sticky top bar (R1) with question counter, answered count and clock, a main area (R2) with a segmented progress bar, the question card and a side navigator (R3), and a sticky footer (R4) with prev/next navigation. After submission, the result card replaces the quiz layout, with an optional per-question review view. — source: `ExamQuizPage.tsx:516–631`

### Layout Sketch

```
┌─────────────────────────────────────────────────────────┐
│ R1: QuizHeader (sticky-top, z-20)                        │
│   back | title + "KMAEdu · Câu N / M" | answered | timer │
├─────────────────────────────────────────────────────────┤
│ R2a: QuizProgressSegments (one segment per question)     │
├─────────────────────────────────┬───────────────────────┤
│ R2b: QuizQuestionCard           │ R3: QuizNavigatorCard │
│   chips + "Đánh dấu" button     │   - progress ring     │
│   option cards (radiogroup)     │   - question grid     │
│   keyboard hint (md+)           │   - legend counts     │
│                                │   - warning (≤5min)    │
│                                │   - "Nộp bài" button   │
├─────────────────────────────────┴───────────────────────┤
│ R4: QuizFooter (sticky-bottom, z-20)                     │
│   Câu trước | N / M | Câu sau (last question: Nộp bài)   │
└─────────────────────────────────────────────────────────┘
```

**Result View (post-submit):**

```
┌─────────────────────────────────────────────────────────┐
│ R5: QuizResultCard (centered, max-w-[1008px])            │
│   pass/fail icon + title + score ring + 4-stat grid      │
│   + correct/wrong bar + action buttons                  │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│ R6: QuizReviewView (shown when "Xem chi tiết" taken)     │
│   top bar + result segments + review question card       │
│   + review navigator + footer (last: "Xem tổng quan")    │
└─────────────────────────────────────────────────────────┘
```

### Layout Regions

| Region ID | Name | Position | Scrollable | Key Components | Responsive Behavior |
|----------|------|----------|-----------|----------------|---------------------|
| R1 | Quiz Header | sticky-top | no | `QuizHeader` over `QuizTopBar`: back button, title, answered pill (md+), `role="timer"` clock | always visible; answered pill hidden below `md` |
| R2 | Main Content | static | yes | `QuizProgressSegments`, `QuizQuestionCard` (`QuizOptionCard` radios, mark-for-review button, shortcut hint) | fluid; grid `lg:grid-cols-[minmax(0,1fr)_360px]`, `xl` 420px |
| R3 | Question Navigator | static | grid scrolls (`max-h-[340px]`) | `QuizNavigatorCard`: progress ring, question grid, legend, time warning, submit button | below the question card under `lg` |
| R4 | Footer Nav | sticky-bottom | no | `QuizFooter`: prev/next buttons, position label | always visible |
| R5 | Result Card | static | yes | `QuizResultCard`: icon, title, score ring, 4-stat grid, action buttons | centered, `max-w-[1008px]` |
| R6 | Review View | static | yes | `QuizReviewView`: `QuizReviewQuestionCard`, `QuizReviewNavigatorCard`, `QuizProgressSegments` (results), `QuizFooter` | shown only in review mode |

---

## User Flow

### Happy Path (new attempt)

1. User lands on `/exam-session/:id/quiz` — auth check runs first (`ExamQuizPage.tsx:93`)
2. Page shows `QuizStatusScreen` "Đang tải bài thi" (`ExamQuizPage.tsx:504`)
3. `startExamAttemptApi` creates or resumes the attempt; `fetchAndDecryptSecureQuiz` loads the questions (`ExamQuizPage.tsx:258`, `ExamQuizPage.tsx:265`)
4. Timer starts, question 1 renders with its options as radio cards
5. User clicks an option or presses its letter (A–D…) → `handleAnswerSelect` updates `answers`, the card turns selected and its progress segment fills; picking the selected option again takes the answer back
6. User clicks "Đánh dấu" → `handleMarkForReview` toggles the flag (`aria-pressed`), the navigator cell shows a flag
7. User clicks "Câu sau", presses → / ←, clicks a progress segment or a navigator cell → `currentQuestionIndex` changes
8. On the last question the footer's right button becomes "Nộp bài"; with unanswered questions it opens the confirm dialog, with all answered it submits directly (`ExamQuizPage.tsx:627`). The navigator's "Nộp bài" always opens the confirm dialog
9. Confirm dialog: "Bạn mới trả lời N/M câu hỏi. Bạn có chắc muốn nộp bài?" (`ExamQuizPage.tsx:551`)
10. User confirms → `doSubmit` calls `saveProgress` then `submitSecureQuiz`, `QuizResultCard` renders (`ExamQuizPage.tsx:440`)
11. User clicks "Xem chi tiết" (only when the result carries answers) → `showDetailedResults=true`, `QuizReviewView` renders with question 1

### Branches

| Decision point | Condition | Outcome on this screen | Source |
|---------------|-----------|------------------------|--------|
| `view=result` in URL | `searchParams.get("view") === "result"` with `attemptId` | No attempt is started: `getExamAttemptDetailApi` fills the result card from the server's `score` / `correctAnswers`; "Xem chi tiết" shown only if the detail returns answers | `ExamQuizPage.tsx:205`, `ExamQuizPage.tsx:209` |
| resume attempt | `startResult.isResume && Object.keys(savedAnswers).length > 0` | Toast "Tiếp tục làm bài" + answers restored | `ExamQuizPage.tsx:283` |
| already submitted | `secureQuizData.status === 1` | Result card renders with zeroed stats (no answers) | `ExamQuizPage.tsx:298` |
| session forbids leaving | `allowLeaveMidway === false` | Warning toast on load; leaving the page asks "Rời phòng thi?" and hands the attempt in | `ExamQuizPage.tsx:294`, `ExamQuizPage.tsx:561` |
| time ≤ 30s remaining | `remainingSeconds <= 30 && remainingSeconds > 0` | Toast "Sắp hết thời gian!" | `ExamQuizPage.tsx:354` |
| time ≤ 60s remaining | `remaining <= 60` | Header clock pulses | `quiz-header.tsx:19` |
| time = 0 | `remainingSeconds <= 0` | `handleAutoSubmit` fires without a confirm dialog; on failure the retry loop stops and an error toast shows | `ExamQuizPage.tsx:363` |
| tab switch detected | `visibilitychange` → `document.hidden` (anti-cheat on) | `CheatingWarningModal` appears, violation logged | `useCheatingDetection.ts:143` |
| first question | `currentQuestionIndex === 0` | "Câu trước" button disabled | `quiz-footer.tsx:24` |
| last question | `current >= total - 1` | "Câu sau" replaced by "Nộp bài" | `quiz-footer.tsx:31` |
| access denied on start | `startExamAttemptApi` returns 403 | Error toast and redirect to `/exam-session/:id` (access code gate) | `ExamQuizPage.tsx:318` |
| no questions | `totalQuestions === 0` | `QuizStatusScreen` "Không có câu hỏi" + "Về phòng thi" / "Bài thi của tôi" | `ExamQuizPage.tsx:512` |
| other API error | start / secure-quiz throws (not 403) | `QuizStatusScreen` "Không thể vào bài thi" + same two buttons | `ExamQuizPage.tsx:323`, `ExamQuizPage.tsx:508` |

---

## Data Inventory

| Field | Display Label | Source | Format | Empty Behavior | Cross-ref |
|-------|---------------|--------|--------|----------------|-----------|
| `currentQuestion.question` | Câu hỏi | `getSecureQuizApi` question (plaintext) | StandardMarkdownRenderer | — | MODEL-009.question |
| `currentQuestion.options[]` | Các lựa chọn | `getSecureQuizApi` options | `QuizOptionCard` radio list, letters A, B, C… | — | MODEL-009.options |
| `answers[currentQuestion.id]` | Đáp án đã chọn | client state | option letter "A"–"Z" | "" (unanswered or taken back) | MODEL-019.answers |
| `markedForReview` | Câu đánh dấu | client state | Set of question IDs | empty Set | N/A |
| `currentQuestionIndex` | Số thứ tự | client state | "Câu N / M" | 0-indexed | N/A |
| `answeredCount` | Đã trả lời | computed from non-empty `answers` | integer | 0 | N/A |
| `timeSpentSeconds` | Thời gian đã làm | client state (timer tick) | `M:SS` or `H:MM:SS` | 0 | MODEL-019.timeSpentSeconds |
| `deadline` | Hạn nộp bài | `secureQuizData.deadline` | ISO string; falls back to `timeLimitMinutes` | null (no limit; elapsed time shows) | MODEL-018.durationMinutes |
| `remainingTime` | Thời gian còn lại | computed `secondsLeft()` | seconds, clamped at 0 | null (no limit) | MODEL-018.durationMinutes |
| `antiCheatEnabled` | (hidden) | `secureQuizData.antiCheatEnabled` | boolean, default true | true | MODEL-018 |
| `allowLeaveMidway` | (hidden) | `secureQuizData.allowLeaveMidway` | boolean, default true | true | MODEL-018 |
| `resultData.score` | Điểm | server (`submitSecureQuiz` or attempt detail) | number | 0 | MODEL-019.score |
| `resultData.correctAnswers` | Số câu đúng | server | integer | 0 | MODEL-019.correctAnswers |
| `resultData.percentage` | Tỷ lệ % | server on submit; `round(score*10)/10` in `view=result` | number | 0 | MODEL-019.score |
| `resultData.passed` | Kết quả | server on submit; `score >= passingScore` in `view=result` | boolean | false | MODEL-019.score |
| `resultData.passingScore` | Điểm đạt | server | integer | 0 | MODEL-018.passingScore |
| `resultData.violationCount` | Số vi phạm | client `totalViolations` on submit; server detail in `view=result` | integer | 0 | MODEL-019.violationCount |
| `resultData.showAnswers` | (gates "Xem chi tiết") | server on submit; any `answer` present in `view=result` | boolean | false | MODEL-018 |
| `resultData.questions` | Chi tiết câu hỏi | server, only when it returns answers | Question[] for review | undefined | MODEL-009 |
| `reviewQuestion.userAnswer` | Đáp án của bạn | server | option letter | null (skipped) | MODEL-019.answers |
| `reviewQuestion.answer` | Đáp án đúng | server | letter, index or option text (resolved to a letter by `reviewOutcome`) | none: nothing counts as correct | MODEL-009.answer |

---

## UI States

| State | Trigger | Visual Behavior | User Action Available | Source |
|-------|---------|----------------|-----------------------|--------|
| authChecking | `initializing || !isAuthenticated` | `QuizStatusScreen` loading "Đang kiểm tra đăng nhập" | none | `ExamQuizPage.tsx:500` |
| loading | start / secure-quiz in-flight | `QuizStatusScreen` loading "Đang tải bài thi" | none | `ExamQuizPage.tsx:504` |
| error | API throws during init (not 403) | `QuizStatusScreen` error "Không thể vào bài thi" + message | "Về phòng thi" / "Bài thi của tôi" | `ExamQuizPage.tsx:508` |
| noQuestions | `totalQuestions === 0` after load | `QuizStatusScreen` empty "Không có câu hỏi" | "Về phòng thi" / "Bài thi của tôi" | `ExamQuizPage.tsx:512` |
| quiz | normal quiz mode | header + segments + question card + navigator + footer | all interactions | `ExamQuizPage.tsx:549` |
| cheatingWarning | `useCheatingDetection` detects violation | `CheatingWarningModal` overlay | dismiss | `ExamQuizPage.tsx:574` |
| submitConfirm | user clicks "Nộp bài" | `ConfirmDialog` with answer count | "Nộp bài" / "Tiếp tục làm" | `ExamQuizPage.tsx:551` |
| leaveConfirm | in-app navigation while `allowLeaveMidway` is off | `ConfirmDialog` "Rời phòng thi?" | "Nộp bài và rời đi" / "Ở lại làm tiếp" | `ExamQuizPage.tsx:561` |
| submitting | `doSubmit` in-flight | repeated submits ignored; keyboard shortcuts off | none | `ExamQuizPage.tsx:440` |
| result | submission complete or `view=result` | `QuizResultCard` (pass: "Chúc mừng!", fail: "Chưa đạt") | "Xem chi tiết" (when answers present) / "Làm lại" / "Thoát" | `ExamQuizPage.tsx:532` |
| reviewMode | user clicks "Xem chi tiết" | `QuizReviewView`: per-question verdict, right option green, wrong pick red | prev/next, segment or grid jump, "Xem tổng quan" | `ExamQuizPage.tsx:521` |

---

## Validation & Error Feedback

### A) Client-side

| Field | Type | Required | Constraints | Async Check | Error Message |
|-------|------|----------|-------------|-------------|---------------|
| accessCode (SCR031) | OTP | yes | exactly 6 digits | N/A (handled on SCR031; the verified code is read from `sessionStorage` and sent with start) | N/A |
| N/A | — | — | — | — | No client-side form validation on this screen |

### B) Server-side

#### Start exam attempt
- **Endpoint:** `POST /api/v1/examattempts/start`
- **Request:** `{ examSessionId: string, accessCode?: string }`
- **Success:** attempt created or resumed (`isResume`)
- **Errors:** `403` → toast + redirect to `/exam-session/:id` | other → error screen + toast
- **Trigger:** page load `useEffect`
- **Source:** `ExamQuizPage.tsx:258`, `examAttemptApi.ts:85`

#### Fetch secure quiz
- **Endpoint:** `GET /api/v1/examattempts/:id/secure-quiz`
- **Request:** attempt ID from the start response
- **Success:** `200` → plaintext questions with per-question tokens, saved answers, `deadline`, `antiCheatEnabled`, `allowLeaveMidway`
- **Errors:** error screen
- **Trigger:** page load after `startExamAttemptApi`
- **Source:** `ExamQuizPage.tsx:265` via `fetchAndDecryptSecureQuiz`, `examAttemptApi.ts:352`

#### Fetch attempt detail (`view=result`)
- **Endpoint:** `GET /api/v1/examattempts/:id/detail`
- **Success:** `200` → score, correct count, passing score, violation count, questions (with `answer` only when the session shows answers)
- **Trigger:** page load with `view=result&attemptId=...`
- **Source:** `ExamQuizPage.tsx:213`, `examAttemptApi.ts:223`

#### Save progress (auto-save)
- **Endpoint:** `PUT /api/v1/examattempts/:id/progress`
- **Request:** `{ answers: Record<string,string>, currentIndex: number, markedQuestions: string[] }`
- **Success:** `200` → silently saved
- **Errors:** silently caught, no user-visible error; past the deadline the server answers 409 and the saved answers stand
- **Trigger:** debounced (1s) after answer change or question navigation
- **Source:** `ExamQuizPage.tsx:102`, `examAttemptApi.ts:99`

#### Submit quiz
- **Endpoint:** `POST /api/v1/examattempts/:id/secure-submit`
- **Request:** `{ answers: SecureAnswer[] }` (JWT token-wrapped answers)
- **Success:** `200` → result card renders with the server's score, percentage, pass/fail, and answers only if `showAnswers`
- **Errors:** toast with the server message or "Nộp bài thất bại"; at auto-submit past the deadline a `400` falls back to `POST /examattempts/:id/submit`
- **Trigger:** "Nộp bài" confirm or auto-submit at the deadline
- **Source:** `ExamQuizPage.tsx:447`, `ExamQuizPage.tsx:147`, `examAttemptApi.ts:363`

#### Leave and hand in
- **Endpoint:** `POST /api/v1/examattempts/:id/leave`
- **Request:** latest progress (`answers`, `currentIndex`, `markedQuestions`)
- **Trigger:** confirm in the "Rời phòng thi?" dialog, or `pagehide` (keepalive) when `allowLeaveMidway` is off
- **Source:** `use-leave-hand-in.ts:42`, `examAttemptApi.ts:115`

#### Log cheating violation
- **Endpoint:** `POST /api/v1/cheatinglogs`
- **Request:** `{ examAttemptId: string, type: CHEATING_TYPE }`
- **Success:** warning modal shown
- **Errors:** logged to console, no user-visible error
- **Trigger:** browser event (tab switch, blur, devtools, copy/paste, right-click, fullscreen exit, print screen); only while `antiCheatEnabled`
- **Source:** `useCheatingDetection.ts:47`, `cheatingLogApi.ts:56`

---

## Interaction Patterns

- **Clicking an option card selects it; clicking it again takes the answer back** — source: `quiz-question-card.tsx:58` (`onSelect(isSelected ? "" : letter)`)
- **Keyboard: A–D… pick the option (same letter again takes it back), ←/→ move between questions** — ignored with Alt/Ctrl/Meta, for a held key repeating, and in INPUT/TEXTAREA/SELECT or contenteditable targets; the listener is off while loading, submitted, submitting, a dialog (submit or leave) or the cheating warning is open — source: `quiz-keys.ts:7`, `ExamQuizPage.tsx:479`
- **Progress auto-saves 1 second after last answer or index change** — source: `ExamQuizPage.tsx:79` (`useDebounce`) + `ExamQuizPage.tsx:369`
- **Timer ticks every second** — source: `ExamQuizPage.tsx:336` (`setInterval`)
- **sendBeacon fires on tab close** — source: `ExamQuizPage.tsx:376` (`beforeunload`)
- **Clicking a progress segment jumps to that question** — one segment per question, filled when answered; above 40 questions one bar, jump by click position — source: `quiz-progress-segments.tsx:27`, `quiz-progress-segments.tsx:14`
- **Clicking a navigator cell jumps to that question** — source: `quiz-navigator-card.tsx:47`
- **Mark for review toggles a flag** — source: `ExamQuizPage.tsx:424`
- **Cheating detection: tab switch → warning modal; copy/paste and right-click blocked** — source: `useCheatingDetection.ts:143`, `useCheatingDetection.ts:120`
- **Leaving with `allowLeaveMidway` off** — in-app navigation is blocked until confirmed; closing the tab shows the browser prompt — source: `use-leave-hand-in.ts:27`
- **30-second warning toast, pulsing clock at ≤60s** — source: `ExamQuizPage.tsx:354`, `quiz-header.tsx:19`

---

## Accessibility

| Aspect | Status | Notes |
|--------|--------|-------|
| ARIA roles/labels | partial | `role="radiogroup"` with `role="radio"` + `aria-checked` option cards (`quiz-question-card.tsx:48`, `quiz-option-card.tsx:56`); `role="timer"` with `aria-label` on the clock (`quiz-header.tsx:29`); `aria-pressed` on mark button; `aria-label` / `aria-current="step"` on progress segments and grid cells; no `aria-live` for toasts |
| Keyboard navigation | supported | Letter keys and ←/→ shortcuts (`quiz-keys.ts`); Tab through options, segments, grid cells and footer buttons |
| Focus management | unmanaged | No explicit focus trap; `ConfirmDialog` handles its own focus |
| Screen reader compatibility | unknown | Review segments announce "đúng" / "sai" (`quiz-progress-segments.tsx:58`) |

[NO_A11Y_DETECTED] — accessibility audit needed before production release.

---

## Conditional Rendering

| Condition | Type | Renders | Hidden | Notes |
|-----------|------|---------|--------|-------|
| `loading === true` | state | `QuizStatusScreen` loading | quiz layout | `ExamQuizPage.tsx:504` |
| `error !== null` | state | `QuizStatusScreen` error | quiz layout | `ExamQuizPage.tsx:508` |
| `totalQuestions === 0` | state | `QuizStatusScreen` empty | quiz layout | `ExamQuizPage.tsx:512` |
| `isSubmitted && resultData` | state | `QuizResultCard` | quiz layout | `ExamQuizPage.tsx:516` |
| `showDetailedResults && resultData.showAnswers && resultData.questions` | state | `QuizReviewView` | result card | `ExamQuizPage.tsx:521` |
| `resultData.showAnswers && resultData.questions` | data | "Xem chi tiết" button | button omitted | `ExamQuizPage.tsx:540` |
| `remaining !== null && remaining <= 60` | state | pulsing clock | steady clock | `quiz-header.tsx:19` |
| `remainingTime !== null && remainingTime <= 300 && remainingTime > 0` | state | warning text in navigator | hidden | `ExamQuizPage.tsx:616` |
| `remaining === null` | state | elapsed time in the clock, label "Thời gian đã làm" | countdown | `quiz-header.tsx:30` |
| `current === 0` | state | "Câu trước" disabled | enabled prev button | `quiz-footer.tsx:24` |
| last question | state | "Nộp bài" replaces "Câu sau" | next button | `quiz-footer.tsx:31` |
| answered question | data | filled segment and brand grid cell | empty segment / cell | `quiz-progress-segments.tsx:67`, `quiz-navigator-card.tsx:44` |
| `markedForReview.has(q.id)` | data | flag on the grid cell, "Đã đánh dấu" button | no flag | `quiz-navigator-card.tsx:49`, `quiz-question-card.tsx:44` |
| `violations > 0` | data | amber violations tile | slate tile | `quiz-result-card.tsx:83` |
| outcome `skipped` (review) | data | "Chưa trả lời" verdict + banner "Bạn không trả lời câu hỏi này" | correct/wrong verdict | `quiz-review-question-card.tsx:47` |

---

## Component Variants

| Component | Discriminating field | Variants on this screen | Screen-specific props/slots | Cross-ref |
|-----------|---------------------|------------------------|----------------------------|-----------|
| QuizOptionCard | `tone` prop | `"default"`, `"selected"` (quiz, rendered as a radio button); `"correct"`, `"wrong"`, `"muted"` (review, static `div`, with "Bạn đã chọn" / "Đáp án đúng" tags) | quiz mode: `onClick`; review mode: `tags` | DISC-001 |
| QuizProgressSegments | `results` prop | quiz (answered / current / empty); review (green correct, red wrong, grey skipped) | `answered`, `current`, `results`, `onJump` | N/A |
| QuizFooter | `last` prop | quiz: last button "Nộp bài"; review: "Xem tổng quan" | `last.label`, `last.onClick` | N/A |
| QuizStatusScreen | `tone` prop | `loading`, `error`, `empty` | `primary`, `secondary` actions | N/A |
| ConfirmDialog | `open` prop | submit confirmation ("Xác nhận nộp bài"); leave confirmation ("Rời phòng thi?", destructive) | answer count in description | N/A |
| CheatingWarningModal | `open` prop | violation warning | `violationType`, `totalViolations` from `useCheatingDetection` | N/A |

---

## Security Surface

| Guard | Type | Consequence if bypassed |
|-------|------|------------------------|
| Route guard `guarded(..., { permission: "exam:take", layout: false })` | auth | Users without `exam:take` do not reach the page (`routes/index.tsx:152`) |
| `isAuthenticated` check in `useEffect` | auth | Redirect to `/login?from=...` (`ExamQuizPage.tsx:93`) |
| `enabled: !!attemptId && !isSubmitted && !loading && antiCheatEnabled` passed to `useCheatingDetection` | policy | Cheating detection inactive during loading/submitted states or when the session turns anti-cheat off |
| Questions served without answers; plaintext over TLS (client-side AES layer removed) | security | Answer key is not in the quiz payload; answers come back only when the session shows them after hand-in |
| JWT token per question for submit verification | security | Answers must carry the question's token; tokens expire at the deadline + 30s |
| `leave` hand-in when `allowLeaveMidway` is off | policy | Leaving the page submits the attempt with the saved answers |
| `sendBeacon` on `beforeunload` | security | Progress auto-saved even if user closes tab accidentally |

[UNVERIFIED] server enforcement — static analysis cannot confirm API middleware for access check endpoint.

---

## Source References

- Page/View: `kmaedu-fe/src/pages/exam-session/ExamQuizPage.tsx:30`
- Quiz components: `kmaedu-fe/src/components/organisms/quiz/quiz-header.tsx`, `quiz-top-bar.tsx`, `quiz-progress-segments.tsx`, `quiz-question-card.tsx`, `quiz-question-frame.tsx`, `quiz-option-card.tsx`, `quiz-navigator-card.tsx`, `quiz-navigator-parts.tsx`, `quiz-progress-ring.tsx`, `quiz-footer.tsx`, `quiz-result-card.tsx`, `quiz-review-view.tsx`, `quiz-review-question-card.tsx`, `quiz-review-navigator-card.tsx`, `quiz-status-screen.tsx`
- Shared component: `kmaedu-fe/src/components/molecules/CheatingWarningModal.tsx:1`
- Shared component: `kmaedu-fe/src/components/organisms/ConfirmDialog.tsx:1`
- Keyboard shortcuts: `kmaedu-fe/src/lib/exam-session/quiz-keys.ts:7`
- Review grading: `kmaedu-fe/src/lib/exam-session/review-outcome.ts:10`
- Hook: `kmaedu-fe/src/hooks/useCheatingDetection.ts:1`
- Hook: `kmaedu-fe/src/pages/exam-session/use-leave-hand-in.ts:27`
- Utils: `kmaedu-fe/src/lib/secureQuizHelpers.ts:1`
- API (attempt): `kmaedu-fe/src/apis/examAttemptApi.ts:85` (`startExamAttemptApi`), `kmaedu-fe/src/apis/examAttemptApi.ts:99` (`updateExamAttemptProgressApi`), `kmaedu-fe/src/apis/examAttemptApi.ts:115` (`leaveExamAttemptApi`), `kmaedu-fe/src/apis/examAttemptApi.ts:123` (`submitExamAttemptApi`), `kmaedu-fe/src/apis/examAttemptApi.ts:223` (`getExamAttemptDetailApi`), `kmaedu-fe/src/apis/examAttemptApi.ts:352` (`getSecureQuizApi`), `kmaedu-fe/src/apis/examAttemptApi.ts:363` (`submitSecureQuizApi`)
- API (cheating): `kmaedu-fe/src/apis/cheatingLogApi.ts:56` (`logCheatingViolationApi`)
- Route config: `kmaedu-fe/src/routes/index.tsx:152`
