# Phase 01: contracts, auth, admin

## Context
- proto/kmaedu/auth/v1/auth.proto (`User.avatar`=5, `User.banner`=13, `PublicProfile.avatar`=4)
- libs/grpc/src/clients/public-user.ts, public-profile-cache.ts
- apps/auth-service: prisma schema (User.avatar, User.banner), profile module (upload-avatar/banner, update DTO),
  auth.service.ts (Google `picture` → avatar), grpc mapper, users-query, users-admin writer + publisher, auth-response dto
- apps/admin-service: admin-roles.mapper, admin-users user-safe mapper/select

## Steps
1. proto: delete the 3 fields, `reserved 5, 13; reserved "avatar", "banner";` / `reserved 4; reserved "avatar";`; `yarn proto:gen`.
2. libs/grpc: drop `avatar` from PublicUser + cache.
3. auth: remove upload endpoints + `uploadProfileImage`, R2 upload client use (keep the r2 delete sender), avatar/banner
   in DTOs, mapper, writer (IMAGE_AREA logic), publisher field list, OAuth create/update.
4. Migration `remove_avatar_banner`: insert `r2_delete_tasks` for owned `avatars/<id>/…` and `banners/<id>/…` keys, then
   `ALTER TABLE "User" DROP COLUMN "avatar", DROP COLUMN "banner"`.
5. admin-service: drop avatar from mappers/types.
6. Tests: update specs/e2e that build users with avatar/banner; add one asserting the upload routes are gone (404) only if cheap.

## Success
`yarn typecheck:auth`, `typecheck:admin`, jest for touched specs green; `git grep -w avatar` and `-w banner` clean in these apps (except migrations).
