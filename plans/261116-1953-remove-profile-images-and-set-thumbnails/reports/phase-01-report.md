# Phase 01 report: remove avatar/banner (auth + admin)

Changed (kmaedu-be): auth-service profile controller/service/module/dto, auth-response.dto, auth.service (OAuth no longer stores picture; handleOAuthLogin signature drops avatar), google.strategy, grpc mapper, user-update.writer (+spec rewritten, no R2 logic), user-updated.publisher, r2.client (uploadFile removed, delete kept), seed.ts, .env.example (R2_PUBLIC_URL removed), prisma schema + migration 20261116200000_remove_avatar_banner; deleted profile.service.spec.ts; admin-service mappers/select + specs; auth contract/e2e specs; test/cross-app admin specs; route-inventory.json (2 upload routes removed).

Commands: prisma:generate 0; typecheck:auth 0; typecheck:admin 0; yarn test apps/auth-service apps/admin-service: 42 suites / 292 tests pass; git grep -nw avatar|banner (excluding migrations) empty.
Not run: e2e suites needing DB/RabbitMQ (auth e2e, cross-app); migration SQL not executed against a DB.
Left: R2DeleteTaskWriter provider still in user-update.module.ts (now unused by the writer; kept per brief). docs/ mentions not touched.
