-- Contract: set thumbnails are gone (quiz sets and flashcard sets show an icon in the UI).
-- 1) Queue the R2 objects the owners uploaded (`<area>/<ownerId>/<file>`) for the delete worker.
--    UNION dedupes keys shared by several rows; external URLs and other users' objects never match.
--    The row's own `userId` is part of the pattern, so another user's object is never queued.
INSERT INTO "r2_delete_tasks" ("id", "key")
SELECT gen_random_uuid(), t."k"
FROM (
    SELECT substring(q."thumbnail" from '/(quizset-thumbnails/' || q."userId" || '/[^?#]+)') AS "k"
    FROM "QuizSet" q
    WHERE q."thumbnail" IS NOT NULL
    UNION
    SELECT substring(f."thumbnail" from '/(flashcardset-thumbnails/' || f."userId" || '/[^?#]+)') AS "k"
    FROM "FlashCardSet" f
    WHERE f."thumbnail" IS NOT NULL
) t
WHERE t."k" IS NOT NULL
  AND t."k" !~ '(^|/)\.\.(/|$)';

-- 2) Drop the columns.
ALTER TABLE "QuizSet" DROP COLUMN "thumbnail";
ALTER TABLE "FlashCardSet" DROP COLUMN "thumbnail";
