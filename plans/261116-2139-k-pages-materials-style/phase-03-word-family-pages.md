# Phase 03 — Word family pages
Status: done · Context: [plan.md](plan.md)

## Overview
Restyle these pages after /k/my-materials using the shared kit in `kmaedu-fe/src/components/k-page/`.
Markup/className only; keep every handler, store call, route, permission check and text meaning.

## Files owned (only these)
src/pages/k/WordFamilyPage.tsx, WordFamilyCategoryPage.tsx, WordFamilyDetailPage.tsx, src/components/k/word-family/*

## Steps
1. Read `src/pages/k/MyMaterialsPage.tsx`, `src/components/k-page/*`, and each owned page.
2. Replace the page title block with `PageHeader` (fitting lucide icon, Vietnamese subtitle).
3. Wrap content blocks in `SectionCard` (or the same card classes); lists → `ItemRow` where the data fits; stats → `HistoryStatCard`.
4. Empty/loading/error states → `SectionMessage` / `RowsSkeleton` (or same look).
5. Keep files < ~200 lines where you touch them; split into components next to the page if needed.
6. `cd kmaedu-fe && ./node_modules/.bin/tsc -b && yarn lint <files>`.

## Success criteria
Pages read as one family with /k/my-materials; tsc -b exit 0; no behaviour change; mobile (375px) has no horizontal page scroll.
