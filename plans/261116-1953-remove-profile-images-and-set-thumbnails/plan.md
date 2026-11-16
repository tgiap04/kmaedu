---
title: Remove avatars, profile banners and quiz/flashcard set thumbnails
status: completed
created: 2026-11-16
---

# Remove avatars, banners and set thumbnails

Decision (user, 2026-11-16): drop the features entirely, including the DB columns and the Google
`picture` copy into `avatar`. UI falls back to initials. No production yet.

| Phase | Scope | Status |
|---|---|---|
| [01](phase-01-contracts-and-auth.md) | proto + libs/grpc + auth-service + admin-service + auth migration | done |
| [02](phase-02-content-assessment-studyroom.md) | content (thumbnail + avatar in views), assessment, study-room, content migration | done |
| [03](phase-03-frontend.md) | FE: upload UIs, avatar/banner/thumbnail rendering, types, APIs | done |
| 04 | gates: typecheck, jest, check:deps, check:ownership, proto lint, FE build/test/lint, docs | done |

Dependencies: proto + `libs/grpc` change first (done by the controller), then 01/02/03 in parallel
(disjoint files). Release PR needs labels `migration:contract` and `proto:breaking`
(buf `FILE` rules reject a deleted field even when its number is reserved).

R2: before the columns go, each migration queues the owned objects for deletion in the same SQL
(`r2_delete_tasks`), only keys under `<area>/<ownerId>/`, so the existing workers delete them.
