-- Queue the R2 objects owned by each user (avatars/<id>/..., banners/<id>/...) for
-- durable deletion before the columns that point at them are dropped. External URLs
-- (e.g. Google profile pictures) and keys outside the owner's prefix never match.
INSERT INTO "r2_delete_tasks" ("id", "key")
SELECT gen_random_uuid(), t."k"
FROM (
    SELECT substring(u."avatar" from '/(avatars/' || u."id" || '/[^?#]+)') AS "k" FROM "User" u
    UNION
    SELECT substring(u."banner" from '/(banners/' || u."id" || '/[^?#]+)') FROM "User" u
) t
WHERE t."k" IS NOT NULL
  AND t."k" !~ '(^|/)\.\.(/|$)';

-- AlterTable
ALTER TABLE "User" DROP COLUMN "avatar",
DROP COLUMN "banner";
