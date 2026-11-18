# Adversarial layout review: compact card density (class-only pass)

Scope: `git diff HEAD -- src` minus the 11 files owned by the other reviewer (115 files). Method: read every hunk, scripted check that every changed line differs only inside quoted strings (class lists), then opened the surrounding code for each fixed height, `min-h`/`max-h`, absolute offset and `CardHeader`/`CardContent` padding override.

Result of the "smuggled non-class change" check (vector 3): no logic, handler, key, conditional, aria or alt change. The only non-class-string edits are listed in LY-6. `package.json`, lockfiles and tests are untouched.

Verified OK (no finding): tailwind-merge on `CardContent` / `CardHeader` overrides (`p-0`, `pt-3`, `p-4 pt-0`, `px-4 pb-3`: longhand after shorthand, header/content left edges stay aligned in CategoriesSidebar, ConversationList, PostsList); `ChatHistoryCard` `-mt-8` -> `pt-1` (header `pb-2` + `pt-1` gives a 12px gap, no overlap); ExamQuizPage navigator card (`!px-0` removal pairs with `p-4`, ring-offset still fits inside `p-1`); `ProfileSummaryCard` avatar offset (`-top-7`, `size-14`, `pt-9` keeps the same 8px gap as before); `RecentActivitySection` `sm:pl-[52px]` = `size-10` + `gap-3`; `ExamSearchFilterBar` icon offset vs `pl-10`; no control or touch target under 40px was introduced; no text under 12px was introduced; exam question and answer text sizes are unchanged.

---

## LY-1
- SEVERITY: Medium
- CATEGORY: Failure
- LOCATION: kmaedu-fe/src/pages/k/components/session-analytics-sections.tsx:59 (container), :62 (`<Pie ... outerRadius={80}>`), :66 (`<Legend />`)
- ATTACK: Open a session analytics page (`ExamRoomSessionAnalyticsPage`) that has violation data, any viewport. The pie chart container went from `h-64` (256px) to `h-52` (208px). With `p-4` (`md:p-5`) the chart area is 176px (168px at md+). The pie radius is a fixed 80px (160px diameter) and the recharts `Legend` takes about 30px from the bottom of the plot area.
- IMPACT: Plot height is about 140px, so the pie centre sits at about 70px with an 80px radius. The top of the circle and the outside labels of the top slices (`labelLine={false}`, labels drawn outside the circle) fall outside the SVG and are cut off; the bottom of the pie runs into the legend. Before the change the same maths left roughly 10-13px of slack, so this is newly broken.
- FIX: Keep the height at its old value, or make the radius track the container (percentage `outerRadius`, for example "65%") instead of a pixel value, then check it with the legend on at both `p-4` and `md:p-5`. The bar chart beside it (`ScoreDistributionCard`, same `h-52`) is fine.

## LY-2
- SEVERITY: Medium
- CATEGORY: Failure (reading content)
- LOCATION: kmaedu-fe/src/pages/study-flashcard/FlashcardStudyPage.tsx:442 (front) and :460 (back)
- ATTACK: Study a flashcard whose answer is longer than its question (the usual case) with an answer of about 5 or more rendered lines. Front face is in normal flow and is the only thing that sets the card height. The back face is `absolute inset-0` and has no overflow handling. `min-h` fell 340/400 to 280/320 and padding fell `p-10 sm:p-14` to `p-6 sm:p-8`. Fixed chrome inside a face (label, `mb-6`, footer with `pt-8`) is about 95px, so the room left for the answer text dropped from about 165/193px to about 137/161px. On a 360px phone (about 36 characters per line at `text-lg`) the threshold goes from about 5 lines to about 4 lines (roughly 180 to 140 characters); at `sm` and up (`text-xl`) it goes from about 5 to about 4 lines.
- IMPACT: The back face is `justify-center` with no clip or scroll, so the answer overflows symmetrically: it overprints the "Câu trả lời" label and the "Nhấp để quay lại" hint and spills outside the card border. More cards hit this than before the change.
- FIX: Let the card height be decided by the taller face (render both faces in a grid stack, or give the back face its own `min-h` with `overflow-y-auto`), or keep the old `min-h` for this study card since it is the learning content, not a decorative card. If the smaller size is kept, add `overflow-y-auto` plus a `max-h` to the markdown block on both faces.

## LY-3
- SEVERITY: Low
- CATEGORY: Failure
- LOCATION: kmaedu-fe/src/components/organisms/k/ai-tool/flashcard-result-preview.tsx:15 and :21 (face padding, `max-h-40`), :65 (`h-[280px]`)
- ATTACK: Generated flashcard whose question or answer fills the clamp (160px). Face is 280px, border 2px, `py-6` 48px, leaving 230px; label (about 26px) + `gap-3` x2 + content (160px) + hint (about 20px) = about 230px, so zero slack. A hint that wraps on a 360px phone, or a larger default line-height, overflows by a few px and the centred flex column pushes the label above the border.
- IMPACT: At worst the label or the "click to flip" hint touches or crosses the card edge. The scroll area for the text also shrank from 192px to 160px, so long answers need scrolling sooner.
- FIX: Re-derive the pair so there is slack (height 300px, or `max-h-36`), or make the clamp relative (`max-h` as a fraction of the face) instead of an absolute pixel value.

## LY-4
- SEVERITY: Low
- CATEGORY: Failure (skeleton vs real size)
- LOCATION: kmaedu-fe/src/pages/study-room/StudyRoomListPage.tsx:62 (`h-44` -> `h-36`) vs kmaedu-fe/src/pages/study-room/components/room-card.tsx:46-100
- ATTACK: Load the study-room list. A real card is about 177px with a 2-line description (about 159px with one line): border + `p-4` + 62px top row + `mt-3` badges + `mt-3`/`pt-3` footer. The skeleton is 144px.
- IMPACT: Content jumps 15-33px when data arrives. The jump existed before (176px vs about 195px) so it is not worse, but the pass was meant to keep skeletons honest. Same reasoning applies to `ManageExamRoomPage.tsx:217/254` (`h-52`) where the real panels were not re-measured.
- FIX: Set the skeleton height to the real card height (about 160px) after measuring; do the same for the other shrunk skeletons.

## LY-5
- SEVERITY: Low
- CATEGORY: Assumption (responsive/consistency, old scale left behind)
- LOCATION: kmaedu-fe/src/components/organisms/k/ConversationList.tsx:78; kmaedu-fe/src/pages/k/ExamHistoryPage.tsx:126; kmaedu-fe/src/pages/k/PDFHistoryPage.tsx:177; kmaedu-fe/src/pages/k/components/quiz-set-detail/quiz-set-usage-panel.tsx:39,43,51; kmaedu-fe/src/pages/admin/AdminOverviewPage.tsx:76 and kmaedu-fe/src/pages/admin/AdminStatsPage.tsx:59 (`space-y-6` between cards)
- ATTACK: Trigger the empty states (no conversations, no exams, no PDFs, no rooms using the quiz set) or open the two admin pages.
- IMPACT: The plan scale turns empty-state `py-12` into `py-8` and card gaps `space-y-6` into `space-y-4`. Files already touched by this change kept the old values, so those empty states are about 32px taller than their siblings and the admin card stacks are looser than the rest of the app. No breakage, only an uneven density.
- FIX: Apply the same scale to these lines (or note that they are intentionally left out).

## LY-6
- SEVERITY: Low
- CATEGORY: Data (non-class edits that are not className strings; none changes behaviour)
- LOCATION: kmaedu-fe/src/pages/exam-session/ExamQuizPage.tsx:618 and :880 (`size="lg"` removed from the "Xem tổng quan" and "Nộp bài" buttons; also `mx-3` removed at :618 together with the parent padding change); kmaedu-fe/src/templates/ExamRoomDetailTemplate.tsx:170-173 (`size="lg"` removed from "Bắt đầu làm bài"); kmaedu-fe/src/pages/admin/AdminOverviewPage.tsx:133 (`height={260}` -> `height={220}` prop on `SourceBreakdownChart`); kmaedu-fe/src/templates/HistoryTemplate.tsx:47 (`<img width/height` 40 -> 32 with `size-8`)
- ATTACK: Not an attack; this is the full list of non-className changes found, as requested.
- IMPACT: All are size-only and match the plan (buttons to default 34px, chart height, intrinsic image size). The primary "Nộp bài" and "Bắt đầu làm bài" calls to action are now the default button size; nothing else changed (handlers, props, aria, alt all identical).
- FIX: None needed. Mentioned only so the list is complete; confirm the smaller primary exam CTAs are intended.

## LY-7
- SEVERITY: Low
- CATEGORY: Assumption (scope)
- LOCATION: kmaedu-fe/src/components/organisms/landing/FeatureShowcase.tsx:165-174 (row `py-12 lg:py-20` -> `py-8 lg:py-10`, `h3` `text-3xl lg:text-4xl` -> `text-2xl lg:text-3xl`), ProductShowcase.tsx:82-87 (step titles), CoralCallout.tsx:47, MetricsSection.tsx:40 (counter `text-6xl lg:text-8xl` -> `text-5xl lg:text-6xl`), TestimonialsSection.tsx:76 (quote `text-3xl md:text-4xl` -> `text-2xl md:text-3xl`), AboutSection.tsx:121,133 (article `h2`)
- ATTACK: View the landing and about pages at 1280px.
- IMPACT: The plan says not to touch landing hero and section headings. Several of these are section-level rows (feature rows with only a bottom border, product steps, the coral callout band), not cards, and their headings and vertical rhythm were reduced by 25-50% (the metric counter went 8xl to 6xl, larger than the plan's one-step scale). The landing page loses its editorial pacing in places; nothing breaks.
- FIX: Decide whether these section rows count as cards. If not, revert them (rows, callout band, step titles); if yes, keep them but limit the metric counter to one step (`lg:text-7xl`).

## LY-8
- SEVERITY: Low
- CATEGORY: Failure (layout, phones)
- LOCATION: kmaedu-fe/src/components/organisms/AboutSection.tsx:98 (`grid gap-8 md:grid-cols-3` -> `gap-4`)
- ATTACK: Open the about page below 768px (360px phone). The three stat blocks (icon, big number, label) stack in one column.
- IMPACT: Only 16px separates one block's label from the next block's icon, with no divider or card, so the stats read as one run-on list. The earlier overlap fix (`!-mt-4` -> `!mt-1.5`) is correct; this is the spacing between blocks.
- FIX: Use `gap-6` below `md` (for example `gap-6 md:gap-4`), or add a divider.

---

Not findings, for the record: `FlipCard.tsx` is changed but has no callers (`git grep FlipCard` finds only its own file); the marquee keyframes use `translateX(-50%)`, so the equal outer/inner `gap-4` change keeps the loop seam within 8px (it was 12px before).

**Status:** DONE
**Report:** /Users/tgiap.dev/devs/kmaedu/plans/261119-0004-compact-card-density/reports/review-code/adv-layout.md
