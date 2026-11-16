---
status: completed
created: 2026-11-16
---
# Restyle /k pages after /k/my-materials

Goal: every /k page (except `/k/history*` and `/k/ai-tool`, which stay as they are) looks like
`/k/my-materials`: pink gradient icon tile + large title header, white rounded-[20px] section cards
with a hairline border and soft shadow, tinted icon rows with "a • b" meta, pill actions, clear empty states.
Behaviour, data flow, routes and APIs do not change — markup and classes only.

## Shared kit (done, main thread)
`kmaedu-fe/src/components/k-page/`
- `page-header.tsx` — `PageHeader({ icon, title, subtitle?, actions?, eyebrow? })`
- `section-card.tsx` — `SectionCard({ icon, title, countLabel?, action?, illustration?, plain?, children })`,
  `ViewAllLink`, `ViewAllButton`, `RowsSkeleton`, `SectionMessage`, `SectionPager`, `pillClass`
- `item-row.tsx` — `ItemRow({ icon, tone, title, titleAddon?, meta, metric?, action, menu? })`, `PdfBadgeIcon`
- Stat tiles: reuse `components/molecules/HistoryStatCard.tsx`.

## Design rules (design-ui UX rules; brand fixed = KMA red, existing tokens)
Tokens only: `text-ink`, `text-body`, `text-muted-foreground`, `bg-canvas`, `bg-surface-soft`,
`border-hairline(-soft)`, `bg-brand-soft text-brand`, `border-brand-border`. Lucide icons, no emoji.
Visible focus ring `focus-visible:ring-2 ring-brand/40`; transitions 150–300ms; tables scroll
(`overflow-x-auto`) or become rows on mobile; empty state = message + next action; contrast ≥ 4.5:1.

## Phases
| # | Phase | Pages | Status |
|---|---|---|---|
| 01 | [Learner pages](phase-01-learner-pages.md) | my-exams, practice-quiz/:id, profile, verify, study-room list | done |
| 02 | [Teacher management pages](phase-02-teacher-pages.md) | manage-exam, flash-card, manage-exam-room (+detail, session analytics), manage-quiz-set/:id, manage-flashcard-set/:id | done |
| 03 | [Word family pages](phase-03-word-family-pages.md) | word-family, /:slug, /:slug/:rootWord | done |

Phases touch disjoint files and run in parallel. Out of scope: `/k/history*`, `/k/ai-tool`,
`/k/study-room/:id` (full-screen live room), modals' internals, shared `components/antd/*`.
